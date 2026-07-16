import Link from 'next/link';
import { ArrowLeft, Folder } from 'lucide-react';
import DeckList from '@/components/DeckList';
import MDecksList from '@/components/app-mobile/screens/MDecksList';
import RefreshIpaButton from '@/components/RefreshIpaButton';
import DeckImportButton from '@/components/DeckImportButton';
import RefreshAudioButton from '@/components/deck-detail/RefreshAudioButton';
import { requireUserId } from '@/lib/current-user';
import { flashcardsDb } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function DecksPage() {
  // Slim id+english list for the all-decks "Cập nhật phát âm" button — full
  // card rows would bloat the RSC payload at collocation-deck scale.
  const userId = await requireUserId();
  const cards = await flashcardsDb.getAll(userId, 10_000);
  const slim = cards.map((c) => ({ id: c.id, english: c.english }));

  return (
    <>
    <div className="md:hidden">
      <MDecksList />
    </div>
    <div className="hidden md:block">
      <Link
        href="/dashboard"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          fontSize: 'var(--v-text-sm)',
          color: 'var(--v-muted)',
          textDecoration: 'none',
          marginBottom: 12,
        }}
      >
        <ArrowLeft size={14} /> Dashboard
      </Link>

      <h1
        style={{
          fontFamily: 'var(--v-font-head)',
          fontWeight: 900,
          fontSize: 'var(--v-text-3xl)',
          letterSpacing: 'var(--v-tracking-tight)',
          margin: '0 0 6px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          color: 'var(--v-ink)',
        }}
      >
        <Folder size={24} style={{ color: 'var(--v-primary)' }} /> Bộ từ
      </h1>
      <p
        style={{
          color: 'var(--v-muted)',
          margin: '0 0 16px',
          fontFamily: 'var(--v-font-body)',
          fontSize: 'var(--v-text-md)',
        }}
      >
        Phân loại từ vựng theo chủ đề
      </p>

      <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <DeckImportButton />
        <RefreshIpaButton />
        <RefreshAudioButton cards={slim} />
      </div>

      <DeckList />
    </div>
    </>
  );
}
