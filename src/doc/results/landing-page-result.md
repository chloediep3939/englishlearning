# Landing page — result

Implementation log for the `/` marketing page (Bún). The matching prompt is
`src/doc/prompts/landing-page.md`. Design source:
`~/Downloads/design_handoff_bun_landing/` (README + JSX prototype).

## Scope

A long-scroll marketing landing rendered at `/` for unauthenticated visitors;
authenticated users redirect to `/dashboard`. Ten sections from the design
handoff (Nav · Hero · Marquee · ValueProps · Features · Workflows ·
Screenshots · Why · FAQ · CTA · Footer), heavy on CSS-keyframe animation, blue
brand accent, and the new hand-drawn "bun-*" mascot poses.

## Files changed

### Routing / auth wiring

- `src/app/page.tsx` — NEW. Server component. `getCurrentUserId()` → redirect
  to `/dashboard` if authed, otherwise render `<BunLanding/>`. Marked
  `force-dynamic` + `runtime: 'nodejs'` to match the project's existing
  cookie-reading page pattern.
- `src/app/dashboard/page.tsx` — moved from `src/app/page.tsx` via `git mv`
  (history preserved; contents unchanged).
- `src/middleware.ts` — added `'/'` to `PUBLIC_PATHS` so guests reach the
  landing without being redirected to `/login`.
- `src/components/Sidebar.tsx` — `NAV[0].href` `/` → `/dashboard`.
- Batch sed pass on 18 files to retarget `href="/"` / `router.push('/')` at
  `/dashboard` (each is a "back to home" link from a feature page):
  - `src/app/{settings,study,cloze,compose,speed,decks,pronounce,sentence,add,review,dictionary,passage,stats}/page.tsx`
  - `src/components/ClozeSession.tsx`
  - `src/components/speed-quiz/SummaryScreen.tsx`
  - `src/components/flashcard-session/{FlashcardSession,SummaryScreen,SessionPicker}.tsx`

### Tokens / global CSS

- `src/app/globals.css`
  - Google Fonts import — added **Lora** (italic 400/500/600) + Nunito weight
    **1000** (the design uses both).
  - `:root` — added brand tokens: `--v-brand: #3aa9e6`, `--v-brand-soft:
    #e3f2fb`, `--v-brand-dark: #1e87c0`; plus `--v-font-serif`.
  - 9 new keyframes (prefixed `v-bun-*` to namespace away from the interior
    app's `v-ngoc-*`): `march`, `blob`, `caret`, `float-slow`, `pulse-ring`,
    `wiggle`, `shimmer-text`, `streak-pop`, `tilt-loop`. Values copied
    verbatim from `landing-bun-anim.jsx`.
  - `.bun-landing-root` class — forces light tokens (so marketing stays light
    even when interior theme is dark), declares marketing pastel bg tokens
    (`--v-bun-pink-bg` / `-blue-bg` / `-orange-bg` / `-purple-bg`), and
    scopes the landing-only hover classes underneath:
    `.bun-nav-link` / `.bun-cta-btn` / `.bun-trust-item` / `.bun-logo-wrap` /
    `.bun-marquee` / `.bun-marquee-track` / `.bun-footer-link`.

### Mascot assets

5 new PNGs copied from `design_handoff_bun_landing/source/assets/mascot/` →
`public/mascot/`: `bun-{learn, flex, celebrate, dream, magic}.png`. Existing
`ngoc-*.png` files untouched.

### Landing components (new — `src/components/landing/`)

Sections (one per file):

- `BunLanding.tsx` — root, composes all sections under `.bun-landing-root`.
- `BunNav.tsx` — sticky / blurred / logo + 4 anchor links + Đăng nhập +
  "Vào học →" primary CTA. Both auth CTAs → `/login`.
- `BunHero.tsx` — pre-heading pill, halo + `<LiveMascot>` + tilting speech
  bubble, 76px shimmering H1, "thô" underline, primary `<PulseButton>` +
  secondary, trust row, both floating mock cards (left streak, right word).
- `BunMarquee.tsx` — auto-scroll IPA ticker with "AI auto-fill →" anchor pill.
- `BunValueProps.tsx` — 3 pillars (Workflow / AI / Modality) with mascot
  poses + quarter-circle bg + colored title highlights.
- `BunFeatures.tsx` — 4×2 feature grid using `<FeatureCard>`.
- `BunWorkflows.tsx` — 3 persona chapters using `<WorkflowChapter>` +
  bottom "Hoặc trộn lại" divider pill.
- `BunScreenshots.tsx` — 3 alternating-tilt `<ScreenshotFrame>`s wrapping
  `<MockDashboard>` / `<MockFlashcard>` / `<MockReveal>`.
- `BunWhy.tsx` — 4 reasons alternating `row` / `row-reverse` with ghost
  numbers.
- `BunFAQ.tsx` — 2-col sticky aside + 5-item accordion using `<FaqItem>`;
  first item open by default.
- `BunCTA.tsx` — blue-gradient block, 8 sparkles, `bun-celebrate` mascot with
  serif-italic speech bubble (tail bottom), white-on-color pulse CTA.
- `BunFooter.tsx` — logo + tagline + 3 link columns + bottom row.

Shared primitives (`src/components/landing/shared/`):

- `useReveal.ts` — IntersectionObserver hook (threshold 0.12, rootMargin
  `0px 0px -8% 0px`, once-on-default).
- `Reveal.tsx` — fade-up wrapper using `useReveal`.
- `HoverLift.tsx` — translate-Y on hover.
- `Icon.tsx` — design-name → lucide-react mapping. See "Icon mapping" below.
- `Sparkles.tsx` — 8-point star polygons with `v-sparkle` twinkle.
- `BlobBg.tsx` — radial-gradient blobs animated with `v-bun-blob`.
- `LiveMascot.tsx` — pose-cycling raw `<img>` with `v-ngoc-bob` float.
- `SpeechBubble.tsx` — generic tilting bubble; 4 tail directions, body/serif
  font option. Used in hero + CTA.
- `PulseButton.tsx` — primary CTA with pulse ring. `tone='filled'` (hero)
  and `tone='inverted'` (CTA, white on blue gradient).
- `MockStreakCard.tsx` / `MockWordCard.tsx` — floating hero mocks.
- `FeatureCard.tsx` — single feature tile; hover lifts -6px + icon wiggle.
- `WorkflowChapter.tsx` — full persona chapter (avatar + header + step row
  with `→` separators + outcome bar).
- `FootprintTrail.tsx` — decorative paw-print SVG in the chapter margin.
- `ScreenshotFrame.tsx` — macOS-style title bar; hover straightens tilt.
- `MockDashboard.tsx` / `MockFlashcard.tsx` / `MockReveal.tsx` — decorative
  thumbnail mock UIs.
- `FaqItem.tsx` — accordion row; plus icon rotates 45° on open, max-height
  collapse transition 0.35s cubic-bezier.

### Doc

- `src/doc/prompts/landing-page.md` — saved the user's prompt verbatim with a
  `Date: 2026-05-14` header (CLAUDE.md §8).
- `src/doc/results/landing-page-result.md` — this file.

## Icon mapping (design-name → lucide-react)

All icons routed through `landing/shared/Icon.tsx`. Source `Icon` component
names from `shared.jsx` were ported as follows:

| Design name | lucide-react |
| --- | --- |
| `arrowRight` | `ArrowRight` |
| `book` | `BookOpen` |
| `bolt` | `Zap` |
| `cards` | `Layers` |
| `check` | `Check` |
| `flame` | `Flame` |
| `gem` | `Gem` |
| `pencil` | `Pencil` |
| `play` | `Play` |
| `plus` | `Plus` |
| `quote` | `Quote` |
| `refresh` | `RefreshCw` |
| `sparkle` | `Sparkles` |
| `speaker` | `Volume2` |
| `target` | `Target` |
| `trophy` | `Trophy` |

Icons in the source `Icon` component that weren't used by the landing
(home, library, folder, chart, settings, headphones, search, arrowLeft, bell,
heart, star, pen) were not ported — add to `ICON_MAP` if a future section
needs them.

## Key decisions

- **Dashboard moved to `/dashboard`.** Picked over branching `page.tsx` so
  the routing topology stays clean. 18 internal `/` links retargeted in one
  sed pass.
- **Marketing brand tokens are additive.** Interior surfaces keep
  `--v-primary` green; the landing references `--v-brand` etc. No interior
  page consumes the new tokens.
- **Marketing always-light.** `.bun-landing-root` re-declares the light
  tokens so the page reads correctly even when `[data-theme='dark']` is set
  on `<html>`. Interior pages still respond to the theme.
- **Mascot images via raw `<img>`** per the prompt's explicit instruction.
  `next/Image` would buy little for these small static PNGs (and is
  particularly poor fit for `LiveMascot`'s pose swap cadence). Each `<img>`
  use is paired with a single-line `eslint-disable @next/next/no-img-element`
  comment.
- **No `Math.random()` in render.** Sparkle positions, blob offsets, and
  marquee word lists all live in module-scope `const` arrays so reveals are
  stable across re-renders.
- **`color-mix(in srgb, var(--v-X) NN%, transparent)`** replaces the
  source's `${color}50` 8-digit-hex pattern for alpha-tinted shadows /
  eyebrow chips. CSS variables can't compose into 8-digit hex, and
  `color-mix` is the modern idiomatic equivalent.
- **Section IDs are English slugs** (`#features` / `#workflows` / `#why` /
  `#faq`), not the design source's raw Vietnamese strings.
- **`PulseButton` is a `<Link>`** routing to `/login`. The project has no
  `/signup` route.
- **`Layers` was chosen for `cards`** since lucide has no exact "stacked
  cards" glyph; `CreditCard` is the alternative but feels payment-ish.
- **`Volume2` for `speaker`** — lucide's most line-art-flavored speaker icon
  matching the source's stroke-based aesthetic.
- **`--v-yellow-deep` (#e8b94a) for design's `V_C.yellow` (#ffc94a)** — close
  enough match without burning the speed-quiz `--v-yellow` reservation
  (CLAUDE.md §4.6).

## Deviations from prompt

- **No `Image` component for the landing** — the prompt allows either; chose
  raw `<img>` per its own explicit guidance + the rationale above.
- **`SpeechBubble` used 2× not 3×** — the prompt mentions hero + FAQ-aside +
  CTA, but README §9 shows the FAQ aside is a mascot + paragraph only (no
  bubble). Component is built to support all 4 tail directions anyway, so
  re-using it later is a one-prop change.
- **Footer link `<a href="#">`** instead of real routes — the marketing
  pages (`/privacy`, `/terms`, `/changelog`, `/blog`) don't exist yet.
  Flagged below as a follow-up.

## Verification

- `npx tsc --noEmit` → clean after each phase.
- ⚠️ **NOT verified manually in a browser.** Per CLAUDE.md §10 #11, I did
  not run `npm run dev` / `npm run build` automatically. Visual fidelity
  (76px H1 at 1280px viewport, floating mock-card positions, sparkle
  twinkles overlapping the right side of the hero, workflow step-row
  overflow on narrow viewports, speech-bubble tail alignment) needs an
  eyeball pass.
- Acceptance criteria from the prompt that compile to inspectable code:
  Phase 0 ✓ (route split, tokens, fonts, keyframes, assets), Phase 1 ✓ (Nav
  + Hero + Marquee), Phase 2 ✓ (5 sections + workflow detail), Phase 3 ✓
  (FAQ + CTA + Footer).

## Follow-ups / known issues

- **Mobile responsive deferred** per README "desktop-first, 1280px target".
  At narrow viewports today the hero will horizontally overflow, the
  floating mock cards will overlap the heading, and the workflow step row
  will horizontally scroll. Add breakpoints as a follow-up task.
- **Footer link placeholders.** Wire `Tính năng` / `Workflow mẫu` /
  `Roadmap` / `Changelog` / etc. once those routes exist. They currently
  point to `#`.
- **`color-mix` browser support.** Safari 16.4+ / Chrome 111+ / Firefox 113+.
  No fallback shipped — verify against the project's target browser matrix
  (none documented in repo; defer to user judgement).
- **`@next/next/no-img-element` warnings.** ~12 mascot `<img>` uses each
  carry a one-line eslint-disable. If the lint baseline gets stricter, the
  cleaner option is a blanket disable for `src/components/landing/**`.
- **No analytics / telemetry**, per "Out of scope".
- **Speech bubble tail geometry.** Built with a single rotated 12×12 square;
  looks correct in code but the four-direction tail variants should be
  eyeballed once the page renders. If `tail='bottom'` (used in CTA) drifts
  visually, the `tailOffset` prop is the lever.
- **`bun-streak-pop` cells in `MockStreakCard`** fire once on mount with a
  staggered delay. After page load they hold the filled state; if you
  wanted them to pop on scroll-into-view instead, wrap the card in
  `<Reveal>` and gate the animation on `visible`.
- **`Icon` wrapper currently warns silently** when an unknown name is
  passed (returns `null`). For development, you could escalate to a console
  warning — but I left it silent to avoid noise in production logs.
