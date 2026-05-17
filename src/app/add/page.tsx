export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import AddTabs from '@/components/add/add-tabs';
import MAddWord from '@/components/app-mobile/screens/MAddWord';

export default function AddPage() {
  return (
    <>
    <div className="md:hidden">
      <MAddWord />
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
          color: 'var(--v-ink)',
        }}
      >
        Thêm từ <span style={{ color: 'var(--v-accent)' }}>mới</span>
      </h1>
      <p
        style={{
          color: 'var(--v-muted)',
          margin: '0 0 24px',
          fontFamily: 'var(--v-font-body)',
          fontSize: 'var(--v-text-md)',
        }}
      >
        Nhập từ tiếng Anh và nghĩa — Bún sẽ tự sinh IPA, ví dụ, ảnh, collocation.
      </p>

      <AddTabs />
    </div>
    </>
  );
}
