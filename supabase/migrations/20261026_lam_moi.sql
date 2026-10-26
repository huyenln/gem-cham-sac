-- Làm mới đồ cũ (Upcycle), đợt 1 (26/10/2026).
--
-- Khách gửi yêu cầu ở Studio → Bàn thiết kế → tab "Làm mới đồ cũ"; Gem xử lý
-- ở admin.html → Upcycle (có in phiếu tiếp nhận). Chạy TRƯỚC khi merge.
--
-- Khách KHÔNG ghi thẳng vào bảng nào. Đường duy nhất:
--   1. upcycle_submit(p)  kiểm dữ liệu, danh sách Gem chưa nhận, giới hạn lượt
--                         (TRƯỚC khi có ảnh nào), tạo yêu cầu "nhap" + các món,
--                         trả mã YC-XXXX và một "vé" tải ảnh (upload_key).
--   2. tải ảnh vào bucket riêng tư `upcycle`, đúng thư mục
--      <id yêu cầu>/<vé>/<món>-do<n>.webp (ảnh đồ) hoặc <món>-ph1.webp (phác
--      thảo); policy upcycle_add chỉ nhận khi vé đúng và còn hạn 30 phút.
--   3. upcycle_finish(id, vé)  ghi ảnh đã lên, bắt mỗi món có ít nhất 1 ảnh,
--      chuyển yêu cầu sang "moi" → trigger báo mail cho nhân sự.
-- Nhân sự đọc / sửa mọi thứ qua RLS (is_staff()).
--
-- Policy RLS lọc DÒNG, GRANT mở CỬA: bảng mới phải GRANT riêng (xem cuối file).

-- ---------- giới hạn (khách đọc được: form biết trước số món / ảnh) ----------
insert into public.settings (key, value)
values ('upcycle', '{"per_phone_month": 5, "items": 5, "photos": 3, "photos_day": 60}'::jsonb)
on conflict (key) do nothing;

drop policy if exists st_read_public on public.settings;
create policy st_read_public on public.settings for select to anon, authenticated
  using (key = any (array['payment', 'design_pricing', 'upcycle']));

-- ---------- mã ----------
-- 31 ký tự, bỏ 0/O, 1/I/L cho khỏi đọc nhầm qua Zalo / điện thoại
create or replace function public.upcycle_rand(n int)
returns text
language sql
volatile
set search_path to ''
as $$
  select string_agg(substr('ABCDEFGHJKMNPQRSTUVWXYZ23456789', 1 + floor(random() * 31)::int, 1), '')
  from generate_series(1, n)
$$;

create or replace function public.gen_upcycle_code()
returns text
language plpgsql
volatile
security definer
set search_path to ''
as $$
declare c text;
begin
  loop
    c := 'YC-' || public.upcycle_rand(4);
    exit when not exists (select 1 from public.upcycle_requests r where r.code = c);
  end loop;
  return c;
end $$;

-- SĐT: chỉ số, +84 / 84 → 0; null nếu không phải số điện thoại VN
create or replace function public.upcycle_phone(p text)
returns text
language plpgsql
immutable
set search_path to ''
as $$
declare d text := regexp_replace(coalesce(p, ''), '[^0-9]', '', 'g');
begin
  if d ~ '^84[0-9]{9,10}$' then d := '0' || substr(d, 3); end if;
  return case when d ~ '^0[0-9]{9,10}$' then d else null end;
end $$;

-- Tình trạng (bộ từ vựng chung cho form, thư viện, phiếu in)
create or replace function public.upcycle_conditions_ok(c text[])
returns boolean
language sql
immutable
set search_path to ''
as $$
  select c is not null and cardinality(c) <= 20 and c <@ array['tot', 'bac_mau', 'son_muc', 'vet_o', 'rach', 'sua_1', 'co_lot',
    'khoa_keo', 'cap_thun', 'vai_mong', 'vai_kho', 'chat_nguc', 'chat_eo', 'chat_lung', 'chat_mong']::text[]
$$;

-- Số đo (cm): ngực, eo, mông, dài, nách là số 1–300; "khac" là chữ ngắn
create or replace function public.upcycle_measures_ok(m jsonb)
returns boolean
language sql
immutable
set search_path to ''
as $$
  select m is not null and jsonb_typeof(m) = 'object'
    and not exists (select 1 from jsonb_object_keys(m) k where k not in ('nguc', 'eo', 'mong', 'dai', 'nach', 'khac'))
    and not exists (select 1 from jsonb_each(m) e where e.key <> 'khac'
                      and (jsonb_typeof(e.value) <> 'number' or (e.value #>> '{}')::numeric not between 1 and 300))
    and (not m ? 'khac' or (jsonb_typeof(m->'khac') = 'string' and char_length(m->>'khac') <= 80))
$$;

-- ---------- bảng ----------
create table if not exists public.upcycle_requests (
  id uuid primary key default gen_random_uuid(),
  code text not null unique default public.gen_upcycle_code(),
  order_code text unique,                  -- UP + B/P/S + 4 ký tự, khi Gem chốt gói
  name text not null check (char_length(name) between 1 and 60),
  phone text not null check (phone ~ '^[0-9+]{8,16}$'),
  want_date date,
  status text not null default 'moi'
    check (status in ('nhap', 'moi', 'lien_he', 'bao_gia', 'dang_lam', 'thu_chinh', 'da_tra', 'huy')),
  upload_key text,                         -- the photo ticket while "nhap"; null after
  finished_at timestamptz,                 -- sent by the customer (nhap → moi)
  closed_at timestamptz,                   -- became da_tra / huy (photos go 30 days later)
  photos_gone_at timestamptz,
  -- filled by Gem after talking with the customer (phiếu tiếp nhận)
  service text check (char_length(service) <= 80),
  received_on date,
  due_on date,
  speed text not null default 'thuong' check (speed in ('thuong', 'gap', 'khac')),
  speed_note text check (char_length(speed_note) <= 60),
  plan jsonb not null default '[]'::jsonb check (jsonb_typeof(plan) = 'array' and jsonb_array_length(plan) <= 30),
  design_fee integer check (design_fee >= 0),
  discount text check (char_length(discount) <= 20),
  extras jsonb not null default '[]'::jsonb check (jsonb_typeof(extras) = 'array' and jsonb_array_length(extras) <= 20),
  rush_fee integer check (rush_fee >= 0),
  total integer check (total >= 0),
  deposit integer check (deposit >= 0),
  deposit_on date,
  deposit_method text check (char_length(deposit_method) <= 40),
  returned_on date,
  received_by text check (char_length(received_by) <= 60),
  paid_full boolean not null default false,
  internal_note text check (char_length(internal_note) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists upcycle_requests_phone on public.upcycle_requests (phone, created_at);
create index if not exists upcycle_requests_status on public.upcycle_requests (status, created_at);

create table if not exists public.upcycle_items (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.upcycle_requests (id) on delete cascade,
  pos smallint not null check (pos between 1 and 9),
  kind text not null check (kind in ('chan_vay', 'vay_lien', 'so_mi', 'quan_jean', 'ao_thun', 'khac')),
  kind_other text check (char_length(kind_other) <= 60),
  qty smallint not null default 1 check (qty between 1 and 99),
  conditions text[] not null default '{}' check (public.upcycle_conditions_ok(conditions)),
  problem text check (char_length(problem) <= 1000),
  idea_kind text check (idea_kind in ('doi_kieu', 'doi_cong_nang', 'trang_tri', 'goi_y')),
  idea text check (char_length(idea) <= 1000),
  measures jsonb not null default '{}'::jsonb check (public.upcycle_measures_ok(measures)),
  package text check (package in ('basic', 'plus', 'signature')),
  price integer check (price >= 0),
  unique (request_id, pos)
);

create table if not exists public.upcycle_photos (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.upcycle_requests (id) on delete cascade,
  item_id uuid not null references public.upcycle_items (id) on delete cascade,
  kind text not null check (kind in ('do', 'phac_thao')),
  path text not null unique,
  created_at timestamptz not null default now()
);
create index if not exists upcycle_photos_item on public.upcycle_photos (item_id);

-- closed_at follows the status; updated_at on every change
create or replace function public.upcycle_touch()
returns trigger
language plpgsql
set search_path to ''
as $$
begin
  new.updated_at := now();
  if new.status in ('da_tra', 'huy') then
    if old.status is distinct from new.status or new.closed_at is null then new.closed_at := now(); end if;
  else
    new.closed_at := null;
  end if;
  return new;
end $$;
drop trigger if exists upcycle_requests_touch on public.upcycle_requests;
create trigger upcycle_requests_touch before update on public.upcycle_requests
  for each row execute function public.upcycle_touch();

-- the customer sent it (nhap → moi): mail the staff (notify_new → Edge Function notify)
drop trigger if exists upcycle_requests_notify on public.upcycle_requests;
create trigger upcycle_requests_notify after update on public.upcycle_requests
  for each row when (old.status = 'nhap' and new.status = 'moi')
  execute function public.notify_new('upcycle');

-- ---------- kho ảnh riêng tư ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('upcycle', 'upcycle', false, 819200, array['image/webp', 'image/jpeg'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- A customer may add a photo only into the folder of the request they just
-- made, with its ticket, for 30 minutes, into a fixed slot (so no more than
-- "photos" per piece + 1 sketch), while the day's cap for the whole site holds.
create or replace function public.upcycle_may_upload(p_name text)
returns boolean
language plpgsql
stable
security definer
set search_path to ''
as $$
declare
  m text[];
  r record;
  cfg jsonb := coalesce((select s.value from public.settings s where s.key = 'upcycle'), '{}'::jsonb);
begin
  m := regexp_match(coalesce(p_name, ''),
    '^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/([0-9a-f]{32})/([1-9])-(do[1-9]|ph1)\.(webp|jpg)$');
  if m is null then return false; end if;
  select q.id, q.upload_key, q.created_at, q.status into r from public.upcycle_requests q where q.id = m[1]::uuid;
  if not found or r.status <> 'nhap' or r.upload_key is distinct from m[2]
     or r.created_at < now() - interval '30 minutes' then
    return false;
  end if;
  if not exists (select 1 from public.upcycle_items i where i.request_id = r.id and i.pos = m[3]::int) then return false; end if;
  if m[4] <> 'ph1' and substr(m[4], 3)::int > coalesce((cfg->>'photos')::int, 3) then return false; end if;
  if (select count(*) from storage.objects o where o.bucket_id = 'upcycle' and o.created_at > now() - interval '1 day')
     >= coalesce((cfg->>'photos_day')::int, 60) then
    return false;
  end if;
  return true;
end $$;

drop policy if exists upcycle_add on storage.objects;
create policy upcycle_add on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'upcycle' and public.upcycle_may_upload(name));
drop policy if exists upcycle_read on storage.objects;
create policy upcycle_read on storage.objects for select to authenticated
  using (bucket_id = 'upcycle' and public.is_staff());
drop policy if exists upcycle_delete on storage.objects;
create policy upcycle_delete on storage.objects for delete to authenticated
  using (bucket_id = 'upcycle' and public.is_staff());

-- ---------- khách gửi ----------
-- p: { name, phone, want_date, clean, agree, hp,
--      items: [{ kind, kind_other, qty, conditions[], problem, idea_kind, idea,
--                measures{}, photos (1–3), sketch (bool) }] }
-- → { ok, id, code, key, left } | { ok:false, error: bad_input | rush | not_taken | limit | busy }
create or replace function public.upcycle_submit(p jsonb)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $$
declare
  cfg jsonb := coalesce((select s.value from public.settings s where s.key = 'upcycle'), '{}'::jsonb);
  v_month int := coalesce((cfg->>'per_phone_month')::int, 5);
  v_items_max int := coalesce((cfg->>'items')::int, 5);
  v_photos_max int := coalesce((cfg->>'photos')::int, 3);
  v_day int := coalesce((cfg->>'photos_day')::int, 60);
  v_today date := (now() at time zone 'Asia/Ho_Chi_Minh')::date;
  v_name text := btrim(coalesce(p->>'name', ''));
  v_phone text := public.upcycle_phone(p->>'phone');
  v_want date;
  v_items jsonb := p->'items';
  v_used int;
  v_photos int := 0;
  v_id uuid;
  v_code text;
  v_key text := replace(gen_random_uuid()::text, '-', '');
  it jsonb;
  v_cond text[];
  v_n int;
  i int := 0;
begin
  if jsonb_typeof(p) <> 'object' or coalesce(p->>'hp', '') <> ''
     or (p->>'clean') is distinct from 'true' or (p->>'agree') is distinct from 'true'
     or char_length(v_name) not between 1 and 60 or v_phone is null
     or jsonb_typeof(v_items) is distinct from 'array' then
    return jsonb_build_object('ok', false, 'error', 'bad_input');
  end if;
  begin
    v_want := nullif(p->>'want_date', '')::date;
  exception when others then
    return jsonb_build_object('ok', false, 'error', 'bad_input');
  end;
  if v_want is not null and v_want < v_today then return jsonb_build_object('ok', false, 'error', 'bad_input'); end if;
  -- under 10 days is a rush job: Gem takes those on Zalo, not here
  if v_want is not null and v_want < v_today + 10 then return jsonb_build_object('ok', false, 'error', 'rush'); end if;
  v_n := jsonb_array_length(v_items);
  if v_n < 1 or v_n > v_items_max then return jsonb_build_object('ok', false, 'error', 'bad_input'); end if;

  for it in select value from jsonb_array_elements(v_items) loop
    if jsonb_typeof(it) <> 'object' then return jsonb_build_object('ok', false, 'error', 'bad_input'); end if;
    if it->>'kind' in ('da_long', 'vest_canvas') then return jsonb_build_object('ok', false, 'error', 'not_taken'); end if;
    if coalesce(it->>'kind', '') not in ('chan_vay', 'vay_lien', 'so_mi', 'quan_jean', 'ao_thun', 'khac')
       or (it->>'kind' = 'khac' and char_length(btrim(coalesce(it->>'kind_other', ''))) not between 1 and 60)
       or jsonb_typeof(it->'conditions') is distinct from 'array'
       or jsonb_typeof(it->'qty') is distinct from 'number' or (it->>'qty')::numeric not between 1 and 20
       or jsonb_typeof(it->'photos') is distinct from 'number' or (it->>'photos')::numeric not between 1 and v_photos_max
       or char_length(coalesce(it->>'problem', '')) > 1000 or char_length(coalesce(it->>'idea', '')) > 1000
       or (it->>'idea_kind' is not null and it->>'idea_kind' not in ('doi_kieu', 'doi_cong_nang', 'trang_tri', 'goi_y'))
       or (it->>'idea_kind' is null and btrim(coalesce(it->>'idea', '')) = '')
       or not public.upcycle_measures_ok(coalesce(it->'measures', '{}'::jsonb)) then
      return jsonb_build_object('ok', false, 'error', 'bad_input');
    end if;
    select coalesce(array_agg(x), '{}') into v_cond from jsonb_array_elements_text(it->'conditions') x;
    if 'sua_nhieu' = any (v_cond) then return jsonb_build_object('ok', false, 'error', 'not_taken'); end if;
    if not public.upcycle_conditions_ok(v_cond) then return jsonb_build_object('ok', false, 'error', 'bad_input'); end if;
    v_photos := v_photos + (it->>'photos')::int + case when (it->>'sketch') = 'true' then 1 else 0 end;
  end loop;

  -- this month's turns for this phone: sent ones (cancelled too) + one in
  -- flight (made in the last 30 minutes); a draft left behind doesn't count
  select count(*) into v_used from public.upcycle_requests r
   where r.phone = v_phone
     and r.created_at >= (date_trunc('month', now() at time zone 'Asia/Ho_Chi_Minh') at time zone 'Asia/Ho_Chi_Minh')
     and (r.finished_at is not null or r.created_at > now() - interval '30 minutes');
  if v_used >= v_month then
    return jsonb_build_object('ok', false, 'error', 'limit', 'limit', v_month);
  end if;
  if (select count(*) from storage.objects o where o.bucket_id = 'upcycle' and o.created_at > now() - interval '1 day')
     + v_photos > v_day then
    return jsonb_build_object('ok', false, 'error', 'busy');
  end if;

  insert into public.upcycle_requests (name, phone, want_date, status, upload_key)
  values (v_name, v_phone, v_want, 'nhap', v_key)
  returning id, code into v_id, v_code;
  for it in select value from jsonb_array_elements(v_items) loop
    i := i + 1;
    select coalesce(array_agg(distinct x), '{}') into v_cond from jsonb_array_elements_text(it->'conditions') x;
    insert into public.upcycle_items (request_id, pos, kind, kind_other, qty, conditions, problem, idea_kind, idea, measures)
    values (v_id, i, it->>'kind', nullif(btrim(coalesce(it->>'kind_other', '')), ''), (it->>'qty')::int, v_cond,
            nullif(btrim(coalesce(it->>'problem', '')), ''), it->>'idea_kind', nullif(btrim(coalesce(it->>'idea', '')), ''),
            coalesce(it->'measures', '{}'::jsonb));
  end loop;
  return jsonb_build_object('ok', true, 'id', v_id, 'code', v_code, 'key', v_key, 'left', v_month - v_used - 1);
end $$;

-- → { ok, code, left } | { ok:false, error: not_found | expired | no_photo, items[] }
create or replace function public.upcycle_finish(p_id uuid, p_key text)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $$
declare
  r record;
  v_missing int[];
  cfg jsonb := coalesce((select s.value from public.settings s where s.key = 'upcycle'), '{}'::jsonb);
  v_used int;
begin
  select * into r from public.upcycle_requests q where q.id = p_id for update;
  if not found or r.status <> 'nhap' or r.upload_key is distinct from p_key then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;
  if r.created_at < now() - interval '45 minutes' then return jsonb_build_object('ok', false, 'error', 'expired'); end if;

  insert into public.upcycle_photos (request_id, item_id, kind, path)
  select r.id, i.id, case when m[2] = 'ph1' then 'phac_thao' else 'do' end, o.name
    from storage.objects o
    cross join lateral regexp_match(o.name, '/([1-9])-(do[1-9]|ph1)\.(webp|jpg)$') m
    join public.upcycle_items i on i.request_id = r.id and i.pos = m[1]::int
   where o.bucket_id = 'upcycle' and o.name like r.id::text || '/' || p_key || '/%' and m is not null
  on conflict (path) do nothing;

  select array_agg(i.pos order by i.pos) into v_missing from public.upcycle_items i
   where i.request_id = r.id
     and not exists (select 1 from public.upcycle_photos ph where ph.item_id = i.id and ph.kind = 'do');
  if v_missing is not null then return jsonb_build_object('ok', false, 'error', 'no_photo', 'items', to_jsonb(v_missing)); end if;

  update public.upcycle_requests set status = 'moi', finished_at = now(), upload_key = null where id = r.id;
  select count(*) into v_used from public.upcycle_requests q
   where q.phone = r.phone and q.finished_at is not null
     and q.created_at >= (date_trunc('month', now() at time zone 'Asia/Ho_Chi_Minh') at time zone 'Asia/Ho_Chi_Minh');
  return jsonb_build_object('ok', true, 'code', r.code,
    'left', greatest(0, coalesce((cfg->>'per_phone_month')::int, 5) - v_used));
end $$;

-- ---------- nhân sự ----------
-- "Chốt gói": mã đơn UP + chữ của gói cao nhất trong các món + 4 ký tự. Đổi
-- gói sau đó thì chỉ đổi chữ cái, giữ 4 ký tự (mã đã in trên phiếu).
create or replace function public.upcycle_lock(p_id uuid)
returns text
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_pkg text;
  v_old text;
  v_code text;
  v_letter text;
begin
  if not public.is_staff() then raise exception 'Chỉ nhân sự Gem mới chốt gói được.'; end if;
  select i.package into v_pkg from public.upcycle_items i where i.request_id = p_id and i.package is not null
   order by case i.package when 'signature' then 3 when 'plus' then 2 else 1 end desc limit 1;
  if v_pkg is null then raise exception 'Chưa chọn gói cho món nào.'; end if;
  v_letter := case v_pkg when 'signature' then 'S' when 'plus' then 'P' else 'B' end;
  select q.order_code into v_old from public.upcycle_requests q where q.id = p_id for update;
  if not found then raise exception 'Không tìm thấy yêu cầu.'; end if;
  if v_old is not null then
    v_code := 'UP' || v_letter || substr(v_old, 4);
    if v_code <> v_old and exists (select 1 from public.upcycle_requests q where q.order_code = v_code) then v_old := null; end if;
  end if;
  if v_old is null then
    loop
      v_code := 'UP' || v_letter || public.upcycle_rand(4);
      exit when not exists (select 1 from public.upcycle_requests q where q.order_code = v_code);
    end loop;
  end if;
  update public.upcycle_requests set order_code = v_code where id = p_id;
  return v_code;
end $$;

-- Photos to remove: requests done / cancelled more than 30 days ago, and
-- drafts left behind for a day. Admin deletes the files (Storage API), then
-- calls upcycle_cleanup_done with the requests.
create or replace function public.upcycle_cleanup()
returns jsonb
language plpgsql
stable
security definer
set search_path to ''
as $$
declare v_ids uuid[]; v_paths jsonb;
begin
  if not public.is_staff() then raise exception 'Chỉ nhân sự Gem.'; end if;
  select coalesce(array_agg(q.id), '{}') into v_ids from public.upcycle_requests q
   where (q.status in ('da_tra', 'huy') and q.closed_at < now() - interval '30 days' and q.photos_gone_at is null)
      or (q.status = 'nhap' and q.created_at < now() - interval '1 day');
  select coalesce(jsonb_agg(o.name), '[]'::jsonb) into v_paths from storage.objects o
   where o.bucket_id = 'upcycle' and split_part(o.name, '/', 1) = any (select x::text from unnest(v_ids) x);
  return jsonb_build_object('ids', to_jsonb(v_ids), 'paths', v_paths);
end $$;

create or replace function public.upcycle_cleanup_done(p_ids uuid[])
returns void
language plpgsql
security definer
set search_path to ''
as $$
begin
  if not public.is_staff() then raise exception 'Chỉ nhân sự Gem.'; end if;
  delete from public.upcycle_requests q where q.id = any (p_ids) and q.status = 'nhap' and q.created_at < now() - interval '1 day';
  delete from public.upcycle_photos ph where ph.request_id = any (p_ids)
     and exists (select 1 from public.upcycle_requests q where q.id = ph.request_id and q.status in ('da_tra', 'huy'));
  update public.upcycle_requests q set photos_gone_at = now()
   where q.id = any (p_ids) and q.status in ('da_tra', 'huy') and q.photos_gone_at is null;
end $$;

-- ---------- mail báo: thêm loại 'upcycle' ----------
create or replace function public.notify_payload(p_kind text, p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $$
declare v jsonb; v_at timestamptz; v_to jsonb;
begin
  if p_kind = 'order' then
    select to_jsonb(o) || jsonb_build_object('items', coalesce((
             select jsonb_agg(jsonb_build_object('name', i.name_vi, 'option', i.option_vi,
                                                 'qty', i.qty, 'price', i.price) order by i.name_vi)
             from public.order_items i where i.order_id = o.id), '[]'::jsonb)), o.created_at
      into v, v_at from public.orders o where o.id = p_id;
  elsif p_kind = 'booking' then
    select to_jsonb(b) || jsonb_build_object('starts_at', s.starts_at, 'workshop', w.name_vi), b.created_at
      into v, v_at
      from public.bookings b join public.sessions s on s.id = b.session_id
      left join public.workshop_types w on w.id = s.workshop_type_id
     where b.id = p_id;
  elsif p_kind = 'note' then
    select to_jsonb(n), n.created_at into v, v_at from public.notes n where n.id = p_id;
  elsif p_kind = 'upcycle' then
    select (to_jsonb(r) - 'upload_key') || jsonb_build_object('items', coalesce((
             select jsonb_agg(jsonb_build_object('kind', i.kind, 'kind_other', i.kind_other, 'qty', i.qty,
                                                 'conditions', i.conditions, 'idea_kind', i.idea_kind, 'idea', i.idea,
                                                 'problem', i.problem) order by i.pos)
             from public.upcycle_items i where i.request_id = r.id), '[]'::jsonb)), r.finished_at
      into v, v_at from public.upcycle_requests r where r.id = p_id and r.status <> 'nhap';
  else
    return jsonb_build_object('error', 'bad_kind');
  end if;

  if v is null then return jsonb_build_object('error', 'not_found'); end if;
  if v_at < now() - interval '1 hour' then return jsonb_build_object('old', true); end if;

  insert into public.notify_log (kind, ref) values (p_kind, p_id) on conflict do nothing;
  if not found then return jsonb_build_object('dup', true); end if;

  select coalesce(jsonb_agg(u.email), '[]'::jsonb) into v_to
    from public.staff st join auth.users u on u.id = st.user_id where u.email is not null;

  return jsonb_build_object('data', v, 'to', v_to);
end $$;

-- ---------- quyền ----------
alter table public.upcycle_requests enable row level security;
alter table public.upcycle_items enable row level security;
alter table public.upcycle_photos enable row level security;

drop policy if exists ur_staff on public.upcycle_requests;
create policy ur_staff on public.upcycle_requests for all to authenticated
  using (public.is_staff()) with check (public.is_staff());
drop policy if exists ui_staff on public.upcycle_items;
create policy ui_staff on public.upcycle_items for all to authenticated
  using (public.is_staff()) with check (public.is_staff());
drop policy if exists up_staff_read on public.upcycle_photos;
create policy up_staff_read on public.upcycle_photos for select to authenticated using (public.is_staff());
drop policy if exists up_staff_delete on public.upcycle_photos;
create policy up_staff_delete on public.upcycle_photos for delete to authenticated using (public.is_staff());

revoke all on public.upcycle_requests, public.upcycle_items, public.upcycle_photos from anon, authenticated;
grant select, insert, update, delete on public.upcycle_requests, public.upcycle_items to authenticated;
grant select, delete on public.upcycle_photos to authenticated;

revoke all on function public.upcycle_rand(int), public.gen_upcycle_code(), public.upcycle_phone(text),
  public.upcycle_conditions_ok(text[]), public.upcycle_measures_ok(jsonb), public.upcycle_touch(),
  public.upcycle_may_upload(text), public.upcycle_submit(jsonb), public.upcycle_finish(uuid, text),
  public.upcycle_lock(uuid), public.upcycle_cleanup(), public.upcycle_cleanup_done(uuid[]) from public, anon, authenticated;
-- the customer's two steps, and the storage policy's check (run as anon)
grant execute on function public.upcycle_submit(jsonb), public.upcycle_finish(uuid, text),
  public.upcycle_may_upload(text) to anon, authenticated;
-- staff: a new request typed in admin takes its code by default; the checks
-- run as the staff member; lock / cleanup check is_staff() inside
grant execute on function public.gen_upcycle_code(), public.upcycle_conditions_ok(text[]),
  public.upcycle_measures_ok(jsonb), public.upcycle_lock(uuid), public.upcycle_cleanup(),
  public.upcycle_cleanup_done(uuid[]) to authenticated;
