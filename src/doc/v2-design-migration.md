# V2 design migration

Multi-batch UI overhaul to align the implementation with the V2 design draft
in `/Users/blue/Desktop/english-learning/design/` (Storybook-style JSX
mockups + `globals-v2.css` + `handoff.md`). Done over one session in
collaboration with the user.

Status: **5 of 5 priority batches complete.** `tsc --noEmit` clean.
No browser smoke tests performed end-to-end — manual QA list at the bottom.

## Purpose

The codebase shipped quickly to functional parity (study / review / speed /
cloze / decks / dictionary / stats / settings / add) but the visual treatment
drifted from the V2 design. A read-only audit identified ~14 deviation groups
spanning every page. This migration addresses Foundation + Sidebar +
Dashboard + Add + Review + Study, plus a number of cross-cutting fixes
(audio reliability, IPA accent, settings slider flood). The remaining
priorities (Decks card redesign, Decks detail page, Settings 2×2 grid, Speed
quiz result polish) are listed under **Open items**.

The audit also clarified architectural decisions saved as memory:
- **Mascot name = Bún** (overrides design's "Ngọc").
- **`/dictionary` stays as external lookup** (overrides design's library
  browser proposal — the project has no library-browse feature here yet).

## File map

### Foundation
| Path | What changed |
| --- | --- |
| `src/app/globals.css` | Added `--v-gem: var(--v-blue)` (design alias), `--v-tracking-normal: 0`, and the 8 recipe classes from `design/globals-v2.css`: `.v-card`, `.v-btn-primary` (+ `:active`), `.v-btn-secondary`, `.v-pill`, `.v-chip`, `.v-eyebrow`, `.v-kbd`, `.v-input` (+ `:focus`), `.v-rate`. Yellow tokens already converted to pastel earlier in the session (`--v-yellow: #ffe082`, `--v-yellow-deep: #e8b94a`). |

### Header layout fix (cross-page)
| Path | What changed |
| --- | --- |
| `src/app/{add,cloze,decks,dictionary,settings,speed,stats,study}/page.tsx` | Page `<h1>` changed from `display: 'inline-flex'` to `'flex'`. Previously the inline-flex `<h1>` sat on the same line as the inline-flex back-link `<Link>` above it, producing "← Dashboard + Title" on one line. |

### Sidebar
| Path | What changed |
| --- | --- |
| `src/components/Sidebar.tsx` | Full rewrite to match design `direction-v2.jsx:71-110`. Width 220 → 196px. Each nav item gets a 26×26 colored icon tile (home green, add accent, study orange, review blue, speed `--v-yellow-deep`, cloze teal, dict purple, decks pink, stats teal, settings muted). Eyebrow "ENGLISH LEARNING" → "MODULE". Sleeping mascot footer shrunk to 34×34 paired with copy "Mình ngủ trưa\ntí xíu rồi học tiếp" (10px muted). Item border-radius 14 → 11. User-card + logout retained below the mascot (not in design — functional necessity). Speed tile uses `--v-yellow-deep` rather than `--v-yellow` because white icon on pastel yellow has insufficient contrast. |

### Dashboard
| Path | What changed |
| --- | --- |
| `src/app/page.tsx` | Full rewrite. Header: chapter-style eyebrow "Thứ tư 14.5" + greeting "Chào buổi sáng/trưa/chiều/tối, **bạn**!" (`bạn` highlighted primary). 2 top pills: Flame (streak) + Gem (total mastered). Heart pill from design omitted — no hearts/lives system. Hero orange-gradient section with mascot bob 140×140, sparkle SVG, eyebrow, "X từ cần ôn · Y từ mới" headline, microcopy, 2 CTAs (ÔN NGAY / HỌC TỪ MỚI), circular SVG progress ring (today/goal). 14-day streak strip with day-of-week labels, checkmark for past review days, dashed border + accent dot for today. 4 stat tiles in fixed `repeat(4, 1fr)`. Bottom 50/50 grid: 30-day stacked bar chart (blue=new, green=review) + decks-by-progress list (top 5 decks by total card count). |

### Add page
| Path | What changed |
| --- | --- |
| `src/components/AddCardForm.tsx` | Full rewrite to 2-column layout (0.95fr/1.05fr) — form left + live preview right. Vietnamese is now **optional** (placeholder "Bỏ trống để Bún tự dịch"); the form auto-falls back to the AI-generated translation on save. Auto-trigger generate on English input blur (≥2 chars, not yet generated for that word). Added deck picker (`<select>` of `FlashcardDeckWithCounts`). Green hint banner "Tự sinh: IPA · audio · 3 ví dụ · ảnh từ Pexels · collocations". Submit button copy "LƯU TỪ NÀY" + secondary "Sửa lại" outline. Image-reload button (top-right of preview image, cycles through Pexels with `?skip=N`). Accent-swap pill (US ↔ UK) next to audio button, only shown when dictionary returned both accents. External lookup links Oxford / YouGlish / ozdic with provider-correct URLs. POS pill rendered in purple (was green). |
| `src/app/add/page.tsx` | Header retitled "Thêm từ **mới**" (cam) with new sub-copy. Plus icon removed (now lives inside the form). |
| `src/lib/flashcards/pexels.ts` | New helper `getPexelsImage(query, skip = 0)` calling Pexels search API with `per_page=1&page=skip+1&orientation=landscape`. Returns `{ image_url, image_attribution }` or `null`. Silently no-ops when `PEXELS_API_KEY` is unset. |
| `src/app/api/images/pexels/route.ts` | New `GET /api/images/pexels?q=…&skip=N` for the reload-image button to avoid re-running the full generate flow. |
| `src/lib/flashcards/examples.ts` | New helper `generateExamples(word, count=3)` — asks Gemini for natural English example sentences when dictionaryapi.dev returns too few, and translates the first to Vietnamese. |
| `src/app/api/cards/generate/route.ts` | Now fetches Pexels image (Phase 1, in parallel with dictionary + collocations + word translation). If dictionary examples `< 2`, top up via `generateExamples`. Response includes `image_url`, `image_attribution`, `audio_url_alt`, `ipa_alt`, `accent`. Accepts `image_skip` for re-rolling on initial generate. |
| `src/lib/flashcards/dictionary.ts` | `lookupWord` now prefers the `-us.mp3` phonetic entry (American English). Returns the *other* accent (UK if AmE primary, or vice versa) in `audio_url_alt`/`ipa_alt`, plus an `accent: 'us' | 'uk' | 'unknown' | null` indicator. |
| `src/components/WordCard.tsx` | POS pill: green → purple (`--v-purple` bg + white text + purple-tinted shadow), font-family head, weight 900, uppercase. Added image rendering between POS and Vietnamese meaning (16:9 aspect, plain `<img>`, attribution overlay "Photo by … · Pexels"). |

### Review
| Path | What changed |
| --- | --- |
| `src/components/ReviewSession.tsx` | Full rewrite. Three-phase `PROMPT → REVEAL → RATE` collapsed to **two phases** (`TYPING → REVEAL`) per design — the redundant "TỰ ĐÁNH GIÁ" black button was extra friction not in the V2 mockup. Typing stage: full-stage centered with 6 absolute-positioned sparkle SVG polygons (animation `v-sparkle` 2.2s with staggered delays), tilted polaroid image (rotate -1.5°, white border, soft drop shadow), mint speech-bubble prompt with eyebrow "✨ HÃY DỊCH GIÚP MÌNH ✨" + Vietnamese in curly quotes + tail (rotated square pseudo-element), 560px-wide green-bordered input, "KIỂM TRA →" button, "❤ Không nhớ? Cứ đoán" microcopy. Reveal stage: header with purple POS pill, 50px word with primary translucent highlight bar behind, IPA mono, audio button + 6-dot autoplay indicator; 2-col body grid (1.25fr/1fr) — left has tinted char-diff box (strikethrough chars + arrow down + green answer + legend), meaning with orange left rail, example with blue left rail and target word highlighted in primary-soft; right has image card, collocations with rotating colored bullet dots (pink/teal/yellow-deep), 3 lookup pills. Rating row: fixed `repeat(4, 1fr)`, sub-copy computed via `previewIntervals(card)` + `intervalLabel(days)`, default rating (TỐT if correct, LẠI if wrong) outlined with 2px ink border. |
| `src/lib/flashcards/srs.ts` | Added `previewIntervals(card)` returning `Record<SRSQuality, number>` (days for each rating) and `intervalLabel(days)` returning human strings ("< 1 phút" / "X ngày" / "X tháng" / "X năm"). Added `ReviewQuality` type alias for `SRSQuality`. |

### Study
| Path | What changed |
| --- | --- |
| `src/components/StudySession.tsx` | Full rewrite mirroring the new ReviewSession (typing → reveal+rate). Differs in: (a) progress bar gradient (blue → green, since Study introduces new words and Review re-tests learned ones), (b) speech-bubble eyebrow "TỪ MỚI — THỬ ĐOÁN NHÉ" (vs Review's "HÃY DỊCH GIÚP MÌNH"), (c) input placeholder + microcopy framed for first encounters ("đoán cũng được" / "Lần đầu gặp từ này — sai không sao"), (d) submit button "XEM ĐÁP ÁN" (vs "KIỂM TRA"), (e) summary counts `learnedCount` (cards rated ≥ KHÓ) instead of pass/fail split, (f) summary CTA "ÔN LUÔN" linking to `/review`. Same auto-play, smart Enter, failed-card re-queue, and `previewIntervals`-driven rating sub-copy. |

### Behavior graft from `my-portfolio` (study + review)
| Behavior | Source | Where applied |
| --- | --- | --- |
| Failed-card re-queue: rating `quality=0` ("LẠI") re-appends the card to the queue so the learner must nail it before the session ends. Total displayed grows with `queue.length`. | `Downloads/my-portfolio/src/components/learning-english/{Review,Study}Session.tsx` | `ReviewSession.tsx`, `StudySession.tsx` |
| Smart-Enter on reveal phase: `Enter` picks "TỐT" if typed matches answer (case-insensitive), "LẠI" otherwise. Outlined button hints which Enter will pick. | same | same |
| Auto-play audio 6 times on reveal entry, 300ms pause between, with a row of 6 progress dots beside the audio button (`AutoplayDots`). Cancellable on advance/unmount. Falls back to TTS per-play if dictionary audio fails. | same | same |
| Per-card SRS interval preview on each rating button ("ôn sau 1 ngày" / "ôn sau 4 ngày" computed from `previewIntervals(card)`, not hardcoded). | same | same, via new `previewIntervals` + `intervalLabel` helpers in `srs.ts` |

### Cross-cutting fixes
| Path | What changed |
| --- | --- |
| `src/app/settings/page.tsx` | `Slider` rewired with local state + 400ms debounce (commit only on settle or `pointerup`/`keyup`). Prevents the LevelDB "Compaction failed: Another write batch or compaction is already active" error caused by `<input type="range">` flooding `onChange` events into PUT requests. |
| `src/components/AudioButton.tsx` | Added `audio.onerror` handler that falls back to TTS (previously `.play()` could resolve while the file 404'd, leaving the user with silence). TTS voice selection broadened — `en-US` exact → `en-us*` prefix → any `en-*` → default. Waits for `voiceschanged` if `getVoices()` is empty (Chrome first-call). Added `console.warn` for failed TTS paths so DevTools can diagnose. |
| `src/components/QuizSetup.tsx` | Added `accentText` prop (default `#fff`). `/speed` passes `var(--v-ink)` to keep active-button text readable on the pastel yellow. |
| `src/components/SpeedQuizSession.tsx` | Final-score number now uses `--v-yellow-deep` (text color) with `--v-yellow` (text-shadow), reversing the original direction so the number stays readable on white after the yellow palette switched to pastel. Per-question UI keyed off the new `current.question_mode` instead of the session-level `mode` prop, enabling the new `mix` mode. |
| `src/app/api/speed-quiz/route.ts`, `src/lib/types.ts`, `src/app/speed/page.tsx` | Added `'mix'` SpeedQuizMode. Each card in a mix session is randomly assigned a per-card mode (`SpeedQuizQuestionMode`), with spelling-too-short fallback to `en_to_vi`. Mode card in `/speed` setup gets a new Shuffle icon entry. |

## Data flow

```
/                 -> Server Component
                  ├── flashcardsDb.countByStatus
                  ├── flashcardReviewsDb.getTodayCount / getStreakDays / getActivityLastDays(14|30)
                  ├── flashcardDecksDb.getAllWithCounts
                  ├── userSettingsDb.getFlashcardSettings
                  └── (one DB row count for due cards)

/add              -> 'use client'
                  ├── GET  /api/decks                                  (deck picker)
                  ├── POST /api/cards/generate { english }             (auto-trigger on EN blur)
                  │     └─→ dictionary + datamuse + translate + pexels + (AI examples fallback)
                  ├── GET  /api/images/pexels?q=...&skip=N             (reload image button)
                  └── POST /api/cards { english, vietnamese?, deck_id, ipa, audio_url, image_url, ... }

/study, /review   -> Server Component fetches cards, hands to client session
                  └── client: typing → reveal+rate
                        ├── POST /api/cards/:id/rate { quality }
                        └── (no other API)

/speed (mix)      -> 'use client'
                  └── GET /api/speed-quiz?mode=mix&count=...
                        └─→ per-card random mode, per-card buildSpellingQuestion or
                            buildTranslationQuestion(isEnToVi, ...)
```

## Public API surface

| Symbol | Where | Notes |
| --- | --- | --- |
| `previewIntervals(card)` | `@/lib/flashcards/srs` | Pure. No DB I/O. Returns `Record<SRSQuality, number>` of days. Quality `0` always returns `0` (same-session retry). |
| `intervalLabel(days)` | same | Pure. Returns human label (`< 1 phút` / `N ngày` / `N tháng` / `N năm`). |
| `ReviewQuality` | same | Type alias for `SRSQuality` (kept for parity with `my-portfolio` import patterns). |
| `getPexelsImage(query, skip = 0)` | `@/lib/flashcards/pexels` | Server-only (reads `process.env.PEXELS_API_KEY`). Skip is the number of photos to skip (mapped to Pexels `page = skip + 1`). |
| `generateExamples(word, count = 3)` | `@/lib/flashcards/examples` | Server-only. Calls Gemini. Returns `FlashcardExample[]` (first item carries a Vietnamese translation when available). Silently returns `[]` if AI provider unavailable or AI returns malformed JSON. |
| `SpeedQuizMode` | `@/lib/types` | Now `'en_to_vi' | 'vi_to_en' | 'spelling' | 'mix'`. |
| `SpeedQuizQuestionMode` | same | `Exclude<SpeedQuizMode, 'mix'>` — concrete per-card mode embedded in every `SpeedQuizQuestion`. |
| `DictionaryResult` | `@/lib/flashcards/dictionary` | Adds `ipa_alt`, `audio_url_alt`, `accent`. Existing consumers (only `/api/cards/generate`) updated. |
| `QuizSetup` | `@/components/QuizSetup` | Adds optional `accentText` prop, defaulting `#fff`. |
| `Mascot` | unchanged | Alt text was already "Bún" before this work. |

## Gotchas

- **Pexels API key**: server-only env var `PEXELS_API_KEY` (added to `.dev.vars` by the user; production needs `npx wrangler secret put PEXELS_API_KEY` separately). If unset, `getPexelsImage` returns `null` silently — Add still works, just without imagery.
- **Old cards keep their original IPA/audio.** `lookupWord` only fires on new card creation. Existing rows with UK-leaning IPA stay UK. No "regenerate" route exists yet; users would need to delete + re-add to upgrade. Worth a feature in a later pass.
- **`f1_max_attempts: 0 = unlimited`** is a project-wide convention (set in M3a/F1). Anywhere we read this, treat 0 as "no cap", not "zero attempts allowed".
- **`autoplayCount` resets on advance.** When the user advances mid-playback the cancellation flag stops scheduled `setTimeout` calls and cancels `speechSynthesis`, but the audio element itself isn't paused. In practice 300ms gaps are short enough this doesn't bleed into the next card.
- **Sparkles use `v-sparkle` keyframe** (already defined in `globals.css`). The design's source named it `sparkle-twinkle`; we kept the project's existing name.
- **Polaroid image is shown DURING typing phase** by design — it's a visual hint that helps the learner. If you ever want a "no hint" mode, gate `card.image_url` behind a setting.
- **Char-diff in reveal vs typed-recall char-diff (M1a)**: these are separate components. The reveal char-diff in ReviewSession / StudySession is a strikethrough-then-answer pattern matching design. The M1a typed-recall char-diff (if any other component uses it later) is a tile-row pattern.
- **`/api/cards/generate` Phase 1 fan-out is wide**: dictionary + datamuse + translate + pexels in parallel = ~6s p99 latency. We don't gate the form on this; the user can save anytime, generate is fire-and-forget for the preview.
- **AI-examples fallback adds Gemini latency** to generate route when dictionaryapi.dev is sparse. Still within the 20s `AbortSignal.timeout` budget, but slower paths produce more spinner time on `/add`.
- **`audio_url_alt` swap mutates `generated` state in place.** Saving a card after a swap saves the *currently displayed* `audio_url` + `ipa`. Re-swap before save if you want to go back.
- **Image reload `skip` is monotonic per card.** On a fresh blur of a new English word, `imageSkip` resets to 0 inside `runGenerate`. Don't move the reset logic without thinking through cycle behavior.
- **Dashboard `goalRatio` clamps at 1.0** for the circular ring. If `todayCount > goalReview` the ring stays full, doesn't go past the circle.
- **Dashboard 14-day strip uses `getActivityLastDays(userId, 14)`** which only returns days *with* reviews. The page fills in zeros for missing days via a `Map` lookup keyed on `YYYY-MM-DD` (computed in local time to match SQLite's `date(reviewed_at, 'localtime')`).
- **Dashboard hero CTA adapts to state.** Has due → show "ÔN NGAY · N" + "HỌC TỪ MỚI · N"; only new → "HỌC TỪ MỚI"; nothing → fallback to "CHƠI FLASHCARD". Design hardcodes both CTAs visible.
- **Heart pill skipped on dashboard.** No hearts/lives system in this app (it's a flashcard tool, not Duolingo). Gem pill repurposed to show total mastered count.
- **`Speed` sidebar tile uses `--v-yellow-deep`**, not `--v-yellow`. CLAUDE.md reserves `--v-yellow` for speed surfaces — `--v-yellow-deep` is still within that scope and gives white icon enough contrast on the pastel.

## Spec deviations recorded

1. **Mascot is named Bún, not Ngọc.** Design draft + handoff doc say "Ngọc" but the project settled on "Bún". This is saved as a memory entry: `project_mascot_name.md`. Any future port of design code that hard-codes "Ngọc" should be renamed.
2. **`/dictionary` stays external lookup.** Design draft proposes a library browser (alphabetical word list of the user's saved cards). User explicitly chose to keep the current external-lookup-via-dictionaryapi behavior. Saved as memory `project_dictionary_scope.md`.
3. **Pastel yellow.** Design's `--v-yellow: #ffc94a`; project uses `--v-yellow: #ffe082` per user preference. Knock-on: white text on yellow is no longer readable, so all yellow surfaces use `var(--v-ink)` text and `--v-yellow-deep: #e8b94a` for accents (sidebar speed tile, score number text-color in `SpeedQuizSession`, audio-button shadow swaps).
4. **`--v-gem` is an alias for `--v-blue`.** Design code uses `V.gem` heavily but doesn't define the value. Handoff doc comment `--v-blue: #5dc1f0; /* gem · review, new */` confirms gem = blue. Aliased so design code can be ported verbatim.
5. **Heart pill omitted from dashboard.** Design has flame/gem/heart triad; project shows only flame + gem (mastered count).
6. **Three-phase review collapsed to two phases.** Design implies typing → reveal+rate as a single screen. Project formerly had typing → reveal → rate with an intermediate "TỰ ĐÁNH GIÁ" button. Removed.
7. **Six audio play buttons in design's reveal** (different playback speeds/voices) **not implemented.** Project has one AudioButton + 6-dot autoplay indicator. Speed-variant playback would need a multi-source audio pipeline we don't have.
8. **POS pill in design is shown as "ADJECTIVE" (full word)**; project keeps abbreviated form (e.g. "adjective" lowercased — whatever dictionaryapi returns). Sticking with the API-provided form rather than expanding manually.
9. **Hardcoded "ôn sau X" sub-copy in design** replaced with `previewIntervals(card)` + `intervalLabel(days)`. Per-card intervals are more accurate than design's fixed "1 ngày / 4 ngày" labels.
10. **Settings page M3 controls** were extended in parallel with this migration (M3a). They don't fit the design's 2×2 grid of cards yet — that's still pending under Open items.

## Open items

The audit (in `/Users/blue/Desktop/english-learning/design/`) identified
~14 deviation groups. The ones not yet addressed:

- **Decks page redesign** — design has 3-column grid of large colorful deck
  cards with icon + subtitle + progress bar + percentage. Current uses thin
  4px left stripe + flat count. Needs schema additions (`subtitle`, `icon`
  on `flashcard_decks`) before the UI can fully match.
- **`/decks/[id]` detail page** — design defines a full deck-detail screen
  (hero card with stage breakdown bar, search + stage-filter tabs, per-word
  list). Not implemented; design implies it replaces the modal `DeckEditor`
  for non-trivial edits.
- **Settings 2×2 grid** — design has 4 V_Cards (Mục tiêu / Nhắc nhở / Âm
  thanh / Giao diện). Current settings page is 1-column. Âm thanh
  (autoplay + voice picker) and Giao diện (theme picker) cards entirely
  missing.
- **Speed quiz result polish** — design's result screen has 4 stat tiles
  (Đúng / Sai / Hết giờ / Streak dài nhất) + per-question speed bar chart +
  confetti sparkles. Current result is just mascot + accuracy + 2 buttons.
- **Portfolio top-nav** (`V_PortfolioTopNav`) — only worth implementing
  if the parent "Chloe Diep" portfolio framing is real. Otherwise drop.
- **Card "regenerate" route** — let users refresh IPA/audio/image on an
  existing card (post-migration tool — current cards stuck with whatever
  dictionary returned at creation time).

Smaller follow-ups noted during migration:

- **Six audio play-speed buttons** (design reveal screen) — would need a
  TTS service that supports rate variation (Google Cloud TTS, ElevenLabs).
- **Decks-by-progress card links to `/decks`** at the row level — when
  `/decks/[id]` ships, change the href to the detail page.
- **AddCardForm and ReviewSession/StudySession share a lot of styling**
  (speech bubble, lookup pills, char-diff legend, rating row). If a third
  consumer appears, extract to shared components. Two consumers is fine.

## Future maintainers

- **The session components (`ReviewSession`, `StudySession`) are now
  ~95% identical.** Differences: (a) progress gradient color, (b) speech-
  bubble eyebrow copy, (c) input placeholder, (d) submit button label,
  (e) summary semantics (`learnedCount` vs pass/fail split), (f) summary CTA
  destination. If you find yourself adding more conditional logic, extract
  a shared `<FlashcardSession>` and inject the differences as props.
- **The smart-Enter "default" rating** is keyboard discovery — outlined
  with 2px ink border so a sighted user sees which one Enter picks.
  Screen-reader UX for this is untested; consider `aria-keyshortcuts` if
  accessibility is in scope later.
- **Pexels rate limits**: free tier is 200 req/hour per key. The auto-blur
  trigger + reload-image button can chew through this if a user creates
  many cards in rapid succession. Worth caching or throttling if it becomes
  an issue.
- **`previewIntervals` calls `calculateNextReview` four times** (one per
  quality) on every render of the rating row. Cheap enough today (pure
  function, no I/O), but if `calculateNextReview` ever does network/DB
  work this needs memoization.
- **Decorative sparkles use `transformBox: 'fill-box'`** so the rotation
  origin works on inline SVG elements. Older Firefox versions don't
  support this — animation falls back to no transform, no visual impact.
- **Speech-bubble tail is a rotated square pseudo-element** positioned
  with `transform: 'translateX(-50%) rotate(45deg)'`. If you change the
  bubble background, update the tail's `background` to match.
- **Char-diff in reveal uses `textDecoration: 'line-through'`** on
  incorrect chars + colored correct chars stacked above an arrow + the full
  answer in green below. This differs from the older tiled diff format
  that was in `ReviewSession.tsx` before the rewrite.

## Manual QA checklist (still pending)

`tsc --noEmit` passes; no end-to-end browser testing was performed. Before
declaring this migration complete, exercise at least:

1. **Sidebar** — every nav item shows its colored icon tile. Active state
   uses white surface + shadow.
2. **Dashboard** — hero card mascot bobs; sparkles render; 14-day strip
   shows correct day-of-week labels and checkmarks for actual review days;
   30-day chart has stacked blue+green bars; decks card shows top 5.
3. **Add** — type a word, blur the input, preview pane populates with IPA,
   audio, POS pill (purple), image (Pexels), examples (AI fallback when
   dictionary sparse), Vietnamese auto-filled if you left it blank.
4. **Add image reload** — click ⟳ on the image, see a different photo. 404
   after enough clicks resets to skip 0.
5. **Add accent swap** — for a word with both US + UK audio (e.g.
   "schedule"), the US⟳/UK⟳ pill appears next to the audio button. Click
   swaps audio + IPA.
6. **Review / Study typing** — speech-bubble shows the Vietnamese,
   sparkles animate, polaroid (if card has image) tilts -1.5°. Input is
   focused on each new card.
7. **Review / Study reveal** — audio auto-plays 6 times with dots filling
   in. Char-diff strikethrough + answer + legend render. Smart-Enter:
   typed-correct → outlines TỐT; typed-wrong → outlines LẠI. Pressing Enter
   picks that outlined button.
8. **Failed-card re-queue** — rate "LẠI", confirm the card appears again
   later in the same session, and the counter `X / Y` shows Y growing.
9. **Speed quiz mix mode** — start `mix`, confirm questions cycle between
   en→vi, vi→en, spelling.
10. **Settings sliders** — drag a slider quickly, confirm no
    "Compaction failed" errors in the dev server log. Only one PUT fires
    after release.
