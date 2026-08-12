# Gem Chạm Sắc — Design Document

> Bản thiết kế cho sprint hiện tại. Gom toàn bộ thay đổi đã làm, quyết định đã
> chốt, và những gì còn phải chốt. Cập nhật lần cuối: 2026-08.
>
> Tài liệu này thay thế 3 bản báo cáo rời trước đó và là nguồn duy nhất
> (single source of truth) cho sprint này.

---

## 0. Mục lục

1. [Trạng thái hiện tại](#1-trạng-thái-hiện-tại)
2. [Quyết định đã chốt](#2-quyết-định-đã-chốt)
3. [Ba quyết định mới trong sprint này](#3-ba-quyết-định-mới-trong-sprint-này)
4. [Kiến trúc sau sprint](#4-kiến-trúc-sau-sprint)
5. [Data model](#5-data-model)
6. [Trang quản trị](#6-trang-quản-trị)
7. [Đặt lịch workshop](#7-đặt-lịch-workshop)
8. [Trang Hoạt động (blog)](#8-trang-hoạt-động-blog)
9. [Rà soát UX](#9-rà-soát-ux)
10. [Information architecture](#10-information-architecture)
11. [Bảo mật](#11-bảo-mật)
12. [Thứ tự làm](#12-thứ-tự-làm)
13. [Còn phải chốt](#13-còn-phải-chốt)
14. [Không làm trong sprint này](#14-không-làm-trong-sprint-này)

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
| D1 | **Giỏ hỏi hàng → tin nhắn + VietQR.** Không cổng thanh toán trong bản đầu, không giỏ e-commerce thật | Người xác nhận từng đơn |
| D2 | **“Độc bản” là kiểu dáng, không phải số lượng** | Sản phẩm làm lại được → đặt giá theo loại là hợp lý |
| D3 | **Hiện giá trên web** | Đảo lại quyết định “KHÔNG hiện giá” trong `CLAUDE.md` |
| D4 | **Khách chọn kênh:** Zalo / Messenger / email | Zalo & Messenger không nhận prefilled text qua URL → nội dung giỏ tự copy vào clipboard |
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

### Thanh toán

| # | Quyết định | Ghi chú |
|---|---|---|
| D14 | **Máy POS từ ngân hàng Việt** cho tại cửa hàng | Square / SumUp / Zettle **không hỗ trợ Việt Nam** — đừng mất thời gian |
| D15 | **Cổng thanh toán Việt có thẻ quốc tế** cho online: VNPAY / OnePay / Payoo | Stripe không mở merchant ở VN; PayPal hạn chế với doanh nghiệp VN |
| D16 | **Thiết kế sẵn các trường thanh toán ngay từ bản đầu**, dù chưa thu tiền online | Sau này gắn cổng là *thêm vào*, không phải *làm lại* |
| D17 | Cân nhắc **đăng lên Klook / Airbnb Experiences** | Giải cả bài toán tìm khách, không chỉ thanh toán. Hoa hồng 20–30% = tiền marketing |

### Bị đảo lại trong sprint này

| # | Quyết định cũ | Trạng thái |
|---|---|---|
| ~~D18~~ | ~~Pages CMS để quản trị nội dung~~ | ❌ **BỎ** — xem [§3.3](#33-trang-quản-trị-riêng) |
| ~~D19~~ | ~~Refactor `CATALOG` → `data/products.json`~~ | ❌ **BỎ** — sản phẩm vào Supabase thay vì file JSON |
| D20 | Đặt miễn phí, trả tại buổi học | ⚠️ **GIỮ cho bản đầu**, nhưng xem [§3.2](#32-khách-nước-ngoài-có-trả-trước-không) |

---

## 3. Ba quyết định mới trong sprint này

### 3.1 Trang riêng hay gộp vào Sản phẩm?

**Quyết định: trang riêng `workshop.html`, VÀ đưa vào nav chính.**

Lý do từ góc độ UX:

- **URL chia sẻ được.** Đây là lý do quyết định. Bạn cần dán được một link vào bio
  Instagram, in QR lên poster ở studio, trả lời DM bằng một đường dẫn. Không thể
  gửi ai đó “phần đặt lịch ở cuối trang Sản phẩm”.
- **Việc có mục đích khác việc dạo xem.** Đặt lịch là một *task*; xem sản phẩm là
  *khám phá*. Trộn một luồng giao dịch vào trang dạo xem làm loãng cả hai.
- **`san-pham.html` đã quá dài rồi:** 5.805px ở desktop, 7.425px ở mobile. Gắn
  lịch đặt vào cuối là chôn nó — ai vào để đặt lịch phải cuộn qua toàn bộ catalog.
- **SEO riêng.** “workshop tái chế Hà Nội” là một truy vấn khác “túi vải vụn”.
  Một trang một mục tiêu.

**Tên file & nhãn nav:** `workshop.html`, nhãn nav **“Workshop”** — không phải
“Đặt lịch”. Nav nên đặt tên *sự vật*, không phải *hành động*; người ta quét nav
tìm danh từ. “Workshop” cũng là từ đã dùng nguyên bản trong copy hiện tại.

**Thẻ “Workshop trải nghiệm”** ở `san-pham.html#dich-vu` **giữ lại** làm cửa thứ
hai, thêm nút dẫn sang `workshop.html`. Hai cửa, một đích.

> Nếu workshop là một nguồn thu thật và là điểm hút khách du lịch, thì giấu cửa
> vào bên trong trang Sản phẩm là sai. Khách đáp xuống trang chủ phải thấy ngay.

### 3.2 Khách nước ngoài có trả trước không?

**Quyết định: đúng về lâu dài, nhưng KHÔNG làm trong bản đầu.**

Lý do từ góc độ UX — và nó ngược với trực giác thông thường:

- **Khách du lịch *mong đợi* được trả trước.** Mọi trải nghiệm khác trong chuyến
  đi của họ — Klook, GetYourGuide, Airbnb, một lớp học nấu ăn — đều thu tiền
  trước. Một workshop nói “cứ đến rồi trả tiền mặt” với khách nước ngoài đọc ra
  là *kém tin cậy hơn*, không phải tiện hơn. Nó tạo lo lắng: chỗ này có thật
  không? buổi học có diễn ra không? mình có cần tiền mặt đúng số không? họ có
  nhận thẻ không?
- **Trải nghiệm tệ nhất không phải là form thanh toán** — mà là khách du lịch đến
  studio rồi buổi học bị hoãn vì mấy người đặt miễn phí kia không xuất hiện.
- **Với khách Việt thì ngược lại.** Trả tại chỗ là bình thường và thoải mái;
  chuyển khoản trước cho một tiệm nhỏ mới là điều gây ngần ngại.

→ **Khách Việt giữ chỗ miễn phí, trả tại buổi học. Khách nước ngoài trả trước
bằng thẻ.** Cùng một buổi, hai đường thanh toán. Trường `require_prepay` trên
`workshop_types` làm được việc này mà không cần code riêng.

**Nhưng bản đầu chưa bật.** Không phải vì tiếc chi phí, mà vì mở merchant account
với VNPAY/OnePay mất vài tuần giấy tờ và nằm ngoài tầm mình — chờ nó là chặn cả
trang đặt lịch. Nên:

| Giai đoạn | Làm gì |
|---|---|
| Bản đầu | Ai cũng giữ chỗ miễn phí. Các trường thanh toán có sẵn nhưng chỉ ghi `pay_on_site`. |
| Ngay lập tức, miễn phí | **Ghi rõ trên trang là nhận hình thức gì** (“Trả tại studio — nhận tiền mặt và thẻ” khi đã có POS). Xoá được phần lớn lo lắng của khách du lịch mà không tốn gì. |
| Khi có merchant account | Bật `require_prepay` cho những loại workshop cần. |

### 3.3 Trang quản trị riêng

**Quyết định: xây trang quản trị riêng `admin.html` trên Supabase.**

Đây là quyết định lớn nhất của sprint. Nó **đảo lại hai quyết định cũ**:

- ❌ **Pages CMS bỏ.** Pages CMS chỉ sửa được file trong repo — không thể hiện đơn
  hàng hay lịch đặt. Muốn một chỗ xem cả đơn hàng, trạng thái, lịch đặt và sản
  phẩm thì phải là trang tự xây, đọc từ Supabase.
- ❌ **`data/products.json` bỏ.** Nếu em gái bạn sửa sản phẩm trong cùng trang
  quản trị với đơn hàng thì sản phẩm phải nằm cùng database. Một hệ thống, không
  phải hai.

Và **thêm ba thứ mới**:

- ➕ **Đơn hàng phải thành dòng dữ liệu, không còn là email.** Hiện `basket.js`
  gửi mailto/endpoint — không có bản ghi nào. Muốn “xem đơn / đổi trạng thái” thì
  phải có bảng `orders`. `basket.js` sẽ ghi vào Supabase, email chỉ còn là thông báo.
- ➕ **Cần đăng nhập thật.** Em gái + nhân viên tương lai = nhiều tài khoản, và
  phân quyền khác nhau. Supabase Auth + RLS theo role.
- ➕ **Cần Supabase Storage** cho ảnh sản phẩm (thêm sản phẩm phải upload được ảnh).

**Đánh đổi phải nói rõ:** sản phẩm chuyển sang fetch lúc chạy → tên sản phẩm không
còn nằm trong HTML → **SEO cho trang sản phẩm yếu đi một chút**. Ở quy mô này lưu
lượng đến từ Instagram/Facebook nhiều hơn Google nên mình chấp nhận được. Nếu sau
này SEO thành ưu tiên, có phương án lai: giữ tên/mô tả/ảnh trong HTML tĩnh, chỉ
fetch giá và tình trạng còn hàng.

**Vẫn không cần đổi host.** Supabase Auth + RLS chạy được từ trang tĩnh trên
GitHub Pages.

> Đây chính là lúc **dấu hiệu số 3 và số 5** trong danh sách “khi nào nên chuyển”
> phát tín hiệu: cần đăng nhập, và đang mất quá nhiều giờ làm tay. Khung đó đã
> đúng — và giờ các bạn đã tới đó.

---

## 4. Kiến trúc sau sprint

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
season-02.html             hoat-dong.html             ├ Hoạt động
404.html                     └ bài viết               └ Cài đặt (owner)
                                │
                                ▼
                    ┌───────────────────────┐
                    │  Supabase             │
                    │  Postgres + RLS       │
                    │  Auth (staff)         │
                    │  Storage (ảnh)        │
                    │  RPC (book_session)   │
                    └───────────────────────┘
```

Không có Vercel, không có Netlify, không có framework, không có build step.
Chỉ thêm một backend.

---

## 5. Data model

### Sản phẩm

```sql
products
  id, slug, category, sort_order
  name_vi, name_en, desc_vi, desc_en
  price                -- VND, số nguyên
  availability         -- 'in_stock' | 'low' | 'out'   (đặt tay, xem D7)
  sprite_key           -- khớp với SPRITES trong basket.js
  images[]             -- Supabase Storage paths, ảnh đầu là thumbnail
  is_published         -- ẩn/hiện mà không cần xoá
  created_at, updated_at
```

### Đơn hàng

```sql
orders
  id, code                       -- mã ngắn đọc được, đọc qua điện thoại được
  customer_name, phone, email
  address, is_pickup             -- tự đến lấy thì không cần địa chỉ
  note
  status                         -- xem bảng dưới
  subtotal                       -- chốt lúc đặt, KHÔNG đọc lại từ bảng giá
  channel                        -- 'web' | 'zalo' | 'messenger' | 'instore'
  payment_status, payment_method, amount, currency, provider_ref, paid_at
  created_at, updated_at

order_items
  id, order_id, product_id
  name_snapshot, unit_price, qty  -- snapshot để đơn cũ không sai khi đổi giá
```

**Trạng thái đơn hàng:**

`mới` → `đã xác nhận` → `đang chuẩn bị` → `đã gửi` \| `đã giao` → `xong`
&nbsp;&nbsp;+ `đã huỷ` (từ bất kỳ trạng thái nào)

### Workshop

```sql
workshop_types
  id, slug, name_vi, name_en, desc_vi, desc_en
  duration_minutes     -- 1–3h tuỳ loại (D11)
  price
  require_prepay       -- bật là buộc trả trước (§3.2)
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
  status               -- xem bảng dưới
  payment_status, payment_method, amount, currency, provider_ref, paid_at
  created_at
```

**Trạng thái đặt lịch:**

`giữ chỗ` → `đã xác nhận` → `đã đến` \| `không đến`
&nbsp;&nbsp;+ `đã huỷ`

> `không đến` không phải để phán xét khách — nó là dữ liệu để sau này biết có cần
> thu cọc hay không.

### Hoạt động

```sql
posts
  id, slug
  title_vi, title_en, excerpt_vi, excerpt_en, body_vi, body_en
  cover_image, images[]
  event_date           -- ngày diễn ra sự kiện, khác ngày đăng
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

### Hai trường quan trọng nhất

| Trường | Vì sao quan trọng |
|---|---|
| `amount` / `unit_price` | Lưu số tiền **tại thời điểm đặt**. Đổi bảng giá không làm sai đơn cũ. Đây là lỗi kinh điển của hệ thống bán hàng tự làm. |
| `require_prepay` | Cho phép hai đường thanh toán (khách Việt / khách nước ngoài) mà không cần code riêng. |

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
Hai cái browser không tự thoả thuận được với nhau.

---

## 6. Trang quản trị

`admin.html` · `noindex` · **không** nằm trong nav công khai · đăng nhập Supabase Auth.

### Nguyên tắc thiết kế — quan trọng nhất

**Thiết kế cho điện thoại trước, không phải máy tính.**

Đây là điểm khác biệt lớn nhất so với admin thông thường. Em gái bạn đứng ở
cửa hàng cả ngày — sẽ mở bằng điện thoại giữa lúc đang gói hàng, không phải ngồi
trước laptop. Nên:

- Mobile-first thật sự, nút to, ít phải gõ chữ
- Đổi trạng thái bằng **một lần bấm**, không phải mở form rồi Save
- **Mọi số điện thoại đều là link bấm gọi / mở Zalo được.** Chị ấy liên lạc với
  khách suốt ngày — đây là thao tác dùng nhiều nhất, không phải sửa sản phẩm.
- Màn hình mặc định là **“Hôm nay”**, không phải dashboard số liệu chung

### Các mục

| Mục | Nội dung | Quyền |
|---|---|---|
| **Hôm nay** | Đơn mới cần xử lý · buổi học hôm nay + danh sách người đến kèm số điện thoại · việc cần nhắc | staff |
| **Đơn hàng** | Danh sách, lọc theo trạng thái, chi tiết, đổi trạng thái | staff |
| **Đặt lịch** | Buổi sắp tới + số chỗ · danh sách người đăng ký từng buổi · tạo/sửa/huỷ buổi | staff |
| **Sản phẩm** | Thêm/sửa/ẩn, upload ảnh, giá, tình trạng còn hàng, thứ tự | staff |
| **Hoạt động** | Viết/sửa bài, upload ảnh | staff |
| **Cài đặt** | Loại workshop, giá, `require_prepay`, quản lý tài khoản nhân viên | **owner** |

### Việc của Anna mỗi tuần

| Việc | Tần suất | Thời gian |
|---|---|---|
| Đăng buổi học (mở trước ~4 tuần) | ~1 lần/tháng | ~2 phút |
| Nhắn Zalo nhắc trước buổi học | mỗi buổi | ~3 phút |
| Xác nhận đơn hàng mới | khi có đơn | ~1 phút/đơn |
| Cập nhật giá / thêm sản phẩm | khi cần | — |

---

## 7. Đặt lịch workshop

Chi tiết mô hình đã chốt ở [§2](#2-quyết-định-đã-chốt) (D9–D13). Đề xuất lịch:

| Thứ | Giờ | Nội dung |
|---|---|---|
| Tư | 17:00–19:00 | Bìa sổ vải vụn |
| Bảy | 10:00–12:00 | Giấy tái chế |
| Bảy | 14:30–16:30 | Bìa sổ vải vụn |
| CN | — | Không lên lịch, chỉ qua tin nhắn |

Lý do: thứ Tư chiều muộn hợp người đi làm/đi học; **hai buổi dồn vào thứ Bảy chỉ
cần một lần chuẩn bị và dọn dẹp**, mà thứ Bảy khách cũng rảnh nhất. Các ngày còn
lại để trống cho khách hẹn giờ riêng và cho việc studio.

**Đây là dữ liệu, sửa lúc nào cũng được — không chặn việc code.**

### Luồng của khách

1. **Danh sách buổi** — chủ đề, ngày & giờ, thời lượng, giá, `Còn 5/8 chỗ` (số thật).
   Đủ chỗ thì hiện “Đã đủ chỗ”.
2. **Chọn buổi** → form ngắn: tên, số điện thoại (bắt buộc), số người, email
   (không bắt buộc), ghi chú. Không cần địa chỉ.
3. **Xác nhận** — mã giữ chỗ trên màn hình + nút **tải file lịch `.ics`** (sinh
   hoàn toàn phía browser, không cần server).
4. **Nhắc trước** — Anna nhắn Zalo trước một ngày. Đây cũng là lúc chốt số vật
   liệu cần chuẩn bị.

### Rủi ro: khách không đến

Đặt miễn phí, không cọc là mô hình có tỉ lệ vắng cao nhất. **Không đề nghị thu
cọc** — nó chặn đúng những người mới tò mò muốn thử. Thay vào đó:

- Bắt buộc số điện thoại (là kênh nhắc, không phải thông tin cho vui)
- Anna nhắn Zalo trước một ngày từ danh sách trong admin
- Dùng chữ **“giữ chỗ”**, không dùng “đã đặt” — đặt đúng kỳ vọng
- **Chỉ chuẩn bị vật liệu sau khi nhắn xác nhận**, không theo số đăng ký

Theo dõi bằng trạng thái `không đến`. Nếu vắng quá nhiều thì lúc đó hãy tính cọc.

---

## 8. Trang Hoạt động (blog)

`hoat-dong.html` — bài viết về sự kiện đã qua: workshop ở BUV, hội chợ UN Youth Day…

### Tên trang

**Đề xuất: “Hoạt động”.** Chính xác cho nội dung (sự kiện, nơi đã tham gia) và
dễ tìm hơn trên Google. Phương án ấm hơn, đúng giọng slow living hơn:
**“Nhật ký”** — nhưng kém chính xác cho sự kiện. Chọn “Hoạt động”.

### KHÔNG nhúng feed mạng xã hội

Đã cân nhắc và loại:

- Script nhúng của Facebook/Instagram **rất nặng và có tracking** → trái với
  nguyên tắc privacy-first trong `CLAUDE.md` (anti-pattern #2)
- Embed feed Instagram cần token + app review, và hay hỏng
- Giao diện embed không theo brand
- **Bài gốc bị xoá là mất luôn nội dung trên web của mình**
- Và quan trọng nhất: **một embed không giúp gì cho SEO.** “Workshop tái chế tại
  BUV” là cụm người ta tìm; một bài Facebook nhúng thì Google không đọc như nội
  dung của bạn.

### Làm thay vào đó

Bài viết tự viết, lưu trong Supabase, mỗi bài **có thể** kèm link sang bài gốc
trên Facebook/Instagram (“Xem thêm trên Facebook”).

Đã có tiền lệ trong repo: `season-02.html` chính là mô hình này — trang kể chuyện
riêng, link ra FB reel.

Mỗi bài: tiêu đề · ngày diễn ra · địa điểm · ảnh bìa · 2–3 đoạn ngắn bằng giọng
“chúng mình” · gallery ảnh · link bài gốc (không bắt buộc).

### Hạn chế phải nói rõ

Không có build step nên bài viết render phía browser từ `?slug=…`. Nghĩa là
**Google index bài viết yếu hơn so với file HTML tĩnh.** Nếu sau này SEO cho blog
thành ưu tiên thật thì cần thêm một generator nhỏ — chưa làm trong sprint này.

---

## 9. Rà soát UX

Rà soát trên bản đang chạy, chụp ở 390px và 1440px. Số đo thật:

| Trang | Cao (mobile) | Cao (desktop) | Số ảnh |
|---|---:|---:|---:|
| `index` | 5.614px | 4.394px | 13 |
| `cau-chuyen` | **7.974px** | 5.678px | **2** |
| `mo-hinh` | 5.838px | 3.383px | **2** |
| `san-pham` | 7.425px | 5.805px | 20 |
| `ghe-tham` | 3.898px | 2.914px | 4 |

**Điểm tốt:** không trang nào bị tràn ngang · mọi ảnh đều có `alt` · mỗi trang
đúng một `<h1>`.

### Ưu tiên cao

| # | Vấn đề | Đề xuất |
|---|---|---|
| U1 | **Hero trang chủ không có sản phẩm nào.** Màn hình đầu chỉ có chữ + mascot. Một thương hiệu thủ công *trực quan* mà màn đầu không cho thấy mình làm ra cái gì. Tấm ảnh patchwork trong thẻ Season 02 đẹp và thuyết phục hơn Udon nhiều — mà nó nằm dưới màn đầu | Đưa ảnh sản phẩm / studio lên hero |
| U2 | **Teaser sản phẩm ở trang chủ chỉ hiện 1 món một lúc** (carousel). Shop có 19 sản phẩm mà màn hình chỉ cho thấy một. Carousel có tỉ lệ xem qua slide 2 rất thấp | Đổi thành grid 3–4 món, thấy ngay độ đa dạng |
| U3 | **Trang chủ không nhắc gì đến workshop** — trong khi nó đang thành nguồn thu và điểm hút khách du lịch | Thêm một section workshop ở trang chủ |
| U4 | **Không có gì ở màn đầu nói đây là cái gì, ở đâu.** Câu hero rất hay nhưng người lạ không biết đây là studio thủ công ở Hà Nội có thể ghé | Thêm dòng “Hà Nội · mở 09:00–19:00 hàng ngày” gần đầu trang |
| U5 | **Khách nước ngoài gặp một bức tường tiếng Việt.** Nút VI/EN là một pill nhỏ góc phải | Tự nhận `navigator.language` **ở lần truy cập đầu tiên**, vẫn cho đổi và vẫn nhớ lựa chọn |
| U6 | **`cau-chuyen.html` gần 8.000px trên mobile và chỉ có 2 ảnh** (logo + logo footer). Trang kể chuyện của một brand thủ công mà không có ảnh studio, ảnh người làm, ảnh quá trình | Thêm ảnh thật, cắt bớt chữ |

### Ưu tiên trung bình

| # | Vấn đề | Đề xuất |
|---|---|---|
| U7 | Chữ ở `cau-chuyen` **căn giữa** trong đoạn dài — khó đọc | Căn trái, giới hạn ~65 ký tự/dòng |
| U8 | **“Ba điều chúng mình giữ” lặp nguyên văn** ở trang chủ và Câu chuyện | Bỏ một chỗ, hoặc làm khác nhau |
| U9 | Badge “Season 02 đang diễn ra” **bị ẩn ở mobile** → khách mobile không biết đang mở cửa | Hiện ở mobile, dạng gọn |
| U10 | **17–21 phần tử bấm nhỏ hơn 40px** (icon social ở footer, link nav) | Nâng vùng bấm lên 44px |
| U11 | Số 01–04 ở phần cam kết **không phải một chuỗi tuần tự** — chúng là các việc song song, nên số ở đây chỉ để trang trí | Bỏ số, hoặc đổi thành cấu trúc khác |
| U12 | Ảnh sản phẩm 1–4MB (đã có trong backlog `CLAUDE.md`) | Nén lại, thêm `loading="lazy"` cho ảnh dưới màn đầu |

---

## 10. Information architecture

Nav hiện tại có 5 mục. Thêm Workshop + Hoạt động là **7** — quá chật, nhất là ở
desktop khi nav nằm cùng hàng với badge season và nút VI/EN. Repo đã từng có lỗi
tràn nav ở mobile (commit `3b7d818`).

**Đề xuất: gộp “Câu chuyện” + “Mô hình” thành “Về Gem”** → về lại 6 mục.
Hai trang đó đều là nội dung giới thiệu, và “Mô hình” là mục ít khả năng được
khách chọn làm điểm vào nhất.

```
Trang chủ · Về Gem · Sản phẩm · Workshop · Hoạt động · Ghé thăm
```

Phương án khác: bỏ “Mô hình” khỏi nav, link từ trong “Câu chuyện”.

---

## 11. Bảo mật

**Đây là phần quan trọng nhất của cả sprint.** Làm sai là số điện thoại và địa chỉ
của toàn bộ khách nằm công khai trên internet.

| Nguyên tắc | Chi tiết |
|---|---|
| **RLS là biên bảo mật thật, không phải màn đăng nhập** | `admin.html` là file HTML công khai — ai cũng tải được. Cái bảo vệ dữ liệu là policy trong database, không phải trang login. |
| Khách (anon) **chỉ** được đọc | `products` (đã publish) · `posts` (đã publish) · `workshop_types` · thông tin buổi học + **số chỗ còn lại** qua một view |
| Khách **không bao giờ** đọc được | `bookings`, `orders`, `order_items`, `staff` |
| Khách ghi dữ liệu **chỉ qua RPC** | `book_session()` và `create_order()` — không được `INSERT` trực tiếp |
| Số chỗ còn lại đi qua **view**, không phải bảng | View chỉ trả về con số, không trả thông tin khách |
| `staff` đọc/ghi đơn & lịch; **chỉ `owner`** sửa được loại workshop, giá, tài khoản | Phân hai role, không nhiều hơn |
| Publishable key công khai là **bình thường** | Nó được thiết kế để lộ. Nhưng chỉ đúng khi RLS đúng. |

Sẽ kiểm tra bằng cách thử đọc `bookings` bằng anon key và xác nhận bị chặn.

---

## 12. Thứ tự làm

Bạn muốn gom thành một lần thay đổi lớn. Thứ tự đề xuất — mỗi bước dùng được ngay,
không phải chờ bước sau:

| # | Việc | Phụ thuộc | Ước lượng |
|---|---|---|---|
| 1 | **Nút “Đăng ký workshop”** trên thẻ Workshop | không gì | ~1h |
| 2 | **Sửa UX ưu tiên cao** (U1–U5) | không gì | ~1 ngày |
| 3 | **Dựng Supabase**: bảng, RLS, RPC, Auth, Storage | — | ~1 ngày |
| 4 | **Chuyển sản phẩm sang Supabase** + `san-pham.html` đọc từ đó | 3 | ~1 ngày |
| 5 | **Gộp giỏ hàng vào `san-pham.html`**, đơn ghi vào `orders` | 3, 4 | ~1 ngày |
| 6 | **`workshop.html`** + luồng đặt lịch + `.ics` | 3 | ~1,5 ngày |
| 7 | **`admin.html`** — Hôm nay, Đơn hàng, Đặt lịch, Sản phẩm | 3–6 | ~3 ngày |
| 8 | **`hoat-dong.html`** + mục Hoạt động trong admin | 3, 7 | ~1 ngày |
| 9 | **Sửa nav / IA** (§10) | 6, 8 | ~0,5 ngày |
| 10 | **Sửa UX ưu tiên trung bình** (U7–U12) | — | ~1 ngày |
| 11 | **Cổng thanh toán** | có merchant account | sau |

Tổng: khoảng **2 tuần** làm tập trung, chưa tính bước 11.

---

## 13. Còn phải chốt

### Chặn việc code

- [ ] **Tên trang & nhãn nav** — đồng ý `workshop.html` + nhãn “Workshop”? Và
      `hoat-dong.html` + nhãn “Hoạt động”?
- [ ] **Gộp nav “Về Gem”** — đồng ý gộp Câu chuyện + Mô hình? (§10)
- [ ] **Email chính thức của shop** — prototype đang tạm dùng `lgnhuyen@gmail.com`
- [ ] **Ai là `owner`, ai là `staff`** — email để mở tài khoản

### Cần thông tin (không chặn, điền sau được)

- [ ] Giá thật của 16 sản phẩm (đang là số tạm trong `CATALOG`)
- [ ] Ba giờ cố định mỗi tuần — giữ đề xuất hay đổi
- [ ] Các loại workshop và thời lượng từng loại
- [ ] Giá workshop
- [ ] Ảnh cho trang Câu chuyện (U6) và hero trang chủ (U1)
- [ ] Nội dung bài đầu tiên cho trang Hoạt động (BUV, UN Youth Day)

### Việc ngoài web

- [ ] Mở POS ở ngân hàng nào (làm dù có hay không có thanh toán online)
- [ ] Mở merchant account VNPAY / OnePay / Payoo
- [ ] Có đăng lên Klook / Airbnb Experiences không
- [ ] Tranh vẽ 16 sprite sản phẩm (không chặn gì — hình tạm vẫn chạy)

---

## 14. Không làm trong sprint này

Ghi ra để khỏi bàn lại:

- Email xác nhận & nhắc lịch **tự động** — Anna nhắn Zalo trước đã (D13)
- Khách tự huỷ đặt lịch trên web — nhắn Zalo là đủ ở lượng này
- Danh sách chờ khi buổi đã đủ chỗ
- Tự động trừ tồn kho sản phẩm (D7)
- Tài khoản cho **khách** (chỉ có tài khoản nhân sự)
- Tự động sinh buổi học theo tuần (Anna đăng tay ~2 phút/tháng)
- Generator để render bài blog thành HTML tĩnh (§8)
- Đổi host sang Vercel / Netlify — **không cần** (§3.3)
- Framework, build step, Tailwind, React — vẫn KHÔNG (`CLAUDE.md`)

---

## 15. Cần cập nhật `CLAUDE.md` sau sprint

Khi sprint xong, những chỗ này trong `CLAUDE.md` đã lỗi thời:

- “KHÔNG hiện giá sản phẩm trên web” → đã đảo (D3)
- “KHÔNG có e-commerce, KHÔNG có cart” → đã có giỏ hàng
- “5 trang chính + `season-02.html`” → thêm `workshop.html`, `hoat-dong.html`, `admin.html`
- Thêm Supabase vào phần Architecture & Tech
- Cập nhật lại phần “Active tasks”
