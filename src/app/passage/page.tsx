import Link from 'next/link';
import { ArrowLeft, Newspaper, Plus, BookOpen } from 'lucide-react';
import { requireUserId } from '@/lib/current-user';
import { passagesDb } from '@/lib/passages/db';
import PassageLibraryRow from '@/components/PassageLibraryRow';
import Mascot from '@/components/common/Mascot';
import MArticle from '@/components/app-mobile/screens/MArticle';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function PassageLibraryPage() {
  const userId = await requireUserId();
  const passages = await passagesDb.listByUser(userId, { limit: 50 });

  return (
    <>
    <div className="md:hidden">
      <MArticle />
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

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          marginBottom: 18,
          flexWrap: 'wrap',
        }}
      >
        <h1
          style={{
            fontFamily: 'var(--v-font-head)',
            fontWeight: 900,
            fontSize: 'var(--v-text-3xl)',
            letterSpacing: 'var(--v-tracking-tight)',
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            color: 'var(--v-ink)',
          }}
        >
          <Newspaper size={24} style={{ color: 'var(--v-teal)' }} /> Bài đọc
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <Link
            href="/read-once"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '10px 16px',
              borderRadius: 'var(--v-radius-md)',
              background: 'var(--v-surface)',
              border: '1px solid var(--v-border)',
              color: 'var(--v-ink)',
              fontFamily: 'var(--v-font-body)',
              fontWeight: 800,
              fontSize: 'var(--v-text-md)',
              textDecoration: 'none',
              boxShadow: 'var(--v-shadow-sm)',
            }}
          >
            <BookOpen size={16} /> Đọc nhanh
          </Link>
          <Link
            href="/passage/new"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '10px 16px',
              borderRadius: 'var(--v-radius-md)',
              background: 'var(--v-primary)',
              color: '#fff',
              fontFamily: 'var(--v-font-body)',
              fontWeight: 800,
              fontSize: 'var(--v-text-md)',
              textDecoration: 'none',
              boxShadow: 'var(--v-shadow-sm)',
            }}
          >
            <Plus size={16} /> Tạo bài mới
          </Link>
        </div>
      </div>

      {passages.length === 0 ? (
        <div
          style={{
            padding: 40,
            textAlign: 'center',
            background: 'var(--v-panel)',
            border: '1px dashed var(--v-border)',
            borderRadius: 'var(--v-radius-md)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 14,
          }}
        >
          <Mascot pose="idle" size={88} />
          <div
            style={{
              fontFamily: 'var(--v-font-head)',
              fontSize: 'var(--v-text-lg)',
              fontWeight: 800,
              color: 'var(--v-ink)',
            }}
          >
            Chưa có bài nào
          </div>
          <div style={{ color: 'var(--v-muted)', maxWidth: 380 }}>
            Paste một đoạn văn tiếng Anh (≥ 100 ký tự) để Bún cùng bạn luyện đọc nhé.
          </div>
          <Link
            href="/passage/new"
            style={{
              padding: '10px 18px',
              borderRadius: 'var(--v-radius-md)',
              background: 'var(--v-primary)',
              color: '#fff',
              fontFamily: 'var(--v-font-body)',
              fontWeight: 800,
              fontSize: 'var(--v-text-md)',
              textDecoration: 'none',
              boxShadow: 'var(--v-shadow-sm)',
            }}
          >
            Tạo bài đầu tiên
          </Link>
        </div>
      ) : (
        <ul
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            padding: 0,
            margin: 0,
          }}
        >
          {passages.map((p) => (
            <PassageLibraryRow key={p.id} passage={p} />
          ))}
        </ul>
      )}
    </div>
    </>
  );
}
