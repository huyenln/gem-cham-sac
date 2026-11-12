#!/usr/bin/env python3
"""Still pictures of the street in front of Studio Gem, taken from the real page.

    images/studio/og-studio.jpg             1200 x 630: the picture a shared link
                                            shows (og:image in studio.html)
    images/studio/xem-truoc-mat-tien.webp   720 x 900: the "Studio 2D" section
                                            on the home page

Run by hand when the street changes (new drawings, the layout moved in
"Lắp studio" and published), then commit the two files:

    python3 tools/studio-preview.py

It opens studio.html from a local server and lets the page read the published
layout from Supabase as any visitor does (reads only, so it needs the network),
hides the bars and labels, and takes the two pictures with the character
standing at the door. Facebook and Zalo keep a link's picture for a long time:
after it changes, ask Facebook's Sharing Debugger to "Scrape again".

Needs: pip install playwright pillow. Chromium: PLAYWRIGHT_BROWSERS_PATH or
CHROMIUM=/path/to/chrome (the cloud sessions have /opt/pw-browsers/chromium).
"""
import asyncio
import functools
import http.server
import io
import os
import threading
from pathlib import Path

from PIL import Image
from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parent.parent
PORT = 8766
SHOTS = [
    ('images/studio/og-studio.jpg', 1200, 630),
    ('images/studio/xem-truoc-mat-tien.webp', 720, 900),
]
# No first-visit tips, no litter falling into the picture.
QUIET = ("localStorage.setItem('gem-guide', JSON.stringify({seen: {}, off: true}));"
         "localStorage.setItem('gem-batngo', '0');")
# The street alone: no bars, no labels, no tap boxes.
HIDE = ('.st-top, .st-nav, .st-help-b, .gb-widget, .st-tip, .st-edge, .st-hot-label, .st-bubble, .st-loading'
        ' { display: none !important; }')


class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass


async def shot(browser, w, h):
    ctx = await browser.new_context(viewport={'width': w, 'height': h}, device_scale_factor=1, reduced_motion='reduce')
    await ctx.add_init_script(QUIET)
    page = await ctx.new_page()
    await page.goto(f'http://localhost:{PORT}/studio.html', wait_until='load')
    # the street is up once the published layout came and the first-load class is gone
    await page.wait_for_function("!document.documentElement.classList.contains('st-wait')"
                                 " && document.body.classList.contains('st-is-out')", timeout=20000)
    await page.add_style_tag(content=HIDE)
    await page.evaluate("window.dispatchEvent(new Event('resize'))")
    await page.wait_for_function("[...document.querySelectorAll('#st-world img')].every(i => i.complete && i.naturalWidth)", timeout=20000)
    await page.wait_for_timeout(800)
    png = await page.screenshot()
    await ctx.close()
    return Image.open(io.BytesIO(png)).convert('RGB')


async def main():
    srv = http.server.ThreadingHTTPServer(('localhost', PORT), functools.partial(Quiet, directory=str(ROOT)))
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    async with async_playwright() as p:
        exe = os.environ.get('CHROMIUM') or ('/opt/pw-browsers/chromium' if Path('/opt/pw-browsers/chromium').exists() else None)
        browser = await p.chromium.launch(executable_path=exe) if exe else await p.chromium.launch()
        for path, w, h in SHOTS:
            img = await shot(browser, w, h)
            out = ROOT / path
            if path.endswith('.jpg'):
                img.save(out, 'JPEG', quality=86, optimize=True, progressive=True)
            else:
                img.save(out, 'WEBP', quality=82, method=6)
            print(f'{path}: {img.size[0]} x {img.size[1]}, {out.stat().st_size // 1024} KB')
        await browser.close()
    srv.shutdown()


if __name__ == '__main__':
    asyncio.run(main())
