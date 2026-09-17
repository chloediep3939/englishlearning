import { BookOpen, GraduationCap, Link2, type LucideIcon } from 'lucide-react';

/** Giao diện theo danh sách gốc: màu token, nền nhạt, icon, tên hiển thị. */
export const PRESET_LIST_META: Record<
  string,
  { title: string; short: string; hint: string; color: string; soft: string; Icon: LucideIcon }
> = {
  ngsl: {
    title: 'Từ thông dụng',
    short: 'NGSL',
    hint: 'New General Service List — khoảng 2.800 từ phủ ~92% tiếng Anh thường ngày. Nên học từ nhóm đầu lên.',
    color: 'var(--v-blue)',
    soft: 'var(--v-blue-soft)',
    Icon: BookOpen,
  },
  awl: {
    title: 'Từ học thuật',
    short: 'AWL',
    hint: 'Academic Word List — 570 từ hay gặp trong bài đọc, bài giảng, bài viết học thuật. Sublist 1 gặp nhiều nhất.',
    color: 'var(--v-purple)',
    soft: 'var(--v-purple-soft)',
    Icon: GraduationCap,
  },
  colloc: {
    title: 'Cụm từ học thuật',
    short: 'PTE',
    hint: 'Academic Collocation List (Pearson/PTE) — 2.468 cụm từ học thuật hay đi cùng nhau, xếp theo bảng chữ cái.',
    color: 'var(--v-teal)',
    soft: 'var(--v-teal-soft)',
    Icon: Link2,
  },
};

export function presetListMeta(listCode: string) {
  return PRESET_LIST_META[listCode] ?? PRESET_LIST_META.ngsl;
}
