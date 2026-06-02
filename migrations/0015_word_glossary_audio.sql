-- 0015_word_glossary_audio.sql
-- Read-Along word lookup now pulls US pronunciation from Oxford Learner's
-- Dictionaries (same source as the card-add path). Store the Oxford mp3 CDN
-- URL so the audio-serving route can proxy it; R2 (audio/words/<word>.mp3) is
-- an optional byte cache. IPA is stored in the existing `ipa` column.
ALTER TABLE word_glossary ADD COLUMN audio_src TEXT;
