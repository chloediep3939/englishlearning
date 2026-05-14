import { notFound } from 'next/navigation';
import { requireUserId } from '@/lib/current-user';
import { compositionsDb } from '@/lib/compositions/db';
import { flashcardsDb } from '@/lib/db';
import CompositionDetail from '@/components/CompositionDetail';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const userId = await requireUserId();
  const { id } = await params;
  const n = Number(id);
  if (!Number.isInteger(n) || n <= 0) notFound();

  const composition = await compositionsDb.getById(userId, n);
  if (!composition) notFound();

  // Resolve pool words for the "Viết lại với pool này" handoff. Some IDs may
  // have been deleted since — getByIds silently drops missing ones, and the
  // detail component surfaces the count.
  const poolWords = await flashcardsDb.getByIds(userId, composition.pool_word_ids);

  return <CompositionDetail composition={composition} poolWords={poolWords} />;
}
