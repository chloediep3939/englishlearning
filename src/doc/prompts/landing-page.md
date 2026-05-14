Date: 2026-05-14

# Landing page — Bún marketing site (`/`)

## Scope

Implement the marketing landing page described in the design handoff (`README.md` + `source/*.jsx`) into the EnglishLearning codebase. Route: `/` for unauthenticated visitors; authenticated users get redirected to their app home.

## Required reading BEFORE coding

1. **`README.md`** — the design handoff. Treat as authoritative for visual design, copy, colors, spacing, animation timing.
2. **`source/landing-bun-parts1.jsx`, `parts2.jsx`, `parts3.jsx`, `landing-bun-anim.jsx`, `shared.jsx`, `direction-v2.jsx`** — the prototype JSX. When README is ambiguous, JSX wins. Read all of them before writing any code.
3. **`CLAUDE.md`** in this repo (especially §2, §4, §6, §8, §9) — project rules.
4. **`src/app/globals.css`** — existing `--v-*` tokens.
5. **`src/middleware.ts`** + the existing `/` route (likely `src/app/page.tsx`) — current auth flow.
6. **`src/components/common/Mascot.tsx`** — the existing mascot component (do NOT modify; landing renders images directly).

User will have `README.md` + `source/` folder somewhere accessible (probably Downloads). Confirm path with user if not obvious. Do not start without seeing the JSX files.

## Doc workflow (CLAUDE.md §8)

This prompt qualifies as "long + multi-phase + ≥3 files" → save it to docs.

- **Before starting**: copy this entire prompt verbatim to `src/doc/prompts/landing-page.md` (add a `Date: YYYY-MM-DD` header line at the top).
- **After Phase 3 completes**: write `src/doc/results/landing-page-result.md` per CLAUDE.md §8.5 (scope, files changed, key decisions, deviations, verification, follow-ups).

If `src/doc/prompts/` or `src/doc/results/` don't exist yet, create them.

## Constraints (CLAUDE.md compliance)

- **No new npm packages.** All animations are pure CSS keyframes + IntersectionObserver. Icons: use `lucide-react` where a clean match exists, otherwise port the inline SVG from source's `Icon` component (track the mapping in the result file).
- **Inline `style={{}}` with CSS variables, no Tailwind utility classes.** Existing project rule. The landing's source JSX already does this — copy the pattern.
- **All hex colors live as CSS variables.** Add new marketing tokens to `globals.css` (see Phase 0.2). Never hard-code `#3aa9e6` etc. in component files.
- **All landing components are client components** (`'use client'`) — they need state for hover/reveal/pose-cycle. The `/` page itself is a server component that does the auth-redirect check and renders the client landing.
- **File size ≤500 lines** per CLAUDE.md §2.2 — split into sub-components per the structures below.
- **No Server Actions, no new auth, no new DB tables, no new env vars.** Pure presentational page.
- **No data fetching.** CTAs are plain `<a href="/login">` (or `/signup` if it exists — verify which routes are present).

---

## Phase 0 — Prerequisites

These land FIRST in one commit set, before any sections. Get Phase 0 reviewed before continuing.

### 0.1 Routing & middleware

Current behavior (verify by reading the code): `/` likely redirects unauth → `/login`, auth → some home (e.g. `/dashboard` or `/overview`).

New behavior:
- **Unauthenticated** hitting `/` → render landing page.
- **Authenticated** hitting `/` → server-side redirect to existing app home (find which path by reading current `src/app/page.tsx` and surrounding routes).
- Add `/` to the public-paths allowlist in `src/middleware.ts` (alongside `/login`, `/api/auth/*`, etc.).

Replace contents of `src/app/page.tsx` (server component):
- Check auth via `verifyAuthToken` or the project's existing pattern (look at how `/login` page handles it).
- If authed → `redirect('/dashboard')` (or whichever is correct).
- If not → render `<BunLanding/>` (client component).

### 0.2 Marketing color tokens

Add to `:root` in `src/app/globals.css` (keep separate from interior palette — marketing is blue-branded, interior remains green):

```css
--v-brand: #3aa9e6;
--v-brand-soft: #e3f2fb;
--v-brand-dark: #1e87c0;
```

Use `var(--v-brand)` etc. in all landing components.

### 0.3 Lora font

Update the Google Fonts `<link>` in `src/app/layout.tsx` to include Lora:

```
family=Nunito:wght@400;600;700;800;900;1000&family=Lora:ital,wght@0,400;0,500;0,600;1,400;1,500;1,600&family=JetBrains+Mono:wght@400;500;600;700
```

Add to `globals.css`:

```css
--v-font-serif: 'Lora', Georgia, serif;
```

Used for italic emphasis on landing only (e.g., "kiểu bạn thích", "khác", "nhịp học") — don't replace existing `--v-font-head` / `--v-font-body`.

### 0.4 Animation keyframes

Read `source/landing-bun-anim.jsx` to get exact keyframe definitions (don't guess values). Add the following to `globals.css`, **prefixed `v-bun-`** to namespace (avoid colliding with existing `v-ngoc-bob` etc., which the interior app uses):

- `v-bun-float-slow` (card slow float)
- `v-bun-tilt-loop` (gentle tilt)
- `v-bun-wiggle` (hover shake)
- `v-bun-blob` (background blob drift)
- `v-bun-shimmer-text` (gradient text shimmer)
- `v-bun-pulse-ring` (CTA pulse ring)
- `v-bun-streak-pop` (streak cell entrance)
- `v-bun-march` (marquee scroll)
- `v-bun-caret` (text caret blink — if used)

For mascot bob/float, reuse existing `v-ngoc-bob` / `v-ngoc-float` if values match; otherwise add `v-bun-` aliases.

### 0.5 Mascot assets

The landing uses 5 new poses beyond what the app currently has. Copy from `source/assets/mascot/` to `public/mascot/` (keep the `bun-*` filenames — they're new poses, parallel to legacy `ngoc-*`):

- `bun-learn.png`
- `bun-flex.png`
- `bun-celebrate.png`
- `bun-dream.png`
- `bun-magic.png`

Verify existing `ngoc-idle.png`, `ngoc-happy.png`, `ngoc-blink.png` are present (used by hero + logo).

⚠️ Don't modify the existing `<Mascot>` component or rename legacy files. The landing renders mascot images directly via `<img src="/mascot/bun-X.png">` (fixed poses, not the variable system the app uses).

### 0.6 Phase 0 acceptance

- Build passes (`npm run build` or whatever the project uses — verify which from `package.json`; per CLAUDE.md §9 don't run automatically without confirmation; report the command instead).
- Visit `/` while logged out → see a placeholder (e.g. a `<div>Landing TODO</div>`) — no redirect.
- Visit `/` while logged in → redirected to app home as before.
- DevTools shows `--v-brand` etc. on `:root`.
- New mascot PNGs visible at `/mascot/bun-learn.png` etc.

**Stop and report Phase 0 done before continuing.**

---

## Phase 1 — Sections 1–3 (Nav + Hero + Marquee)

### Files

```
src/app/page.tsx                              ← Server: auth check + render <BunLanding/>
src/components/landing/BunLanding.tsx         ← Client: keyframe injection + section composition
src/components/landing/BunNav.tsx
src/components/landing/BunHero.tsx
src/components/landing/BunMarquee.tsx
src/components/landing/shared/Sparkles.tsx
src/components/landing/shared/BlobBg.tsx
src/components/landing/shared/LiveMascot.tsx  ← pose-cycle interval
src/components/landing/shared/SpeechBubble.tsx ← reused 3x — README §"Notes for the developer"
src/components/landing/shared/PulseButton.tsx ← primary CTA with pulse ring
src/components/landing/shared/useReveal.ts    ← IntersectionObserver hook
src/components/landing/shared/Reveal.tsx      ← wrapper that uses useReveal
src/components/landing/shared/HoverLift.tsx
src/components/landing/shared/Icon.tsx        ← inline SVG icons OR lucide map
src/components/landing/shared/MockStreakCard.tsx ← floating hero preview (left)
src/components/landing/shared/MockWordCard.tsx   ← floating hero preview (right)
```

### Section specs

Follow README §1, §2, §3 (Nav / Hero / Marquee) precisely. Cross-reference `source/landing-bun-parts1.jsx` for exact JSX structure, prop names, inline style values.

### Acceptance

- Nav sticky, blurred bg, logo + 4 nav links + login + primary CTA.
- Hero shows: pulsing pre-heading pill, `<LiveMascot>` cycling happy/blink every 1300ms with bob animation, blue halo behind, speech bubble tilting, 76px H1 with shimmering italic gradient on "kiểu bạn thích", 21px sub with blue underline on "thô", primary CTA with pulse ring + secondary CTA, trust row, 4 background blobs drifting, 8 sparkles twinkling, both floating mock cards (streak + word) tilted with slow float.
- Marquee scrolls left infinitely, pauses on hover, AI auto-fill anchor pill on left.

**Report Phase 1 done.**

---

## Phase 2 — Sections 4–8 (Value Props + Features + Workflows + Screenshots + Why)

### Files

```
src/components/landing/BunValueProps.tsx
src/components/landing/BunFeatures.tsx
src/components/landing/BunWorkflows.tsx
src/components/landing/BunScreenshots.tsx
src/components/landing/BunWhy.tsx
src/components/landing/shared/FeatureCard.tsx
src/components/landing/shared/WorkflowChapter.tsx
src/components/landing/shared/FootprintTrail.tsx
src/components/landing/shared/ScreenshotFrame.tsx
src/components/landing/shared/MockDashboard.tsx
src/components/landing/shared/MockFlashcard.tsx
src/components/landing/shared/MockReveal.tsx
```

### Notes

- **Workflows = the most important section per README.** Render all 3 personas (Chloe / Minh / An) with name, tagline, target badge, pull-quote, step row with `→` separators, outcome bar, footprint trail in margin. Reveal-on-scroll with stagger. Don't half-ass this section.
- **8 feature cards** — colored icon boxes, hover wiggle on icon, exact Vietnamese strings from README §5.
- **Mock screens are decorative** — README §7 explicitly says "do not implement them as fully interactive". Static SVG/DOM only.
- **Why-Bún rows** alternate `row` / `row-reverse`, lift on hover.

### Acceptance

Per README §4–§8. Build passes. Manually scroll through; reveals trigger; hovers work.

**Report Phase 2 done.**

---

## Phase 3 — Sections 9–11 (FAQ + CTA + Footer)

### Files

```
src/components/landing/BunFAQ.tsx
src/components/landing/BunCTA.tsx
src/components/landing/BunFooter.tsx
src/components/landing/shared/FaqItem.tsx
```

### Notes

- **FAQ**: 2-column grid `0.7fr 1.3fr`, left column sticky at top 90px with eyebrow + H2 + email line + `bun-dream` mascot. Right column: 5 accordion items; first item open by default. Plus icon rotates 45° → X on open. Max-height collapse transition 0.35s. Use the exact 5 Q&A pairs from README §9.
- **CTA**: blue-gradient block, radius 32, 8 corner sparkles, mascot `bun-celebrate` + speech bubble + H2 + sub + 2 CTAs.
- **Footer**: logo + paragraph + 3 link columns + bottom row with copyright + privacy/terms/version.

### Acceptance

All sections render. Click each FAQ item to expand/collapse. Hover all CTAs. Full page scroll feels right. Build passes.

**Report Phase 3 done + write `src/doc/results/landing-page-result.md`.**

---

## Out of scope

- Mobile responsive (desktop-first per README; deferred follow-up).
- `BunLanding_v2` (orange) / `BunLanding_v3` (green) variants — only V1 (blue).
- Real telemetry / analytics.
- New translation system — all UI strings hard-coded Vietnamese per README copy.
- Sign-up flow integration — CTAs link to existing `/login` (or `/signup` if present).
- Any modification to the existing `<Mascot>` component or interior app routes.

---

## Common pitfalls to avoid

- **Don't ship the source JSX as-is.** It's verbose prototype code with inline `MASCOT` paths and design-canvas wrappers. Re-implement cleanly per project conventions.
- **Don't put `Math.random()` into render** for sparkle positions etc. — pre-compute the array once at module load (or `useMemo([])`) so reveals are stable.
- **Don't import server-only modules** (`@/lib/db`, `@/lib/current-user`) into any `landing/` file. Auth check stays in the server `page.tsx`.
- **Don't make the landing depend on D1 binding** at all — should render fine even with no env vars set (it's pure presentation).
- **Footprint trail SVG** — careful with paw-print positioning; check source for the exact path data.
- **Speech bubble** — extract once into `shared/SpeechBubble.tsx`, use in hero + FAQ-aside + CTA (3 places per README).
- **Icons** — keep a single source of truth. Either port the `Icon` component fully, or build a `lucide` mapping that handles ALL icon names used. Don't mix in landing files.
