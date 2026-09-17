import { judgeScore } from '@/lib/roadmap/threshold';
import type { RoadmapItem } from '@/lib/types';
import type { PairAnswer } from './types';

export interface GroupScore {
  contrast: string;
  label: string;
  correct: number;
  total: number;
}

/**
 * Chấm bài cặp từ ở client — PHẢI khớp luật ở POST /api/roadmap/[key]/pair-test
 * để màn kết quả báo đúng cái server sẽ ghi:
 *   min_group → điểm = floor(tỉ lệ nhóm tệ nhất × pass_total)
 *   overall   → điểm = floor(% đúng toàn bài)
 */
export function scorePairs(
  answers: PairAnswer[],
  contrasts: string[],
  scoring: 'min_group' | 'overall',
  threshold: Pick<RoadmapItem, 'pass_dir' | 'pass_value' | 'pass_total' | 'pass_unit'>,
): { groups: GroupScore[]; passed: boolean | null } {
  const map = new Map<string, GroupScore>();
  for (const c of contrasts) map.set(c, { contrast: c, label: c, correct: 0, total: 0 });
  for (const a of answers) {
    const g = map.get(a.question.contrast);
    if (!g) continue;
    g.label = a.question.contrast_label;
    g.total += 1;
    if (a.correct) g.correct += 1;
  }
  const groups = [...map.values()];
  if (answers.length === 0 || groups.some((g) => g.total === 0)) return { groups, passed: null };

  const score =
    scoring === 'min_group'
      ? Math.floor(Math.min(...groups.map((g) => g.correct / g.total)) * (threshold.pass_total ?? 20))
      : Math.floor((answers.filter((a) => a.correct).length / answers.length) * 100);

  return { groups, passed: judgeScore(threshold, score) };
}
