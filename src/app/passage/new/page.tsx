'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Newspaper } from 'lucide-react';
import PassageForm from '@/components/PassageForm';

export default function NewPassagePage() {
  const router = useRouter();

  async function handleSubmit(values: {
    title: string;
    content: string;
    source_label: string;
    source_url: string;
  }) {
    const res = await fetch('/api/passages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: values.title || undefined,
        content: values.content,
        source_label: values.source_label || undefined,
        source_url: values.source_url || undefined,
      }),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(data.error ?? 'Không tạo được bài.');
    }
    const { id } = (await res.json()) as { id: number };
    router.push(`/passage/${id}`);
  }

  return (
    <div>
      <Link
        href="/passage"
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
        <ArrowLeft size={14} /> Thư viện
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
        <Newspaper size={24} style={{ color: 'var(--v-teal)' }} /> Tạo bài mới
      </h1>
      <p
        style={{
          color: 'var(--v-muted)',
          margin: '0 0 18px',
          fontFamily: 'var(--v-font-body)',
          fontSize: 'var(--v-text-md)',
        }}
      >
        Paste đoạn văn tiếng Anh (100–10.000 ký tự). Bún sẽ giúp bạn đọc, dịch, và luyện viết lại.
      </p>

      <PassageForm
        onSubmit={handleSubmit}
        onCancel={() => router.push('/passage')}
        submitLabel="Tạo bài"
        contentFocus
      />
    </div>
  );
}
