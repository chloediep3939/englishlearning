import Link from 'next/link';
import { ArrowLeft, Folder } from 'lucide-react';
import DeckList from '@/components/DeckList';

export default function DecksPage() {
  return (
    <div>
      <Link
        href="/"
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
          margin: '0 0 24px',
          fontFamily: 'var(--v-font-body)',
          fontSize: 'var(--v-text-md)',
        }}
      >
        Phân loại từ vựng theo chủ đề
      </p>

      <DeckList />
    </div>
  );
}
