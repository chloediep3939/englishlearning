-- M5 Task 1: Decks polish — icon + subtitle columns.
-- Both nullable; existing decks render with fallback icon (BookOpen) until
-- edited.

ALTER TABLE flashcard_decks ADD COLUMN icon TEXT;
ALTER TABLE flashcard_decks ADD COLUMN subtitle TEXT;
