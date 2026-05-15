# Handoff: Bún — Mobile (Landing + Web App)

## Overview

This is the **mobile design** for **Bún** — a Vietnamese-first English-learning app. Two distinct surfaces are bundled here:

1. **Marketing landing page** (mobile) — single long-scroll, 11 sections (Nav → Hero → … → Footer). Pre-signup, public.
2. **Web app screens** (mobile) — **10 core in-product screens** sharing a sticky bottom tab bar:
   - Dashboard · Flashcard typing · Reveal/rate · Decks list · Add word + AI auto-fill
   - Dictionary · Read aloud (mic) · Sentence writing (timer) · Article reader · Settings

   Post-signup, authenticated.

Both share the same visual system (V tokens, blue accent `#3aa9e6`, hand-drawn Bún mascot, Nunito + Lora italic, soft chunky shadows). Designed at **402px width** (iPhone Pro size); responsive scaling for larger phones / tablets is up to the dev.

## About the design files

The files in `source/` are **design references created in HTML/JSX** — a prototype showing intended look and behavior, **not production code to copy directly**. They use inline React + Babel served from CDN, with all styling done via inline `style={...}` objects.

Your task is to **recreate this design in the target codebase's existing environment**. Likely candidates:
- For the **landing**: Next.js + Tailwind, or whatever marketing-site framework Bún uses.
- For the **app**: React Native / Expo, or a mobile-web PWA in the existing app framework (Next.js, Remix, etc.).

If unsure, default to Next.js + Tailwind + Framer Motion for both (with the app screens guarded behind auth and rendered server-side at `/app/*` routes; landing at `/`).

**Do not ship the JSX files as-is.** They are intentionally verbose for design iteration.

## Fidelity

**High-fidelity (hifi).** Pixel-perfect target. Every color, font size, spacing value, border-radius, shadow, and animation timing is intentional. Where this README is ambiguous, the JSX file is the source of truth.

## Entry point

Open `source/index.html` in a browser. In the design canvas:
- Find **"★ Landing page · Bún"** → artboard **"Mobile · 402px (iPhone)"** → renders `<BunLanding_mobile>` (defined in `landing-bun-mobile.jsx`).
- Find **"★ Web app · Mobile"** → **10 artboards** at 402px wide. Screens 1–5 (Dashboard, Flashcard, Reveal, Decks, AddWord) defined in `app-mobile.jsx`; screens 6–10 (Dictionary, ReadAloud, Sentence, Article, Settings) defined in `app-mobile-extra.jsx`.

The desktop landing (`<BunLanding_v1>`) is also bundled for reference but **NOT in scope** for this handoff — see `design_handoff_bun_landing/` for that.

## Design tokens (shared with desktop)

### Colors

| Token | Hex | Use |
|---|---|---|
| `BUN_BLUE` | `#3aa9e6` | Primary accent — buttons, links, FAB, italic emphasis |
| `BUN_BLUE_SOFT` | `#e3f2fb` | Soft tint backgrounds, blue speech bubbles |
| `BUN_BLUE_DARK` | `#1e87c0` | Gradient endpoint, hover |
| `bg` | `#ffffff` | Page background |
| `panel` | `#fafaf6` | Alt section background (warm off-white) |
| `ink` | `#1a2410` | Primary text |
| `inkSoft` | `#5a5247` | Secondary text |
| `muted` | `#9e978c` | Tertiary, eyebrows, captions |
| `border` | `rgba(40,30,15,0.13)` | Subtle borders |

Multi-color accent palette (for category badges, deck colors, rating buttons):
| Token | Hex |
|---|---|
| `V_C.blue` | `#5dc1f0` |
| `V_C.orange` | `#ff9a3c` |
| `V_C.red` | `#ff5757` (LẠI button, flame icon) |
| `V_C.purple` | `#c179d6` (ADJ badge, rating: review queue) |
| `V_C.pink` | `#f06292` |
| `V_C.teal` | `#6ec1a8` |
| `V_C.yellow` | `#ffc94a` |
| `V.primary` (green) | `#7ac143` (TỐT button, mastery, streak filled) |
| `V.gem` (cyan) | `#5dc1f0` (DỄ button, gems) |

### Typography

Three font families (Google Fonts):
```html
<link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900;1000&family=Lora:ital,wght@0,400;0,500;0,600;1,400;1,500;1,600&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">
```

| Role | Family | Use |
|---|---|---|
| `headFont` / `bodyFont` | Nunito (weights 600–1000) | All UI |
| Italic emphasis | Lora italic 500/600 | Inline "kiểu bạn thích", "nhịp học", "khác", etc. Always colored with the accent |
| `monoFont` | JetBrains Mono | IPA, char-diff, footer meta, paste input |

**Mobile type scale (px):**
| Use | Size | Weight | Line-height | Letter-spacing |
|---|---|---|---|---|
| Hero H1 (landing) | 38 | 1000 | 1.0 | -0.03em |
| Page H1 (app) | 24 | 1000 | 1.0 | -0.025em |
| Section H2 | 28 | 1000 | 1.1 | -0.025em |
| Word H1 (Reveal) | 32 | 1000 | 1.0 | -0.025em |
| Speech bubble headline | 19 | 1000 | 1.25 | -0.01em |
| Card H3 | 14–16 | 900–1000 | 1.15–1.2 | -0.01em |
| Stat tile number | 22 | 1000 | 1.0 | -0.02em |
| FAQ Q | 13 | 900 | 1.3 | — |
| Body lg (hero sub) | 15 | 700 | 1.45 | — |
| Body md | 12–13 | 600 | 1.45–1.55 | — |
| Eyebrow | 9–10 | 900 | 1.0 | 0.14–0.16em uppercase |
| Body sm | 10–11 | 700 | 1.4–1.5 | — |
| Mono / IPA | 10–14 | 600–800 | 1.0 | — |
| Tab bar label | 10 | 700–900 | 1.0 | — |

### Spacing

- Page horizontal padding: **20px** (constant) — referred to as `M_PAD` in source.
- Section vertical padding: 36–44px top/bottom.
- Card padding: 12–20px.
- Card gap (vertical): 8–14px.

### Border radius

| Use | Value |
|---|---|
| Mini chip / dot | 5–8px |
| Small badge | 7–10px |
| Tab bar icon container | 11–14px |
| Card | 12–16px |
| Large card | 18–20px |
| Hero / CTA block | 20–24px |
| Pill / chip / progress bar | 999px |
| Avatar circle | 50% |

### Shadows (chunky style)

```css
/* shadow */
0 2px 0 rgba(40,30,15,0.05), 0 1px 3px rgba(40,30,15,0.04)

/* shadow-md */
0 3px 0 rgba(40,30,15,0.07), 0 2px 6px rgba(40,30,15,0.04)

/* shadow-lg */
0 4px 0 rgba(40,30,15,0.08), 0 4px 12px rgba(40,30,15,0.04)

/* blue primary button */
0 4px 0 rgba(20,40,80,.2), 0 8px 18px #3aa9e655

/* blue CTA / hero gradient block */
0 6px 0 rgba(20,40,80,.2), 0 14px 28px #3aa9e655

/* blue FAB (tab bar Thêm button) */
0 4px 0 rgba(20,40,80,.2), 0 6px 14px #3aa9e666
```

Pattern is always **two stacked shadows**: a hard offset (no blur, on bottom edge — chunky/3D feel) + a softer ambient blur underneath.

## Mascot

Bún (the mascot) — 5 hand-drawn 3D poses + 2-frame run cycle. All in `source/assets/mascot/`, PNG transparent.

| File | Pose | Mobile use |
|---|---|---|
| `bun-learn.png` | Holding book + lightbulb | Value prop 01 (Workflow) on landing |
| `bun-magic.png` | Glowing orb in palms, eyes closed | Value prop 02 (AI) on landing |
| `bun-flex.png` | Lifting dumbbells | Value prop 03 (Modality), Workflow "Minh" persona |
| `bun-celebrate.png` | Dancing arms up | CTA hero (landing), achievement moments |
| `bun-dream.png` | Sitting on cloud | Workflow "An" persona |
| `ngoc-happy.png` | Happy waving (default) | Hero center (landing + dashboard), Workflow "Chloe" replaced by bun-learn |
| `ngoc-blink.png` | Blinking eyes closed | Hero pose cycle alternate (every 4th tick) |
| `ngoc-idle.png` | Standing idle | Logo (small, 32px) |
| `ngoc-run-a/b.png` | Sprite run cycle | (Unused on mobile) |

**Pose-cycling**: `<LiveMascot>` swaps `ngoc-happy → ngoc-happy → ngoc-happy → ngoc-blink → ngoc-happy` every 1300ms to feel alive (used in landing hero + dashboard hero).

**Mascot sizes on mobile**:
- 32–36px → logo
- 56–66px → workflow persona avatar
- 70px → dashboard hero
- 140px → CTA hero
- 150px → landing hero center

Always wrapped with `filter: drop-shadow(0 4–14px 8–28px rgba(40,30,15,.18–.32))`.

---

# Surface 1: Landing page (mobile)

`<BunLanding_mobile>` in `landing-bun-mobile.jsx`. Sticky nav + 10 vertical sections + footer. Target artboard height **5400px** but actual content varies — let it flow naturally.

## 1. Nav (`<MNav>`)

- Sticky top, z-30, padding `12px 16px`, translucent white `rgba(255,255,255,0.92)` + `backdrop-filter: blur(14px)`, 1px bottom border.
- **Left**: Logo (`ngoc-idle` 32px + "Bún" wordmark Nunito 900, size = `32 * 0.62 = ~20px`).
- **Right**: "Vào học" mini CTA (BUN_BLUE, white text, 8px 14px padding, radius 11, 12/900) + hamburger button (36×36 white square, 1px border, radius 11). Burger lines animate to X (45° / -45° rotate + middle line fades).
- **Hamburger open**: drops an absolute panel below the nav (white, 1px bottom border, soft shadow). Lists 4 nav items as 10px-padded rows with 1px dividers + final "Đăng nhập →" in blue.

## 2. Hero (`<MHero>`)

Padding `36px 20px 56px`, centered, position relative, overflow hidden.

**Backgrounds**:
- 2 animated `<BlobBg>` blobs (blue at `-15%, 5%` size 240px opacity 0.18; pink at `60%, 50%` size 220px opacity 0.12). Each blurred 8px + animated `bun-blob` 18–22s.
- 4 sparkles (yellow, pink, blue, purple) at corners, twinkling.

**Pre-heading pill**: small white pill with 1.5px blue border, blue eyebrow text "✦ APP HỌC TIẾNG ANH KIỂU VIỆT" (10/900, 0.12em letter-spacing), pulsing blue dot inside. Shadow `0 2px 0 #3aa9e625`.

**Mascot**: 170×160 inline-block container. Inside: a radial-gradient halo (blue 35% → transparent at 65%, twinkling), and `<LiveMascot size={150}>` cycling poses. Total marginBottom 18.

**H1** (38/1000/-0.03em/lh 1.0):
```
Học tiếng Anh
theo *kiểu bạn thích*.
```
The italic "kiểu bạn thích" has a **shimmering text-gradient** (`linear-gradient(90deg, #3aa9e6, #f06292, #3aa9e6)`, background-size 200%, animated `bun-shimmer-text` 5s linear infinite). Trailing period in ink.

**Sub** (15/700, inkSoft, max-width 320):
> Bạn lo phần **học** — mình lo phần **thô**.

"thô" has a soft blue underline highlight: `${accent}30` opacity, padding `0 4px`, radius 3.

**CTAs** (stacked vertical, gap 10, max-width 320, margin-inline auto):
1. **Primary** (full-width): blue bg, white text, radius 16, padding 15px 24px, font 15/1000. Has a pulse-ring (`bun-pulse-ring` 2s) — absolute inset -3px element animating box-shadow outward.
2. **Secondary** (full-width): white bg, ink text, 1.5px border, "▶ Xem workflow mẫu".

**Trust pills** (wrap, gap 8, centered, fontSize 11/700 muted): ✓ Miễn phí · ✓ Tiếng Việt · ✓ No card.

## 3. Marquee (`<MMarquee>`)

Height 40px, panel bg, top + bottom borders. Word ticker scrolling left infinitely via `bun-march` 28s linear, paused on hover/touch. Left-anchored white pill "✦ AI →" (10/900 blue, 0.1em letter-spacing). Words: `preferential · /ˌprefəˈrenʃəl/`, `serendipity`, `meticulous`, `ubiquitous`, `epitome`, `pragmatic`, `inevitable`, `ephemeral` (JetBrains Mono 12/600 inkSoft + blue ✦ separator).

## 4. Value props (`<MValueProps>`)

Panel bg, padding 44px 20px. Centered "3 trụ cột" eyebrow + H2 "Vì sao Bún *khác*?".

3 horizontal cards stacked vertical (gap 12). Each card:
- White, 1px border, shadow-md, radius 18, padding 18px, flex row align-center gap 14.
- **Left**: 72×72 mascot pose (`learn` / `magic` / `flex`) with float animation. Behind everything: a 110×110 colored ellipse at top-right corner (card's bg color).
- **Right**: 22×22 colored icon mini-box + eyebrow chip ("01 · Workflow"), then H3 (16/1000 with accent-colored highlight word: "bạn" / "khô khan" / "không chán"), then 12/600 body.

3 cards (in order):
1. **01 · Workflow** — "Học theo workflow của bạn" — BUN_BLUE / BUN_BLUE_SOFT, mascot=learn, icon=cards
2. **02 · AI** — "AI lo phần khô khan" — orange / #fff0e4, mascot=magic, icon=sparkle
3. **03 · Modality** — "Đủ kiểu để không chán" — purple / #f5e6f9, mascot=flex, icon=gem

## 5. Features (`<MFeatures>`)

Padding 44px 20px. Title row: eyebrow + H2 "8 modality, *1 app*" + paragraph subtitle.

**2-column grid** (4 rows × 2 cols), gap 10. Each card:
- White, 1px border, shadow-md, radius 14, padding 14px 12px, full height, box-sizing border-box.
- 60×60 top-right ellipse (color, opacity 0.1).
- 32×32 colored icon box (color bg, radius 9, chunky color shadow).
- H3 (13/1000), body (11/600).

8 features (same as desktop):
1. SRS thông minh · purple · `refresh`
2. AI tự sinh thẻ · orange · `sparkle`
3. Luyện đọc to · blue · `speaker`
4. Đặt câu có timer · pink · `pencil`
5. Viết đoạn văn · teal · `book`
6. Bài đọc tương tác · green · `quote`
7. Điền chỗ trống · yellow · `cards`
8. Streak + Pomodoro · red · `flame`

## 6. Workflows (`<MWorkflows>`)

Panel bg, padding 44px 20px. Centered "★ Quan trọng nhất" eyebrow + H2 "Ba người, ba *nhịp học*" + sub.

3 stacked chapter cards (gap 12). Each `<MWorkflowChapter>`:
- White, 1px border, shadow-lg, radius 20, padding 20px 18px.
- **Header row**: 72px circular avatar (accentSoft bg, 2px accent-30 border) holding the mascot pose (66×66, floating). Bottom-right tiny "#1/2/3" badge in accent. To the right: persona name (22/1000), tagline (Lora italic 13/500), target pill ("🎯 30 từ / ngày").
- **Mood quote**: Lora italic 12/500 inkSoft, 10px left-pad, 3px accent left-border, lh 1.45.
- **Step row**: horizontal scroll (overflow-x auto, gap 6, paddingBottom 6, margin-x -18px to bleed to card edge). Each step is a 130px-wide card (panel bg, 1px border, radius 12, padding 10), containing a 22×22 colored icon box + step name (11/900) + step detail (9.5/700 muted). `→` arrow between steps.
- **Outcome bar**: gradient `accentSoft → transparent` strip with 26×26 trophy icon + "KẾT QUẢ" eyebrow + outcome text (12/900).

3 personas: Chloe (pink/`learn`/30 từ), Minh (blue/`flex`/15 phút), An (green/`dream`/Input-driven). Step lists & quotes are identical to desktop — see `BUN_WORKFLOWS` in `landing-bun-parts2.jsx`.

## 7. Screenshots (`<MScreenshots>`)

White bg, padding 44px 0 (NO horizontal padding so scroll bleeds to edge). Title block has 20px horizontal padding.

Title: eyebrow + H2 "Trông thế này, *cảm giác sao*?" + hint "Vuốt ngang để xem →".

Below: a `display: flex; overflow-x: auto; scroll-snap-type: x mandatory; padding: 0 20px;` row with 3 cards (gap 12). Each card 230px wide, snap-aligned start:
- Top: colored pill label ("DASHBOARD" / "FLASHCARD" / "ÔN TẬP").
- Below: card with macOS-style title bar (3 dot circles) + the mock UI (`<MockDashboard>` / `<MockFlashcard>` / `<MockReveal>` — reused from desktop, scale fine at 230×~172).
- Below: 11/700 hint line.

## 8. Why Bún (`<MWhy>`)

Padding 44px 20px. Centered eyebrow + H2 "4 thứ khác với app *bạn đã thử*".

4 stacked rows (gap 10). Each row:
- White, 1px border, shadow-md, radius 16, padding 16px, flex align-items-flex-start gap 12.
- 90×90 top-right ellipse (color, opacity 0.08).
- **Left**: 56×56 squircle (radius 14, color bg, chunky shadow with color tint, 26px white icon centered).
- **Right**: eyebrow chip with index prefix ("01 · Vietnamese-first" in tinted color), H3 (16/1000), body (12/600).

4 reasons:
1. Vietnamese-first · "Không phải app dịch máy" · pink · `quote`
2. Không phải Anki copycat · "Có Anki loop, mà mềm hơn" · purple · `refresh`
3. AI thực sự hữu ích · "Auto-fill, chấm bài — không phải chatbot" · orange · `sparkle`
4. Workflow linh hoạt · "Không ép lộ trình" · BUN_BLUE · `gem`

## 9. FAQ (`<MFaq>`)

Panel bg, padding 44px 20px. Centered eyebrow + H2 "Mấy câu *thường gặp*" + sub "Còn câu khác? **chao@bun.app**".

5 accordion items (gap 8). Each item:
- White, 1px border (`#e8e0d2` default → `#3aa9e655` when open).
- Shadow grows when open (`0 6px 14px #3aa9e625, 0 2px 0 #3aa9e620`).
- Button: 26×26 "Q1–Q5" badge (white on blue when open) + question (13/900) + 22×22 plus-icon box that rotates 45° on open.
- Answer collapses via max-height transition (0 → 240px) 0.35s.

5 FAQs are the same text as desktop — see `BUN_FAQS` in `landing-bun-parts3.jsx`.

## 10. CTA (`<MCTA>`)

Padding 32px 20px 48px. Inner block:
- Radius 24, padding 32px 22px 26px, centered.
- Background: `linear-gradient(135deg, #3aa9e6 0%, #1e87c0 100%)`.
- Shadow: `0 6px 0 rgba(20,40,80,.2), 0 14px 28px #3aa9e655`.
- 4 sparkle decorations.

Content (centered):
- 140×140 `bun-celebrate` mascot with radial-white halo behind + `ngoc-bob` 2.2s.
- H2 "Sẵn sàng *bắt đầu* chưa?" (32/1000 white, drop-shadow `0 2px 0 rgba(20,40,80,.22)`).
- Sub 14/700 "Tạo deck đầu tiên trong **30 giây**…".
- 2 stacked CTAs: white primary "Vào học miễn phí →" with pulse-ring + translucent secondary "▶ Xem demo trước".
- Tiny trust line: "Không cần thẻ · Tiếng Việt · Export Anki".

## 11. Footer (`<MFooter>`)

Padding 24px 20px 28px, white bg, top border.

- Top: logo (32px `ngoc-idle`) + 12/600 paragraph.
- Middle: 2-col link grid (gap 16, 16px below). Columns: **Sản phẩm** (Tính năng / Workflow / Roadmap) + **Liên hệ** (chao@bun.app / GitHub / X · Threads).
- Bottom row (top border, gap 14): mono 9.5/600 "© 2026 · with ♥ by Chloe" + 3 mini links (Privacy / Terms / v0.4).

---

# Surface 2: Web app screens (mobile)

10 in-product screens. All share `<MAppShell>`: status bar (top, 36px) + scrollable main + sticky `<MTabBar>` (bottom).

## Shared chrome

### Status bar (`<MStatusBar>`)
36px tall, padding `0 18px`, flex justify-between. Left: SF Pro 14/700 "9:41". Right: 16×10 cellular SVG (4 stepped bars) + 22×11 battery SVG (rect outline + inner fill). Pass `dark={true}` on dark surfaces to invert.

### Bottom tab bar (`<MTabBar>`)
- Sticky bottom, z-30, white bg, 1px top border, padding `8px 10px 14px` (extra bottom for home-indicator safe-area).
- 5-col grid, gap 4.
- 4 tabs render as 20×20 stroke icons + 10px Nunito label (active → colored stroke + 900 weight; inactive → muted gray + 700).
- The middle (3rd) tab — "Thêm" — is special: a **floating action button** (44×44 BUN_BLUE squircle radius 14, raised `marginTop: -16`) with white plus icon and chunky blue shadow `0 4px 0 rgba(20,40,80,.2), 0 6px 14px #3aa9e666`. Label below stays blue.

Tab order: `Tổng quan (home)` · `Ôn tập (refresh)` · `Thêm (FAB plus)` · `Bộ từ (folder)` · `Khác (settings)`.

### MStatPill
Small inline pill for showing stats in headers. White bg, 1px border, radius 999, padding `5px 10px 5px 7px`. Icon (14px, filled with color) + value (Nunito 900/12). Used for streak / gems / hearts.

## Screen 1: Dashboard (`<MDashboard>`)

`active="home"`. Padding `8px 18px 24px`, flex column gap 14.

1. **Header**: eyebrow "CHƯƠNG 47 · T4 13.5" (10/900 muted) + H1 "Chào buổi sáng, **bạn**!" (24/1000, "bạn" in BUN_BLUE). To the right: 2 stat pills (flame 7 red + gem 248 cyan).
2. **Hero card**: position-relative, BUN_BLUE → #1e87c0 gradient, radius 20, padding 16/18, chunky blue shadow. 4 floating diamond decorations (#fff opacity 0.4). Contains: 70px `ngoc-happy` (left, bobbing), middle "HÔM NAY · 46 từ ôn + 10 từ mới" white text block, right 70px progress ring SVG (4/50, white stroke on translucent track). Below: 2 buttons in a row — primary white-on-blue "▶ ÔN · 46" + secondary translucent "HỌC MỚI · 10".
3. **Streak bar**: white card, 1px border, shadow-md, radius 14. Header: 28×28 red flame box + "7 ngày · kỷ lục: 12" + "+5 phá kỷ lục" (green 11/800). Below: 14-cell calendar strip — past 7 days filled green with check, day 8 (today) white with dashed border + orange center dot, days 9-14 panel.
4. **Stat tiles**: 2×2 grid, gap 8. Each: white card with top-right colored ellipse (opacity 0.14), 26×26 colored icon box, big number (22/1000), label (11/800 inkSoft), sub (10/700 muted). 4 stats: Từ mới 12 (blue), Đang học 38 (orange), Đang ôn 154 (green), Thuộc rồi 73 (purple).
5. **Decks preview**: white card with H3 "Bộ từ" + "Tất cả →" link. Lists 3 decks as 30×30 letter avatar + name + progress bar (5px tall) + percent.

## Screen 2: Flashcard typing (`<MFlashcardTyping>`)

`active="review"`. Padding `8px 18px 18px`, flex column gap 16, height 100%.

1. **Top row**: 34×34 white back button + 12px progress bar (blue gradient at 26% with inner glossy line) + "12/46" + heart-5 pill.
2. **Center stage** (flex 1 column center, gap 18, position-relative with 3 floating sparkles):
   - **Polaroid image**: white frame padding 6 radius 10 shadow, rotate -1.5°, holds a 200×100 mock SVG illustration (orange-tinted card with a face placeholder).
   - **Blue speech bubble**: BUN_BLUE_SOFT bg, blue border 30%-opacity, radius 22, padding 14px 22px, chunky blue shadow, max-width 320. Header "✦ HÃY DỊCH ✦" in blue 9/900 + main "Ưu đãi, dành sự ưu tiên." (19/1000 ink). Bottom-center 16×16 rotated 45° tail.
   - **Input + button**: text input full-width, padding 15px 18px, 2px BUN_BLUE border, radius 14, chunky blue shadow, default value "prefer", centered text. Below: full-width "KIỂM TRA →" blue button (14px 24px, 13/1000). Below that: muted hint "♡ Không nhớ? Đoán đi — sai không sao".

## Screen 3: Reveal + rate (`<MReveal>`)

`active="review"`. Padding `8px 18px 18px`, flex column gap 12.

1. **Top progress**: "THẺ 12/46" label + 9px blue progress bar (28%) + bolt-+12 cyan pill.
2. **Big word header** (border-bottom): inline row with purple "ADJ" badge + "· đã gặp 3 lần" muted text. Then big "**preferential**" (32/1000) — has a soft blue underline highlight rectangle behind it (position absolute, 32% height, opacity 0.28). Inline: IPA `/ˌprefəˈrenʃəl/` in BUN_BLUE mono 12/700. Far right: 32×32 blue play button.
3. **Char diff card**: BUN_BLUE_SOFT bg, blue 50%-border, radius 14, padding 10/14, chunky blue shadow. Eyebrow "BẠN GÕ → ĐÁP ÁN" centered. Then: row of mono chars colored per match (correct = blue, missing = red strikethrough), arrow down, big "preferential" in blue mono 21/800.
4. **Meaning** strip: vertical 4px accent-orange bar + eyebrow "NGHĨA" + "Ưu đãi, dành sự ưu tiên" (15/900).
5. **Example** strip: vertical 4px V_C.blue bar + eyebrow "VÍ DỤ" + English sentence (with "preferential" highlighted blue inline) + Vietnamese translation below.
6. **Collocations**: eyebrow "THƯỜNG ĐI CÙNG" purple + 3 white cards in a column. Each: pink/teal/yellow color dot + the phrase, with "preferential" bolded in blue.
7. **Rating** (border-top, paddingTop 12): "Bạn thấy thế nào?" prompt + 2×2 grid (gap 8) of colored buttons:
   - Top-left: 😵 **LẠI** "< 1 phút" — red
   - Top-right: 😬 **KHÓ** "10 phút" — orange
   - Bot-left: 😊 **TỐT** "1 ngày" — green
   - Bot-right: 🎉 **DỄ** "4 ngày" — cyan (V.gem)
   - Each button: padding 11px 12px, radius 13, color bg, white text, emoji 18px on left, label (12/1000 0.06em) + sub (9.5/700).

## Screen 4: Decks list (`<MDecksList>`)

`active="decks"`. Padding `8px 18px 24px`, flex column gap 12.

1. **Header**: eyebrow "PICK & MIX" + H1 "Bộ từ **của bạn**" + "+ Bộ mới" pill button (top-right, blue).
2. **Search**: full-width input with search icon (15px) absolutely positioned at left:12. Placeholder "Tìm trong bộ từ…".
3. **Filter chips**: horizontal scroll row of dark pills. Active (Tất cả · 12) = ink bg white text; inactive = white bg inkSoft text. Each has a count badge inside (rounded). Options: Tất cả 12 · Đang học 5 · Đã thuộc 3 · Tạm dừng 1.
4. **Deck cards** (column gap 10). Each: white card, 1px border, shadow-md, radius 14, padding 12/14, flex align-center gap 12. Contents:
   - 46×46 colored squircle (letter avatar, chunky color shadow)
   - Middle: deck name (14/1000), "X/Y từ · Z% thuộc" mini text, progress bar 5px tall
   - Right: 16px arrow-right chevron in muted

   6 decks: PTE Academic (green, 38/124) · Business English (blue, 22/86) · Daily Conversation (orange, 41/56) · Phrasal Verbs (purple, 12/72) · TOEIC từ vựng (teal, 18/110) · Idioms hằng ngày (yellow, 0/64).

## Screen 5: Add word + AI auto-fill (`<MAddWord>`)

`active="add"`. Padding `8px 18px 24px`, flex column gap 14.

1. **Header**: eyebrow "AI AUTO-FILL" + H1 "Thêm từ **mới**" + caption.
2. **Paste textarea**: label "Dán danh sách từ" + textarea (min-h 100, mono 14/600, 1.5px BUN_BLUE-55 border, chunky blue shadow, padding 12/14, defaultValue: 4 words on separate lines "preferential / ubiquitous / meticulous / ephemeral"). Bottom-right inline hint "4 từ · mỗi từ 1 dòng".
3. **Deck picker** (label "Thêm vào bộ"): radio list. First option active = BUN_BLUE_SOFT bg with blue 1px border + chunky blue shadow. Each row: 18px radio circle + 28×28 letter avatar + deck name (13/900) + count (10/700 muted). Add a final dashed-border "+ Bộ mới" button.
4. **Toggle options** (panel-bg card, padding 10/12, gap 8): 4 rows label + iOS-style toggle (36×20 pill, slides 16×16 white knob on/off). 3 on by default (IPA+audio, 3 ví dụ, Collocations), 1 off (Ảnh Pexels).
5. **Primary CTA**: full-width blue button "✦ Bún làm hộ · 4 từ" (15px 24px padding, 14/1000, chunky blue shadow). Below: muted center caption "~12 giây · bạn xem lại trước khi lưu".

## Screen 6: Dictionary (`<MDictionary>`)

`active="more"`. Padding `8px 18px 24px`, flex column gap 12.

1. **Header**: eyebrow "TRA CỨU" + H1 "Từ điển **nhanh**" ("nhanh" in BUN_BLUE).
2. **Big search input**: full-width, padding `14px 16px 14px 44px`, font 16/800 Nunito, 2px BUN_BLUE border, radius 14, chunky blue shadow. Default value `preferential`. Search icon (18px) absolutely positioned at left:14.
3. **Word result card**: white, 1px border, shadow-md, radius 16, padding 14/16, flex column gap 10.
   - Top row: word "preferential" (26/1000) + purple ADJ badge + 30×30 blue play button (right).
   - IPA `/ˌprefəˈrenʃəl/` in blue mono 13/700.
   - Vietnamese meaning "Ưu đãi, dành sự ưu tiên" (Nunito 15/800) above a top border.
   - **VÍ DỤ** eyebrow (blue) + English sentence with "preferential" highlighted blue inline + Vietnamese translation.
   - Bottom: full-width blue button "+ Lưu vào bộ từ" (10px 14px, 12/1000).
4. **Recent searches** section: heading row "Tra gần đây" + "Xoá lịch sử" link (blue right-aligned). Below: 4 white pill-cards (1px border, shadow-sm, radius 11, padding 9/12). Each row: word (13/1000) + colored POS badge inline + IPA · Vietnamese meaning (10.5/700 muted) on second line + arrow chevron right.

   Recent words: serendipity NOUN, ephemeral ADJ, pragmatic ADJ, meticulous ADJ.

## Screen 7: Read aloud (`<MReadAloud>`)

`active="review"`. Padding `8px 18px 24px`, flex column gap 16, full height.

1. **Top row**: 34×34 white back button + eyebrow "LUYỆN ĐỌC TO" + "Câu 3 / 10" (14/1000) + accuracy pill on right: BUN_BLUE_SOFT bg, blue text, target icon, value `78%`.
2. **Sentence display card**: white, 1px border, shadow-md, radius 16, padding 16/18.
   - Eyebrow "ĐỌC CÂU NÀY" (10/900 muted) + sentence in Nunito 19/900 with flex-wrap gap 6.
   - Each word colored per phonetic score (1=green V.primary, 0.6–0.99=orange V_C.orange, <0.6=red V_C.red), with a 2.5px underline of `color + 40` opacity, paddingBottom 1.
   - Below: 1px border-top + Vietnamese translation (12/600 inkSoft, lh 1.5).
3. **Per-word scoring**: label "Điểm từng từ" + 2-col grid (gap 6) showing 6 word cards. Each: 22×22 colored squircle with status emoji (✓ for 1.0, ~ for 0.6–0.99, ✗ for <0.6) + word name (12/900, truncated) + percentage (mono 9.5/600 muted).
4. **Mic button** (centered at bottom, 96×96): red bg circle with pulsing halo (`sparkle-twinkle` 1.4s), chunky red shadow, custom microphone SVG (32px white). Below: "Đang nghe… 00:04" + 2 ghost buttons ("🔊 Nghe mẫu" + "Bỏ qua →").

   Demo data: sentence `Club members received preferential seating at the event.` with scores `[1, 1, 0.7, 1, 1, 1, 0.4, 1]`.

## Screen 8: Sentence writing (`<MSentence>`)

`active="review"`. Padding `8px 18px 24px`, flex column gap 14.

1. **Top row**: 34×34 back button + eyebrow "ĐẶT CÂU" + "Câu 2 / 5" + 50×50 **circular timer ring** on right (SVG, orange arc, dasharray-driven fill from `0.65 * 264`, rotate -90, center mono `0:39`).
2. **Target word card**: BUN_BLUE_SOFT bg, 1.5px BUN_BLUE-40 border, radius 14, padding 12/16, chunky blue shadow, centered.
   - Eyebrow "VIẾT CÂU DÙNG TỪ" (9/1000 blue, 0.16em uppercase) + word "preferential" (26/1000 ink) + sub `Ưu đãi, dành sự ưu tiên · /ˌprefəˈrenʃəl/`.
3. **Textarea**: full-width, min-h 100, font 15/700 Nunito, 1.5px ink-border, radius 14, shadow-sm, resize vertical, lh 1.45.
   - Default value: `Members of the elite club enjoy preferential access to exclusive events.`
   - Status row below: green "✓ Có chứa 'preferential'" + "13 từ" word count.
4. **AI feedback card**: white, 1px border, shadow-md, radius 14. Row of 22×22 purple sparkle icon-box + eyebrow "AI GỢI Ý NHANH" (10/1000 purple). Body 12/600: "Cách dùng **chuẩn ngữ pháp**. 'enjoy preferential access' là **collocation phổ biến** — rất tự nhiên!" (bold inline: "chuẩn ngữ pháp" ink, "collocation phổ biến" green).
5. **Bottom row**: "Bỏ qua" ghost (white, ink-soft) + flex-1 blue primary "Nộp cho Bún chấm →".

## Screen 9: Article reader (`<MArticle>`)

`active="review"`. Padding `8px 18px 24px`, flex column gap 12.

1. **Top row**: back button + eyebrow "BÀI ĐỌC" + title "How serendipity shapes science" (13/1000, truncated) + **B2 CEFR badge** on right (orange bg, white, radius 8, padding 4/9, font 11/1000).
2. **Karaoke toolbar**: panel bg, 1px border, radius 12, padding 8/10. 30×30 blue play button + 5px progress bar (blue fill 35%) + speed pill (`1.0×`) + 16px headphones icon button.
3. **Article body**: serif `"Lora", serif`, 15/400, lh 1.6, ink. 3 paragraphs with **highlighted clickable words** (`<Word hl color={...}>` spans with `${color}30` bg, 2px color-border-bottom, padding `0 2px`, radius 3, fontWeight 800).
   - Active highlights: "serendipity" (purple), "fortuitous" (orange), "chance favours" (blue), "breakthroughs" (pink), "nuanced" (teal).
   - Middle paragraph has subtle `${BUN_BLUE}15` background block.
4. **Active word popup**: white, 1.5px V_C.purple-40 border, radius 14, chunky purple shadow.
   - Row: "serendipity" (20/1000) + purple NOUN badge + purple IPA + 26×26 purple play button.
   - Vietnamese meaning (13/800).
   - 2 CTAs: flex-1 purple "+ Lưu vào bộ" + flex-1 ghost "Xem chi tiết".
5. **Stats footer**: 3-col gap 8 of mini-stat cards (1px border, radius 11, padding 8/10, centered): 5 từ lạ (blue) · B2 cấp độ (orange) · 3:12 nghe (green).

## Screen 10: Settings (`<MSettings>`)

`active="more"`. Padding `8px 18px 24px`, flex column gap 16.

1. **Header**: eyebrow "CÁ NHÂN" + H1 "Cài đặt".
2. **Profile card**: white, 1px border, shadow-md, radius 14, padding 14/16, flex row gap 12.
   - 56×56 avatar circle (BUN_BLUE_SOFT bg, 2px BUN_BLUE-40 border) holding 50px `ngoc-happy` mascot.
   - "Chloe Diep" (15/1000) + "chao@chloediep.com · Free" (11/700).
   - Right: "Pro →" upgrade pill (BUN_BLUE_SOFT bg, blue text, 1px border-40, radius 999).
3. **4 sectioned setting groups**, each labeled with uppercase eyebrow + a single white card containing rows. Each row: 30×30 colored icon squircle + label (13/900) + optional sub (10.5/700 muted) + trailing UI:
   - **Toggle row**: 36×20 iOS-style toggle (BUN_BLUE on, V.border off, 16×16 white knob slides).
   - **Value row**: text value + small chevron right.
   - **Default row**: chevron right only.
   - Rows divided by 1px borders; last row in card has no bottom border.

   **Học tập**: Mục tiêu hằng ngày (50 lượt, BUN_BLUE) · Nhắc nhở học (toggle on, orange) · Streak freeze (toggle off, red).
   **Âm thanh & ngôn ngữ**: Phát âm tự động (toggle on, blue) · Giọng đọc (US English, teal) · Ngôn ngữ giao diện (Tiếng Việt, purple).
   **Dữ liệu**: Sao lưu (toggle on, pink) · Export sang Anki (green) · Quản lý dữ liệu (muted).
   **Khác**: Về Bún (purple, quote) · Đánh giá app (orange, sparkle) · Gửi feedback (red, heart).

4. **Logout** button: outlined red ghost (`1.5px solid ${V_C.red}40`, transparent bg, red text), radius 12, padding 12/16, 13/900.
5. **Footer caption**: mono 10/600 muted center: `Bún v0.4 · Made in Sài Gòn · ♥ Chloe Diep`.

---

## Interactions & Behavior (mobile-specific)

| Trigger | Effect |
|---|---|
| Page load | Reveal animations fire (IntersectionObserver, fade-up + scale 0.985→1, stagger 50–120ms, threshold 0.12). Mascots start float/bob loops; sparkles twinkle; gradient blobs drift |
| Tap nav hamburger | Burger lines morph to X; menu panel drops below nav |
| Tap nav menu link | Closes menu, smooth-scrolls to anchor |
| Tap CTA button | `translateY(-2px) scale(1.02)` 0.18s; brightness 1.06. Active: `translateY(1px) scale(0.99)` |
| Touch marquee | Animation pauses |
| Touch+drag screenshots row | Native horizontal scroll snaps to start of next card |
| Touch+drag workflow step row | Native horizontal scroll within the card |
| Tap FAQ item | Toggle open: max-height transition 0 ↔ 240px (0.35s cubic-bezier(.4,0,.2,1)); plus icon rotates 45°; color theme to blue |
| Tap deck row | (Wire to navigation: `/decks/[id]`) |
| Tap tab | Switch screen (state-managed by host app's router) |
| Tap FAB (middle tab) | Open Add Word screen (or modal) |
| Tap "BẮT ĐẦU/ÔN/HỌC MỚI" | Begin study session — wire to `/study?mode=...` |
| Tap rating button (LẠI/KHÓ/TỐT/DỄ) | Submit rating, advance to next card (network call to SRS engine, then load next card) |
| Forever | Hero mascot pose cycles every 1300ms; speech bubbles tilt 4s; gradient blobs drift 14–22s; marquee scrolls 28s; sparkles twinkle 2.4s; primary CTA buttons pulse-ring 2s; italic emphasis text shimmers 5s |

## State Management

Mobile-specific local state:
- **MNav**: `open: boolean` (hamburger)
- **MFaq**: `open: number` (which FAQ is expanded; default 0)
- **LiveMascot**: pose index via setInterval

App-level state (depends on the framework — Redux / Zustand / context):
- Auth, current user
- Active tab (route-driven on web; tab navigator state on native)
- Deck list, deck contents (fetched from backend)
- Current study session: card index, ratings given so far, hearts remaining, gems earned, streak
- AI auto-fill draft state

## Files

- `source/index.html` — entry HTML
- `source/landing-bun-anim.jsx` — animation utilities (`LiveMascot`, `useReveal`, `Reveal`, `HoverLift`, `BlobBg`, sprite components, keyframe injection, hover CSS classes)
- `source/landing-bun-parts1.jsx` — desktop parts (`Sparkles`, `BunLogo` — reused by mobile)
- `source/landing-bun-parts2.jsx` — desktop parts (`BUN_WORKFLOWS` data, `BUN_REASONS` data — reused by mobile)
- `source/landing-bun-parts3.jsx` — desktop parts (`BUN_FAQS` data — reused by mobile)
- **`source/landing-bun-mobile.jsx`** — mobile landing (`BunLanding_mobile` + sub-components)
- **`source/app-mobile.jsx`** — mobile app screens 1–5 (`MDashboard`, `MFlashcardTyping`, `MReveal`, `MDecksList`, `MAddWord`) + the shared shell (`MAppShell`, `MStatusBar`, `MTabBar`, `MStatPill`)
- **`source/app-mobile-extra.jsx`** — mobile app screens 6–10 (`MDictionary`, `MReadAloud`, `MSentence`, `MArticle`, `MSettings`) — depends on shell helpers from `app-mobile.jsx`
- `source/direction-v2.jsx` — V tokens (lift the `V` and `V_C` objects only)
- `source/shared.jsx` — `MASCOT` paths, `Icon` component, sample data
- `source/assets/mascot/*.png` — 12 mascot images

## Notes for the developer

- **Designed at 402px width** — scale fluidly to other widths up to ~480. For tablets (>600px), consider falling back to the desktop landing or building a tablet-specific layout. The current mobile design will look stretched on wide phones (e.g., landscape).
- **Bottom tab bar has a 14px bottom padding for the home indicator** — add `env(safe-area-inset-bottom)` on iOS PWAs / native.
- **All mascot images are decorative** — set `aria-hidden="true"` and empty `alt=""`. Already done in source.
- **Slogan is fixed**: H1 "Học tiếng Anh theo *kiểu bạn thích*." + sub "Bạn lo phần học — mình lo phần thô." — do not reword.
- **Marquee on touch devices**: pause-on-hover doesn't trigger reliably; consider also `:active` or a manual touch handler. The text content must read fine even if static.
- **Reveal animations**: on slower mobile devices, consider reducing animation count or respecting `prefers-reduced-motion` (the source does not — please add).
- **Speech bubble pattern** repeats in hero (mobile), FAQ aside (desktop), CTA (both). Extract as a reusable component.
- **FAB tab pattern**: the raised middle tab can be tricky to implement in native nav libs (React Navigation has a `tabBarButton` slot for this; iOS UIKit has `UITabBarItem` with custom view).
- **Don't ship `app.jsx` or `design-canvas.jsx`** — those are design-canvas chrome only. Render the components directly inside your app's screen routes.
- **Color contrast**: white on BUN_BLUE gradient is fine. Light blue on white (e.g., the BUN_BLUE_SOFT bubble) — make sure secondary text in those bubbles has enough contrast against the tint.
