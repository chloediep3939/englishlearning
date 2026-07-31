import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

/**
 * study-unified A1: Ôn tập merged into the unified /study flow. Keep the
 * route as a server-side redirect so old links/bookmarks keep working.
 */
export default function ReviewPage() {
  redirect('/study');
}
