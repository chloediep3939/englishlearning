import { redirect } from 'next/navigation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * The passage reader was replaced by the Read-Along / Karaoke reader at
 * /read/[id] (see src/doc/read-along.md). This route now redirects there so
 * existing links / bookmarks keep working.
 */
export default async function PassageDetailRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/read/${id}`);
}
