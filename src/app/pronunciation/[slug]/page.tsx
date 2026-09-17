export const dynamic = 'force-dynamic';

import { notFound } from 'next/navigation';
import { requireUserId } from '@/lib/current-user';
import { pronunciationProgressDb } from '@/lib/db';
import { getSound } from '@/lib/pronunciation/catalog';
import SoundDetailClient from '@/components/pronunciation/SoundDetailClient';

export default async function SoundDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const sound = getSound(slug);
  if (!sound) notFound();

  const userId = await requireUserId();
  const initialProgress = await pronunciationProgressDb.getBySlug(userId, slug);

  return <SoundDetailClient sound={sound} initialProgress={initialProgress} />;
}
