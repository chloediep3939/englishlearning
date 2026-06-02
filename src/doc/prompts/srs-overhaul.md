# Prompt: SRS Overhaul — fix mastered gate + loop integration + migration

> Date: 2026-06-02
> Saved verbatim per CLAUDE.md §8.

## Context

Two production bugs reported, same root cause:

- **Bug 1**: User rates a card 2× "Tốt" in one session → card permanently `mastered`. Reload → user perceives "system marked this as learned without me finishing."
- **Bug 2**: Next day, `/review` is empty because all cards from yesterday's session became `mastered` and got filtered out.

Root cause: `calculateNextReview` has an overly aggressive mastery gate. Combined with the in-session Anki loop calling `/api/cards/[id]/rate` on **every** click, persistent `repetitions` races past the gate threshold within a single session.

This overhaul:

1. Tightens mastery criteria (only via genuinely long retention)
2. Separates review-logging from SRS state mutation (log every click, mutate state only on first rating per session per card)
3. Makes `mastered` non-terminal (cards keep cycling at long intervals, not retired forever)
4. Adds fuzz factor to avoid review clumping
5. Strengthens `Khó` ease penalty at reps=1 (so the button is meaningful for fragile cards)
6. Migrates existing prematurely-mastered cards

---

## Files to change

```
src/lib/flashcards/srs.ts                              — algorithm
src/lib/db.ts                                          — recordRating + getDueForReview + settings defaults
src/app/api/cards/[id]/rate/route.ts                   — accept new flag
src/components/flashcard-session/FlashcardSession.tsx  — track session-rated cards, send flag
migrations/0014_srs_fix.sql                            — un-master prematurely mastered
```

(Full step-by-step prompt body included the new `calculateNextReview` + `applyFuzz`,
`recordRating` `srsUpdate` opt, `getDueForReview` default flip, settings default flip,
deck due-count verification, rate route flag, FlashcardSession `srsUpdatedThisSessionRef`,
and migration 0014. See result file for what was actually built.)
</content>
</invoke>
