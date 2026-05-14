# M4c — Step 7 (Dịch) + Step 8 (Viết lại) + Pre-fetch

Phase 3 of 3 for M4. Replaces the M4a placeholders for Step 7 / Step 8 with
real AI-graded translation + paraphrase, adds the cached reference / tips
endpoints, and wires the background pre-fetch on Step 3.

Status: **9 of 9 tasks done.** `tsc --noEmit` clean. Migration 0007 applied
locally. No browser smoke test — manual QA list at the bottom. SSE skipped
(Gemini provider is non-streaming).

## Purpose

- **Step 7 — Dịch.** Learner translates the passage to Vietnamese. Gemini
  grades accuracy + naturalness, lists missed ideas + mistranslations, and
  shows a polished reference rendering. Persists every attempt to
  `passage_attempts`.
- **Step 8 — Viết lại.** Learner paraphrases in English. Gemini grades on
  4 axes (meaning / grammar / vocabulary / naturalness), lists issues and
  better-phrasing pairs. Pre-fetched tips show at the top of the writing
  screen.
- **Pre-fetch.** While the learner is on Step 3 (karaoke reader), the
  three AI-backed routes (`analyze` / `translate-reference` /
  `paraphrase-tips`) fire silently in the background so Step 2 / 7 / 8
  hit warm caches. Each route is idempotent — re-call from the actual
  step view is a DB cache hit.

## File map

| Path | Role |
| --- | --- |
| `migrations/0007_passage_prefetch.sql` | Adds `passages.translate_reference TEXT` and `passages.paraphrase_tips_json TEXT`. Both nullable; populated lazily. |
| `src/lib/types.ts` | Extended `Passage` with `translate_reference: string \| null` + `paraphrase_tips: string[] \| null`. Extended `PassageRow` with the same two columns (`paraphrase_tips_json` stays as the raw JSON string on the row form). |
| `src/lib/passages/db.ts` | `hydratePassage` parses `paraphrase_tips_json` → `paraphrase_tips` and strips the raw JSON column from the public shape. `passagesDb.update` whitelist accepts both new fields; tips are `JSON.stringify`-ed on write. |
| `src/lib/passages/ai/grade-translation.ts` | Replaces the M4a stub. Builds the prompt, sends to `await getAIProvider().generateText(prompt, { json: true, … })`, validates + clamps all scores, returns `TranslationFeedback \| null`. Placeholder fallback when AI is unavailable. |
| `src/lib/passages/ai/grade-paraphrase.ts` | Same shape, 4 sub-scores instead of 2, returns `ParaphraseFeedback \| null`. |
| `src/lib/passages/ai/translate-reference.ts` | **New.** Asks Gemini for a polished Vietnamese reference translation. Returns `string \| null`. Plain-text response, no JSON parse. |
| `src/lib/passages/ai/paraphrase-tips.ts` | **New.** Asks Gemini for 3 Vietnamese paraphrase tips. Returns `string[] \| null`. JSON array response, parse + clamp to 3. |
| `src/app/api/passages/[id]/translate-grade/route.ts` | **New.** POST. Validates passage ownership + `20 ≤ user_input.length ≤ 8000`. Calls `gradeTranslation`, records a `passage_attempts` row with `step_kind='translate'`, returns `{ attempt, feedback }`. 502 on AI failure. |
| `src/app/api/passages/[id]/paraphrase-grade/route.ts` | **New.** POST. Same shape, `step_kind='paraphrase'`. |
| `src/app/api/passages/[id]/translate-reference/route.ts` | **New.** POST. Cache-first: returns `passage.translate_reference` if present, else derives via AI and writes back. Body returns `{ reference, cached }`. |
| `src/app/api/passages/[id]/paraphrase-tips/route.ts` | **New.** POST. Cache-first on `passage.paraphrase_tips`. Body returns `{ tips, cached }`. |
| `src/components/passage/FeedbackSection.tsx` | **New.** Shared coloured-rail panel used by both Step 7 and Step 8 feedback views. Extracted to keep the per-step files focused. |
| `src/components/passage/PassageStep7Translate.tsx` | Replaces the M4a placeholder. 2-col writing view (passage left, textarea right). Submit → spinner → feedback view (big score + 2 sub-scores + missed/mistranslations/suggested-translation/reference sections + "Dịch lại"). Reads `passage.translate_reference` from props first and falls back to a one-shot fetch of `/translate-reference` (idempotent cache hit). |
| `src/components/passage/PassageStep8Paraphrase.tsx` | Replaces the M4a placeholder. Same 2-col layout, plus a collapsible "💡 Gợi ý từ Bún" tips panel that reads `passage.paraphrase_tips` (falls back to a one-shot fetch). Feedback view has 4 sub-scores + issues + better_phrasings sections. |
| `src/components/passage/PassageStep3Reader.tsx` | Added a 3-line background pre-fetch inside the existing `/api/settings` `.then(...)`. When `settings.passage_pre_fetch !== false`, fires `/analyze` + `/translate-reference` + `/paraphrase-tips` POST in parallel, all `.catch(() => {})`. |

## Data flow

```
Step 3 (Reader) — background pre-fetch
======================================
PassageStep3Reader mount
  └── GET /api/settings   → if passage_pre_fetch !== false, in parallel:
        ├── POST /api/passages/[id]/analyze              (writes level_estimate)
        ├── POST /api/passages/[id]/translate-reference  (writes translate_reference)
        └── POST /api/passages/[id]/paraphrase-tips      (writes paraphrase_tips_json)

Step 7 (Dịch)
=============
PassageStep7Translate mount
  └── if !passage.translate_reference → POST /api/passages/[id]/translate-reference
                                        (cache hit if pre-fetch already ran)

User submits Vietnamese translation
  └── POST /api/passages/[id]/translate-grade
        ├── passagesDb.getById               (ownership)
        ├── gradeTranslation(passage.content, user_input)
        │     └── getAIProvider().generateText(prompt, { json: true, … })
        └── passageAttemptsDb.record({ step_kind: 'translate', score: feedback.overall_score, … })
        → { attempt, feedback }

Step 8 (Viết lại)
=================
PassageStep8Paraphrase mount
  └── if !passage.paraphrase_tips → POST /api/passages/[id]/paraphrase-tips
                                    (cache hit if pre-fetch already ran)

User submits English paraphrase
  └── POST /api/passages/[id]/paraphrase-grade
        ├── passagesDb.getById               (ownership)
        ├── gradeParaphrase(passage.content, user_input)
        │     └── getAIProvider().generateText(prompt, { json: true, … })
        └── passageAttemptsDb.record({ step_kind: 'paraphrase', score: feedback.overall_score, … })
        → { attempt, feedback }
```

## Public API surface

| Endpoint | Auth | Body | Success | Errors |
| --- | --- | --- | --- | --- |
| `POST /api/passages/[id]/translate-grade` | cookie | `{ user_input }` | `200 { attempt, feedback }` | `400` (≤19 chars or >8000), `401`, `404`, `502` (AI failed) |
| `POST /api/passages/[id]/paraphrase-grade` | cookie | `{ user_input }` | `200 { attempt, feedback }` | `400`, `401`, `404`, `502` |
| `POST /api/passages/[id]/translate-reference` | cookie | (none) | `200 { reference, cached }` | `401`, `404`, `502` |
| `POST /api/passages/[id]/paraphrase-tips` | cookie | (none) | `200 { tips, cached }` | `401`, `404`, `502` |

Internal helpers (callable directly from server contexts):

| Symbol | Returns | Notes |
| --- | --- | --- |
| `gradeTranslation(originalEnglish, userVietnamese)` | `Promise<TranslationFeedback \| null>` | `null` = transient AI failure (call again). Placeholder with zero scores returned when AI provider is unavailable. |
| `gradeParaphrase(originalEnglish, userParaphrase)` | `Promise<ParaphraseFeedback \| null>` | Same semantics. |
| `getTranslationReference(originalEnglish)` | `Promise<string \| null>` | `null` for "no AI" and "AI failed" — caller can't tell the difference. Pre-fetch ignores errors anyway. |
| `getParaphraseTips(originalEnglish)` | `Promise<string[] \| null>` | Caps at 3 strings, drops empties. |

## Gotchas / non-obvious decisions

1. **AI feature modules live in `src/lib/passages/ai/`** (subfolder), not the
   top-level `src/lib/passages/` the spec suggested. M4a created the
   subfolder with all four stubs co-located; M4b replaced two of them in
   place; M4c does the same with the remaining two and adds the two new
   modules alongside. Re-organising would split a co-located cluster for
   no benefit.

2. **`generateText` signature is `(prompt, options)`** — positional. The
   spec sketch used `({ prompt, ...options })`. All four new call sites
   use the real signature.

3. **`getAIProvider()` is `async`.** All four AI modules await it. Don't
   refactor to a sync getter — the Cloudflare context lookup it does
   under the hood is genuinely async.

4. **`hydratePassage` strips `paraphrase_tips_json` from the spread.**
   The row form has the raw JSON column; the public `Passage` shape has
   the parsed array. We use a destructuring rename to avoid leaking the
   column name into the runtime object even with the cast.

5. **Pre-fetch fires inside the existing settings `.then()` block** rather
   than a separate `useEffect`. The settings fetch already determines
   whether pre-fetch is enabled, so colocating means one less effect and
   one less round-trip on Step 3.

6. **Pre-fetch errors are silent.** All three POSTs use `.catch(() => {})`.
   If Gemini is down the cache stays empty and the actual step view
   re-tries on mount (and surfaces the 502 there if it still fails).

7. **Score clamping is defensive.** Gemini occasionally returns
   `accuracy_score: 102` or `naturalness_score: -1`. `clampScore` rounds
   and clamps to `[0, 100]`. Same logic in both graders.

8. **Reference and feedback's `suggested_translation` are separate fields.**
   The grader produces its own `suggested_translation` inline as part of
   feedback. The cached `translate_reference` is the pre-fetched standalone
   reference. Step 7's feedback view only shows the cached reference if
   it differs from the grader's inline suggestion (avoids duplicate text
   when the model happens to produce the same string twice).

9. **Tips panel is collapsible** — defaults open, but the learner can
   collapse it if it's distracting. State is per-mount, not persisted.

10. **20-character minimum input.** Below 20 chars the route 400s with
    a friendly message. This matches the spec and stops trivial submissions
    from generating useless attempts in the DB.

11. **`passage_attempts` accumulates.** Each "Dịch lại" / "Viết lại"
    creates a new row. No de-dup, no overwrite. Worth a future cleanup
    if rows explode (e.g. cap at 10 per step + delete oldest).

## Spec deviations recorded

| Spec said | We did | Why |
| --- | --- | --- |
| `src/lib/passages/translate-grade.ts` (top level) | `src/lib/passages/ai/grade-translation.ts` (subfolder, hyphenated kebab) | Matches the existing M4b convention. The spec's patch notes at the top explicitly accepted this. |
| `getAIProvider()` sync, `ai.generateText({ prompt, json: true, … })` | `await getAIProvider()`, `ai.generateText(prompt, { json: true, … })` | Spec patch notes acknowledged this — the real signatures. |
| `export function PassageStep7Translate(...)` | `export default function PassageStep7Translate(...)` | Wizard host imports default. Changing both sides would have rippled for no gain. |
| Task 7: SSE streaming for grading | **Skipped.** Plain JSON + `LoadingState` spinner. | `src/lib/ai/gemini.ts` uses `:generateContent` (non-streaming). Adding streaming would require both an SDK change and Cloudflare-Workers-compatible SSE plumbing. Out of scope; spec explicitly allowed skipping. |
| Step 7 to load "previous attempt" via a `/api/passage-attempts` endpoint | Skipped. The spec itself flagged this as optional ("if the GET route doesn't exist"). No such route exists; not building one for cosmetic surface. | |
| Reference shown as "Bản dịch gợi ý" in feedback | Shown as "Bản dịch tham chiếu" in a separate section when it differs from the grader's inline `suggested_translation`. | "Gợi ý" was already taken by the grader's own suggestion; renaming avoids two identical-looking sections. |

## Open items

- **`/api/passage-attempts` GET endpoint** — would let Step 7 / Step 8
  show "Lần trước bạn đã chấm X điểm" microcopy. Not in M4c scope, useful
  for M4d if there is one.
- **Attempt row cap.** Rated 3 paraphrases on the same passage → 3 rows.
  Worth a future "keep last 10 per step" cleanup task.
- **SSE / streaming feedback** — design intent stated in spec but punted.
  Requires Gemini SDK upgrade + Worker-side SSE plumbing.
- **No accessibility audit.** Tips panel is keyboard-collapsible (button),
  but the modal arrow keys / focus trap on Step 3's popup were left as M4b
  shipped them.

## Future maintainers

- **Grader prompts live next to the parser.** If you tweak the prompt
  (e.g. add a new score axis), update both the prompt string AND
  `clampScore`/`parse` so the new field flows through to typed feedback.
- **Cache is per-passage, not per-user.** Two users can't see each other's
  passages thanks to ownership checks in every route, so the cache is
  effectively per-user too. If you later add a "share passage" feature,
  reconsider whether `translate_reference` and `paraphrase_tips_json`
  should be on the share row instead of the passage row.
- **Adding Step 4-6 / 9-N steps.** The pattern is repeatable: build the
  AI module under `src/lib/passages/ai/`, add a thin route under
  `src/app/api/passages/[id]/<verb>`, build the component under
  `src/components/passage/PassageStep<N><Name>.tsx`, register it on
  the wizard host (`src/app/passage/[id]/page.tsx`). The shared
  `FeedbackSection` helper covers any "title + coloured rail + body"
  feedback pattern.

## Manual QA checklist (still pending)

`tsc --noEmit` passes. Migration 0007 applied locally. Before declaring
M4c shipped, exercise at least:

1. **Schema** — `wrangler d1 execute … --command "PRAGMA table_info(passages)"`
   shows `translate_reference` + `paraphrase_tips_json` columns.
2. **Step 7 happy path** — type ≥20 Vietnamese chars → submit → spinner
   ~5s → feedback view renders score, 2 sub-scores, sections, "Dịch lại".
3. **Step 7 reference** — feedback view shows "Bản dịch tham chiếu" when
   `passages.translate_reference` is populated AND distinct from
   `feedback.suggested_translation`.
4. **Step 8 happy path** — type ≥20 English chars → submit → spinner
   ~5s → feedback view renders 4 sub-scores, issues, better-phrasings.
5. **Tips panel** — Step 8 shows "💡 Gợi ý từ Bún" with 3 tips after the
   pre-fetch has completed (or after the on-mount fallback fetch). Collapse
   chevron works.
6. **Pre-fetch toggle** — Settings → disable "Tải trước AI feedback" →
   reload Step 3 → DevTools Network has NO `/analyze` / `/translate-reference`
   / `/paraphrase-tips` calls firing.
7. **Cache hit** — Open the same passage Step 3 twice, then visit Step 7
   → the on-mount `/translate-reference` POST returns `cached: true`.
8. **AI failure** — temporarily blank `GEMINI_API_KEY` → submit a
   translation → friendly 502 banner appears with "Thử lại" button. No
   crash.
9. **Multiple retries** — translate the same passage 3 times → 3 rows
   land in `passage_attempts` with `step_kind='translate'`.
10. **Cross-user 404** — try `POST /api/passages/999999/translate-grade`
    as a normal user where 999999 belongs to another user → 404.
