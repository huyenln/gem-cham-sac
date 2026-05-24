# Gem Chạm Sắc — Website Project

## Project at a glance

Static website (5 trang) cho cửa hàng **Gem Chạm Sắc** — pop-up store sustainability/handmade upcycling tại Hà Nội. Live tại `https://gemchamsac.com` (host on GitHub Pages, repo `huyenln/gem-cham-sac`).

**Tagline:** Chạm Xanh · Gửi Sắc
**Stack:** HTML + CSS + tiny vanilla JS. KHÔNG framework, KHÔNG build step.
**Hosting:** GitHub Pages, deploy on push to `main`.

---

## Architecture

```
/
├── index.html                Trang chủ
├── cau-chuyen.html           Câu chuyện (mission/vision/values/commitments)
├── mo-hinh.html              Mô hình (process + roadmap 4 seasons)
├── san-pham.html             Sản phẩm (4 categories + dịch vụ đặc biệt)
├── ghe-tham.html             Ghé thăm (địa chỉ + map + email signup)
├── 404.html                  Fallback page (Udon lạc đường)
├── CNAME                     gemchamsac.com (cho GitHub Pages custom domain)
├── css/style.css             Single CSS file, ~700 lines, design tokens ở đầu
├── js/main.js                Tiny — chỉ mobile menu toggle
├── images/
│   ├── logo/                 Logo Gem variants
│   ├── mascot/               6 pose Udon (PNG transparent)
│   └── products/             Product photos (full + thumb)
├── docs/
│   ├── brand.md              Brand identity reference đầy đủ
│   └── tasks.md              Pending tasks chi tiết với options
└── README.md                 Deploy guide cho Anna
```

**Naming conventions:**
- Files: lowercase kebab-case (`cau-chuyen.html`, `vai-vun-tui-deo-cheo.jpg`)
- Product image categories: `vai-vun-`, `vpp-`, `2hand-`, `gom-`, `tr-` (trang trí)
- Thumbnails: `<name>-thumb.jpg` (600x600 square crop)
- Full images: `<name>.jpg` (max 1600px long side, quality 85)

---

## Brand identity (đã LOCK, không thay đổi)

**Read `docs/brand.md` for full details.** Quick reference:

- **Colors** (CSS variables ở đầu `css/style.css`):
  - `--sage-deep: #87965A` (primary)
  - `--sage-light: #C3C3A5`
  - `--paper-cream: #F0E1D2` (background)
  - `--kraft: #B89968` (accent)
  - `--ink-dark: #3D4A2E` (text dark)
- **Fonts:**
  - Heading: Nunito 700-800
  - Body: Be Vietnam Pro 400-500
  - Handwriting: Dancing Script (đang migrate từ Caveat — xem Task 1)
- **Voice tone:**
  - Xưng "chúng mình" (KHÔNG "chúng tôi")
  - Câu ngắn, line break theo nhịp đọc
  - Vintage handmade slow living — KHÔNG kawaii pop, KHÔNG corporate
  - KHÔNG slogan rỗng, KHÔNG superlatives ("tốt nhất", "số 1")
- **Mascot Udon:**
  - Chó tam thể marker-style đen đậm
  - 6 pose có sẵn: `udon_sit_stare`, `udon_sit_happy`, `udon_lying_smile`, `udon_lying_flat`, `udon_standing`, `udon_portrait`
  - Dùng tiết chế ở section thân thiện (hero, email signup, 404, empty state). KHÔNG dùng ở section serious.

---

## Decisions đã chốt (ĐỪNG hỏi lại)

**Scope & content:**
- 5 pages only. Không tạo thêm trang mới trừ khi user yêu cầu rõ.
- KHÔNG hiện giá sản phẩm trên web. "Ghé cửa hàng" để biết giá.
- Email signup placeholder: Mailerlite. Form HTML hiện là demo (alert popup), user sẽ paste embed code thật sau.
- KHÔNG có e-commerce, KHÔNG có cart, KHÔNG có user account.

**Products (4 categories hiện tại + 1 sẽ thêm):**
1. Phụ kiện vải vụn (10 items có ảnh)
2. Văn phòng phẩm bền vững (1 item có ảnh)
3. Quần áo 2hand (empty state với Udon)
4. Gốm sứ Nhật (empty state với Udon)
5. **Đồ trang trí và lưu niệm khác** (sẽ thêm — Task 8)

**Loại trừ:**
- Generic pens (bút bi nhập), sticky notes, tiger cartoon bookmarks — **KHÔNG đăng lên web** dù có bán tại cửa hàng. Lý do: clash với brand vintage/sustainable.

**Season hiện tại:**
- Season 01 — Pop-up Experience Store, kéo dài 5 tháng đến ~tháng 10/2026.
- 4 seasons total: 01 Pop-up, 02 A Space To Stay, 03 Circular Creative Community, 04 Social Enterprise & Learning Space.

**Tech:**
- Deploy: push lên `main` → GitHub Pages auto-deploy ~30s.
- HTTPS đã enforce qua Let's Encrypt.
- KHÔNG add npm/build tools. KHÔNG convert sang React/Vue/Next.
- KHÔNG move CSS sang Tailwind. Plain CSS với CSS variables là intentional.
- KHÔNG dùng JavaScript framework. Vanilla JS chỉ khi cần (mobile menu, smooth scroll).

---

## Code conventions

**HTML:**
- Vietnamese trong content, English trong code comments
- Semantic tags (`<section>`, `<article>`, `<nav>`, `<header>`, `<footer>`)
- Class names kebab-case: `.product-card`, `.season-banner`
- ARIA labels cho buttons/forms
- `loading="lazy"` cho ảnh không nằm trong viewport đầu tiên

**CSS:**
- 1 file `css/style.css`, organized với section comments (`/* HERO */`, `/* FOOTER */`)
- Design tokens ở `:root` đầu file
- Mobile-first: base styles cho mobile, `@media (min-width: 768px)` cho desktop
- KHÔNG inline style trong HTML trừ khi 1-time edge case
- KHÔNG `!important` trừ khi override third-party (Mailerlite embed)

**Tone of voice trong copy:**
- Đúng: "Để chúng mình báo bạn khi có workshop mới."
- Sai: "Chúng tôi sẽ thông báo các sự kiện đặc biệt đến quý khách."
- Đúng: "Mỗi sản phẩm độc bản — không cái nào giống cái nào."
- Sai: "Sản phẩm cao cấp số 1 thị trường."

---

## Anti-patterns (ĐỪNG LÀM)

1. ❌ **KHÔNG add framework/build step.** Project intentionally simple.
2. ❌ **KHÔNG add cookies/tracking/analytics** trừ khi user yêu cầu rõ. Privacy-first.
3. ❌ **KHÔNG inline images dạng base64.** Dùng file paths.
4. ❌ **KHÔNG dùng emoji trong UI** trừ khi user yêu cầu. Brand minimalist.
5. ❌ **KHÔNG over-animate.** Subtle fade/slide OK, parallax/scroll-jack KHÔNG OK.
6. ❌ **KHÔNG generate placeholder Lorem Ipsum.** Nếu thiếu content thật, hỏi user.
7. ❌ **KHÔNG đổi color palette / fonts** trừ khi task yêu cầu rõ.
8. ❌ **KHÔNG xóa CNAME file.** GitHub Pages cần để serve custom domain.

---

## Workflow recommended

Khi nhận task:
1. Đọc `docs/tasks.md` xem task có chi tiết không
2. Nếu task không rõ, ask user clarification trước khi code
3. **Đọc file liên quan trước khi edit** (đừng đoán)
4. Edit → preview local bằng `python3 -m http.server 8000` → test trên browser
5. Commit message dạng `<scope>: <action>` (vd: `style: replace Caveat with Dancing Script`)
6. Push → đợi 30s → verify trên `gemchamsac.com`

Local dev server:
```bash
cd ~/path/to/gem-cham-sac
python3 -m http.server 8000
# Mở http://localhost:8000
```

---

## Self-verification workflow

For any change affecting visual output (CSS, HTML layout, components),
verify BEFORE committing by taking screenshots locally. This reduces
back-and-forth with the user significantly.

### Required setup (should already be done)

```bash
pip install playwright --break-system-packages
playwright install chromium
```

### Standard verification script

For visual changes, create and run /tmp/verify.py:

```python
import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()

        # Standard viewports to test
        viewports = [
            ('mobile', 375, 844),
            ('tablet', 768, 1024),
            ('desktop', 1440, 900),
            ('desktop_wide', 1920, 1080),
        ]

        # Pages to test (change based on what you edited)
        urls = [
            'http://localhost:8000/san-pham.html',
            # Add more pages affected by your change
        ]

        for url in urls:
            page_name = url.split('/')[-1].replace('.html', '')
            for vp_name, w, h in viewports:
                context = await browser.new_context(
                    viewport={'width': w, 'height': h},
                    device_scale_factor=1,
                    is_mobile=(w < 768)
                )
                page = await context.new_page()
                await page.goto(url, wait_until='networkidle')
                await page.wait_for_timeout(800)

                filepath = f'/tmp/verify_{page_name}_{vp_name}.png'
                await page.screenshot(path=filepath, full_page=False)
                print(f"  {filepath}")
                await context.close()

        await browser.close()

asyncio.run(main())
```

### Workflow

1. Start local server in background:
   bash command: `cd /path/to/project && python3 -m http.server 8000 &`

2. Make code changes

3. Run /tmp/verify.py

4. Read each screenshot file with the `view` tool to inspect visually

5. If issues found, fix them — repeat from step 3

6. Only commit after screenshots match intent

7. Kill background server when done: `pkill -f "http.server"`

### When user reports a visual bug

If user shares a screenshot of a bug:

1. First read user's screenshot to understand the issue visually
2. Reproduce the bug by running verify.py on the relevant page
3. Compare your screenshot with user's screenshot — should match
4. Fix the issue
5. Re-run verify.py to confirm fix
6. Only then report back to user with new screenshot proof

### Don't ask user to re-test until self-verified

If you've fixed a bug, do NOT push and say "please test". Instead:
- Run verify.py first
- Compare before/after screenshots yourself
- Say "I've verified at viewports X, Y, Z — here's the result" with
  screenshot evidence
- Then push and let user confirm

This is the most important part. Self-verification means you've done
the testing before bothering the user.

---

## Active tasks

Xem `docs/tasks.md` để chi tiết. Priority order:

1. **🐛 Bug — Font tiếng Việt lỗi trên PC** (Caveat → Dancing Script)
2. **🐛 Bug — Udon ở email signup bị crop**
3. **🐛 Bug — Footer links chưa đúng (IG, FB)**
4. **🐛 Bug — Bỏ "01 —", "02 —" ở page hero**
5. **✨ Feat — Mục lục trang Sản phẩm (TOC)**
6. **✨ Feat — Thêm category "Đồ trang trí và lưu niệm khác"**
7. **✨ Feat — Thêm section "Dịch vụ đặc biệt" + CTA workshop ở homepage**
8. **✨ Feat — Flow điều hướng "Tiếp theo" giữa các pages**
9. **🎨 Polish — Câu chuyện + Mô hình page hấp dẫn hơn** (xem `docs/tasks.md` cho 8 ideas A-H)

---

## Reference docs

- `docs/brand.md` — Brand identity reference đầy đủ (colors, fonts, voice, do/don't)
- `docs/tasks.md` — Detailed task descriptions + options
- `README.md` — Deploy guide for Anna
