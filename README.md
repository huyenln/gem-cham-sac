# Gem Chạm Sắc · Website

Static site cho cửa hàng Gem Chạm Sắc.
Stack: HTML + CSS + 1 file JS nhỏ. Không build step.

---

## Cấu trúc

```
.
├── index.html              Trang chủ
├── cau-chuyen.html
├── mo-hinh.html
├── san-pham.html
├── ghe-tham.html
├── 404.html                Fallback page
├── CNAME                   Custom domain config (cho GitHub Pages)
├── css/style.css
├── js/main.js
└── images/
    ├── logo/
    ├── mascot/             6 pose Udon (PNG transparent)
    └── products/           Ảnh sản phẩm (full + thumb)
```

---

## Deploy lên GitHub Pages + Namecheap domain

Repo đã được `git init` sẵn với 1 commit ban đầu trên branch `main`. Bạn chỉ cần làm tiếp các bước sau.

### Bước 1 — Mua domain trên Namecheap

1. Vào https://www.namecheap.com
2. Search `gemchamsac` → chọn `.com` hoặc `.org` (hoặc cả hai)
3. Checkout. Khi checkout:
   - **Bỏ tick** "WhoisGuard" nếu muốn save tiền (~$3/năm). Namecheap free WhoisGuard mặc định bây giờ — verify lại
   - **Bỏ tick** mọi addon khác (SSL, Hosting, Email — không cần, GitHub Pages free SSL)
4. Sau khi mua xong: vào **Domain List** trong account, sẽ thấy domain mới

### Bước 2 — Tạo GitHub repo

Trên GitHub.com:

1. New repository
2. Tên: `gem-cham-sac` (hoặc `gemchamsac` — đặt sao cũng được)
3. **Public** (bắt buộc với GitHub Pages free)
4. **KHÔNG** tick "Add README" / ".gitignore" / "license" (vì local đã có)
5. Click "Create repository"
6. Sau khi tạo, GitHub sẽ show URL dạng `git@github.com:USERNAME/gem-cham-sac.git` — copy lại

### Bước 3 — Push code local lên GitHub

Trên máy bạn (terminal):

```bash
cd /path/to/gem-cham-sac
git remote add origin git@github.com:USERNAME/gem-cham-sac.git
git push -u origin main
```

Thay `USERNAME` bằng GitHub username của bạn. Nếu chưa setup SSH key cho GitHub, dùng HTTPS URL thay thế: `https://github.com/USERNAME/gem-cham-sac.git`

### Bước 4 — Enable GitHub Pages

Trên GitHub.com, ở repo vừa tạo:

1. Vào tab **Settings** → sidebar trái → **Pages**
2. Phần **Source**: chọn **Deploy from a branch**
3. Phần **Branch**: chọn **main** + folder **/(root)** → **Save**
4. Đợi 1-2 phút, refresh → sẽ thấy "Your site is live at `https://USERNAME.github.io/gem-cham-sac/`"

Test thử URL đó — site đã live, nhưng URL chưa pretty. Tiếp tục:

### Bước 5 — Cấu hình DNS trên Namecheap

Trên Namecheap, vào **Domain List** → **Manage** domain bạn vừa mua → tab **Advanced DNS**.

Xóa tất cả record có sẵn (Namecheap parking page). Thêm các record sau:

| Type | Host | Value | TTL |
|------|------|-------|-----|
| A Record | @ | 185.199.108.153 | Automatic |
| A Record | @ | 185.199.109.153 | Automatic |
| A Record | @ | 185.199.110.153 | Automatic |
| A Record | @ | 185.199.111.153 | Automatic |
| CNAME Record | www | USERNAME.github.io. | Automatic |

(Thay `USERNAME` bằng GitHub username — chú ý có dấu `.` cuối)

4 IP của A record là IP của GitHub Pages, đừng đổi.

Save lại. DNS propagation mất 5 phút đến vài giờ (thường 10-30 phút).

### Bước 6 — Verify custom domain trên GitHub

Quay lại GitHub repo → **Settings** → **Pages**:

1. Phần **Custom domain**: gõ `gemchamsac.com` (hoặc domain bạn mua) → **Save**
2. File `CNAME` trong repo sẽ tự update với domain này (đã có sẵn `gemchamsac.com` rồi — nếu bạn dùng domain khác, sửa file `CNAME` rồi commit/push lại)
3. Đợi DNS check pass (vài phút) — sẽ thấy "DNS check successful" ✓
4. Tick **Enforce HTTPS** (xuất hiện sau khi DNS pass) — cho HTTPS tự động

Đợi 10-30 phút để HTTPS cert được provision (Let's Encrypt). Sau đó:

✅ Truy cập **https://gemchamsac.com** → website live với HTTPS.

---

## Update website sau này

### Cách 1 — Git CLI (recommend cho changes lớn)

```bash
cd /path/to/gem-cham-sac
# Sửa file ...
git add .
git commit -m "Mô tả thay đổi"
git push
```

Sau ~30 giây, thay đổi sẽ live trên website.

### Cách 2 — GitHub web UI (quick fix)

1. Vào file trên GitHub repo
2. Click icon bút chì (Edit)
3. Sửa → scroll xuống → **Commit changes**
4. Live trong ~30 giây

Tốt cho việc sửa text nhanh. Không tốt cho việc upload nhiều file ảnh.

### Cách 3 — Upload file qua GitHub UI (cho ảnh mới)

1. Vào folder `images/products/` trên GitHub
2. **Add file** → **Upload files**
3. Kéo thả ảnh vào → Commit

Nhớ tên file đúng convention (xem section "Add product images" bên dưới).

---

## Tasks còn lại trước khi go-live

### ⚠️ Bắt buộc

- [ ] **Setup Mailerlite** — form email signup đang là demo (alert popup). Xem section dưới.
- [ ] **Update placeholder text:**
  - [ ] Ngày kết thúc Season 01 trong `index.html` và `ghe-tham.html` (đang để "tháng 10/2026")
  - [ ] Giờ mở cửa trong `ghe-tham.html` (đang để "Mời bạn liên hệ trước qua điện thoại")
  - [ ] Link Instagram trong tất cả 5 files (đang `href="#"`)
  - [ ] Link Facebook trong tất cả 5 files (đang `href="#"`)

### Nice to have

- [ ] Test trên iPhone/Android thật (không chỉ devtool responsive)
- [ ] Add Google Analytics (nếu muốn track traffic)
- [ ] Add OpenGraph image cho khi share lên FB/Zalo

---

## Setup Mailerlite

1. Đăng ký free tại https://www.mailerlite.com (free tier 1000 subscribers)
2. Verify email
3. Vào **Forms** → **Create embedded form**
4. Customize style:
   - Primary color: `#87965A`
   - Background: `#FBF6EE` (hoặc transparent)
   - Font: System default OK
5. Copy đoạn HTML embed Mailerlite cung cấp
6. Mở 2 file `index.html` và `ghe-tham.html`
7. Tìm comment `<!-- MAILERLITE FORM HOME -->` và `<!-- MAILERLITE FORM GHETHAM -->`
8. **Xóa** đoạn `<form class="email-form" onsubmit=...>...</form>` ngay sau comment đó
9. **Paste** embed code Mailerlite vào chỗ vừa xóa
10. Commit + push → form hoạt động thật

---

## Add product images

Tên file convention:
- `<category>-<tên>.jpg` — full image, max 1600px chiều dài, JPEG quality 85
- `<category>-<tên>-thumb.jpg` — square 600x600, JPEG quality 82

Category prefix: `vai-vun-`, `vpp-`, `2hand-`, `gom-`

Thêm product vào trang Sản phẩm: mở `san-pham.html`, copy 1 block `<div class="product-card">...</div>`, sửa `src` + `alt` + tên.

---

## Edit colors / fonts

Mở `css/style.css`, sửa các CSS variables ở đầu file (block `:root { ... }`).

---

## Tech notes

- **Không có build step.** Edit HTML/CSS trực tiếp.
- **Fonts** load từ Google Fonts CDN — cần internet để load font lúc đầu, sau đó cache.
- **Lazy loading** đã được set cho ảnh sản phẩm (`loading="lazy"`).
- **Mobile responsive** breakpoints: 640px, 768px, 960px.
- **Browser support:** Chrome/Safari/Firefox/Edge versions từ 2022 trở đi.

---

## Troubleshooting

**"Your site is live at..." nhưng custom domain không work:**
- DNS chưa propagate. Đợi 30 phút - 24h.
- Check DNS bằng `dig gemchamsac.com` hoặc https://www.whatsmydns.net

**HTTPS không work / "Certificate not yet provisioned":**
- Cert Let's Encrypt cần đến 24h để provision. Đợi tiếp.
- Đảm bảo file `CNAME` có domain đúng + DNS records đúng.

**Site update không reflect:**
- Hard refresh: Cmd/Ctrl + Shift + R
- Check GitHub Actions tab xem deploy có lỗi không.

**Ảnh không hiển thị:**
- Check tên file case-sensitive (Linux server case-sensitive, Mac không)
- Check path bắt đầu bằng `images/` (không phải `/images/` hay `./images/`)

---

## Files map

| Page | File | Purpose |
|------|------|---------|
| / | `index.html` | Trang chủ, hero, season banner, products teaser, email signup |
| /cau-chuyen.html | Story page, mission, vision, values, 4 commitments |
| /mo-hinh.html | 6-step circular process, roadmap 4 seasons |
| /san-pham.html | Catalog 4 categories |
| /ghe-tham.html | Address, hours, contact, map, prominent email signup |
| /404.html | Fallback nếu URL không tồn tại |
