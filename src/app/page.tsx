import { redirect } from 'next/navigation';
import { getCurrentUserId } from '@/lib/current-user';
import BunLanding from '@/components/landing/BunLanding';
import BunLandingMobile from '@/components/landing-mobile/BunLandingMobile';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export default async function LandingPage() {
  const userId = await getCurrentUserId();
  if (userId) redirect('/dashboard');
  return (
    <>
      <div className="hidden md:block">
        <BunLanding />
      </div>
      <div className="md:hidden">
        <BunLandingMobile />
      </div>
    </>
  );
}
