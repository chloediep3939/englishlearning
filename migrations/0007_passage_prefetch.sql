-- M4c: cache pre-fetched translation reference + paraphrase tips on the passage row.
-- Both columns are nullable so existing passages stay valid; populated lazily
-- by /api/passages/[id]/translate-reference and .../paraphrase-tips, and
-- read back by Step 7 / Step 8 feedback views.
ALTER TABLE passages ADD COLUMN translate_reference TEXT;
ALTER TABLE passages ADD COLUMN paraphrase_tips_json TEXT;
