# Refactor audit — Phase 1

> Read-only inventory. No code changes here. Phases 2-4 act on this plan.

## 1a. Files over 500 lines

```
1182 src/components/ReviewSession.tsx
1170 src/components/StudySession.tsx
1004 src/components/PronounceSession.tsx
 912 src/app/settings/page.tsx
 876 src/components/SentenceSession.tsx
 872 src/components/AddCardForm.tsx
 853 src/lib/db.ts
 820 src/components/DeckDetailClient.tsx
 692 src/app/page.tsx
 667 src/components/passage/PassageStep3Reader.tsx
 642 src/components/ComposeFeedback.tsx
 640 src/components/ComposePoolPicker.tsx
 638 src/components/SpeedQuizSession.tsx
 575 src/components/ClozeSession.tsx
```

14 files over 500. Largest: ReviewSession at 1182. The Review + Study pair
is the biggest single saving opportunity (1182 + 1170 = 2352 lines of
~95% identical code per the V2 migration doc — Phase 3c target).

## 1b. Duplication audit

Legend:
- **Extract** = build a common component / helper.
- **Relocate** = already a single component, just move into `common/`.
- **Skip** = under 3 consumers, or variants diverge enough that a shared
  abstraction would need `if (variant)` branches.

| Pattern | Files | Count | Action |
|---|---|---|---|
| `Mascot` (already a component) | dashboard, /review, /passage, /login, ClozeSession, ReviewSession, SentenceSession, ComposeEditor, PronounceSession, SpeedQuizSession, ComposePoolPicker, Sidebar, StudySession, LoadingState, PassageStep2Difficulty | 15 | **Relocate** to `common/Mascot.tsx` |
| `LoadingState` (already a component) | /settings, /speed, /compose, /pronounce, /sentence, /passage/[id], ClozeSession, ComposePoolPicker, DeckList, PassageStep7/8 | 10 | **Relocate** to `common/LoadingState.tsx` |
| `FeedbackSection` (already a component, in passage/) | PassageStep7Translate, PassageStep8Paraphrase | 2 | **Relocate** to `common/FeedbackSection.tsx` (so M4c ParaphraseFeedback / future TranslationFeedback can reuse) |
| `EmptyState` shape (Mascot + headline + subtext + 1-2 CTAs) | /review (`ReviewEmpty`), /passage (inline), `/compose/history` (inline), ComposePoolPicker (inline), StudySession (summary), SpeedQuizSession (summary), DeckDetailClient (inline placeholder) | 7 | **Extract** to `common/EmptyState.tsx` |
| `POSPill` (purple pill with part-of-speech text) | WordCard, AddCardForm, ReviewSession, StudySession, SentenceSession, DeckDetailClient, dictionary, PassageStep3Reader | 8 | **Extract** to `common/POSPill.tsx` |
| `LookupPills` (Oxford / YouGlish / ozdic external link row + `lookupUrl` helper) | ReviewSession, StudySession, AddCardForm | 3 | **Extract** to `common/LookupPills.tsx` |
| `CharDiffBox` (typed-recall diff: strikethrough + arrow + answer + legend) | ReviewSession, StudySession | 2 | **Extract** during Phase 3c — part of FlashcardSession base |
| `RatingRow` (4-color quality buttons + `intervalLabel(intervals[r.quality])` sub-copy + smart-Enter outline) | ReviewSession, StudySession | 2 | **Extract** during Phase 3c — part of FlashcardSession base |
| `RatingButtons.tsx` (older, no `previewIntervals`) | nowhere | 0 | **Delete** — superseded by inline rating rows in Review/Study |
| `apiJson<T>(url, init)` helper (replace `fetch(...).then((r) => r.json() as Promise<...>)`) | QuizSetup, settings/page, pronounce/page, sentence/page, passage/[id]/page, ComposePoolPicker, AddCardForm, PassageStep2/3/7/8, datamuse | 12 | **Extract** to `lib/common/api-json.ts` |
| `ScoreGauge` (circular SVG ring + center number) | ComposeFeedback (its own), dashboard (white-on-primary embedded) | 2 | **Skip** — variants differ in color scheme + body content (gauge has score number, dashboard has count/goal copy). Forced merge would need a `variant` flag. |
| `StatTile` (small colored stat box) | dashboard (icon + value + label + sub), SpeedQuizSession (color border + value + label) | 2 | **Skip** — different shape (icon vs no icon, different padding/sub-copy). |
| Sparkles decorative cluster (uses `v-sparkle` keyframe) | SpeedQuizSession only — `lucide Sparkles` icon imports elsewhere are unrelated | 1 | **Skip** |
| Speech bubble (eyebrow + tail card) | ReviewSession, StudySession (the prompt headers) | 2 | **Skip** in Phase 2; absorbed into FlashcardSession in Phase 3c |
| Deck-picker chip list | QuizSetup, ComposePoolPicker, ComposeEditor, CompositionDetail, AddCardForm, PassageStep3Reader save popup, /cloze, /speed, /pronounce, /sentence | 10 mentions | **Skip** — most "deck_id" references are state plumbing, not the visual picker. QuizSetup already encapsulates the chip picker for the quiz pages. Real visual deck-pickers: QuizSetup + a save-popup variant (different shape). Leave as-is. |
| WordChip (english + small VI) | ComposePoolPicker, ComposeEditor (likely), Pool chips area | 2-3 | **Skip** in Phase 2 — narrow scope, can reassess later. |
| Confirm dialog | many `window.confirm()` callers | many | **Skip** — `window.confirm` is fine; the spec itself flags as lower priority. |

### Phase 2 extraction summary

**6 new modules + 3 relocations**:

```
src/components/common/
  Mascot.tsx              ← relocated from components/
  LoadingState.tsx        ← relocated from components/
  FeedbackSection.tsx     ← relocated from components/passage/
  EmptyState.tsx          ← NEW (extracts /review, /passage, /compose/history etc.)
  POSPill.tsx             ← NEW (8 sites)
  LookupPills.tsx         ← NEW (3 sites)

src/lib/common/
  api-json.ts             ← NEW (12+ sites)
```

Delete `src/components/RatingButtons.tsx` (unused).

Components delivered in Phase 3 (under `components/flashcard-session/`):
- `CharDiffBox`
- `RatingRow`
- `FlashcardSession` (orchestrator)

## 1c. Phase 3 splits — file-by-file plan

For each oversized file, identify natural seams:

| File | Lines | Phase 3 plan |
|---|---|---|
| **ReviewSession.tsx** (1182) | | Extract shared `FlashcardSession` orchestrator + `CharDiffBox` / `RatingRow` / `Kbd` / `lookupUrl` (now via `LookupPills`). After: ReviewSession + StudySession ≈30 lines each, FlashcardSession ≈400 lines. **Phase 3c.** |
| **StudySession.tsx** (1170) | | Same — see ReviewSession. **Phase 3c.** |
| **PronounceSession.tsx** (1004) | | Has phases: setup → prompt → recording → result → summary. Each phase ~150 lines. Extract `PhaseSetup`, `PhasePrompt`, `PhaseRecording`, `PhaseResult`, `PhaseSummary` into `components/pronounce-session/`. |
| **settings/page.tsx** (912) | | Already split logically into Cards; the noise is the inline `Slider`, `SliderWithIcon`, `Toggle`, `MaxAttemptsControl`, `VoicePickerControl`, `ThemeControl`, `CefrControl`, `TtsRateControl`. Extract these as `components/settings-controls/{Slider,Toggle,MaxAttempts,VoicePicker,ThemeControl,Cefr,TtsRate}.tsx`. |
| **SentenceSession.tsx** (876) | | Two-phase (write → feedback). Extract `WritePhase`, `FeedbackPhase`, `SummaryPhase` into `components/sentence-session/`. |
| **AddCardForm.tsx** (872) | | Sections: lookup input, generated preview, deck picker, examples editor, image, save. Extract `GeneratedPreview`, `DeckPickerInline`, `ExamplesEditor` into `components/add-card/`. |
| **db.ts** (853) | | Split per domain: `lib/db/users.ts`, `lib/db/decks.ts`, `lib/db/cards.ts`, `lib/db/reviews.ts`, `lib/db/test-attempts.ts`, `lib/db/practice-sentences.ts`, `lib/db/settings.ts`. Keep `getDb` + hydrate helpers in `lib/db/index.ts` re-exporting. **Risk:** every import site uses `@/lib/db` — re-export from `index.ts` keeps imports stable. |
| **DeckDetailClient.tsx** (820) | | Recently written (M5). Extract `StageBreakdown`, `WordRow`, `CardDetailModal` into `components/deck-detail/`. |
| **app/page.tsx** (692) | | Dashboard. Extract hero, calendar strip, stats grid, activity chart into `components/dashboard/`. |
| **PassageStep3Reader.tsx** (667) | | Karaoke controls + tokenized passage + define popup are clear seams. Extract into `components/passage/passage-reader/`. |
| **ComposeFeedback.tsx** (642) | | Has inline `ScoreGauge`, `VerdictPill`, `SidePanel`, `Chip`, `EmptyHint`, `renderAnnotatedPassage`. Extract render helpers into `components/compose-feedback/`. |
| **ComposePoolPicker.tsx** (640) | | Tabs (today / deck / search). Extract per-tab subcomponents. |
| **SpeedQuizSession.tsx** (638) | | `SummaryScreen` extraction (already a function) + `TimerBar` + question card. Extract into `components/speed-quiz/`. |
| **ClozeSession.tsx** (575) | | Two modes (typing / MC). Extract `TypingMode`, `MultipleChoiceMode`, `SummaryView` into `components/cloze-session/`. |

## Phase 3 scope warning

**Phase 3c (ReviewSession + StudySession → FlashcardSession) is the single
highest-value split.** Per V2 doc the two are ~95% identical; merging them
removes the largest single duplication in the codebase (~2000 lines).
But the SRS-rating + smart-Enter behavior + audio autoplay + IPA reveal
details are subtle. **If 3c hits unexpected coupling, ship only 3a/3b/3d
splits and flag 3c as a follow-up.**

Most other Phase 3 splits are mechanical sub-component extractions —
moving inline helpers to their own files, no behavior change.

## 1d. Convention sketch for Phase 4

Will land in CLAUDE.md:

1. Before creating any UI component or helper: **grep `src/components/common/`
   and `src/lib/common/` first**. If a match exists, use it.
2. If nothing matches but this would be the **3rd consumer** of a copy-paste
   pattern, stop and extract before continuing.
3. No file > 500 lines. Sub-components live in a `<feature>/` subfolder
   next to the parent (e.g. `components/passage/passage-reader/`).
4. Anti-pattern: never put `if (variant === 'X')` branches inside a common
   component. Diverging variants stay separate.
5. Anti-pattern: don't pre-create empty `common/` files. Extract on the 3rd
   consumer, not the 1st.

---

End of audit.
