# Copy-paste Prompts cho Claude Code

Khi mở Claude Code trong folder project, bạn paste 1 trong các prompts dưới.

**Tip:** Mỗi prompt đã được test để Claude Code có đủ context. Đừng cắt ngắn. Có thể edit để add/remove constraints.

---

## 🎬 Initial setup (paste đầu tiên khi mở Claude Code)

```
This is the Gem Chạm Sắc website project. Before doing anything, please:

1. Read CLAUDE.md to understand the project context, conventions, and decisions.
2. Read docs/brand.md for brand identity details (colors, fonts, voice).
3. Read docs/tasks.md for the list of pending tasks.

Then briefly summarize what you've learned and confirm you understand:
- The tech stack (no framework, plain HTML/CSS/JS)
- Brand voice (chúng mình, not chúng tôi)
- The 9 active tasks waiting

After that, ask me which task to start with.
```

---

## 🐛 Task 1 — Font tiếng Việt fix

```
Read CLAUDE.md and docs/tasks.md (Task 1) for full context.

Goal: Replace the Caveat handwriting font with Dancing Script across the entire site to fix Vietnamese diacritic rendering issues on PC.

Steps:
1. Update the `--font-hand` CSS variable in css/style.css
2. Update all Google Fonts `<link>` tags in HTML files (index, cau-chuyen, mo-hinh, san-pham, ghe-tham, 404). The new link should request `Dancing+Script:wght@400;500;600`.
3. Search for any remaining "Caveat" references to ensure nothing is missed.

After done, list the files you changed and verify with grep that no "Caveat" remains.

Commit message: "style: replace Caveat with Dancing Script for VN diacritic support"
```

---

## 🐛 Task 2 — Udon crop fix

```
Read CLAUDE.md for context.

Bug: In the email signup section (index.html and ghe-tham.html), the Udon mascot image (`udon_sit_happy.png`) appears cropped — only the top half is visible. See class `.email-mascot`.

Goal: Make the full Udon image display correctly.

Steps:
1. Read css/style.css and find `.email-mascot` and parent `.email-section` rules
2. Read both index.html and ghe-tham.html to see how the image is used
3. Diagnose the issue (likely CSS dimension/overflow problem)
4. Fix without breaking other layout

If you need to view the actual image dimensions, check images/mascot/udon_sit_happy.png.

Commit message: "fix: udon mascot crop in email signup section"
```

---

## 🐛 Task 3 — Footer links update

```
Read CLAUDE.md for context.

Update social media links in the footer of all HTML pages. Currently they are placeholder `href="#"`.

New links:
- Instagram: [PASTE INSTAGRAM URL HERE]
- Facebook: [PASTE FACEBOOK URL HERE]
- Blog/Wordpress: https://gemchamsac.wordpress.com (keep)

Requirements:
- Use target="_blank" rel="noopener" for external links
- Update all HTML files including 404.html if it has a footer
- Use grep to find all href="#" first to make sure nothing is missed

Commit message: "content: update footer social links to real URLs"
```

> **Note:** Trước khi paste, replace `[PASTE INSTAGRAM URL HERE]` và `[PASTE FACEBOOK URL HERE]` với link thật.

---

## 🐛 Task 4 — Remove numbered eyebrows

```
Read CLAUDE.md and docs/tasks.md (Task 4) for context.

Goal: Remove the numbered prefix from page hero eyebrows.

Currently the inner pages have:
- cau-chuyen.html: "01 — CÂU CHUYỆN"
- mo-hinh.html: "02 — MÔ HÌNH"
- san-pham.html: "03 — SẢN PHẨM"
- ghe-tham.html: "04 — GHÉ THĂM"

Change to just the name without number/dash:
- "CÂU CHUYỆN", "MÔ HÌNH", "SẢN PHẨM", "GHÉ THĂM"

Steps:
1. Search for `class="eyebrow"` across HTML files
2. Edit each
3. Verify visual balance — if hero looks empty, suggest enhancement options but don't implement yet

Commit message: "content: remove numbered prefix from page eyebrows"
```

---

## ✨ Task 5 — Table of Contents (Sản phẩm page)

```
Read CLAUDE.md and docs/tasks.md (Task 5) for full context.

Goal: Add a responsive Table of Contents to san-pham.html.

Design:
- Mobile (< 768px): horizontal sticky pill bar at top of page, scrollable
- Desktop (≥ 768px): vertical sticky sidebar on the left

Requirements:
- Lists all category sections + "Dịch vụ đặc biệt" section
- Click item → smooth scroll to section
- Active state when section is in viewport (use IntersectionObserver)
- Don't break existing layout
- Use existing color tokens from style.css

Files to edit:
- san-pham.html (add TOC markup, add id="..." to each section)
- css/style.css (add `.product-toc-mobile` and `.product-toc-sidebar` styles)
- js/main.js (add IntersectionObserver + smooth scroll handler)

Before implementing, propose the HTML structure for review. After approval, implement.

Commit message: "feat: add responsive table of contents to product page"
```

---

## ✨ Task 6 — Add category 5

```
Read CLAUDE.md and docs/tasks.md (Task 6) for context.

Goal: Add a new product category "Đồ trang trí và lưu niệm khác" to san-pham.html.

Position: After Gốm sứ Nhật, before Dịch vụ đặc biệt section.

Treatment:
- Same structure as existing categories (.category-block with .category-header)
- Tagline: "Dễ dùng · dễ tiếp cận"
- Use empty state with Udon (no product photos yet)
- Recommended Udon pose: udon_standing.png (not used elsewhere yet)
- Empty state copy: short, brand-aligned (see docs/brand.md for voice)

After adding, if Task 5 (TOC) is done, make sure the new category appears in the TOC.

Commit message: "feat: add decorative & souvenirs product category"
```

---

## ✨ Task 7 — Special services on homepage

```
Read CLAUDE.md and docs/tasks.md (Task 7) for full context.

Goal: Add a "Dịch vụ đặc biệt" section to the homepage (index.html) showcasing 2 services from brand guidelines page 7:
1. Workshop trải nghiệm
2. Dịch vụ làm mới ký ức

Design:
- 2-column grid on desktop, stacked on mobile
- Each card has: heading, short description, CTA link
- CTAs link to san-pham.html#dich-vu (anchor scroll)

Requirements:
- Position: after Products teaser section, before Email signup
- Match existing card design language
- Add id="dich-vu" to the services section in san-pham.html
- Use existing CSS classes where possible (.card, .commit-card etc.)

Also: Consider hero CTAs. Currently:
- "Ghé thăm Season 01" (primary)
- "Đọc câu chuyện" (ghost)

Propose 2-3 options for hero CTAs (keep as-is / add workshop link / replace one), let me choose.

Commit message: "feat: add special services section to homepage"
```

---

## ✨ Task 8 — Next page navigation

```
Read CLAUDE.md and docs/tasks.md (Task 8) for context.

Goal: Add "Tiếp theo →" navigation block at the bottom of each page (before site footer), suggesting the next logical page.

Flow:
- Trang chủ (index.html) → Câu chuyện
- Câu chuyện (cau-chuyen.html) → Mô hình
- Mô hình (mo-hinh.html) → Sản phẩm
- Sản phẩm (san-pham.html) → Ghé thăm
- Ghé thăm (ghe-tham.html) → Trang chủ (loop back)

Design:
- A bordered block with "Tiếp theo →" eyebrow
- Page title + 1 short line preview
- Entire block clickable
- Visually distinct from regular footer

Files:
- All 5 HTML pages (add block before <footer>)
- css/style.css (add `.next-page` component)

Propose markup + style mockup first for review.

Commit message: "feat: add next-page navigation across all pages"
```

---

## 🎨 Task 9 — Polish Câu chuyện + Mô hình (multi-step)

### Step 9a — Quick wins (Idea B + D + E)

```
Read CLAUDE.md, docs/brand.md, and docs/tasks.md (Task 9) for context.

Goal: Add subtle visual polish to cau-chuyen.html and mo-hinh.html using these ideas:

Idea B - Hand-drawn dividers: Replace the simple `❋` divider character with SVG decorative elements. Create 2-3 variants (vine flourish, dotted line + center dot, sun rays). Use sage color, line-art style. Inline SVG.

Idea D - Fade-in scroll animations: Add subtle reveal effect when sections come into view. Use IntersectionObserver. Effect: opacity 0→1 + translateY(20px→0), 0.6s transition.

Idea E - Quote highlights: Find 1-2 key sentences in each page that could be elevated to quote blocks with decorative styling. Use handwriting font (Dancing Script post-Task-1), larger size, subtle background, decorative quote marks.

Implement in this order. After each, show me the result so I can review before continuing.

Commit message: "feat: add visual polish to story and model pages"
```

### Step 9b — Signature visuals (Idea A + G)

```
Read CLAUDE.md, docs/brand.md, and docs/tasks.md (Task 9) for context.

Goal: Add signature visual elements:

Idea A - Spot illustrations: Create or source 3-5 small line-art SVG illustrations for cau-chuyen.html (one per major section: Mission, Vision, Values). Style: line-art, sage color, ~80x80px, hand-drawn feel.

If you can't generate SVG inline, propose a list of icon ideas and I'll source them externally.

Idea G - Season timeline: Convert the 4-card season roadmap in mo-hinh.html into a horizontal timeline with:
- Connecting track line
- Dot at each season
- Active state for Season 01
- Year markers (2026, 2027, etc.)
- Hover/click reveals season details

Before implementing G, sketch the markup structure for review.

Commit message: "feat: spot illustrations and season timeline"
```

### Step 9c — Optional (Idea C, F, H)

```
Read CLAUDE.md, docs/brand.md, and docs/tasks.md (Task 9) for context.

Implement remaining polish ideas:

Idea C - Photo collages: Insert 2-3 product photos in cau-chuyen.html paragraphs, treated as polaroids with washi tape decoration.

Idea F - Circular process: Convert the 6-step process in mo-hinh.html into a circular SVG infographic showing the circular economy visually.

Idea H - Background patterns: Add subtle (5-10% opacity) decorative patterns to specific section backgrounds.

These are higher effort. Propose mockups/sketches first for each, then implement based on my approval.
```

---

## 📋 General prompts

> **Note for visual bugs:** Before asking user to verify, run /tmp/verify.py
> at relevant viewports and inspect screenshots yourself. Only confirm fix
> with user after self-verifying.

### Code review

```
Read CLAUDE.md and review the recent changes I've made (last 5 commits or working tree).
Check for:
- Brand voice consistency (chúng mình, not chúng tôi)
- Code conventions per CLAUDE.md
- Anti-patterns
- Vietnamese typography (proper diacritics)
- Mobile responsiveness implications

Give me a brief report with severity (must-fix / should-fix / nit).
```

### Pre-deploy check

```
Before I push to production, run a pre-deploy check:
1. All HTML files have correct paths (no absolute paths in src/href that break in subdirectory)
2. All product images referenced exist in images/products/
3. All Udon images referenced exist in images/mascot/
4. CNAME file is intact (gemchamsac.com)
5. No placeholder href="#" remaining
6. No "TODO" or "FIXME" comments in HTML

Report any issues found.
```

### Add new product

```
I want to add a new product to san-pham.html. Here's the info:
- Category: [vai-vun | vpp | 2hand | gom | trang-tri]
- Product name: [...]
- Subtitle: [...]
- Image file: [filename.jpg in images/products/]

Steps:
1. Verify the image file exists (full + thumb versions)
2. Add `<div class="product-card">` block in the correct category section in san-pham.html
3. Use existing markup pattern (check sibling cards)
4. Update TOC if needed
```

### Update season info

```
Update Season 01 information:
- End date: [new date, currently "tháng 10/2026"]
- Operating hours: [if available]

Find and update in:
- index.html (season banner)
- ghe-tham.html (season banner + contact info)
- Any other relevant places

Don't change content in cau-chuyen.html or mo-hinh.html unless needed.
```

---

## 🚫 Anti-prompts (đừng paste những thứ này)

- ❌ "Convert this to React/Vue/Next.js" — project intentionally static
- ❌ "Add a shopping cart" — out of scope, không có e-commerce
- ❌ "Add user login" — không có auth, không có account
- ❌ "Make it use Tailwind" — plain CSS với design tokens là intentional choice
- ❌ "Add lots of animations" — brand minimalist, subtle only
- ❌ "Make it more colorful" — palette earthy đã chốt

---

## Workflow tips

**Before any task:**
- Mở Claude Code trong terminal, cd vào folder project
- Cài Claude Code nếu chưa: https://docs.claude.com/en/docs/claude-code
- Start session bằng prompt "Initial setup" trên

**During task:**
- Đọc kỹ proposal trước khi approve
- Test trên local server (`python3 -m http.server 8000`) trước khi commit
- Đừng để Claude Code commit và push tự động — review trước

**After task:**
- Hard refresh browser (Ctrl/Cmd + Shift + R) sau khi push
- Test trên cả mobile + desktop
- Verify HTTPS vẫn work

**Stuck/lỗi:**
- Show Claude Code error đầy đủ + last command đã chạy
- Read error → check existing code → propose fix
- Đừng panic re-write từ đầu — usually 1-2 lines fix

---

## 🎨 Prompt vẽ — Nhặt cúc (Studio 2D, giai đoạn 1)

Prompt cho **ChatGPT tạo ảnh**, không phải cho Claude Code. Kế hoạch tính năng:
`docs/design.md` → "Studio: Nhặt cúc — giai đoạn 1". Cả bộ: 6 ảnh, làm trong **một**
cuộc chat để giữ nét vẽ.

**Bước 0 — chuẩn bị**

1. Tải về các ảnh tham chiếu (đều có trên web):
   - Udon: `https://gemchamsac.com/images/studio/udon/ud-ngoi.webp`, `…/udon/ud-vay.webp`,
     `…/udon/ud-reo.webp`
   - Đồ vật: `https://gemchamsac.com/images/studio/may/may-31.webp` (cúc),
     `…/may/may-24.webp` (túi vải), `…/props/gio.webp` (rổ mây)
   - Vải: `https://gemchamsac.com/images/studio/vai/vai-lam-4.webp`, `…/vai/vai-hong-5.webp`
2. Mở chat mới, đính kèm cả 8 ảnh, dán khối **Phong cách chung** dưới đây.
3. Dán lần lượt prompt 1 → 5. Mỗi ảnh xong thì tải PNG (cỡ lớn nhất), đặt đúng tên file,
   bỏ vào thư mục D-assets trên Drive như các bộ trước.

**Phong cách chung** (dán một lần đầu chat)

```
For every image in this chat, use this exact style:
- Vintage storybook watercolor illustration: soft layered washes, gentle paper
  granulation, fine warm-brown ink outlines (never black), small white highlights.
- Muted earthy palette: sage green #87965A, cream #F0E1D2, kraft brown #B89968, dusty
  rose, warm honey wood, deep olive #3D4A2E for the darkest tones.
- Cozy, handmade, slow-living mood. Not cartoon, not kawaii, not glossy 3D, not flat vector.
- Soft light from the upper left. Match the attached reference pictures as closely as
  possible: same line weight, same washes, same level of detail.
- Every object stands alone on a plain pure white background (#FFFFFF): no paper texture,
  no frame, no cast shadow, no floor line.
- No text, letters, numbers, logos or watermarks anywhere.
Reply "OK" and wait for my next message.
```

### 1. Cúc — `sheet-cuc.png`

```
Using the style and references above (match the buttons in may-31), draw a sprite sheet
of 8 separate sewing buttons. Landscape 1536 x 1024.
Layout: 2 rows of 4, evenly spaced, each button about 200 px across, at least 80 px of
white space between buttons and from the edges. No button touches another.
Row 1 — flat, seen from the front, each with a short loose loop of rust-red thread still
through its holes, as if it had just fallen off a shirt:
 1. honey-brown wooden button, 4 holes
 2. cream mother-of-pearl button, 2 holes, soft pearly sheen
 3. sage green button, 4 holes, slightly worn rim
 4. dusty rose button, 2 holes
Row 2:
 5. the wooden button (1) lying tilted at a three-quarter angle, thread loop trailing
 6. the sage green button (3) tilted the other way, thread loop trailing
 7. an antique brass shank button seen from the front: a tiny embossed five-petal flower,
    warm gold with darker patina in the recesses, one small soft gleam. No thread.
 8. the same brass button tilted at a three-quarter angle
All 8 at the same scale and lighting. Plain pure white background, no shadows, no text.
```

Kiểm tra: đủ 8 chiếc, không chiếc nào dính nhau, nền trắng tới mép; sợi chỉ rõ ở 1–6
(để khác cúc trang trí có sẵn); cúc đồng vàng rõ, khác hẳn cúc thường.

### 2. Lấp lánh + dấu chân — `sheet-lap-lanh.png`

```
Same style. Square 1024 x 1024: 2 rows of 2, each element centred in its quarter with a
lot of white space around it. Each element has a clear fine warm-brown ink outline.
 1. a small four-pointed sparkle star, cream-gold watercolor fill, slightly hand-drawn
    and uneven
 2. a smaller four-pointed sparkle with two tiny round dots beside it
 3. a cluster of three tiny sparkle stars of different sizes
 4. a single dog paw print (one big pad, four toes) in deep olive ink with a light
    watercolor fill
Plain pure white background, no glow, no shadows, no text.
```

Kiểm tra: mỗi hình có viền mực (không có quầng sáng mờ — tool tách nền sẽ ăn mất).

### 3. Túi mù — `sheet-tui-mu.png`

```
Same style (match the rattan tray "gio" and the fabric pouch references). Landscape
1536 x 1024: 3 objects in one row, evenly spaced, at least 100 px of white space between
them and from the edges.
 1. A closed "blind bag": a small kraft paper bag, its top folded over twice and sewn shut
    with large running stitches in rust-red thread; a narrow strip of patterned scrap
    fabric tied around the fold like a ribbon; on the front, a faded round rubber-stamp
    mark showing a single sewing button. Nothing inside is visible.
 2. The same bag opened: the fold undone and the top gently torn open along the
    stitches, crumpled cream tissue paper inside. No fabric visible.
 3. A small round rattan basket (honey-coloured weave, like the reference tray) holding
    6 of those closed kraft bags standing upright, leaning on each other, with a blank
    kraft hang tag on twine tied to the rim. Drawn as a prop that sits on a shop counter,
    seen slightly from above.
Bags 1 and 2 at the same scale; the basket about 1.6 times as wide as one bag.
Plain pure white background, no shadows. No text: the stamp and the tag stay blank.
```

Kiểm tra: con dấu và thẻ treo không có chữ; túi 1 và 2 cùng cỡ, cùng màu giấy.

### 4. Udon tìm cúc — `sheet-ud-cuc.png`

```
Using the attached Udon references (ud-ngoi, ud-vay, ud-reo), draw the SAME dog, Udon, in
5 new poses. Keep him exactly the same: an Australian-shepherd-style puppy with a
blue-merle grey-and-black coat, a white blaze down the forehead and muzzle, tan dots above
the eyes, tan cheeks, black floppy ears, white chest and white paws, a fluffy grey tail
with a white tip, round dark eyes; the same proportions and the same watercolor and
brown-ink style. No glasses, no clothes, no objects.
Landscape 1536 x 1024: 5 poses (one row, or 3 on top and 2 below), all the same size,
at least 80 px of white space between them. All facing right.
 1. sitting, nose lifted high, sniffing the air, eyes half closed
 2. trotting, side view: front-left and back-right legs forward, tail up, nose a little
    down
 3. trotting, side view: the opposite legs forward (the second frame of the same trot)
 4. nose down to the ground, sniffing, body low, tail wagging up
 5. a classic pointer pose: standing, body and nose stretched forward, one front paw
    lifted, tail straight out, ears alert, looking proud
Plain pure white background, no ground, no shadows, no text.
```

Kiểm tra: so từng dáng với `ud-ngoi` — sọc trắng giữa trán, đốm nâu trên mắt, ngực
trắng, đuôi chóp trắng. Hai dáng chạy (2, 3) phải khác chân nhau. Ra file:
1 → `ud-ngui-gio`, 2 → `ud-chay-1`, 3 → `ud-chay-2`, 4 → `ud-ngui`, 5 → `ud-chi`.

### 5. Mảnh vải hiếm — `vai-hiem-1.png` và `vai-hiem-2.png`

Hai ảnh, cùng phần đầu, khác danh sách 6 mảnh. Dán phần đầu + danh sách tờ 1, xong
dán lại phần đầu + danh sách tờ 2.

Phần đầu:

```
Using the attached fabric swatches (vai-lam-4, vai-hong-5) as the texture reference,
draw 6 square fabric swatches on one landscape 1536 x 1024 sheet: 2 rows x 3 columns,
every square the same size (about 460 x 460 px), with a 30 px pure white gap between
squares and around the edge.
Each square is completely filled, edge to edge, with flat fabric seen straight from
above: visible weave texture, even soft light, no folds, no wrinkles, no shadows, no frame
or stitched border, no edge of the cloth showing. The print repeats evenly across the
square so it can tile. Same watercolor softness as the references, no text.
In reading order (top row left to right, then bottom row):
```

Tờ 1 (`vai-hiem-1.png`, 6 mảnh Thường):

```
 1. Small dense floral print like a 1990s Vietnamese house dress: tiny pink and mint
    flowers with green leaves on cream cotton, slightly faded.
 2. Soft brushed cotton with vertical stripes, dusty blue and cream, with one thin brown
    pinstripe between them.
 3. Coarse unbleached cotton like an old flour sack, with a faded red-brown stamped motif
    (a wheat sprig inside a circle) repeated in a loose grid. No letters.
 4. Worn, faded indigo denim: soft, visible diagonal twill, light whiskering.
 5. A small even check in charcoal black and cream, a slightly irregular hand-woven look.
 6. Natural oatmeal linen with short running stitches in rust-red thread, scattered as
    dashes in a loose repeating pattern.
```

Tờ 2 (`vai-hiem-2.png`, 4 mảnh Hiếm + 2 mảnh Quý):

```
 1. Silk brocade (jacquard) in deep teal with woven gold chrysanthemum flowers and leaves,
    a subtle sheen.
 2. Cream silk with a tone-on-tone woven pattern of gentle waves and small clouds, a soft
    sheen.
 3. Soft brushed wool tartan in moss green, rust and cream.
 4. Fine white cotton with tiny scattered hand-embroidered flowers in sage green, dusty
    pink and butter yellow.
 5. Crushed velvet in deep burgundy, with soft light and dark highlights in the pile.
 6. The fluffy printed blanket of 1990s Vietnamese homes: repeating peacocks with spread
    tails in pink, teal and green on a deep wine background, a slightly plush texture.
```

Kiểm tra: mỗi tờ đủ 6 ô bằng nhau, khe trắng rõ, ô nào cũng phủ kín vải (không thấy mép
vải, không nếp gấp, không bóng); thứ tự đúng danh sách (tờ 1 = mảnh 1–6, tờ 2 = mảnh
7–12 trong `docs/design.md`).

**Khi một món bị lệch** (sai chi tiết, dính nhau, có chữ): nhờ vẽ lại riêng món đó —
"Redraw only item 3, same style and size, alone on a white 1024 x 1024 canvas" — rồi đặt
tên có hậu tố, ví dụ `sheet-cuc-sua-3.png`. Lúc tách tranh sẽ ghép vào.
