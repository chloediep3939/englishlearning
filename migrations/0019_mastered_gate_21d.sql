-- Loosen the mastery gate from (interval >= 60d AND reps >= 4) to the
-- Anki-style "mature" threshold (interval >= 21d AND reps >= 3) — the old
-- gate kept every deck at 0% "thuộc" for months. Mirror of 0014's demotion,
-- in the opposite direction: promote review cards that already clear the
-- new bar. srs.ts applies the same threshold going forward.
UPDATE flashcards
SET status = 'mastered'
WHERE status = 'review'
  AND interval_days >= 21
  AND repetitions >= 3;
