import { notFound } from 'next/navigation';
import { requireUserId } from '@/lib/current-user';
import { pteTemplatesDb, pteTemplateFillsDb } from '@/lib/templates/db';
import { userSettingsDb } from '@/lib/db';
import TemplateDetailClient from '@/components/templates/TemplateDetailClient';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function TemplateDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  const { id } = await params;
  const templateId = Number(id);
  if (!Number.isInteger(templateId) || templateId <= 0) notFound();

  const template = await pteTemplatesDb.getById(userId, templateId);
  if (!template) notFound();

  const [fills, settings] = await Promise.all([
    pteTemplateFillsDb.listByTemplate(userId, templateId),
    userSettingsDb.getFlashcardSettings(userId),
  ]);

  return (
    <TemplateDetailClient
      template={template}
      fills={fills}
      initialRate={settings.reading_speed}
      initialAuto={settings.reading_auto_continue}
    />
  );
}
