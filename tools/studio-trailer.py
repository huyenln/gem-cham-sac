#!/usr/bin/env python3
"""The Studio 2D preview video on the home page, recorded from the real studio.

    video/studio-2d-doc-vi.mp4     720 x 1280  phones (portrait), Vietnamese studio
    video/studio-2d-doc-en.mp4     720 x 1280  phones, English studio
    video/studio-2d-ngang-vi.mp4   1280 x 720  computers (landscape), Vietnamese studio
    video/studio-2d-ngang-en.mp4   1280 x 720  computers, English studio
    images/studio/studio-2d-<doc|ngang>-<vi|en>.webp   its first frame, shown until it plays
    tools/out/studio-2d-<doc|ngang>-<vi|en>-hq.mp4     1080 x 1920 / 1920 x 1080 for social media
                                                       (not committed: tools/out/ is in .gitignore)

Run by hand when the studio changes (new drawings, a layout published in "Lắp
studio", other products on the shelves), look at the videos, then commit the
video/ and images/ files:

    python3 tools/studio-trailer.py              # all four
    python3 tools/studio-trailer.py doc vi       # one of them

How: studio.html opens from a local server and reads the published layout and
products from Supabase like any visitor (reads only; it needs the network). A
fixed walk plays, with a fingertip (phone) or a pointer (computer) drawn on
the screen: the street, litter falls and is picked up; the đàn tranh; the
waste-sorting game; in through the door; the try-on corner; a product off the
shelf; the design table, sewn. Then a closing card. Chrome's screencast
records it. The phone version taps with touch events, as a phone does (a
product: the first tap names it, the second opens it). The browser is a real
window, on a virtual display when there is no screen: headless Chrome hands the
screencast over at CSS size only (405 x 720 for a phone, too soft). ffmpeg
then joins the scenes with short fades.

The video has no words of its own: what is on screen is the studio's own text,
in the version's language. No sound: a video that plays by itself must be muted.
Things picked at random in the studio (the litter, the thing to sort, the
fabric in the basket) differ from one run to the next.

Needs: pip install playwright pillow; ffmpeg; Chromium (PLAYWRIGHT_BROWSERS_PATH,
or CHROMIUM=/path/to/chrome). Linux without a screen: xvfb-run (the script
restarts itself under it).
"""
import asyncio
import base64
import functools
import http.server
import os
import shutil
import subprocess
import sys
import tempfile
import threading
import time
from pathlib import Path

from playwright.async_api import TimeoutError as PWTimeout, async_playwright

ROOT = Path(__file__).resolve().parent.parent
PORT = 8767
HQ_DIR = ROOT / 'tools' / 'out'
FPS = 30
FADE = 0.3   # seconds of cross-fade between scenes

# What is recorded is the viewport x dsf; the web copy is scaled from that.
FORMATS = {
    # a phone (about what a phone browser shows of the page: 9:16)
    'doc': dict(w=405, h=720, dsf=2, touch=True, web=(720, 1280), hq=(1080, 1920)),
    # a computer
    'ngang': dict(w=1280, h=720, dsf=1.5, touch=False, web=(1280, 720), hq=(1920, 1080)),
}

# No first-visit tips or intros, no offer of English; litter falls a second
# in; level 1 of the waste game done and level 2 known (no how-to card).
QUIET = """
localStorage.setItem('gem-guide', JSON.stringify({seen: {}, off: true}));
localStorage.setItem('gem-lang-hint', 'dismissed');
localStorage.setItem('gem-studio-intro', '1');
localStorage.setItem('gem-motion', 'on');
localStorage.setItem('gem-pl', JSON.stringify({lv: 1, sort: 1}));
if (/[?&]warm=1/.test(location.search)) {   // warm_up(): inside, nothing falls
  sessionStorage.setItem('tr-started', '1');
  sessionStorage.setItem('gem-scene', 'in');
  localStorage.setItem('gem-batngo', '0');
} else if (!sessionStorage.getItem('tr-started')) {
  sessionStorage.setItem('tr-started', '1');
  sessionStorage.setItem('gem-scene', 'out');
  localStorage.setItem('gem-batngo', '1');
  sessionStorage.setItem('gem-bn', JSON.stringify({n: 0, left: 1}));
}
"""

# The hand on screen: a fingertip on the phone, an arrow on the computer.
HAND = """
addEventListener('DOMContentLoaded', () => {
  const s = document.createElement('style');
  s.textContent =
    '.tr-hand{position:fixed;left:-99px;top:-99px;pointer-events:none;z-index:2147483647;opacity:0;transition:opacity .25s}' +
    '.tr-hand.on{opacity:1}' +
    '.tr-touch{width:44px;height:44px;margin:-22px 0 0 -22px;border-radius:50%;background:rgba(255,255,255,.45);' +
      'border:3px solid rgba(61,74,46,.55);box-shadow:0 3px 10px rgba(0,0,0,.22);transition:opacity .25s,transform .12s,background .12s}' +
    '.tr-touch.down{transform:scale(.78);background:rgba(255,255,255,.8)}' +
    '.tr-arrow{width:26px;height:34px;margin:-2px 0 0 -3px;filter:drop-shadow(0 2px 3px rgba(0,0,0,.3))}' +
    '.tr-ring{position:fixed;width:34px;height:34px;margin:-17px 0 0 -17px;border-radius:50%;border:3px solid rgba(135,150,90,.9);' +
      'pointer-events:none;z-index:2147483646;animation:tr-ring .45s ease-out forwards}' +
    '@keyframes tr-ring{from{transform:scale(.4);opacity:1}to{transform:scale(1.4);opacity:0}}';
  document.head.appendChild(s);
  const touch = !!window.__trTouch;
  const f = document.createElement('div');
  f.className = 'tr-hand ' + (touch ? 'tr-touch' : 'tr-arrow');
  if (!touch) f.innerHTML = '<svg viewBox="0 0 26 34" width="26" height="34"><path d="M3 2 L3 27 L9.5 21 L14 31 L18.5 29 L14 19.5 L22.5 19.5 Z" ' +
    'fill="#fff" stroke="#2b2b2b" stroke-width="2" stroke-linejoin="round"/></svg>';
  document.body.appendChild(f);
  window.__hand = (x, y, state) => {
    f.style.left = x + 'px'; f.style.top = y + 'px';
    f.classList.toggle('on', state !== 'off');
    f.classList.toggle('down', state === 'down');
    if (state === 'click') {
      const r = document.createElement('div');
      r.className = 'tr-ring'; r.style.left = x + 'px'; r.style.top = y + 'px';
      document.body.appendChild(r);
      setTimeout(() => r.remove(), 500);
    }
  };
});
"""


class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass


def run(cmd):
    r = subprocess.run([str(c) for c in cmd], capture_output=True, text=True)
    if r.returncode:
        raise SystemExit('failed: ' + ' '.join(map(str, cmd)) + '\n' + r.stderr[-2000:])
    return r.stdout


def duration(path):
    return float(run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', path]).strip())


# ---------------------------------------------------------------------------
# recording

class Shot:
    """Records the page between start() and stop() with Chrome's screencast.
    Chrome sends a frame only when something changed, with the time it was
    drawn: a still moment is one frame held."""

    def __init__(self, page, cdp, size, folder):
        self.page, self.cdp, self.size, self.folder = page, cdp, size, folder
        self.frames, self.n, self.on = [], 0, False
        cdp.on('Page.screencastFrame', self._frame)

    def _frame(self, ev):
        asyncio.ensure_future(self.cdp.send('Page.screencastFrameAck', {'sessionId': ev['sessionId']}))
        if not self.on:
            return
        path = self.folder / f'{self.n:05d}.jpg'
        self.n += 1
        path.write_bytes(base64.b64decode(ev['data']))
        self.frames.append((path, ev['metadata']['timestamp']))

    async def start(self):
        self.first, self.on = len(self.frames), True
        await self.cdp.send('Page.startScreencast', {'format': 'jpeg', 'quality': 92,
                                                     'maxWidth': self.size[0], 'maxHeight': self.size[1]})

    async def stop(self):
        await self.page.wait_for_timeout(120)
        end = time.time()
        await self.cdp.send('Page.stopScreencast')
        self.on = False
        await self.page.wait_for_timeout(100)
        return self.frames[self.first:], end


class Hand:
    """Moves like a hand and shows where it is. Touch: CDP touch events (a
    phone's taps, drags and no hover); else the mouse."""

    def __init__(self, page, cdp, touch):
        self.page, self.cdp, self.touch = page, cdp, touch
        self.x = self.y = None

    async def show(self, state='on'):
        await self.page.evaluate('([x, y, s]) => window.__hand && window.__hand(x, y, s)', [self.x, self.y, state])

    async def _touch(self, kind):
        pts = [] if kind == 'touchEnd' else [{'x': self.x, 'y': self.y, 'radiusX': 12, 'radiusY': 12, 'force': 1, 'id': 0}]
        await self.cdp.send('Input.dispatchTouchEvent', {'type': kind, 'touchPoints': pts})

    async def glide(self, x, y, ms=320, pressed=False):
        if self.x is None:
            self.x, self.y = x + 40, y + 90
        steps = max(4, ms // 34)
        x0, y0, t0 = self.x, self.y, time.monotonic()
        for i in range(1, steps + 1):
            k = i / steps
            k = k * k * (3 - 2 * k)   # ease in and out
            self.x, self.y = x0 + (x - x0) * k, y0 + (y - y0) * k
            if pressed and self.touch:
                await self._touch('touchMove')
            elif not self.touch:
                await self.page.mouse.move(self.x, self.y)
            await self.show('down' if pressed else 'on')
            late = t0 + ms / 1000 * i / steps - time.monotonic()
            if late > 0:
                await asyncio.sleep(late)

    async def tap(self, target, after=350, glide=320):
        x, y = await where(self.page, target)
        await self.glide(x, y, glide)
        x, y = await where(self.page, target, hit=True)   # still there, and nothing over it
        await self.page.wait_for_timeout(60)
        await self.show('down' if self.touch else 'click')
        if self.touch:
            await self._touch('touchStart')
            await self.page.wait_for_timeout(60)
            await self._touch('touchEnd')
        else:
            await self.page.mouse.down()
            await self.page.wait_for_timeout(60)
            await self.page.mouse.up()
        await self.page.wait_for_timeout(50)
        await self.show('on')
        await self.page.wait_for_timeout(after)

    async def drag(self, a, b, ms=650, after=350):
        ax, ay = await where(self.page, a, hit=True)
        bx, by = await where(self.page, b)
        await self.glide(ax, ay)
        await self.page.wait_for_timeout(60)
        await self.show('down')
        if self.touch:
            await self._touch('touchStart')
        else:
            await self.page.mouse.down()
        await self.page.wait_for_timeout(90)
        # a small first step, as a finger does before it travels
        await self.glide(ax + (bx - ax) * 0.05 + 6, ay + (by - ay) * 0.05 + 6, 70, pressed=True)
        await self.glide(bx, by, ms, pressed=True)
        await self.page.wait_for_timeout(60)
        if self.touch:
            await self._touch('touchEnd')
        else:
            await self.page.mouse.up()
        await self.show('on')
        await self.page.wait_for_timeout(after)

    async def away(self, ms=0):
        await self.show('off')
        if ms:
            await self.page.wait_for_timeout(ms)


async def where(page, target, hit=False):
    """The middle of target (a selector, or a point). hit: and it is what a
    finger there would touch (in view, nothing over it), else stop: a tap that
    lands on something else plays a different walk."""
    if isinstance(target, (tuple, list)):
        return target
    box = await page.evaluate("""([s, hit]) => { const e = document.querySelector(s);
        if (!e) return null; const r = e.getBoundingClientRect(); if (!r.width) return null;
        const x = r.x + r.width / 2, y = r.y + r.height / 2;
        if (hit) { const u = document.elementFromPoint(x, y);
          if (!u || !(e === u || e.contains(u) || u.contains(e))) return [x, y, u ? u.outerHTML.slice(0, 120) : 'nothing (off screen)']; }
        return [x, y]; }""", [target, hit])
    if not box:
        raise SystemExit(f'not on the page: {target}')
    if len(box) > 2:
        raise SystemExit(f'{target} is covered by: {box[2]}')
    return box


async def scroll_sheet(page, target, block='center', ms=550):
    """Scroll the open sheet (smoothly, as a swipe would) so target shows:
    near the top (start), the middle, or just above the foot (end)."""
    await page.evaluate("""([s, block]) => { const e = document.querySelector(s), sh = document.querySelector('.st-sheet');
        if (!e || !sh) return; const r = e.getBoundingClientRect(), q = sh.getBoundingClientRect();
        const want = block === 'start' ? q.top + 50 : block === 'end' ? Math.min(q.bottom, innerHeight) - 24 - r.height : (q.top + Math.min(q.bottom, innerHeight)) / 2 - r.height / 2;
        sh.scrollBy({top: r.top - want, behavior: 'smooth'}); }""", [target, block])
    await page.wait_for_timeout(ms)


async def tag(page, js):
    """Mark the element js finds (in the page) as [data-tr] and return that selector."""
    ok = await page.evaluate(f"""() => {{ document.querySelectorAll('[data-tr]').forEach(e => e.removeAttribute('data-tr'));
        const e = ({js})(); if (!e) return false; e.setAttribute('data-tr', ''); return true; }}""")
    if not ok:
        raise SystemExit(f'nothing found: {js}')
    return '[data-tr]'


def street_button(names):
    """One of the street's own nav buttons (the owner's places, by their name;
    the names typed in "Lắp studio" can come decomposed: NFC before comparing)."""
    return f"""() => [...document.querySelectorAll('.st-nav .st-go-out')].find(b => {names!r}.includes(b.textContent.trim().normalize('NFC')))"""


async def sheet_open(page, timeout=10000):
    await page.wait_for_function("(() => { const m = document.querySelector('.st-modal'); return m && !m.hidden; })()", timeout=timeout)


async def sheet_is_open(page):
    return await page.evaluate("(() => { const m = document.querySelector('.st-modal'); return !!m && !m.hidden; })()")


async def close_sheet(page, hand, after=300):
    if await sheet_is_open(page):
        await hand.tap('.st-modal .st-close', after=after)


async def nav(page, hand, sel, after=120):
    """A bottom-bar button, with no sheet left open over it."""
    if await sheet_is_open(page):
        raise SystemExit(f'a sheet is still open before {sel}')
    await hand.tap(sel, after=after)


# ---------------------------------------------------------------------------
# the walk, scene by scene. Each plays at real speed; SCENES says how much
# faster it goes in the video (walks are slow to watch).

async def s_street(page, hand):
    """The street; litter falls; picked up; the message card."""
    await page.wait_for_function("document.querySelectorAll('.rr-item').length > 0", timeout=15000)
    await page.wait_for_timeout(1100)   # it lands
    while await page.evaluate("document.querySelectorAll('.rr-item:not(.is-up)').length"):
        await hand.tap('.rr-item:not(.is-up)', after=120, glide=260)
    await page.wait_for_function("!!document.querySelector('.rr-card')", timeout=5000)
    await hand.away(1400)
    await hand.tap('.rr-close', after=250)
    await hand.away()


async def s_zither(page, hand):
    """Over to the đàn tranh; a finger runs across the strings."""
    await nav(page, hand, await tag(page, street_button(['Chơi đàn tranh', 'Đàn tranh zither'])))
    await hand.away()
    await page.wait_for_function("document.documentElement.classList.contains('zt-open')", timeout=10000)
    await page.wait_for_timeout(300)
    pts = await page.evaluate("""() => { const s = [...document.querySelectorAll('.zt-str')]; if (s.length < 8) return null;
        const c = (i, k) => { const r = s[i].getBoundingClientRect(); return [r.x + r.width * k, r.y + r.height / 2]; };
        return [c(1, 0.55), c(s.length - 2, 0.7)]; }""")
    await hand.drag(pts[0], pts[1], ms=650, after=350)
    await close_sheet(page, hand)
    await hand.away()


async def s_sorting(page, hand):
    """The waste-sorting corner: level 2, one thing into the right bag."""
    await nav(page, hand, await tag(page, street_button(['Góc Phân Loại', 'Sort the waste'])))
    await hand.away()
    await page.wait_for_function("(() => { const b = document.querySelector('.pl-lv[data-pl-go=\"sort\"]'); return b && b.getBoundingClientRect().width > 0; })()", timeout=12000)
    await page.wait_for_timeout(500)
    await hand.tap('.pl-lv[data-pl-go="sort"]', after=550)
    bin_ = await page.evaluate("""() => { const e = document.querySelector('.pl-one [data-pl-item]'); if (!e) return null;
        const it = GemPhanLoai.ITEMS.find(x => x.id === e.dataset.plItem); return it && it.bin; }""")
    if not bin_:
        raise SystemExit('the sorting round did not start')
    await hand.drag('.pl-one [data-pl-item] img', f'[data-pl-bin="{bin_}"]', ms=650, after=200)
    await hand.away(1150)
    await close_sheet(page, hand)
    await hand.away()


# Inside, the studio shows its wall as soon as the wall is in and the rest as
# each picture arrives: the shelves and the rail popped in on the video. The
# video holds the room hidden (the street has faded out) till the pictures in
# view are in and decoded, then lets it fade in. The studio itself is unchanged.
SETTLED = """() => Promise.race([new Promise(r => setTimeout(r, 4000)), Promise.all([...document.querySelectorAll('#st-world img')]
  .filter(i => { const r = i.getBoundingClientRect(); return r.right > 0 && r.left < innerWidth; })
  .map(i => (i.complete ? Promise.resolve() : new Promise(r => { i.addEventListener('load', r, {once: true}); i.addEventListener('error', r, {once: true}); }))
    .then(() => i.decode ? i.decode().catch(() => {}) : null)))])"""


async def s_door(page, hand):
    """In through the door: the bell, the welcome."""
    await nav(page, hand, '.st-nav .st-go-in')
    await hand.away()
    await page.wait_for_function("document.documentElement.classList.contains('st-wait')", timeout=15000)
    await page.add_style_tag(content='.tr-hold .st-world { opacity: 0 !important; }')
    await page.evaluate("document.documentElement.classList.add('tr-hold')")
    await page.wait_for_function("!document.body.classList.contains('st-is-out') && !document.documentElement.classList.contains('st-wait')", timeout=15000)
    await page.evaluate(SETTLED)
    await page.wait_for_timeout(60)
    await page.evaluate("document.documentElement.classList.remove('tr-hold')")
    await page.wait_for_function("(() => { const b = document.getElementById('st-bubble'); return b && !b.hidden && b.textContent.trim(); })()", timeout=8000)
    await page.wait_for_timeout(1000)


async def s_fitting(page, hand):
    """The try-on corner: a bag, tried on, then worn in the studio."""
    await nav(page, hand, '.st-nav [data-go="fitting"]')
    await hand.away(1500)
    lab = await tag(page, """() => [...document.querySelectorAll('.st-zone-label')].find(l => !l.hidden && /thử đồ|fitting/i.test(l.textContent.normalize('NFC')))""")
    await hand.tap(lab, after=150)
    await sheet_open(page)
    await page.wait_for_function("document.querySelectorAll('.fit-pick').length > 0", timeout=10000)
    await hand.away(500)
    want = await page.evaluate("""() => { const p = [...document.querySelectorAll('.fit-pick')].map(b => b.dataset.try);
        return p.find(x => x === 'denim') || p.find(x => x.startsWith('tui-di-choi')) || p[1] || p[0]; }""")
    pick = f'.fit-pick[data-try="{want}"]'
    if hand.touch:   # a phone: the list is under the picture
        await scroll_sheet(page, pick)
    await hand.tap(pick, after=250)
    if hand.touch:   # back up: the picture, and "Đeo thử" under it
        await scroll_sheet(page, '.fit [data-wear]', block='end')
    await hand.away(700)
    await hand.tap('.fit [data-wear]', after=150)
    await hand.away()
    if await sheet_is_open(page):
        raise SystemExit('"Đeo thử" did not close the sheet')
    await page.wait_for_timeout(1500)


async def s_shelf(page, hand):
    """A product off the shelf: its real photos, its price."""
    await nav(page, hand, '.st-nav [data-go="shelves"]')
    await hand.away(1500)
    vis = """e => { const r = e.getBoundingClientRect(); return r.left > 40 && r.right < innerWidth - 40 && r.top > 80 && r.bottom < innerHeight - 120 && r.width > 24; }"""
    sku = await page.evaluate(f"""() => {{ const vis = {vis};
        for (const s of ['goi', 'tui-laptop', 'origami', 'tham', 'bloom']) if ([...document.querySelectorAll('.st-shelf-prod[data-sku="' + s + '"]')].some(vis)) return s;
        const e = [...document.querySelectorAll('.st-shelf-prod')].find(vis); return e && e.dataset.sku; }}""")
    if not sku:
        raise SystemExit('no product in view at the shelves')
    prod = await tag(page, f"""() => [...document.querySelectorAll('.st-shelf-prod[data-sku="{sku}"]')].find({vis})""")
    await hand.tap(prod, after=550)
    if hand.touch:   # the first tap names it and walks over; the second opens it
        await hand.tap(prod, after=150)
    await sheet_open(page)
    await hand.away(1600)
    await close_sheet(page, hand)
    await hand.away()


# The fabric to drag on and where: the patch nearest the middle of the piece,
# and the scrap (not on the piece yet) whose colour is furthest from what is
# on it, a real print a little ahead (GemPatch.keyColor: a basic colour's own,
# a real fabric's colour family's).
PICK_FABRIC = """() => {
  const P = window.GemPatch;
  const rgb = h => { const n = parseInt(String(h).replace('#', ''), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
  const dist = (a, b) => { const x = rgb(P.keyColor(a)), y = rgb(P.keyColor(b)); return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]); };
  const keyOf = p => { const m = /#gp\\d+-([a-z0-9]+?)(p\\d+)?\\)/.exec(p.getAttribute('fill') || ''); return m ? m[1] : ''; };
  const mid = r => [r.x + r.width / 2, r.y + r.height / 2];
  const patches = [...document.querySelectorAll('.pt-board [data-i]')].map(p => ({ i: p.getAttribute('data-i'), k: keyOf(p), c: mid(p.getBoundingClientRect()) }))
    .filter(p => p.k);
  const svg = document.querySelector('.pt-board svg');
  if (!patches.length || !svg) return null;
  const c = mid(svg.getBoundingClientRect());
  const target = patches.sort((a, b) => Math.hypot(a.c[0] - c[0], a.c[1] - c[1]) - Math.hypot(b.c[0] - c[0], b.c[1] - c[1]))[0];
  const used = [...new Set(patches.map(p => p.k))];
  const scraps = [...document.querySelectorAll('.pt-scrap')].map(e => ({ e, k: e.getAttribute('data-scrap'), real: e.classList.contains('is-real') }))
    .filter(s => used.indexOf(s.k) < 0);
  if (!scraps.length) return null;
  const score = s => Math.min(...used.map(u => dist(s.k, u))) + 0.5 * dist(s.k, target.k) + (s.real ? 40 : 0);
  const best = scraps.sort((a, b) => score(b) - score(a))[0];
  document.querySelectorAll('[data-tr]').forEach(e => e.removeAttribute('data-tr'));
  best.e.setAttribute('data-tr', '');
  return target.i;
}"""


async def s_design(page, hand):
    """The design table: a mood fills the piece, a fabric dragged on, sewn."""
    await nav(page, hand, '.st-nav [data-go="sewing"]')
    await hand.away()
    await page.wait_for_function("document.querySelectorAll('.pt-scrap').length > 2 && document.querySelector('.pt-board svg')", timeout=15000)
    await page.wait_for_timeout(500)
    mood = await tag(page, """() => [...document.querySelectorAll('.pt-mood[data-mood]')].filter(b => !/^(mix|gem)$/.test(b.dataset.mood))[1]""")
    if hand.touch:
        await scroll_sheet(page, mood, ms=500)
    await hand.tap(mood, after=500)
    if hand.touch:   # the piece at the top, the basket under it
        await scroll_sheet(page, '.pt-board', block='start', ms=500)
    patch = await page.evaluate(PICK_FABRIC)
    if patch is None:
        raise SystemExit('no fabric in the basket that is not on the piece already')
    await hand.drag('[data-tr]', f'.pt-board [data-i="{patch}"]', ms=700, after=550)
    if hand.touch:
        await scroll_sheet(page, '[data-pt="sew"]', block='end', ms=350)
    await hand.tap('[data-pt="sew"]', after=150)
    await hand.away()
    await page.wait_for_function("(() => { const s = document.querySelector('.pt-sewer'); return s && s.classList.contains('is-cheer'); })()", timeout=10000)
    try:   # the card to share, drawn (not "Đang làm thẻ…")
        await page.wait_for_function("(() => { const b = document.querySelector('.pt-done-card'), i = b && b.querySelector('img');"
                                     " return b && !b.classList.contains('is-wait') && i && i.complete && i.naturalWidth > 0; })()", timeout=6000)
    except PWTimeout:
        print('  the share card was not ready')
    await page.wait_for_timeout(800)


# (name, the walk, how much faster it plays in the video)
SCENES = [('street', s_street, 1.15), ('zither', s_zither, 1.2), ('sorting', s_sorting, 1.2), ('door', s_door, 1.35),
          ('fitting', s_fitting, 1.3), ('shelf', s_shelf, 1.3), ('design', s_design, 1.15)]


async def end_card(browser, F, out):
    """The closing card: Udon waving, the logo, Gem Studio 2D, the address."""
    w, h = F['w'], F['h']
    ctx = await browser.new_context(viewport={'width': w, 'height': h})
    page = await ctx.new_page()
    await page.goto(f'http://localhost:{PORT}/404.html', wait_until='load')   # same origin: the site's pictures
    tall = h > w
    u = min(w, h) * (0.5 if tall else 0.62)
    await page.set_content(f"""<!doctype html><html><head>
      <link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@500&family=Nunito:wght@800&display=swap" rel="stylesheet">
      <style>html,body{{margin:0;height:100%;background:#F0E1D2}}
        body{{display:flex;flex-direction:{'column' if tall else 'row'};align-items:center;justify-content:center;gap:{u * 0.12:.0f}px;
          color:#3D4A2E;font-family:'Nunito',sans-serif;text-align:{'center' if tall else 'left'}}}
        .ud{{width:{u:.0f}px;height:auto}}
        .logo{{width:{u * 0.26:.0f}px;height:auto;display:block;margin:{'0 auto' if tall else '0'} {u * 0.06:.0f}px}}
        h1{{font-size:{u * 0.17:.0f}px;font-weight:800;margin:0;line-height:1.1}}
        p{{font-family:'Be Vietnam Pro',sans-serif;font-weight:500;font-size:{u * 0.075:.0f}px;margin:{u * 0.05:.0f}px 0 0;color:#6E7B45}}
      </style></head><body>
      <img class="ud" src="http://localhost:{PORT}/images/studio/udon/ud-vay.webp" alt="">
      <div><img class="logo" src="http://localhost:{PORT}/images/logo/gem_logo_full.png" alt="">
      <h1>Gem Studio 2D</h1><p>gemchamsac.com/studio</p></div></body></html>""")
    await page.wait_for_function("document.fonts.ready.then(() => document.fonts.check('800 20px Nunito') && [...document.images].every(i => i.complete && i.naturalWidth))")
    await page.wait_for_timeout(300)
    await page.screenshot(path=str(out))
    await ctx.close()


async def warm_up(ctx):
    """Every picture inside the studio fetched once, out of shot: they load as
    they come into view, and the first walk in showed the shelves and the rail
    arriving one by one. A second tab of the same browser walks the length of
    the studio (arrow keys: no sheet opens, nothing is saved) and closes."""
    pg = await ctx.new_page()
    await pg.goto(f'http://localhost:{PORT}/studio.html?warm=1', wait_until='load')
    await pg.wait_for_function("!document.documentElement.classList.contains('st-wait')"
                               " && !document.body.classList.contains('st-is-out')", timeout=20000)
    await pg.locator('body').focus()
    for _ in range(18):
        await pg.keyboard.press('ArrowRight')
        await pg.wait_for_timeout(300)
    await pg.wait_for_function("[...document.querySelectorAll('#st-world img')].every(i => i.complete)", timeout=20000)
    await pg.close()


async def record(p, exe, fmt, lang, work):
    F = FORMATS[fmt]
    size = (int(F['w'] * F['dsf']), int(F['h'] * F['dsf']))
    args = [f'--force-device-scale-factor={F["dsf"]}', '--hide-scrollbars', '--autoplay-policy=no-user-gesture-required',
            f'--window-size={F["w"]},{F["h"] + 160}']
    opts = dict(headless=False, args=args)
    if exe:
        opts['executable_path'] = exe
    browser = await p.chromium.launch(**opts)
    ctx = await browser.new_context(viewport={'width': F['w'], 'height': F['h']}, has_touch=F['touch'],
                                    locale='vi-VN' if lang == 'vi' else 'en-US')
    await ctx.add_init_script(QUIET + f"localStorage.setItem('gem-lang', '{lang}');" +
                              f"window.__trTouch = {'true' if F['touch'] else 'false'};" + HAND)
    await warm_up(ctx)
    page = await ctx.new_page()
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    await page.goto(f'http://localhost:{PORT}/studio.html', wait_until='load')
    await page.wait_for_function("!document.documentElement.classList.contains('st-wait')"
                                 " && document.body.classList.contains('st-is-out')", timeout=20000)
    await page.wait_for_function("[...document.querySelectorAll('#st-world img')].every(i => i.complete)", timeout=20000)
    cdp = await ctx.new_cdp_session(page)
    frames_dir = work / 'frames'
    frames_dir.mkdir(parents=True, exist_ok=True)
    shot = Shot(page, cdp, size, frames_dir)
    hand = Hand(page, cdp, F['touch'])
    clips = []
    for name, fn, speed in SCENES:
        await shot.start()
        try:
            await fn(page, hand)
        except BaseException:
            await page.screenshot(path=str(HQ_DIR / f'trailer-failed-{fmt}-{lang}-{name}.png'))
            raise
        frames, end = await shot.stop()
        clips.append((name, frames, end, speed))
        print(f'  {name}: {len(frames)} frames, {end - frames[0][1]:.1f} s' if frames else f'  {name}: no frames')
    end = work / 'end.png'
    await end_card(browser, F, end)
    await browser.close()
    if errors:
        print('  script errors on the page:', errors)
    return clips, end, size


# ---------------------------------------------------------------------------
# cutting

def scene_clip(frames, end, size, out, speed=1.0):
    """Frames, each held till the next one came (sped up by speed), to a 30 fps clip."""
    lst = out.with_suffix('.txt')
    lines = ['ffconcat version 1.0']
    for i, (path, t) in enumerate(frames):
        nxt = frames[i + 1][1] if i + 1 < len(frames) else end
        lines += [f"file '{path}'", f'duration {max((nxt - t) / speed, 0.001):.4f}']
    lines.append(f"file '{frames[-1][0]}'")
    lst.write_text('\n'.join(lines))
    run(['ffmpeg', '-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', lst,
         '-vf', f'fps={FPS},scale={size[0]}:{size[1]}:flags=lanczos,format=yuv420p',
         '-c:v', 'libx264', '-crf', '12', '-preset', 'veryfast', out])


def join(clips, out):
    """The clips one after another, a short cross-fade between each."""
    inputs, chain, offset, last = [], [], 0.0, '[0:v]'
    for c in clips:
        inputs += ['-i', c]
    for i in range(1, len(clips)):
        offset += duration(clips[i - 1]) - FADE
        chain.append(f'{last}[{i}:v]xfade=transition=fade:duration={FADE}:offset={offset:.3f}[v{i}]')
        last = f'[v{i}]'
    run(['ffmpeg', '-y', '-v', 'error', *inputs, '-filter_complex', ';'.join(chain), '-map', last,
         '-c:v', 'libx264', '-crf', '12', '-preset', 'veryfast', '-pix_fmt', 'yuv420p', out])


def final(master, size, crf, out, preset='slow'):
    # tune animation: the drawings' flat paper and lines (a third smaller than
    # the default at the same look); faststart: it can play before it is all in
    run(['ffmpeg', '-y', '-v', 'error', '-i', master, '-vf', f'scale={size[0]}:{size[1]}:flags=lanczos,format=yuv420p',
         '-c:v', 'libx264', '-profile:v', 'high', '-crf', crf, '-tune', 'animation', '-preset', preset, '-r', FPS,
         '-movflags', '+faststart', '-an', out])


def poster(master, size, out):
    png = out.with_suffix('.png')
    run(['ffmpeg', '-y', '-v', 'error', '-ss', '0.2', '-i', master, '-frames:v', '1',
         '-vf', f'scale={size[0]}:{size[1]}:flags=lanczos', png])
    from PIL import Image
    Image.open(png).convert('RGB').save(out, 'WEBP', quality=80, method=6)
    png.unlink()


async def main(which):
    srv = http.server.ThreadingHTTPServer(('localhost', PORT), functools.partial(Quiet, directory=str(ROOT)))
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    exe = os.environ.get('CHROMIUM') or ('/opt/pw-browsers/chromium' if Path('/opt/pw-browsers/chromium').exists() else None)
    HQ_DIR.mkdir(parents=True, exist_ok=True)
    try:
        async with async_playwright() as p:
            for fmt, lang in which:
                work = Path(tempfile.mkdtemp(prefix=f'trailer-{fmt}-{lang}-'))
                print(f'{fmt} {lang}')
                clips, end, size = await record(p, exe, fmt, lang, work)
                parts = []
                for i, (scene, frames, t_end, speed) in enumerate(clips):
                    c = work / f'{i:02d}-{scene}.mp4'
                    scene_clip(frames, t_end, size, c, speed)
                    parts.append(c)
                card = work / '99-end.mp4'
                run(['ffmpeg', '-y', '-v', 'error', '-loop', '1', '-t', 2.8, '-i', end, '-r', FPS,
                     '-vf', f'scale={size[0]}:{size[1]}:flags=lanczos,format=yuv420p', '-c:v', 'libx264', '-crf', '12', '-preset', 'veryfast', card])
                parts.append(card)
                master = work / 'master.mp4'
                join(parts, master)
                F = FORMATS[fmt]
                web = ROOT / 'video' / f'studio-2d-{fmt}-{lang}.mp4'
                final(master, F['web'], 31, web)   # about 2 MB: a visitor gets one of the four
                final(master, F['hq'], 18, HQ_DIR / f'studio-2d-{fmt}-{lang}-hq.mp4', preset='medium')
                poster(master, F['web'], ROOT / 'images' / 'studio' / f'studio-2d-{fmt}-{lang}.webp')
                print(f'  {web.relative_to(ROOT)}: {duration(web):.1f} s, {web.stat().st_size // 1024} KB')
                if os.environ.get('TR_KEEP'):
                    print('  work files kept in', work)
                else:
                    shutil.rmtree(work, ignore_errors=True)
    finally:
        srv.shutdown()


if __name__ == '__main__':
    args = sys.argv[1:]
    bad = [a for a in args if a not in FORMATS and a not in ('vi', 'en')]
    if bad:
        raise SystemExit(f'unknown: {bad} (use: doc, ngang, vi, en)')
    which = [(f, l) for f in FORMATS for l in ('vi', 'en')
             if (f in args or not [a for a in args if a in FORMATS]) and (l in args or not [a for a in args if a in ('vi', 'en')])]
    if sys.platform.startswith('linux') and not os.environ.get('DISPLAY') and not os.environ.get('TR_XVFB'):
        if not shutil.which('xvfb-run'):
            raise SystemExit('no screen: install xvfb (xvfb-run)')
        os.environ['TR_XVFB'] = '1'
        os.execvp('xvfb-run', ['xvfb-run', '-a', '-s', '-screen 0 2600x2400x24', sys.executable, *sys.argv])
    asyncio.run(main(which))
