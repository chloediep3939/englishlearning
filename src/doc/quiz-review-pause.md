# Quiz review pause + "Xem lại từ" modal

## Purpose

Speed quiz (Flashcard nhanh) used to auto-advance ~700ms after each answer,
rushing the learner past every card. Now both Speed quiz and Cloze **pause on
the revealed answer** until the learner presses **Tiếp**, and a **Xem lại từ**
button opens a read-only popup to re-study the word before moving on.

## File map

| File | Change |
| --- | --- |
| `src/components/common/WordReviewModal.tsx` | **New.** Read-only "review this word" popup. Takes `cardId`, fetches the full card via `GET /api/cards/:id`, shows word + audio + IPA + POS + meaning + image + examples (cloze pool, with `card.examples` fallback) + collocations. |
| `src/components/SpeedQuizSession.tsx` | Removed the 700ms auto-advance. `advance()` split into `answer()` (record + reveal, no advance) and `goNext()` (advance on button press). Auto-timeout now only reveals. Added feedback action row (Xem lại từ + Tiếp/Xem kết quả) and the modal. Keyboard: 1–4 to pick while answering, Enter/Space to advance once revealed; disabled while the modal is open. |
| `src/components/ClozeSession.tsx` | Already paused on reveal — added the Xem lại từ button to the revealed action row, the modal, and a `reviewOpen` guard in the keyboard handler. |

## Why a new modal instead of reusing CardDetailModal

`deck-detail/CardDetailModal` is a **management** surface (edit / delete /
regenerate). Those affordances are wrong — and risky (delete mid-quiz) — in
the middle of a quiz, and it requires the full `Flashcard` object the quiz
components don't hold. `WordReviewModal` is read-only and self-fetches by id,
so it diverges >30% from CardDetailModal (per CLAUDE.md §2.1, a separate
component rather than a `variant` flag).

## Gotchas

- **Keyboard collision:** both quiz sessions have a global `keydown` listener.
  While the modal is open they early-return on a `reviewOpen` guard so Enter /
  Space / 1–4 don't leak through to the underlying quiz.
- **Speed quiz timer:** the per-question 8s timer still runs *while answering*
  (the "nhanh" element is preserved), then pauses on reveal (`paused={showFeedback}`).
  The pause to re-study happens *after* answering.
- The modal is only reachable from the revealed/feedback state, so it never
  spoils the answer early.

## Not changed

- Scoring is unchanged (still "số câu đúng" per session; the +1/−1 global
  points system was deferred by the user).
- Study/Review (`FlashcardSession`) already pauses on reveal → rate, so it was
  left as-is.
