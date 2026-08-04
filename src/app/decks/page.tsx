import Link from 'next/link';
import { ArrowLeft, FileDown, Folder } from 'lucide-react';
import DeckList from '@/components/DeckList';
import MDecksList from '@/components/app-mobile/screens/MDecksList';
import DeckImportButton from '@/components/DeckImportButton';
import DeckCreateButton from '@/components/DeckCreateButton';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function DecksPage() {
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

      {/* Title row — Import / JSON mẫu sit on the same line, right-aligned */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <DeckCreateButton />
          <DeckImportButton />
          {/* Static sample of the import format (served from /public) — each
              card carries 3 en+vi examples so imports feed "Học câu" too. */}
          <a
            href="/deck-sample.json"
            download="deck-sample.json"
            title="Tải file JSON mẫu đúng định dạng import (mỗi từ 3 ví dụ en+vi)"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
              background: 'var(--v-surface)',
              color: 'var(--v-ink-soft)',
              border: '1px solid var(--v-border)',
              borderRadius: 'var(--v-radius-md)',
              boxShadow: 'var(--v-shadow-sm)',
              fontFamily: 'var(--v-font-head)',
              fontWeight: 800,
              fontSize: 'var(--v-text-sm)',
              textDecoration: 'none',
            }}
          >
            <FileDown size={13} /> JSON mẫu
          </a>
        </div>
      </div>
      <p
        style={{
          color: 'var(--v-muted)',
          margin: '0 0 20px',
          fontFamily: 'var(--v-font-body)',
          fontSize: 'var(--v-text-md)',
        }}
      >
        Phân loại từ vựng theo chủ đề
      </p>

      <DeckList />
    </div>
    </>
  );
}
