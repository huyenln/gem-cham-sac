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
  catalog  san-pham.html builds a card for a product only the database knows,
           in its category and order, and the lightbox opens on it

Screenshots go to /tmp/gem-check/ — look at them, a pass only means nothing
crashed and the counts add up.

    python3 tools/check-studio.py            all checks
    python3 tools/check-studio.py wear       one check (street | wear | shop | spots | editor |
                                             library | product | catalog)

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
        self.assets = []
        self.files = {}
        self.patches = []

    async def route(self, r):
        u, m = r.request.url, r.request.method
        if '/rpc/me' in u:
            return await r.fulfill(status=200, content_type='application/json',
                                   body='[{"user_id":"x","role":"owner","display_name":"Anna"}]')
        if '/rest/v1/studio_layout' in u:
            if m == 'POST':
                b = json.loads(r.request.post_data)
                self.rows[b['id']] = b['data']
                return await r.fulfill(status=201, body='')
            i = 'live' if 'id=eq.live' in u else 'draft' if 'id=eq.draft' in u else None
            rows = [{'data': self.rows[i]}] if i in self.rows else []
            return await r.fulfill(status=200, content_type='application/json', body=json.dumps(rows))
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
        await js_click(pg, '[data-se="publish"]')
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

        await js_click(pg, '[data-se="sc-in"]')
        await js_click(pg, '[data-se="clear"]')
        await pg.wait_for_timeout(300)
        check(await pg.evaluate("document.querySelectorAll('.se-item').length") == 0, f'{name}: Xoá hết empties the scene')
        await pg.context.close()


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
    await js_click(pg, '[data-se="publish"]')
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
        db.assets.clear()
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


async def main(which):
    OUT.mkdir(exist_ok=True)
    srv = serve()
    db = FakeDB()
    async with async_playwright() as p:
        browser = await launch(p)
        for name, fn in (('street', street), ('wear', wear), ('shop', shop), ('spots', spots), ('editor', editor),
                         ('library', library), ('product', product), ('catalog', catalog)):
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
