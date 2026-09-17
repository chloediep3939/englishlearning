import { notFound } from 'next/navigation';
import { requireUserId } from '@/lib/current-user';
import { roadmapDb } from '@/lib/roadmap/db';
import TestPageClient from '@/components/roadmap/TestPageClient';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function RoadmapTestPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const userId = await requireUserId();

  // Lấy đúng một mục — listItems trả cả 141 mục nên lọc sau khi query.
  const items = await roadmapDb.listItems(userId);
  const item = items.find((i) => i.item_key === key);
  if (!item) notFound();

  // Mục chưa có bài trong app thì 404 còn hơn mở ra màn hình trống.
  const tests = await roadmapDb.listItemTests();
  const tool = tests[key];
  if (!tool || !['T1', 'T3', 'T3S', 'T8', 'T8S'].includes(tool)) notFound();

  return <TestPageClient item={item} tool={tool} />;
}
