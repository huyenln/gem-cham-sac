# Gem Chạm Sắc — Website Project

## Project at a glance

Static website cho cửa hàng **Gem Chạm Sắc** — pop-up store sustainability/handmade upcycling tại Hà Nội. Live tại `https://gemchamsac.com` (host on GitHub Pages, repo `huyenln/gem-cham-sac`).

**Tagline:** Chạm Xanh · Gửi Sắc
**Stack:** HTML + CSS + tiny vanilla JS. KHÔNG framework, KHÔNG build step.
**Ngôn ngữ:** Song ngữ — Tiếng Việt (mặc định) / English, chuyển bằng nút `VI · EN` trên header (xem `js/i18n.js`).
**Hosting:** GitHub Pages, deploy on push to `main`.

---

## Architecture

```
/
├── index.html                Trang chủ
├── cau-chuyen.html           Câu chuyện (mission/vision/values/commitments)
├── mo-hinh.html              Mô hình (process + roadmap 4 seasons)
├── doi-tac.html              Đối tác (logo đối tác + các gói hợp tác) — trang con thứ 3 của "Về Gem"
├── san-pham.html             Sản phẩm (4 categories + dịch vụ đặc biệt)
├── ghe-tham.html             Ghé thăm (địa chỉ + map + email signup)
├── season-02.html            Câu chuyện Season 02 (A Space To Stay + link FB reel)
├── workshop.html             Đặt lịch workshop (đọc từ Supabase)
├── ban-tin.html              Bản tin — bài viết đọc từ Supabase
├── admin.html                Trang quản trị cho Anna + nhân viên (noindex, không có link từ nav); tab Kho vải
├── studio.html               Studio Gem 2D — bản thử, tranh tạm từ ChatGPT (noindex, chưa có trên nav)
├── 404.html                  Fallback page (Udon lạc đường)
├── CNAME                     gemchamsac.com (cho GitHub Pages custom domain)
├── css/style.css             Single CSS file, design tokens ở đầu
├── css/admin.css             Chỉ dùng cho admin.html
├── css/studio.css            Chỉ dùng cho studio.html
├── js/main.js                Mobile menu toggle, product TOC scroll, Udon popup
├── js/i18n.js                Song ngữ VI/EN: engine + STRINGS dictionary (data-i18n)
├── js/gallery.js             Carousel/lightbox ảnh sản phẩm (data-gallery, bắt click cả thẻ tạo sau) + bảng chi tiết kiểu Shopee cho món có lựa chọn (mùi / cỡ / mẫu), ký gửi hoặc ghi chú
├── js/catalog.js             san-pham.html: thẻ sản phẩm theo database (món mới tự có thẻ, đúng danh mục + thứ tự; nhãn "Ký gửi · …")
├── js/img-tools.js           Thu nhỏ ảnh (1280px WebP + thumb 600px) và "Xoá nền trắng" ngay trong trình duyệt
├── js/mailerlite.js          Email subscribe handler (fetch no-cors → inline success)
├── js/gem-db.js              Client Supabase tự viết bằng fetch (KHÔNG dùng supabase-js)
├── js/basket.js              Giỏ hàng + đặt đơn + chọn cách trả tiền
├── js/workshop.js            Danh sách buổi, form giữ chỗ, .ics
├── js/admin.js               Trang quản trị: Hôm nay / Đơn hàng / Đặt lịch / Sản phẩm
├── js/ban-tin.js             Danh sách bài + đọc bài (?bai=<slug>)
├── js/vietqr.js              Sinh mã VietQR ngay trong trình duyệt (EMVCo + QR encoder)
├── js/studio.js              Studio 2D: mặt tiền + cảnh trong, nhân vật + phụ kiện đeo thử, điểm bấm, bàn thiết kế, bảng lời nhắn; mua qua window.GemBasket (món có lựa chọn / ký gửi: bảng chi tiết ảnh thật + ô chọn); đàn tranh Việt Nam 16 / 19 dây cho món "Khu vực" / Khung bấm → "Chơi đàn tranh" (Web Audio, không file âm thanh; vùng nhấn bên trái nhạn ra Fa / Si, dây Bắc / Nam / Đảo, tông, tên Đô Rê Mi / Hò Xự Xang, bàn phím máy tính); thanh dưới ngoài phố có nút cho các điểm ngoài phố; hướng dẫn lần đầu (vuốt / cửa / trong studio, localStorage gem-guide), nhãn mép màn hình, nút "?"; chuông cửa + lời chào khi vào
├── js/patch.js               Bàn thiết kế (v2): món + kiểu ghép + tông + họa tiết + chất vải + hình vẽ + ghi chú → mã thiết kế, vẽ SVG (dùng chung với giỏ, tủ)
├── js/collection.js         Tủ sưu tầm: thiết kế đã lưu + món đã mua (localStorage gem-tu, rpc claim_collection)
├── js/studio-layout.js        Định dạng + kiểm tra bố cục studio (dùng chung studio.html / admin.html)
├── js/studio-editor.js        Tab "Lắp studio" trong admin (chỉ owner): kéo, đổi cỡ, xoay asset — cả trong studio lẫn ngoài cửa
├── supabase/functions/notify/ Edge Function báo mail cho nhân sự (đơn / workshop / lời nhắn) — xem docs/design.md
├── supabase/migrations/      SQL chạy tay trong Supabase SQL Editor (khi Claude không có quyền ghi)
├── tools/studio-assets.py    Chạy tay khi có tranh mới: ghép dải studio, tách nền nhân vật → images/studio/
├── tools/clean-white.py      Xoá phần giấy trắng còn sót trong asset đã tách nền
├── tools/design-assets.py    Chạy tay khi có tranh bàn thiết kế mới: cắt vải, khuôn mảnh, rổ, món → images/studio/vai/
├── tools/bag-assets.py       Chạy tay khi có tranh túi mới: dáng túi (tranh của Gem + dáng vẽ đứng thẳng), phần quai/lót/đáy → images/studio/vai/mon-*; `--pencil` cho tranh vẽ chì nền trong (ChatGPT, 10/2026)
├── tools/check-studio.py     Kiểm tra studio + trình lắp bằng Playwright (Supabase giả lập)
├── tools/kv-swatches.py      Chạy tay khi làm lại ảnh các tấm vải nhập sẵn (ảnh gốc trên Drive) → images/studio/vai-that/
├── images/
│   ├── logo/                 Logo Gem variants
│   ├── mascot/               6 pose Udon (PNG transparent)
│   ├── products/             Product photos (full + thumb; -2/-3… cho ảnh thêm góc)
│   ├── studio/vai-that/      Ảnh 320px các tấm vải thật nhập sẵn (Kho vải); tấm mới thêm trong admin nằm ở gem-media
│   ├── space/                Ảnh studio + sự kiện (WebP, từ Portfolio 2026)
│   ├── workshop/             Ảnh workshop / Chạm Mùa (WebP)
│   └── partners/             Logo đối tác (mo-hinh.html)
├── docs/
│   ├── design.md             Nguồn sự thật: quyết định, sprint, cấu hình, bảo mật
│   └── prompts.md            Ghi chú prompt
└── README.md                 Deploy guide cho Anna
```

**Backend (từ Sprint 3):** Supabase (project `dxdovvqsfjeizsoprrfn`, Singapore,
Postgres 17). Bảng: `products`, `orders`, `order_items`, `sessions`, `bookings`,
`workshop_types`, `staff`, `settings`, `posts`, `notes` (bảng lời nhắn Studio),
`fabrics` (Kho vải: ai cũng đọc, nhân sự ghi) + `fabric_private` (chỗ để vải, chỉ nhân sự), `studio_layout` (bố cục studio, chỉ owner ghi), `studio_assets` (thư viện ảnh của trình lắp, chỉ owner), `studio_info` (loại + câu chuyện + lời thoại theo ảnh; khách đọc, owner ghi — SQL ở `supabase/migrations/20261006_studio_info.sql`). Kho ảnh: Storage bucket
`gem-media` (đọc công khai, tải lên chỉ nhân sự). Chi tiết ở `docs/design.md`.

> ⚠️ **Hai luật bảo mật, đọc trước khi đụng vào database:**
>
> 1. **KHÔNG BAO GIỜ** đưa `service_role` key vào repo hay vào trang web — key
>    đó bỏ qua toàn bộ RLS. Publishable key thì công khai được, nó vốn nằm
>    trong JavaScript của trang.
> 2. Bảng mới trong `public` **không có sẵn quyền** select/insert/update/delete
>    cho `anon` lẫn `authenticated` (default privileges của project đặt kiểu
>    "cấm trước"). **Policy RLS lọc DÒNG, GRANT mở CỬA — thiếu cái nào cũng
>    không vào được.** Đã dính lỗi này **ba lần**. Và khi kiểm tra thì phải kiểm
>    **cả ba vai** (khách, đăng nhập nhưng không phải nhân sự, nhân sự): chỉ
>    kiểm vai `anon` thì "thiếu GRANT" trông y hệt "bảo mật đang hoạt động".
>    Sau mỗi migration, chạy **câu kiểm GRANT-vs-policy** trong `docs/design.md`
>    (mục "Lưu loại workshop báo permission denied") — nó bắt đúng lỗi này
>    trong một lượt.
> 3. **KHÔNG đưa chữ người dùng nhập vào `innerHTML`.** Nội dung bài Bản tin,
>    tên khách, ghi chú đơn — tất cả đều là chữ người khác gõ. Dùng
>    `textContent`, hoặc `esc()` có sẵn trong từng file JS.

**Naming conventions:**
- Files: lowercase kebab-case (`cau-chuyen.html`, `vai-vun-tui-deo-cheo.jpg`)
- Product image categories: `vai-vun-`, `vpp-`, `2hand-`, `gom-`, `tr-` (trang trí), `ky-gui-` (hàng ký gửi, WebP)
- Thumbnails: `<name>-thumb.jpg` (600x600 square crop)
- Full images: `<name>.jpg` (max 1600px long side, quality 85)

---

## Brand identity (đã LOCK, không thay đổi)

Quick reference:

- **Colors** (CSS variables ở đầu `css/style.css`):
  - `--sage-deep: #87965A` (primary)
  - `--sage-light: #C3C3A5`
  - `--paper-cream: #F0E1D2` (background)
  - `--kraft: #B89968` (accent)
  - `--ink-dark: #3D4A2E` (text dark)
- **Fonts:**
  - Heading: Nunito 700-800
  - Body: Be Vietnam Pro 400-500
  - Handwriting: Dancing Script (đã chốt — migration từ Caveat đã hoàn tất)
- **Voice tone:**
  - Xưng "chúng mình" (KHÔNG "chúng tôi")
- Chữ cho khách KHÔNG nhắc người riêng ("em gái mình", tên nhân sự…): trung tính, gọi là "Gem" / "Gem Chạm Sắc Studio" (Anna 14/10/2026)
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
- 5 trang chính trên nav ("Về Gem" gồm Câu chuyện / Mô hình / Đối tác) + các trang phụ: `season-02.html` (không nằm trong nav), `workshop.html`, `ban-tin.html`, `admin.html` (nhân sự), `studio.html` (bản thử, chưa lên nav). Không tạo thêm trang mới trừ khi user yêu cầu rõ.
- **Có hiện giá** (quyết định D3 trong `docs/design.md`, đảo lại "không hiện giá" cũ). Giá đọc từ bảng `products`; món chưa có giá ghi "Liên hệ".
- Email signup: **Mailerlite đã tích hợp** (account `2380127`, form `41774242`). `js/mailerlite.js` submit bằng `fetch` mode `no-cors` rồi hiện success inline (`.ml-success`) — KHÔNG load script Mailerlite, KHÔNG redirect. Form ở `index.html` và `ghe-tham.html`.
- **Có giỏ hàng + đặt đơn** (`js/basket.js`): trả khi nhận (COD) hoặc chuyển khoản VietQR (D14). KHÔNG có cổng thẻ, KHÔNG có tài khoản khách — đăng nhập chỉ dành cho nhân sự (`admin.html`). Khách xem lại món đã mua qua "Tủ sưu tầm" bằng mã đơn + SĐT.

**Products (6 categories):**
1. Phụ kiện vải vụn (14 sản phẩm — tên thương hiệu in sẵn trên ảnh: Origami Pouch, Oxford Shirt, Reimagine the Denim, Bloom Charm, Túi bút kẹp sổ, Thảm/Gối Chắp Sắc, Lót Cốc, Túi đeo chéo, Bookmark, Ví & thẻ vải ghép, Bìa sổ, Dây đeo cổ tay, Dây buộc tóc). Túi tái chế (13/10/2026): Túi đi chơi (6 mẫu), Túi đi chợ (2 mẫu), Túi đựng laptop — mỗi túi một chiếc, là một "Mẫu" trong thẻ, bán thì bấm Hết
2. Văn phòng phẩm bền vững (Sổ kraft spiral)
3. Quần áo 2hand (1 card → gallery 23 ảnh, mỗi ảnh tự ghi tên món)
4. Gốm sứ Nhật (1 card → gallery)
5. Set quà tặng (gift sets: Quà tốt nghiệp… — Bloom Charm + thiệp hoa + bookmark/scrunchie)
6. Hàng ký gửi (`ky-gui`, D22–D23): nến Tiny's Herbal (hũ 120g 13 mùi, cupcake, macaron), tất Re.socks, sổ khâu tay Tiệm sổ Cún Con. Mỗi thẻ có nhãn "Ký gửi · <nơi gửi>" (cột `consignor`). Món nhiều mùi / cỡ / mẫu = một thẻ + lựa chọn (cột `options`), ghi chú ở cột `notes_vi/en` — đều sửa trong admin. KHÔNG hiện số tồn, chỉ còn / hết từng lựa chọn.

Ảnh sản phẩm mới là full-size (1080px+), KHÔNG kèm `-thumb`. Thumbnail card 600×600 được tạo bằng Pillow (center-crop). `.heic` (vd `gom-2`) KHÔNG hiển thị trên browser — convert sang `.jpg` trước khi dùng.

**Thứ tự trên `san-pham.html`** (Anna 14/10/2026): Phụ kiện vải vụn → Hàng ký gửi → Set quà → Quần áo 2hand → Dịch vụ đặc biệt. **Văn phòng phẩm và Gốm sứ Nhật tạm ẩn**: khối `#van-phong-pham` / `#gom-su-nhat` có `hidden data-off` (catalog.js giữ ẩn), không có trong danh mục; mở lại thì bỏ hai thuộc tính đó và thêm lại mục danh mục.

**Loại trừ:**
- Generic pens (bút bi nhập), sticky notes, tiger cartoon bookmarks — **KHÔNG đăng lên web** dù có bán tại cửa hàng. Lý do: clash với brand vintage/sustainable.

**Season hiện tại:**
- **Season 02 — A Space To Stay** (đang diễn ra). Studio dài hạn, Open Studio 09:00–19:00 hàng ngày.
- Địa điểm hiện tại: Tầng 3, Trung tâm Văn hóa - Thông tin và Thể thao Phường Hai Bà Trưng, 114 Lê Gia Đỉnh, Hà Nội. (Season 01 pop-up ở Nguyễn Văn Huyên đã kết thúc.)
- Season 02 được kiến tạo bởi: Gem Chạm Sắc × Cool Vietnam × Âm Nhạc Vân Long. Trang `season-02.html` link tới FB reel `https://web.facebook.com/reel/1935073537146672`.
- "CLB Nghệ Uyển" (tên trong Portfolio) chỉ là tên hợp tác — **không** dùng làm tên không gian trên web.
- **Chạm Mùa** — chuỗi workshop cuối tuần 25/09 – 27/12/2026 (`workshop.html`, khoá `cm.*` trong `js/workshop.js`). Hết mùa thì gỡ — xem `docs/design.md` → "Portfolio 2026 + Chạm Mùa". Trải nghiệm âm nhạc / trang phục của Vân Long chỉ nhắc, không ghi giá.
- Roadmap ở `mo-hinh.html`: card `.active` = Season đang diễn ra, card `.done` = season đã qua (badge "✓ đã qua"). Card Season 02 là `<a>` link sang `season-02.html`.
- 4 seasons total: 01 Pop-up, 02 A Space To Stay, 03 Circular Creative Community, 04 Social Enterprise & Learning Space.
- Địa chỉ/giờ mở cửa là chữ dịch trong `js/i18n.js` (`footer.address`, `home.season_addr`, `visit.addr_value`, `visit.hours_value`, `s2.*`…) — sửa ở đó, nhớ cập nhật cả fallback HTML + link Google Maps trong các trang.

**Tech:**
- Deploy: push lên `main` → GitHub Pages auto-deploy ~30s.
- HTTPS đã enforce qua Let's Encrypt.
- KHÔNG add npm/build tools. KHÔNG convert sang React/Vue/Next.
- KHÔNG move CSS sang Tailwind. Plain CSS với CSS variables là intentional.
- KHÔNG dùng JavaScript framework. Vanilla JS (mỗi tính năng một file trong `js/`, xem Architecture).
- `admin.html` và `studio.html` gắn `?v=YYYYMMDD` sau CSS/JS để điện thoại không giữ bản cũ — đổi số khi sửa các file đó.

**Đa ngôn ngữ (VI/EN):**
- Engine: `js/i18n.js` — toàn bộ chữ dịch được nằm trong object `STRINGS` (key → `{ vi, en }`). Mặc định `vi`, lưu lựa chọn ở `localStorage['gem-lang']`, áp dụng across pages.
- Trong HTML, đánh dấu chữ cần dịch bằng attribute:
  - `data-i18n="key"` → set `textContent`
  - `data-i18n-html="key"` → set `innerHTML` (dùng khi có `<br>`/`<em>`/`<strong>`)
  - `data-i18n-attr="placeholder:key|alt:key2"` → set attribute (placeholder, alt, aria-label, title…)
- Thêm/sửa chữ: cập nhật `STRINGS` trong `js/i18n.js` + gắn `data-i18n` trên element. Nhớ nhúng `<script src="js/i18n.js" defer></script>` trong `<head>` mỗi trang.
- Brand giữ nguyên, KHÔNG dịch: "Gem Chạm Sắc", "Chạm Xanh · Gửi Sắc", tên season (Pop-up Experience Store…).

**Carousel ảnh sản phẩm:**
- Engine: `js/gallery.js` (chỉ nhúng ở `san-pham.html`). Mỗi `.product-card` có `data-gallery="base1,base2,…"` (tên file gốc trong `images/products/`, KHÔNG kèm path/đuôi) sẽ click mở được lightbox carousel.
- Thêm ảnh cho 1 sản phẩm: thả file theo convention (`<name>-2.jpg`, `<name>-3.jpg`…) vào `images/products/` rồi nối tên base vào `data-gallery` của card đó.
- Modal có sẵn câu CTA "Mời các bạn qua cửa hàng xem & mua nhé!" (key `products.modal_cta`).
- Món có lựa chọn / ký gửi / ghi chú: cùng modal mở thành bảng chi tiết (giá, ô lựa chọn, "Thêm vào giỏ", Ghi chú). Dữ liệu lấy qua `GemBasket.info()`; thêm vào giỏ qua `GemBasket.add(sku, el, null, null, key)`.

**Mạng xã hội (links chính thức):**
- Facebook: `web.facebook.com/gemchamsac`
- Instagram: `instagram.com/gemchamsac_studio`
- Threads: `threads.com/@gemchamsac_studio`
- YouTube: `youtube.com/channel/UCupMv7SO3-XLMTfST1RufHw`
- Footer (icon) trên 5 trang chính + danh sách text ở `ghe-tham.html`.
- Email: `gemchamsac@gmail.com` (footer + `ghe-tham.html`). TikTok: chưa có link.
- Không đưa tiểu sử / liên hệ riêng của founder lên web.

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
1. Đọc `docs/` (nếu có) xem task có chi tiết không
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

**Đã xong — Sprint 1 → 6, tất cả đã lên `main`:**
- ✅ Font tiếng Việt, Mailerlite, footer/social, TOC, carousel, song ngữ VI/EN
- ✅ Ảnh thật + giá thật (11/16 từ catalog, 5 món "Liên hệ")
- ✅ "Về Gem" thành mục cha (Câu chuyện + Mô hình + Đối tác là trang con; menu mở khi rê chuột)
- ✅ Supabase: đặt lịch workshop, sản phẩm, đơn hàng, thanh toán COD + QR, Bản tin
- ✅ Trang quản trị: Hôm nay / Đơn hàng / Đặt lịch / Sản phẩm / Bản tin
- ✅ UX đợt 2: bỏ lặp, căn trái đoạn dài, badge Season thành dải, vùng bấm 44px, lazy-load

**Studio Gem (`studio.html`, bản thử, chưa lên nav):** mặt tiền → vào studio, 4
nhân vật, phụ kiện đeo thử, bàn thiết kế, tủ sưu tầm, bảng lời nhắn; owner lắp
bố cục ở tab "Lắp studio". Chi tiết + cách đưa tranh mới vào: `docs/design.md`.
Kiểm tra nhanh sau khi sửa: `python3 tools/check-studio.py`.

**Studio — làm tiếp (ghi 10/2026, xem chi tiết ở `docs/design.md`):**
- ✅ Udon giáo viên ở Bàn thiết kế (xong 10/2026): `udon/ud-gv-1..4`, `ui/udgv-bang`.
  Thêm câu / dáng: `teach()` trong `js/studio.js`.
- 🎨 Bàn thiết kế "chơi" đợt 1 (10/2026): toàn màn hình, tâm trạng, rổ vải, May xong,
  thẻ chia sẻ 9:16, vải + rổ + món + Udon may bằng tranh (`tools/design-assets.py`).
  Chi tiết: `docs/design.md` → "Bàn thiết kế — chơi". Đợt 2: Mảnh hiếm (vải thật).
- 👕 Đợt 2 đồ mặc (áo) — chỉ làm nếu khách dùng nút "Đeo thử"; cần vẽ lại khung.
- 🧵 **Kho vải** (14/10/2026): rổ vải ở Bàn thiết kế = vải thật trong bảng `fabrics`
  (66 tấm nhập sẵn + 57 tấm "Phòng lớn, sau cửa treo đồ" 22/10, `20261022_kho_vai_sau_cua.sql`
  chạy sau khi merge; nhân sự thêm / Còn-Hết / chỗ để ở admin → Kho vải). Mã thiết kế: khoá
  `r<id>`. Kho vải cho khách (nút "Kho vải" ở rổ, hoặc Khu vực act `khovai`): chọn tối đa 8 tấm →
  "Ghép thử". Làm tiếp: (3) chỉnh họa tiết từng ô (khung = hình ô). Chi tiết: `docs/design.md` → "Kho vải".
- 🛍️ Ảnh cắt nền sản phẩm: giờ làm trong admin → Sản phẩm → Sửa → "Ảnh cắt nền"
  (nút "Xoá nền trắng", hoặc "Chọn từ thư viện" lấy ảnh đã tải ở Lắp studio). Tab
  "Sản phẩm thật" của trình lắp có mọi món (chưa cắt nền thì ảnh chụp trong khung);
  "Sửa thư viện" → chạm món = "Thay ảnh trên kệ" (ảnh thư viện / tải lên, món trên kệ đổi theo, giữ sku).
  `CUTOUT`/`THUMB`/`SHELVES` trong `js/studio.js` chỉ còn là
  bản dự phòng khi database chưa trả lời.
- 👜 Túi / cỡ / tuỳ chọn / giá thiết kế (14–15/10, **đã merge** #65): tab Túi + Túi laptop. Tab Túi còn
  3 dáng (tote, quai nơ, khoá kéo); tam giác + buộc vai tắt (Anna 20/10, `off: 1`). Năm túi vẽ lại bằng chì
  cho có khối (`bag-assets.py --pencil`). Tuỳ chọn túi:
  chần bông / túi trong / khoá kéo / nút bấm, cỡ riêng → báo giá, giá thiết kế tính cả ở database
  (`design_price`). Ba migration `20261015_kho_vai_photo.sql` → `20261015b_design_pricing.sql` →
  `20261015c_ke_ve_lai_xoay_vai.sql` **đã chạy 14/10** (#66 merge cùng ngày), câu kiểm GRANT-vs-policy
  và 3 vai đã kiểm. Con số giá là ước lượng — owner chỉnh ở admin → Sản phẩm → Giá thiết kế. Chi tiết:
  `docs/design.md` → "Bàn thiết kế — túi, cỡ, tuỳ chọn, giá".
- 📱 Studio trên điện thoại (14/10, Anna thử máy thật): xoay ngang không còn bị cắt; ảnh trong cảnh
  tải theo chỗ đang nhìn; bàn thiết kế điện thoại một cột cố định (rổ ngay dưới món, bỏ rổ neo);
  vải thả lên ô hiện ngay; cổ áo Oxford cắt theo nét vẽ; nếp gấp Origami hiện trên vải tối.
  Chi tiết: `docs/design.md` → "Studio trên điện thoại thật (14/10/2026)".
- 🧭 Bàn thiết kế 22/10 (Anna thử điện thoại): thẻ hướng dẫn 1-2-3 lần đầu + nút "?"; Màu riêng
  là bảng trượt từ đáy (không đẩy rổ xa món); kéo vải tới mép thì bàn tự cuộn; dây đeo một dây,
  ghép ngang / dọc + **thêu chỉ giữa dây / quai túi** (9 mẫu trên máy Janome, `e<mẫu><chỉ>`, chỉ
  chọn, không vẽ lên hình; migration `20261022b_day_deo_theu.sql` chạy **trước** khi merge);
  Bloom khoanh theo nét vẽ, 1 / 2 bông là tranh riêng (`mon-bloom1/2`, `ART.bloom.lays`); túi quai nơ
  cả quai một vải; Origami nền + 6 cánh (cánh khác nền / xen kẽ / mỗi cánh một vải), bỏ "Ghép
  theo nét vẽ". Chi tiết: `docs/design.md` → "Bàn thiết kế — hướng dẫn, Màu riêng, dây đeo, Bloom,
  quai nơ, Origami". Một vải thì không tính phí kiểu ghép (23/10, migration
  `20261023_mot_vai_net_bao_gia.sql` chạy **trước** khi merge).
- Ngoài studio: chưa gắn Studio lên menu (chờ Anna); Gmail secrets cho mail báo đơn
  (các bước: `docs/design.md` → "Bật gửi mail thật").

**Còn lại:**
- 📸 **Buổi chụp ảnh** — việc chặn nhiều thứ nhất. 8/19 ảnh hiện tại là poster
  Instagram có chữ in sẵn, nên hero và grid trang chủ phải chọn theo *ảnh nào
  sạch* chứ không theo *sản phẩm nào đẹp*. Cũng chặn trang Câu chuyện (U6).
- 📦 Nén ảnh sản phẩm (`gom-1.jpg` 3 MB) — nên làm cùng lúc với ảnh mới
- ✅ Thêm / sửa sản phẩm hoàn toàn trong admin (ảnh, thư viện ảnh, ảnh cắt nền, kệ
  Studio, ký gửi, lựa chọn, ghi chú) — thẻ trên `san-pham.html` và kệ Studio tự theo.
  Danh mục mới thì vẫn cần thêm khối HTML (`<div class="product-grid" data-cat="…">`)
  + `CATEGORIES` trong `js/admin.js`. Món có lựa chọn bày được trong Studio: một hình
  vẽ trên kệ, chạm vào mở bảng chi tiết có ảnh thật + ô chọn (`pdSheet` trong `js/studio.js`).
- 🕯️ Hàng ký gửi (13/10/2026): sau khi merge, chạy
  `supabase/migrations/20261013b_ky_gui_products.sql` (9 món ký gửi + 3 thẻ túi tái chế + chuyển sổ Cún Con).
  Ảnh tất Re.socks đợt 2 (14/10, `20261014c_resocks_photos.sql`): cả 6 món Re.socks đã có ảnh và mở bán;
  thẻ = poster "Ký gửi tại Gem Chạm Sắc", ảnh Re.socks xếp sau. Suôn Sẻ chưa có ảnh riêng.
  Chi tiết: `docs/design.md` → "Hàng ký gửi + lựa chọn".
- 📝 Bản dịch EN là first-pass — Anna review & chỉnh trong `STRINGS` (`js/i18n.js`)
- 🚚 Chọn đối tác giao hàng cho COD
- 💳 Quyết định ngưỡng bắt buộc chuyển khoản (hiện đang tắt)

---

## Reference docs

- **`docs/design.md`** — nguồn sự thật: mọi quyết định, từng sprint, cấu hình
  (Supabase, tài khoản ngân hàng, owner), ghi chú bảo mật, và các lỗi đã gặp
  kèm nguyên nhân. Đọc file này trước khi đụng vào backend.
- `docs/prompts.md` — Ghi chú prompt
- `README.md` — Deploy guide for Anna
