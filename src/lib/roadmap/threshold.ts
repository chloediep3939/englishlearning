import type { RoadmapItem } from '@/lib/types';

// ⚠️ File này PURE — không import @/lib/db, không đọc cookie, không gọi AI.
// Client component import trực tiếp được (khác hẳn ./db.ts bên cạnh, vốn
// server-only). Giữ nguyên tính chất đó khi sửa.

/** Phần ngưỡng cần để chấm — đủ 3 trường thì máy tự chấm được. */
type Judgeable = Pick<RoadmapItem, 'pass_dir' | 'pass_value' | 'pass_total' | 'pass_unit'>;

/** Mục có chấm tự động được không, hay chỉ đánh dấu tay. */
export function canAutoJudge(item: Judgeable): boolean {
  return item.pass_dir !== null && item.pass_value !== null;
}

/**
 * So điểm với ngưỡng. Trả về null khi mục không có ngưỡng số — gọi bên gọi
 * tự xử, đừng mặc định false (mặc định false sẽ đánh trượt oan).
 */
export function judgeScore(item: Judgeable, score: number): boolean | null {
  if (item.pass_dir === null || item.pass_value === null) return null;
  return item.pass_dir === 'lte' ? score <= item.pass_value : score >= item.pass_value;
}

/** "47/50", "≤ 3", "≥ 90%" — hiện cạnh ô nhập điểm. */
export function describeThreshold(item: Judgeable): string | null {
  if (item.pass_dir === null || item.pass_value === null) return null;
  const sign = item.pass_dir === 'lte' ? '≤' : '≥';
  if (item.pass_unit === 'percent') return `${sign} ${item.pass_value}%`;
  if (item.pass_total !== null) return `${sign} ${item.pass_value}/${item.pass_total}`;
  return `${sign} ${item.pass_value}`;
}

/**
 * Nhãn cho ô nhập điểm. Với mục đếm lỗi thì hỏi ngược lại cho khỏi nhầm:
 * "bạn sai mấy chỗ" chứ không phải "bạn đúng mấy chỗ".
 */
export function scoreInputLabel(item: Judgeable): string {
  if (item.pass_unit === 'percent') return 'Bạn đạt bao nhiêu %?';
  if (item.pass_dir === 'lte') return 'Bạn sai / thiếu bao nhiêu?';
  if (item.pass_total !== null) return `Bạn đúng bao nhiêu trên ${item.pass_total}?`;
  return 'Bạn đạt bao nhiêu?';
}

/** Trần hợp lệ của ô nhập, để chặn gõ nhầm 500/50. */
export function maxScore(item: Judgeable): number {
  if (item.pass_unit === 'percent') return 100;
  if (item.pass_total !== null) return item.pass_total;
  // Ngưỡng không mẫu số ("≥ 6 keyword/bài", "≤ 3 lỗi") — cho rộng tay.
  return Math.max(100, (item.pass_value ?? 0) * 10);
}
