import { Headphones, BookOpenText, PenLine, Mic, ListChecks } from 'lucide-react';

// Màu + icon cho từng kỹ năng. Vàng (--v-yellow) để dành cho Flashcard nhanh
// nên không dùng ở đây.
export interface SkillMeta {
  color: string;
  icon: typeof ListChecks;
}

const META: Record<string, SkillMeta> = {
  nghe: { color: 'var(--v-blue)', icon: Headphones },
  doc: { color: 'var(--v-teal)', icon: BookOpenText },
  viet: { color: 'var(--v-purple)', icon: PenLine },
  noi: { color: 'var(--v-red)', icon: Mic },
};

export function skillMeta(code: string): SkillMeta {
  return META[code] ?? { color: 'var(--v-primary)', icon: ListChecks };
}

// Màu trạng thái — dùng chung cho thanh tiến độ, nút ✓/✗ và badge.
export const STATUS_COLOR = {
  pass: 'var(--v-primary)',
  fail: 'var(--v-red)',
  untested: 'var(--v-border)',
  retest: 'var(--v-orange)',
} as const;
