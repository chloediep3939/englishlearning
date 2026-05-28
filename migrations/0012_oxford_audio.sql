-- Oxford US pronunciation audio (R2) + status flag.
-- The mp3 bytes live in R2 (binding AUDIO_BUCKET); the card only stores the
-- R2 object key + a fetch status. The existing `ipa` column is overwritten
-- with the US IPA on a successful fetch — no new IPA column.

-- R2 object key for the stored US mp3. NULL = no audio stored.
ALTER TABLE flashcards ADD COLUMN audio_us_key TEXT;

-- Oxford fetch outcome: 'ok' (mp3 stored), 'failed' (attempted, no mp3),
-- or NULL (never attempted — e.g. cards created before this feature).
ALTER TABLE flashcards ADD COLUMN audio_us_status TEXT;
