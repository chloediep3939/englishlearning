-- Deck study mode: 'full' (học đầy đủ — SRS study/review) vs 'meaning'
-- (chỉ hiểu nghĩa — reference decks kept out of the dashboard learning
-- stats). Existing decks default to 'full'.
ALTER TABLE flashcard_decks ADD COLUMN study_mode TEXT NOT NULL DEFAULT 'full';
