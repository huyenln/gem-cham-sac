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
