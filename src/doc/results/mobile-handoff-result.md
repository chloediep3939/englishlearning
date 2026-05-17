# Mobile handoff — assemble mobile design (result)

Date: 2026-05-16

## Scope

Assembled the entire mobile design from `design/design_handoff_bun_mobile/` into the codebase as **separate mobile components** (per user choice), gated alongside the existing desktop UI by viewport: Tailwind `md:hidden` for mobile, `hidden md:block` for desktop. Covers all four parts of the handoff — landing page, app shell + tab bar, screens 1–5, screens 6–10.

## Files changed

### New: mobile landing (11 sections + composer)

- `src/components/landing-mobile/BunLandingMobile.tsx` — composes the 11 sections, wrapped with `.bun-landing-root` so existing keyframes (`v-bun-march`, `v-bun-shimmer-text`, `v-bun-pulse-ring`) apply.
- `src/components/landing-mobile/MNav.tsx` — sticky top nav with hamburger menu that morphs to X.
- `src/components/landing-mobile/MHero.tsx` — centered hero with `LiveMascot`, animated H1, stacked CTAs.
- `src/components/landing-mobile/MMarquee.tsx` — word ticker (re-uses `.bun-marquee` + `.bun-marquee-track` CSS).
- `src/components/landing-mobile/MValueProps.tsx` — 3 stacked value-prop cards with mascots.
- `src/components/landing-mobile/MFeatures.tsx` — 2×4 features grid.
- `src/components/landing-mobile/MWorkflows.tsx` — 3 persona chapters (Chloe / Minh / An) with horizontal-scroll step rows.
- `src/components/landing-mobile/MScreenshots.tsx` — horizontal-scroll snap strip; re-uses `MockDashboard` / `MockFlashcard` / `MockReveal`.
- `src/components/landing-mobile/MWhy.tsx` — 4 reasons rows.
- `src/components/landing-mobile/MFaq.tsx` — 5-item accordion (custom; doesn't re-use `FaqItem` because the chrome diverges enough).
- `src/components/landing-mobile/MCTA.tsx` — gradient CTA block with `bun-celebrate` mascot.
- `src/components/landing-mobile/MFooter.tsx` — 2-column footer.

### New: mobile app shell

- `src/components/app-mobile/_shell/MStatusBar.tsx` — iOS-style status bar (decorative, `aria-hidden`).
- `src/components/app-mobile/_shell/MTabBar.tsx` — sticky 5-tab bar with center FAB. Tabs link to existing routes (`/dashboard`, `/review`, `/add`, `/decks`, `/settings`). Adds `env(safe-area-inset-bottom)` padding for iOS PWA.
- `src/components/app-mobile/_shell/MAppShell.tsx` — `MStatusBar + <main> + MTabBar`. Takes a `TabKey` prop to highlight the current tab.
- `src/components/app-mobile/_shell/MStatPill.tsx` — small inline stat pill (streak / gems / hearts).

### New: mobile app screens

Screens 1–5:

- `src/components/app-mobile/screens/MDashboard.tsx`
- `src/components/app-mobile/screens/MFlashcardTyping.tsx`
- `src/components/app-mobile/screens/MReveal.tsx`
- `src/components/app-mobile/screens/MDecksList.tsx`
- `src/components/app-mobile/screens/MAddWord.tsx`

Screens 6–10:

- `src/components/app-mobile/screens/MDictionary.tsx`
- `src/components/app-mobile/screens/MReadAloud.tsx`
- `src/components/app-mobile/screens/MSentence.tsx`
- `src/components/app-mobile/screens/MArticle.tsx`
- `src/components/app-mobile/screens/MSettings.tsx`

All screens are **presentational shells** with sample data baked in (matching the design source). The real data wiring (DB rows, AI calls, session state) is intentionally **not** plumbed through to the mobile screens yet — that's a follow-up per screen.

### Modified

- `src/components/landing/shared/Icon.tsx` — added 9 new lucide mappings used by mobile screens: `arrowLeft`, `bell`, `folder`, `headphones`, `heart`, `home`, `library` (Languages), `search`, `settings`. These are additive — no existing mappings changed.
- `src/app/layout.tsx` — sidebar wrapped in `<div className="hidden md:block">` so it disappears on mobile; main padding made responsive (`md:pt-5 md:px-8 md:pb-6`) so mobile content can render edge-to-edge.
- `src/app/globals.css` — appended a `@media (prefers-reduced-motion: reduce)` rule that flattens animation/transition durations across the app.
- `src/app/page.tsx` — renders desktop `BunLanding` (`hidden md:block`) + `BunLandingMobile` (`md:hidden`).
- `src/app/dashboard/page.tsx` — desktop branch wrapped, mobile branch renders `<MDashboard />`. The existing inline `display: 'flex'` on the desktop root was preserved by adding an extra wrapping div.
- `src/app/decks/page.tsx` — wired `<MDecksList />`.
- `src/app/add/page.tsx` — wired `<MAddWord />`.
- `src/app/review/page.tsx` — wired `<MFlashcardTyping />`.
- `src/app/settings/page.tsx` — wired `<MSettings />`.
- `src/app/dictionary/page.tsx` — wired `<MDictionary />`.
- `src/app/pronounce/page.tsx` — wired `<MReadAloud />`.
- `src/app/sentence/page.tsx` — wired `<MSentence />`.
- `src/app/passage/page.tsx` — wired `<MArticle />`.

## Key decisions

1. **CSS-based responsive switching, not JS.** Both desktop and mobile components render in the SSR HTML; Tailwind's `md:hidden` / `hidden md:block` (and the layout's responsive sidebar) hide one tree. No hydration flicker, no `window` access during render. Trade-off: both trees ship to the client. The mobile trees are presentational and small (no data subscriptions), so the cost is acceptable.

2. **Inline `style={{...}}` matching the design source.** Per the desktop landing precedent (`src/components/landing/*`), I used inline styles + V tokens (`var(--v-brand)` etc.) so the implementation tracks the design 1:1. Recipe classes (`.v-card`, `.v-btn-primary`) were skipped because they don't match the mobile-specific shadow/border specs in the handoff.

3. **Reused existing primitives** (`landing/shared/`): `Icon`, `BlobBg`, `LiveMascot`, `Sparkles`, `Reveal`, `MockDashboard` / `MockFlashcard` / `MockReveal`. The `Icon` module was extended with 9 new mappings rather than forked — per CLAUDE.md §2.

4. **Sample data baked into mobile screens.** The user asked to "ráp" (assemble) the design, not to migrate every flow. So mobile screens use mock data taken straight from the handoff (e.g., `preferential` as the example word, 4 sample decks). Plumbing real D1 data into each mobile screen is a follow-up that can happen per-route without re-touching the shell.

5. **Token mapping** (handoff → repo):
   - `BUN_BLUE` → `var(--v-brand)`
   - `BUN_BLUE_SOFT` → `var(--v-brand-soft)`
   - `BUN_BLUE_DARK` → `var(--v-brand-dark)`
   - `V.primary` / `V_C.*` → `var(--v-*)`
   - `V.shadow*` → `var(--v-shadow-{sm,md,lg})`
   - `MASCOT.happy` → `/mascot/ngoc-happy.png` (already in `public/`)

6. **Color stops via `color-mix(in srgb, …)`.** The design uses suffix-hex opacity (e.g., `${color}55` = 33% alpha). I translated those to `color-mix(in srgb, var(--v-brand) 33%, transparent)` so the tokens stay theme-able. ⚠️ Requires Safari 16.4+, Chrome 111+, Firefox 113+.

7. **Layout main padding made class-based, not inline.** I removed the inline `padding: '20px 32px 24px'` from the layout's `<main>` and replaced it with Tailwind responsive classes (`md:pt-5 md:px-8 md:pb-6`). On mobile this collapses to 0 padding so `MAppShell` can render edge-to-edge.

## Deviations from prompt

- **`SpeechBubble` not re-used** for the flashcard typing bubble. The existing `landing/shared/SpeechBubble` has a fixed white background; the mobile design uses `BUN_BLUE_SOFT` with a colored border and a specific tail position. Forking inline kept the code small; if a third caller appears, this is the third instance and should be extracted per CLAUDE.md §2.1.
- **`FaqItem` not re-used** for mobile FAQ. The mobile FAQ has a `Q1` badge prefix that the desktop component doesn't render. Forked rather than adding a variant flag (anti-pattern per §2.1).
- **`/review` mobile screen shows `MFlashcardTyping` only.** The handoff also defines `MReveal` (post-answer state), but in this assembly pass the route renders `MFlashcardTyping` as the entry state. Wiring the typing→reveal→rate session flow on mobile is a separate task (`MReveal` is built and available — it just isn't currently routed).
- **No tab bar on `/passage` and other non-tab routes.** The mobile screens currently use `active="review"` for both `/pronounce`, `/sentence`, and `/passage` (which the design groups under the Review tab). That matches the handoff but means the FAB doesn't navigate elsewhere from those screens — the user goes "back" via the inline `arrowLeft` button in each screen header.

## Verification

- TypeScript: **not run** — repo has no `typecheck` / `tsc` npm script and CLAUDE.md §10.11 forbids running `npm run build` automatically.
- Lint: repo has no ESLint per CLAUDE.md §1.
- Manual smoke: **not tested in browser.** ⚠️ I did not start `npm run dev` (CLAUDE.md §10.11). The user should run `npm run dev` and load the app on a mobile-width viewport to validate the layout and animations.
- IDE diagnostics during editing flagged a transient "fragment has no closing tag" while in the middle of a two-step edit; both ends were closed and the diagnostics cleared after the second edit.

What I'm uncertain about:

- ⚠️ The mobile `<main>` padding collapse depends on inline `flex: 1, overflow: 'auto'` not conflicting with the Tailwind `flex-1 overflow-auto` classes — Tailwind v4 may have specificity differences, please verify visually.
- ⚠️ `color-mix()` works in modern evergreen browsers but the design source's blanket `${color}NN` hex-suffix pattern is more portable. If you target older mobile browsers (iOS Safari < 16.4), swap to explicit `rgba()` values.
- ⚠️ The Tailwind class `md:hidden` etc. assume the default `md` breakpoint (768px). The handoff designs at 402px; the 402–767px gap renders mobile correctly, but verify on tablet/landscape phone.
- ⚠️ Mobile components reference assets the repo already ships (`/mascot/*.png`). I did not duplicate the assets from `design/.../source/assets/mascot/` because `public/mascot/` already contains all 12 PNGs.

## Follow-ups / known issues

1. **Wire real data into mobile screens.** Each mobile screen currently renders sample data. The desktop pages already fetch real data; pass it down to the mobile component (e.g., `<MDashboard userName={user.name} streak={streak} … />`) per route.
2. **`MReveal` mobile screen is built but not routed.** Connect it to the `/review` flow so that after rating a card, the user sees the reveal state on mobile.
3. **`MFlashcardTyping` answer state.** The input is local state only — needs hookup to the real flashcard session reducer (`SessionFlow`).
4. **Tab bar active state per route.** Currently each screen hard-codes `active="..."`. If a tab is reached via a deeper route (e.g., `/decks/[id]`), the tab bar still highlights "Bộ từ" because we set it inline. Consider deriving from `usePathname()` if it gets out of sync.
5. **Settings toggles read-only.** The `MSettings` screen renders toggle/value rows from static data. Wire to `userSettingsDb` + the existing `apiJson` helpers.
6. **`/cloze`, `/compose`, `/study`, `/speed`, `/stats` not yet mobile-wired.** The handoff doesn't include explicit mobile mocks for these — they will fall back to the desktop layout on mobile (with the sidebar hidden, edge-to-edge). Decide whether to commission mobile screens for these later.
7. **Accent palette in `bun-celebrate` shadow** uses raw `rgba()` for the navy drop-shadow — those are the design source's literal values. Consider tokenizing if a dark-CTA pattern appears elsewhere.
8. **Author note:** the result file follows §8.5 of `CLAUDE.md` (English, structured). Vietnamese UI strings inside the mobile components match the handoff verbatim — do not reword without checking the handoff.
