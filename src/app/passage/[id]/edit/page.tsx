import { notFound } from 'next/navigation';
import { requireUserId } from '@/lib/current-user';
import { passagesDb } from '@/lib/passages/db';
import EditPassageClient from './EditPassageClient';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function EditPassagePage({ params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  const { id } = await params;
  const passageId = Number(id);
  if (!Number.isInteger(passageId) || passageId <= 0) notFound();

  const passage = await passagesDb.getById(userId, passageId);
  if (!passage) notFound();

  return (
    <EditPassageClient
      id={passageId}
      initial={{
        title: passage.title,
        content: passage.content,
        source_label: passage.source_label ?? '',
        source_url: passage.source_url ?? '',
      }}
    />
  );
}
