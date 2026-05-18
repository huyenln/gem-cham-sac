# Gem Chạm Sắc · Website

Chạm Xanh · Gửi Sắc

---

## 1. Cấu trúc thư mục

```
gem-cham-sac/
├── index.html              ← Trang chủ
├── cau-chuyen.html         ← Câu chuyện
├── mo-hinh.html            ← Mô hình
├── san-pham.html           ← Sản phẩm
├── ghe-tham.html           ← Ghé thăm
├── css/
│   └── style.css
├── js/
│   └── main.js             ← Mobile menu toggle
└── images/
    ├── logo/               ← Logo Gem
    ├── mascot/             ← 6 pose Udon
    └── products/           ← Ảnh sản phẩm (full + thumb)
```

---

## 2. Deploy lên Netlify (5 phút, miễn phí, không cần code)

1. Truy cập **https://app.netlify.com/drop**
2. Kéo thả nguyên folder `gem-cham-sac` vào trang
3. Netlify tự deploy, trả về URL dạng `https://random-name.netlify.app`
4. Nhấn "Site settings" → "Change site name" → đổi thành `gem-cham-sac` (URL: `https://gem-cham-sac.netlify.app`)

**Custom domain (nếu có):**
- Settings → Domain management → Add custom domain
- Trỏ DNS theo hướng dẫn Netlify

---

## 3. Setup Mailerlite (để email signup hoạt động)

1. Đăng ký tại **https://www.mailerlite.com** (free tier 1000 subscribers)
2. Vào **Forms → Create embedded form**
3. Đặt tên (vd: "Gem subscribers"), customize style với màu:
   - Primary: `#87965A` (sage deep)
   - Background: `#FBF6EE` (paper white)
4. Copy embed code Mailerlite cung cấp
5. Mở 2 file `index.html` và `ghe-tham.html`, tìm comment `<!-- MAILERLITE FORM ... -->`
6. **Xóa** đoạn `<form class="email-form" onsubmit=...>...</form>` ngay sau comment đó
7. **Paste** embed code Mailerlite vào chỗ đó
8. Save và re-upload lên Netlify (kéo thả lại folder)

---

## 4. Thêm/sửa ảnh sản phẩm

**Format ảnh:**
- Tên file: `<category>-<tên>.jpg` (vd: `vai-vun-tui-moi.jpg`)
- Thumbnail (cho grid): `<tên>-thumb.jpg` (kích thước 600x600px)
- Full image: max 1600px chiều dài, JPEG quality 85

**Thêm sản phẩm mới vào trang Sản phẩm:**
- Mở file `san-pham.html`
- Tìm section của category tương ứng
- Copy 1 block `<div class="product-card">...</div>`
- Sửa `src`, `alt`, tên sản phẩm, mô tả

---

## 5. Thêm/sửa text

Mọi text trên website nằm trong các file HTML. Tìm bằng Ctrl+F → sửa → save.

**Các chỗ cần update khi có thông tin:**

- **Ngày kết thúc Season 01**: hiện đang để "tháng 10/2026" - sửa trong:
  - `index.html` (Season banner)
  - `ghe-tham.html` (Season banner)

- **Giờ mở cửa**: đang để "Mời bạn liên hệ trước qua điện thoại" - sửa trong:
  - `ghe-tham.html` (contact info block)

- **Link IG/FB**: hiện để `href="#"` - sửa thành link thật trong tất cả 5 files (footer)

---

## 6. Test trước khi deploy

Mở `index.html` trực tiếp bằng browser (Chrome/Firefox) để xem trước. Test:
- Trên desktop: full layout
- Trên mobile: F12 → device toolbar → iPhone view
- Click qua tất cả 5 trang xem link OK không

---

## 7. Maintenance notes

**Khi muốn thêm bài blog/tạp chí (Season 02+):**
- Tạo folder `blog/`
- Mỗi bài là 1 file HTML
- Thêm link "Tạp chí" vào navbar 5 files

**Khi muốn đổi màu sắc:**
- Sửa các CSS variables ở đầu file `css/style.css` (block `:root`)

**Khi muốn đổi mascot Udon sang pose khác:**
- Có sẵn 6 pose trong `images/mascot/`: sit_stare, sit_happy, lying_smile, lying_flat, standing, portrait
- Tìm `src="images/mascot/udon_X.png"` trong HTML, đổi thành pose khác

---

## 8. Future ideas (Season 02+)

- Trang Blog/Tạp chí
- Lịch workshop với calendar embed
- Form đăng ký workshop trực tiếp
- Online catalog với product detail pages
- E-commerce integration (Shopify Lite hoặc WooCommerce)
