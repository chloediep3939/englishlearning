-- study-unified: recognition-only decks + review-row provenance.
-- Note: the spec's "decks" table is named flashcard_decks in this schema.

-- Deck-level flag: 1 = "Chỉ hiểu nghĩa" (recognition-only) deck. Sessions on
-- these decks drop production/typing exercises; SRS scheduling is unchanged.
ALTER TABLE flashcard_decks ADD COLUMN recognition_only INTEGER NOT NULL DEFAULT 0;

-- Where a review row came from: 'study' (unified study session) or
-- 'flashcard' (timed Flashcard nhanh play). Pre-existing rows are 'study'.
ALTER TABLE flashcard_reviews ADD COLUMN source TEXT NOT NULL DEFAULT 'study';

-- 1 = this row mutated the card's SRS state; 0 = log-only (activity signal
-- for stats/streak, no schedule change). Pre-existing rows are treated as
-- applied (1) — historically every row updated the card.
ALTER TABLE flashcard_reviews ADD COLUMN srs_applied INTEGER NOT NULL DEFAULT 1;
