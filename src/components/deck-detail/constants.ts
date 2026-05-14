import type { FlashcardStatus } from '@/lib/types';

export const STAGE_LABEL: Record<FlashcardStatus, string> = {
  new: 'New',
  learning: 'Học',
  review: 'Ôn',
  mastered: 'Thuộc',
};

export const STAGE_COLOR: Record<FlashcardStatus, string> = {
  new: 'var(--v-blue)',
  learning: 'var(--v-orange)',
  review: 'var(--v-primary)',
  mastered: 'var(--v-purple)',
};

export type FilterTab = 'all' | FlashcardStatus;
