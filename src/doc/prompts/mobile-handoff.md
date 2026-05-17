# Mobile handoff — assemble mobile design

Date: 2026-05-15

## User prompt (verbatim, Vietnamese)

> trong phần /Users/blue/Desktop/english-learning/design/design_handoff_bun_mobile có chứa giao diện mobile, hãy ráp mobile giúp tôi

## Clarifying answers given by user

- **Approach**: Tạo component mobile riêng (separate mobile components per page; pick based on viewport).
- **Scope**: All four — Landing page mobile, Shell + Bottom Tab Bar, App screens 1–5, App screens 6–10.

## Source material

`/Users/blue/Desktop/english-learning/design/design_handoff_bun_mobile/`

- `README.md` — full spec (this is the canonical reference; ~550 lines).
- `source/landing-bun-mobile.jsx` — landing (Surface 1).
- `source/app-mobile.jsx` — shell + screens 1–5 (Surface 2 part 1).
- `source/app-mobile-extra.jsx` — screens 6–10 (Surface 2 part 2).
- `source/assets/mascot/*.png` — already mirrored into `public/mascot/`.

## Key reuse map (from CLAUDE.md §2)

Reuse from existing `src/components/landing/shared/`:

- `Icon` (lucide wrapper with design `name=` vocabulary)
- `BlobBg`, `LiveMascot`, `Reveal`, `Sparkles`
- `MockDashboard`, `MockFlashcard`, `MockReveal` (for the screenshots strip)
- `FaqItem`, `SpeechBubble`

Reuse existing V tokens in `globals.css`:

- `BUN_BLUE` → `var(--v-brand)` `#3aa9e6`
- `BUN_BLUE_SOFT` → `var(--v-brand-soft)` `#e3f2fb`
- `BUN_BLUE_DARK` → `var(--v-brand-dark)` `#1e87c0`
- `V_C.*` → `var(--v-*)` (orange, red, purple, pink, teal, yellow, blue, primary)

Reuse existing keyframes: `v-ngoc-bob`, `v-ngoc-float`, `v-sparkle`, `v-bun-blob`, `v-bun-pulse-ring`, `v-bun-shimmer-text`, `v-bun-march`, `v-bun-tilt-loop`.

## Plan

1. **`src/components/landing-mobile/`** — 11 sections mirroring §3 of the README, plus a `BunLandingMobile` composer.
2. **`src/components/app-mobile/`**:
   - `_shell/` — `MAppShell`, `MStatusBar`, `MTabBar`, `MStatPill`
   - `screens/` — 10 mobile screens (Dashboard, FlashcardTyping, Reveal, DecksList, AddWord, Dictionary, ReadAloud, Sentence, Article, Settings)
3. **Wiring**: each affected route renders both desktop + mobile components, gated with Tailwind `hidden md:block` / `md:hidden`. SSR-safe.
4. **Accessibility**: `prefers-reduced-motion` respected; `aria-hidden` on mascots; safe-area inset on tab bar.
5. **Note**: mobile app screens for now are *presentational shells* matching the design — they wrap the same data flow as the desktop equivalents (no new data dependencies).
