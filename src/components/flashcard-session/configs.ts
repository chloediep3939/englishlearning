import type { SessionConfig } from './types';

/**
 * Two pre-baked SessionConfigs covering the page-flavored differences
 * documented in the V2 audit. Anything truly shared lives in the
 * orchestrator (queue logic, key bindings, summary) — only the
 * page-by-page text and the progress gradient leak out as config.
 */

export const studyConfig: SessionConfig = {
  mode: 'study',
  progressGradient: 'linear-gradient(90deg, var(--v-blue), var(--v-primary))',
  promptEyebrow: 'Từ mới — thử đoán nhé',
  inputPlaceholder: 'Gõ tiếng Anh — đoán cũng được',
  ratingRowLabel: 'Mức độ nhớ?',
};

export const reviewConfig: SessionConfig = {
  mode: 'review',
  progressGradient: 'linear-gradient(90deg, var(--v-primary), var(--v-primary-deep))',
  promptEyebrow: 'Hãy dịch giúp mình',
  inputPlaceholder: 'Gõ tiếng Anh…',
  ratingRowLabel: 'Bạn thấy thế nào?',
};
