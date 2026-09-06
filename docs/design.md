# Gem Chạm Sắc — Design Document

> Bản thiết kế cho loạt sprint sắp tới. Gom toàn bộ thay đổi đã làm, quyết định
> đã chốt, và những gì còn phải chốt. Cập nhật lần cuối: 2026-08.
>
> Tài liệu này thay thế 3 bản báo cáo rời trước đó và là nguồn duy nhất
> (single source of truth).

---

## 0. Mục lục

1. [Trạng thái hiện tại](#1-trạng-thái-hiện-tại)
2. [Quyết định đã chốt](#2-quyết-định-đã-chốt)
3. [Ba quyết định lớn](#3-ba-quyết-định-lớn)
4. [Thanh toán](#4-thanh-toán)
5. [Kiến trúc](#5-kiến-trúc)
6. [Data model](#6-data-model)
7. [Trang quản trị](#7-trang-quản-trị)
8. [Đặt lịch workshop](#8-đặt-lịch-workshop)
9. [Trang Bản tin](#9-trang-bản-tin)
10. [Rà soát UX](#10-rà-soát-ux)
11. [Information architecture](#11-information-architecture)
12. [Bảo mật](#12-bảo-mật)
13. [Chia sprint](#13-chia-sprint)
13b. [Thông tin cấu hình](#13b-thông-tin-cấu-hình)
14. [Còn phải chốt](#14-còn-phải-chốt)
15. [Không làm](#15-không-làm)
16. [Cần cập nhật CLAUDE.md](#16-cần-cập-nhật-claudemd)

---

## 1. Trạng thái hiện tại

**Nhánh:** `claude/online-shopping-options-u6qkya` · **commit:** `b6c11a1` · đã push,
**chưa merge vào `main`** → `gemchamsac.com` hiện chưa đổi gì.

| File | Trạng thái | Nội dung | Dòng |
|---|---|---|---:|
| `gio-hang.html` | mới | Trang thử nghiệm giỏ hàng. Không trong nav, có `noindex`. 16 sản phẩm. | 284 |
| `js/basket.js` | mới | `CATALOG`, 16 sprite SVG tạm, giỏ bay, panel, form đặt hàng, bộ chọn kênh chat, `localStorage` | 835 |
| `css/basket.css` | mới | Style riêng cho prototype, tách khỏi `style.css` để dễ bỏ | 597 |
| `js/i18n.js` | sửa | Thêm `GemI18n.add()` cho script ngoài đăng ký chữ dịch | 13 |

Không file nào khác bị chạm. `san-pham.html`, `index.html`, `CNAME` giữ nguyên.

**6 lỗi đã phát hiện & sửa trong lúc làm:** vòng lặp i18n vô hạn · `form.name` bị
shadow bởi thuộc tính của `HTMLFormElement` · chỉ báo “+N” khuất sau vành giỏ do
stacking context · animation chạy lại toàn bộ pile mỗi lần thêm · trùng tên class
`.gb-back` · nút “Thêm vào giỏ” xuống dòng xấu ở mobile.

---

## 2. Quyết định đã chốt

### Bán hàng & sản phẩm

| # | Quyết định | Ghi chú |
|---|---|---|
| D1 | **Giỏ hàng → đơn hàng thật**, người xác nhận từng đơn | Không phải e-commerce tự động |
| D2 | **“Độc bản” là kiểu dáng, không phải số lượng** | Sản phẩm làm lại được → đặt giá theo loại là hợp lý |
| D3 | **Hiện giá trên web** | Đảo lại quyết định “KHÔNG hiện giá” trong `CLAUDE.md` |
| D4 | **Khách chọn kênh liên hệ:** Zalo / Messenger / email | Zalo & Messenger không nhận prefilled text qua URL → nội dung giỏ tự copy vào clipboard |
| D5 | **Một sprite cho mỗi sản phẩm**, không phải mỗi danh mục | 16 hình tạm đã có, chờ tranh vẽ tay thay vào |
| D6 | **2hand chưa cho vào giỏ** | 23 món riêng biệt, cần dữ liệu từng món |
| D7 | **KHÔNG tự động trừ tồn kho** | Vì bán cả tại cửa hàng → số online sẽ sai theo hướng tệ nhất. Đặt tay: còn hàng / sắp hết / hết |
| D8 | **Giữ GitHub Pages** | Backend ≠ đổi host |

### Đặt lịch workshop

| # | Quyết định | Ghi chú |
|---|---|---|
| D9 | **Tự xây trên Supabase**, không thuê Cal.com | 3 giờ cố định/tuần không phải bài toán tính availability phức tạp |
| D10 | **3 buổi cố định mỗi tuần + đường “nhắn hẹn giờ khác”** | Chủ Nhật không lên lịch, chỉ qua tin nhắn |
| D11 | **Thời lượng theo từng buổi**, không cố định toàn hệ thống | 1–3h tuỳ nội dung |
| D12 | **Số chỗ theo từng buổi, mặc định 8** | Thuê thêm người thì sửa số của buổi đó |
| D13 | **Nhắc lịch bằng Zalo tay**, chưa làm email tự động | ~3 phút/buổi, hiệu quả hơn email ở VN |

### Thanh toán — xem chi tiết ở [§4](#4-thanh-toán)

| # | Quyết định | Ghi chú |
|---|---|---|
| D14 | **Trên web: COD + chuyển khoản QR** | ⚠️ Đã đổi — trước đây là cổng thẻ quốc tế |
| D15 | **Tại cửa hàng: tiền mặt + QR + thẻ qua máy POS** | Máy POS lo phần khách nước ngoài |
| D16 | **Vẫn thiết kế sẵn các trường thanh toán** cho thẻ online sau này | Gắn cổng sau là *thêm vào*, không phải *làm lại* |
| D17 | Cân nhắc **đăng lên Klook / Airbnb Experiences** | Giải cả bài toán tìm khách, không chỉ thanh toán |

### Đã bị đảo lại

| # | Quyết định cũ | Trạng thái |
|---|---|---|
| ~~D18~~ | ~~Pages CMS để quản trị nội dung~~ | ❌ **BỎ** — xem [§3.3](#33-trang-quản-trị-riêng) |
| ~~D19~~ | ~~Refactor `CATALOG` → `data/products.json`~~ | ❌ **BỎ** — sản phẩm vào Supabase |
| ~~D20~~ | ~~Cổng thẻ quốc tế VNPAY/OnePay cho web~~ | ❌ **HOÃN** — thay bằng COD + QR ([§4](#4-thanh-toán)) |
| D21 | ~~Trang “Hoạt động”~~ → **trang “Bản tin”** | ✅ đổi tên, xem [§9](#9-trang-bản-tin) |

---

## 3. Ba quyết định lớn

### 3.1 Trang riêng hay gộp vào Sản phẩm?

**Quyết định: trang riêng `workshop.html`, VÀ đưa vào nav chính.**

Lý do từ góc độ UX:

- **URL chia sẻ được.** Đây là lý do quyết định. Cần dán được một link vào bio
  Instagram, in QR lên poster ở studio, trả lời DM bằng một đường dẫn. Không thể
  gửi ai đó “phần đặt lịch ở cuối trang Sản phẩm”.
- **Việc có mục đích khác việc dạo xem.** Đặt lịch là một *task*; xem sản phẩm là
  *khám phá*. Trộn luồng giao dịch vào trang dạo xem làm loãng cả hai.
- **`san-pham.html` đã quá dài rồi:** 5.805px desktop, 7.425px mobile. Gắn lịch
  vào cuối là chôn nó.
- **SEO riêng.** “workshop tái chế Hà Nội” là truy vấn khác “túi vải vụn”.

**Nhãn nav “Workshop”**, không phải “Đặt lịch” — nav nên đặt tên *sự vật*, không
phải *hành động*; người ta quét nav tìm danh từ.

Thẻ “Workshop trải nghiệm” ở `san-pham.html#dich-vu` **giữ lại** làm cửa thứ hai.

### 3.2 Khách nước ngoài có trả trước không?

**Quyết định: không, ít nhất là chưa.** Xem [§4](#4-thanh-toán) — COD + QR đều là
cơ chế nội địa, nên khoảng trống “khách nước ngoài trả trước online” tạm để mở.
Bù lại, **máy POS ở cửa hàng lo được phần lớn** khách du lịch (họ đến studio để
học/mua, trả bằng thẻ tại chỗ).

Trường `require_prepay` và `card_online` vẫn giữ trong schema để bật sau.

### 3.3 Trang quản trị riêng

**Quyết định: xây trang quản trị riêng `admin.html` trên Supabase.**

Nó **đảo lại hai quyết định cũ**:

- ❌ **Pages CMS bỏ.** Chỉ sửa được file trong repo — không hiện được đơn hàng hay
  lịch đặt. Muốn một chỗ xem cả đơn, trạng thái, lịch đặt và sản phẩm thì phải là
  trang tự xây đọc từ Supabase.
- ❌ **`data/products.json` bỏ.** Sửa sản phẩm cùng chỗ với đơn hàng ⇒ sản phẩm
  phải cùng database. Một hệ thống, không phải hai.

Và **thêm ba thứ mới**:

- ➕ **Đơn hàng thành dòng dữ liệu, không còn là email.** `basket.js` sẽ ghi vào
  Supabase; email chỉ còn là thông báo.
- ➕ **Đăng nhập thật** — Supabase Auth + RLS theo role (`owner` / `staff`).
- ➕ **Supabase Storage** cho ảnh sản phẩm.

**Đánh đổi phải nói rõ:** sản phẩm chuyển sang fetch lúc chạy → tên sản phẩm không
còn trong HTML → **SEO trang sản phẩm yếu đi một chút.** Ở quy mô này lưu lượng
đến từ Instagram/Facebook nhiều hơn Google nên chấp nhận được. Nếu sau này SEO
thành ưu tiên: giữ tên/mô tả/ảnh trong HTML tĩnh, chỉ fetch giá và tình trạng.

**Vẫn không cần đổi host.**

---

## 4. Thanh toán

> ⚠️ **Mục này vừa thay đổi.** Trước đây kế hoạch là cổng thẻ quốc tế
> (VNPAY / OnePay). Nay đổi thành **COD + chuyển khoản QR**.

### Ba kênh, ba đối tượng

| Nơi | Hình thức | Phục vụ ai |
|---|---|---|
| **Trên web** | COD · chuyển khoản QR | Khách Việt |
| **Tại cửa hàng** | Tiền mặt · QR · **thẻ qua máy POS** | Tất cả, kể cả khách nước ngoài |
| **Workshop** | Giữ chỗ miễn phí, trả tại studio | Tất cả |

**Khoảng trống còn lại:** khách nước ngoài **trả trước online**. COD cần địa chỉ
giao ở VN; QR cần app ngân hàng Việt — cả hai đều không dùng được từ nước ngoài.
Chấp nhận tạm, vì khách du lịch dù sao cũng đến tận studio và trả bằng thẻ ở đó.
**Máy POS vì thế là việc nên làm sớm, độc lập với web.**

### COD — thanh toán khi nhận hàng

Hình thức phổ biến nhất ở Việt Nam. Cần lưu ý:

- **Cần đối tác giao hàng** thu hộ: GHTK, GHN, Viettel Post, J&T. Họ thu tiền rồi
  chuyển lại, có phí mỗi đơn.
- **Rủi ro:** khách từ chối nhận hàng → shop chịu phí chiều về. Rất phổ biến.
- **Giảm rủi ro:** xác nhận qua Zalo trước khi gửi — việc này đang làm rồi, chỉ
  cần giữ nguyên trong quy trình.
- **Đề xuất:** đơn trên một mức nào đó thì yêu cầu chuyển khoản trước thay vì COD.
  Ngưỡng cụ thể là **dữ liệu**, chỉnh trong admin, không cần sửa code.

### QR — chuyển khoản VietQR

- **Bắt buộc nhúng sẵn số tiền VÀ mã đơn** (`orders.code`) vào nội dung chuyển
  khoản. Không có mã đơn thì không đối soát được — đây là yêu cầu kỹ thuật, không
  phải tuỳ chọn.
- **Web không tự biết tiền đã về.** Tiền vào tài khoản ngân hàng, không có gì báo
  cho website. Anna mở app ngân hàng, thấy tiền, rồi bấm “đã nhận” trong admin.
- **Tự động hoá sau này:** **Casso** hoặc **SePay** — dịch vụ Việt Nam theo dõi
  tài khoản ngân hàng và bắn webhook khi có chuyển khoản khớp mã đơn. Rẻ, và là
  cách nâng cấp tự nhiên khi số đơn tăng. **Chưa làm trong loạt sprint này.**

### Trạng thái thanh toán

`chưa trả` → `chờ chuyển khoản` → `đã trả` &nbsp;&nbsp;+ `đã hoàn`

- COD: tạo đơn ở `chưa trả`, chuyển `đã trả` khi shipper báo đã thu
- QR: tạo đơn ở `chờ chuyển khoản`, Anna xác nhận thành `đã trả`

---

## 5. Kiến trúc

```
                     gemchamsac.com  (GitHub Pages, CNAME, không build step)
                                │
   ┌────────────────────────────┼────────────────────────────┐
   │                            │                            │
Trang tĩnh                 Trang động                   admin.html
(SEO, nội dung)            (fetch Supabase)             (Supabase Auth)
   │                            │                            │
index.html                 san-pham.html               ├ Hôm nay
cau-chuyen.html              └ sản phẩm + giá          ├ Đơn hàng
mo-hinh.html               workshop.html              ├ Đặt lịch
ghe-tham.html                └ buổi + chỗ còn         ├ Sản phẩm
season-02.html             ban-tin.html               ├ Bản tin
404.html                     └ bài viết               └ Cài đặt (owner)
                                │
                                ▼
                    ┌───────────────────────┐
                    │  Supabase             │
                    │  Postgres + RLS       │
                    │  Auth (nhân sự)       │
                    │  Storage (ảnh)        │
                    │  RPC (book_session)   │
                    └───────────────────────┘
```

Không Vercel, không Netlify, không framework, không build step. Chỉ thêm backend.

> `ban-tin.html` bắt đầu ở dạng **tĩnh** (Sprint 2) rồi mới chuyển sang đọc
> Supabase (Sprint 6) — xem [§9](#9-trang-bản-tin).

---

## 6. Data model

### Sản phẩm

```sql
products
  id, slug, category, sort_order
  name_vi, name_en, desc_vi, desc_en
  price                -- VND, số nguyên
  availability         -- 'in_stock' | 'low' | 'out'   (đặt tay, xem D7)
  sprite_key           -- khớp với SPRITES trong basket.js
  images[]             -- Supabase Storage paths, ảnh đầu là thumbnail
  is_published
  created_at, updated_at
```

### Đơn hàng

```sql
orders
  id, code                       -- mã ngắn, đọc qua điện thoại được, DÙNG TRONG NỘI DUNG CHUYỂN KHOẢN
  customer_name, phone, email
  address, is_pickup
  note
  status
  subtotal                       -- chốt lúc đặt, KHÔNG đọc lại từ bảng giá
  channel                        -- 'web' | 'zalo' | 'messenger' | 'instore'
  payment_method                 -- 'cod' | 'qr' | 'cash' | 'card_onsite' | 'card_online' | 'marketplace'
  payment_status                 -- 'chưa trả' | 'chờ chuyển khoản' | 'đã trả' | 'đã hoàn'
  amount, currency, provider_ref, paid_at
  shipping_partner, tracking_code   -- cho COD
  created_at, updated_at

order_items
  id, order_id, product_id
  name_snapshot, unit_price, qty  -- snapshot để đơn cũ không sai khi đổi giá
```

**Trạng thái đơn hàng:**

`mới` → `đã xác nhận` → `đang chuẩn bị` → `đã gửi` \| `đã giao` → `xong`
&nbsp;&nbsp;+ `đã huỷ` (từ bất kỳ trạng thái nào)

> `payment_status` **tách riêng** khỏi `status`. Một đơn COD có thể ở
> `đã gửi` + `chưa trả` — hai chiều khác nhau, không gộp làm một.

### Workshop

```sql
workshop_types
  id, slug, name_vi, name_en, desc_vi, desc_en
  duration_minutes     -- 1–3h tuỳ loại (D11)
  price
  require_prepay       -- để sẵn, chưa bật (§3.2)
  is_published

sessions
  id, workshop_type_id
  starts_at            -- timestamptz
  capacity             -- mặc định 8 (D12)
  status               -- 'open' | 'closed' | 'cancelled'
  note

bookings
  id, session_id, code
  name, phone, email, seats, note
  status
  payment_method, payment_status, amount, currency, provider_ref, paid_at
  created_at
```

**Trạng thái đặt lịch:**

`giữ chỗ` → `đã xác nhận` → `đã đến` \| `không đến` &nbsp;&nbsp;+ `đã huỷ`

> `không đến` không để phán xét khách — nó là dữ liệu để sau này biết có cần thu
> cọc hay không.

### Bản tin

```sql
posts
  id, slug
  title_vi, title_en, excerpt_vi, excerpt_en, body_vi, body_en
  cover_image, images[]
  event_date           -- ngày diễn ra, khác ngày đăng
  location             -- 'BUV', 'UN Youth Day'…
  external_url         -- link bài gốc trên Facebook/Instagram
  is_published
  created_at
```

### Nhân sự

```sql
staff
  user_id              -- khớp auth.users
  display_name
  role                 -- 'owner' | 'staff'
```

### Ba trường quan trọng nhất

| Trường | Vì sao quan trọng |
|---|---|
| `amount` / `unit_price` | Lưu số tiền **tại thời điểm đặt**. Đổi bảng giá không làm sai đơn cũ. Lỗi kinh điển của hệ thống tự làm. |
| `orders.code` | Vừa là mã đọc cho khách qua điện thoại, **vừa là khoá đối soát chuyển khoản QR**. Phải ngắn, không nhầm lẫn (tránh O/0, I/1). |
| `require_prepay` | Để sẵn cho ngày bật thẻ online, không phải sửa schema lúc đó. |

### Chống tranh chỗ cuối

Một hàm Postgres, gọi qua `supabase.rpc('book_session', …)`:

```
BEGIN
  SELECT capacity FROM sessions WHERE id = ? FOR UPDATE;   -- khoá dòng
  SELECT sum(seats) FROM bookings WHERE session_id = ? AND status <> 'đã huỷ';
  IF đã_đặt + seats > capacity THEN RETURN 'full';
  INSERT INTO bookings …;
  RETURN mã giữ chỗ;
END
```

Tất cả trong **một transaction**. Đây là thứ khiến chỗ cuối cùng chỉ về một người.

---

## 7. Trang quản trị

`admin.html` · `noindex` · **không** trong nav công khai · Supabase Auth.

### Nguyên tắc thiết kế — quan trọng nhất

**Thiết kế cho điện thoại trước, không phải máy tính.**

Em gái bạn đứng ở cửa hàng cả ngày — sẽ mở bằng điện thoại giữa lúc đang gói hàng,
không phải ngồi trước laptop. Nên:

- Mobile-first thật sự, nút to, ít phải gõ chữ
- Đổi trạng thái bằng **một lần bấm**, không phải mở form rồi Save
- **Mọi số điện thoại là link bấm gọi / mở Zalo.** Đây là thao tác dùng nhiều
  nhất, không phải sửa sản phẩm.
- Màn hình mặc định là **“Hôm nay”**, không phải dashboard số liệu

### Các mục

| Mục | Nội dung | Quyền |
|---|---|---|
| **Hôm nay** | Đơn mới cần xử lý · đơn QR chờ xác nhận tiền · buổi học hôm nay + danh sách người đến kèm SĐT | staff |
| **Đơn hàng** | Danh sách, lọc theo trạng thái **và trạng thái thanh toán**, chi tiết, đổi trạng thái, đánh dấu “đã nhận tiền” | staff |
| **Đặt lịch** | Buổi sắp tới + số chỗ · danh sách người đăng ký · tạo/sửa/huỷ buổi | staff |
| **Sản phẩm** | Thêm/sửa/ẩn, upload ảnh, giá, tình trạng còn hàng, thứ tự | staff |
| **Bản tin** | Viết/sửa bài, upload ảnh | staff |
| **Cài đặt** | Loại workshop, giá, ngưỡng bắt buộc chuyển khoản, tài khoản nhân viên | **owner** |

### Việc của Anna mỗi tuần

| Việc | Tần suất | Thời gian |
|---|---|---|
| Xác nhận đơn mới + kiểm tra tiền QR về | hằng ngày | ~1 phút/đơn |
| Nhắn Zalo nhắc trước buổi học | mỗi buổi | ~3 phút |
| Đăng buổi học (mở trước ~4 tuần) | ~1 lần/tháng | ~2 phút |
| Cập nhật giá / thêm sản phẩm | khi cần | — |

---

## 8. Đặt lịch workshop

Mô hình đã chốt ở D9–D13. Đề xuất lịch:

| Thứ | Giờ | Nội dung |
|---|---|---|
| Tư | 17:00–19:00 | Bìa sổ vải vụn |
| Bảy | 10:00–12:00 | Giấy tái chế |
| Bảy | 14:30–16:30 | Bìa sổ vải vụn |
| CN | — | Không lên lịch, chỉ qua tin nhắn |

Lý do: thứ Tư chiều muộn hợp người đi làm/đi học; **hai buổi dồn vào thứ Bảy chỉ
cần một lần chuẩn bị và dọn dẹp**, mà thứ Bảy khách cũng rảnh nhất.

**Đây là dữ liệu, sửa lúc nào cũng được — không chặn việc code.**

### Luồng của khách

1. **Danh sách buổi** — chủ đề, ngày & giờ, thời lượng, giá, `Còn 5/8 chỗ`.
   Đủ chỗ thì “Đã đủ chỗ”.
2. **Chọn buổi** → form ngắn: tên, SĐT (bắt buộc), số người, email, ghi chú.
3. **Xác nhận** — mã giữ chỗ + nút **tải `.ics`** (sinh phía browser, không cần server).
4. **Nhắc trước** — Anna nhắn Zalo trước một ngày, cũng là lúc chốt số vật liệu.

### Rủi ro: khách không đến

Đặt miễn phí, không cọc là mô hình có tỉ lệ vắng cao nhất. **Không đề nghị thu cọc**
— nó chặn đúng những người mới tò mò muốn thử. Thay vào đó:

- Bắt buộc SĐT (là kênh nhắc, không phải thông tin cho vui)
- Anna nhắn Zalo trước một ngày từ danh sách trong admin
- Dùng chữ **“giữ chỗ”**, không dùng “đã đặt”
- **Chỉ chuẩn bị vật liệu sau khi nhắn xác nhận**, không theo số đăng ký

Theo dõi bằng trạng thái `không đến`. Vắng nhiều thì lúc đó hãy tính cọc.

---

## 9. Trang Bản tin

`ban-tin.html` · nhãn nav **“Bản tin”** — bài viết về sự kiện đã qua: workshop ở
BUV, hội chợ UN Youth Day…

### Vì sao “Bản tin” hợp hơn “Hoạt động”

- Rộng hơn: chứa được cả sự kiện đã qua, tin studio, thông báo season mới
- **Nối liền với form đăng ký email đang có** (Mailerlite). Trang Bản tin là kho
  lưu công khai, email là kênh gửi. Một câu chuyện: *“đọc bản tin cũ ở đây, đăng
  ký để nhận số tiếp theo.”* Hai thứ đang rời rạc giờ đỡ cho nhau.
- Đúng giọng “chúng mình” hơn một chữ mang tính phân loại

### KHÔNG nhúng feed mạng xã hội

Đã cân nhắc và loại:

- Script nhúng của Facebook/Instagram **nặng và có tracking** → trái anti-pattern
  #2 trong `CLAUDE.md` (privacy-first)
- Embed feed Instagram cần token + app review, hay hỏng
- Giao diện embed không theo brand
- **Bài gốc bị xoá là mất luôn nội dung trên web của mình**
- **Embed không giúp gì cho SEO.** “Workshop tái chế tại BUV” là cụm người ta tìm;
  Google không đọc bài Facebook nhúng như nội dung của bạn.

### Làm thay vào đó — hai giai đoạn

| Giai đoạn | Cách làm | Vì sao |
|---|---|---|
| **Sprint 2** | HTML **tĩnh**, bài viết viết thẳng vào file | Chỉ có 2–3 bài (BUV, UN Youth Day). Xây CMS cho 3 bài là thừa. Bù lại **SEO hoàn hảo** vì nội dung nằm trong HTML. |
| **Sprint 6** | Chuyển sang đọc Supabase + mục Bản tin trong admin | Khi Anna thật sự có nhịp đăng bài đều |

Mỗi bài: tiêu đề · ngày diễn ra · địa điểm · ảnh bìa · 2–3 đoạn giọng “chúng mình”
· gallery ảnh · link bài gốc (không bắt buộc).

Đã có tiền lệ trong repo: `season-02.html` chính là mô hình này.

### Hạn chế phải nói rõ

Sau Sprint 6, bài render phía browser từ `?slug=…` → **Google index yếu hơn HTML
tĩnh.** Đây là lý do Sprint 2 làm tĩnh trước: mấy bài đầu — những bài quan trọng
nhất cho SEO — sẽ nằm trong HTML thật.

---

## 10. Rà soát UX

Rà soát trên bản đang chạy, chụp ở 390px và 1440px. Số đo thật:

| Trang | Cao (mobile) | Cao (desktop) | Số ảnh |
|---|---:|---:|---:|
| `index` | 5.614px | 4.394px | 13 |
| `cau-chuyen` | **7.974px** | 5.678px | **2** |
| `mo-hinh` | 5.838px | 3.383px | **2** |
| `san-pham` | 7.425px | 5.805px | 20 |
| `ghe-tham` | 3.898px | 2.914px | 4 |

**Điểm tốt:** không trang nào tràn ngang · mọi ảnh đều có `alt` · mỗi trang đúng
một `<h1>`.

### Ưu tiên cao → Sprint 1

| # | Vấn đề | Đề xuất |
|---|---|---|
| U1 | **Hero trang chủ không có sản phẩm nào.** Màn đầu chỉ có chữ + mascot. Một thương hiệu thủ công *trực quan* mà màn đầu không cho thấy mình làm ra cái gì. Ảnh patchwork trong thẻ Season 02 đẹp và thuyết phục hơn Udon nhiều — mà nằm dưới màn đầu | Đưa ảnh sản phẩm / studio lên hero |
| U2 | **Teaser sản phẩm trang chủ chỉ hiện 1 món** (carousel). Shop có 19 sản phẩm. Carousel có tỉ lệ xem qua slide 2 rất thấp | Đổi thành grid 3–4 món |
| U3 | **Trang chủ không nhắc gì đến workshop** | Thêm section workshop |
| U4 | **Không có gì ở màn đầu nói đây là cái gì, ở đâu** | Thêm “Hà Nội · mở 09:00–19:00 hàng ngày” gần đầu trang |
| U5 | **Khách nước ngoài gặp bức tường tiếng Việt.** VI/EN là pill nhỏ góc phải | ⚠️ **Đã đổi cách làm khi implement:** không tự động chuyển ngôn ngữ. Rất nhiều người Việt dùng điện thoại cài tiếng Anh — tự chuyển sẽ đẩy khách Việt (nhóm chính) sang bản tiếng Anh, tệ hơn vấn đề cần giải. Thay bằng **một thanh gợi ý nhỏ, tắt được**: “This site is also available in English.” Gợi ý, không phải quyết định thay khách. |

### Ưu tiên trung bình → Sprint 6

| # | Vấn đề | Đề xuất |
|---|---|---|
| U6 | `cau-chuyen.html` gần **8.000px mobile và chỉ 2 ảnh** (đều là logo). Trang kể chuyện của brand thủ công mà không có ảnh studio, người làm, quá trình | Thêm ảnh thật, cắt bớt chữ |
| U7 | Chữ ở `cau-chuyen` **căn giữa** trong đoạn dài | Căn trái, ~65 ký tự/dòng |
| U8 | **“Ba điều chúng mình giữ” lặp nguyên văn** ở trang chủ và Câu chuyện | Bỏ một chỗ hoặc làm khác đi |
| U9 | Badge “Season 02” **bị ẩn ở mobile** → khách mobile không biết đang mở cửa | Hiện ở mobile, dạng gọn |
| U10 | **17–21 phần tử bấm nhỏ hơn 40px** (icon social footer, link nav) | Nâng vùng bấm lên 44px |
| U11 | Số 01–04 ở phần cam kết **không phải chuỗi tuần tự** — các việc song song, số chỉ để trang trí | Bỏ số hoặc đổi cấu trúc |
| U12 | Ảnh sản phẩm 1–4MB (đã có trong backlog `CLAUDE.md`) | Nén, thêm `loading="lazy"` |

---

## 11. Information architecture

Nav hiện có 5 mục. Thêm Workshop + Bản tin là **7** — quá chật, nhất là desktop
khi nav nằm cùng hàng với badge season và nút VI/EN. Repo đã từng có lỗi tràn nav
ở mobile (commit `3b7d818`).

**Đề xuất: gộp “Câu chuyện” + “Mô hình” thành “Về Gem”** → về lại 6 mục.

```
Trang chủ · Về Gem · Sản phẩm · Workshop · Bản tin · Ghé thăm
```

Phương án khác: bỏ “Mô hình” khỏi nav, link từ trong “Câu chuyện”.

---

## 12. Bảo mật

**Phần quan trọng nhất của cả loạt sprint.** Làm sai là SĐT và địa chỉ của toàn bộ
khách nằm công khai trên internet.

| Nguyên tắc | Chi tiết |
|---|---|
| **RLS là biên bảo mật thật, không phải màn đăng nhập** | `admin.html` là file công khai — ai cũng tải được. Cái bảo vệ dữ liệu là policy trong database. |
| Khách (anon) **chỉ** đọc | `products` (published) · `posts` (published) · `workshop_types` · thông tin buổi + **số chỗ còn lại** qua view |
| Khách **không bao giờ** đọc | `bookings`, `orders`, `order_items`, `staff` |
| Khách ghi **chỉ qua RPC** | `book_session()` và `create_order()` — không `INSERT` trực tiếp |
| Số chỗ còn lại đi qua **view** | View chỉ trả con số, không trả thông tin khách |
| `staff` đọc/ghi đơn & lịch; **chỉ `owner`** sửa loại workshop, giá, tài khoản | Hai role, không nhiều hơn |
| Publishable key công khai là **bình thường** | Được thiết kế để lộ — nhưng chỉ đúng khi RLS đúng |

Sẽ kiểm tra bằng cách thử đọc `bookings` bằng anon key và xác nhận bị chặn.

---

## 13. Chia sprint

Mỗi sprint **dùng được ngay**, không phải chờ sprint sau. Sprint 1 và 2 không cần
Supabase, không chờ quyết định nào — làm được ngay hôm nay.

| Sprint | Nội dung | Cần Supabase | Ước lượng |
|---|---|:---:|---|
| **1** | UX ưu tiên cao + giỏ hàng lên thật | — | ~2 ngày |
| **2** | Trang Bản tin (tĩnh) | — | ~1,5 ngày |
| **3** | Nền Supabase + Workshop + admin (Hôm nay, Đặt lịch) | ✓ | ~4 ngày |
| **4** | Sản phẩm & Đơn hàng vào Supabase + admin (Sản phẩm, Đơn hàng) | ✓ | ~4 ngày |
| **5** | Thanh toán COD + QR | ✓ | ~2 ngày |
| **6** | UX đợt 2 + Bản tin vào Supabase | ✓ | ~2,5 ngày |

Tổng ~16 ngày làm việc. Sau đó: thẻ quốc tế, Casso/SePay đối soát tự động.

### Sprint 1 — UX + giỏ hàng lên thật · ✅ XONG

Đã làm xong, nằm trên nhánh, **chưa merge vào `main`**.

- Nút **“Đăng ký workshop”** trên thẻ Workshop ở `san-pham.html` (hiện chưa có
  nút nào) — tạm link tới `ghe-tham.html`, đổi sang `workshop.html` ở Sprint 3
- **U1** hero có sản phẩm · **U2** grid thay carousel · **U3** section workshop ·
  **U4** dòng “Hà Nội · 09:00–19:00” · **U5** tự nhận ngôn ngữ
- **Gộp giỏ hàng vào `san-pham.html`** (bỏ trang `gio-hang.html` thử nghiệm).
  Đơn vẫn gửi qua email như hiện tại — đổi sang Supabase ở Sprint 4.

**Xong sprint này:** website đẹp hơn rõ rệt và đã bán được hàng qua giỏ.

#### ⚠️ Phát hiện khi làm: ảnh sản phẩm phần lớn là poster, không phải ảnh chụp

Kiểm tra cả 19 ảnh thumbnail: **8 ảnh có chữ in sẵn trong ảnh** (“ORIGAMI POUCH”,
“BLOOM CHARM”, “SỔ KHÂU TAY TÁI CHẾ”, “Quà tốt nghiệp”, “100% từ vải vụn”…) —
đây là ảnh thiết kế để đăng Instagram, không phải ảnh sản phẩm.
Ảnh full-size còn nặng hơn: có logo Gem và địa chỉ web in chồng lên.

Hệ quả thực tế:

- Chỉ **11/19 ảnh dùng được** cho những chỗ có chữ đi kèm (hero, grid trang chủ) —
  vì nếu không thì tên sản phẩm hiện hai lần, một lần trong ảnh một lần dưới ảnh.
- Grid trang chủ vì thế phải chọn theo *ảnh nào sạch*, không phải theo *sản phẩm
  nào đẹp nhất*. Gối, thảm, túi đeo chéo may là sạch; Origami Pouch, Bloom Charm,
  Oxford Shirt thì không.
- Ảnh sạch nhất cũng chỉ 600×600, nên hero không phóng to quá ~440px được.

→ **Một buổi chụp ảnh tử tế sẽ cải thiện website nhiều hơn bất kỳ việc code nào.**
Chụp: không gian studio, bàn tay đang làm, sản phẩm trên nền trơn, người làm.
Dùng lại được cho cả Instagram và cho listing Klook/Airbnb (hai sàn này từ chối
listing ảnh kém). Đây cũng là thứ chặn U1 và U6 làm cho tới nơi tới chốn.

#### Đã làm trong Sprint 1

| Việc | Ghi chú |
|---|---|
| Nút “Xem lịch & đăng ký” trên thẻ Workshop | ~~Tạm trỏ `ghe-tham.html`~~ → đã trỏ `workshop.html` ở Sprint 3 |
| U1 hero có sản phẩm | Ảnh túi đeo chéo + Udon nhỏ lại, nấp ở góc, giữ nguyên easter egg |
| U2 grid thay slideshow | 6 ảnh sạch, bỏ ~55 dòng JS slideshow |
| U3 section workshop ở trang chủ | Có ảnh + CTA |
| U4 dòng “Hà Nội · 09:00–19:00” | Trong hero, ngay dưới h1 |
| U5 thanh gợi ý ngôn ngữ | Xem ghi chú ở §10 — đã đổi cách làm |
| Giỏ hàng vào `san-pham.html` | 16 thẻ có `data-sku` + `.gb-slot`; xoá `gio-hang.html`; gộp `basket.css` vào `style.css` |
| Giá | Tất cả `price: null` → hiện **“Liên hệ”**. Không có con số bịa nào lên web. |

*(Giá thật đã vào sau đó — xem “Giá từ catalog” ngay dưới Sprint 3.)*

**Lỗi phát hiện & sửa trong sprint:** `.gb-slot` ở chế độ hàng ngang làm
`min-content` của thẻ sản phẩm không co lại được → vỡ grid ở 768–1100px (thêm
`flex-wrap: wrap`); và tổng giỏ hiện “0đ” khi chưa món nào có giá — nghe như
miễn phí → đổi thành “Liên hệ”.

### Sprint 2 — Trang Bản tin tĩnh · ~1,5 ngày

- `ban-tin.html` + trang chi tiết cho 2–3 bài đầu, viết thẳng vào HTML
- Thêm vào nav (cùng lúc gộp “Về Gem” — **U + §11**)
- Nối với form đăng ký email đang có
- Cần từ bạn: nội dung + ảnh cho bài BUV và UN Youth Day

**Xong sprint này:** có nội dung SEO thật, và câu chuyện “bản tin + đăng ký email”
trở nên liền mạch.

### Sprint 3 — Supabase + Workshop · ~4 ngày · **ĐÃ XONG**

**Xong sprint này:** khách đặt lịch được, Anna quản lý được lịch từ điện thoại.

#### Database

Sáu migration trên project `gem-cham-sac` (§13b):

| Migration | Nội dung |
|---|---|
| `gem_core_tables` | `staff`, `workshop_types`, `sessions`, `bookings` |
| `gem_rls_policies` | Bật RLS mọi bảng; anon không đọc được bảng nào |
| `gem_public_view_and_booking_rpc` | View `sessions_public` + hàm `book_session` |
| `gem_grant_workshop_types_read` | `GRANT SELECT` cho `workshop_types` |
| `gem_tighten_function_grants` | Thu hồi quyền gọi `gen_booking_code` của anon |
| `gem_auto_assign_owners` | Trigger tự gán `owner` cho ba email ở §13b |
| `gem_grant_staff_table_access` | `GRANT` cho `authenticated` trên `staff`/`sessions`/`bookings` |
| `gem_me_function` | Hàm `me()` — trả đúng dòng nhân sự của người đang đăng nhập |

Hai điểm đáng nhớ:

- **`sessions_public` cố ý để `security_invoker = false`.** Nhờ vậy khách xem
  được *còn mấy chỗ* mà không hề đọc được bảng `bookings` — view tự cộng hộ.
- **`book_session` khoá dòng buổi học (`for update`) trước khi đếm chỗ.** Hai
  người bấm giữ chỗ cùng lúc thì người sau bị từ chối, không có chuyện đặt quá.

Đã seed 12 buổi (Thứ Tư 17:00, Thứ Bảy 10:00, Thứ Bảy 14:30 × 4 tuần, 8 chỗ)
và 2 loại workshop, `price: null` → web hiện “Liên hệ”.

#### Trang

| File | Ghi chú |
|---|---|
| `js/gem-db.js` | Client Supabase tự viết bằng `fetch` — **không** dùng supabase-js. Không script bên thứ ba, không CDN, đúng nguyên tắc “không build step”. |
| `js/workshop.js` | Danh sách buổi, form giữ chỗ, màn xác nhận, tải `.ics`. Giờ luôn hiện theo **giờ Hà Nội**, kể cả khách đang ở múi giờ khác. |
| `workshop.html` | Trang khách xem |
| `admin.html` + `js/admin.js` + `css/admin.css` | `noindex`, không có link từ nav. Mặc định mở tab **Hôm nay**. Mọi số điện thoại là link gọi + link Zalo. Token giữ ở `sessionStorage` → đóng tab là thoát. |

#### Lỗi phát hiện & sửa trong sprint

- **`workshop_types` anon đọc không được** dù policy RLS đã đúng — thiếu
  `GRANT SELECT` ở mức bảng. RLS lọc *dòng*, GRANT mở *cửa*; thiếu cái nào
  cũng chặn. Bài kiểm tra bảo mật phát hiện ra.
- **Seed sai giờ** (ra Thứ Năm 07:00 thay vì Thứ Tư 17:00): `date_trunc('week', …)`
  trả về **timestamptz**, nên `17:00` thành 17:00 UTC rồi `at time zone` cộng
  thêm 7 tiếng nữa, vượt qua nửa đêm. Sửa bằng cách ghép `date + time` thành
  timestamp *không* múi giờ rồi mới đổi đúng một lần.
- **Vòng lặp vô hạn i18n** (lần thứ hai gặp): `translate()` → `setLang()` →
  `gem:langchange` → vẽ lại → `translate()`. Sửa bằng cách so ngôn ngữ trước
  khi vẽ lại.

#### Hai lỗi phát hiện sau, khi đăng nhập thật

**1. Đăng nhập báo “tài khoản chưa được cấp quyền quản trị”.**
Đúng lỗi `workshop_types` hôm trước, nhưng rộng hơn. Project này để **default
privileges kiểu “cấm trước”**: bảng mới trong `public` chỉ có `Dxtm`
(TRUNCATE/REFERENCES/TRIGGER), không có `select/insert/update/delete` cho cả
`anon` lẫn `authenticated`. Nên `staff`, `sessions`, `bookings` tuy policy đúng
nhưng cửa vẫn đóng — nhân sự đăng nhập xong không đọc nổi dòng của chính mình.

*Vì sao không phát hiện sớm:* bài kiểm tra bảo mật chỉ chạy vai `anon`, mà ở vai
đó **“bị chặn” chính là kết quả đúng** — thiếu GRANT trông y hệt như bảo mật
đang hoạt động. Kiểm tra chỉ vai bị-từ-chối không phân biệt được “chặn đúng”
với “chặn tất cả”. Từ Sprint 4 trở đi, mỗi bảng mới phải kiểm **cả hai vai**.

Migration `gem_grant_staff_table_access`. Cố ý **không** grant `insert` trên
`bookings`: giữ `book_session()` là đường duy nhất tạo giữ chỗ, vì đó là chỗ có
khoá dòng và đếm chỗ.

**2. `whoAmI()` có thể trả về nhầm người.** Policy `staff_read` là `is_staff()`
— nhân sự nào cũng đọc được *toàn bộ* bảng `staff`, nên `rows[0]` là dòng
Postgres trả trước, không chắc là dòng của người đang đăng nhập. Hiện chưa gây
hại vì cả hai tài khoản đều là `owner`, nhưng khi thêm nhân viên `staff` thì
người đó có thể nhận nhầm vai `owner` và tên người khác trên giao diện. (RLS
vẫn chặn thao tác owner thật ở tầng database — sai ở giao diện, không phải lộ
dữ liệu.) Sửa bằng hàm `me()` trả đúng một dòng của người gọi; `gem-db.js` gọi
`rpc/me` thay vì đọc thẳng bảng.

Kiểm lại sau khi sửa, **ba vai**:

| | `staff` | `sessions` | `bookings` | `sessions_public` |
|---|---|---|---|---|
| `anon` | chặn ✓ | chặn ✓ | chặn ✓ | 12 buổi ✓ |
| đăng nhập, **không** phải nhân sự | 0 dòng ✓ | 0 dòng ✓ | 0 dòng ✓ | đọc được |
| đăng nhập, là nhân sự | đọc được ✓ | 12 ✓ | đọc được ✓ | đọc được |

`me()` trả đúng 1 dòng (`lgnhuyen / owner`), không phải 2.

#### Đã kiểm tra

Chạy thử với vai `anon` (đúng vai khách vào web):

- `bookings`, `sessions`, `staff` — **chặn** ✓
- `sessions_public`, `workshop_types` — đọc được, không lộ tên khách ✓
- `gen_booking_code` — **chặn** ✓
- `book_session` — đặt được; từ chối đúng khi buổi đầy / buổi đã qua / thiếu
  số liên lạc / số chỗ vô lý ✓
- Sức chứa: 8 chỗ → đặt 3 (còn 3) → từ chối 5 → đặt 3 (còn 0) → từ chối 1 ✓

Giao diện admin kiểm ở 390px và 1100px: không tràn ngang, không lỗi console.

> ⚠️ Sandbox của Claude chặn `supabase.co`, nên **đường mạng thật chưa chạy thử
> từ trình duyệt được** — phần database kiểm qua kết nối Supabase trực tiếp,
> phần giao diện kiểm bằng dữ liệu giả. Việc đầu tiên khi bạn mở
> `workshop.html` thật: xem danh sách buổi có hiện lên không.

#### Sửa sau khi Anna dùng thử

**Thẻ “Đã giữ chỗ” lệch sang trái.** `.ws-done` và `.ws-form-wrap` có
`max-width` nhưng thiếu `margin-inline: auto` — khung ngoài căn giữa, còn thẻ
bên trong thì nằm sát trái. Giờ lệch 0px ở 320 / 390 / 1280px.

**Lịch dàn thành 12 thẻ giống hệt nhau.** Đây là câu hỏi thiết kế, không phải
lỗi. Ba việc đã làm:

1. **Tách “loại workshop” khỏi “lịch”.** Mô tả, thời lượng và giá giờ nằm ở
   phần loại trên đầu — nói một lần cho mỗi loại. Trước đây mỗi thẻ buổi đều
   chép lại nguyên đoạn mô tả, nên 12 buổi của 2 loại trông như 12 bản sao.
   Mỗi dòng lịch giờ chỉ còn: giờ · tên · còn mấy chỗ · nút.
2. **Gom theo tuần rồi theo ngày.** Tiêu đề “Tuần này” / “Tuần sau”, sau đó là
   khoảng ngày. Thứ Bảy có hai buổi thì hai buổi nằm chung dưới một ngày, thay
   vì lặp lại ngày hai lần.
3. **Mã màu theo loại** — viền trái và số giờ đổi màu, năm màu trong bảng màu
   vintage của Gem, gán theo `slug` nên một loại luôn giữ đúng một màu qua các
   tuần.

Kết quả: mỗi buổi cao **84px** thay vì 138px trên điện thoại 390px.

**Vì sao không làm lịch dạng tháng** (dù bạn có hỏi): mỗi tuần chỉ có 3 buổi,
nên lưới 7 cột trên màn 375px cho ra ô ~50px mà gần hết là ô trống — rất nhiều
khung viền cho rất ít thông tin. Câu hỏi của khách là “buổi nào mình đi được?”,
danh sách gom nhóm trả lời thẳng, còn lưới bắt họ đi tìm. Lưới tháng cũng cần
nút qua lại giữa các tháng trong khi lịch chỉ mở trước ~4 tuần. Nếu sau này một
tuần có 6–8 buổi thì tính lại — lúc đó lưới bắt đầu có lý.

**Token khoảng cách thiếu.** `--space-5` và `--space-10` chưa từng được định
nghĩa; dùng tới là cả dòng CSS bị bỏ, mất luôn khoảng cách. Đã bổ sung vào
`:root` cho đủ thang đo (1.25rem và 2.5rem, đúng nhịp 0.25rem sẵn có). Hai chỗ
cũ dùng `var(--space-5, 1.25rem)` có fallback nên giá trị không đổi.

#### Còn lại của Sprint 3 — việc của bạn

1. Vào Supabase → **Authentication → Users → Add user**, tạo ba tài khoản
   (§13b) kèm mật khẩu. Trigger tự gán vai `owner`, không phải làm gì thêm.
2. Mở `admin.html`, đăng nhập thử.
3. Merge nhánh vào `main` — chưa merge thì chưa có gì lên `gemchamsac.com`.

### Giá từ catalog

Đã lấy giá thật từ `Gem_Catalog.pdf` cho **11/16** sản phẩm. Năm món chưa có
trong catalog vẫn `price: null` → “Liên hệ”: bìa sổ, dây đeo cổ tay, thảm (hàng
đặt theo yêu cầu), gốm, set quà.

Catalog có giá theo **khoảng** (“120.000–200.000đ”), nên `basket.js` thêm
`priceMax`. Tổng giỏ khi có món giá khoảng hiện **“từ …đ”** thay vì một con số
giả vờ chính xác.

### Sprint 4 — Sản phẩm & Đơn hàng · **ĐÃ XONG**

**Xong sprint này:** em gái bạn tự sửa giá, bật/tắt hàng, xử lý đơn — không
cần mình.

#### Database

| Migration | Nội dung |
|---|---|
| `gem_products_and_orders` | `products`, `orders`, `order_items` + `gen_order_code()` |
| `gem_products_orders_rls` | RLS **và** GRANT cho cả `anon` lẫn `authenticated` |
| `gem_create_order_rpc` | Hàm `create_order()` |
| `gem_settings_and_payment` | Bảng `settings` (khoá `payment`) — Sprint 5 |
| `gem_create_order_payment_method` | `create_order()` nhận thêm cách trả tiền + kiểm ngưỡng — Sprint 5 |

Ba điểm đáng nhớ:

- **`order_items` chép lại giá tại thời điểm đặt.** Đã thử: đổi Origami Pouch
  từ 66.000 lên 99.000 → đơn cũ vẫn 66.000. Đổi bảng giá không bao giờ làm sai
  đơn đã đặt.
- **`create_order()` luôn tra giá từ bảng, không nhận giá từ trình duyệt.**
  Trình duyệt chỉ gửi `sku` và số lượng. Tin giá client gửi lên thì ai cũng đặt
  được đơn 0đ — đây là lỗ hổng kinh điển của giỏ hàng.
- **Cố ý không `grant insert` trên `orders`.** Đơn chỉ sinh qua `create_order()`,
  nơi có kiểm tra đầu vào và tra giá.

**Khách không đọc được đơn hàng, kể cả đơn của chính mình.** Không có tài khoản
khách nên không có cách nào chứng minh “đơn của tôi” — hễ tra được đơn người
khác là lộ tên, số điện thoại, địa chỉ của cả cửa hàng. Khách tra đơn thì nhắn
Zalo kèm mã đơn, đúng cách đang làm với giữ chỗ workshop.

#### Trang Sản phẩm

`basket.js` đọc giá thật từ Supabase; `CATALOG` trong file thành **bản dự
phòng** — mất mạng hay Supabase trục trặc thì trang vẫn chạy với giá đã biết
thay vì trắng trơn. Trang vẽ ngay bằng bản dự phòng rồi cập nhật khi database
trả lời, nên không phải chờ mạng mới thấy gì.

- Hàng `in_stock = false` → nút mờ đi, không bấm được
- Hàng bị ẩn hoặc gỡ khỏi bảng → giấu luôn thẻ, và bỏ khỏi giỏ nếu đang có
- Đặt xong hiện **mã đơn** (`GD` + 5 ký tự) để khách nhắn Zalo hỏi cho nhanh
- Mất mạng giữa lúc gửi → rơi về mở app email, không nuốt đơn của khách

#### Trang quản trị

**Đơn hàng:** lọc Cần xử lý / Xong / Tất cả; mỗi đơn có số điện thoại bấm gọi +
Zalo, từng món kèm giá đã chốt, và **một nút cho bước tiếp theo** (Mới → Đã xác
nhận → Đang gói → Đã gửi → Xong).

**Sản phẩm:** gom theo danh mục; sửa giá tại chỗ (ô “Giá” và ô “đến” cho hàng
bán theo khoảng, để trống = “Liên hệ”); bật/tắt còn hàng và đang bán bằng một
chạm. Hàng đang ẩn hiện mờ + viền đứt.

#### Đã kiểm tra

Vai `anon`: đọc được `products`, đặt được đơn, **không** đọc được `orders` /
`order_items` (chặn ngay ở cửa bảng). Sáu lần đặt đơn hỏng — thiếu tên, thiếu
số điện thoại, giỏ rỗng, sku bịa đặt, số lượng âm, số lượng 9999 — đều bị từ
chối đúng và **không để lại đơn cụt nào**.

#### Chưa làm, cần biết

- **Thêm sản phẩm mới qua admin chưa có.** Sửa giá, ẩn/hiện, còn/hết thì được.
  Thêm món mới cần cả ảnh, thư viện ảnh, vị trí trong danh mục — nên vẫn phải
  sửa `san-pham.html`. Việc này để Sprint 6.
- **Storage cho ảnh chưa dựng.** Ảnh vẫn nằm trong repo, cột `image` giữ đường
  dẫn tương đối. Cột này chịu được cả URL Storage nên sau này chuyển được mà
  không phải sửa bảng.

### Sprint 5 — Thanh toán COD + QR · **ĐÃ XONG**

#### `js/vietqr.js` — tự sinh mã QR, không gọi ai

Mã QR mang số tài khoản, số tiền và mã đơn. Gọi sang dịch vụ sinh QR bên ngoài
là đưa dữ liệu thanh toán cho bên thứ ba, và thêm một chỗ có thể chết vào đúng
lúc khách đang đứng chờ trả tiền. File này không gọi mạng, không phụ thuộc gì,
chạy được cả khi mất mạng — đúng nguyên tắc “không build step, không script bên
thứ ba” của dự án.

**Đã kiểm tra kỹ vì đây là chỗ dính đến tiền:**

- Bộ mã hoá QR so khớp **từng ô** với thư viện chuẩn (Python `qrcode`):
  **536/536 trường hợp khớp tuyệt đối**, qua 20 phiên bản × 4 mức sửa lỗi ×
  8 mặt nạ.
- Lỗi bắt được nhờ phép so này: bảng vị trí ô căn chỉnh của phiên bản 18 ghi
  80 thay vì 82. Một số sai, cả mã QR hỏng — mà mắt thường không thể thấy.
- CRC-16/CCITT-FALSE khớp giá trị kiểm tra chuẩn (`"123456789"` → `29B1`).
- Hai chuỗi VietQR (tĩnh và động) sinh ra **trùng khít** chuỗi đã ghi ở §13b.

#### Luồng khách

Chọn **Trả khi nhận hàng** hoặc **Chuyển khoản QR** ngay trong form đặt hàng.
Chọn QR thì màn cảm ơn hiện mã QR có sẵn số tiền và mã đơn.

**Một chi tiết dễ bỏ sót:** khách thường mở web trên chính điện thoại của mình,
nên không quét được mã hiện trên màn hình đó. Vì vậy màn này luôn kèm ngân
hàng / số tài khoản / chủ tài khoản / số tiền / nội dung ở dạng **bấm-là-chép**,
và một dòng nhắc họ có thể chụp màn hình rồi quét từ ảnh. Số tiền hiện
“185.000đ” cho dễ đọc nhưng chép ra `185000` — app ngân hàng không nhận dấu
chấm và chữ đ.

#### Ngưỡng bắt buộc chuyển khoản

Bảng `settings`, khoá `payment`. **Mặc định đang tắt (`prepay_threshold = 0`)**
— đơn nào cũng chọn COD được, vì bạn chưa chốt có đặt ngưỡng hay không (§14).
Đặt số > 0 là đơn từ mức đó trở lên phải chuyển khoản trước.

Kiểm ở **hai tầng**: trình duyệt khoá nút COD cho khách biết sớm, database từ
chối là chỗ thật. Đơn to chọn COD thì **từ chối chứ không im lặng đổi hộ** sang
QR — đổi hộ là khách tưởng trả khi nhận rồi đến lúc giao mới bị đòi trả trước.

Đã thử với ngưỡng 500.000đ: đơn 66.000 COD qua ✓, đơn 1.080.000 COD bị từ chối
✓, cùng đơn đó chọn QR thì qua ✓.

#### Trang quản trị

Thêm bộ lọc **“Chờ tiền”** (đơn chuyển khoản chưa thấy tiền về, có đếm số) và
nút **“Đã nhận tiền”** trên từng đơn. Web không tự biết tiền đã về — mở app
ngân hàng, thấy nội dung chuyển khoản trùng mã đơn, rồi bấm nút.

#### Còn lại — việc của bạn

- [ ] Chuyển khoản thật một đơn nhỏ, xem mã QR quét có ra đúng số tiền + mã đơn
- [ ] Quyết định có đặt ngưỡng bắt buộc chuyển khoản không, và bao nhiêu

### Bản tin — **ĐÃ XONG**

Bảng `posts` + kho ảnh `gem-media` trên Supabase Storage. Anna viết bài, tải
ảnh, bấm đăng — không cần sửa code.

`ban-tin.html` + `js/ban-tin.js`: danh sách bài và đọc một bài trên cùng một
trang. Mở bài thì địa chỉ đổi thành `?bai=<slug>` nên **gửi link cho nhau
được**, và nút Back của trình duyệt quay lại danh sách đúng như người dùng
mong đợi. Slug giữ nguyên khi sửa bài, kẻo link đã gửi thành hỏng.

**Chữ do người dùng gõ không bao giờ vào `innerHTML`.** Mỗi đoạn thành một
`<p>` bằng `textContent`. Nội dung bài là chữ Anna nhập trong trang quản trị —
ghép thẳng vào HTML là mở cửa cho mã lạ chạy trên trang.

Kho ảnh `gem-media`: **đọc thì ai cũng được** (ảnh nằm trên trang công khai),
**tải lên thì chỉ nhân sự**. Đã thử vai `anon`: bị chặn ở tầng RLS
(`new row violates row-level security policy`). Thiếu policy đó là ai cũng
tải file lên kho của bạn được — vừa tốn tiền vừa thành chỗ chứa rác.

Mục **Bản tin** trong trang quản trị: viết/sửa/xoá bài, tải ảnh bìa và ảnh
trong bài, bật tắt đăng. Bài chưa đăng hiện mờ + viền đứt.

> ⚠️ **Đường tải ảnh lên chưa chạy thử thật.** Sandbox chặn `supabase.co` nên
> mình chỉ kiểm được phần giao diện bằng dữ liệu giả. Việc đầu tiên cần thử:
> tải một ảnh bìa lên xem có hiện ra không.

### Sprint 6 — UX đợt 2 · **ĐÃ XONG (trừ phần chờ ảnh)**

| | Việc | Kết quả |
|---|---|---|
| U6 | Ảnh thật cho trang Câu chuyện | **Chưa làm — chờ buổi chụp ảnh** |
| U7 | Căn trái đoạn dài ở Câu chuyện | Câu trích dài chuyển sang căn trái có vạch bên trái. Căn giữa để dành cho câu ngắn kiểu khẩu hiệu — đoạn dài mà căn giữa thì mỗi lần xuống dòng mắt lại phải dò tìm điểm bắt đầu |
| U8 | Bỏ lặp “Ba điều chúng mình giữ” | Bỏ khỏi Câu chuyện, giữ ở trang chủ |
| U9 | Badge “Season 02” ở mobile | Xem ghi chú bên dưới |
| U10 | Vùng bấm 44px | Icon mạng xã hội ở footer: 36px → 44px |
| U11 | Bỏ số 01–04 ở phần cam kết | Bốn việc song song, không phải bốn bước — đánh số gợi ý sai thứ tự. MISSION/VISION giữ vì đó là nhãn thật |
| U12 | `loading="lazy"` | Thêm cho 7 ảnh; ảnh hero giữ `eager` |

**Badge “Season 02” — đổi cách làm giữa chừng.** Ý ban đầu là cho badge hiện
inline ở mobile. Nhưng thêm mục “Bản tin” là nav có 6 mục, mà khung nav chốt ở
`--container-max` nên màn rộng thêm cũng không có thêm chỗ: badge inline đẩy
nút VI/EN xuống hàng ở **mọi** khổ desktop. Nên chuyển badge thành **dải mảnh
dưới thanh nav ở mọi khổ màn hình** — dễ thấy hơn hẳn, nhất quán, và nav thêm
mục nữa cũng không vỡ.

Nhân tiện bắt được một lỗi của chính mình: dải badge đầu tiên dùng
`width: 100%` cộng padding, rộng hơn hàng nên đẩy cả trang tràn ngang ở
960–1100px. Đổi sang `flex: 1 0 100%`.

### Thêm / xoá / sửa buổi workshop và sản phẩm — **ĐÃ XONG**

Sót lớn: `createSession`, `createProduct`, `workshopTypes` đã viết trong
`gem-db.js` từ Sprint 3–4 nhưng **chưa hề được nối vào giao diện**. Tầng dữ
liệu có, nút bấm thì không.

**Hệ quả đáng lẽ phải thấy sớm:** database seed 12 buổi = 4 tuần. Hết 4 tuần
là trang Workshop trống trơn và Anna không có cách nào thêm buổi.

#### Buổi workshop

Form “+ Thêm buổi” tạo **nhiều tuần một lúc**: chọn loại, ngày đầu, giờ, số
chỗ, rồi lặp lại 1/2/4/6/8/12 tuần. Có dòng xem trước (“Tạo 4 buổi, Thứ Tư
hằng tuần lúc 17:00, từ 16/09 đến 07/10”) để thấy sai trước khi bấm. Nếu mỗi
lần thêm phải nhập từng buổi thì rất dễ quên, và trang Workshop sẽ lặng lẽ
trống.

Giờ nhập vào ghép kèm `+07:00`, nên luôn là giờ Hà Nội bất kể máy người nhập
đặt múi giờ nào. Việt Nam không đổi giờ mùa nên một mốc cố định là đủ.

**Xoá buổi được chặn hai lớp.** `bookings.session_id` là `ON DELETE CASCADE`:
xoá một buổi là xoá luôn danh sách người đã đặt, không dấu vết. Nhân sự bấm
nhầm một lần là mất sạch tên và số điện thoại khách.

- Giao diện: nút “Xoá buổi” chỉ hiện khi chưa ai đặt
- Database: trigger `sessions_guard_delete` từ chối kèm câu giải thích rõ
  (“Buổi này đã có 2 người đặt chỗ. Đóng buổi thay vì xoá…”)

Chặn ở database mới là thật — giao diện có thể bị sửa, bị bỏ qua, hoặc bị gọi
thẳng qua API. Đã thử: đặt 2 chỗ rồi xoá → bị chặn, buổi và người đặt còn nguyên.

#### Loại workshop

Mục gấp mở ngay dưới lịch (cùng tab — chúng đi liền nhau, mà thêm tab nữa thì
thanh tab trên điện thoại đã chật). Sửa tên VI/EN, mô tả, thời lượng, giá;
bật/tắt hiện; tạo loại mới. Loại mới tạo ở **dạng ẩn** để Anna điền xong mới
cho hiện.

#### Sản phẩm

Form đầy đủ: tên VI/EN, danh mục, mã hàng, mô tả, giá (kèm giá khoảng), ảnh
tải lên Storage, còn hàng, đang bán. Thêm mới và xoá được.

**Mã hàng khoá lại khi sửa** — nó nối sản phẩm với thẻ trên `san-pham.html` và
với các đơn đã đặt. Mã trùng báo bằng tiếng người (“Mã hàng ‘x’ đã có rồi”)
thay vì để lộ câu lỗi của Postgres.

Xoá sản phẩm **không** làm hỏng đơn cũ: `order_items.product_id` là
`ON DELETE SET NULL`, còn tên và giá thì đã chép sang `order_items` lúc đặt.

> **Món mới thêm ở đây vào được giỏ hàng và đơn hàng, nhưng chưa có thẻ riêng
> trên trang Sản phẩm** — thẻ đó nằm trong HTML cùng ảnh và thư viện ảnh. Ghi
> chú này hiện ngay trên đầu danh sách trong trang quản trị.

### Nút lưu ảnh QR — **ĐÃ XONG**

`GemVietQR.png()` vẽ mã thẳng từ ma trận lên canvas rồi xuất PNG (636×636,
mỗi ô 12px). **Không đi đường SVG → ảnh:** nạp SVG vào `<img>` thì một số
trình duyệt đánh dấu canvas là “nhiễm bẩn” và chặn `toBlob`, nên đường đó hay
chết đúng lúc cần.

**Trên iPhone, nút tải xuống lưu vào Tệp chứ không vào Ảnh — mà app ngân hàng
lại đọc từ Ảnh.** Nên nút này ưu tiên bảng chia sẻ của máy (`navigator.share`
với file) vì bảng đó có “Lưu vào Ảnh”; máy nào không có thì tải xuống như
thường.

Đã kiểm bằng cách **đọc ngược ảnh khách tải về**: giải nén PNG, dựng lại ma
trận, đọc mặt nạ từ thông tin định dạng, rồi so với ma trận thư viện chuẩn
sinh ra từ chuỗi mong đợi → **0 ô lệch**. Nghĩa là ảnh tải về quét ra đúng số
tiền và đúng mã đơn.

### Trang giới thiệu workshop — **ĐÃ XONG**

Bấm vào thẻ loại workshop mở trang riêng tại `?loai=<slug>` — gửi link cho
nhau được, nút Back của trình duyệt quay lại lịch.

Cột mới trên `workshop_types`: `long_vi/en` (giới thiệu dài), `what_vi/en`
(“Bạn sẽ làm gì”), `note_vi/en` (“Cần biết trước”), `cover`, `images`. Cách
nhập: mô tả dài cách đoạn bằng dòng trống, hai mục kia mỗi dòng một ý — không
cần biết HTML.

Trang gồm: ảnh bìa, tên, thời lượng + giá, giới thiệu dài, hai ô thông tin,
thư viện ảnh, và **danh sách buổi sắp tới của đúng loại đó** kèm nút giữ chỗ.
Vào form giữ chỗ từ đây thì nút “Quay lại” trả về chính trang giới thiệu, chứ
không nhảy về lịch chung — mất chỗ đang đọc là bực.

Nội dung dài **không** nhét vào `sessions_public`: làm thế là chép nguyên bài
giới thiệu lên từng buổi. Trang gọi thêm một lượt `workshop_types` cho nhẹ.

Chữ do người viết gõ dựng bằng `textContent`, không ghép vào `innerHTML`.

> **Nội dung hiện tại là bản tạm.** Mình viết sẵn hai bài đúng giọng Gem để
> Anna sửa lại chứ không phải viết từ đầu — cuối mỗi bài có ghi “(Đây là nội
> dung tạm)”. Sửa trong **Quản trị → Đặt lịch → Loại workshop**. Chưa có ảnh
> bìa và ảnh trong bài, tải lên ở cùng chỗ đó.

### Chưa làm — cần biết

- **Nén ảnh sản phẩm.** `loading="lazy"` đã thêm, nhưng ảnh gốc vẫn nặng
  (`gom-1.jpg` 3 MB, vài ảnh 1,5–2,3 MB). Nén thật cần chạy công cụ trên ảnh
  gốc — nên làm cùng lúc với ảnh mới từ buổi chụp.
- **Thêm sản phẩm mới qua admin** (Sprint 4 để lại) — cần cả ảnh, thư viện
  ảnh, vị trí trong danh mục.

---

## 13b. Thông tin cấu hình

### Liên hệ

| | |
|---|---|
| Email shop | `gemchamsac@gmail.com` (đã vào `js/basket.js`) |
| Điện thoại / Zalo | `(84) 82 496 4996` |
| Messenger | `m.me/gemchamsac` |

### Tài khoản nhận tiền — cho VietQR (Sprint 5)

| | |
|---|---|
| Ngân hàng | Techcombank |
| Mã ngân hàng (BIN) | `970407` — *quét thử một lần để xác nhận* |
| Số tài khoản | `9607060038` |
| Chủ tài khoản | HO KINH DOANH GEM CHAM SAC |

Số tài khoản này **không phải bí mật** — nó sẽ nằm trong QR trên web và dán ở
quầy. Nhưng repo là public, nên cứ biết là nó công khai theo đúng nghĩa đen.

**Chuỗi VietQR tĩnh** (bằng đúng 2 ảnh QR hiện có — không có số tiền, không có mã đơn):

```
00020101021138540010A00000072701240006970407011096070600380208QRIBFTTA53037045802VN6304803C
```

**Chuỗi động** (ví dụ 185.000đ, mã đơn `GEMA7K3`) — đây là thứ Sprint 5 sinh ra cho từng đơn:

```
00020101021238540010A00000072701240006970407011096070600380208QRIBFTTA530370454061850005802VN62110807GEMA7K363041024
```

Cấu trúc: chuẩn EMVCo (NAPAS bản địa hoá thành VietQR), ghép theo
`thẻ(2) + độ dài(2) + giá trị`, kết thúc bằng CRC-16/CCITT-FALSE.
Hai trường quan trọng: `54` = số tiền, `6208` = nội dung chuyển khoản (mã đơn).
Trường `01` = `11` là QR tĩnh, `12` là QR cho một đơn.

**Quy tắc mã đơn:** chỉ chữ HOA + số, 7–10 ký tự, bỏ O/0 và I/1 cho dễ đọc
qua điện thoại, không dấu tiếng Việt (nhiều ngân hàng cắt dấu). Dạng `GEM` + 4 ký tự.

### Supabase

| | |
|---|---|
| Project | `gem-cham-sac` |
| Ref / ID | `dxdovvqsfjeizsoprrfn` |
| URL | `https://dxdovvqsfjeizsoprrfn.supabase.co` |
| Region | `ap-southeast-1` (Singapore) |
| Postgres | 17 |
| Publishable key | `sb_publishable_jRv5IBMv5j7OAs1-x15IDw_DJ_HZqZs` |

Publishable key **được thiết kế để lộ ra ngoài** — nó nằm trong JavaScript của
trang, ai xem source cũng thấy. Cái bảo vệ dữ liệu là RLS trong database
([§12](#12-bảo-mật)), không phải việc giấu key này.

⚠️ **Không bao giờ đưa `service_role` key vào repo hay vào trang web.** Key đó
bỏ qua toàn bộ RLS.

**Trạng thái:** 4 bảng + 1 view + 1 hàm, RLS bật hết, đã seed 12 buổi workshop
(Sprint 3). Client đọc/ghi qua `js/gem-db.js`.

### Chủ tài khoản quản trị

Cả ba là `owner`. Chưa có ai là `staff` — thêm khi tuyển người.

- `gemchamsac@gmail.com`
- `lgnhuyen@gmail.com`
- `luongnguyenngocmai00@gmail.com`

Trigger `gem_auto_assign_owners` tự gán vai `owner` khi một trong ba email này
được tạo trong Authentication — **chưa tạo tài khoản thì chưa đăng nhập được**.
Thêm người sau: tạo user trong Supabase rồi thêm một dòng vào bảng `staff` với
`role = 'staff'`.

---

## 14. Còn phải chốt

### Chặn Sprint 1–2

- [ ] **Đồng ý gộp nav “Về Gem”?** (§11)
- [ ] **Nội dung + ảnh** cho 2–3 bài Bản tin đầu (BUV, UN Youth Day)

### Chặn Sprint 3

- [x] **Ai là `owner`** — ba email, xem §13b ✓
- [x] **Email chính thức của shop** — `gemchamsac@gmail.com` ✓
- [x] Tạo tài khoản trong Supabase Authentication — đã tạo
      `gemchamsac@gmail.com` và `lgnhuyen@gmail.com`, cả hai đã có vai `owner` ✓
- [ ] Tài khoản thứ ba `luongnguyenngocmai00@gmail.com` — **chưa tạo**

### Chặn Sprint 4–5

- [x] Giá 11/16 sản phẩm — từ catalog ✓
- [ ] Giá 5 món còn lại (bìa sổ, dây đeo cổ tay, thảm, gốm, set quà) — không
      chặn, để “Liên hệ” cũng chạy được
- [x] Số tài khoản ngân hàng + tên chủ tài khoản — Techcombank 9607060038 ✓
- [ ] Có đặt ngưỡng bắt buộc chuyển khoản thay COD không, và bao nhiêu
- [ ] Dùng đối tác giao hàng nào cho COD (GHTK / GHN / Viettel Post / J&T)

### Không chặn, điền sau được

- [ ] Ba giờ cố định mỗi tuần — giữ đề xuất hay đổi
- [ ] Các loại workshop, thời lượng, giá
- [ ] Ảnh cho trang Câu chuyện (U6) và hero trang chủ (U1)

### Việc ngoài web

- [ ] **Mở máy POS ở ngân hàng** — nên làm sớm, đây là cách phục vụ khách nước ngoài
- [ ] Có đăng lên Klook / Airbnb Experiences không
- [ ] Tranh vẽ 16 sprite sản phẩm (không chặn gì — hình tạm vẫn chạy)

---

## 15. Không làm

Ghi ra để khỏi bàn lại:

- **Cổng thẻ quốc tế trên web** — hoãn (§4). Khách nước ngoài trả bằng thẻ **tại
  studio qua máy POS**.
- **Casso / SePay đối soát chuyển khoản tự động** — Anna kiểm tra tay trước (§4)
- Email xác nhận & nhắc lịch **tự động** — Zalo tay trước (D13)
- Khách tự huỷ đặt lịch trên web — nhắn Zalo là đủ ở lượng này
- Danh sách chờ khi buổi đủ chỗ
- Tự động trừ tồn kho sản phẩm (D7)
- Tài khoản cho **khách** (chỉ có tài khoản nhân sự)
- Tự động sinh buổi học theo tuần (Anna đăng tay ~2 phút/tháng)
- Generator render bài Bản tin thành HTML tĩnh (§9)
- Đổi host sang Vercel / Netlify — **không cần** (§3.3)
- Framework, build step, Tailwind, React — vẫn KHÔNG (`CLAUDE.md`)

---

## 16. Cần cập nhật `CLAUDE.md`

Sau khi các sprint xong, những chỗ này trong `CLAUDE.md` đã lỗi thời:

- “KHÔNG hiện giá sản phẩm trên web” → đã đảo (D3)
- “KHÔNG có e-commerce, KHÔNG có cart” → đã có giỏ hàng
- “5 trang chính + `season-02.html`” → thêm `workshop.html`, `ban-tin.html`, `admin.html`
- Thêm Supabase vào phần Architecture & Tech
- Cập nhật lại phần “Active tasks”
