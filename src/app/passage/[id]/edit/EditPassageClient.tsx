'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Pencil } from 'lucide-react';
import PassageForm, { type PassageFormValues } from '@/components/PassageForm';

interface Props {
  id: number;
  initial: PassageFormValues;
}

export default function EditPassageClient({ id, initial }: Props) {
  const router = useRouter();

  async function handleSubmit(values: PassageFormValues) {
    const res = await fetch(`/api/passages/${id}`, {
      method: 'PUT',
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
      throw new Error(data.error ?? 'Không lưu được thay đổi.');
    }
    // Editing the content invalidates cached translations server-side (BR1);
    // land the user back on the reader to re-read the updated passage.
    router.push(`/read/${id}`);
  }

  return (
    <div>
      <Link
        href={`/read/${id}`}
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
        <ArrowLeft size={14} /> Quay lại bài đọc
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
        <Pencil size={22} style={{ color: 'var(--v-teal)' }} /> Sửa bài đọc
      </h1>
      <p
        style={{
          color: 'var(--v-muted)',
          margin: '0 0 18px',
          fontFamily: 'var(--v-font-body)',
          fontSize: 'var(--v-text-md)',
        }}
      >
        Chỉnh nội dung, tiêu đề hoặc nguồn. Đổi nội dung sẽ dịch lại khi đọc.
      </p>

      <PassageForm
        initialValues={initial}
        onSubmit={handleSubmit}
        onCancel={() => router.push(`/read/${id}`)}
        submitLabel="Lưu thay đổi"
        contentFocus
      />
    </div>
  );
}
