-- ============================================================================
-- 0014: Fix prematurely-mastered cards.
--
-- The previous mastered gate in calculateNextReview triggered after 2 "Tốt"
-- ratings — possible within a single in-session loop. Learners' first
-- study session was marking all cards as mastered, removing them from
-- /review the next day and giving the false impression that the system
-- considered them learned.
--
-- New gate: status='mastered' only when interval_days >= 60 AND
-- repetitions >= 4. This migration unwinds the bad data:
--
--   - Un-master cards with interval < 60 days
--   - Reset their status to 'review' (not 'learning' — they've been
--     rated at least once)
--   - Stagger next_review_at over the next 7 days so the learner
--     doesn't see a single massive backlog on the next visit
-- ============================================================================

UPDATE flashcards
SET status = 'review',
    next_review_at = datetime('now', '+' || (1 + (id % 7)) || ' days')
WHERE status = 'mastered'
  AND interval_days < 60;

-- Safety: any remaining 'mastered' card with NULL next_review_at gets
-- one (these are rare but should not exist in steady state).
UPDATE flashcards
SET next_review_at = datetime('now', '+' || MAX(interval_days, 1) || ' days')
WHERE status = 'mastered'
  AND next_review_at IS NULL;
