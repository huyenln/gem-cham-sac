// Edge Function `notify` — mails every staff member when a new order,
// workshop booking or memo-board note comes in.
//
// Called by the database (trigger notify_new → pg_net), never by the site.
// Deployed with verify_jwt = false; instead:
//   - header x-notify-secret must match the secret kept in Vault
//     (public.notify_secret(), service_role only)
//   - public.notify_payload() hands out each record once (notify_log) and
//     only if it is less than an hour old; it is also the only way this
//     function reads data — no table grants for service_role.
//
// Secrets (Supabase → Edge Functions → Secrets), set by hand, never in repo:
//   GMAIL_USER          the Gmail address that sends
//   GMAIL_APP_PASSWORD  a Gmail "App password" (16 letters), not the login
//   NOTIFY_TO           optional, comma-separated: overrides the staff list
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided by Supabase.

import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts';

const BASE = Deno.env.get('SUPABASE_URL')!;
const KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ADMIN = 'https://gemchamsac.com/admin.html';
const TZ = 'Asia/Ho_Chi_Minh';

async function rpc(name: string, args: Record<string, unknown> = {}) {
  const r = await fetch(`${BASE}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
  });
  const text = await r.text();
  if (!r.ok) throw new Error(`${name}: ${r.status} ${text}`);
  return text ? JSON.parse(text) : null;
}

const esc = (s: unknown) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const vnd = (n: number | null) => n == null ? 'Liên hệ' : Number(n).toLocaleString('vi-VN') + 'đ';
const when = (iso: string) => new Date(iso).toLocaleString('vi-VN', {
  timeZone: TZ, weekday: 'long', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
});

type Mail = { subject: string; lines: [string, string][]; body?: string };

function compose(kind: string, d: any): Mail {
  if (kind === 'order') {
    const items = d.items || [];
    const n = items.reduce((s: number, it: any) => s + it.qty, 0);
    const pay = ({ cod: 'Trả khi nhận (COD)', qr: 'Chuyển khoản QR' } as Record<string, string>)[d.payment_method]
      || 'Chưa chọn / chờ duyệt thiết kế';
    return {
      subject: `[Gem] Đơn mới ${d.code} · ${d.name} · ${n} món`,
      lines: [
        ['Mã đơn', d.code], ['Khách', d.name], ['SĐT', d.phone], ['Địa chỉ', d.address || '—'],
        ['Thanh toán', pay],
        ['Tạm tính', vnd(d.subtotal) + (d.has_unpriced ? ' (+ món "Liên hệ")' : '')],
        ['Món', items.map((it: any) => `${it.name} × ${it.qty} — ${it.price == null ? 'Liên hệ' : vnd(it.price * it.qty)}`).join('\n')],
      ],
      body: d.note || '',
    };
  }
  if (kind === 'booking') {
    const at = d.starts_at ? when(d.starts_at) : '—';
    return {
      subject: `[Gem] Đặt workshop: ${d.workshop || 'Workshop'} · ${at} · ${d.name} (${d.seats} người)`,
      lines: [
        ['Mã', d.code], ['Workshop', d.workshop || '—'], ['Buổi', at],
        ['Khách', d.name], ['SĐT', d.phone], ['Email', d.email || '—'], ['Số người', String(d.seats)],
      ],
      body: d.note || '',
    };
  }
  return {
    subject: `[Gem] Lời nhắn mới chờ duyệt${d.name ? ' · ' + d.name : ''}`,
    lines: [['Tên', d.name || 'Không ghi tên']],
    body: d.body,
  };
}

function render(m: Mail) {
  const text = m.lines.map(([k, v]) => `${k}: ${v}`).join('\n') +
    (m.body ? `\n\nGhi chú / nội dung:\n${m.body}` : '') + `\n\nMở trang quản trị: ${ADMIN}\n`;
  // Customer-typed text: escaped, never raw HTML.
  const html = '<div style="font-family:Arial,sans-serif;font-size:15px;color:#3D4A2E;line-height:1.5">' +
    '<table cellpadding="4" style="border-collapse:collapse">' +
    m.lines.map(([k, v]) => `<tr><td style="color:#8A8674;vertical-align:top">${esc(k)}</td>` +
      `<td style="white-space:pre-line">${esc(v)}</td></tr>`).join('') + '</table>' +
    (m.body ? `<p style="white-space:pre-line;background:#FBF6EE;padding:12px;border-radius:8px">${esc(m.body)}</p>` : '') +
    `<p><a href="${ADMIN}" style="background:#87965A;color:#fff;padding:10px 16px;border-radius:999px;text-decoration:none">Mở trang quản trị</a></p></div>`;
  return { text, html };
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('method', { status: 405 });

  const secret = await rpc('notify_secret').catch(() => null);
  if (!secret || req.headers.get('x-notify-secret') !== secret) return new Response('forbidden', { status: 403 });

  let kind = '', id = '';
  try { ({ kind, id } = await req.json()); } catch { /* checked below */ }
  if (!['order', 'booking', 'note'].includes(kind) || !/^[0-9a-f-]{36}$/.test(id)) {
    return new Response('bad input', { status: 400 });
  }

  const user = Deno.env.get('GMAIL_USER'), pass = Deno.env.get('GMAIL_APP_PASSWORD');
  if (!user || !pass) {
    console.warn('notify: GMAIL_USER / GMAIL_APP_PASSWORD not set, skipping', kind, id);
    return new Response('not configured');
  }

  const p = await rpc('notify_payload', { p_kind: kind, p_id: id });
  if (!p || !p.data) return new Response(JSON.stringify(p));   // dup / old / not_found

  const fixed = (Deno.env.get('NOTIFY_TO') || '').split(',').map((s) => s.trim()).filter(Boolean);
  const to: string[] = fixed.length ? fixed : (p.to || []);
  if (!to.length) { console.warn('notify: no recipients'); return new Response('no recipients'); }

  const mail = compose(kind, p.data);
  const { text, html } = render(mail);
  const client = new SMTPClient({
    connection: { hostname: 'smtp.gmail.com', port: 465, tls: true, auth: { username: user, password: pass } },
  });
  try {
    await client.send({ from: `Gem Chạm Sắc <${user}>`, to, subject: mail.subject, content: text, html });
  } catch (e) {
    console.error('notify: send failed', kind, id, String(e));
    await rpc('notify_unclaim', { p_kind: kind, p_id: id }).catch(() => {});
    return new Response('send failed', { status: 502 });
  } finally {
    try { await client.close(); } catch { /* ignore */ }
  }
  return new Response('sent');
});
