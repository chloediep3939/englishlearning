-- Tắt các cặp từ mà bản ghi Oxford đọc LỆCH đúng âm vị cặp đó kiểm tra.
--
-- Bài nghe phân biệt âm phát mp3 Oxford; nếu Oxford ghi dạng yếu (had /həd/,
-- but /bət/, could /kəd/…) hoặc nghĩa khác (use động từ /juːz/, learned tính
-- từ /ˈlɜːrnɪd/), thì câu hỏi thành sai đề: người nghe đúng vẫn bị chấm trượt.
-- Danh sách từ content/phonetics/oxford-ipa-mismatches.json.
--
-- Dùng cờ active chứ không xoá: có audio đúng thì bật lại được.

ALTER TABLE phonetic_pairs ADD COLUMN active INTEGER NOT NULL DEFAULT 1;

UPDATE phonetic_pairs SET active = 0 WHERE contrast = 'æ_ʌ' AND word_a = 'bat' AND word_b = 'but';
UPDATE phonetic_pairs SET active = 0 WHERE contrast = 'e_ʌ' AND word_a = 'bet' AND word_b = 'but';
UPDATE phonetic_pairs SET active = 0 WHERE contrast = 'ʊ_uː' AND word_a = 'could' AND word_b = 'cooed';
UPDATE phonetic_pairs SET active = 0 WHERE contrast = 'æ_e' AND word_a = 'had' AND word_b = 'head';
UPDATE phonetic_pairs SET active = 0 WHERE contrast = 'ending_ed' AND word_a = 'learn' AND word_b = 'learned';
UPDATE phonetic_pairs SET active = 0 WHERE contrast = 'æ_e' AND word_a = 'shall' AND word_b = 'shell';
UPDATE phonetic_pairs SET active = 0 WHERE contrast = 'ʊ_uː' AND word_a = 'should' AND word_b = 'shooed';
UPDATE phonetic_pairs SET active = 0 WHERE contrast = 'æ_e' AND word_a = 'than' AND word_b = 'then';
UPDATE phonetic_pairs SET active = 0 WHERE contrast = 'θ_s' AND word_a = 'youth' AND word_b = 'use';
