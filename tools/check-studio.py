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
           character whatever its kind; on one side the pieces are painted in
           the owner's order (a decoration set on a "Khu vực" stays on it)
  zones    built-in boxes hidden, their jobs given to pieces: lit by the
           picture (not its see-through sheet), no frame, the nav and the
           memo notes follow the piece, a story in hand has a place to go
  cart     what rides in the cart / the basket: the cut-out of the very piece
           picked up, never the catalogue photo when the Studio has a cut-out
  topbar   the top bar fits a phone (320px up), in Vietnamese and English
  motion   a device asking for less motion: no walking, "Hiệu ứng" turns it on
  taps     taps on a phone (clicks on a desktop) near "Khu vực" pieces standing on
           the floor: a piece's picture walks there, its tag opens it; a tap on
           the character is never dead; every piece has a tag on its picture, out
           of the character's way; a double tap keeps the sheet, its ✕ works at
           once; small products forgive a finger; a stop point dragged far off
           its box is ignored

Screenshots go to /tmp/gem-check/ — look at them, a pass only means nothing
crashed and the counts add up.

    python3 tools/check-studio.py            all checks
    python3 tools/check-studio.py wear       one check (street | wear | shop | spots | editor |
                                             library | product | design | catalog | kinds |
                                             layers | zones | cart | topbar | motion | taps)

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
        self.notes = []      # approved notes (the memo board)
        self.gone = set()    # categories whose products are all hidden / deleted
        self.wtypes = []     # workshop_types
        self.wt_patches = []

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
        if '/rest/v1/workshop_types' in u:
            if m == 'PATCH':
                b = json.loads(r.request.post_data)
                self.wt_patches.append(b)
                i = re.search(r'id=eq\.([^&]+)', u).group(1)
                for t in self.wtypes:
                    if t['id'] == i:
                        t.update(b)
                return await r.fulfill(status=200, content_type='application/json', body='[{}]')
            return await r.fulfill(status=200, content_type='application/json', body=json.dumps(self.wtypes))
        if '/rest/v1/sessions_public' in u:
            return await r.fulfill(status=200, content_type='application/json', body=json.dumps(self.sessions))
        if '/rest/v1/posts' in u:
            return await r.fulfill(status=200, content_type='application/json', body=json.dumps(self.posts))
        if '/rest/v1/notes' in u:
            return await r.fulfill(status=200, content_type='application/json', body=json.dumps(self.notes))
        if '/rest/v1/products' in u:
            if m == 'PATCH':
                self.patches.append(json.loads(r.request.post_data))
                return await r.fulfill(status=200, content_type='application/json', body='[{}]')
            return await r.fulfill(status=200, content_type='application/json',
                                   body=json.dumps([p for p in product_rows() if p['category'] not in self.gone]))
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
                f"localStorage.setItem('gem-char','{who}');localStorage.setItem('gem-studio-intro','1');localStorage.setItem('gem-studio-intro-touch','1')")
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
    await ctx.add_init_script("sessionStorage.setItem('gem-scene','in');localStorage.setItem('gem-studio-intro','1');localStorage.setItem('gem-studio-intro-touch','1')")
    pg = await ctx.new_page()
    errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    await pg.goto(f'{BASE}/studio.html')
    await pg.wait_for_timeout(1500)
    await pg.add_style_tag(content='.lang-hint{display:none!important}')
    await js_click(pg, '[data-go="shelves"]')
    await pg.wait_for_timeout(2000)
    o = await center(pg, '.st-shelf-prod[data-sku="origami"]')
    shown = "(() => { const t = document.querySelector('.st-prod-label'); return t && !t.hidden ? t.textContent : ''; })()"
    await pg.mouse.move(o[0] - 40, o[1])
    await pg.mouse.move(*o)
    await pg.wait_for_timeout(150)
    name = await pg.evaluate(shown)
    check('Origami' in name, f'the mouse over a shelf product shows its name ({name})')
    await pg.screenshot(path=OUT / 'shop-name.png')
    await pg.mouse.move(o[0], 20)   # up to the top bar
    await pg.wait_for_timeout(150)
    check(await pg.evaluate(shown) == '', 'and the name goes when the mouse leaves')
    await pg.mouse.click(*o)
    await pg.wait_for_timeout(600)
    check('Origami' in (await pg.evaluate("document.getElementById('st-sheet-body').textContent")), 'tap a shelf product opens its card')
    check(await pg.evaluate(shown) == '', 'no name left behind under the card')
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
    st = await page(browser, db, 1300, 760, "sessionStorage.setItem('gem-scene','in');localStorage.setItem('gem-studio-intro','1');localStorage.setItem('gem-studio-intro-touch','1')")
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


async def workshop(browser, db):
    """Workshop types: cover + photo library in admin (shrunk before upload),
    and the type cards on workshop.html (photo, "+N ảnh", next-session line)
    — with and without sessions on the calendar."""
    print('workshop')
    db.files.clear(); db.wt_patches.clear(); db.sessions = []
    db.wtypes = [
        {'id': 't1', 'slug': 'bia-so-vai-vun', 'name_vi': 'Bìa sổ vải vụn', 'name_en': 'Scrap-fabric notebook cover',
         'desc_vi': 'Ghép vải vụn thành bìa sổ của riêng bạn.', 'desc_en': None, 'long_vi': 'Đoạn một.',
         'duration_minutes': 120, 'price': None, 'cover': None, 'images': [], 'sort_order': 1, 'is_published': True},
        {'id': 't2', 'slug': 'giay-tai-che', 'name_vi': 'Giấy tái chế', 'name_en': 'Recycled paper',
         'desc_vi': 'Xeo giấy từ giấy vụn.', 'desc_en': None, 'long_vi': 'Đoạn một.',
         'duration_minutes': 150, 'price': 250000, 'cover': None, 'images': [], 'sort_order': 2, 'is_published': True},
    ]
    photo = test_photo(OUT / 'ws-photo.jpg', 3000, 2000)
    pg = await admin_page(browser, db, 412, 900)
    await js_click(pg, '[data-tab="sessions"]')
    await pg.wait_for_timeout(800)
    await pg.evaluate("document.querySelector('.ad-wtypes').open = true")
    card = '.ad-wt[data-id="t1"] '
    await pg.set_input_files(card + '.wt-cover-in', photo)
    await pg.wait_for_timeout(2500)
    await pg.set_input_files(card + '.wt-gal-in', [photo, photo])
    await pg.wait_for_timeout(4000)
    check(await pg.evaluate(f"document.querySelectorAll('{card}.wt-gal img').length") == 2, 'two photos in the workshop library')
    await pg.screenshot(path=OUT / 'workshop-admin.png', full_page=True)
    await js_click(pg, card + '.wt-save')
    await pg.wait_for_timeout(1500)
    body = db.wt_patches[-1] if db.wt_patches else {}
    check('/gem-media/' in (body.get('cover') or ''), 'cover saved')
    check(len(body.get('images') or []) == 2, f'library saved ({len(body.get("images") or [])})')
    f = db.files.get((body.get('cover') or '').split('/gem-media/')[-1])
    check(f and max(decode(f[1]).size) == 1280, f'cover shrunk to 1280px ({len(f[1]) // 1024 if f else "?"} KB)')
    check(not pg.errors, f'no script errors {pg.errors}')
    await pg.context.close()

    for sessions, tag in (([], 'empty'), ([{'id': 's1', 'slug': 'giay-tai-che', 'name_vi': 'Giấy tái chế', 'name_en': 'Recycled paper',
                                             'duration_minutes': 150, 'price': 250000, 'starts_at': '2030-10-16T02:00:00Z',
                                             'seats_left': 4, 'capacity': 8}], 'sessions')):
        db.sessions = sessions
        for w, h in ((375, 844), (1440, 900)):
            pg = await page(browser, db, w, h)
            await pg.goto(f'{BASE}/workshop.html')
            await pg.wait_for_timeout(1200)
            n = await pg.evaluate("document.querySelectorAll('.ws-type').length")
            check(n == 2, f'{tag} {w}px: both workshop cards shown ({n})')
            pic = await pg.evaluate("(() => { const i = document.querySelector('.ws-type-pic img'); return i && i.complete && i.naturalWidth })()")
            check(pic, f'{tag} {w}px: card photo loaded')
            cnt = await pg.evaluate("(document.querySelector('.ws-type-count') || {}).textContent")
            check(cnt == '+2 ảnh', f'{tag} {w}px: photo count ({cnt})')
            nxt = await pg.evaluate("[...document.querySelectorAll('.ws-type-next')].map(e => e.textContent)")
            want = 'Buổi gần nhất' if sessions else 'Chưa có lịch'
            check(len(nxt) == 2 and want in nxt[1], f'{tag} {w}px: next-session line ({nxt})')
            await pg.locator('#ws-root').screenshot(path=OUT / f'workshop-{tag}-{w}.png')
            check(not pg.errors, f'no script errors {pg.errors}')
            await pg.context.close()


async def design(browser, db):
    print('design')
    for name, w, h in (('mobile', 393, 852), ('desktop', 1440, 900)):
        pg = await page(browser, db, w, h, "sessionStorage.setItem('gem-scene','in');localStorage.setItem('gem-studio-intro','1');localStorage.setItem('gem-studio-intro-touch','1');localStorage.removeItem('gem-designer')")
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
    pg = await page(browser, db, 393, 852, "sessionStorage.setItem('gem-scene','in');localStorage.setItem('gem-studio-intro','1');localStorage.setItem('gem-studio-intro-touch','1')")
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
    pg = await page(browser, db, 393, 852, "localStorage.setItem('gem-studio-intro','1');localStorage.setItem('gem-studio-intro-touch','1')")
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

    # a category with nothing left (all hidden / deleted in admin) goes from the page and from both lists
    shown = """() => {
      const vis = el => !!el && getComputedStyle(el).display !== 'none' && !el.closest('[hidden]');
      const out = {};
      for (const id of ['phu-kien-vai-vun', 'van-phong-pham', 'quan-ao-2hand', 'gom-su-nhat', 'set-qua', 'dich-vu']) {
        const sec = document.getElementById(id), head = sec.querySelector('.category-header') || sec.querySelector('h2');
        out[id] = [vis(head), [...document.querySelectorAll('.toc-item[href="#' + id + '"]')].map(vis)];
      }
      return out;
    }"""
    for gone, name in (({'vpp'}, 'one category emptied'), ({c for _, c, *_ in PRODUCTS}, 'every product gone')):
        db.gone = gone
        pg = await page(browser, db, 1440, 900)
        await pg.goto(f'{BASE}/san-pham.html')
        await pg.wait_for_timeout(1500)
        got = await pg.evaluate(shown)
        emptied = {'vai-vun': 'phu-kien-vai-vun', 'vpp': 'van-phong-pham', 'gom': 'gom-su-nhat', 'set-qua': 'set-qua'}
        want = {i: i not in {emptied[c] for c in gone} for i in got}
        ok = all(got[i][0] == want[i] and all(v == want[i] for v in got[i][1]) and len(got[i][1]) == 2 for i in got)
        check(ok, f'{name}: its block and both list entries are hidden, the rest stays ({ {i: got[i][0] for i in got} })')
        await pg.screenshot(path=OUT / f'catalog-{"all" if len(gone) > 1 else "vpp"}-gone.png')
        check(not pg.errors, f'{name}: no script errors {pg.errors}')
        await pg.context.close()
    db.gone = set()


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
    drawn = await pg.evaluate("""['.se-hot[data-id="sofa"]', '.se-hot-tag[data-id="sofa"]', '.se-stand[data-id="sofa"]', '.se-hot[data-id="rail"]']
      .map(s => !!document.querySelector(s))""")
    check(drawn == [False, False, False, True], f'editor: a hidden box is off the stage — no frame, name or pin ({drawn})')
    pins = await pg.evaluate("[...document.querySelectorAll('.se-stand')].map(p => (p.querySelector('.se-stand-name') || {}).textContent || '')")
    check(len(pins) > 3 and all(pins) and 'Gối trên tủ' in pins, f'editor: every stop pin says whose it is ({pins[:4]}…)')
    await js_click(pg, '[data-box-pick="sofa"]')
    await pg.wait_for_timeout(300)
    check(await pg.evaluate("!!document.querySelector('.se-hot[data-id=\"sofa\"].is-sel')"), 'editor: "Chọn" in the list brings a hidden box up to adjust')
    await pg.keyboard.press('Escape')
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
    st = await page(browser, db, 1440, 900, "sessionStorage.setItem('gem-scene','in');localStorage.setItem('gem-studio-intro','1');localStorage.setItem('gem-studio-intro-touch','1')")
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
    check(await st.evaluate("document.getElementById('st-modal').hidden"), 'studio: a tap on a zone piece walks there')
    await st.mouse.click(*(await center(st, '.st-zone-label')))
    await st.wait_for_timeout(500)
    check(await st.evaluate("!!document.querySelector('#st-sheet-body .mb-form')"), 'studio: its tag opens its action (memo board)')
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
    the character from behind. On one side, the pieces are painted in the
    owner's order whatever their kind: a decoration hung on a "Khu vực" piece
    used to end up behind it."""
    print('layers')
    db.rows.clear(); db.info.clear()
    cay = lambda n: f'images/studio/cay/cay-{n:02d}.webp'
    piece = lambda src, x, y, w, h, layer='back', **kw: dict(src=src, x=x, y=y, w=w, h=h, rot=0, flip=False, layer=layer, frame=False, **kw)
    # the character stands at 780: the product and the zone are right behind it,
    # the small plant right in front; the last "Sau người" piece is a plain
    # decoration set on the zone and the board
    db.rows['live'] = {
        'v': 1, 'bg': {'src': 'images/studio/bg/strip-tron.webp', 'w': 5792, 'h': 1024},
        'items': [
            piece(cay(6), 480, 760, 220, 300),
            piece('images/studio/sp/origami.webp', 690, 780, 230, 266, sku='origami'),
            piece(cay(5), 870, 770, 150, 333, kind='zone', zone={'act': 'memo', 'vi': 'Khu'}),
            piece(cay(4), 1080, 770, 150, 328, kind='board', board={'feed': 'workshop'}),
            piece(cay(10), 975, 720, 260, 150),
            piece(cay(10), 790, 890, 140, 160, 'front'),
            piece(cay(7), 1300, 770, 200, 300, 'front', kind='zone', zone={'act': 'memo'}),
            piece(cay(8), 1500, 770, 200, 300, 'front', kind='board', board={'feed': 'workshop'}),
        ],
        'udon': {'x': 2400, 'y': 560, 'w': 128, 'h': 140}, 'start': 780,
    }
    names = ['decoration', 'product', 'zone', 'board', 'decoration', 'decoration', 'zone', 'board']
    back = 5
    for view, w, h in (('desktop', 1440, 900), ('mobile', 390, 844)):
        st = await page(browser, db, w, h, "sessionStorage.setItem('gem-scene','in');localStorage.setItem('gem-studio-intro','1');localStorage.setItem('gem-studio-intro-touch','1')")
        await st.goto(f'{BASE}/studio.html')
        await st.wait_for_timeout(2000)
        got = await st.evaluate("""(back) => {
          const z = el => parseInt(getComputedStyle(el).zIndex, 10) || 0;
          // painted over: a higher z-index, or the same and later in the page
          const over = (a, b) => z(a) !== z(b) ? z(a) > z(b) : !!(b.compareDocumentPosition(a) & Node.DOCUMENT_POSITION_FOLLOWING);
          const who = document.querySelector('.st-player'), hot = document.querySelector('.st-hot');
          const items = [...document.querySelectorAll('.st-item')], writing = [...document.querySelectorAll('.st-board')];
          // what the browser really paints on top at a point: the hit-test order,
          // with the pieces (plain ones take no taps) made hittable for a moment
          items.forEach(el => { el.dataset.pe = el.style.pointerEvents; el.style.pointerEvents = 'auto'; });
          const deco = items[back - 1], zone = items[2], r = deco.getBoundingClientRect(), zr = zone.getBoundingClientRect();
          const x = Math.max(r.left, zr.left) + 4, y = Math.max(r.top, zr.top) + 4;   // inside both boxes
          const stack = document.elementsFromPoint(x, y).filter(el => items.includes(el));
          items.forEach(el => { el.style.pointerEvents = el.dataset.pe; });
          return {
            n: items.length,
            items: items.map(el => over(el, who)),
            writing: writing.map(el => over(el, who)),
            onPicture: writing.map(el => over(el, document.querySelector('.st-item[data-thing="' + el.getAttribute('data-thing') + '"]'))),
            overHot: items.filter(el => el.matches('.st-thing, .st-shelf-prod')).every(el => over(el, hot)),
            inOrder: items.every((el, i) => !i || (i >= back) !== (i - 1 >= back) || over(el, items[i - 1])),
            painted: stack.map(el => items.indexOf(el)),
            labelsUp: [...document.querySelectorAll('.st-hot-label')].every(el => over(el, who) && items.every(it => over(el, it))),
          };
        }""", back)
        check(got['n'] == 8, f'{view}: eight pieces in the studio ({got["n"]})')
        for i, name in enumerate(names):
            front = i >= back
            check(got['items'][i] == front, f'{view}: a {name} set "{"Trước" if front else "Sau"} người" is {"in front of" if front else "behind"} the character')
        check(got['writing'] == [False, True], f'{view}: a board\'s writing is on the same side as its picture ({got["writing"]})')
        check(all(got['onPicture']), f'{view}: a board\'s writing is over its picture ({got["onPicture"]})')
        check(got['overHot'], f'{view}: pieces that take taps stay over the tap boxes')
        check(got['inOrder'], f'{view}: on one side of the character the pieces are painted in the owner\'s order, whatever their kind')
        check(got['painted'][:2] == [back - 1, 2], f'{view}: a decoration set on a "Khu vực" piece is painted over it ({got["painted"]})')
        check(got['labelsUp'], f'{view}: the name tags stay over every piece')
        await st.screenshot(path=OUT / f'layers-{view}.png')
        check(not st.errors, f'{view}: no script errors {st.errors}')
        await st.context.close()


async def zones(browser, db):
    """The owner hides built-in tap boxes and gives their jobs to pieces
    ("Khu vực"), often uploads that sit in a much wider see-through sheet.
    The studio goes by the pictures: what lights up, where the character
    stops, the nav, the notes on the board; no frame round a piece."""
    print('zones')
    from PIL import Image
    db.rows.clear(); db.info.clear()
    bucket = 'https://dxdovvqsfjeizsoprrfn.supabase.co/storage/v1/object/public/gem-media/'

    def sheet(name, pic, size, at, canvas=(1000, 707)):
        im = Image.new('RGBA', canvas, (0, 0, 0, 0))
        im.alpha_composite(Image.open(ROOT / pic).convert('RGBA').resize(size), at)
        buf = io.BytesIO()
        im.save(buf, 'WEBP', quality=85)
        db.files[name] = ('image/webp', buf.getvalue())
        return bucket + name
    sofa = sheet('z-sofa.webp', 'images/studio/cay/cay-06.webp', (254, 351), (373, 300))      # picture in the middle of its sheet
    table = sheet('z-table.webp', 'images/studio/cay/cay-05.webp', (183, 351), (700, 300))    # picture far right in its sheet
    pa = sheet('z-pa.webp', 'images/studio/sp/origami.webp', (150, 173), (30, 110), (400, 400))    # product pictures: left / right of
    pb = sheet('z-pb.webp', 'images/studio/cay/cay-10.webp', (150, 172), (220, 110), (400, 400))   # their sheets, the sheets overlap
    story = 'images/studio/cay/cay-04.webp'
    piece = lambda src, x, y, w, h, **kw: dict(src=src, x=x, y=y, w=w, h=h, rot=0, flip=False, layer='back', frame=False, **kw)
    db.rows['live'] = {
        'v': 1, 'bg': {'src': 'images/studio/bg/strip-tron.webp', 'w': 5792, 'h': 1024},
        'items': [
            piece(sofa, 900, 640, 1000, 707, kind='zone', zone={'act': 'sofa'}),
            piece('images/studio/cay/cay-10.webp', 900, 781, 80, 91),   # a plain decoration set on the sofa: after it in the list
            piece(table, 2300, 640, 1000, 707, kind='zone', zone={'act': 'sewing'}),
            piece('images/studio/props/bang-treo.webp', 1560, 330, 300, 230, kind='zone', zone={'act': 'memo'}),
            piece(pa, 1900, 600, 400, 400, sku='origami'),
            piece(pb, 1960, 600, 400, 400, sku='oxford'),
            piece(story, 1260, 700, 120, 262, kind='story'),
        ],
        'udon': {'x': 5200, 'y': 560, 'w': 128, 'h': 140}, 'start': 1380,
        'spots': {k: {'off': True} for k in ('sofa', 'sewing', 'memo', 'counter')},
    }
    db.info = {story: {'src': story, 'kind': 'story', 'title_vi': 'Mặt nạ giấy bồi', 'body_vi': 'Chuyện kể.', 'lines': []}}
    db.notes = [{'id': f'n{i}', 'body': f'Lời nhắn {i}', 'name': None, 'created_at': '2026-10-01T00:00:00Z'} for i in range(3)]
    st = await page(browser, db, 1440, 900, "sessionStorage.setItem('gem-scene','in');localStorage.setItem('gem-studio-intro','1');localStorage.setItem('gem-studio-intro-touch','1')")
    await st.goto(f'{BASE}/studio.html')
    await st.wait_for_timeout(2500)
    await st.add_style_tag(content='.lang-hint{display:none!important}')
    rect = "s => { const r = document.querySelector(s).getBoundingClientRect(); return [r.x, r.y, r.width, r.height]; }"
    lit = "s => document.querySelector(s).classList.contains('is-over')"
    zsofa = f'.st-thing[src$="z-sofa.webp"]'

    # the nav goes by what can be reached, box or piece
    nav = await st.evaluate("Object.fromEntries([...document.querySelectorAll('.st-nav [data-go]')].map(b => [b.dataset.go, !b.classList.contains('is-off')]))")
    check(nav.get('sewing') is True, 'nav: "Bàn thiết kế" stays, a piece does that job now')
    check(nav.get('counter') is False, 'nav: "Quầy" goes, nothing does that job')

    # by the picture, not by the sheet round it: a click on a "Khu vực" walks
    # there, its tag opens it, so the mouse over the picture lights the tag
    tag_lit = f"(() => {{ const t = document.querySelector('[data-thing-label=\"' + document.querySelector('{zsofa}').dataset.thing + '\"]'); return [document.querySelector('{zsofa}').classList.contains('is-over'), t.classList.contains('is-hover')]; }})()"
    b = await st.evaluate(rect, zsofa)
    await st.mouse.move(b[0] + b[2] * 0.12, b[1] + b[3] * 0.25)
    await st.wait_for_timeout(150)
    got = await st.evaluate(tag_lit)
    check(got == [False, False], f'the mouse on the see-through part of a piece lights nothing ({got})')
    await st.mouse.move(b[0] + b[2] * 0.5, b[1] + b[3] * 0.7)   # where the decoration lies on it
    await st.wait_for_timeout(150)
    got = await st.evaluate(tag_lit)
    check(got == [False, True], f'the mouse on its picture lights its tag, not the piece (a decoration lying on it takes nothing) ({got})')
    # the decoration is painted over the zone it was set on: the hit-test order
    # (what the browser paints on top) with the decoration made hittable for a moment
    on_top = await st.evaluate("""() => {
      const d = document.querySelector('.st-item[src$="cay/cay-10.webp"]'), z = document.querySelector('.st-thing[src$="z-sofa.webp"]');
      const r = d.getBoundingClientRect();
      d.style.pointerEvents = 'auto';
      const stack = document.elementsFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      d.style.pointerEvents = '';
      return stack.indexOf(d) >= 0 && stack.indexOf(d) < stack.indexOf(z);
    }""")
    check(on_top, 'a decoration set on a "Khu vực" piece shows over it')
    a = await st.evaluate(rect, '.st-shelf-prod[src$="z-pa.webp"]')
    await st.mouse.move(a[0] + a[2] * 0.3, a[1] + a[3] * 0.5)   # on A's picture, inside B's sheet
    await st.wait_for_timeout(150)
    over = await st.evaluate("[...document.querySelectorAll('.st-shelf-prod.is-over')].map(e => e.dataset.sku)")
    tag = await st.evaluate("(() => { const t = document.querySelector('.st-prod-label'); return t && !t.hidden ? t.textContent : ''; })()")
    check(over == ['origami'] and 'Origami' in tag, f'two products whose sheets overlap: only the one under the mouse lights up ({over}, "{tag}")')
    await st.screenshot(path=OUT / 'zones-hover.png')

    # the notes sit on the board piece
    pins = await st.evaluate("""() => {
      const p = document.querySelector('.st-pins'), bd = document.querySelector('.st-thing[src$="bang-treo.webp"]');
      if (!p || !bd) return null;
      const a = p.getBoundingClientRect(), b = bd.getBoundingClientRect();
      return { n: p.children.length, inside: a.left >= b.left && a.right <= b.right && a.top >= b.top && a.bottom <= b.bottom,
               over: (parseInt(getComputedStyle(p).zIndex) || 0) >= (parseInt(getComputedStyle(bd).zIndex) || 0) && !!(bd.compareDocumentPosition(p) & Node.DOCUMENT_POSITION_FOLLOWING) };
    }""")
    check(bool(pins) and pins['n'] == 3 and pins['inside'] and pins['over'], f'memo box hidden: the notes are pinned on the board piece ({pins})')

    # a tap (it walks there), its tag (it opens), then a key: no frame round the piece
    await st.mouse.click(b[0] + b[2] * 0.5, b[1] + b[3] * 0.7)
    await st.wait_for_timeout(2600)
    walked = await st.evaluate("document.getElementById('st-modal').hidden")
    tag = await st.evaluate(f"(() => {{ const r = document.querySelector('[data-thing-label=\"' + document.querySelector('{zsofa}').dataset.thing + '\"]').getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; }})()")
    await st.mouse.click(*tag)
    await st.wait_for_timeout(600)
    opened = await st.evaluate("!document.getElementById('st-modal').hidden")
    await st.keyboard.press('Escape')
    await st.wait_for_timeout(400)
    ring = await st.evaluate(f"(() => {{ const e = document.querySelector('{zsofa}'); return [e.matches(':focus-visible'), getComputedStyle(e).outlineStyle]; }})()")
    check(walked and opened and ring == [False, 'none'], f'tap a piece (walks), its tag (opens), close with Escape: no frame left round it (walked {walked}, opened {opened}, {ring})')
    await st.keyboard.press('Tab')
    for _ in range(14):
        if await st.evaluate("!!document.activeElement && document.activeElement.matches('.st-thing')"):
            break
        await st.keyboard.press('Tab')
    kb = await st.evaluate("(() => { const e = document.activeElement, c = getComputedStyle(e); return [e.matches('.st-thing:focus-visible'), c.outlineStyle, c.filter.includes('drop-shadow')]; })()")
    check(kb == [True, 'none', True], f'reached with Tab: a rim along its outline, no box ({kb})')

    # a story in hand: Udon's bubble comes up as the place to drop it
    await st.mouse.move(600, 80)
    s = await center(st, '.st-thing[data-kind="story"]')
    await st.mouse.move(*s)
    await st.mouse.down()
    await st.mouse.move(s[0] - 60, s[1] - 120, steps=6)
    await st.wait_for_timeout(200)
    drop = await st.evaluate("(() => { const b = document.getElementById('st-bubble'); return [!b.hidden && b.classList.contains('is-drop'), b.textContent.trim()]; })()")
    check(drop[0] and 'Udon' in drop[1], f'dragging a story: the bubble says where to drop it ({drop[1][:40]})')
    await st.screenshot(path=OUT / 'zones-story-drag.png')
    bb = await center(st, '#st-bubble')
    await st.mouse.move(*bb, steps=8)
    await st.mouse.up()
    await st.wait_for_timeout(700)
    check(await st.evaluate("!!document.querySelector('#st-sheet-body .st-story-udon')"), 'dropped on the bubble: Udon tells the story')
    check(await st.evaluate("document.getElementById('st-bubble').hidden"), 'and the bubble goes')
    await st.keyboard.press('Escape')
    await st.wait_for_timeout(400)

    # the nav button walks to the middle of the picture, not of its sheet
    await js_click(st, '.st-nav [data-go="sewing"]')
    await st.wait_for_timeout(6000)
    x = await st.evaluate("parseFloat(document.querySelector('.st-player').style.left) / (document.getElementById('st-world').getBoundingClientRect().height / 1024)")
    check(await st.evaluate("!!document.querySelector('#st-sheet-body .pt')"), 'nav "Bàn thiết kế" opens the design table through the piece')
    check(abs(x - 2591.5) < 14, f'and the character stops at the middle of the picture (x {x:.0f}, picture 2500-2683, sheet middle 2300)')
    check(not st.errors, f'no script errors {st.errors}')
    await st.context.close()


async def cart(browser, db):
    """What the basket shows (the cart the character pushes, the basket
    widget, its rows): a cut-out wherever the Studio has one — the very piece
    picked up, else the product's own, else a piece of it standing in the
    Studio — and the catalogue photo only when there is none. One product can
    hang as several pictures (a green shirt, a yellow one)."""
    print('cart')
    from PIL import Image, ImageDraw
    db.rows.clear(); db.info.clear()
    bucket = 'https://dxdovvqsfjeizsoprrfn.supabase.co/storage/v1/object/public/gem-media/'

    def shirt(name, colour):
        im = Image.new('RGBA', (300, 340), (0, 0, 0, 0))
        ImageDraw.Draw(im).rounded_rectangle((40, 30, 260, 310), 40, fill=colour)
        buf = io.BytesIO()
        im.save(buf, 'WEBP', quality=85)
        db.files[name] = ('image/webp', buf.getvalue())
        return bucket + name
    green, yellow = shirt('ao-xanh.webp', (95, 150, 110, 255)), shirt('ao-vang.webp', (225, 190, 80, 255))
    cushion, photo = 'images/studio/cay/cay-10.webp', 'images/products/vai-vun-bia-so-thumb.jpg'
    piece = lambda src, x, y, w, h, **kw: dict(src=src, x=x, y=y, w=w, h=h, rot=0, flip=False, layer='back', frame=False, **kw)
    db.rows['live'] = {
        'v': 1, 'bg': {'src': 'images/studio/bg/strip-tron.webp', 'w': 5792, 'h': 1024},
        'items': [
            piece(green, 1050, 560, 150, 170, sku='oxford'),
            piece(yellow, 1260, 560, 150, 170, sku='oxford'),
            piece(cushion, 1460, 580, 140, 160, sku='goi'),
            dict(piece(photo, 1660, 560, 150, 150, sku='biaso'), frame=True),   # a framed photo is no cut-out
        ],
        'udon': {'x': 5200, 'y': 560, 'w': 128, 'h': 140}, 'start': 700,
    }
    # two things already in the basket (picked on the products page): no piece of their own
    init = ("sessionStorage.setItem('gem-scene','in');localStorage.setItem('gem-studio-intro','1');localStorage.setItem('gem-studio-intro-touch','1');"
            "if(!localStorage.getItem('t-set')){localStorage.setItem('t-set','1');"
            "localStorage.setItem('gem-basket',JSON.stringify([{sku:'goi',qty:1},{sku:'biaso',qty:1}]))}")
    st = await page(browser, db, 1440, 900, init)
    await st.goto(f'{BASE}/studio.html')
    await st.wait_for_timeout(2500)
    await st.add_style_tag(content='.lang-hint{display:none!important}')
    cargo = "[...document.querySelector('.st-cargo').querySelectorAll('img')].map(i => [i.className, i.getAttribute('src')])"
    pile = "[...document.querySelectorAll('.gb-pile-item img')].map(i => [i.className, i.getAttribute('src')])"
    stored = "JSON.parse(localStorage.getItem('gem-basket')).find(i => i.sku === 'oxford')"
    want = [['is-cut', cushion], ['is-photo', photo]]
    got = await st.evaluate(cargo)
    check(got == want, f'a product with no cut-out of its own rides as its Studio piece; one with none anywhere keeps its photo ({got})')
    check(await st.evaluate(pile) == want, 'the basket widget shows the same pictures')

    # the yellow shirt dragged into the cart: that shirt, not the first "oxford" piece
    await drag(st, await center(st, '.st-shelf-prod[src$="ao-vang.webp"]'), await center(st, '.st-fr:not([hidden])'))
    await st.wait_for_timeout(1300)
    got = await st.evaluate(cargo)
    check(await st.evaluate('window.GemBasket.count()') == 3 and got[-1] == ['is-cut', yellow], f'the piece dragged into the cart is the one that rides in it ({got[-1:]})')
    # the green one tapped, then "Thêm vào giỏ" on its card
    await st.mouse.click(*(await center(st, '.st-shelf-prod[src$="ao-xanh.webp"]')))
    await st.wait_for_timeout(600)
    await js_click(st, '#st-sheet-body [data-add="oxford"]')
    await st.wait_for_timeout(1300)
    await st.keyboard.press('Escape')
    await st.wait_for_timeout(300)
    got = await st.evaluate(cargo)
    line = await st.evaluate(stored)
    check(got[-2:] == [['is-cut', yellow], ['is-cut', green]], f'tap a piece, add from its card: that piece too ({got[-2:]})')
    check(line == {'sku': 'oxford', 'qty': 2, 'pics': [yellow, green]}, f'one basket line, a picture per piece picked ({line})')
    await st.screenshot(path=OUT / 'cart-pieces.png')

    # it is the same basket on every page, and after a reload
    await st.reload()
    await st.wait_for_timeout(2500)
    check((await st.evaluate(cargo))[-2:] == [['is-cut', yellow], ['is-cut', green]], 'after a reload the cart still shows the pieces picked')
    await st.evaluate('window.GemBasket.open()')
    await st.wait_for_timeout(400)
    row = await st.evaluate("document.querySelector('.gb-row[data-key=\"oxford\"] .gb-row-sprite img').getAttribute('src')")
    check(row == yellow, f'the basket row shows the first piece picked ({row[-14:]})')
    await js_click(st, '.gb-row[data-key="oxford"] [data-act="minus"]')
    await st.wait_for_timeout(300)
    line = await st.evaluate(stored)
    check(line == {'sku': 'oxford', 'qty': 1, 'pics': [yellow]}, f'one taken out: its picture goes with it ({line})')
    await st.keyboard.press('Escape')
    other = await page(browser, db, 1440, 900)
    await other.goto(f'{BASE}/san-pham.html')
    await other.evaluate("""([y]) => localStorage.setItem('gem-basket', JSON.stringify([{sku: 'oxford', qty: 1, pics: [y]}]))""", [yellow])
    await other.reload()
    await other.wait_for_timeout(1200)
    got = await other.evaluate(pile)
    check(got == [['is-cut', yellow]], f'products page: the basket shows the piece picked in the Studio ({got})')
    await other.context.close()

    # a picture address that is not ours (storage can be tampered with) is dropped
    await st.evaluate("""() => localStorage.setItem('gem-basket', JSON.stringify([{sku: 'oxford', qty: 2,
      pics: ['https://evil.example/x.png', 'images/studio/../../x.png']}]))""")
    await st.reload()
    await st.wait_for_timeout(2500)
    got = await st.evaluate(cargo)
    check(got == [['is-cut', green]] * 2, f'a picture that is not one of ours is dropped: the product\'s Studio piece instead ({got})')
    check(not await st.evaluate("!!document.querySelector('img[src*=\"evil\"], img[src*=\"..\"]')"), 'and it reaches no <img>')
    check(not st.errors, f'no script errors {st.errors}')
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
    await ctx.add_init_script("sessionStorage.setItem('gem-scene','in');localStorage.setItem('gem-studio-intro','1');localStorage.setItem('gem-studio-intro-touch','1')")
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


async def taps(browser, db):
    """Taps near "Khu vực" pieces, which stand on the floor inside see-through
    sheets like the owner's uploads. The rule: a tap on a piece's picture walks
    there, its tag opens it. What went wrong on phones: a tap on the character
    standing at a piece did nothing; a tap in front of / behind it, or on the
    piece next to it, opened a piece; a piece's tag took no taps (most had
    none); a double tap opened a sheet and closed it at once; then the guard
    against that ate a quick tap on the sheet's ✕; a tag sat on the character."""
    print('taps')
    from PIL import Image
    db.rows.clear(); db.info.clear()
    bucket = 'https://dxdovvqsfjeizsoprrfn.supabase.co/storage/v1/object/public/gem-media/'

    def upload(name, im):
        buf = io.BytesIO()
        im.save(buf, 'WEBP', quality=85)
        db.files[name] = ('image/webp', buf.getvalue())
        return bucket + name

    def sheet(name, prop, item, fh, floor):
        # an upload like the owner's: 1280 px wide, the painted furniture in the
        # middle of the sheet, standing on the floor (fh its height, floor its foot)
        x, y, w, h = item
        pic = Image.open(ROOT / 'images/studio/props' / prop).convert('RGBA')
        s = 1280 / w
        fw = fh * pic.width / pic.height
        im = Image.new('RGBA', (1280, round(1280 * h / w)), (0, 0, 0, 0))
        im.alpha_composite(pic.resize((round(fw * s), round(fh * s))), (round((w - fw) / 2 * s), round((floor - fh - (y - h / 2)) * s)))
        return upload(name, im)

    sofa = sheet('t-sofa.webp', 'sofa.webp', (1250, 739, 1006, 711), 337, 922)            # furniture x 815-1685, y 585-922
    fit = sheet('t-fit.webp', 'thu-do-day.webp', (2428, 666, 1067, 754), 550, 865)
    table = sheet('t-table.webp', 'ban-may-day.webp', (4637, 518, 1285, 909), 736, 898)   # x 4271-5003
    rug = upload('t-rug.webp', Image.new('RGBA', (420, 200), (184, 153, 104, 255)))       # solid: x 3190-3610, y 750-950
    dot = upload('t-dot.webp', Image.new('RGBA', (60, 60), (135, 150, 90, 255)))          # a small solid product
    piece = lambda src, x, y, w, h, **kw: dict(src=src, x=x, y=y, w=w, h=h, rot=0, flip=False, layer='back', frame=False, **kw)
    layout = {
        'v': 1, 'bg': {'src': 'images/studio/bg/strip-tron.webp', 'w': 5792, 'h': 1024},
        'items': [
            piece('images/studio/props/cua-di.webp', 376, 432, 537, 760, kind='zone', zone={'act': 'door'}),
            piece(sofa, 1250, 739, 1006, 711, kind='zone', zone={'act': 'sofa'}),
            piece(fit, 2428, 666, 1067, 754, kind='zone', zone={'act': 'fitting', 'vi': 'Góc thử đồ'}),
            piece(dot, 2000, 330, 60, 60, sku='origami'),
            piece(dot, 1300, 700, 50, 50, sku='oxford'),   # a small product hung on the sofa piece
            piece(rug, 3400, 850, 420, 200, kind='zone', zone={'act': 'rail'}),
            piece('images/studio/props/cua-so-4.webp', 4900, 338, 932, 380, kind='zone', zone={'act': 'tu'}),
            piece(table, 4637, 518, 1285, 909, kind='zone', zone={'act': 'sewing'}),
        ],
        # the live layout's slip: a built-in box moved, its stop point left far away
        'hot': {'cabinet': {'box': [3200, 456, 3900, 623], 'stand': 5600}},
        'spots': {k: {'off': True} for k in ('door', 'sofa', 'rail', 'fitting', 'pegboard', 'display', 'sewing', 'tu', 'counter', 'memo')},
        'udon': {'x': 5500, 'y': 560, 'w': 128, 'h': 140}, 'start': 363,
    }
    INSIDE = "sessionStorage.setItem('gem-scene','in');localStorage.setItem('gem-studio-intro','1');localStorage.setItem('gem-studio-intro-touch','1');localStorage.setItem('gem-motion','off');"
    OPEN = """(() => { const m = document.getElementById('st-modal'); if (m.hidden) return null;
      const b = document.getElementById('st-sheet-body'), h = b.querySelector('#st-sheet-title');
      return h ? h.getAttribute('data-i18n') : b.querySelector('.st-prod') ? 'product' : 'sheet'; })()"""
    X = "parseFloat(document.querySelector('.st-player').style.left) / (document.getElementById('st-world').getBoundingClientRect().height / 1024)"
    AT = """(p) => { const s = document.getElementById('st-stage').getBoundingClientRect(), w = document.getElementById('st-world').getBoundingClientRect(), k = w.height / 1024;
      return [w.left + p[0] * k, s.top + p[1] * k]; }"""
    TAG = """(name) => { const l = [...document.querySelectorAll('.st-zone-label')].find(e => e.textContent === name); if (!l) return null;
      const r = l.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, here: l.classList.contains('is-here'),
        nod: l.classList.contains('is-nudge'), left: parseFloat(l.style.left) * 57.92, top: parseFloat(l.style.top) * 10.24, pe: getComputedStyle(l).pointerEvents }; }"""
    RINGS = "document.querySelectorAll('.st-tap').length"

    async def fresh(start, w=390, h=844, init=INSIDE):
        db.rows['live'] = dict(layout, start=start)
        pg = await page(browser, db, w, h, init)
        await pg.goto(f'{BASE}/studio.html')
        await pg.wait_for_timeout(2500)
        await pg.add_style_tag(content='.lang-hint{display:none!important}')
        return pg

    async def tap(pg, x, y, strip=True):
        if strip:
            x, y = await pg.evaluate(AT, [x, y])
        if pg.viewport_size['width'] < 768:
            await pg.touchscreen.tap(x, y)
        else:
            await pg.mouse.click(x, y)
        await pg.wait_for_timeout(120)

    async def close(pg):
        await pg.keyboard.press('Escape')
        await pg.wait_for_timeout(400)

    async def swipe(pg, dx, steps=12):
        # a finger dragged across the stage (touch events, so touch pointers)
        cdp = await pg.context.new_cdp_session(pg)
        x, y = await pg.evaluate("(() => { const r = document.getElementById('st-stage').getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height * 0.85]; })()")
        pt = lambda i: [{'x': x + dx * i / steps, 'y': y, 'id': 1}]
        await cdp.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': pt(0)})
        for i in range(1, steps + 1):
            await pg.wait_for_timeout(30)
            await cdp.send('Input.dispatchTouchEvent', {'type': 'touchMove', 'touchPoints': pt(i)})
        await cdp.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []})
        await cdp.detach()

    # every frame from now: is the tag lit (G/w), is the character moving (m/s)
    REC = """(name) => { const l = [...document.querySelectorAll('.st-zone-label')].find(e => e.textContent === name), p = document.querySelector('.st-player');
      window.__rec = []; window.__on = true;
      (function f() { if (!window.__on) return; window.__rec.push((l && l.classList.contains('is-here') ? 'G' : 'w') + (p.classList.contains('is-moving') ? 'm' : 's')); requestAnimationFrame(f); })(); }"""
    STOP = "(() => { window.__on = false; return window.__rec; })()"

    def runs(rec):
        out = []
        for f in rec:
            if out and out[-1][0] == f: out[-1][1] += 1
            else: out.append([f, 1])
        return ' '.join(f'{f}{n}' for f, n in out)

    # A. where the scene starts is not "visited": the door opens with one tap;
    #    every piece has a tag on top of its picture, and the tags take taps
    pg = await fresh(363)
    tags = await pg.evaluate("[...document.querySelectorAll('.st-zone-label')].map(e => e.textContent)")
    want = ['Chọn nhân vật', 'Góc nghỉ chân', 'Góc thử đồ', 'Đồ 2hand', 'Tủ sưu tầm', 'Bàn thiết kế']
    check(sorted(tags) == sorted(want), f'every "Khu vực" has a tag, named after what it does when the owner gave none ({tags})')
    t = await pg.evaluate(TAG, 'Góc nghỉ chân') or {'left': 0, 'top': 0, 'pe': None}
    check(abs(t['left'] - 1250) < 6 and abs(t['top'] - 585) < 6 and t['pe'] == 'auto',
          f'the tag sits on top of the picture, not of its see-through sheet, and takes taps (x {t["left"]:.0f}, y {t["top"]:.0f}, sheet top 384)')
    x0 = await pg.evaluate(X)
    await tap(pg, 520, 300)
    t = await pg.evaluate(TAG, 'Chọn nhân vật') or {}
    check(await pg.evaluate(OPEN) is None and abs(await pg.evaluate(X) - 520) < 8 and t.get('nod'),
          f'a tap on a piece\'s picture walks there, no sheet; its tag nods ({x0:.0f} → {await pg.evaluate(X):.0f})')
    await tap(pg, t.get('x', 0), t.get('y', 0), strip=False)
    first = await pg.evaluate(OPEN)
    await tap(pg, t.get('x', 0), t.get('y', 0), strip=False)   # a double tap on the tag: the second lands on the backdrop
    await pg.wait_for_timeout(500)
    check(first == 'studio.door_h', 'its tag opens it')
    check(await pg.evaluate(OPEN) == 'studio.door_h', 'a double tap keeps the sheet it opened')
    await close(pg)
    await tap(pg, t.get('x', 0), t.get('y', 0), strip=False)
    await pg.wait_for_timeout(150)
    xb = await pg.evaluate("(() => { const r = document.querySelector('.st-close').getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; })()")
    await tap(pg, *xb, strip=False)
    await pg.wait_for_timeout(300)
    check(await pg.evaluate(OPEN) is None, 'the sheet\'s ✕ closes it at once, even right after it opened')
    await pg.evaluate("""() => { const s = document.getElementById('st-stage'), r = s.getBoundingClientRect();
      s.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerType: 'touch', clientX: r.left + 30, clientY: r.top + 30 })); }""")
    menu = await pg.evaluate("document.getElementById('st-stage').dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }))")
    check(menu is False, 'a long press brings up no "save image" menu')
    check(not pg.errors, f'no script errors {pg.errors}')
    await pg.context.close()

    # B. at a piece: a tap in front of the character walks, a tap on the
    #    character is never dead, the tag opens it again
    pg = await fresh(720)
    await tap(pg, 980, 680)
    x = await pg.evaluate(X)
    check(await pg.evaluate(OPEN) is None and abs(x - 980) < 8, f'a tap on a piece from afar walks to where it was tapped, no sheet (x {x:.0f})')
    check((await pg.evaluate(TAG, 'Góc nghỉ chân') or {}).get('here'), 'standing at the piece, its tag lights up')
    fr = await pg.evaluate("(() => { const r = document.querySelector('.st-fr:not([hidden]) img').getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height * 0.3]; })()")
    await tap(pg, *fr, strip=False)
    rings = await pg.evaluate(RINGS)
    check(await pg.evaluate(OPEN) is None and rings > 0, f'a tap on the character there: no sheet, a ring shows it was felt (rings {rings})')
    await pg.wait_for_timeout(500)
    x0 = await pg.evaluate(X)
    await tap(pg, x0 + 130, 690)
    x1 = await pg.evaluate(X)
    t = await pg.evaluate(TAG, 'Góc nghỉ chân') or {}
    check(await pg.evaluate(OPEN) is None and abs(x1 - x0 - 130) < 8, f'a tap on the piece in front of the character walks, no sheet ({x0:.0f} → {x1:.0f})')
    check(t.get('nod'), 'and the tag nods: that is how it opens again')
    await pg.screenshot(path=OUT / 'taps-here.png')
    await close(pg)
    if t:
        await tap(pg, t['x'], t['y'], strip=False)
    check(await pg.evaluate(OPEN) == 'studio.sofa_h', 'a tap on the lit tag opens the piece again')
    await close(pg)
    check(not pg.errors, f'no script errors {pg.errors}')
    await pg.context.close()

    # B2. a tag changes only when the character comes to rest, so it never
    #     flickers: walking into a piece lights it once, after the character
    #     stops; a swipe or a walk within the piece keeps it lit in every frame
    #     (a swipe used to turn it white, the fling lit it again)
    pg = await fresh(720, init=INSIDE.replace("'gem-motion','off'", "'gem-motion','on'"))
    await pg.evaluate(REC, 'Góc nghỉ chân')
    await tap(pg, 980, 680)
    await pg.wait_for_timeout(1600)
    rec = await pg.evaluate(STOP)
    flips = sum(1 for a, b in zip(rec, rec[1:]) if a[0] != b[0])
    check('wm' in rec and 'Gm' not in rec and rec[-1] == 'Gs' and flips == 1,
          f'walking into a piece: its tag lights once, after the character stops ({runs(rec)})')
    for what, act in (('a swipe', lambda: swipe(pg, -60)), ('a walk', lambda: tap(pg, x0 - 120, 800))):   # back, away from the product on it
        x0 = await pg.evaluate(X)
        await pg.evaluate(REC, 'Góc nghỉ chân')
        await act()
        await pg.wait_for_timeout(1600)
        rec = await pg.evaluate(STOP)
        x1 = await pg.evaluate(X)
        check(abs(x1 - x0) > 40 and 'Gm' in rec and all(f[0] == 'G' for f in rec) and await pg.evaluate(OPEN) is None,
              f'{what} within the piece: its tag stays lit in every frame ({x0:.0f} → {x1:.0f}; {runs(rec)})')
    check(not pg.errors, f'no script errors {pg.errors}')
    await pg.context.close()

    # C. the floor walks, even on a piece; the same piece above the floor opens;
    #    a stop point left far off its box is ignored
    for where, y in (('on the floor', 905), ('above the floor', 790)):
        pg = await fresh(3080)
        await tap(pg, 3260, y)
        x = await pg.evaluate(X)
        check(await pg.evaluate(OPEN) is None and abs(x - 3260) < 8, f'a tap on a piece {where} walks (x {x:.0f})')
        await pg.context.close()
    pg = await fresh(3080)
    await tap(pg, 3300, 540)
    check(await pg.evaluate(OPEN) is None, 'a tap in a tap box walks too')
    lab = await center(pg, '.st-hot[data-hot="cabinet"] .st-hot-label')
    await tap(pg, *lab, strip=False)
    x = await pg.evaluate(X)
    check(await pg.evaluate(OPEN) == 'studio.shop_h' and abs(x - 3550) < 12, f'its tag opens it; a stop point left far off the box: the character stops at its middle (x {x:.0f}, stop 5600)')
    await pg.context.close()

    # D. two places one above the other: standing at the design table, the
    #    window over it ("Tủ") walks too, and its tag opens it
    pg = await fresh(4400)
    await tap(pg, 4600, 600)
    t = await pg.evaluate(TAG, 'Bàn thiết kế') or {}
    check(await pg.evaluate(OPEN) is None and t.get('here'), 'a tap on the design table walks there; its tag lights up')
    await tap(pg, 4650, 330)
    w = await pg.evaluate(TAG, 'Tủ sưu tầm') or {}
    check(await pg.evaluate(OPEN) is None and w.get('here'), 'standing at the table, a tap on the window above walks; its tag is lit')
    await close(pg)
    if w:
        await tap(pg, w['x'], w['y'], strip=False)
    check(await pg.evaluate(OPEN) == 'studio.tu_h', 'and the tag opens "Tủ của bạn"')
    await close(pg)
    await pg.context.close()

    # E. a small product forgives a finger, not a mouse: on the wall, and on
    #    a "Khu vực" piece it hangs on (the piece behind would take the tap)
    for view, w, h in (('phone', 390, 844), ('desktop', 1440, 900)):
        for start, sku, behind in ((2000, 'origami', False), (1500, 'oxford', True)):
            pg = await fresh(start, w, h)
            r = await pg.evaluate("s => { const r = document.querySelector('.st-shelf-prod[data-sku=\"' + s + '\"]').getBoundingClientRect(); return [r.left, r.top + r.height / 2]; }", sku)
            await tap(pg, r[0] - 8, r[1], strip=False)
            await pg.wait_for_timeout(300)
            got = await pg.evaluate(OPEN)
            on = 'on a "Khu vực" piece' if behind else 'on the wall'
            if view == 'phone':
                # touch: the first tap names it (no hover to show it can be tapped), its tag opens it
                tag = await pg.evaluate("""() => { const l = document.querySelector('.st-pick-label'); if (!l || l.hidden) return null;
                  const r = l.getBoundingClientRect(); return { name: l.textContent, x: r.left + r.width / 2, y: r.top + r.height / 2 }; }""")
                check(got is None and tag and tag['name'], f'phone: a tap 8 px off a small product {on} names it, opens nothing ({got}, {tag and tag["name"]})')
                await pg.wait_for_timeout(1500)   # let the walk end: the tag moves with the world
                tag = await pg.evaluate("""() => { const r = document.querySelector('.st-pick-label').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }""")
                await tap(pg, tag['x'], tag['y'], strip=False)
                await pg.wait_for_timeout(300)
                check(await pg.evaluate(OPEN) == 'product', f'phone: its name tag opens it')
            else:
                check(got is None, f'{view}: a tap 8 px off a small product {on} is not on it ({got})')
            await pg.context.close()

    # E2. touch: a second tap on the thing itself opens it too; a tap anywhere else lets the name go
    PICK = "(() => { const l = document.querySelector('.st-pick-label'); return l && !l.hidden ? l.textContent : null; })()"
    PROD = "s => { const r = document.querySelector('.st-shelf-prod[data-sku=\"' + s + '\"]').getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }"
    pg = await fresh(2000)
    await tap(pg, *(await pg.evaluate(PROD, 'origami')), strip=False)
    await pg.wait_for_timeout(1500)
    check(await pg.evaluate(OPEN) is None and await pg.evaluate(PICK) == 'Origami Pouch', 'phone: first tap on a product names it')
    await pg.screenshot(path=OUT / 'taps-named.png')
    await tap(pg, 2150, 960)
    check(await pg.evaluate(PICK) is None, 'phone: a tap elsewhere lets the name go (and walks)')
    await pg.wait_for_timeout(1500)
    await tap(pg, *(await pg.evaluate(PROD, 'origami')), strip=False)
    await pg.wait_for_timeout(1500)
    await tap(pg, *(await pg.evaluate(PROD, 'origami')), strip=False)
    await pg.wait_for_timeout(400)
    check(await pg.evaluate(OPEN) == 'product' and await pg.evaluate(PICK) is None, 'phone: a second tap on the product opens it')
    check(not pg.errors, f'no script errors {pg.errors}')
    await pg.context.close()
    pg = await fresh(2000, 1440, 900)
    await tap(pg, *(await pg.evaluate(PROD, 'origami')), strip=False)
    await pg.wait_for_timeout(400)
    check(await pg.evaluate(OPEN) == 'product', 'desktop: one click on a product opens it, as before')
    await pg.context.close()

    # E3. the one-time hint on a phone tells the two-tap rule
    pg = await fresh(2000, init="sessionStorage.setItem('gem-scene','in');localStorage.setItem('gem-studio-intro','1');localStorage.setItem('gem-motion','off');")
    txt = await pg.evaluate("(() => { const b = document.getElementById('st-bubble'); return b && !b.hidden ? b.textContent : null; })()")
    check(txt and 'chạm lần nữa' in txt, f'phone: the hint shows once, even to a visitor who saw the old one ({txt})')
    await pg.context.close()

    # F. the street door always opens, even with the character brought to rest in front of it
    pg = await fresh(363, init="localStorage.setItem('gem-studio-out','1');localStorage.setItem('gem-motion','off');")
    await tap(pg, 1540, 930)   # walk a little: now at rest in front of the door
    await tap(pg, 1630, 450)
    await pg.wait_for_timeout(3000)
    check('ngoai' not in (await bg(pg)), 'on the street, a tap on the door goes in even after walking up to it')
    await pg.context.close()

    # G. a tag never sits on the character at rest (the sofa's top is at head
    #    height): it steps aside along the sofa's top. Pushing a cart, after a walk.
    for view, w, h in (('phone', 390, 844), ('desktop', 1440, 900)):
        pg = await fresh(1100, w, h, init=INSIDE + "localStorage.setItem('gem-basket', JSON.stringify([{sku:'goi',qty:1}]));")
        await tap(pg, 1250, 905)   # come to rest right under the tag's own spot (the sofa's middle)
        await pg.wait_for_timeout(300)
        got = await pg.evaluate("""() => {
          const t = [...document.querySelectorAll('.st-zone-label')].find(e => e.textContent === 'Góc nghỉ chân').getBoundingClientRect();
          const img = document.querySelector('.st-fr:not([hidden]) img'), c = img.getBoundingClientRect(), s = document.getElementById('st-stage').getBoundingClientRect();
          // the character's painted pixels under the tag (its picture redrawn as on screen)
          const cv = document.createElement('canvas'), g = cv.getContext('2d');
          cv.width = Math.round(c.width); cv.height = Math.round(c.height);
          if (getComputedStyle(document.querySelector('.st-player')).transform.startsWith('matrix(-1')) { g.translate(cv.width, 0); g.scale(-1, 1); }
          g.drawImage(img, 0, 0, cv.width, cv.height);
          const x0 = Math.max(0, Math.floor(t.left - c.left)), x1 = Math.min(cv.width, Math.ceil(t.right - c.left));
          const y0 = Math.max(0, Math.floor(t.top - c.top)), y1 = Math.min(cv.height, Math.ceil(t.bottom - c.top));
          let under = 0;
          if (x1 > x0 && y1 > y0) { const d = g.getImageData(x0, y0, x1 - x0, y1 - y0).data; for (let i = 3; i < d.length; i += 4) if (d[i] > 40) under++; }
          return { under, cart: c.width / c.height > 0.6, onScreen: t.left >= s.left && t.right <= s.right,
                   dy: Math.round(t.top + t.height * 0.6 - (s.top + 585 * s.height / 1024)) };
        }""")
        check(got['cart'] and got['under'] < 5 and got['onScreen'] and abs(got['dy']) < 4,
              f'{view}: at rest under it, the sofa\'s tag steps aside along the sofa\'s top, off the character ({got})')
        await pg.screenshot(path=OUT / f'taps-tag-{view}.png')
        await pg.context.close()

    # H. desktop: what lights up under the mouse is what a click opens
    pg = await fresh(720, 1440, 900)
    door_px = await pg.evaluate(AT, [376, 300])
    lit = "(s) => { const e = document.querySelector(s); return [e.classList.contains('is-over'), getComputedStyle(e).cursor]; }"
    await pg.mouse.move(*door_px)
    await pg.wait_for_timeout(150)
    b = await pg.evaluate(lit, '.st-thing[src$="cua-di.webp"]')
    t = await pg.evaluate(TAG, 'Chọn nhân vật') or {}
    lit_tag = await pg.evaluate("[...document.querySelectorAll('.st-zone-label')].find(e => e.textContent === 'Chọn nhân vật').classList.contains('is-hover')")
    wall = await pg.evaluate("getComputedStyle(document.getElementById('st-world')).cursor")
    await pg.mouse.move(t.get('x', 0), t.get('y', 0))
    await pg.wait_for_timeout(150)
    hand = await pg.evaluate("getComputedStyle([...document.querySelectorAll('.st-zone-label')].find(e => e.textContent === 'Chọn nhân vật')).cursor")
    check(b == [False, 'default'] and lit_tag and wall == 'default' and hand == 'pointer',
          f'desktop: the mouse over a piece lights its tag, not the piece (a click walks); the hand only on the tag (piece {b}, tag lit {lit_tag}, wall {wall}, tag {hand})')
    await pg.context.close()

    # I. the basket panel: the second tap of a double tap does not close it
    pg = await fresh(720)
    shut = """async () => {
      const open = () => document.querySelector('.gb-panel').classList.contains('open');
      const at = (el, x, y) => el.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1, clientX: x, clientY: y }));
      document.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: 30, clientY: 40 }));   // the tap that opens it
      window.GemBasket.open();
      at(document.querySelector('.gb-overlay'), 32, 41);   // its second tap, right there
      const kept = open();
      const x = document.querySelector('.gb-close').getBoundingClientRect();
      at(document.querySelector('.gb-close'), x.left + 5, x.top + 5);   // the ✕ at once
      const shut = !open();
      document.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: 30, clientY: 40 }));
      window.GemBasket.open();
      await new Promise(r => setTimeout(r, 500));
      at(document.querySelector('.gb-overlay'), 32, 41);   // the same spot a moment later
      return [kept, shut, !open()];
    }"""
    got = await pg.evaluate(shut)
    check(got == [True, True, True], f'the basket panel: a double tap keeps it, its ✕ closes it at once, the overlay later ({got})')
    check(not pg.errors, f'no script errors {pg.errors}')
    await pg.context.close()


async def main(which):
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')   # a Windows console's code page has no Vietnamese
    OUT.mkdir(exist_ok=True)
    srv = serve()
    db = FakeDB()
    async with async_playwright() as p:
        browser = await launch(p)
        for name, fn in (('street', street), ('wear', wear), ('shop', shop), ('spots', spots), ('editor', editor),
                         ('library', library), ('product', product), ('workshop', workshop), ('design', design), ('catalog', catalog), ('kinds', kinds),
                         ('layers', layers), ('zones', zones), ('cart', cart), ('topbar', topbar), ('motion', motion),
                         ('taps', taps)):
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
