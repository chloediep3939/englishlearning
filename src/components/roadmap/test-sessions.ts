'use client';

import type { ComponentType } from 'react';
import type { RoadmapItem } from '@/lib/types';
import DictationTestSession from './DictationTestSession';
import PairTestSession from './PairTestSession';
import StressTestSession from './StressTestSession';
import WordListTestSession from './WordListTestSession';

export interface TestSessionProps {
  itemKey: string;
  itemLabel: string;
  passWhen: string;
  threshold: Pick<RoadmapItem, 'pass_dir' | 'pass_value' | 'pass_total' | 'pass_unit'>;
  variant: 'modal' | 'page';
  onClose: () => void;
  onSaved?: () => void;
}

/**
 * Mã công cụ (roadmap_item_tests.tool) → màn làm bài. Thêm loại bài mới chỉ
 * cần thêm một dòng ở đây; danh sách lộ trình và trang /roadmap/test/[key] đều
 * tra bảng này.
 */
export const TEST_SESSIONS: Record<string, ComponentType<TestSessionProps>> = {
  T1: WordListTestSession,
  T3: DictationTestSession,
  T3S: DictationTestSession,
  T8: PairTestSession,
  T8S: StressTestSession,
};
