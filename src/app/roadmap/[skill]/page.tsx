import { redirect } from 'next/navigation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Trang riêng cho từng kỹ năng đã được thay bằng tab trên /roadmap.
// Giữ route này để link cũ (bookmark, link đã chia sẻ) không chết.
export default async function RoadmapSkillRedirect({
  params,
}: {
  params: Promise<{ skill: string }>;
}) {
  const { skill } = await params;
  redirect(`/roadmap?skill=${encodeURIComponent(skill)}`);
}
