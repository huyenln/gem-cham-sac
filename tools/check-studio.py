#!/usr/bin/env python3
"""Check Studio Gem and the layout editor in a real browser (Playwright).

Starts its own local server, fakes Supabase (no network, nothing written),
and walks through what broke before:

  street   studio.html opens on the facade, the door leads in, the character
           picker leads back out
  wear     try-on accessories stay on the character, on all 4 x 10 frames
  editor   (owner) add a piece, Dài thêm, publish, studio.html shows it, Xoá hết,
           backgrounds offered per scene, the street scene saves too

Screenshots go to /tmp/gem-check/ — look at them, a pass only means nothing
crashed and the counts add up.

    python3 tools/check-studio.py            all checks
    python3 tools/check-studio.py wear       one check (street | wear | editor)

Needs: pip install playwright. Chromium: PLAYWRIGHT_BROWSERS_PATH or
CHROMIUM=/path/to/chrome (the cloud sessions have /opt/pw-browsers/chromium).
"""
import asyncio
import functools
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


class FakeDB:
    """Just enough of Supabase: the owner's profile and studio_layout rows."""

    def __init__(self):
        self.rows = {}

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


async def main(which):
    OUT.mkdir(exist_ok=True)
    srv = serve()
    db = FakeDB()
    async with async_playwright() as p:
        browser = await launch(p)
        for name, fn in (('street', street), ('wear', wear), ('editor', editor)):
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
