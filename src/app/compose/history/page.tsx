import Link from 'next/link';
import { ArrowLeft, BookOpenText } from 'lucide-react';
import { requireUserId } from '@/lib/current-user';
import { compositionsDb } from '@/lib/compositions/db';
import CompositionHistoryRow from '@/components/CompositionHistoryRow';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function CompositionHistoryPage() {
  const userId = await requireUserId();
  const compositions = await compositionsDb.listByUser(userId, { limit: 50 });

  return (
    <div>
      <Link
        href="/compose"
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
        <ArrowLeft size={14} /> Quay lại
      </Link>

      <h1
        style={{
          fontFamily: 'var(--v-font-head)',
          fontWeight: 900,
          fontSize: 'var(--v-text-3xl)',
          letterSpacing: 'var(--v-tracking-tight)',
          margin: '0 0 18px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          color: 'var(--v-ink)',
        }}
      >
        <BookOpenText size={24} style={{ color: 'var(--v-blue)' }} /> Lịch sử viết bài
      </h1>

      {compositions.length === 0 ? (
        <div
          style={{
            padding: 40,
            textAlign: 'center',
            color: 'var(--v-muted)',
            background: 'var(--v-panel)',
            border: '1px dashed var(--v-border)',
            borderRadius: 'var(--v-radius-md)',
            fontFamily: 'var(--v-font-body)',
          }}
        >
          Chưa có bài viết nào.{' '}
          <Link
            href="/compose"
            style={{
              color: 'var(--v-primary)',
              fontWeight: 800,
              textDecoration: 'underline',
            }}
          >
            Viết bài đầu tiên
          </Link>
          .
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
          {compositions.map((c) => (
            <CompositionHistoryRow key={c.id} composition={c} />
          ))}
        </ul>
      )}
    </div>
  );
}
