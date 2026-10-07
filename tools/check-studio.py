#!/usr/bin/env python3
"""Check Studio Gem and the layout editor in a real browser (Playwright).

Starts its own local server, fakes Supabase (no network, nothing written),
and walks through what broke before:

  street   studio.html opens on the facade, the door leads in, the character
           picker leads back out
  wear     try-on accessories stay on the character, on all 4 x 10 frames
  shop     shelf products: tap opens the card, drag into the basket adds it;
           Udon dragged into the cart rides and comes home
  spots    (owner) a spot turned off / renamed / linked shows so in the studio;
           "Đặt vào Studio" on the Sản phẩm tab places the product
  editor   (owner) add a piece, Dài thêm, publish, studio.html shows it, Xoá hết,
           backgrounds offered per scene, the street scene saves too
  library  (owner) upload into a new tab with "Xoá nền trắng", rename / move /
           remove it; product cut-outs show under "Sản phẩm thật"; several files
           at once, one dropped before saving, one refused by storage
  product  (owner) product form: photo -> shrunk + 600px thumb, gallery,
           "Xoá nền trắng" cut-out, Kệ; all saved in one PATCH
  design   the design table: a mood dresses the piece, tap a scrap then a patch,
           drag a scrap onto a patch, "May xong" sews and makes the 9:16 card,
           the share link (with a name) opens the same design for a friend
  catalog  san-pham.html builds a card for a product only the database knows,
           in its category and order, and the lightbox opens on it
  kinds    (owner) a piece's "Loại": story, zone, talk, board, dates to show
           it, own tap boxes — set in the editor, played in the studio
  layers   "Sau người" / "Trước người": a piece stays on its side of the
           character whatever its kind
  topbar   the top bar fits a phone (320px up), in Vietnamese and English
  motion   a device asking for less motion: no walking, "Hiệu ứng" turns it on

Screenshots go to /tmp/gem-check/ — look at them, a pass only means nothing
crashed and the counts add up.

    python3 tools/check-studio.py            all checks
    python3 tools/check-studio.py wear       one check (street | wear | shop | spots | editor |
                                             library | product | design | catalog | kinds |
                                             layers | topbar | motion)

Needs: pip install playwright. Chromium: PLAYWRIGHT_BROWSERS_PATH or
CHROMIUM=/path/to/chrome (the cloud sessions have /opt/pw-browsers/chromium).
"""
import asyncio
import functools
import io
import re
import http.server
import json
import os
import sys
import threading
from pathlib import Path

from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parent.parent
OUT = Path('/tmp/gem-check')
PORT = 8765
BASE = f'http://localhost:{PORT}'
WEAR = ['denim', 'scrunchie', 'daydeo', 'bloom']
failures = []


def check(ok, what):
    print(('  ok    ' if ok else '  FAIL  ') + what)
    if not ok:
        failures.append(what)


class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass


def serve():
    handler = functools.partial(Quiet, directory=str(ROOT))
    srv = http.server.ThreadingHTTPServer(('localhost', PORT), handler)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv


# The shop as the database has it (names / shelves as on the live site),
# plus one product only the database knows: catalog.js must build its card.
SHELF = {'pegboard': 'scrunchie bookmark bloom daydeo', 'display': 'origami oxford denim tuibut biaso so-kraft so-khau',
         'cabinet': 'goi tham lotcoc set-qua'}
SHELF = {sku: k for k, v in SHELF.items() for sku in v.split()}
PRODUCTS = [
    ('origami', 'vai-vun', 'Origami Pouch', 'vai-vun-tui-1-thumb.jpg', ['vai-vun-tui-1.png', 'vai-vun-tui-2.png']),
    ('oxford', 'vai-vun', 'Oxford Shirt', 'vai-vun-tui-3-thumb.jpg', ['vai-vun-tui-3.png']),
    ('denim', 'vai-vun', 'Reimagine the Denim', 'vai-vun-tui-7-thumb.jpg', ['vai-vun-tui-7.png']),
    ('bloom', 'vai-vun', 'Bloom Charm', 'vai-vun-bloom-charm-thumb.jpg', ['vai-vun-bloom-charm-1.png']),
    ('tuibut', 'vai-vun', 'Túi bút kẹp sổ', 'vai-vun-tui-but-thumb.jpg', ['vai-vun-tui-but.png']),
    ('bookmark', 'vai-vun', 'Bookmark', 'vai-vun-bookmark-vai-thumb.jpg', ['vai-vun-bookmark-1.png']),
    ('biaso', 'vai-vun', 'Bìa sổ vải ghép', 'vai-vun-bia-so-thumb.jpg', ['vai-vun-bia-so.jpg']),
    ('daydeo', 'vai-vun', 'Dây đeo cổ tay', 'vai-vun-day-deo-hong-thumb.jpg', ['vai-vun-day-deo-hong.jpg']),
    ('scrunchie', 'vai-vun', 'Dây buộc tóc', 'vai-vun-scrunchie-thumb.jpg', ['vai-vun-scrunchie.jpg']),
    ('lotcoc', 'vai-vun', 'Lót Cốc', 'vai-vun-lot-ly-hoa-thumb.jpg', ['vai-vun-lot-ly.png']),
    ('goi', 'vai-vun', 'Gối Chắp Sắc', 'vai-vun-goi-patchwork-thumb.jpg', ['vai-vun-goi-patchwork.png']),
    ('tham', 'vai-vun', 'Thảm Chắp Sắc', 'vai-vun-tham-tron-thumb.jpg', ['vai-vun-tham-1.png']),
    ('tui-moi', 'vai-vun', 'Túi mới thử', 'vai-vun-tui-9.jpg', ['vai-vun-tui-9.jpg', 'vai-vun-tui-8.jpg']),
    ('so-kraft', 'vpp', 'Sổ kraft spiral', 'vpp-so-kraft-thumb.jpg', ['vpp-so-kraft']),
    ('so-khau', 'vpp', 'Sổ khâu tay tái chế', 'vpp-so-khau-thumb.jpg', ['vpp-so-khau.png']),
    ('gom', 'gom', 'Gốm sứ Nhật chọn lọc', 'gom-thumb.jpg', ['gom-1.jpg']),
    ('set-qua', 'set-qua', 'Set quà tặng', 'set-qua-tang-thumb.jpg', ['set-qua-tang-1.png']),
]


def product_rows():
    return [{'id': f'p{i}', 'sku': sku, 'category': cat, 'name_vi': name, 'name_en': name, 'desc_vi': 'Mô tả ' + name,
             'desc_en': None, 'price': 50000, 'price_max': None, 'in_stock': True, 'is_published': True,
             'image': 'images/products/' + img, 'gallery': gal, 'sort_order': i * 10, 'shelf': SHELF.get(sku),
             'cutout': 'images/studio/sp/origami.webp' if sku == 'origami' else None, 'sprite': None}
            for i, (sku, cat, name, img, gal) in enumerate(PRODUCTS)]


class FakeDB:
    """Just enough of Supabase: the owner's profile, studio_layout + studio_assets
    rows, products, and a storage bucket that keeps what is uploaded."""

    def __init__(self):
        self.rows = {}
        self.names = {}
        self.assets = []
        self.files = {}
        self.patches = []
        self.info = {}       # studio_info by src
        self.sessions = []   # sessions_public
        self.posts = []

    async def route(self, r):
        u, m = r.request.url, r.request.method
        if '/rpc/me' in u:
            return await r.fulfill(status=200, content_type='application/json',
                                   body='[{"user_id":"x","role":"owner","display_name":"Anna"}]')
        if '/rest/v1/studio_layout' in u:
            if m == 'POST':
                b = json.loads(r.request.post_data)
                # the real table: check constraint studio_layout_id_check
                if not re.fullmatch(r'draft|live|p-[a-z0-9-]{1,40}', b['id']):
                    return await r.fulfill(status=400, content_type='application/json',
                                           body=json.dumps({'message': 'new row for relation "studio_layout" violates check constraint "studio_layout_id_check"'}))
                self.rows[b['id']] = b['data']
                self.names[b['id']] = b.get('name')
                return await r.fulfill(status=201, body='')
            if m == 'DELETE':
                i = re.search(r'id=eq\.([^&]+)', u).group(1)
                self.rows.pop(i, None)
                return await r.fulfill(status=204, body='')
            if 'or=(' in u:   # the saved layouts list
                rows = [{'id': k, 'name': self.names.get(k), 'updated_at': '2026-10-06T00:00:00Z', 'data': v} for k, v in self.rows.items()]
                return await r.fulfill(status=200, content_type='application/json', body=json.dumps(rows))
            mm = re.search(r'id=eq\.([^&]+)', u)
            i = mm.group(1) if mm else None
            rows = [{'data': self.rows[i]}] if i in self.rows else []
            return await r.fulfill(status=200, content_type='application/json', body=json.dumps(rows))
        if '/rest/v1/studio_info' in u:
            if m == 'POST':
                b = json.loads(r.request.post_data)
                self.info[b['src']] = b
                return await r.fulfill(status=201, body='')
            return await r.fulfill(status=200, content_type='application/json', body=json.dumps(list(self.info.values())))
        if '/rest/v1/sessions_public' in u:
            return await r.fulfill(status=200, content_type='application/json', body=json.dumps(self.sessions))
        if '/rest/v1/posts' in u:
            return await r.fulfill(status=200, content_type='application/json', body=json.dumps(self.posts))
        if '/rest/v1/products' in u:
            if m == 'PATCH':
                self.patches.append(json.loads(r.request.post_data))
                return await r.fulfill(status=200, content_type='application/json', body='[{}]')
            return await r.fulfill(status=200, content_type='application/json', body=json.dumps(product_rows()))
        if '/rest/v1/studio_assets' in u:
            i = (re.search(r'id=eq\.([^&]+)', u) or [None, None])[1]
            if m == 'POST':
                b = json.loads(r.request.post_data)
                b['id'] = f'a{len(self.assets) + 1}'
                self.assets.append(b)
                return await r.fulfill(status=201, content_type='application/json', body=json.dumps([b]))
            if m == 'PATCH':
                for a in self.assets:
                    if a['id'] == i:
                        a.update(json.loads(r.request.post_data))
                return await r.fulfill(status=204, body='')
            if m == 'DELETE':
                self.assets = [a for a in self.assets if a['id'] != i]
                return await r.fulfill(status=204, body='')
            return await r.fulfill(status=200, content_type='application/json', body=json.dumps(self.assets))
        if '/storage/v1/object/public/gem-media/' in u:
            f = self.files.get(u.split('/gem-media/')[1])
            if f:
                return await r.fulfill(status=200, content_type=f[0], body=f[1],
                                       headers={'Access-Control-Allow-Origin': '*'})
            return await r.fulfill(status=404, body='')
        if '/storage/v1/object/gem-media/' in u and m == 'POST':
            if 'hong' in u:   # a file the storage refuses: the batch upload must carry on
                return await r.fulfill(status=400, content_type='application/json', body='{"message":"giả lập lỗi"}')
            self.files[u.split('/gem-media/')[1]] = (r.request.headers.get('content-type'), r.request.post_data_buffer)
            return await r.fulfill(status=200, content_type='application/json', body='{}')
        if '/rest/v1/' in u or '/rpc/' in u:
            return await r.fulfill(status=200, content_type='application/json', body='[]')
        await r.abort()


async def launch(p):
    exe = os.environ.get('CHROMIUM') or ('/opt/pw-browsers/chromium' if Path('/opt/pw-browsers/chromium').exists() else None)
    return await p.chromium.launch(executable_path=exe) if exe else await p.chromium.launch()


async def page(browser, db, w, h, init=''):
    ctx = await browser.new_context(viewport={'width': w, 'height': h}, is_mobile=w < 768, has_touch=w < 768)
    await ctx.route('**/*.supabase.co/**', db.route)
    if init:
        await ctx.add_init_script(init)
    pg = await ctx.new_page()
    pg.errors = []
    pg.on('pageerror', lambda e: pg.errors.append(str(e)))
    pg.on('dialog', lambda d: asyncio.ensure_future(d.accept()))
    return pg


async def js_click(pg, sel):
    # the sticky header can sit over the target; a DOM click is what we test
    await pg.evaluate('s => document.querySelector(s).click()', sel)


async def bg(pg):
    return await pg.evaluate("document.querySelector('.st-bg').getAttribute('src')")


async def street(browser, db):
    print('street')
    for name, w, h in (('mobile', 390, 844), ('desktop', 1440, 900)):
        pg = await page(browser, db, w, h)
        await pg.goto(f'{BASE}/studio.html')
        await pg.wait_for_timeout(1500)
        check('ngoai' in (await bg(pg)), f'{name}: opens on the street')
        await pg.screenshot(path=OUT / f'street-{name}-1.png')
        await js_click(pg, '.st-hot[data-hot="enter"]')
        await pg.wait_for_timeout(3000)
        check('ngoai' not in (await bg(pg)), f'{name}: the door leads in')
        await pg.screenshot(path=OUT / f'street-{name}-2.png')
        await js_click(pg, '.st-hot[data-hot="door"]')
        await pg.wait_for_timeout(800)
        await js_click(pg, '[data-out]')
        await pg.wait_for_timeout(1500)
        check('ngoai' in (await bg(pg)), f'{name}: "Ra ngoài cửa" goes back out')
        check(not pg.errors, f'{name}: no script errors {pg.errors}')
        await pg.context.close()


async def wear(browser, db):
    print('wear')
    for who in ('p1', 'p2', 'p3', 'p4'):
        init = (f"sessionStorage.setItem('gem-scene','in');sessionStorage.setItem('gem-mac',{json.dumps(json.dumps(WEAR))});"
                f"localStorage.setItem('gem-char','{who}');localStorage.setItem('gem-studio-intro','1')")
        pg = await page(browser, db, 1600, 1100, init)
        await pg.goto(f'{BASE}/studio.html')
        await pg.wait_for_timeout(1500)
        n = await pg.evaluate("[...document.querySelectorAll('.st-fr')].map(f => f.querySelectorAll('.st-acc').length)")
        check(len(n) == 10 and all(c == len(WEAR) + 1 for c in n), f'{who}: {len(WEAR)} accessories + the fist on each of 10 frames ({n})')
        await pg.add_style_tag(content='.lang-hint,.st-bubble{display:none!important}')
        for i in (0, 4, 8):   # standing, walking, pushing the cart
            await pg.evaluate(f"document.querySelectorAll('.st-fr').forEach((f, k) => f.hidden = k !== {i})")
            box = await pg.evaluate(f"(() => {{ const r = document.querySelectorAll('.st-fr')[{i}].getBoundingClientRect();"
                                    " return [r.left - 60, r.top - 20, r.width + 120, r.height + 40]; })()")
            await pg.screenshot(path=OUT / f'wear-{who}-{i}.png',
                                clip={'x': max(0, box[0]), 'y': max(0, box[1]), 'width': box[2], 'height': box[3]})
        check(not pg.errors, f'{who}: no script errors {pg.errors}')
        await pg.context.close()


async def editor(browser, db):
    print('editor')
    for name, w, h in (('mobile', 412, 900), ('desktop', 1440, 900)):
        db.rows.clear()
        pg = await page(browser, db, w, h)
        await pg.goto(f'{BASE}/admin.html')
        await pg.evaluate("sessionStorage.setItem('gem-admin-token','fake')")
        await pg.goto(f'{BASE}/admin.html')
        await pg.wait_for_timeout(800)
        await js_click(pg, '[data-tab="studio"]')
        await pg.wait_for_timeout(1500)
        await pg.screenshot(path=OUT / f'editor-{name}-1.png')
        opts = await pg.evaluate("[...document.querySelectorAll('.se-bgsel option')].map(o => o.textContent)")
        check('Mặt tiền' not in opts and len(opts) >= 2, f'{name}: studio backgrounds only inside ({opts})')
        r = await pg.evaluate("(() => { const r = document.querySelector('.se-head').getBoundingClientRect(); return [r.left, r.right, document.documentElement.clientWidth]; })()")
        check(r[0] >= 0 and r[1] <= r[2], f'{name}: the header (Bố cục / Lưu / Phát hành) fits the screen ({[round(x) for x in r]})')
        # the library stays where it was after a pick
        await js_click(pg, '[data-group="cay"]')
        await pg.evaluate("(() => { const g = document.querySelector('.se-grid'); g.scrollLeft = 300; g.scrollTop = 120; })()")
        before = await pg.evaluate("(() => { const g = document.querySelector('.se-grid'); return [g.scrollLeft, g.scrollTop]; })()")
        await js_click(pg, '.se-asset[data-asset="9"]')
        await pg.wait_for_timeout(200)
        after = await pg.evaluate("(() => { const g = document.querySelector('.se-grid'); return [g.scrollLeft, g.scrollTop]; })()")
        check(before == after and before != [0, 0], f'{name}: picking a piece keeps the library scrolled ({before} → {after})')
        check(await pg.evaluate("!!document.querySelector('[data-group=__recent]')"), f'{name}: "Vừa dùng" tab appears')
        await pg.fill('.se-find', 'cay')
        await pg.wait_for_timeout(200)
        check(await pg.evaluate("document.querySelectorAll('.se-grid .se-asset').length") > 5, f'{name}: search finds pieces by tab name')
        await pg.fill('.se-find', '')
        await js_click(pg, '[data-act="del"]')
        await js_click(pg, '[data-group="cua"]')
        await js_click(pg, '.se-asset[data-asset="0"]')
        await pg.wait_for_timeout(300)
        await js_click(pg, '[data-se="w+"]')
        await js_click(pg, '[data-se="w+"]')
        await pg.wait_for_timeout(300)
        await pg.screenshot(path=OUT / f'editor-{name}-3long.png')
        check(await pg.evaluate("document.querySelectorAll('.se-bgx').length") == 3, f'{name}: Dài thêm paints wall + loop + corner')
        await pg.screenshot(path=OUT / f'editor-{name}-2.png')
        await js_click(pg, '[data-se="sc-out"]')
        await pg.wait_for_timeout(400)
        opts = await pg.evaluate("[...document.querySelectorAll('.se-bgsel option')].map(o => o.textContent)")
        check(opts == ['Mặt tiền'], f'{name}: street background only outside ({opts})')
        # the old bug: any button in the save area asked "Xuất bản?"
        await js_click(pg, '[data-hd="layouts"]')
        await pg.wait_for_timeout(300)
        check(await pg.evaluate("document.querySelector('.se-dlg').hidden && !document.querySelector('.se-sheet').hidden"),
              f'{name}: "Bố cục" opens the list, no publish question')
        await js_click(pg, '[data-sh="close"]')
        await pg.wait_for_timeout(2600)
        check('draft' in db.rows, f'{name}: changes are saved on their own (draft)')
        await js_click(pg, '[data-hd="publish"]')
        await pg.wait_for_timeout(200)
        await js_click(pg, '.se-dlg .ad-btn.on')
        await pg.wait_for_timeout(600)
        live = db.rows.get('live') or {}
        check(len(live.get('items', [])) == 1, f'{name}: publish saves the studio piece')
        check(live.get('bg', {}).get('w') == 5792 + 2 * 1040, f'{name}: publish saves the longer wall ({live.get("bg")})')
        check(len((live.get('outside') or {}).get('items', [])) > 0, f'{name}: publish saves the street too')
        check(not pg.errors, f'{name}: no script errors {pg.errors}')

        st = await page(browser, db, w, h, "sessionStorage.setItem('gem-scene','in')")
        await st.goto(f'{BASE}/studio.html')
        await st.wait_for_timeout(1500)
        check(await st.evaluate("document.querySelectorAll('.st-item').length") == 1, f'{name}: studio.html shows the published piece')
        check(await st.evaluate("document.querySelectorAll('.st-bgx').length") == 3, f'{name}: studio.html paints the longer wall')
        await st.context.close()

        # save as a named layout, publish it from the list, undo the publish
        await js_click(pg, '[data-se="sc-in"]')
        await js_click(pg, '[data-hd="save"]')
        await pg.wait_for_timeout(200)
        await pg.fill('.se-dlg-in', 'Mùa thu')
        await js_click(pg, '.se-dlg .ad-btn.on')
        await pg.wait_for_timeout(600)
        pid = [k for k in db.rows if k.startswith('p-')]
        check(len(pid) == 1 and db.names[pid[0]] == 'Mùa thu', f'{name}: "Lưu thành…" names a new layout ({pid})')
        check('Mùa thu' in await pg.evaluate("document.querySelector('.se-docname').textContent"), f'{name}: header says which layout is being edited')
        await js_click(pg, '[data-hd="layouts"]')
        await pg.wait_for_timeout(500)
        check(await pg.evaluate("document.querySelectorAll('.se-card').length") == 1, f'{name}: the list shows the saved layout')
        old_live = json.dumps(db.rows.get('live'))
        db.rows['live']['items'] = []   # make "before" differ from the layout
        await js_click(pg, '.se-card [data-sh="live"]')
        await pg.wait_for_timeout(200)
        await js_click(pg, '.se-dlg .ad-btn.on')
        await pg.wait_for_timeout(700)
        check(db.names.get('live') == 'Mùa thu' and 'p-ban-truoc' in db.rows, f'{name}: publishing keeps the previous live copy')
        await js_click(pg, '.se-toast .ad-btn')
        await pg.wait_for_timeout(600)
        check(db.rows['live'].get('items') == [], f'{name}: "Hoàn tác phát hành" brings back what customers saw')
        await pg.screenshot(path=OUT / f'editor-{name}-layouts.png')
        await js_click(pg, '[data-sh="close"]')
        await js_click(pg, '[data-se="clear"]')
        await pg.wait_for_timeout(200)
        await js_click(pg, '.se-dlg .ad-btn.danger')
        await pg.wait_for_timeout(300)
        check(await pg.evaluate("document.querySelectorAll('.se-item').length") == 0, f'{name}: Xoá hết empties the scene')
        await fingers(pg, name)
        await pg.context.close()


# Fingers on the editor stage (pointer events with pointerType 'touch'; the
# browser's own scrolling isn't simulated, only what the editor does).
TOUCH_JS = '''([kind, x, y, dx, dy]) => {
  const t = document.elementFromPoint(x, y);
  // down on what is under the finger; the rest to the document (the editor
  // redraws the stage while dragging, so that node may be gone by then)
  const ev = (type, cx, cy) => (type === 'pointerdown' ? t : document).dispatchEvent(new PointerEvent(type, {bubbles: true, cancelable: true,
    pointerType: 'touch', pointerId: 7, isPrimary: true, clientX: cx, clientY: cy}));
  ev('pointerdown', x, y);
  if (kind === 'swipe') for (let i = 1; i <= 6; i++) ev('pointermove', x + dx * i / 6, y + dy * i / 6);
  ev('pointerup', x + (kind === 'swipe' ? dx : 0), y + (kind === 'swipe' ? dy : 0));
}'''


async def fingers(pg, name):
    await js_click(pg, '[data-group="cay"]')
    await js_click(pg, '.se-asset[data-asset="9"]')
    await js_click(pg, '.se-asset[data-asset="3"]')   # lands on top of the first
    await pg.wait_for_timeout(300)
    x, y = await center(pg, '.se-item[data-i="0"]')   # inside both; the second is drawn over it
    pos = "[...document.querySelectorAll('.se-item')].map(n => n.style.left + n.style.top)"
    sel = "(document.querySelector('.se-grab') || {dataset: {}}).dataset.i || null"
    sx, sy = await pg.evaluate("(() => { const r = document.querySelector('.se-world').getBoundingClientRect(), s = document.querySelector('.se-stage').getBoundingClientRect(); return [Math.max(r.left, s.left) + 12, s.top + 40]; })()")
    await pg.evaluate(TOUCH_JS, ['tap', sx, sy, 0, 0])   # empty wall: let go
    check(await pg.evaluate(sel) is None, f'{name}: a tap on empty wall lets go of the piece')
    before = await pg.evaluate(pos)
    await pg.evaluate(TOUCH_JS, ['swipe', x, y, -120, 0])
    check(await pg.evaluate(pos) == before, f'{name}: a swipe over pieces moves none of them')
    await pg.evaluate(TOUCH_JS, ['tap', x, y, 0, 0])
    check(await pg.evaluate(sel) == '1', f'{name}: a tap selects the top piece')
    await pg.evaluate(TOUCH_JS, ['tap', x, y, 0, 0])
    check(await pg.evaluate(sel) == '0', f'{name}: tapping it again selects the one under it')
    await pg.evaluate(TOUCH_JS, ['swipe', x, y, 40, 30])
    after = await pg.evaluate(pos)
    check(after[0] != before[0] and after[1] == before[1], f'{name}: dragging moves only the selected piece, even under another')
    # the tool strip stays scrolled when a button in it is pressed again and again
    await pg.evaluate("document.querySelector('.se-tools').scrollLeft = 200")
    t0 = await pg.evaluate("document.querySelector('.se-tools').scrollLeft")
    await js_click(pg, '[data-act="up"]')
    await js_click(pg, '[data-act="down"]')
    t1 = await pg.evaluate("document.querySelector('.se-tools').scrollLeft")
    await js_click(pg, '[data-act="up"]')
    up = await pg.evaluate(sel)
    await js_click(pg, '[data-act="down"]')
    check((up, await pg.evaluate(sel)) == ('1', '0'), f'{name}: Lên / Xuống step over the piece on top of it ({up})')
    check((t0 > 0 or name != 'mobile') and t1 == t0, f'{name}: pressing Lên / Xuống keeps the tool strip where it was ({t0} → {t1})')
    await js_click(pg, '[data-act="lock"]')
    await pg.wait_for_timeout(200)
    check(await pg.evaluate("document.querySelectorAll('.se-lockpick').length") == 1, f'{name}: a locked piece is listed to unlock')
    await pg.evaluate(TOUCH_JS, ['tap', x + 40, y + 30, 0, 0])
    check(await pg.evaluate(sel) != '0', f'{name}: a tap passes through the locked piece')
    await js_click(pg, '.se-lockpick')
    await pg.wait_for_timeout(200)
    check(await pg.evaluate(sel) == '0' and await pg.evaluate("!!document.querySelector('[data-act=lock].on')"), f'{name}: the list selects it, "Mở khoá" ready')
    held = await pg.evaluate(pos)
    gx, gy = await center(pg, '.se-grab')
    await pg.evaluate(TOUCH_JS, ['swipe', gx, gy, 50, 0])
    check(await pg.evaluate(pos) == held, f'{name}: a locked piece does not move')
    await pg.screenshot(path=OUT / f'editor-{name}-fingers.png')
    check(not pg.errors, f'{name}: no script errors (fingers) {pg.errors}')


async def center(pg, sel):
    return await pg.evaluate("s => { const r = document.querySelector(s).getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; }", sel)


async def drag(pg, a, b):
    await pg.mouse.move(*a)
    await pg.mouse.down()
    await pg.mouse.move(a[0] + 30, a[1] + 20, steps=3)
    await pg.mouse.move(*b, steps=10)
    await pg.mouse.up()


async def shop(browser, db):
    print('shop')
    ctx = await browser.new_context(viewport={'width': 1300, 'height': 760})
    await ctx.route('**/*.supabase.co/**', lambda r: r.abort())   # built-in catalogue
    await ctx.add_init_script("sessionStorage.setItem('gem-scene','in');localStorage.setItem('gem-studio-intro','1')")
    pg = await ctx.new_page()
    errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    await pg.goto(f'{BASE}/studio.html')
    await pg.wait_for_timeout(1500)
    await pg.add_style_tag(content='.lang-hint{display:none!important}')
    await js_click(pg, '[data-go="shelves"]')
    await pg.wait_for_timeout(2000)
    o = await center(pg, '.st-shelf-prod[data-sku="origami"]')
    await pg.mouse.click(*o)
    await pg.wait_for_timeout(600)
    check('Origami' in (await pg.evaluate("document.getElementById('st-sheet-body').textContent")), 'tap a shelf product opens its card')
    await pg.keyboard.press('Escape')
    await pg.wait_for_timeout(300)
    await drag(pg, o, await center(pg, '.gb-widget'))
    await pg.wait_for_timeout(1200)
    check(await pg.evaluate("window.GemBasket.count()") == 1, 'drag a shelf product into the basket adds it')
    await js_click(pg, '.st-hot[data-hot="cabinet"]')
    await pg.wait_for_timeout(1500)
    await js_click(pg, '[data-design-from="goi"]')
    await pg.wait_for_timeout(1200)
    say = await pg.evaluate("(document.querySelector('.gv-say') || {}).textContent || ''")
    board = await pg.evaluate("(document.querySelector('.gv-photo img') || {}).src || ''")
    check('theo ý bạn' in say and 'goi' in board, f'"Tự thiết kế theo mẫu này" opens the design table on that piece ({say[:40]}…)')
    await pg.keyboard.press('Escape')
    await pg.wait_for_timeout(300)
    await js_click(pg, '[data-go="counter"]')
    await pg.wait_for_timeout(2000)
    await pg.keyboard.press('Escape')
    await pg.wait_for_timeout(300)
    await drag(pg, await center(pg, '.st-udon'), await center(pg, '.st-fr:not([hidden])'))
    await pg.wait_for_timeout(900)
    await pg.screenshot(path=OUT / 'shop-udon-cart.png')
    check(await pg.evaluate("document.querySelectorAll('.st-bob .st-udon-ghost').length") == 1, 'Udon dropped on the character rides in the cart')
    await pg.wait_for_timeout(4500)
    check(await pg.evaluate("document.querySelector('.st-udon').style.visibility") == '', 'Udon comes home')
    check(not errs, f'no script errors {errs}')
    await ctx.close()


async def spots(browser, db):
    print('spots')
    db.rows.clear()
    pg = await page(browser, db, 1440, 900)
    await pg.goto(f'{BASE}/admin.html')
    await pg.evaluate("sessionStorage.setItem('gem-admin-token','fake')")
    await pg.goto(f'{BASE}/admin.html')
    await pg.wait_for_timeout(800)
    await js_click(pg, '[data-tab="products"]')
    await pg.wait_for_timeout(800)
    await js_click(pg, '.ad-ps-place')
    await pg.wait_for_timeout(1800)
    n = await pg.evaluate("document.querySelectorAll('.se-item.is-prod').length")
    check(n == 1, f'"Đặt vào Studio" places the product in the editor ({n})')
    steps = (('memo', 'sp-on', None), ('tu', 'sp-vi', 'Tủ của tôi'), ('sofa', 'sp-act', 'link'), ('sofa', 'sp-link', 'workshop.html'),
             ('rail', 'sp-act', 'shop:pegboard'))
    for spot, field, value in steps:
        await pg.evaluate("id => { const n = document.querySelector('.se-hot[data-id=' + id + ']'); n.dispatchEvent(new PointerEvent('pointerdown', {bubbles: true})); document.dispatchEvent(new PointerEvent('pointerup', {bubbles: true})); }", spot)
        await pg.wait_for_timeout(200)
        if value is None:
            await pg.click(f'[name="{field}"]')
        elif field == 'sp-act':
            await pg.select_option(f'[name="{field}"]', value)
        else:
            await pg.fill(f'[name="{field}"]', value)
            await pg.press(f'[name="{field}"]', 'Tab')
        await pg.wait_for_timeout(200)
    await pg.screenshot(path=OUT / 'spots-editor.png')
    await js_click(pg, '[data-hd="publish"]')
    await pg.wait_for_timeout(200)
    await js_click(pg, '.se-dlg .ad-btn.on')
    await pg.wait_for_timeout(600)
    live = db.rows.get('live') or {}
    check(live.get('spots', {}).get('memo', {}).get('off') is True, f'spot settings saved ({live.get("spots")})')
    check(any(it.get('sku') == 'origami' for it in live.get('items', [])), 'product piece saved with its sku')
    check(not pg.errors, f'no script errors {pg.errors}')
    st = await page(browser, db, 1300, 760, "sessionStorage.setItem('gem-scene','in');localStorage.setItem('gem-studio-intro','1')")
    await st.goto(f'{BASE}/studio.html')
    await st.wait_for_timeout(1800)
    check(await st.evaluate('!document.querySelector(".st-hot[data-hot=memo]")'), 'spot turned off is gone from the studio')
    check(await st.evaluate('document.querySelector(".st-hot[data-hot=tu]").textContent') == 'Tủ của tôi', 'renamed spot shows its new name')
    check(await st.evaluate('!!document.querySelector(".st-shelf-prod[data-sku=origami]")'), 'placed product is pickable in the studio')
    await js_click(st, '.st-hot[data-hot="rail"]')
    await st.wait_for_timeout(800)
    tab = await st.evaluate("(document.querySelector('.st-shop-tab.is-on') || {}).getAttribute ? document.querySelector('.st-shop-tab.is-on').getAttribute('data-shop') : null")
    check(tab == 'pegboard', f'spot set to "Kệ hàng — tab Phụ kiện" opens that tab ({tab})')
    if tab:
        await js_click(st, '[data-shop="all"]')
        await st.wait_for_timeout(300)
        n_all = await st.evaluate("document.querySelectorAll('.st-shop-body .st-prod').length")
        check(n_all >= 10, f'"Tất cả" tab lists every shelf product ({n_all})')
    await st.keyboard.press('Escape')
    await st.wait_for_timeout(300)
    await js_click(st, '.st-hot[data-hot="sofa"]')
    await st.wait_for_timeout(3000)
    check(st.url.endswith('workshop.html'), f'linked spot opens its page ({st.url})')
    check(not st.errors, f'no script errors {st.errors}')
    await st.context.close()
    await pg.context.close()


def test_photo(path, w=2000, h=1500):
    """A product shot on white paper: off-white background, a red ring with a
    white middle (must survive "Xoá nền trắng": it doesn't touch the edge)."""
    from PIL import Image, ImageDraw
    im = Image.new('RGB', (w, h), (247, 245, 240))
    d = ImageDraw.Draw(im)
    d.ellipse((w * .3, h * .25, w * .7, h * .75), fill=(180, 60, 50))
    d.ellipse((w * .42, h * .4, w * .58, h * .6), fill=(250, 250, 250))
    im.save(path, quality=92)
    return str(path)


def decode(blob):
    from PIL import Image
    return Image.open(io.BytesIO(blob))


async def admin_page(browser, db, w, h):
    pg = await page(browser, db, w, h)
    await pg.goto(f'{BASE}/admin.html')
    await pg.evaluate("sessionStorage.setItem('gem-admin-token','fake')")
    await pg.goto(f'{BASE}/admin.html')
    await pg.wait_for_timeout(800)
    return pg


async def library(browser, db):
    print('library')
    db.rows.clear(); db.assets.clear(); db.files.clear()
    photo = test_photo(OUT / 'lib-photo.jpg', 1600, 1200)
    for name, w, h in (('mobile', 412, 900), ('desktop', 1440, 900)):
        db.assets.clear(); db.rows.clear()
        pg = await admin_page(browser, db, w, h)
        await js_click(pg, '[data-tab="studio"]')
        await pg.wait_for_timeout(1500)
        tabs = await pg.evaluate("[...document.querySelectorAll('.se-tabs [data-group]')].map(b => b.textContent)")
        check(tabs.count('Sản phẩm thật') == 1, f'{name}: one "Sản phẩm thật" tab (shipped + database cut-outs)')
        await pg.set_input_files('[name="se-file"]', photo)
        await pg.wait_for_timeout(300)
        check(await pg.evaluate("!!document.querySelector('.se-upform')"), f'{name}: picking a file asks where it goes')
        await pg.select_option('[name="up-grp"]', '__new')
        await pg.fill('[name="up-new"]', 'Đồ thử')
        await pg.dispatch_event('[name="up-new"]', 'change')
        await js_click(pg, '[name="up-cut"]')
        await pg.screenshot(path=OUT / f'library-{name}-1.png')
        await js_click(pg, '[data-up="save"]')
        await pg.wait_for_timeout(2500)
        a = db.assets[0] if db.assets else {}
        check(a.get('grp') == 'Đồ thử', f'{name}: saved to the new tab ({a.get("grp")})')
        f = db.files.get(a.get('src', '').split('/gem-media/')[-1])
        if f:
            im = decode(f[1]).convert('RGBA')
            check(im.getpixel((0, 0))[3] == 0, f'{name}: white background removed ({f[0]}, {im.size})')
            cx, cy = im.size[0] // 2, im.size[1] // 2
            check(im.getpixel((cx, cy))[3] == 255, f'{name}: white inside the product kept')
            check(max(im.size) <= 1280 and len(f[1]) < 300_000, f'{name}: shrunk ({im.size}, {len(f[1]) // 1024} KB)')
        else:
            check(False, f'{name}: file uploaded')
        check(await pg.evaluate("document.querySelector('.se-chip.is-on[data-group]').textContent") == 'Đồ thử',
              f'{name}: library shows the new tab')
        check(await pg.evaluate("document.querySelectorAll('.se-item').length") == 1, f'{name}: and puts the picture in the scene')
        await pg.screenshot(path=OUT / f'library-{name}-2.png')
        await js_click(pg, '[data-manage]')
        await js_click(pg, '.se-asset.is-own')
        await pg.wait_for_timeout(200)
        await pg.fill('[name="as-name"]', 'Bình hoa')
        await pg.select_option('[name="as-grp"]', 'cua')
        await js_click(pg, '[data-asset-save]')
        await pg.wait_for_timeout(500)
        check(db.assets and db.assets[0]['grp'] == 'cua' and db.assets[0]['name'] == 'Bình hoa', f'{name}: rename + move saved')
        check(await pg.evaluate("[...document.querySelectorAll('.se-tabs [data-group]')].every(b => b.textContent !== 'Đồ thử')"),
              f'{name}: emptied tab disappears')
        await js_click(pg, '.se-asset.is-own')
        await pg.wait_for_timeout(200)
        await js_click(pg, '[data-asset-del]')
        await pg.wait_for_timeout(100)
        await js_click(pg, '.se-dlg .ad-btn.danger')
        await pg.wait_for_timeout(500)
        check(not db.assets, f'{name}: removed from the library')

        # several at once: drop one before saving, one refused by storage
        files = [test_photo(OUT / f'{n}.jpg', 900, 700) for n in ('ghe', 'den', 'hong', 'thua')]
        items0 = await pg.evaluate("document.querySelectorAll('.se-item').length")
        await pg.set_input_files('[name="se-file"]', files)
        await pg.wait_for_timeout(300)
        check(await pg.evaluate("document.querySelectorAll('.se-up-strip img').length") == 4, f'{name}: four files in one go')
        await js_click(pg, '[data-up-drop="3"]')
        await pg.wait_for_timeout(100)
        await pg.screenshot(path=OUT / f'library-{name}-batch.png')
        await js_click(pg, '[data-up="save"]')
        await pg.wait_for_timeout(4000)
        names = sorted(a['name'] for a in db.assets)
        check(names == ['den', 'ghe'], f'{name}: the good ones saved, named after their files ({names})')
        left = await pg.evaluate("[...document.querySelectorAll('.se-upform img')].map(i => i.title || 'one')")
        check(len(left) == 1, f'{name}: the refused one stays in the form ({left})')
        msg = await pg.evaluate("document.querySelector('.se-status').textContent")
        check('hong' in msg, f'{name}: status names it ({msg[:70]}…)')
        check(await pg.evaluate("document.querySelectorAll('.se-item').length") == items0, f'{name}: a batch is not dropped into the scene')
        await js_click(pg, '[data-up="cancel"]')
        check(not pg.errors, f'{name}: no script errors after the batch {pg.errors}')
        check(not pg.errors, f'{name}: no script errors {pg.errors}')
        await pg.context.close()


async def product(browser, db):
    print('product')
    db.patches.clear(); db.files.clear()
    photo = test_photo(OUT / 'prod-photo.jpg')
    pg = await admin_page(browser, db, 412, 900)
    await js_click(pg, '[data-tab="products"]')
    await pg.wait_for_timeout(800)
    await js_click(pg, '.ad-edit-prod')
    await pg.wait_for_timeout(300)
    n0 = await pg.evaluate("document.querySelectorAll('.ad-gal img').length")
    await pg.set_input_files('[data-up="cover"]', photo)
    await pg.wait_for_timeout(2500)
    check(await pg.evaluate("document.querySelectorAll('.ad-gal img').length") == n0 + 1, 'main photo also goes first in the gallery')
    await pg.set_input_files('[data-up="gallery"]', [photo, photo])
    await pg.wait_for_timeout(3000)
    check(await pg.evaluate("document.querySelectorAll('.ad-gal img').length") == n0 + 3, 'two more gallery photos')
    await js_click(pg, '[data-gal-del="1"]')
    await js_click(pg, '.ad-cut-go')
    await pg.wait_for_timeout(2500)
    check((await pg.evaluate("document.querySelector('.ad-cut-prev img').src")).startswith('blob:'), '"Xoá nền trắng" shows a preview')
    await pg.select_option('[name="shelf"]', 'pegboard')
    await pg.screenshot(path=OUT / 'product-form.png', full_page=True)
    await js_click(pg, '.ad-post-form [type="submit"]')
    await pg.wait_for_timeout(1500)
    body = db.patches[-1] if db.patches else {}
    check(body.get('shelf') == 'pegboard', f'Kệ saved ({body.get("shelf")})')
    check(len(body.get('gallery') or []) == n0 + 2 and '/gem-media/' in body['gallery'][0], f'gallery saved, new photo first')
    sizes = {}
    for key in ('image', 'cutout'):
        f = db.files.get((body.get(key) or '').split('/gem-media/')[-1])
        sizes[key] = (decode(f[1]).size, len(f[1]) // 1024, f[0]) if f else None
    big = db.files.get(body['gallery'][0].split('/gem-media/')[-1]) if body.get('gallery') else None
    check(sizes['image'] and sizes['image'][0] == (600, 600), f'card photo is a 600px square {sizes["image"]}')
    check(big and max(decode(big[1]).size) == 1280, f'gallery photo shrunk to 1280px ({len(big[1]) // 1024 if big else "?"} KB)')
    check(sizes['cutout'] and sizes['cutout'][0][0] < 1024, f'cut-out uploaded on Lưu, trimmed {sizes["cutout"]}')
    check(not pg.errors, f'no script errors {pg.errors}')
    await pg.context.close()


async def design(browser, db):
    print('design')
    for name, w, h in (('mobile', 393, 852), ('desktop', 1440, 900)):
        pg = await page(browser, db, w, h, "sessionStorage.setItem('gem-scene','in');localStorage.setItem('gem-studio-intro','1');localStorage.removeItem('gem-designer')")
        await pg.goto(f'{BASE}/studio.html')
        await pg.wait_for_timeout(1500)
        await pg.add_style_tag(content='.lang-hint{display:none!important}')
        await js_click(pg, '[data-go="sewing"]')
        await pg.wait_for_timeout(2500)
        check(await pg.evaluate("document.querySelector('.st-sheet').classList.contains('is-full')"), f'{name}: the table opens full screen')
        check(await pg.evaluate("!!document.querySelector('.pt-mood.is-on')"), f'{name}: a fresh piece starts in a mood')
        n = await pg.evaluate("document.querySelectorAll('.pt-board path[data-i]').length")
        check(n == 9, f'{name}: every patch of the cushion is tappable ({n})')
        check(await pg.evaluate("document.querySelectorAll('.pt-scrap').length") == 8, f'{name}: eight scraps in the basket')
        # tap a scrap, then a patch
        sid = await pg.evaluate("document.querySelectorAll('.pt-scrap')[5].getAttribute('data-scrap')")
        await pg.click('.pt-scrap >> nth=5')
        await pg.click('.pt-board [data-i="4"]')
        await pg.wait_for_timeout(300)
        cell = await pg.evaluate("document.querySelector('.pt-board [data-i=\"4\"]').getAttribute('fill')")
        want = f'-f{sid})'
        check(cell.endswith(want), f'{name}: tap scrap, tap patch puts that fabric there ({want} in {cell})')
        # drag another scrap onto patch 0
        sid2 = await pg.evaluate("document.querySelectorAll('.pt-scrap')[2].getAttribute('data-scrap')")
        await pg.evaluate("document.querySelector('.pt-board').scrollIntoView({block: 'start'})")
        await pg.wait_for_timeout(200)
        bx = await center(pg, '.pt-board [data-i="0"]')
        a = await center(pg, '.pt-scrap:nth-child(3)')
        await drag(pg, a, bx)
        await pg.wait_for_timeout(300)
        cell0 = await pg.evaluate("document.querySelector('.pt-board [data-i=\"0\"]').getAttribute('fill')")
        want2 = f'-f{sid2})'
        check(cell0.endswith(want2), f'{name}: drag a scrap onto a patch ({want2} in {cell0})')
        await pg.screenshot(path=OUT / f'design-{name}-1.png')
        # a mood changes the fabrics, not the layout the customer picked
        await js_click(pg, '[data-layout="chong"]')
        await js_click(pg, '[data-mood="tet"]')
        await pg.wait_for_timeout(200)
        lay = await pg.evaluate("document.querySelector('[data-layout].is-on').dataset.layout")
        mood = await pg.evaluate("(document.querySelector('.pt-mood.is-on') || {dataset: {}}).dataset.mood")
        check(lay == 'chong' and mood == 'tet', f'{name}: picking a mood keeps the layout ({lay}, {mood})')
        await js_click(pg, '[data-layout="vuong"]')
        # the rearranged table: Udon + the real piece by the board, no tone/print chips
        check(await pg.evaluate("!!document.querySelector('.gv-row .gv-udon') && !!document.querySelector('.gv-row .gv-polaroid') && !document.querySelector('.pt-tones, .pt-prints')"),
              f'{name}: Udon and the real piece sit by the board; tone / print chips are gone')
        # "from my drawing": draw straight on the piece
        await js_click(pg, '[data-layout="tuve"]')
        await pg.evaluate("document.querySelector('.pt-board').scrollIntoView({block: 'center'})")
        await pg.wait_for_timeout(200)
        cb = await pg.evaluate("(() => { const r = document.querySelector('.pt-canvas').getBoundingClientRect(); return [r.x, r.y, r.width, r.height]; })()")
        await pg.mouse.move(cb[0] + cb[2] * 0.3, cb[1] + cb[3] * 0.4)
        await pg.mouse.down()
        await pg.mouse.move(cb[0] + cb[2] * 0.7, cb[1] + cb[3] * 0.6, steps=12)
        await pg.mouse.up()
        await pg.wait_for_timeout(200)
        check(await pg.evaluate("document.querySelectorAll('.pt-board svg path[stroke-linecap=round]').length") == 1,
              f'{name}: a line drawn on the piece lands in the design')
        await js_click(pg, '.pt-scrap:nth-child(3)')
        await pg.wait_for_timeout(200)
        check(await pg.evaluate("document.querySelector('.pt-board svg title').textContent.includes('vải từng mảnh')"),
              f'{name}: while drawing, a scrap from the basket becomes the fabric under the drawing')
        await js_click(pg, '[data-pt="clear"]')
        # "Ghép theo nét vẽ": a closed loop + an edge-to-edge line cut 3 pieces
        await js_click(pg, '[data-layout="net"]')
        await pg.wait_for_timeout(200)
        cb = await pg.evaluate("(() => { const r = document.querySelector('.pt-canvas').getBoundingClientRect(); return [r.x, r.y, r.width, r.height]; })()")
        import math
        cx, cy, rr = cb[0] + cb[2] * 0.5, cb[1] + cb[3] * 0.55, cb[2] * 0.18
        await pg.mouse.move(cx + rr, cy)
        await pg.mouse.down()
        for k in range(1, 37):
            a = k * 10 * math.pi / 180
            await pg.mouse.move(cx + rr * math.cos(a), cy + rr * math.sin(a))
        await pg.mouse.up()
        await pg.mouse.move(cb[0] + cb[2] * 0.02, cb[1] + cb[3] * 0.2)
        await pg.mouse.down()
        await pg.mouse.move(cb[0] + cb[2] * 0.98, cb[1] + cb[3] * 0.25, steps=15)
        await pg.mouse.up()
        await pg.wait_for_timeout(300)
        n = await pg.evaluate("document.querySelectorAll('.pt-board path[data-i]').length")
        check(n == 3, f'{name}: lines cut the piece into patches ({n})')
        sid3 = await pg.evaluate("document.querySelectorAll('.pt-scrap')[6].dataset.scrap")
        await js_click(pg, '.pt-scrap:nth-child(7)')
        await pg.mouse.click(cx, cy)
        await pg.wait_for_timeout(300)
        fill1 = await pg.evaluate("[...document.querySelectorAll('.pt-board path[data-i]')].map(p => p.getAttribute('fill')).join(' ')")
        check(f'f{sid3})' in fill1 or 'c' in sid3, f'{name}: tapping a cut patch through the canvas lays the held scrap on it')
        await pg.screenshot(path=OUT / f'design-{name}-net.png')
        await js_click(pg, '[data-pt="clear"]')
        await js_click(pg, '[data-mood="gem"]')
        await pg.wait_for_timeout(200)
        note = await pg.evaluate("document.querySelector('.pt-board svg title').textContent")
        check('Gem chọn' in note, f'{name}: "Gem chọn giúp" leaves the fabrics to Gem ({note[:60]}…)')
        await js_click(pg, '[data-mood="hanoi"]')
        await js_click(pg, '[data-layout="vuong"]')
        # own colour: dye the basket, put one on a patch, it travels in the code
        await js_click(pg, '[data-pt="own"]')
        await pg.evaluate("document.querySelector('[name=own]').value = '#7a4fa0'")
        await js_click(pg, '[data-own-go]')
        try:   # the dye takes a second or two; sewing before it lands redraws the piece and drops the thread
            await pg.wait_for_function("getComputedStyle(document.querySelector('.pt-scrap .pt-sf')).backgroundImage.includes('blob:')", timeout=8000)
        except Exception:
            pass   # reported by the check below
        await pg.wait_for_timeout(500)
        keys = await pg.evaluate("[...document.querySelectorAll('.pt-scrap')].map(b => b.dataset.scrap)")
        check(len(keys) == 9 and all(k.endswith('7a4fa0') for k in keys), f'{name}: own colour fills the basket with 9 kinds ({keys[:2]}…)')
        dyed = await pg.evaluate("getComputedStyle(document.querySelector('.pt-scrap .pt-sf')).backgroundImage")
        check('blob:' in dyed, f'{name}: the painted fabric is dyed in the browser ({dyed[:40]})')
        await pg.click('.pt-scrap >> nth=4')
        await pg.click('.pt-board [data-i="8"]')
        await pg.wait_for_timeout(300)
        spec = await pg.evaluate("(() => { const t = document.querySelector('.pt-board svg title').textContent; return t; })()")
        check('#7a4fa0' in spec, f'{name}: the order note names the own colour ({spec[-60:]})')
        await pg.screenshot(path=OUT / f'design-{name}-own.png')
        # sew
        await js_click(pg, '[data-pt="sew"]')
        await pg.wait_for_timeout(600)
        check(await pg.evaluate("document.querySelectorAll('.pt-thread').length") > 0, f'{name}: a thread runs along the seams')
        await pg.wait_for_timeout(2600)
        check(await pg.evaluate("!document.querySelector('.pt-done').hidden"), f'{name}: name + number appear after sewing')
        title = await pg.evaluate("document.querySelector('.pt-done-name').value")
        sub = await pg.evaluate("document.querySelector('.pt-done-sub').textContent")
        check(bool(title) and '#' in sub, f'{name}: "{title}" / {sub}')
        await pg.fill('[name="title"]', 'Gối của mẹ')
        await pg.fill('[name="by"]', 'Linh <b>')
        await pg.wait_for_timeout(2500)
        size = await pg.evaluate("(() => { const i = document.querySelector('.pt-done-card img'); return [i.naturalWidth, i.naturalHeight]; })()")
        check(size == [1080, 1920], f'{name}: the share card is 1080x1920 ({size})')
        card = await pg.evaluate("document.querySelector('.pt-done-card img').src")
        import base64
        data = await pg.evaluate("(async u => { const b = await (await fetch(u)).blob(); return await new Promise(r => { const f = new FileReader(); f.onload = () => r(f.result); f.readAsDataURL(b); }); })(arguments[0])".replace('arguments[0]', repr(card)))
        (OUT / f'design-{name}-card.png').write_bytes(base64.b64decode(data.split(',', 1)[1]))
        await pg.evaluate("document.querySelector('.pt-done').scrollIntoView({block: 'center'})")
        await pg.wait_for_timeout(300)
        await pg.screenshot(path=OUT / f'design-{name}-2done.png')
        check(await pg.evaluate("!document.querySelector('.pt-done b')"), f'{name}: the typed name never becomes HTML')
        check(await pg.evaluate("!!document.querySelector('.pt-done [data-pt=add]') && !document.querySelector('.pt-done [data-pt=add]').disabled"),
              f'{name}: the card has its own "Đặt Gem may"')
        top = await pg.evaluate("document.querySelector('.pt-board').getBoundingClientRect().top")
        check(True, f'{name}: board top after sewing {round(top)}')
        check(not pg.errors, f'{name}: no script errors {pg.errors}')
        await pg.context.close()

    # round / square coaster
    pg = await page(browser, db, 393, 852, "sessionStorage.setItem('gem-scene','in');localStorage.setItem('gem-studio-intro','1')")
    await pg.goto(f'{BASE}/studio.html')
    await pg.wait_for_timeout(1500)
    await js_click(pg, '[data-go="sewing"]')
    await pg.wait_for_timeout(2500)
    await js_click(pg, '[data-product="lotcoc"]')
    await pg.wait_for_timeout(300)
    check(await pg.evaluate("!document.querySelector('.pt-shapes').hidden"), 'coaster offers Tròn / Vuông')
    await js_click(pg, '[data-shape="lotcocv"]')
    await pg.wait_for_timeout(400)
    sq = await pg.evaluate("document.querySelector('.pt-board svg').innerHTML.includes('mon-lotcocv')")
    tab = await pg.evaluate("document.querySelector('.pt-tab.is-on').dataset.product")
    check(sq and tab == 'lotcoc', f'square coaster drawn, "Lót cốc" tab stays on ({tab})')
    await js_click(pg, '[data-product="goi"]')
    await pg.wait_for_timeout(300)
    check(await pg.evaluate("document.querySelector('.pt-shapes').hidden"), 'no shape choice on other pieces')
    check(not pg.errors, f'no script errors {pg.errors}')
    await pg.context.close()

    # a friend opens the shared link
    pg = await page(browser, db, 393, 852, "localStorage.setItem('gem-studio-intro','1')")
    await pg.goto(f'{BASE}/studio.html')
    await pg.wait_for_timeout(800)
    spec = await pg.evaluate("(() => { const P = window.GemPatch, d = P.blank('goi'); P.applyMood(d, P.MOODS[2]); return P.encode(d); })()")
    url = await pg.evaluate("s => window.GemPatch.url(s, 'Linh', 'bien')", spec)
    await pg.goto(url)
    await pg.wait_for_timeout(3500)
    hdr = await pg.evaluate("(document.querySelector('.pt-shared-h') || {}).textContent || ''")
    check('Linh' in hdr, f'shared link greets with the designer\'s name ({hdr})')
    same = await pg.evaluate("s => window.GemPatch.encode(window.GemPatch.parse(s)) === s && document.querySelector('.pt-mood.is-on') && document.querySelector('.pt-mood.is-on').dataset.mood", spec)
    check(same == 'bien', f'the friend sees the same design ({same})')
    await pg.screenshot(path=OUT / 'design-shared.png')
    await js_click(pg, '.pt-shared [data-pt="add"]')
    await pg.wait_for_timeout(1200)
    check(await pg.evaluate("window.GemBasket.count()") == 1, '"Đặt may giống vậy" puts it in the basket')
    check(await pg.evaluate("!!document.querySelector('.gb-pile-item svg image')"), 'the basket shows the design itself, not a sprite')
    check(await pg.evaluate("document.querySelectorAll('.st-cargo .st-cargo-item').length") >= 3, 'the design rides in the character\'s cart (every push frame)')
    check(not pg.errors, f'no script errors {pg.errors}')
    await pg.context.close()


async def catalog(browser, db):
    print('catalog')
    for name, w, h in (('mobile', 375, 844), ('desktop', 1440, 900)):
        pg = await page(browser, db, w, h)
        await pg.goto(f'{BASE}/san-pham.html')
        await pg.wait_for_timeout(1500)
        info = await pg.evaluate("""() => {
          const c = document.querySelector('.product-grid[data-cat="vai-vun"] .product-card[data-sku="tui-moi"]');
          const skus = [...document.querySelectorAll('.product-grid[data-cat="vai-vun"] .product-card')].map(x => x.dataset.sku);
          return c && { h: c.querySelector('h4').textContent, add: !!c.querySelector('.gb-add'), hidden: c.hidden, skus };
        }""")
        check(bool(info) and info['h'] == 'Túi mới thử' and info['add'] and not info['hidden'],
              f'{name}: new product gets its card with a basket button ({info and info["h"]})')
        if info:
            check(info['skus'].index('tui-moi') == 12, f'{name}: in the shop\'s order ({info["skus"]})')
        await pg.evaluate("document.querySelector('[data-sku=\"tui-moi\"]').scrollIntoView({block: 'center'})")
        await pg.wait_for_timeout(400)
        await pg.screenshot(path=OUT / f'catalog-{name}.png')
        await pg.click('[data-sku="tui-moi"] h4')
        await pg.wait_for_timeout(500)
        check(await pg.evaluate("document.querySelector('.pg-modal').classList.contains('open') && document.querySelector('.pg-title').textContent") == 'Túi mới thử',
              f'{name}: its lightbox opens')
        await pg.keyboard.press('Escape')
        await pg.click('[data-sku="tui-moi"] .gb-add')
        await pg.wait_for_timeout(1200)
        check(await pg.evaluate("window.GemBasket.count()") == 1, f'{name}: basket button adds it, without opening the lightbox')
        check(await pg.evaluate("!document.querySelector('.pg-modal').classList.contains('open')"), f'{name}: lightbox stays shut')
        check(not pg.errors, f'{name}: no script errors {pg.errors}')
        await pg.context.close()


async def kinds(browser, db):
    """What a piece does ("Loại"): set in the editor, played in the studio."""
    print('kinds')
    db.rows.clear(); db.info.clear()
    pg = await page(browser, db, 1440, 900, "sessionStorage.setItem('gem-admin-token','fake')")
    await pg.goto(f'{BASE}/admin.html')
    await pg.wait_for_timeout(800)
    await js_click(pg, '[data-tab="studio"]')
    await pg.wait_for_timeout(1500)
    await js_click(pg, '[data-group="cay"]')
    await js_click(pg, '.se-asset[data-asset="9"]')
    await pg.wait_for_timeout(200)
    await pg.select_option('[name="se-kind"]', 'story')
    await pg.wait_for_timeout(200)
    check(await pg.evaluate("!!document.querySelector('.se-kindbox [name=in-body_vi]')"), 'editor: "Câu chuyện" shows the story fields')
    await pg.fill('[name="in-title_vi"]', 'Chậu cây của bà')
    await pg.fill('[name="in-body_vi"]', 'Đoạn một.\n\nĐoạn hai <b>đậm</b>.')
    await js_click(pg, '[data-info="save"]')
    await pg.wait_for_timeout(500)
    row = next(iter(db.info.values()), {})
    check(row.get('kind') == 'story' and row.get('title_vi') == 'Chậu cây của bà', f'editor: the story is saved by picture ({row.get("src")})')
    await pg.select_option('[name="se-kind"]', 'zone')
    await pg.wait_for_timeout(200)
    await pg.select_option('[name="zn-act"]', 'memo')
    await pg.fill('[name="zn-vi"]', 'Bảng nhỏ')
    await pg.dispatch_event('[name="zn-vi"]', 'change')
    await pg.fill('[name="sh-from"]', '2026-01-01')
    await pg.dispatch_event('[name="sh-from"]', 'change')
    await pg.wait_for_timeout(2600)
    it = ((db.rows.get('draft') or {}).get('items') or [{}])[-1]
    check(it.get('kind') == 'zone' and it.get('zone', {}).get('act') == 'memo' and it.get('zone', {}).get('vi') == 'Bảng nhỏ',
          f'editor: a zone keeps its action + name in the layout ({it.get("zone")})')
    check(it.get('show') == {'from': '2026-01-01'}, f'editor: dates to show it ({it.get("show")})')
    # an upload with a big see-through margin comes back cut to the picture
    sz = await pg.evaluate("""async () => {
      const c = document.createElement('canvas'); c.width = 400; c.height = 300;
      c.getContext('2d').fillRect(150, 100, 100, 50);
      const b = await new Promise(r => c.toBlob(r, 'image/png'));
      const f = await GemImg.shrink(new File([b], 'x.png', {type: 'image/png'}), {alpha: true});
      return GemImg.size(f).then(d => [d.w, d.h]);
    }""")
    check(sz[0] < 130 and sz[1] < 80, f'upload: see-through margins are cut away ({sz})')
    # "Khung bấm" tab: add an own box, name it, give it an action; hide a built-in one
    await js_click(pg, '[data-boxes]')
    await pg.wait_for_timeout(200)
    await js_click(pg, '[data-box-add]')
    await pg.wait_for_timeout(200)
    await pg.fill('[name="bx-vi"]', 'Gối trên tủ')
    await pg.dispatch_event('[name="bx-vi"]', 'change')
    await pg.select_option('[name="bx-act"]', 'shop:cabinet')
    await js_click(pg, '[data-boxes]')
    await js_click(pg, '[data-box-off="sofa"]')
    await pg.wait_for_timeout(2600)
    d = db.rows.get('draft') or {}
    bx = (d.get('boxes') or [{}])[0]
    check(bx.get('vi') == 'Gối trên tủ' and bx.get('act') == 'shop:cabinet', f'editor: an own tap box is saved ({bx})')
    check((d.get('spots') or {}).get('sofa', {}).get('off') is True, 'editor: a built-in box can be hidden from the list')
    await js_click(pg, '[data-box-del="' + bx.get('id', '') + '"]')
    await pg.wait_for_timeout(200)
    check(await pg.evaluate("document.querySelectorAll('.se-hot.is-own').length") == 0, 'editor: an own box can be deleted')
    await pg.screenshot(path=OUT / 'kinds-editor.png')
    check(not pg.errors, f'editor: no script errors {pg.errors}')
    await pg.context.close()

    # the studio: one piece of each kind, near the door so they are on screen
    src = lambda n: f'images/studio/cay/cay-{n:02d}.webp'
    piece = lambda n, x, **kw: dict(src=src(n), x=x, y=700, w=160, h=200, rot=0, flip=False, layer='back', frame=False, **kw)
    lay = json.loads(json.dumps(db.rows.get('draft')))
    lay['items'] = [
        piece(10, 500, kind='story'),
        piece(4, 700, kind='talk'),
        piece(5, 900, kind='zone', zone={'act': 'memo', 'vi': 'Bảng nhỏ'}),
        piece(6, 1100, kind='board', board={'feed': 'workshop'}),
        piece(7, 1300, show={'from': '2099-01-01'}),
    ]
    lay['udon'] = {'x': 1500, 'y': 560, 'w': 128, 'h': 140}
    lay['boxes'] = [{'id': 'k-t1', 'box': [1180, 380, 1420, 620], 'stand': 1300, 'act': 'memo', 'vi': 'Gối trên tủ'}]
    lay['start'] = 300   # away from the pieces: a tap right on the character means "walk"
    db.rows['live'] = lay
    db.info = {
        src(10): {'src': src(10), 'kind': 'story', 'title_vi': 'Chậu cây của bà', 'body_vi': 'Đoạn một.\n\nĐoạn hai <b>đậm</b>.', 'lines': []},
        src(4): {'src': src(4), 'kind': 'talk', 'lines': [{'vi': 'Câu một'}, {'vi': 'Câu hai'}]},
    }
    db.sessions = [{'slug': 'tui-vai', 'name_vi': 'Workshop túi vải', 'starts_at': '2099-05-02T09:00:00+07:00', 'seats_left': 4, 'capacity': 8}]
    st = await page(browser, db, 1440, 900, "sessionStorage.setItem('gem-scene','in');localStorage.setItem('gem-studio-intro','1')")
    await st.goto(f'{BASE}/studio.html')
    await st.wait_for_timeout(2000)
    check(await st.evaluate("document.querySelectorAll('.st-item').length") == 4, 'studio: a piece outside its dates is not there')
    check(await st.evaluate("document.querySelectorAll('.st-thing').length") == 4, 'studio: four pieces that do something')
    board = await st.evaluate("(document.querySelector('.st-board') || {}).textContent || ''")
    check('Workshop túi vải' in board, f'studio: the board shows the next workshop ({board})')
    await st.mouse.click(*(await center(st, '.st-thing[data-kind="talk"]')))
    await st.wait_for_timeout(200)
    a = await st.evaluate("document.querySelector('.st-talk').textContent")
    await st.mouse.click(*(await center(st, '.st-thing[data-kind="talk"]')))
    await st.wait_for_timeout(200)
    b = await st.evaluate("document.querySelector('.st-talk').textContent")
    check((a, b) == ('Câu một', 'Câu hai'), f'studio: talk says the next line each tap ({a}, {b})')
    await st.mouse.click(*(await center(st, '.st-thing[data-kind="story"]')))
    await st.wait_for_timeout(500)
    body = await st.evaluate("document.getElementById('st-sheet-body').innerHTML")
    check('Chậu cây của bà' in body and '&lt;b&gt;' in body and body.count('<p>') >= 2, 'studio: tap a story — its card, text kept as text')
    await st.keyboard.press('Escape')
    await st.wait_for_timeout(400)
    await drag(st, await center(st, '.st-thing[data-kind="story"]'), await center(st, '.st-udon'))
    await st.wait_for_timeout(700)
    check(await st.evaluate("!!document.querySelector('#st-sheet-body .st-story-udon')"), 'studio: a story dropped on Udon — Udon tells it')
    await st.screenshot(path=OUT / 'kinds-story-udon.png')
    await st.keyboard.press('Escape')
    await st.wait_for_timeout(400)
    await st.mouse.click(*(await center(st, '.st-thing[data-kind="zone"]')))
    await st.wait_for_timeout(500)
    check(await st.evaluate("!!document.querySelector('#st-sheet-body .mb-form')"), 'studio: a zone piece opens its action (memo board)')
    check(await st.evaluate("document.querySelector('.st-zone-label').textContent") == 'Bảng nhỏ', 'studio: the zone has its name')
    await st.keyboard.press('Escape')
    await st.wait_for_timeout(400)
    # the corner of the zone's box is see-through: a tap there is not on it
    r = await st.evaluate("(() => { const r = document.querySelector('.st-thing[data-kind=zone]').getBoundingClientRect(); return [r.x, r.y]; })()")
    await st.mouse.click(r[0] + 3, r[1] + 3)
    await st.wait_for_timeout(500)
    check(await st.evaluate("!document.querySelector('#st-sheet-body .mb-form') || document.getElementById('st-modal').hidden"),
          'studio: a tap on the see-through corner of a piece passes through')
    check(await st.evaluate("(document.querySelector('.st-hot[data-hot=k-t1] .st-hot-label') || {}).textContent") == 'Gối trên tủ',
          'studio: an own tap box is there, with its name')
    await js_click(st, '.st-hot[data-hot=k-t1] .st-hot-label')
    await st.wait_for_timeout(500)
    check(await st.evaluate("!!document.querySelector('#st-sheet-body .mb-form')"), 'studio: an own tap box runs its action')
    await st.keyboard.press('Escape')
    await st.wait_for_timeout(300)
    await st.screenshot(path=OUT / 'kinds-studio.png')
    check(not st.errors, f'studio: no script errors {st.errors}')
    await st.context.close()


async def layers(browser, db):
    """"Sau người" / "Trước người": a piece stays on its side of the character
    whatever its kind. Products and pieces with a "Loại" used to be drawn over
    the character from behind."""
    print('layers')
    db.rows.clear(); db.info.clear()
    cay = lambda n: f'images/studio/cay/cay-{n:02d}.webp'
    piece = lambda src, x, y, w, h, layer='back', **kw: dict(src=src, x=x, y=y, w=w, h=h, rot=0, flip=False, layer=layer, frame=False, **kw)
    # the character stands at 780: the product and the zone are right behind it,
    # the small plant right in front
    db.rows['live'] = {
        'v': 1, 'bg': {'src': 'images/studio/bg/strip-tron.webp', 'w': 5792, 'h': 1024},
        'items': [
            piece(cay(6), 480, 760, 220, 300),
            piece('images/studio/sp/origami.webp', 690, 780, 230, 266, sku='origami'),
            piece(cay(5), 870, 770, 150, 333, kind='zone', zone={'act': 'memo', 'vi': 'Khu'}),
            piece(cay(4), 1080, 770, 150, 328, kind='board', board={'feed': 'workshop'}),
            piece(cay(10), 790, 890, 140, 160, 'front'),
            piece(cay(7), 1300, 770, 200, 300, 'front', kind='zone', zone={'act': 'memo'}),
            piece(cay(8), 1500, 770, 200, 300, 'front', kind='board', board={'feed': 'workshop'}),
        ],
        'udon': {'x': 2400, 'y': 560, 'w': 128, 'h': 140}, 'start': 780,
    }
    names = ['decoration', 'product', 'zone', 'board', 'decoration', 'zone', 'board']
    for view, w, h in (('desktop', 1440, 900), ('mobile', 390, 844)):
        st = await page(browser, db, w, h, "sessionStorage.setItem('gem-scene','in');localStorage.setItem('gem-studio-intro','1')")
        await st.goto(f'{BASE}/studio.html')
        await st.wait_for_timeout(2000)
        got = await st.evaluate("""() => {
          const z = el => parseInt(getComputedStyle(el).zIndex, 10) || 0;
          // painted over: a higher z-index, or the same and later in the page
          const over = (a, b) => z(a) !== z(b) ? z(a) > z(b) : !!(b.compareDocumentPosition(a) & Node.DOCUMENT_POSITION_FOLLOWING);
          const who = document.querySelector('.st-player'), hot = document.querySelector('.st-hot');
          const items = [...document.querySelectorAll('.st-item')], writing = [...document.querySelectorAll('.st-board')];
          return {
            n: items.length,
            items: items.map(el => over(el, who)),
            writing: writing.map(el => over(el, who)),
            onPicture: writing.map(el => over(el, document.querySelector('.st-item[data-thing="' + el.getAttribute('data-thing') + '"]'))),
            overHot: items.filter(el => el.matches('.st-thing, .st-shelf-prod')).every(el => over(el, hot)),
          };
        }""")
        check(got['n'] == 7, f'{view}: seven pieces in the studio ({got["n"]})')
        for i, name in enumerate(names):
            front = i >= 4
            check(got['items'][i] == front, f'{view}: a {name} set "{"Trước" if front else "Sau"} người" is {"in front of" if front else "behind"} the character')
        check(got['writing'] == [False, True], f'{view}: a board\'s writing is on the same side as its picture ({got["writing"]})')
        check(all(got['onPicture']), f'{view}: a board\'s writing is over its picture ({got["onPicture"]})')
        check(got['overHot'], f'{view}: pieces that take taps stay over the tap boxes')
        await st.screenshot(path=OUT / f'layers-{view}.png')
        check(not st.errors, f'{view}: no script errors {st.errors}')
        await st.context.close()


async def topbar(browser, db):
    """The top bar on a phone: the logo and the three controls side by side,
    none on top of another, none past the edge, in both languages. (A fourth
    control once pushed the language switch off the screen.)"""
    print('topbar')
    for lang in ('vi', 'en'):
        for w in (320, 360, 390, 480):
            pg = await page(browser, db, w, 844, f"localStorage.setItem('gem-lang','{lang}')")
            await pg.goto(f'{BASE}/studio.html')
            await pg.wait_for_timeout(800)
            await pg.evaluate('document.fonts.ready.then(() => true)')
            got = await pg.evaluate("""() => {
              const bar = document.querySelector('.st-top');
              const box = s => bar.querySelector(s).getBoundingClientRect();
              const name = box('.st-brand span'), shown = name.width > 2;
              const seen = [box('.st-brand img')].concat(shown ? [name] : [], [box('.st-list-link'), box('.st-motion'), box('.lang-switch')]);
              const en = box('.lang-btn[data-lang=en]');
              const hit = document.elementFromPoint(en.left + en.width / 2, en.top + en.height / 2);
              return {
                clash: seen.some((b, i) => i > 0 && b.left < seen[i - 1].right - 0.5),
                past: Math.round(seen[seen.length - 1].right - innerWidth),
                shown: shown,
                read: bar.querySelector('.st-brand').textContent.includes('Gem Studio 2D'),
                en: !!hit && hit.getAttribute('data-lang') === 'en',
              };
            }""")
            check(not got['clash'] and got['past'] <= 0, f'{lang} {w}px: the top bar fits (past the edge: {max(0, got["past"])}px)')
            check(got['en'], f'{lang} {w}px: the EN button can be tapped')
            check(got['shown'] == (w >= 480) and got['read'], f'{lang} {w}px: the name is {"shown" if w >= 480 else "left to the logo, still read out"}')
            if lang == 'vi':
                await pg.screenshot(path=OUT / f'topbar-{w}.png', clip={'x': 0, 'y': 0, 'width': w, 'height': 120})
            await pg.context.close()


async def motion(browser, db):
    """A device that asks for less motion: no walking, a line saying why, and
    the "Hiệu ứng" button turns walking back on (remembered)."""
    print('motion')
    ctx = await browser.new_context(viewport={'width': 390, 'height': 844}, reduced_motion='reduce', is_mobile=True, has_touch=True)
    await ctx.route('**/*.supabase.co/**', lambda r: r.abort())
    await ctx.add_init_script("sessionStorage.setItem('gem-scene','in');localStorage.setItem('gem-studio-intro','1')")
    pg = await ctx.new_page()
    errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    await pg.goto(f'{BASE}/studio.html')
    await pg.wait_for_timeout(3000)
    said = await pg.evaluate("document.getElementById('st-bubble-text').textContent")
    check('giảm chuyển động' in said, f'reduced motion: Udon says why the character does not walk ({said[:40]}…)')

    async def frames(go):
        await pg.keyboard.press('Escape')
        await pg.evaluate("g => document.querySelector('[data-go=\"' + g + '\"]').click()", go)
        seen = set()
        for _ in range(8):
            await pg.wait_for_timeout(90)
            seen.add(await pg.evaluate("[...document.querySelectorAll('.st-fr')].findIndex(f => !f.hidden)"))
        return seen
    check(len(await frames('counter')) == 1, 'reduced motion: the character does not walk')
    await js_click(pg, '.st-motion')
    check(len(await frames('door')) > 2, '"Hiệu ứng" on: the character walks')
    check(await pg.evaluate("localStorage.getItem('gem-motion')") == 'on', 'the choice is remembered')
    check(not errs, f'no script errors {errs}')
    await ctx.close()


async def main(which):
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')   # a Windows console's code page has no Vietnamese
    OUT.mkdir(exist_ok=True)
    srv = serve()
    db = FakeDB()
    async with async_playwright() as p:
        browser = await launch(p)
        for name, fn in (('street', street), ('wear', wear), ('shop', shop), ('spots', spots), ('editor', editor),
                         ('library', library), ('product', product), ('design', design), ('catalog', catalog), ('kinds', kinds),
                         ('layers', layers), ('topbar', topbar), ('motion', motion)):
            if which in (None, name):
                await fn(browser, db)
        await browser.close()
    srv.shutdown()
    print(f'\nscreenshots: {OUT}')
    if failures:
        sys.exit(f'{len(failures)} failed')
    print('all ok')


if __name__ == '__main__':
    asyncio.run(main(sys.argv[1] if len(sys.argv) > 1 else None))
