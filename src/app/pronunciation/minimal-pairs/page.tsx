export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { ArrowLeft, SplitSquareHorizontal } from 'lucide-react';
import MinimalPairClient from '@/components/pronunciation/MinimalPairClient';

export default function MinimalPairsPage() {
  return (
    <div style={{ width: '100%' }}>
      <Link
        href="/pronunciation"
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
        <ArrowLeft size={14} /> Tất cả các âm
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
        <SplitSquareHorizontal size={24} style={{ color: 'var(--v-purple)' }} /> So sánh cặp từ
      </h1>
      <p
        style={{
          color: 'var(--v-muted)',
          margin: '0 0 20px',
          fontFamily: 'var(--v-font-body)',
          fontSize: 'var(--v-text-md)',
        }}
      >
        Mình đọc một từ, bạn chọn xem đó là từ nào. Luyện tai phân biệt các âm dễ nhầm.
      </p>

      <MinimalPairClient />
    </div>
  );
}
