'use client';

import { useRouter } from 'next/navigation';
import type { RoadmapItem } from '@/lib/types';
import { TEST_SESSIONS } from './test-sessions';

/**
 * Bản trang riêng của bài tự kiểm tra — cho link dán thẳng /roadmap/test/doc-01.
 * Đường chính là popup trên /roadmap; trang này chỉ để link cũ không chết.
 */
export default function TestPageClient({ item, tool }: { item: RoadmapItem; tool: string }) {
  const router = useRouter();
  const Session = TEST_SESSIONS[tool];
  if (!Session) return null;
  return (
    <Session
      variant="page"
      itemKey={item.item_key}
      itemLabel={item.label}
      passWhen={item.pass_when}
      threshold={item}
      onClose={() => router.push(`/roadmap?skill=${item.skill_code}`)}
    />
  );
}
