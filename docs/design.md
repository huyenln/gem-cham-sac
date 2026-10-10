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

### Lưu loại workshop báo "permission denied" — **ĐÃ SỬA**

Bấm **Lưu** trong Quản trị → Đặt lịch → Loại workshop trả về
`permission denied for table workshop_types`. **Lần thứ ba dính đúng cái bẫy
GRANT.** Policy `wt_write_owner` (`ALL`, `is_owner()`) đã đúng từ đầu, nhưng
bảng chỉ được `GRANT SELECT` ở Sprint 3 — lúc đó chỉ cần khách *đọc*. Commit
thêm giao diện sửa loại workshop kèm policy ghi, nhưng không kèm migration
GRANT. Policy lọc **dòng**, GRANT mở **cửa**.

Chữ trong lỗi phân biệt được hai tầng — đáng nhớ để lần sau đọc là biết ngay:

| Câu lỗi | Tầng chặn |
|---|---|
| `permission denied for table X` | thiếu **GRANT** |
| `new row violates row-level security policy` | **RLS** chặn (INSERT) |
| không lỗi, sửa 0 dòng | **RLS** chặn (UPDATE/DELETE) |

Migration `gem_grant_workshop_types_write`: `grant insert, update, delete`, kèm
trigger `workshop_types_guard_delete`. Khoá ngoại `sessions.workshop_type_id`
là `ON DELETE RESTRICT` nên xoá loại còn buổi sẽ phun tên constraint bằng tiếng
Anh; trigger chặn sớm và trả câu tiếng Việt, y như `sessions_guard_delete`.

`workshop_types` **cố ý** để `is_owner()` chứ không `is_staff()` như
`products`/`posts` — chỉ chủ mới sửa được loại workshop.

#### Câu kiểm để không dính lần thứ tư

Chạy sau **mỗi** migration. Nó liệt kê mọi bảng có policy cho phép một lệnh mà
GRANT lại không cho — nhanh hơn kiểm ba vai bằng tay, và bắt đúng lỗi này:

```sql
select distinct r.grantee, p.tablename, c.priv
from pg_policies p
cross join lateral unnest(
  case p.cmd when 'ALL' then array['SELECT','INSERT','UPDATE','DELETE']
             else array[p.cmd] end) as c(priv)
cross join lateral unnest(p.roles) as r(grantee)
where p.schemaname='public'
  and r.grantee in ('anon','authenticated')
  and not has_table_privilege(r.grantee, 'public.'||p.tablename, c.priv);
```

Hiện còn đúng hai dòng, **cả hai đều cố ý**: `orders`/`order_items` không có
`INSERT` vì `create_order()` (SECURITY DEFINER) là đường duy nhất tạo đơn —
giống `bookings` với `book_session()`. Muốn câu kiểm về 0 dòng cho dễ đọc thì
tách `or_staff_all`/`oi_staff_all` từ `ALL` thành ba policy
`SELECT`/`UPDATE`/`DELETE`, đúng kiểu `bookings` đang làm. Chưa làm.

#### Đã kiểm — ba vai

| vai | ghi `workshop_types` |
|---|---|
| `anon` | `permission denied` — chặn ở GRANT ✓ |
| đăng nhập, không phải owner | `violates row-level security policy` — chặn ở RLS ✓ |
| owner | insert + update + delete đều chạy ✓ |
| owner xoá loại còn 8 buổi | trả câu tiếng Việt ✓ |

Giao diện kiểm ở 375 / 768 / 1440px: không tràn ngang, nút Xoá cao 44px. Ba
nhánh của nút: huỷ confirm (không gọi database), xoá được (toast thường, tải
lại danh sách), database chặn (toast đỏ đúng câu của database, nút bấm lại
được).

### Chưa làm — cần biết

- **Nén ảnh sản phẩm.** `loading="lazy"` đã thêm, nhưng ảnh gốc vẫn nặng
  (`gom-1.jpg` 3 MB, vài ảnh 1,5–2,3 MB). Nén thật cần chạy công cụ trên ảnh
  gốc — nên làm cùng lúc với ảnh mới từ buổi chụp.
- ~~Thêm sản phẩm mới qua admin~~ — xong 10/2026, xem "Sản phẩm + thư viện ảnh
  từ database". Còn thiếu: tạo **danh mục** mới vẫn cần HTML + `CATEGORIES`.

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

**Studio Gem 2D — Tủ sưu tầm** (migration `gem_claim_collection_rpc`): hàm
`claim_collection(p_code, p_phone)`, `security definer`, chỉ `execute` cho
`anon` + `authenticated`. Cần **đúng mã đơn VÀ khớp 9 số cuối SĐT** mới trả
về, và chỉ trả `{ ok, code, received, items:[sku] }` — không tên, không địa
chỉ, không giá. Đơn `cancelled` không lấy được. Tủ lưu ở `localStorage['gem-tu']`
trên máy khách, không lưu SĐT. Đã kiểm vai `anon`: sai định dạng → `bad_input`,
sai SĐT → `not_found`, đúng → danh sách sku (thử trong transaction rồi rollback).
Rủi ro còn lại: đoán được mã đơn + SĐT của người khác thì thấy họ mua món gì —
chấp nhận được cho bản thử; nếu lên menu chính thì cân nhắc giới hạn số lần thử.

**Nguồn đơn** (không dùng analytics): `js/basket.js` thêm dòng cuối vào ghi
chú đơn `[nguồn: studio | san-pham | link-chia-se | web]` (lấy từ
`<body data-order-source>`, link chia sẻ `studio.html?d=` ghi đè trong phiên).
Đếm bằng `select count(*) from orders where note like '%[nguồn: studio]%'`.
Chưa thành cột riêng vì phải thay hàm `create_order` đang chạy — làm khi số
liệu cho thấy đáng.

**Bảng lời nhắn** (migration `gem_notes_wall`): bảng `notes` (body ≤ 280,
name ≤ 40, status `pending | approved | hidden`). Khách gửi **chỉ qua**
`post_note()` (security definer; không grant insert). Khách đọc được lời
`approved` (RLS). Nhân sự (`is_staff()`) đọc tất cả, đổi `status`, xoá — tab
"Lời nhắn" trong `admin.html`. Chặn xả rác: ô bẫy cho bot, 60 giây/lần trên
mỗi máy, và hàm từ chối khi có ≥ 30 lời chờ duyệt trong 10 phút. Hiển thị chỉ
bằng `textContent` / `esc()`.
Đã kiểm ba vai (trong transaction, rollback): `anon` gửi được qua hàm, insert
thẳng / update → `permission denied`, không thấy lời chờ duyệt; đăng nhập
không phải nhân sự → không thấy lời chờ, update 0 dòng; nhân sự → thấy hết,
duyệt được, sau đó `anon` thấy lời đã duyệt.
Câu kiểm GRANT-vs-policy giờ báo thêm `authenticated / notes / UPDATE` —
**cố ý**: GRANT update chỉ mở cột `status` (column-level), câu kiểm chỉ nhìn
quyền cả bảng.

### Bàn thiết kế v2 (góp ý đợt 1 — đợt B)

Bỏ kiểu "tô từng ô" (v1). Thiết kế giờ là **bản yêu cầu cho thợ**: món, kiểu
ghép (Ô vuông / Nhà gỗ / Ngôi sao / Chong chóng; dây buộc tóc: Một tấm / Ghép
hai vải; "Theo hình mình vẽ"), tông màu (tối đa 2), họa tiết (chọn nhiều), chất
vải (chọn nhiều + ô "Khác"), hình tự vẽ (lưới 64×64, 4 màu bút, tối đa 700
điểm) và ghi chú (≤ 200 chữ). Mục nào cũng có "Để Gem chọn", nên đặt được ngay
— chỉ kiểu "Theo hình mình vẽ" mới cần vẽ vài nét.

Mã thiết kế (trong link `studio.html?d=`, giỏ hàng, ghi chú đơn):
`2~món~kiểu~tông~họa tiết~chất vải~khác~hình vẽ~ghi chú`. Mọi phần trừ "khác"
và "ghi chú" đều so với bảng trong `js/patch.js`; hai phần chữ tự do được
mã hoá phần trăm, giới hạn độ dài, và chỉ hiển thị qua `textContent` / `esc()`.
Mã v1 cũ không đọc được nữa — giỏ và tủ tự bỏ (đã chốt: không chuyển đổi).

Bốn kiểu ghép hiện là **tạm**, chờ ảnh mẫu ghép vải của mẹ Mai để thay.

### Tranh nhân vật (4 bạn) — cách đưa tranh mới vào

Nguồn: `ch-pN-dung` (đứng: trước / nghiêng / ¾), `ch-pN-di` (đi, 4 khung),
`ch-pN-day-xe` (đẩy xe, 3 khung), đuôi `.png` hoặc `.webp`. Tool nhận hai kiểu tờ:

- **Đã xoá nền sẵn** (nền trong suốt, cỡ nào cũng được): tool giữ nguyên viền của tờ.
  Nên dùng kiểu này.
- Nền giấy trắng 1536×1024: tool tự tách nền, nhưng để lại viền sáng quanh người và
  giấy trắng kẹt trong tóc.

Chạy `python3 tools/studio-assets.py --cast <thư mục>` → 10 khung WebP mỗi bạn
trong `images/studio/char/` (cùng chiều cao 720px, chân sát đáy, nền trong) và
in ra `ANCHOR`. Chạy tiếp `--hands` → nắm tay `pN-<khung>-tay.webp` và `WEAR_AT`
(nắm tay cắt từ chính các khung vừa ra). Dán cả hai vào `js/studio.js`, đổi số
`?v=` trong `studio.html`. Khung chạm nhau (mũi xe sát người bên cạnh) thì tool
tự cắt ở cột thưa nét nhất; mũi giày lấn qua đường cắt thì được trả về đúng
khung của nó; với tờ nền giấy, giấy trắng kẹt giữa chân và tay xe cũng được xoá.
Máy chạy tool cần `pip install numpy pillow`.

**Bộ khung 07/10/2026:** cắt lại từ 12 tờ đã xoá nền (2000×1414): hết viền trắng
quanh người và giấy trắng kẹt trong tóc. Vẫn là tranh cũ, nên mỗi khung lệch
nhiều nhất vài px bề ngang; `CART_RIM` giữ nguyên (mép lót xe lệch ≤ 1px trên
720). Ai là ai: `p1` cô áo kem đeo túi chắp vải, `p2` cậu đeo kính, `p3` cô váy
xanh búi tóc, `p4` cô áo len hồng.

**Bộ tranh 2 (10/2026):** `--strip2 <thư mục z1..z5.png>` ghép 5 cảnh mới
thành `bg/strip.webp` (6264px; tủ trống ở khu 3 được giữ để bày ảnh sản phẩm thật — `DISPLAY` trong `js/studio.js`).
`--pieces` (đồ mặc, Udon, giấy UI — tên trong `PIECES`) và `--batch`
(`sheet-` tờ sticker → tách từng món, `pr-` một món đồ, `set-` nhiều món,
`full-` giữ nguyên) cho phần còn lại. Thư viện chưa dùng hết: `cay/`,
`cay2/`, `deco/`, `vn/`, `props/`, `ui/`, `wear/`, `bg/nen-*` (tường trống
để sau này đặt đồ tách lớp).

**File gốc nặng không cần lên GitHub** (bản PNG gốc trong `images/gem2d-assets/` đã xoá khỏi repo 10/2026, gốc giữ ở Drive). Trang chỉ dùng bản WebP (~55 KB/khung).
Giữ gốc ở Drive, chỉ commit bản đã xử lý.

### Lắp studio (admin.html → tab "Lắp studio", chỉ owner)

Bảng `studio_layout` (migration `gem_studio_layout`): hai dòng `draft` / `live`,
cột `data` jsonb. RLS: `anon` + `authenticated` chỉ đọc `live`; `is_owner()`
đọc cả hai và ghi. Đã kiểm 4 vai trong transaction (rollback): khách và tài
khoản thường chỉ thấy `live`, update 0 dòng / insert bị chặn; nhân sự
(`staff`) cũng chỉ thấy `live`, update 0 dòng; owner thấy cả hai, update được.
Câu kiểm GRANT-vs-policy: không thêm dòng mới.

- `js/studio-layout.js`: định dạng + `sanitize()` (dùng cả hai phía). Ảnh chỉ
  được từ `images/studio/`, `images/products/` hoặc bucket `gem-media`; số đều
  bị kẹp; studio chỉ gán `img.src` và style, không `innerHTML` từ JSON.
- `js/studio-editor.js`: kéo để di chuyển, kéo góc để đổi cỡ (giữ tỉ lệ), nút
  tròn để xoay (hít về 0°), lớp trước/sau nhân vật, lên/xuống, lật, khung gỗ
  (cho ảnh sản phẩm), nhân bản, xoá, Ctrl+Z. Thư viện đọc
  `images/studio/assets.json` (`python3 tools/studio-assets.py --manifest .`
  sau khi thêm tranh). "Tải ảnh mới" đưa lên `gem-media` (tối đa 3 MB).
  Vùng bấm, chỗ dừng của nhân vật, Udon, điểm xuất phát cũng kéo được.
- "Lưu nháp" → `draft`; "Xuất bản" → `draft` + `live`; `studio.html?nhap=1`
  (cùng tab đã đăng nhập) xem bản nháp.
- Chưa xuất bản bố cục nào thì studio vẫn dùng dải tranh vẽ sẵn như cũ.
- **Bố cục đã lưu (profile)** — migration `gem_studio_layout_profiles`: thêm
  dòng `p-<slug>` + cột `name` (vd "Tết 2027"). Trong trình lắp: Mở (nạp vào
  để sửa), Cho chạy ngay (chép thành `live`), Xoá, Lưu vào bố cục đang mở, Lưu
  thành bố cục mới. `live.name` = tên bố cục đang chạy. Quyền không đổi: khách
  và nhân sự vẫn chỉ đọc `live` (đã kiểm lại 3 vai + id sai bị từ chối).
- Nền trống: `bg/strip-trong.webp` (`--strip-empty`, 5 tường trống nối bằng cột).
- **Cảnh ngoài cửa** (10/2026): `studio.html` mở ở mặt tiền, chạm cửa thì nhân
  vật đi tới rồi mờ dần vào studio; ô chọn nhân vật trong studio có nút "Ra
  ngoài cửa". Trong cùng lượt (sessionStorage `gem-scene`) đã vào rồi thì mở
  thẳng trong studio; link chia sẻ thiết kế cũng vào thẳng. Nền
  `bg/ngoai.webp` (`--outside <mặt tiền.png>`: tranh 1536px, hai bên nối
  thêm tường trơn giữ thớ giấy cho đủ rộng màn máy tính). Bố cục nằm trong
  cùng JSON, khoá `outside` ({ bg, items, hot: { enter }, start }); chưa lắp
  thì dùng `OUTSIDE` mặc định trong `js/studio-layout.js`. Trình lắp: nút
  "Trong studio / Ngoài cửa" đổi cảnh đang sửa; lưu / xuất bản lưu cả hai.
  Tranh mặt tiền dọc có sẵn Udon (`bg/mat-tien.webp`) chưa dùng — khổ dọc
  không hợp sân khấu ngang.
- **Thư viện thêm (10/2026):** `chuon/` 15 chuồn chuồn tre (2 tờ sticker, đã
  bỏ 6 con trùng mẫu + trùng kiểu đế), `props/ke-gia-day` và `props/thu-do-day`
  (bản đầy đồ của kệ + giá treo, góc thử đồ).
  Thêm `may/` (41 đồ may & len) và `nha/` (31 thảm, gối, bàn ghế, đèn…) từ 2
  tờ sticker; đã bỏ 10 món trùng với thư viện cũ, tách 2 hình dính nhau.
- **Nhóm trong thư viện = chỗ đặt khi lắp**, không theo tờ sticker gốc: Nội
  thất · Cây & hoa · Treo tường & trần · Đồ để bàn, kệ · Vải, gối & thảm · Đồ
  may & len · Đồ mặc · Giấy & khung · Udon · Ảnh sản phẩm. File vẫn nằm ở thư
  mục theo tờ gốc (bố cục đã lưu trỏ theo đường dẫn), chỉ `assets.json` nhóm
  lại: `FOLDER_GROUP` (mặc định theo thư mục) + `PICK` (từng file) trong
  `tools/studio-assets.py`. Thêm tranh mới → thêm tên vào `PICK` nếu không hợp
  nhóm mặc định, rồi `--manifest .`.

- **Tường trơn** (10/2026): `bg/strip-tron.webp` (`--plain <tường.png>`, 5.792px):
  phần giữa của một bức tường vẽ (1536×1024) làm thành đoạn lặp liền mạch, nhân
  5 lần, góc phòng ở hai đầu. Không cửa, không cửa sổ — chúng là món trong nhóm "Cửa &
  cửa sổ" (cỡ + chỗ đặt ban đầu đúng tỉ lệ: `START_H` / `START_Y` trong tool).
  Bố cục mới mặc định dùng nền này.
- **Mở rộng khu vực:** nút "Ngắn lại / Dài thêm" trong trình lắp, mỗi lần một
  đoạn tường (Tường trơn 1.040px, Mặt tiền 400px), tối đa 20.000px. Nền vẽ
  thành 3 phần: tranh (bỏ góc phải) + đoạn lặp liền mạch (`bg/tuong-lap.webp`,
  `bg/ngoai-lap.webp`) + góc phòng — `EXTEND` / `bgParts()` trong
  `js/studio-layout.js`, số do `--plain` in ra. Nền khác (có cửa, tranh vẽ sẵn)
  không nối dài được.
- **Trình lắp gọn lại (10/2026):** một hàng công cụ (Trong / Ngoài cửa, nền,
  Hoàn tác, thu phóng, "Khung bấm" ẩn/hiện khung xanh, "Xoá hết" món trong cảnh
  đang sửa — Hoàn tác lấy lại được); lưu / xuất bản / bố cục đã lưu gom vào
  menu "Lưu". Điện thoại: thư viện một hàng cuộn ngang ngay dưới sân khấu. Nền
  chỉ hiện loại hợp cảnh (`scene` trong `assets.json`).
- **Giấy trắng sót trong asset:** `tools/clean-white.py` (đã chạy cho giá treo
  trống, 2 bàn may, 2 tủ kệ, quầy Udon). `--loose` quét thêm bóng giấy ở đáy;
  `--ink N` cho tranh có lông / sơn trắng trùng màu giấy (Udon). Xem kết quả
  trước khi commit.
- `admin.html` / `studio.html` gắn `?v=YYYYMMDD` sau CSS/JS — điện thoại từng giữ
  bản cũ (không thấy nút Ngoài cửa). Đổi số mỗi lần sửa.
- **Kiểm tra:** `python3 tools/check-studio.py` (mặt tiền ↔ trong, phụ kiện 4×10
  khung, trình lắp: thêm / xuất bản / Xoá hết / nền theo cảnh). Supabase giả lập,
  không ghi gì thật; ảnh chụp ở `/tmp/gem-check/`.

### Góp ý thử nghiệm đợt 2 (10/2026)

- **Vuốt để đi:** người thử đều vuốt ngang thay vì chạm. Kéo ngang trên sân
  khấu = kéo cả cảnh theo ngón tay, nhân vật đi theo; thả nhanh thì đi thêm
  một đoạn. Chạm vẫn đi tới chỗ chạm. Sân khấu `touch-action: pan-y`.
- **Sheet kiểu bottom sheet (Material):** có tay nắm, kéo xuống quá 25% hoặc
  vuốt nhanh thì đóng; nội dung cuộn tới đỉnh mới kéo được. Mỗi sheet và việc
  vào studio là một bước lịch sử (`history.pushState`), nên nút / cử chỉ Back
  đóng sheet → ra mặt tiền → mới rời trang. `overscroll-behavior` chặn kéo để
  tải lại / vuốt về trang trước ngay trong studio.
- **Udon kéo thả:** kéo Udon thả lên nhân vật = vào xe đẩy, đi theo 3 giây;
  thả lên giỏ góc màn hình = nằm trong giỏ 3 giây; rồi nhảy về quầy. Chạm =
  câu gợi ý. Bộ ảnh Udon mới (`udon/`), tách nền bằng `clean-white.py --ink 5`.
- **Ảnh tham khảo ở Bàn thiết kế:** khách tải ảnh (thu nhỏ ≤1280px JPEG trong
  trình duyệt) lên kho **riêng** `gem-design` (migration `gem_design_uploads`):
  khách chỉ thêm được, tên phải là 20 ký tự ngẫu nhiên + `.jpg`, tối đa 1,5 MB;
  chỉ nhân sự xem / xoá. Đã kiểm 3 vai trong transaction: khách thêm được,
  tên sai / sang kho khác bị chặn, khách và tài khoản thường thấy 0 dòng, nhân
  sự thấy. Tên ảnh nằm ở cuối mã thiết kế (`…~<ghi chú>~<ảnh>`); trang Đơn hàng
  có nút "Xem ảnh khách gửi" (tải bằng token nhân sự). Rủi ro còn lại: ai cũng
  có thể đẩy ảnh rác vào kho (giới hạn cỡ + định dạng) — dọn tay nếu cần.
- **Sản phẩm thật trên kệ:** món có `sku` trong bố cục (hoặc kệ khu 3 của tranh
  vẽ sẵn) = chạm mở thẻ, kéo thả vào xe / giỏ là thêm vào giỏ hàng. Ảnh cắt nền
  ở `images/studio/sp/<sku>.webp` (nhóm "Sản phẩm thật" trong thư viện, tự gắn
  sku); món không có ảnh cắt nền dùng ảnh sản phẩm trong khung gỗ. Trình lắp:
  ô "Sản phẩm" gắn bất kỳ món nào với một sản phẩm (nhãn SP). Tab Sản phẩm (owner):
  dòng "Studio 2D: đang bày n chỗ" + nút "Đặt vào Studio".
- **Thiết lập từng vùng bấm** (`layout.spots`): tắt (không hiện, nút dưới cũng
  ẩn; trừ cửa vào ở mặt tiền), đổi tên VI / EN (textContent), mở trang khác
  (trang của site hoặc `https://`, kiểm bằng `linkOk`). Chọn khung trong trình lắp
  để chỉnh.
- Tên trang: **Gem Studio 2D**. Giỏ góc màn hình: xe đẩy gỗ trên nút giấy tròn
  có viền + bóng, để không lẫn với đồ trong tranh.

### Udon giáo viên (Bàn thiết kế, 10/2026)

Trên cùng bàn thiết kế: Udon đeo kính cạnh tấm bảng có **ảnh món thật** Gem đã
may, để khách hình dung món thật chứ không chỉ bản vẽ. Mở bàn → Udon nói (dáng
4) + ảnh món đang chọn. Đổi món → gõ que 2 nhịp (dáng 1↔2) rồi đổi ảnh. Chọn
tông / họa tiết → nâng kính (dáng 3) rồi gợi ý món có sẵn gần màu (`similarTo`).
Chạm bảng → ảnh món thật khác (món đó, rồi các món chắp vải trong `REAL`). Chỉ
động khi khách đổi lựa chọn, 3 giây sau về dáng chỉ bảng; giảm chuyển động thì
đổi dáng không gõ. Tranh: `udon/ud-gv-1..4.webp` (tờ `sheet-udgv`, tách nền
`clean-white --ink 5`), bảng `ui/udgv-bang.webp` (ô giấy: cách mép 9% / 12% trên
/ 26% dưới). Ảnh trên bảng là ảnh sản phẩm hiện có — vài ảnh còn chữ poster,
thay khi có buổi chụp.

Udon ở quầy: chạm không còn câu nhắc — kéo được là để khách tự khám phá.

### Góp ý đợt 4 (10/2026)

- **Nét vẽ thẳng, mượt:** trong lúc vẽ giữ toạ độ mịn (không làm tròn theo ô) và
  vẽ bằng đường cong; nhấc tay thì nét được rút gọn (Ramer–Douglas–Peucker,
  `GemPatch.settle`) rồi mới bám ô 64×64 để vào mã. Kéo thẳng = 2 điểm.
- **Bàn thiết kế thêm 5 món:** Túi Origami (lục giác 6 cánh + khoen), Túi áo
  Oxford (áo có cổ, nẹp nút, quai), Bloom Charm (5 cánh + khoen), Bookmark (dải
  dài + tua), Dây đeo cổ tay (vòng vải + móc). Kiểu: một vải / ghép hai vải /
  (Oxford, Bookmark thêm ô vuông) / theo hình vẽ. Vẽ trong `SHAPES` của
  `js/patch.js`. Hàng món thành một dòng cuộn ngang.
- **Kệ hàng một cửa sổ có tab:** Phụ kiện · Túi & sổ · Gối & quà · Tất cả. Bấm kệ
  nào mở đúng tab đó, chuyển tab tại chỗ.
- **Chọn hành động cho vùng bấm** (`spots.<id>.act`, danh sách `GemLayout.ACTS`):
  chọn nhân vật, góc nghỉ, 2hand, thử phụ kiện, kệ hàng (theo tab), bàn thiết kế,
  tủ, quầy, bảng lời nhắn, vào studio, mở trang khác, hoặc không làm gì. Để trống
  = hành động mặc định của điểm đó.

### Sản phẩm + thư viện ảnh từ database (10/2026)

Mục tiêu: thêm / sửa sản phẩm **không cần sửa code**.

**Migration** `gem_studio_assets_and_product_media` + `gem_products_shelf_seed`:
- `products.cutout` (ảnh tách nền, đứng trên kệ Studio) và `products.shelf`
  (`pegboard` / `display` / `cabinet` / null = không bày). Đã điền kệ cho 16 món
  theo `SHELVES` cũ; `set-qua` trước nằm ở cả hai kệ, giờ chỉ ở `cabinet` (mỗi món một kệ).
- Bảng `studio_assets` (src, w, h, grp, name): policy `sa_owner_all` (`is_owner()`) +
  `GRANT select, insert, update, delete` cho `authenticated`, không gì cho `anon`.
  Đã kiểm ba vai: anon → `permission denied`; đăng nhập không phải owner →
  `violates row-level security policy`; owner → ghi + đọc được. Câu kiểm
  GRANT-vs-policy không có dòng nào của `studio_assets`. (Câu kiểm hiện ra 3 dòng:
  `orders`/`order_items` INSERT như đã ghi, thêm `notes` UPDATE — có từ trước, chưa xem lại.)

**Ảnh** (`js/img-tools.js`, chạy trong trình duyệt, không cần công cụ ngoài):
- Thu nhỏ: dài nhất 1280px, WebP chất lượng 0.82 (Safari cũ không xuất WebP →
  JPEG, hoặc PNG nếu có trong suốt). Ảnh thẻ: vuông 600px cắt giữa.
- "Xoá nền trắng": lấy màu nền từ viền ảnh, loang từ mép vào những điểm gần màu đó
  (chỉ phần nối ra mép — trắng nằm trong món được giữ), viền mờ dần, cắt sát món.
  Ô "Mức xoá" chỉnh độ rộng.
- Tải lên kèm `cache-control: max-age=31536000` (tên file luôn mới nên không bao giờ đổi nội dung).

**Admin → Sản phẩm → Sửa:** ảnh chính (→ ảnh thẻ 600px + ảnh lớn đứng đầu thư viện),
thư viện ảnh (thêm nhiều, đổi thứ tự, bỏ), ảnh cắt nền (Xoá nền trắng hoặc chọn
ảnh đã tách; chỉ tải lên khi bấm Lưu), Kệ trong Studio.

**Trang Sản phẩm** (`js/catalog.js`): HTML tĩnh là bản dự phòng. Khi database trả lời
(sự kiện `gem:products` do `basket.js` phát), thẻ có sẵn lấy tên / mô tả / ảnh /
thư viện từ database, món mới được tạo thẻ trong `.product-grid[data-cat=…]` của
danh mục, tất cả xếp theo `sort_order`. `gallery.js` bắt click trên document nên
thẻ tạo sau vẫn mở lightbox; `GemBasket.bindCard` gắn giá + nút giỏ.
`GemDB.products()` chỉ gọi mạng một lần mỗi trang.

**Studio:** ảnh thẻ, ảnh cắt nền, các tab kệ đọc từ `GemBasket.info()` / `skus()`
(database); `THUMB` / `CUTOUT` / `SHELVES` trong `js/studio.js` chỉ dùng khi chưa có.

**Trình lắp:** "+ Tải ảnh" → chọn tab (có sẵn hoặc "+ Nhóm mới…"), tên, tuỳ chọn
Xoá nền trắng → thu nhỏ, tải lên, lưu vào `studio_assets`. Chọn được nhiều ảnh một
lượt (tối đa 20): bỏ bớt bằng ×, cả lượt chung một tab + một lựa chọn Xoá nền trắng,
tên lấy theo tên file; xử lý lần lượt từng ảnh, ảnh lỗi ở lại trong khung để thử lại.
Một ảnh thì đặt luôn vào cảnh; nhiều ảnh thì chỉ mở tab (đặt hết vào giữa sẽ chồng lên nhau). "Sửa thư viện": đổi
tên / chuyển tab / bỏ ảnh đã tải lên. Bỏ chỉ xoá dòng trong thư viện, file vẫn ở
Storage để bố cục đang dùng không vỡ. Ảnh cắt nền của sản phẩm tự hiện ở tab
"Sản phẩm thật", đã nối sẵn sku.

**Kiểm:** `tools/check-studio.py library | product | catalog` (Supabase giả lập có
Storage giữ file tải lên, nên kiểm được cả cỡ ảnh lẫn độ trong suốt).

### Bàn thiết kế — "chơi" (đợt 1, 10/2026)

Góp ý: bàn thiết kế giống tờ khảo sát, bản vẽ trông rẻ, chia sẻ chỉ là link.
Đợt 1 đổi sang *tự tay chắp*:

- **Toàn màn hình** (`openSheet(html, true)`): kéo thả trong bàn nên chỉ tay
  nắm trên cùng kéo xuống đóng được.
- **Tâm trạng** (`GemPatch.MOODS`): 5 bộ chọn sẵn (bảng vải + kiểu ghép). Tên là
  nháp, Anna đổi trong `js/patch.js`. Món mới mở ra đã mặc tâm trạng đầu.
- **Vải từng ô:** danh mục 45 vải = 5 tông × 9 kiểu (`KINDS`: trơn, caro, sọc,
  chấm bi, hoa nhí, ren, hoa to, ô nhỏ, thổ cẩm), id = tông × 9 + kiểu. Mã thiết
  kế thêm trường thứ 11 (sau ảnh, có thể rỗng): một chữ B64 mỗi ô. Mã cũ vẫn đọc.
  Ghi chú đơn liệt kê "vải từng mảnh: Hoa nhí hồng – đỏ ×2, …".
- **Rổ vải:** 8 mảnh trên khay `props/gio.webp`. Chạm mảnh rồi chạm ô, hoặc kéo
  thả; chạm ô khi chưa cầm gì = đổi sang mảnh kế tiếp trong rổ. "Lục rổ" lấy 8
  mảnh ngẫu nhiên; "Xáo mảnh" rải lại vải trên món.
- **May xong:** sợi chỉ chạy theo các đường may (`.pt-seam` → `.pt-thread`), món
  phồng lên, Udon reo, rồi hiện tên (`GemPatch.title`: tên tâm trạng, hoặc hai tông
  chính) + số mẫu (`serial`: băm từ mã, cùng thiết kế luôn cùng số) + thẻ.
- **Thẻ 1080×1920** vẽ bằng canvas, làm sẵn trước khi bấm (trình duyệt chỉ mở bảng
  chia sẻ ngay sau cú chạm). "Chia sẻ ảnh" gửi *file ảnh* qua bảng chia sẻ của máy;
  máy không gửi được file thì tải ảnh về + chép link. Tên người thiết kế lưu ở
  `localStorage['gem-designer']`, đi trong link `&by=` (không vào mã thiết kế), vẽ
  bằng `fillText` / hiện bằng `textContent`.
- **Link mở lại:** `studio.html?d=…&by=Linh` → "Linh đã thiết kế mẫu này" + "Đặt
  may giống vậy" / "Tự làm bản của bạn".

**Tranh đã vào (10/2026)** — `images/studio/vai/`, làm bằng
`python3 tools/design-assets.py <thư mục ảnh gốc>` (ảnh gốc không để trong repo):
- `vai-<tông>-<1..9>.webp`: 45 mẫu vải. Trên món, mỗi mẫu lát 2×2 có lật gương
  (`fabricPattern` trong `js/patch.js`) nên không thấy đường nối giữa các lát.
- `dang-1..9.webp`: khuôn mảnh vải (vừa làm mask, vừa làm lớp bóng multiply) cho rổ.
- `ro-truoc.webp`: thành trước của rổ, vải đứng *sau* nó và ló lên khỏi vành.
- `mon-goi|lotcoc|scrunchie-mask/-bong.webp`: gối, lót cốc, dây buộc tóc vẽ bằng
  tranh — vải nằm trong mask, bóng của tranh nhân lên trên (`artPiece`). Gối đã lọc
  bỏ đường may vẽ sẵn để mỗi kiểu ghép tự vẽ đường may của nó. Năm món còn lại
  vẫn vẽ bằng code (nhưng dùng vải tranh).
- `mood-<id>.webp` trên nút tâm trạng; `the-khung.webp` làm nền thẻ chia sẻ.
- `udon/ud-may`, `ud-reo`, `kim-chi`: Udon ngồi may cạnh món, kim chạy theo đường
  may, xong thì Udon nhảy reo.
- Thẻ: ảnh trong SVG không tự tải khi vẽ vào canvas, nên `inlineImages()` đổi
  chúng sang data URL lúc chạy rồi mới vẽ.
- `printBody()` (họa tiết vẽ bằng code) giờ chỉ còn cho chấm tròn trong chip
  "Tự chỉnh" và làm màu tạm cho vải màu riêng lúc chưa nhuộm xong.
- Đợt tranh 2: túi Origami, túi áo Oxford, Bloom Charm, dây đeo, bookmark góc
  sách (hình vuông có vạt tam giác kẹp góc trang), lót cốc vuông. Móc / khoen
  kim loại tách ra lớp `-top` vẽ đè lên vải (`PIECES` trong `design-assets.py`).
  Kiểu "Ghép hai vải" theo món thật: Origami xen kẽ cánh, Oxford hai nửa,
  Bloom = cuống + nút + nụ giữa / hai nụ bên, bookmark chia theo đường chéo.
- **Lót cốc tròn / vuông:** cùng sản phẩm (`sku lotcoc`), hai dáng `lotcoc` /
  `lotcocv`; nút "Dáng" chỉ hiện ở lót cốc. Ghi chú đơn ghi rõ "Lót cốc tròn" /
  "Lót cốc vuông".
- **Màu riêng (color picker):** nút "Màu riêng" ở rổ → bảng chọn màu của máy + 8
  màu gợi ý → "Nhuộm vào rổ": rổ thành 9 kiểu vải của màu đó. Nhuộm ngay trong
  trình duyệt từ tranh vải xanh lam (`customSrc`): điểm xanh nhận sắc mới, độ đậm
  so với chính tranh đó; nền kem, ren trắng, lá xanh giữ nguyên. Mã thiết kế thêm
  trường 12: `<kiểu 0-8><hex>` cách nhau bằng dấu chấm (tối đa 19 màu); mỗi ô dùng
  chữ 45+ trỏ vào danh sách đó. Ghi chú đơn: "Hoa nhí màu riêng #7a4fa0 ×2".
  Tên thẻ khi phần lớn ô là màu riêng: "Sắc tím". Lời hứa kèm: Gem tìm vải gần màu
  nhất và nhắn ảnh duyệt trước khi may.

**Sửa theo góp ý (10/2026):**
- Chọn tâm trạng chỉ đổi vải, giữ kiểu ghép đang chọn (`applyMood(d, mood, true)`).
  Ít ô thì vải có thể khớp nhiều tâm trạng: tâm trạng khách bấm được nhớ
  (`d.moodId`) và đi trong link (`&m=`).
- May xong: trang cuộn lên món trước rồi mới may (thấy Udon may + reo), cuộn
  xuống thẻ sau khi reo xong.
- Tên mẫu sửa được (ô nhập ngay trên thẻ); tên riêng vẽ lên thẻ và đi trong link
  (`&t=`, tối đa 40 ký tự, chỉ hiện bằng `value` / `fillText`).
- Giỏ hàng (góc + danh sách + hình bay vào giỏ) dùng hình thật: thiết kế riêng
  → SVG của thiết kế, món có sẵn → ảnh cắt nền hoặc ảnh sản phẩm; sprite cũ chỉ
  còn làm dự phòng. Đồ trong giỏ cũng nằm trong xe nhân vật đẩy (`.st-cargo`, vành
  xe đo từ tranh: `CART_RIM`). (Ảnh cắt nền nào được chọn: xem "Studio: góp ý đợt 5".)

**Xếp lại phần dưới (10/2026):**
- Udon giáo viên ngồi ở góc dưới bên trái món (`.pt-stage .gv-udon`); câu của Udon
  là bóng thoại ngay dưới món (`.gv-say`), nhường chỗ cho hướng dẫn khi đang cầm
  vải hoặc đang vẽ (`.pt-hint`). Ảnh món thật là tấm polaroid ghim góc trên bên
  phải (`.gv-polaroid`): chạm để phóng to, nút › xem món khác. Udon tạm ẩn khi
  Udon ngồi may xuất hiện.
- Bỏ hẳn chip "Tông màu" / "Họa tiết": tâm trạng + rổ + Màu riêng thay thế. Thêm
  tâm trạng "Gem chọn giúp": bỏ vải từng ô, tông và họa tiết = Gem chọn.
- "Theo hình mình vẽ": vẽ thẳng lên món — canvas trong suốt phủ lên hình món, chỉ
  vẽ nét đang kéo; nét xong vào SVG của món (nằm trong hình món, có bóng). Thanh
  bút ngay dưới món.
- "Tự chỉnh" thành **Tờ nhắn gửi Gem**: giấy kraft có ghim, chất vải dạng nhãn may,
  lời nhắn trên giấy kẻ dòng (Dancing Script), ảnh tham khảo là polaroid trống.

**Góp ý tiếp (10/2026):** đường may gợi ý mờ đi (`stroke-opacity 0.4`); đồ trong xe
chìm sâu hơn dưới vành; polaroid phóng to tự thu lại khi chạm chỗ khác; tự vẽ có
vải nền (kiểu "tuve" có 1 ô vải: chạm / kéo mảnh trong rổ vào; tẩy vẽ lại vải nền);
thẻ sau May xong có nút "Đặt Gem may" + giá riêng.

**Ghép theo nét vẽ (kiểu `net`, 10/2026):** nét vẽ của khách cắt món thành mảnh.
`netRegions()` trong `js/patch.js`: làm mượt nét như trên màn hình, đầu nét hở
trong 3.2 ô (lưới 64) thì "hít" vào mép / nét gần nhất / điểm đầu của chính nó,
vẽ nét thành tường trên lưới 160×160, loang tìm vùng kín. Vùng < 0,8% diện tích
gộp vào vùng bên cạnh; tối đa 12 mảnh (`NET_MAX`, Udon báo khi phải gộp). Mảnh
đánh số từ trên-trái, nên cùng nét = cùng mảnh = mã thiết kế không cần lưu gì
thêm (nét + vải từng ô đã có). Chạm (không kéo) trên canvas = chạm mảnh bên dưới;
vẽ thêm nét thì vải cũ giữ cho các mảnh đầu, mảnh mới lấy vải từ rổ (`refit`).
Ghi chú đơn: "cắt N mảnh theo nét vẽ (xem hình)". Chưa tính phụ phí. Lưu ý: với
món hẹp (Bloom, dây đeo) vùng nằm ngoài hình món vẫn tính là một mảnh.

**Chưa làm (đợt 2–3):** vải thật dạng "Mảnh hiếm" (bảng `fabrics` + admin), tường
thiết kế của khách, Thiết kế của tháng.

### Lắp studio: lưu / mở / phát hành (10/2026)

- **Lỗi cũ:** nút trong menu "Lưu" (Mở, Lưu vào…, Xoá) lọt xuống `barClick`, và
  nút nào không biết thì bị coi là "Xuất bản" → hỏi phát hành ở mọi nút. Giờ
  thanh công cụ chỉ xử lý nút của nó; đầu trình lắp dùng `data-hd`.
- **Thanh đầu:** "Đang sửa: <tên>" · trạng thái tự lưu · "Khách đang thấy: <tên>"
  + Bố cục / Xem thử / Lưu / Phát hành.
- **Tự lưu nháp** 2 giây sau mỗi thay đổi (dòng `draft`; cột `name` của nháp giữ
  id bố cục đang mở để mở lại đúng bố cục). Không còn "chưa lưu, rời đi?".
- **Bố cục:** tấm trượt (điện thoại) / bảng bên phải (máy tính), mỗi bố cục một
  thẻ có ảnh thu nhỏ, nhãn Đang chạy / Đang sửa, Mở / Phát hành / Đổi tên / Nhân
  bản / Xoá (xoá hỏi ngay trên thẻ). Mở khi có thay đổi chưa lưu → hỏi lưu / bỏ.
- **Phát hành:** hỏi một lần bằng khung trong trang; trước khi ghi `live`, bản
  khách đang thấy được chép sang dòng `prev` → nút "Hoàn tác phát hành" (toast) và
  "Trả lại bản trước" trong danh sách. Không cần migration (owner ghi được mọi id,
  `prev` khách không đọc được).
- **Thư viện:** giữ tab + vị trí cuộn sau mỗi lần thêm; tab "Vừa dùng" (8 ảnh,
  `localStorage['gem-se-recent']`); ô tìm theo tên ảnh / tên tab.
- Hộp thoại của trình duyệt (`confirm` / `prompt`) không còn dùng trong trình lắp.

### Lắp studio: chạm trên điện thoại (10/2026)

- **Lỗi cũ:** món nào cũng `touch-action: none` và bị chọn + kéo ngay khi chạm →
  vuốt để cuộn màn hình là kéo nhầm món; hai món chồng nhau thì món trên luôn
  thắng; tay cầm nhỏ.
- **Giờ (ngón tay / bút):** chạm 1 lần = chọn, chỉ món đang chọn mới kéo được.
  Vuốt chỗ khác = cuộn (`.se-el` để `pan-x pan-y`, chỉ `.is-sel` / `.se-grab`
  là `none`). Món đang chọn có "bản sao trong suốt" `.se-grab` nằm trên mọi món
  và mang tay cầm → ngón trong viền của nó luôn kéo đúng món đó. Chạm lại vào
  món đang chọn = chọn món ngay dưới (`pickAt`, vòng tròn). Hai ngón chỉ đổi
  cỡ / xoay khi ngón đầu đặt trên món đang chọn. Chuột vẫn bấm-kéo thẳng như cũ.
- **Khoá món:** `items[].lock` (giữ qua `sanitize`, studio.html bỏ qua). Món khoá
  `pointer-events: none`; mở lại ở dải "Món đã khoá" dưới sân khấu.
- Tay cầm vùng chạm ~44px (`::before`), món nhỏ hơn 72px trên màn hình chỉ còn
  góc dưới phải. Kiểm tra: `fingers()` trong `tools/check-studio.py`.

### Lắp studio: Loại của món (10/2026)

Mỗi món trong studio có một **Loại** (ô đầu tiên dưới dải công cụ khi chọn món):

| Loại | Khách | Lưu ở đâu |
|---|---|---|
| Trang trí (mặc định) | — | — |
| Sản phẩm | chạm xem thẻ, kéo vào giỏ | `items[].sku` (như cũ) |
| Câu chuyện | chạm đọc; kéo thả vào Udon → thẻ có dòng "Để Udon kể bạn nghe nhé." | **`studio_info`** theo ảnh |
| Khu vực | nhân vật đi tới `x` của món, chạy hành động (`ACTS`, giống khung bấm) | `items[].zone = { act, link?, vi?, en? }` |
| Lời thoại | bong bóng, mỗi chạm một câu | **`studio_info.lines`** theo ảnh |
| Bảng tin | chữ đè lên ảnh: buổi workshop gần nhất còn chỗ / bài Bản tin mới nhất; chạm mở trang | `items[].board = { feed }` |

- Thêm cho mọi loại: **Hiện từ / đến** (`items[].show`, 'YYYY-MM-DD', so theo ngày máy khách).
- Khung bấm rời (`hot`) **vẫn giữ** — một tủ có thể có hai khung (đồ trang trí + gối).
- Câu chuyện / lời thoại thuộc về **ảnh** (`src`): đặt ảnh ở bố cục nào cũng kể y vậy,
  sửa xong khách thấy ngay, không cần phát hành lại. Món mới thả vào mà ảnh đã có
  câu chuyện / lời thoại thì tự nhận loại đó.
- Bảo mật: mọi chữ của chủ đi qua `textContent` / `esc()`; link qua `linkOk`, ảnh qua
  `srcOk` (`GemLayout.info`). Giờ trên bảng tin theo múi giờ `Asia/Ho_Chi_Minh`.

**Bảng `studio_info`** (src PK, kind, title_vi/en, body_vi/en, image, link, lines jsonb,
updated_at): `si_read_all` cho anon + authenticated; insert / update / delete chỉ
`is_owner()`. GRANT select cho anon + authenticated, insert/update/delete cho
authenticated. SQL: `supabase/migrations/20261006_studio_info.sql`.
Migration `gem_studio_info` (đã chạy 06/10/2026). Đã kiểm ba vai: anon → đọc được, ghi
`permission denied`; đăng nhập không phải owner → `violates row-level security policy`
(update / delete sửa 0 dòng); owner → ghi được (insert, update, delete, upsert). Câu kiểm
GRANT-vs-policy không có dòng nào của `studio_info`.

Kiểm tra: `kinds()` trong `tools/check-studio.py`.

### Studio: góp ý đợt 4 (10/2026)

- **Phát hành báo `studio_layout_id_check`:** bảng chỉ nhận id `draft` / `live` /
  `p-…`; bản trước khi phát hành giờ nằm ở `p-ban-truoc` (ẩn khỏi danh sách). Lưu
  bản trước lỗi thì vẫn phát hành. FakeDB trong `check-studio.py` chặn id sai như thật.
  Đã kiểm trên database thật (06/10/2026): ràng buộc là
  `id in ('draft','live') or id ~ '^p-[a-z0-9-]{1,40}$'` — phần sau `p-` tối đa 40 ký
  tự, chỉ chữ thường / số / gạch nối. Dòng `p-ban-truoc` đã có trong bảng (một lần
  phát hành thật ghi ra); owner ghi đè được, `prev` bị từ chối đúng lỗi này (thử trong
  transaction rồi rollback). Id bố cục do `slug()` sinh dài nhất 35 ký tự nên luôn lọt.
- **Lên / Xuống:** món đang chọn không còn bị đẩy lên trên cùng (z-index) và mỗi lần
  bấm nhảy qua món kế tiếp **có chồng lên** nó.
- **Nhân vật không bước trên máy em gái:** máy bật "giảm chuyển động"
  (`prefers-reduced-motion`) → `walkTo` cho nhân vật tới thẳng, đứng một dáng.
  Giờ có nút **Hiệu ứng** trên thanh trên (`localStorage gem-motion` on/off; chưa chọn
  thì theo máy) và lần đầu Udon giải thích. Mọi hiệu ứng đi qua lớp `.st-calm`.
- **Bàn thiết kế:** nền giấy phủ lớp kem 80% (vải đúng màu hơn), bóng `.pt-ss` 0.6,
  bóng món `-bong` 0.8. Udon + lời + polaroid "Đồ thật" thành một hàng `.gv-row`
  dưới món (không đè lên món); chạm polaroid thì phóng to đè lên món, chạm lần nữa
  thu lại. Điện thoại: hàng gọn để rổ vải vẫn nằm trên thanh "May xong".
- **Chạm theo hình, không theo khung:** món có loại / sản phẩm trong studio chỉ nhận
  chạm ở phần có hình (`solidAt`: bản alpha nhỏ của ảnh, tính cả xoay / lật /
  object-fit contain). Chạm vào viền trong suốt thì rơi xuống khung bấm / tường.
  Ảnh tải lên (không xoá nền) tự cắt viền trong suốt (`GemImg.shrink` alpha → `trim`).
  Ảnh đã tải từ trước thì không tự cắt lại.
- **Tab "Khung bấm"** (chip đầu hàng tab thư viện): "+ Thêm khung" (`boxes[]` trong
  từng cảnh: `{ id 'k-…', box, stand, act, link?, vi?, en? }`), Chọn, Xoá; 7 khung có
  sẵn chỉ Ẩn / Hiện (thanh menu dưới của studio đi tới chúng theo id).
- **Món "Sau người" vẫn đè lên người** (món là Sản phẩm hoặc có Loại): các món đó ở
  `z-index: 3`, còn nhân vật thật ra chỉ ở 2 — luật `.st-player { z-index: 2 }` cũ nằm
  cuối `css/studio.css` đè lên luật `3` phía trên. Giờ thang lớp ghi một chỗ (khối
  `.st-item`) — **thang hiện tại ở "góp ý đợt 5" bên dưới** (bản đầu tách món nhận chạm
  lên lớp 3, làm đồ trang trí đặt trên "Khu vực" bị che). Chữ của Bảng tin đặt "Trước
  người" cũng lên cùng lớp với ảnh (trước đó nằm dưới ảnh). Kiểm tra: `layers()` trong
  `tools/check-studio.py`.
- **Thanh trên cùng tràn trên điện thoại** (từ khi thêm nút "Hiệu ứng"): chữ "Danh sách"
  đè lên tên trang, và nút EN bị cắt từ 390px trở xuống (360–375px thì gần như mất hẳn,
  không đổi được ngôn ngữ). Dưới 480px tên "Gem Studio 2D" nhường chỗ cho logo (chữ vẫn
  nằm trong link nên trình đọc màn hình vẫn đọc; vùng chạm quanh logo 44px); dưới 360px
  khoảng cách và lề hẹp lại cho vừa máy 320px. Từ 480px trở lên không đổi. Thêm nút nào
  vào thanh này thì chạy `topbar()` trong `tools/check-studio.py` (320 / 360 / 390 /
  480px, tiếng Việt + tiếng Anh).

### Studio: góp ý đợt 5 (10/2026)

Chủ studio giờ **ẩn gần hết khung bấm có sẵn** và giao việc cho món "Khu vực" (ảnh tự
tải lên, thường nằm trong một tấm trong suốt rộng hơn hình nhiều). Đợt này làm cho
studio đi theo **hình**, không theo khung.

- **Thang lớp trong `.st-world`** (khối `.st-item` trong `css/studio.css`, sửa số nào
  thì sửa cả khối): khung bấm **không có z-index** (nằm dưới mọi món, nên chạm trúng
  món trước) · **1** mọi món "Sau người", **theo đúng thứ tự chủ xếp, bất kể Loại** +
  giấy nhắn · **4** nhân vật · **5** món "Trước người" · **6** Udon và mọi nhãn tên
  (khung bấm, khu vực, sản phẩm) · **7** lời thoại. Lỗi đã gặp: món có Loại / sản phẩm
  từng ở lớp 3, đồ trang trí ở lớp 1 → túi treo trên bình phong (bình phong là "Khu
  vực") bị bình phong che mất ở trang khách, trong khi trình lắp vẫn vẽ đúng. Hệ quả
  cần biết: viền sáng của khung bấm giờ nằm **sau** đồ đạc; rê chuột vào khung thì thấy
  rõ nhất là nhãn tên đổi màu.
- **Sáng theo hình:** rê chuột chỉ làm sáng món khi chuột nằm trên phần có hình
  (`over()` → lớp `.is-over`, cùng phép thử `pickAt` với chạm). Không còn khung chữ
  nhật quanh món; đi bằng bàn phím (Tab) thì món có viền sáng ôm theo hình
  (`drop-shadow`). Sản phẩm hiện **tên** khi rê chuột (`nameTag`, `.st-prod-label`;
  màn cảm ứng không có rê chuột — chạm là mở thẻ).
- **Việc của khung đã ẩn đi theo món** (`placeFor(id)` → `ownPlace(id)`): nút trên
  thanh dưới, "Tự thiết kế theo mẫu này", giấy nhắn trên bảng đều tìm món "Khu vực"
  (hoặc khung tự thêm) có cùng hành động. Nhân vật dừng ở **giữa hình** (`standIn`,
  đo từ `ALPHA[src].box`), nên món "Khu vực" không cần đặt điểm dừng. Nút trên thanh
  dưới chỉ ẩn khi không còn gì làm việc đó (`hasPlace`). "Kệ hàng" nhận bất kỳ kệ nào
  (`SPOT_ACTS`).
- **Giấy nhắn:** khung "Bảng lời nhắn" ẩn mà có món "Khu vực" hành động Bảng lời nhắn
  thì giấy ghim lên chính món đó (`memoBoard` → `placePins`, đặt lại khi đọc xong ảnh).
- **Kéo món "Câu chuyện":** Udon ở xa thì không biết thả đâu → vừa nhấc món lên, bóng
  thoại của Udon hiện ở góc với viền nét đứt "Thả vào đây, Udon kể bạn nghe."
  (`storyDrop`); thả vào bóng thoại cũng như thả vào Udon.
- **Trình lắp:** khung đang ẩn không còn vẽ trên sân (bấm "Chọn" ở tab Khung bấm thì
  hiện lại để sửa); mỗi điểm dừng có tên khung của nó (`.se-stand-name`).
- **Bàn thiết kế — gối:** đường chia 3×3 và kiểu "sao" uốn theo đường may vẽ sẵn trên
  tranh gối (`ART.cushion.seams`, `onSeams` trong `js/patch.js`); trước đó chia đều
  33/67 nên hàng dưới lệch khỏi đường vẽ.
- **Dấu nháy khi bấm vào nội dung:** trang không có ô nhập nào ở đó — nhiều khả năng
  là chế độ "duyệt bằng con trỏ" của trình duyệt (phím **F7**). Vẫn chặn chọn chữ trên
  nút của Studio (`user-select: none`) để không còn chỗ cho dấu nháy bám.
- **Trang Sản phẩm:** danh mục không còn món nào (ẩn hết / xoá hết trong admin) thì ẩn
  cả khối và hai chỗ liệt kê danh mục (`tidy()` trong `js/catalog.js`). Kéo theo:
  database trả lời "không có món nào" giờ được coi là câu trả lời thật (`mergeFromDb`),
  không còn rơi về danh sách dự phòng — dự phòng chỉ dùng khi database **không trả lời**.
- **Ảnh trong giỏ là ảnh cắt nền, không phải ảnh chụp** (xe nhân vật đẩy, giỏ ở góc,
  dòng trong giỏ, hình bay vào giỏ — cùng một hàm `pic()` trong `js/basket.js`). Thứ tự:
  1. **chính món khách nhấc** trong Studio — kéo vào giỏ / xe, hoặc chạm món rồi "Thêm
     vào giỏ" (`pieceCut` → `GemBasket.add(sku, el, spec, cut)`). Một sản phẩm có thể
     treo nhiều hình (áo xanh, áo vàng cùng sku): kéo áo nào giỏ hiện áo đó. Lưu trong
     giỏ: `pics[]`, mỗi cái một hình, cùng `localStorage gem-basket` nên trang khác
     cũng thấy;
  2. "Ảnh cắt nền" của sản phẩm (admin → Sản phẩm → Sửa);
  3. hình của một món sản phẩm đó đang bày trong Studio (`shareCuts` →
     `GemBasket.cutouts`), cho món chưa điền "Ảnh cắt nền" — chỉ có ở `studio.html`;
  4. ảnh chụp sản phẩm; 5. hình vẽ nhỏ dự phòng.
  `pics` đọc lại từ localStorage nên qua `okPic` (cùng luật `srcOk`: ảnh trong repo hoặc
  kho `gem-media`), sai thì bỏ. **Đơn gửi đi vẫn chỉ có `sku` + `qty`** — cửa hàng chưa
  biết khách nhấc áo nào; việc đó thuộc đề xuất "lựa chọn của sản phẩm".
  Muốn ảnh cắt nền hiện ở mọi trang (không chỉ Studio) cho món thêm từ trang Sản phẩm:
  điền "Ảnh cắt nền" trong admin.

Kiểm tra: `layers`, `zones`, `cart`, `kinds`, `catalog`, `shop` trong
`tools/check-studio.py`.

### Studio: luật chạm (10/2026)

Góp ý: trên điện thoại, đứng gần một món "Khu vực" thì chạm hoặc không có phản ứng,
hoặc mở nhầm khu. Dựng lại bố cục đang chạy và chạm thử từng điểm trên màn 390px: đứng
ở một khu thì 21–43% màn hình mở lại chính khu đó, 13–28% không phản ứng (quanh nhân
vật; đẩy xe thì rộng gấp ba). Ở đoạn trống, 92% số lần chạm đi đúng chỗ.

Nguyên nhân:
1. Chạm gần nhân vật đang đứng trước Khu vực → `if (at.piece) return` → không đi, không mở.
2. Khung bấm có sẵn được vẽ phía trên dải sàn, để sàn dành cho việc đi. Hình Khu vực là
   đồ đứng trên sàn nên phủ kín dải ngang tầm nhân vật. Điện thoại thấy ~550px tranh,
   mỗi khu rộng 650–870px.
3. Khu không tên thì không có nhãn: bẫy vô hình (ở Bàn thiết kế, cửa sổ phía trên là "Tủ").
4. Nhãn Khu vực không nhận chạm (`pointer-events: none`) và nằm ở mép tấm trong suốt.
5. Chạm đúp: lần hai rơi vào nền mờ phía trên tấm vừa mở → đóng ngay.

Đợt 2 (sau khi chạy thật trên điện thoại): dấu ✕ phải bấm nhiều lần mới tắt (chặn chạm
đúp nuốt cả chạm ✕ trong 0,4 giây đầu); cuối sofa chạm sang 2hand thì mở luôn (luật "khu
khác một chạm là mở"); nhãn sofa nằm ngay trên mặt nhân vật (đỉnh sofa ngang đầu).

Luật chạm (điện thoại và máy tính như nhau; `tap()` trong `js/studio.js`):
- **Chạm vào hình = đi tới chỗ đó, chạm vào nhãn = mở.** Hình của Khu vực, khung bấm, tường,
  sàn, nhân vật: đều là đi (tới đúng chỗ chạm). Chạm hình một khu thì nhãn của nó gật nhẹ
  (chỉ chỗ mở). Riêng cửa mặt tiền (`enter`) mở bằng một chạm: ngoài đó chỉ có việc vào.
  Sản phẩm, câu chuyện, lời thoại, bảng tin: **trên điện thoại chạm hai lần** (10/2026) —
  chạm lần đầu thì nhân vật đi tới và hiện nhãn tên "Tên ›" trên món (`pickTap`), chạm
  nhãn hoặc chạm lại món thì mở; chạm chỗ khác thì nhãn tắt. Lý do: các món này trông y
  như phần tranh trang trí, điện thoại không có hover để báo bấm được, nên chạm định đi
  lại mở luôn món bên cạnh. **Chuột vẫn một cú bấm** (hover đã sáng món + hiện tên). Kéo
  món vào giỏ không đổi. Udon: chạm là ra. Bàn phím (Enter trên món / khung đang chọn) và
  thanh menu dưới vẫn mở thẳng.
- **Lời chào lần đầu** (`hello`): điện thoại có câu riêng nói luật hai lần chạm
  (`studio.intro_touch`, khoá `gem-studio-intro-touch` — khách đã thấy câu cũ cũng được
  thấy câu này một lần).
- **Nhãn:** Khu vực nào cũng có — tên chủ đặt, không thì tên theo hành động (`ACT_NAME`;
  "Không làm gì" thì không có). Nằm trên đỉnh hình (`tagAt`, đặt lại khi đọc xong ảnh),
  vùng chạm ~47px.
- **Khu đang đứng:** khu có hình chứa chỗ nhân vật vừa dừng (`restX`, kể cả khu treo phía
  trên như cửa sổ) → nhãn sáng "Tên ›" và luôn nằm trong màn hình. Không tính chỗ bắt đầu
  cảnh. **Chỉ đổi khi nhân vật dừng hẳn:** đang đi hay đang vuốt thì nhãn giữ nguyên, nên
  vuốt qua lại trong cùng một khu nhãn xanh suốt; sang khu khác thì đổi một lần lúc dừng,
  mờ dần 0,2 giây. (Trước đây vuốt là xoá trạng thái rồi bật lại → nhãn nháy trắng.)
- **Nhãn không đè nhân vật** (`placeTags`): khi nhân vật đứng yên, nhãn nào nằm trên nét vẽ
  nhân vật ở đúng độ cao của nhãn (`playerSpan`, theo alpha của khung: ngang đầu thì chỉ là
  cái đầu, không tính xe ở dưới) thì dịch ngang dọc theo đỉnh món, sang phía gần hơn. Lúc
  đang đi thì không dịch (nhãn không nhảy qua nhảy lại).
- **Nhân vật che món phía sau nó** (`onPlayer`, theo nét vẽ, cả xe đẩy). Không còn chỗ chết.
- **Vòng phản hồi** (`ring`, `.st-tap`) ở mỗi lần chạm làm nhân vật đi, kể cả khi không
  nhích; tắt Hiệu ứng thì là chấm mờ dần.
- **Chặn chạm đúp:** trong 0,4 giây sau khi mở tấm (và bảng giỏ hàng, `js/basket.js`), chỉ
  chạm rơi **đúng chỗ** chạm vừa mở nó (lệch ≤ 40px) mới bị bỏ qua; chạm chỗ khác (✕) có
  tác dụng ngay.
- **Món nhỏ** (sản phẩm, câu chuyện…): ngón tay cách hình ≤ 11px vẫn trúng, kể cả khi
  món nằm trên một Khu vực (túi treo trên bình phong): món nhỏ thắng khu phía sau
  (`nearSmall`, chỉ màn cảm ứng).
- **Nhấn giữ** không bật menu "Lưu ảnh" (`-webkit-touch-callout`; chặn `contextmenu`
  khi không phải chuột).
- **Máy tính:** rê chuột lên hình một khu thì nhãn của nó sáng (hình không sáng, con trỏ
  thường: bấm là đi); bàn tay chỉ hiện trên nhãn, sản phẩm, câu chuyện. Khung bấm không
  còn viền sáng khi rê chuột (viền chỉ cho bàn phím).
- **Điểm dừng lạc:** khung bấm có điểm dừng cách khung quá max(bề rộng khung, 400px)
  → dừng giữa khung (`standNear`). Bố cục đang chạy có một chỗ như vậy: khung "Gối, thảm
  & quà" (cabinet) trên tủ kệ x 3249–4054, điểm dừng ở x 6078. Nên kéo lại trong trình lắp.
- Câu chào của Udon và dòng hướng dẫn cho trình đọc màn hình đổi theo: "Chạm vào nhãn tên
  để mở từng góc, chạm chỗ khác để đi dạo nhé."

Chưa làm: vuốt bắt đầu trên sản phẩm thì nhấc sản phẩm thay vì đi (đợi góp ý thử nghiệm).
Kiểm tra: `taps` trong `tools/check-studio.py`.

### Studio: Nhặt cúc — giai đoạn 1 (kế hoạch, chờ duyệt, 10/2026)

Khách đi quanh studio nhặt cúc áo rơi, gom cúc đổi **túi mù vải vụn** ở quầy, mỗi túi
một **mảnh vải hiếm** dùng được ở Bàn thiết kế. Mục đích: cho khách lý do đi dạo và nhìn
kỹ studio — nơi bày sản phẩm. Chưa có code. Prompt vẽ: `docs/prompts.md` → "Prompt vẽ —
Nhặt cúc".

**Đã chốt (10/2026):**
- Quà chỉ nằm trong studio (vải hiếm cho Bàn thiết kế). Không tiền thật, không mã giảm
  giá, không quà thật: bốc thăm có quà thật là "khuyến mại mang tính may rủi", phải đăng
  ký với Sở Công Thương trước (NĐ 81/2018, sửa bởi NĐ 128/2024); và dữ liệu nằm trong
  trình duyệt nên ai cũng sửa được.
- Cúc thay cho xu; túi mù ở quầy thay cho máy gacha.
- Cúc rơi lại mỗi ngày, ở các chỗ giấu owner đặt trong trình lắp (mỗi ngày chọn ngẫu
  nhiên vài chỗ).
- Không tài khoản, không gửi gì lên server, không theo dõi.

**Vòng chơi**
1. Ngày đầu, một chiếc cúc nằm gần chỗ bắt đầu ngoài phố, thỉnh thoảng lấp lánh.
2. Chạm → nhân vật đi tới, nhặt lên; cúc bay vào **ô đếm** ở góc trên bên trái sân khấu
   (ô này chỉ hiện từ lần nhặt đầu tiên). Lần đầu tiên: bóng nghĩ trên đầu nhân vật
   "Ồ, một chiếc cúc! Để làm gì nhỉ?", rồi Udon (bong bóng dưới) trả lời.
3. Mỗi ngày 5 chiếc ở 5 chỗ giấu (trong + ngoài studio). Chạm ô đếm → tấm nhỏ "Cúc của
   bạn": hôm nay nhặt được mấy/5, đổi ở đâu, nút "Đến quầy" và "Nhờ Udon tìm".
4. Đủ 5 cúc → rổ túi mù trên quầy → bốc → mảnh hiếm hiện trên thẻ sưu tầm → "Mang ra
   Bàn thiết kế".
5. Nhặt hết trong ngày thì Udon báo, mai có cúc mới. Không chuỗi ngày, không đếm ngược,
   không nhắc quay lại.

**Con số** (hằng số đầu `js/hunt.js`, chỉnh được)

| | |
|---|---|
| Cúc mỗi ngày | 5 (ít chỗ giấu hơn thì bằng số chỗ) |
| Cúc đồng | mỗi chiếc có 10% là cúc đồng, tính bằng 3 |
| Giá một túi | 5 cúc |
| Bộ mảnh hiếm | 12 mảnh: 6 Thường · 4 Hiếm · 2 Quý |
| Tỉ lệ | Thường 60% · Hiếm 30% · Quý 10%; bậc nào hết mảnh thì bốc ở bậc còn lại |
| Trùng | không bao giờ: túi nào cũng ra mảnh chưa có → đủ bộ sau đúng 12 túi (60 cúc, khoảng 10 ngày) |
| Udon tìm giúp | 1 lần mỗi ngày |
| "Ngày" | theo đồng hồ máy khách, sang ngày lúc 0 giờ |
| Chỗ giấu hôm nay | ngẫu nhiên theo từng máy (hạt giống = chuỗi ngẫu nhiên lưu trong trình duyệt + ngày), cố định trong ngày: tải lại trang không đổi chỗ, không "cày" được |

**Chạm & bấm** (theo "Studio: luật chạm")
- Cúc là món nhỏ: chạm lệch ≤ 11px vẫn trúng (`nearSmall`, chỉ màn cảm ứng); cúc thắng
  hình Khu vực phía sau nó; nhãn tên thắng cúc.
- **Một chạm là nhặt** — ngoại lệ của luật "chạm lần đầu chỉ hiện tên": nhặt không mở gì,
  chạm nhầm cũng không mất gì. Nhân vật đi tới rồi mới nhặt; đang đi mà có chạm / vuốt
  khác thì thôi nhặt.
- Vuốt bắt đầu trên cúc vẫn là vuốt để đi.
- Cúc "nấp sau đồ": chỉ phần ló ra mới bấm được.
- Máy tính: không đổi con trỏ, không sáng khi rê chuột (không thì quét chuột là thấy hết);
  bấm = đi tới + nhặt.
- Bàn phím: cúc không nằm trong thứ tự Tab (trò tìm đồ); Udon thì có, Enter trên Udon =
  tìm giúp.

**Udon tìm giúp**
- Chạm Udon ở quầy (hoặc nút "Nhờ Udon tìm") → Udon ngửi không khí → nhảy xuống, chạy dọc
  sàn tới chiếc cúc chưa nhặt trong studio **gần nhân vật nhất** → đứng chỉ vào nó (dáng
  chó săn); chiếc cúc lấp lánh liên tục.
- Udon ra khỏi màn hình thì mép màn hình hiện dấu chân chỉ hướng.
- Nhặt xong (hoặc sau 30 giây) Udon chạy về quầy. Kéo Udon giữa chừng = thôi tìm, rồi như
  kéo thả hiện nay.
- Hết lượt trong ngày, còn cúc ngoài phố mà trong studio hết, hay hết cúc: Udon nói một câu
  (bảng chữ bên dưới). Ngoài phố không có Udon nên không có tìm giúp.

**Túi mù vải vụn**
- Món mới trong thư viện ảnh của trình lắp: rổ túi mù (`tui-mu/`). Owner đặt lên quầy,
  Loại "Khu vực", hành động mới **Túi mù vải vụn** (`tuimu` trong `ACTS` của
  `js/studio-layout.js`). Đặt cách nhãn "Quầy thu ngân" để hai nhãn không chồng nhau.
- Tấm "Túi mù vải vụn": số cúc đang có; nút "Bốc một túi · 5 cúc" (thiếu thì "Còn thiếu
  n cúc"); lưới 12 mảnh — có rồi thì hiện vải, chưa có thì khung trống + tên bậc; dòng
  tỉ lệ + "Không bao giờ ra mảnh trùng".
- Bốc: túi rung nhẹ, mở ra, mảnh vải trồi lên thẻ sưu tầm (`ui/the-suu-tam`) có tên + dấu
  bậc (`ui/dau-xanh` Thường, `dau-nau` Hiếm, `dau-hong` Quý). Nút "Mang ra Bàn thiết kế"
  / "Để sau".
- Đủ 12 mảnh: nút tắt, có dòng báo mùa sau thêm mảnh. Cúc vẫn cộng dồn cho mùa sau.
- Nhặt cúc đang tắt thì rổ túi mù cũng ẩn.

**Mảnh hiếm ở Bàn thiết kế**
- Có ít nhất một mảnh thì hàng tâm trạng thêm ô **Mảnh hiếm** (hình túi mù mở). Chọn → rổ
  vải là các mảnh hiếm đang có (quá 8 thì "Lục rổ" xoay vòng); trộn với vải khác như mọi
  tâm trạng.
- Mã thiết kế: mảnh hiếm đi vào danh sách màu riêng (trường 12) dạng `r<số>`. Trường này
  hiện là `<kind><hex>`, nên mã cũ đọc như cũ; mảnh hiếm dùng chung 19 chỗ của màu riêng.
- Người mở link thiết kế có mảnh hiếm vẫn xem và đặt may được; chỉ người có mảnh mới lấy
  được nó vào rổ.
- Ghi chú đơn: "mảnh hiếm: <tên>". Như mọi vải: Gem chọn vải vụn thật gần nhất và nhắn
  ảnh duyệt trước khi may (câu `studio.pt_note` đang có).

**12 mảnh hiếm** (tên đề xuất — Anna duyệt; nên chọn mảnh Gem có vải thật gần giống,
nhất là Gấm, Nhung, Chăn con công — không thì đổi mảnh khác trước khi vẽ)

| # | id | VI | EN | Bậc |
|---|---|---|---|---|
| 1 | `hoa-do-bo` | Hoa đồ bộ | House-dress florals | Thường |
| 2 | `soc-pyjama` | Sọc pyjama | Pyjama stripes | Thường |
| 3 | `bao-bot` | Vải bao bột | Flour-sack cotton | Thường |
| 4 | `denim-bac` | Denim bạc màu | Faded denim | Thường |
| 5 | `caro-khan` | Caro khăn rằn | Scarf check | Thường |
| 6 | `lanh-khau` | Lanh khâu tay | Hand-stitched linen | Thường |
| 7 | `gam-cuc` | Gấm hoa cúc | Chrysanthemum brocade | Hiếm |
| 8 | `lua-van` | Lụa vân sóng | Wave-figured silk | Hiếm |
| 9 | `len-tartan` | Len kẻ ô | Wool tartan | Hiếm |
| 10 | `theu-bong` | Thêu bông nhí | Tiny embroidered blooms | Hiếm |
| 11 | `nhung-do` | Nhung đỏ đô | Burgundy velvet | Quý |
| 12 | `chan-cong` | Chăn con công | Peacock blanket | Quý |

Chỉ có tên; câu chuyện thật của từng mảnh để giai đoạn 2.

**Lưu ở đâu**
- `localStorage['gem-cuc']` (như Tủ sưu tầm): `{ v: 1, id, day, found: [<id chỗ giấu>],
  cuc, sniff, rare: [<id mảnh>], seen }`. `id` = chuỗi ngẫu nhiên làm hạt giống, không
  gửi đi đâu.
- Đọc lại thì kiểm từng trường (số nguyên 0–9999, id mảnh phải có trong bảng): khách tự
  sửa được dữ liệu này; chữ chỉ vào trang qua `textContent`.
- Chế độ riêng tư / chặn lưu: chơi được trong lượt đó rồi mất.
- **iPhone (Safari):** 7 ngày không ghé thì Safari xoá dữ liệu của trang → mất cúc và mảnh
  hiếm. Chấp nhận ở giai đoạn 1 (quà ảo, cúc rơi lại mỗi ngày). Nếu khách tiếc thì giai
  đoạn sau gắn mảnh hiếm vào mã đơn như Tủ sưu tầm.
- Ai sửa localStorage để có 999 cúc cũng chỉ được vải ảo: không cần chống gian lận.

**Trình lắp (owner)**
- Ô mới **Nhặt cúc** trong tab Lắp studio: bật / tắt; "Thêm chỗ giấu" (hiện giữa màn hình
  rồi kéo). Mỗi chỗ: cảnh (trong / ngoài); lớp **Nổi trên đồ** hoặc **Nấp sau đồ** (đồ lớp
  sau che một phần, cúc chỉ ló ra). Đánh dấu một chỗ là **Chỗ lần đầu** (gần chỗ bắt đầu
  ngoài phố, nhìn thấy ngay).
- Cảnh báo: chỗ bị che kín (không lộ điểm ảnh nào), nằm dưới nhãn, ngoài đoạn đi được
  (x < 120 hoặc > bề rộng − 120); dưới 8 chỗ thì nhắc "ngày nào cũng gần giống nhau".
- Lưu trong bố cục (`studio_layout`), trường mới `hunt: { on, spots: [{ id, scene, x, y, z,
  first }] }` → `sanitize()` trong `js/studio-layout.js` phải biết trường này (trường lạ
  bị bỏ). Không thêm bảng, không migration, không đụng GRANT / RLS.
- Bật trong nháp, xem thử, rồi phát hành như mọi thay đổi bố cục.

**Chuyển động** (tắt Hiệu ứng = bản tĩnh)
- Lấp lánh: mỗi 6–9 giây, một chiếc cúc đang trong màn hình lóe 0,6 giây (mỗi lần một
  chiếc). Tắt hiệu ứng: dấu lấp lánh vẽ tĩnh, mờ, cạnh mỗi chiếc.
- Nhặt: cúc bay vòng cung vào ô đếm (0,45 giây), số nhảy. Tắt: số đổi ngay.
- Túi mù: rung 2 nhịp → mở → mảnh trồi lên (dưới 1 giây). Tắt: hiện ngay.
- Udon chạy tối đa khoảng 2 giây cho cả quãng; tắt hiệu ứng thì Udon hiện luôn ở chỗ cúc.
- Không âm thanh, không rung máy, không pháo giấy.

**Chữ trên màn hình** — khoá `studio.cuc_*` / `studio.bag_*` trong `STRINGS` của
`js/studio.js`. EN là bản đầu, Anna duyệt.

| Khoá | VI | EN |
|---|---|---|
| `cuc_first` | Ồ, một chiếc cúc! Để làm gì nhỉ? | Oh, a button! What's it for? |
| `cuc_explain` | Gom đủ 5 chiếc, đổi một túi mù vải vụn ở quầy nhé. Mỗi ngày quanh studio lại rơi vài chiếc. | Collect 5 and swap them for a blind bag of scraps at the counter. A few more drop around the studio every day. |
| `cuc_brass` | Cúc đồng! Tính bằng 3 chiếc đấy. | A brass button! It counts as 3. |
| `cuc_done` | Hôm nay bạn nhặt hết cúc rồi. Mai ghé lại nhé. | That's all of today's buttons. Come back tomorrow. |
| `cuc_title` | Cúc của bạn | Your buttons |
| `cuc_today` | Hôm nay: {n}/{t} chiếc | Today: {n} of {t} |
| `cuc_go` | Đến quầy | Go to the counter |
| `cuc_ask` | Nhờ Udon tìm | Ask Udon |
| `cuc_sniff` | Để Udon đánh hơi… | Let Udon sniff it out… |
| `cuc_tired` | Udon mỏi mũi rồi. Mai Udon tìm giúp tiếp nhé. | Udon's nose is tired. Udon will help again tomorrow. |
| `cuc_outside` | Udon ngửi thấy mùi cúc ngoài cửa kìa. | Udon smells a button out by the door. |
| `cuc_sr` | Nhặt được một chiếc cúc. Bạn có {n} chiếc. | Picked up a button. You have {n}. |
| `bag_title` | Túi mù vải vụn | Blind bag of scraps |
| `bag_sub` | Mỗi túi một mảnh vải hiếm, may được ở Bàn thiết kế. | Each bag holds one rare scrap to sew with at the design table. |
| `bag_open` | Bốc một túi · 5 cúc | Open a bag · 5 buttons |
| `bag_short` | Còn thiếu {n} cúc. Tìm quanh studio nhé. | {n} more buttons to go. Have a look around the studio. |
| `bag_odds` | Thường 60% · Hiếm 30% · Quý 10%. Không bao giờ ra mảnh trùng. | Common 60% · Rare 30% · Treasured 10%. Never a repeat. |
| `bag_full` | Bạn đã có đủ 12 mảnh. Mùa sau Gem thêm mảnh mới nhé. | You have all 12. Gem adds new scraps next season. |
| `bag_take` | Mang ra Bàn thiết kế | Take it to the design table |
| `bag_later` | Để sau | Later |
| `pt_rare` | Mảnh hiếm | Rare scraps |

**Tranh cần vẽ** (tách bằng tool có sẵn; file nguồn để trên Drive như các bộ trước)

| File nguồn | Ra | Cách tách |
|---|---|---|
| `sheet-cuc.png` | `cuc/cuc-01..08`: 4 cúc có sợi chỉ, 2 cúc nằm nghiêng, 2 cúc đồng | `studio-assets.py --batch` |
| `sheet-lap-lanh.png` | `lap-lanh/lap-lanh-01..04`: 3 lấp lánh + dấu chân Udon | `--batch` |
| `sheet-tui-mu.png` | `tui-mu/tui-mu-01..03`: túi đóng, túi mở, rổ túi trên quầy | `--batch` |
| `sheet-ud-cuc.png` | `udon/ud-ngui-gio`, `ud-chay-1`, `ud-chay-2`, `ud-ngui`, `ud-chi` | `--batch` rồi đổi tên; `clean-white.py --ink 5` |
| `vai-hiem-1.png`, `vai-hiem-2.png` | `vai/hiem-01..12` (320 px, lặp liền) | `design-assets.py`, thêm kiểu tờ 2 × 3 |

Dùng lại tranh có sẵn: ô đếm = `cuc-01` trên nền `ui/cham-kem`; bóng nghĩ =
`ui/bong-bong-s`; thẻ + dấu bậc như trên. Cúc vẽ sẵn `may/may-31`, `may-32` là đồ trang
trí: cúc nhặt được có sợi chỉ để khách phân biệt; đừng bày hai món đó gần chỗ giấu.

**Làm gì trong code** (khi được duyệt)
- `js/hunt.js` mới: chọn chỗ theo ngày, vẽ cúc trong `#st-world`, nhặt, ô đếm, Udon tìm,
  tấm túi mù; `window.GemHunt` cho bàn thiết kế.
- `js/studio.js`: lớp cúc trong cảnh, thứ tự chạm (nhãn > cúc > hình), chạm Udon, hành
  động `tuimu`, bóng nghĩ trên đầu nhân vật.
- `js/patch.js`: 12 mảnh hiếm + khoá `r<số>` (mã cũ không đổi).
- `js/studio-layout.js`: `hunt` trong `sanitize()`, `tuimu` trong `ACTS`;
  `js/studio-editor.js`: ô Nhặt cúc.
- `css/studio.css`: mục `/* NHẶT CÚC */`; `studio.html` + `admin.html`: nhúng file, đổi `?v=`.
- `tools/studio-assets.py` (nhóm thư viện "Nhặt cúc"), `tools/design-assets.py` (tờ vải 2 × 3).

**Kiểm tra** — `hunt` trong `tools/check-studio.py` (ngày + chuỗi hạt giống cố định qua
init script):
- cùng ngày cùng chỗ, sang ngày đổi chỗ; Chỗ lần đầu có trong ngày đầu;
- điện thoại một chạm là nhặt, lệch 8px vẫn nhặt; máy tính bấm là nhặt, con trỏ không đổi;
  vuốt trên cúc không nhặt; nhãn đè cúc thì nhãn thắng; cúc nấp sau đồ chỉ bấm được phần ló;
- câu lần đầu chỉ một lần; cúc đồng +3; nhặt hết thì có câu báo;
- Udon tới đúng chiếc gần nhân vật nhất, một lần mỗi ngày, có dấu chân khi ra khỏi màn hình;
- túi mù trừ 5 cúc, 12 lần không trùng, đủ bộ thì tắt nút;
- ô Mảnh hiếm ở bàn thiết kế; mã có `r<số>` đi qua giỏ hàng + Tủ sưu tầm; mã cũ vẫn đọc được;
- `gem-cuc` bị sửa bậy không làm vỡ trang; tắt hiệu ứng; không lỗi script;
- trình lắp: thêm / kéo / xoá chỗ, cảnh báo, phát hành vẫn giữ `hunt`.

**Không làm ở giai đoạn 1:** đồ sưu tầm có câu chuyện + "Sổ nhặt nhạnh" (giai đoạn 2); cúc
giấu trong thẻ sản phẩm; quà ở cửa hàng; lưu lên server / đồng bộ giữa các máy; bảng xếp
hạng, chia sẻ; âm thanh.

**Cần biết**
- Trò tìm đồ dựa vào mắt nhìn: người dùng trình đọc màn hình không chơi được. Chấp nhận vì
  đây là phần thêm — không khoá thông tin, giá hay vải cơ bản nào sau nó.
- Chỉ bật khi đủ tranh và owner đã đặt ít nhất 8 chỗ giấu. Studio chưa lên menu nên thử
  trước với khách tại cửa hàng.
- Sau này nếu muốn quà thật: chỉ theo mốc cố định (đủ N cúc → một sticker), nhân viên nhìn
  màn hình xác nhận; không bốc thăm quà thật.

### Góp ý đợt 3 (10/2026)

- **Bàn thiết kế gọn lại:** trên cùng là các món + "Gợi ý ngẫu nhiên". Lần đầu chỉ
  thấy 3 lựa chọn (kiểu ghép, tông, họa tiết); chất vải / tự vẽ / ảnh / lời nhắn
  gập trong "Thêm chi tiết cho Gem (không bắt buộc)" — tự mở khi chọn "Theo hình
  mình vẽ". Bỏ hàng "Đồ thật Gem đã may" (bảng của Udon làm việc đó) và nút "Lưu
  ảnh"; "Chép link" thành "Chia sẻ thiết kế" (điện thoại: bảng chia sẻ của máy;
  máy tính: chép link — link mở lại đúng thiết kế ở bàn).
- **Vẽ:** khung vẽ to hơn (tới 440px), 3 cỡ nét + tẩy. Mã nét mới: ký tự đầu = chữ
  B64 của (màu + 5 × cỡ); mã cũ (số 0–3) vẫn đọc được.
- **"Tự thiết kế theo mẫu này"** trên thẻ sản phẩm có ở bàn thiết kế (gối, lót cốc,
  dây buộc tóc): mở bàn đúng món đó, ảnh món lên bảng của Udon. Món khác (túi
  Origami…) chưa có vì bàn chưa vẽ được dáng đó.
- Udon gợi ý món có sẵn gần màu → có link "Xem món này" ngay trong câu nói.
- Trình lắp: khung vùng bấm nằm **dưới** đồ vật (chọn món trong khung được), tên
  khung nằm trên cùng và là chỗ nắm để chọn / kéo khung.
- Giấy nhắn ghim lên chính bức tranh bảng (nếu bố cục có) thay vì khung vùng bấm,
  và nằm trên lớp đồ vật.
- Udon rời xe về quầy: đo vị trí trước rồi mới nhấc ra (trước đó Udon bay từ cửa vào).
- **Mail:** nút "Mở trang quản trị" vỡ chữ — denomailer cắt dòng giữa ký tự UTF-8.
  Phần HTML giờ gửi toàn ký tự ASCII (chữ Việt thành `&#…;`). Đã triển khai lại
  Edge Function `notify`.

### Phụ kiện trên nhân vật (đợt 1)

5 món "đồ mặc" đều là phụ kiện (túi Oxford, túi Denim, dây buộc tóc, dây đeo
cổ tay, Bloom Charm) nên dùng luôn sticker `wear/<sku>.webp`, không cần vẽ
lại nhân vật. `WEAR_AT` trong `js/studio.js`: mỗi khung (4 bạn × 10) có tỉ lệ
khung, điểm bàn tay gần (dò màu da, nắm tay / chỗ cầm tay xe) và gáy (dò mép
tóc ở 12% chiều cao). `WEAR`: túi treo ở tay (một túi một lúc), dây đeo và
charm hai bên túi, dây buộc tóc ở gáy. Góc thử đồ có nút "Đeo thử" / "Tháo
ra". Nắm tay gần (`char/pN-<khung>-tay.webp`, `--hands` cắt ra cùng `WEAR_AT`) được vẽ đè lại lên
quai túi / vòng dây nên món đồ trông như đang cầm, không dán bên ngoài. Đồ thử theo khách hết lượt (sessionStorage `gem-mac`); món đã mua (có
trong Tủ) thì nhớ luôn (localStorage `gem-mac`). Có tranh nhân vật mới → chạy
lại phần dò điểm và dán `WEAR_AT` mới. Áo (đổi dáng người) thuộc đợt 2: phải
vẽ lại khung, không dán đè được.

### Báo mail cho nhân sự (đơn mới / đặt workshop / lời nhắn)

Migration `gem_notify_mail` + `gem_notify_payload`, Edge Function `notify`
(mã nguồn: `supabase/functions/notify/index.ts`).

- Trigger `notify_new()` sau mỗi insert vào `orders`, `bookings`, `notes` gọi
  Edge Function qua `pg_net` — **không đợi, không chặn**: gửi mail hỏng thì
  đơn / chỗ / lời nhắn vẫn lưu bình thường (lỗi chỉ thành `warning` trong log).
- Bảo vệ hàm (deploy với `verify_jwt = false`): header `x-notify-secret` phải
  khớp mã ngẫu nhiên cất trong **Vault** (`notify_secret`), không ai phải dán
  mã này ở đâu. Hàm đọc dữ liệu **chỉ** qua `notify_payload()` (service_role
  mới gọi được) — không grant bảng nào cho service_role. Mỗi bản ghi báo đúng
  một lần (`notify_log`), bản ghi cũ hơn 1 giờ thì bỏ qua.
- Người nhận: email đăng nhập của **mọi** tài khoản trong `staff` (hiện 3
  người). Muốn gửi danh sách khác thì đặt secret `NOTIFY_TO` (cách nhau bằng
  dấu phẩy). Lời nhắn: báo từng lời (chưa gom).
- Chữ khách gõ trong mail đều qua `esc()`.
- Đã kiểm: gọi sai mã → 403; đúng mã, chưa cấu hình Gmail → `not configured`;
  `notify_payload` lần hai cho cùng bản ghi → `dup`; `anon`/`authenticated`
  không gọi được `notify_secret` / `notify_payload` / `notify_unclaim`, không
  đọc được `notify_log`.

**Bật gửi mail thật (làm một lần, cần người giữ tài khoản Gmail):**

1. Chọn Gmail dùng để gửi — nên là Gmail riêng của Gem, không dùng Gmail cá
   nhân. Bật **Xác minh 2 bước** cho tài khoản đó.
2. Vào <https://myaccount.google.com/apppasswords>, tạo mật khẩu ứng dụng tên
   "Gem notify", chép 16 chữ cái (bỏ dấu cách).
3. Supabase → project `gem-cham-sac` → **Edge Functions → Secrets** → thêm:
   `GMAIL_USER` = địa chỉ Gmail, `GMAIL_APP_PASSWORD` = 16 chữ vừa chép.
4. Thử: gửi một lời nhắn ở `studio.html` → vài giây sau cả 3 người nhận mail.
   Không thấy thì xem **Edge Functions → notify → Logs**.

Mật khẩu ứng dụng chỉ nằm trong Secrets của Supabase — **không** dán vào chat,
repo hay trang web. Lộ thì vào trang ở bước 2 thu hồi và tạo cái mới.
Gmail giới hạn ~500 mail/ngày, dư cho lượng đơn hiện tại.

Trang quản trị cũng hiện **số việc tồn** trên tab: đơn `new`, giữ chỗ `held`,
lời nhắn `pending`.

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
