# Handoff: Bún — Landing page

## Overview

This is a marketing landing page for **Bún** — a Vietnamese-first English-learning app. The page positions Bún as a flexible, mascot-led alternative to Anki / Duolingo: pick-&-mix workflows (flashcard SRS, read-aloud, sentence writing, paragraph writing, AI-graded article reading, cloze quiz, etc.), with AI doing the dirty work (auto-fill IPA / audio / examples / images) while the user picks their own pace.

The page is a single long-scroll layout with 10 sections, blue-accent (`#3aa9e6`) primary, designed to feel **playful and lively** through heavy use of animation + a hand-drawn 3D mascot ("Bún" — a green dragon) appearing in key moments.

## About the design files

The files in `source/` are **design references created in HTML/JSX** — a prototype showing intended look and behavior, **not production code to copy directly**. They use inline React + Babel served from CDN, with all styling done via inline `style={...}` objects.

Your task is to **recreate this design in the target codebase's existing environment** (likely React + Tailwind, Next.js, or whatever stack the Bún app uses for its actual marketing site) using established patterns and libraries — or, if no marketing site environment exists yet, pick the most appropriate framework (Next.js + Tailwind is a safe default for this kind of marketing page) and implement there.

**Do not ship the JSX files as-is.** They are intentionally verbose for design iteration, not for production.

## Fidelity

**High-fidelity (hifi).** Every color, font size, spacing value, border-radius, shadow, and animation timing in the design is intentional. Recreate pixel-perfectly. Where this README is ambiguous, treat the JSX file as the source of truth.

## Entry point

- Open `source/index.html` in a browser to view the design.
- The landing page itself is `BunLanding_v1` defined at the bottom of `source/landing-bun-parts3.jsx`. It composes 10 sections in order:
  1. `<BunNav>` — sticky header
  2. `<BunHero variant="centered">` — main hero
  3. `<BunMarquee>` — auto-scrolling word ticker
  4. `<BunValueProps>` — 3 pillars
  5. `<BunFeatures>` — 8 modality grid
  6. `<BunWorkflows>` — 3 persona stories (★ most important section)
  7. `<BunScreenshots>` — 3 mini product mockups
  8. `<BunWhy>` — 4 differentiators
  9. `<BunFAQ>` — 5 Q&A with sticky aside
  10. `<BunCTA>` — final gradient CTA
  11. `<BunFooter>`

Note: `source/landing-bun-parts3.jsx` also exports `BunLanding_v2` (orange variant) and `BunLanding_v3` (green variant). **Implement only V1 (BLUE).** The other variants are exploration artifacts.

The design references some unrelated V2 product-screen artboards from the parent design canvas (`app.jsx`) — those are NOT part of the landing page and should be ignored.

## Design tokens

### Colors

Primary brand:
| Token | Hex | Use |
|---|---|---|
| `BUN_BLUE` | `#3aa9e6` | Primary accent — buttons, links, focus, italic emphasis |
| `BUN_BLUE_SOFT` | `#e3f2fb` | Soft tint backgrounds |
| `BUN_BLUE_DARK` | `#1e87c0` | Hover / gradient endpoint |

Neutrals (from V tokens — see `direction-v2.jsx`):
| Token | Hex | Use |
|---|---|---|
| `bg` | `#ffffff` | Page background |
| `panel` | `#fafaf6` | Alt section background (slightly warm off-white) |
| `ink` | `#1a2410` | Primary text (very dark green-black) |
| `inkSoft` | `#5a5247` | Secondary text |
| `muted` | `#9e978c` | Tertiary text, eyebrows, captions |
| `border` | `rgba(40,30,15,0.13)` | Subtle borders |
| `borderMed` | `rgba(40,30,15,0.18)` | Medium borders |

Accent palette (multi-color — for category badges, decorative tints):
| Token | Hex |
|---|---|
| `V_C.blue` | `#5dc1f0` |
| `V_C.orange` | `#ff9a3c` |
| `V_C.red` | `#ff5757` |
| `V_C.purple` | `#c179d6` |
| `V_C.pink` | `#f06292` |
| `V_C.teal` | `#6ec1a8` |
| `V_C.yellow` | `#ffc94a` |
| `V.primary` (green) | `#7ac143` |
| `V.gem` (cyan) | `#5dc1f0` |

### Typography

Three font families, loaded from Google Fonts:

```html
<link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900;1000&family=Lora:ital,wght@0,400;0,500;0,600;1,400;1,500;1,600&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">
```

| Role | Family | Weights used | Notes |
|---|---|---|---|
| `headFont` | `"Nunito", system-ui, sans-serif` | 800, 900, 1000 | All headings, buttons, big numbers |
| `bodyFont` | `"Nunito", system-ui, sans-serif` | 400, 600, 700, 800 | Body, paragraphs, nav, labels |
| Italic emphasis | `"Lora", serif` (italic, 500/600) | — | Used inline within headings for the "kiểu bạn thích" / "khác" / "nhịp học" emphasis — always italic, always serif, often colored with the accent |
| `monoFont` | `"JetBrains Mono", monospace` | 600, 700 | IPA pronunciations, footer meta |

**Type scale (px):**

| Use | Size | Weight | Line-height | Letter-spacing |
|---|---|---|---|---|
| Hero H1 | 76 | 1000 | 0.98 | -0.035em |
| Hero gradient H1 (orange variant) | 64 | 1000 | 1.0 | -0.035em |
| Section H2 | 38–44 | 1000 | 1.05–1.1 | -0.025em |
| CTA H2 | 62 | 1000 | 1.0 | -0.035em |
| Card title H3 | 22–24 | 900–1000 | 1.15 | -0.02em |
| Feature card title | 16 | 1000 | 1.2 | -0.01em |
| FAQ Q | 16 | 900 | 1.2 | -0.01em |
| Body lg (hero sub) | 21 | 700 | 1.4 | — |
| Body md | 14–16 | 600 | 1.5–1.55 | — |
| Eyebrow | 11–12 | 900 | 1 | 0.14–0.18em uppercase |
| Body sm / muted | 12–13 | 700 | 1.5 | — |
| Mono / IPA | 11–14 | 600–700 | 1 | — |

### Spacing & layout

- Page max-width: not constrained — content uses **48px horizontal page padding** (`padding: 0 48px`).
- Sections: typically `padding: 60–80px 48px`.
- Section width: 1280px design target (mobile responsive is **out of scope** for this handoff — desktop-first).
- Card gap (grid): `12–16px`.

### Border radius

| Use | Value |
|---|---|
| Small (input chip, kbd) | `5–8px` |
| Default card / button | `13–16px` |
| Large card | `18–22px` |
| Hero block | `28px` |
| CTA block | `32px` |
| Pill / badge | `999px` |

### Shadows (soft chunky style)

The design uses **two stacked shadows** — a hard "raised" offset (no blur, on the bottom edge, for the chunky/3D feel) plus a softer ambient one:

```css
/* shadow-sm */
0 2px 0 rgba(40,30,15,0.05), 0 1px 3px rgba(40,30,15,0.04)

/* shadow-md */
0 3px 0 rgba(40,30,15,0.07), 0 2px 6px rgba(40,30,15,0.04)

/* shadow-lg */
0 4px 0 rgba(40,30,15,0.08), 0 4px 12px rgba(40,30,15,0.04)

/* primary button (blue) */
0 5px 0 rgba(20,40,80,.2), 0 10px 24px #3aa9e666

/* CTA block (gradient) */
0 8px 0 rgba(20,40,80,.2), 0 18px 40px #3aa9e655
```

Pattern: `0 [Y]px 0 [dark]` always paired with a softer ambient blur shadow.

## Mascot system

Bún (the mascot) has **5 hand-drawn 3D poses** + a sprite walk cycle. All files in `source/assets/mascot/`:

| File | Pose | Use |
|---|---|---|
| `bun-learn.png` | Holding book + lightbulb idea | Persona "Chloe" in Workflow section |
| `bun-flex.png` | Lifting dumbbells | Persona "Minh" in Workflow section |
| `bun-celebrate.png` | Dancing arms up | CTA hero |
| `bun-dream.png` | Sitting on cloud | Persona "An" in Workflow + FAQ aside |
| `bun-magic.png` | Eyes closed, glowing orb | "AI" value prop card |
| `ngoc-happy.png` | Happy waving (default) | Hero center, value prop "workflow" card |
| `ngoc-blink.png` | Blinking (eyes closed) | Hero pose cycle alternate |
| `ngoc-idle.png` | Standing idle | Logo (small) |
| `ngoc-run-a.png` / `ngoc-run-b.png` | Run sprite (2 frames) | (Available — currently unused after trim) |

Asset spec:
- **PNG with transparent background**
- ~500×500 native, rendered at 96–240px depending on context
- Always with `drop-shadow(0 6–14px 12–28px rgba(40,30,15,0.18–0.32))`

The hero uses a **pose-cycling component** (`<LiveMascot>`) that swaps poses every 1300ms between `happy → happy → happy → blink → happy` to feel alive.

## Sections

### 1. Nav (`<BunNav>`)

- Sticky top, height ~64px, padding `14px 48px`.
- Translucent background `rgba(255,255,255,0.85)` with `backdrop-filter: blur(14px)`.
- Bottom 1px border.
- **Left**: Logo = `ngoc-idle` mascot (36px) + word "Bún" (Nunito 900, color `#1a2410`, letter-spacing `-0.03em`).
- **Center**: Nav links — `Tính năng · Workflow · Về Bún · FAQ` (Nunito 700, 14px, color inkSoft, 28px gap).
- **Right**: "Đăng nhập" text link + "Vào học →" primary button (blue, 10px 18px padding, radius 13).

### 2. Hero (`<BunHero variant="centered">`)

Tall section, ~700px min-height, padding `60px 48px 90px`, text-align center, overflow hidden.

**Backgrounds (decorative)**:
- 4 animated gradient blobs (`<BlobBg>`) — large radial gradients in blue/pink/yellow/teal, opacity 0.10–0.16, blurred 8px, animated with `bun-blob` keyframes (drift + scale 1↔1.1↔0.95 over 14–22s).
- 8 sparkle stars (`<Sparkles>`) — 8-pointed polygons in yellow/pink/blue/orange/purple/teal, 8–12px, twinkling.

**Pre-heading badge** (centered): pill-shaped, white bg, 1.5px solid `#3aa9e655` border, contains a pulsing blue dot + text "App học tiếng Anh kiểu Việt · v0.4 beta" (Nunito 900, 12px, blue, 0.14em letter-spacing, uppercase). Shadow `0 3px 0 #3aa9e625`.

**Mascot block** (centered, ~240×220 box):
- `<LiveMascot size={210}>` cycling poses (happy/blink), with float animation (`ngoc-bob` 3s).
- Behind it: radial-gradient halo (blue 40% → transparent at 65%), twinkling.
- To the right: a **speech bubble** — small white card "Mình đợi bạn nha 🐲" with arrow-tail pointing left, gently tilting via `bun-tilt-loop` (4s).

**Heading** (max-width 920, font-size **76px**, weight 1000, line-height 0.98, letter-spacing -0.035em):
> Học tiếng Anh<br/>theo *kiểu bạn thích*.

The italic "kiểu bạn thích" uses Lora italic 600 with a **shimmering text-gradient**: `linear-gradient(90deg, #3aa9e6, #f06292, #3aa9e6)` clipped to text, background-size 200%, animated `bun-shimmer-text` 5s linear infinite. Trailing period is rendered separately in ink color.

**Sub** (max-width 640, 21px, weight 700):
> Bạn lo phần **học** — mình lo phần **thô**.

The word **"thô"** has a soft underline highlight bar — a `40%`-opaque blue rectangle absolutely positioned behind the text at `bottom: 1px`, height 6px, with negative z-index.

**CTAs** (centered, 12px gap):
- Primary: "Bắt đầu học →" — blue bg, white text, padding 17px 32px, radius 18, font 16/1000. Surrounded by an animated pulse ring (`bun-pulse-ring` 2s) — a `position: absolute; inset: -3px; border-radius: 21px` element that color = blue + animated box-shadow from `0 0 0 0` → `0 0 0 18px transparent`.
- Secondary: "▶ Xem workflow mẫu" — white bg, ink text, 1.5px border, same height.

**Trust row** (under CTAs, muted text 12/700):
- ✓ Miễn phí dùng thử  · ✓ Tiếng Việt 100%  · ✓ Không cần thẻ tín dụng

**Floating mock previews** (absolutely positioned, rotated):
- **Streak card** at `left: 36px, top: 230px, rotate(-3deg)` — 230px wide white card showing flame icon + "7 ngày liên tiếp · kỷ lục: 12" + a 14-cell streak bar grid where 7 cells are filled blue with a staggered `bun-streak-pop` entrance animation. Slow float via `bun-float-slow` 5s.
- **Word card** at `right: 36px, top: 200px, rotate(4deg)` — 230px wide showing the word "preferential" with IPA, definition, and 4 rating buttons (LẠI / KHÓ / TỐT / DỄ). Slow float 5.6s, -1.5s delay.

### 3. Marquee (`<BunMarquee>`)

Horizontal scrolling word ticker, height ~46px, top + bottom 1px borders, panel bg.

- Left-anchored pill (white, blue border) shows **"✦ AI auto-fill →"**.
- Words scroll left infinitely via `bun-march` 28s linear (translateX from 0 to right edge, looped 3×):
  - `preferential · /ˌprefəˈrenʃəl/`
  - `serendipity · /ˌserənˈdɪpəti/`
  - `meticulous`, `ubiquitous`, `epitome`, `pragmatic`, `inevitable`, `elaborate`, `ephemeral`
  - JetBrains Mono 14/600, ink-soft color, with a blue ✦ between each.

### 4. Value props — 3 pillars (`<BunValueProps>`)

Section bg = `panel` (#fafaf6), padding 60px 48px. Centered eyebrow "3 trụ cột" + H2 "Vì sao Bún *khác*?". 3-column grid, 16px gap, scroll-revealed with 120ms stagger.

Each card:
- White, 1px border, shadow-lg, radius 22, padding `24px 22px 22px`, **height stretched**, hover lifts -8px.
- Top-right: a **mascot pose at 96×96** (`learn` / `magic` / `flex` respectively), with `ngoc-float` animation (varied delay per card).
- Background quarter-circle bottom-left of mascot: 160×160 colored ellipse at `top: -40, right: -40`, color matches card accent.
- Below: 48×48 colored icon box (radius 14, chunky shadow with the card's accent), eyebrow text "01 · Workflow" (uppercase 0.16em, muted), H3 (22/1000) with highlight span in the card accent color, body (14/600, inkSoft, 1.55).

3 cards (in order):
1. **01 · Workflow** — "Học theo workflow của *bạn*" — blue (`#3aa9e6`), bun-learn, icon=cards
2. **02 · AI** — "AI lo phần *khô khan*" — orange (`#ff9a3c`), bun-magic, icon=sparkle
3. **03 · Modality** — "Đủ kiểu để *không chán*" — purple (`#c179d6`), bun-flex, icon=gem

### 5. Features grid (`<BunFeatures>`)

Padding 72px 48px. Top row: eyebrow "Tính năng" + H2 "8 modality, *1 app*" (italic Lora, blue) on left, description on right.

4-column × 2-row grid of 8 feature cards, 12px gap. Each card (`<FeatureCard>`):
- White, 1px border, shadow-md, radius 18, padding `22px 18px 18px`.
- Hover: lifts -6px, shadow grows, icon plays `bun-wiggle` (rotates -6° → 6° → 0° over 0.55s), top-right colored ellipse intensifies (opacity 0.08 → 0.18).
- 46×46 colored icon box (radius 14, chunky color-tinted shadow).
- H3 16/1000, body 13/600.

All 8 features (with colors):
1. **Học theo SRS thông minh** — purple, icon `refresh` — "Lịch ôn khoa học (SM-2), Anki-style loop trong session — ôn đến khi thực sự thuộc."
2. **AI tự sinh thẻ** — orange, icon `sparkle` — "Dán 30 từ tiếng Anh, Bún tự fill IPA, audio, 3 ví dụ, collocations, ảnh Pexels."
3. **Luyện đọc to** — blue, icon `speaker` — "Đọc vào mic, Web Speech API chấm phát âm theo từng từ."
4. **Đặt câu có timer** — pink, icon `pencil` — "Viết câu chứa từ đã học, AI Gemini chấm + góp ý cụ thể."
5. **Viết đoạn văn** — teal, icon `book` — "Chọn pool từ đã học, viết bài, AI chấm ngữ pháp + cách dùng từ."
6. **Bài đọc tương tác** — green (V.primary), icon `quote` — "Dán bài viết bất kỳ, app chấm CEFR, karaoke TTS, click từ lạ → định nghĩa + lưu deck."
7. **Điền chỗ trống** — yellow, icon `cards` — "Cloze quiz tự sinh từ pool đã học, luyện nhận diện ngữ cảnh."
8. **Streak + Pomodoro** — red, icon `flame` — "Theo dõi tiến trình, mục tiêu hàng ngày, timer tập trung tích hợp."

### 6. Workflows (`<BunWorkflows>`) — ★ most important section

Section bg = `panel`. Centered "★ Quan trọng nhất" eyebrow + H2 "Ba người, ba *nhịp học* khác nhau" + paragraph.

3 stacked **chapter cards** (`<WorkflowChapter>`), each:
- White, 1px border, shadow-lg, radius 26, padding 32px 36px.
- Decorative "dragon footprint trail" SVG in the side margin (3-toed paw prints, alternating angles, count = step count, opacity 0.18, in the accent color).
- **Header row**: 120px circular avatar (accentSoft bg, 2px accent-tinted border, inset shadow) containing the mascot pose at 108×108 with `ngoc-float` animation. To the right: persona name (32/1000) + tagline (Lora italic 500, 19px, "— Học chuyên sâu"). Below: a target badge (e.g., "🎯 30 từ / ngày"). On the far right: a **pull-quote** (Lora italic 500 14px, 16px left-padded with a 3px accent-color bar).
- **Step row**: horizontal flex of step cards, with `→` separators between. Each step card: panel bg, 1px border, radius 16, padding 14px, contains a 28×28 colored icon box, "01" mono label, step name (13/900), step detail (11/700 muted). Reveal-animated with stagger.
- **Outcome bar**: gradient fade `accentSoft → transparent`, radius 12, padding 12px 16px. Contains 30×30 trophy icon box + "KẾT QUẢ" eyebrow + outcome statement.

3 personas (in order):
1. **Chloe — Học chuyên sâu** (pink `#f06292`, pose=`learn`, target "30 từ / ngày") — 7 steps: Đặt mục tiêu → Dán 30 từ → Học flashcard → Viết đoạn văn → Điền chỗ trống → Luyện đọc to → Đặt câu có timer. Outcome: "Thuộc 30 từ ở 5 modality khác nhau". Quote: *"Mình thích cày sâu một list — nhồi 1 từ qua 5 cách khác nhau, đảm bảo thuộc cho bằng được."*
2. **Minh — Người đi làm bận** (blue `#5dc1f0`, pose=`flex`, target "15 phút / ngày") — 3 steps: Speed quiz → Flashcard → Đọc to. Outcome: "Giữ nhịp đều, không bỏ ngày". Quote: *"Mình chỉ có 15 phút trước khi đi ngủ. Cần ngắn, gọn, mà vẫn giữ được streak."*
3. **An — Học qua đọc báo** (green V.primary, pose=`dream`, target "Input-driven") — 6 steps: Dán bài Medium/BBC → App chấm CEFR → Click từ lạ → Karaoke TTS → Dịch sang Việt → Paraphrase. Outcome: "Mỗi bài đọc = 1 deck + 4 bài luyện". Quote: *"Mình thích đọc Medium / BBC. Mỗi bài là 1 nguồn từ vựng — không cần học từ list khô khan."*

After the 3 chapters: a centered horizontal divider with a pill "✦ Hoặc trộn lại — workflow của bạn là của bạn." in the middle.

### 7. Screenshots (`<BunScreenshots>`)

Section bg white, padding 80px 48px. Centered eyebrow + H2 "Trông thế này, *cảm giác thế nào*?" + hint "Di chuột vào ảnh để xem rõ hơn →".

3-column flex of `<ScreenshotFrame>`s (aspect-ratio 4:3, alternating tilts -1.4° / +0.8° / -0.5°). Each frame:
- Top: a colored pill label ("DASHBOARD" / "FLASHCARD" / "ÔN TẬP · REVEAL").
- Below: a card with a **macOS-style title bar** (3 dot circles in red/yellow/green) + the mock UI.
- Below: a 12/700 inkSoft hint line.
- **Hover**: tilt straightens to 0°, lifts -8px, shadow grows.

Mock contents are minimal — simplified versions of the actual app screens:
- **MockDashboard**: tiny sidebar with 7 colored squares + top header "Chương 47" + 3 stat pills + orange-gradient hero strip with mascot + 4 stat tiles + chart bars.
- **MockFlashcard**: progress bar + tilted polaroid image + mint speech bubble "Hãy dịch" + the Vietnamese prompt + input field with blue border + green "KIỂM TRA" button.
- **MockReveal**: thẻ counter + progress + "preferential" big with underline highlight + IPA + char-diff (prefer→preferential) + meaning line + 4-button rating row (LẠI/KHÓ/TỐT/DỄ).

These mock UIs are intentionally simplified — **do not implement them as fully interactive**; they're decorative previews.

### 8. Why Bún (`<BunWhy>`)

Padding 80px 48px. Centered eyebrow + H2 "4 thứ khác với app *bạn đã thử*".

4 stacked rows alternating `row` / `row-reverse`. Each row:
- White card, 1px border, shadow-md, radius 22, padding 22px 28px, gap 26px.
- Large faded color circle at the far end (160×160, opacity 0.10).
- Left/right: a **96×96 icon block** (squircle, radius 22, the reason's color background, chunky bottom shadow, 44px white icon centered).
- Middle: eyebrow chip (3px 10px, faded color bg + color text, with mini icon) + H3 (24/1000) + body (14/600).
- Far end: a giant `01–04` ghost number (Nunito 1000, 70px, color `panel`).
- Hover: lifts -4px.

4 reasons:
1. **Vietnamese-first** — "Không phải app dịch máy" — pink, icon=`quote`
2. **Không phải Anki copycat** — "Có Anki loop, mà mềm hơn" — purple, icon=`refresh`
3. **AI thực sự hữu ích** — "Auto-fill, chấm bài — không phải chatbot" — orange, icon=`sparkle`
4. **Workflow linh hoạt** — "Không ép lộ trình" — blue (`BUN_BLUE`), icon=`gem`

### 9. FAQ (`<BunFAQ>`)

Section bg `panel`, padding 72px 48px. 2-column grid, `0.7fr 1.3fr`, 48px gap.

- **Left column** (sticky at top 90px): eyebrow + H2 "Mấy câu *thường gặp*" + paragraph "Còn câu khác? Mình ở email **chao@bun.app**" + the `bun-dream` mascot at 170px (float animation).
- **Right column**: 5 accordion items (`<FaqItemBlue>`), 10px gap, reveal-animated with stagger.

Each FAQ item:
- White card, 1px border (`#e8e0d2` default, `#3aa9e655` when open).
- Box-shadow grows when open (`0 8px 20px #3aa9e625, 0 3px 0 #3aa9e620`).
- Button row: 34×34 "Q1/Q2/…" badge (white text on blue when open, dark on panel when closed) + question text (16/900) + 28×28 plus-icon box that rotates 45° to become an X when open.
- Answer panel: collapses via max-height transition (0 → 200px) over 0.35s cubic-bezier.

5 FAQs (Vietnamese, in order):
1. **Có mất phí không?** — "Hiện tại Bún miễn phí dùng — bạn có thể tạo deck, dùng AI auto-fill, học SRS không giới hạn. Sau này có thể có tier pro (cho AI premium models), nhưng core sẽ luôn free."
2. **Khác gì Anki / Duolingo?** — "Khác Anki: Bún có 8 modality (đọc to, viết câu, đoạn văn, bài đọc) + AI auto-fill, không phải chỉ flip card. Khác Duolingo: Bún không ép lộ trình bài — bạn pick & mix theo nhịp riêng, không tree linh tinh."
3. **AI sai thì sao?** — "Bún dùng Gemini 2.5 Flash + dictionary cross-check cho IPA và nghĩa. Vẫn có thể sai — bạn edit trực tiếp được, hoặc 1-click regenerate. Bún không ép bạn tin AI."
4. **Cần internet không?** — "Cần internet cho lần đầu mỗi thẻ (để AI sinh nội dung). Sau đó, ôn flashcard offline được — content đã cache. Đọc to, viết bài cần network."
5. **Data của mình có an toàn không?** — "Decks và progress lưu trên Cloudflare D1 (account của bạn). Không bán data, không quảng cáo. Export sang Anki/CSV bất cứ lúc nào."

### 10. CTA (`<BunCTA>`)

Padding `48px 48px 80px`. Inner block:
- Radius 32, padding `60px 56px`.
- Background: **blue gradient** `linear-gradient(135deg, #3aa9e6 0%, #1e87c0 100%)`.
- Shadow: `0 8px 0 rgba(20,40,80,.2), 0 18px 40px #3aa9e655`.
- 8 sparkles decorating the corners.

Inside, 2-column layout:
- **Left**: `bun-celebrate` mascot at 240px with `ngoc-bob` 2.2s animation + radial white halo behind. Speech bubble "Đi học thôi nha!" (Lora italic 600, 16px) positioned `top: -10, right: -130`, tilting `bun-tilt-loop` 3.5s.
- **Right**: H2 "Sẵn sàng *bắt đầu* chưa?" (62/1000, white, drop-shadow `0 3px 0 rgba(20,40,80,.22)`) + sub "Tạo deck đầu tiên trong **30 giây**…" + 2 CTAs (primary white-on-color with pulse ring + secondary translucent) + trust line.

### 11. Footer (`<BunFooter>`)

Padding `40px 48px 32px`, white bg, top border.

Top row (space-between, wrap):
- **Left**: logo (`ngoc-idle` 36px) + Bún wordmark + 320px max-width paragraph "App học tiếng Anh cho người Việt. Pick & mix 8 modality, AI lo phần khô khan, Bún làm bạn đồng hành."
- **Right**: 3 link columns (56px gap), each with an uppercase eyebrow and 4 links. Columns:
  - **Sản phẩm**: Tính năng · Workflow mẫu · Roadmap · Changelog
  - **Về**: Câu chuyện · Tại sao Bún · Blog (sắp có)
  - **Liên hệ**: chao@bun.app · GitHub · X / Twitter · Threads

Bottom row (top-border, space-between):
- Left: mono caption "© 2026 Bún · Made in Sài Gòn · with ♥ by Chloe Diep"
- Right: Privacy · Terms · v0.4 (beta)

## Interactions & Behavior

| Trigger | Effect |
|---|---|
| Page load | All animations start. Reveal-on-scroll fires for value props, features, workflow chapters, why rows, FAQ items as they enter viewport (IntersectionObserver, threshold 0.12, rootMargin `0px 0px -8% 0px`, fade-up 20–36px, 700–800ms cubic-bezier(.2,.7,.3,1), staggered children) |
| Hover nav link | Underline draws in from left (scaleX 0→1, 0.25s cubic-bezier(.2,.7,.3,1)), color shifts to `#3aa9e6` |
| Hover logo | Scales 1.05 + rotates -3°, 0.25s cubic-bezier(.34,1.56,.64,1) (bouncy) |
| Hover any CTA button (`.bun-cta-btn`) | `translateY(-2px) scale(1.02)`, brightness 1.06, 0.18s ease |
| Active any CTA button | `translateY(1px) scale(0.99)` |
| Hover hero trust item (✓ Miễn phí…) | Color shifts to blue |
| Hover marquee | Animation pauses (`animation-play-state: paused`) — gives user time to read |
| Hover feature card | Lift -6px, shadow grows, icon wiggles 0.55s, top-right ellipse opacity 0.08→0.18 |
| Hover screenshot frame | Tilt straightens to 0°, lifts -8px, shadow grows |
| Hover value prop card | Lift -8px |
| Hover why-bún row | Lift -4px |
| Hover footer link | Color shifts to ink, translateX +3px |
| Click FAQ item | Toggle open/close; max-height transition 0.35s; rotate +icon 45°; color theme to blue |
| Forever | Hero mascot pose cycles every 1300ms; speech bubbles tilt-loop; mock cards float-slow; gradient blobs drift; marquee scrolls (pauses on hover); sparkles twinkle; primary CTA buttons emit pulse rings; italic emphasis text shimmers |

## State Management

Very minimal — this is a marketing page, mostly stateless:
- `BunFAQ`: `open: number` (which FAQ index is expanded; -1 = none, default 0 = first open)
- `LiveMascot`: internal `i: number` for pose cycle (use `setInterval`)
- `FeatureCard` / `HoverLift` / `ScreenshotFrame`: internal `hover: boolean`
- `useReveal()`: ref + `visible: boolean` tied to IntersectionObserver

No data fetching. No forms. No authentication. CTAs should link to the actual `/signup` / `/demo` routes of the Bún app.

## Animation reference

All custom keyframes (see `landing-bun-anim.jsx` for the full set):

```css
@keyframes ngoc-bob          /* mascot bounce: translateY 0 → -4 → 0, 2.5–3s ease-in-out */
@keyframes ngoc-float        /* mascot float with rotation: -2° → +2° rotate, 3.5s */
@keyframes bun-float-slow    /* card float: rotate(-3°) → rotate(+2°) + translateY, 5–5.6s */
@keyframes bun-tilt-loop     /* gentle tilt back-and-forth: -2° → 2°, 4s */
@keyframes bun-wiggle        /* quick shake on hover: -6° → 6° → 0°, 0.55s */
@keyframes bun-blob          /* background drift + scale, 14–22s */
@keyframes sparkle-twinkle   /* opacity 0.3 ↔ 1, scale 0.8 ↔ 1.2, 2.2–3s */
@keyframes bun-shimmer-text  /* background-position -200% → 200%, 5s linear */
@keyframes bun-pulse-ring    /* box-shadow 0 → 18px out, opacity 1 → 0, 2s */
@keyframes bun-streak-pop    /* scaleY 0 → 1.15 → 1, 0.55s cubic-bezier(.34,1.56,.64,1) */
@keyframes bun-march          /* translateX(-120px) → translateX(100vw+120px), linear */
@keyframes bun-caret         /* blinking text caret, 0.8s steps(2) */
```

## Assets

All assets live in `source/assets/mascot/`. PNG, transparent background, ~500×500 native resolution. Recommended: serve from `/public/mascot/` in Next.js or equivalent static asset path. Use `<Image>` from `next/image` for optimization if applicable.

No third-party imagery is used. No stock photos.

## Icons

Inline SVG only — see `Icon` component in `source/shared.jsx`. ~30 hand-drawn SVG paths used (book, refresh, sparkle, speaker, pencil, quote, gem, bolt, heart, flame, etc.). Either:
1. Port the `Icon` component as-is (simplest), OR
2. Map names to **Lucide React** equivalents — most names match Lucide's catalog directly (`Sparkles`, `RefreshCw`, `Volume2`, `Pencil`, `BookOpen`, `Quote`, `Gem`, `Flame`, `Heart`, etc.)

Note: the design uses Lucide-style stroke icons + filled-color icons interchangeably. The `Icon` component takes `fill` and `stroke` as separate props.

## Files

- `source/index.html` — entry HTML, loads React + Babel from CDN
- `source/app.jsx` — top-level `<DesignCanvas>` wrapper (used only for the design tool — **discard when porting**, just render `<BunLanding_v1>` directly)
- `source/landing-bun-anim.jsx` — animation utilities (`LiveMascot`, `useReveal`, `Reveal`, `HoverLift`, `BlobBg`, sprite components, keyframe injection)
- `source/landing-bun-parts1.jsx` — Logo, Nav, Sparkles, Hero, Marquee, ValueProps, Features, FeatureCard, mini mock cards
- `source/landing-bun-parts2.jsx` — Workflows + WorkflowChapter + FootprintTrail + Screenshots + MockDashboard / MockFlashcard / MockReveal + Why
- `source/landing-bun-parts3.jsx` — FAQ + FaqItemBlue + CTA + Footer + `BunLanding_v1` assembly
- `source/direction-v2.jsx` — defines `V` token system and base styles (just lift the `V` and `V_C` objects from the top of this file — don't copy the rest)
- `source/shared.jsx` — `MASCOT` paths, `Icon` component, keyframe injection, sample data
- `source/assets/mascot/*.png` — all mascot pose images

## Notes for the developer

- The design is **desktop-first, 1280px target** — mobile responsive is NOT designed. You'll need to add breakpoints. Suggested: stack hero mascot above heading, hide floating mock cards on mobile, collapse workflow step rows into vertical scrolls, single-column value props/features/why on mobile.
- The mascot images are decorative — set `aria-hidden="true"` and empty `alt=""` for accessibility (already done in source).
- Slogan is: **H1 "Học tiếng Anh theo *kiểu bạn thích*."** + sub **"Bạn lo phần học — mình lo phần thô."** — this is intentional and approved, don't reword.
- Color contrast on the blue gradient CTA is borderline — keep white as the primary text on it; don't use ink color.
- The "speech bubble" pattern repeats 3 times (hero, FAQ-aside, CTA) — extract into a reusable component when porting.
- `Reveal` IntersectionObserver: tie `rootMargin: '0px 0px -8% 0px'` so reveals trigger slightly before fully in view.
- Don't ship the design-canvas wrapper. Render only `<BunLanding_v1>`.
