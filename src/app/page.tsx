import { redirect } from 'next/navigation';
import { getCurrentUserId } from '@/lib/current-user';
import BunLanding from '@/components/landing/BunLanding';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export default async function LandingPage() {
  const userId = await getCurrentUserId();
  if (userId) redirect('/dashboard');
  return <BunLanding />;
}
