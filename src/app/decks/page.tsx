import Link from 'next/link';
import { ArrowLeft, Folder } from 'lucide-react';
import DeckList from '@/components/DeckList';
import MDecksList from '@/components/app-mobile/screens/MDecksList';
import RefreshIpaButton from '@/components/RefreshIpaButton';
import DeckImportButton from '@/components/DeckImportButton';

export default function DecksPage() {
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
      </div>

      <DeckList />
    </div>
    </>
  );
}
