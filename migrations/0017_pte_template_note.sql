-- Free-text note per PTE speaking template: the learner's own reminders
-- (khi nào dùng khung này, chỗ hay quên, mẹo phát âm…). Optional — NULL for
-- every template created before this migration.

ALTER TABLE pte_templates ADD COLUMN note TEXT;
