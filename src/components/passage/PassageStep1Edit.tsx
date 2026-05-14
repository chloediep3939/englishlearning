'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, Trash2, ExternalLink } from 'lucide-react';
import PassageForm from '@/components/PassageForm';
import type { Passage } from '@/lib/types';

interface Props {
  passage: Passage;
  onSaved: () => void | Promise<void>;
}

export default function PassageStep1Edit({ passage, onSaved }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleSubmit(values: {
    title: string;
    content: string;
    source_label: string;
    source_url: string;
  }) {
    const res = await fetch(`/api/passages/${passage.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: values.title || passage.title,
        content: values.content,
        source_label: values.source_label || null,
        source_url: values.source_url || null,
      }),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(data.error ?? 'Không lưu được.');
    }
    await onSaved();
    setEditing(false);
  }

  async function handleDelete() {
    if (deleting) return;
    if (!confirm(`Xoá bài "${passage.title}"? Không thể khôi phục.`)) return;
    setDeleting(true);
    const res = await fetch(`/api/passages/${passage.id}`, { method: 'DELETE' });
    if (res.ok) {
      router.push('/passage');
    } else {
      alert('Xoá thất bại — thử lại nhé.');
      setDeleting(false);
    }
  }

  if (editing) {
    return (
      <PassageForm
        initialValues={{
          title: passage.title,
          content: passage.content,
          source_label: passage.source_label ?? '',
          source_url: passage.source_url ?? '',
        }}
        onSubmit={handleSubmit}
        onCancel={() => setEditing(false)}
        submitLabel="Lưu thay đổi"
      />
    );
  }

  const dateStr = new Date(passage.created_at).toLocaleString('vi-VN', {
    dateStyle: 'long',
    timeStyle: 'short',
  });

  return (
    <div
      style={{
        background: 'var(--v-panel)',
        border: '1px solid var(--v-border)',
        borderRadius: 'var(--v-radius-md)',
        padding: 20,
        boxShadow: 'var(--v-shadow-sm)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 12,
          marginBottom: 8,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2
            style={{
              margin: 0,
              fontFamily: 'var(--v-font-head)',
              fontWeight: 900,
              fontSize: 'var(--v-text-2xl)',
              color: 'var(--v-ink)',
            }}
          >
            {passage.title}
          </h2>
          {(passage.source_label || passage.source_url) && (
            <div
              style={{
                marginTop: 6,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 'var(--v-text-sm)',
                color: 'var(--v-muted)',
                fontFamily: 'var(--v-font-body)',
                fontWeight: 700,
              }}
            >
              {passage.source_label && (
                <span
                  style={{
                    padding: '2px 8px',
                    borderRadius: 999,
                    background: 'var(--v-bg)',
                    border: '1px solid var(--v-border)',
                  }}
                >
                  {passage.source_label}
                </span>
              )}
              {passage.source_url && (
                <a
                  href={passage.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 3,
                    color: 'var(--v-primary)',
                    textDecoration: 'none',
                    fontWeight: 700,
                  }}
                >
                  Nguồn <ExternalLink size={12} />
                </a>
              )}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          <button
            type="button"
            onClick={() => setEditing(true)}
            style={iconBtn}
          >
            <Pencil size={14} /> Sửa
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            style={{
              ...iconBtn,
              color: 'var(--v-red)',
              borderColor: 'rgba(255,87,87,0.40)',
              background: 'rgba(255,87,87,0.06)',
              opacity: deleting ? 0.5 : 1,
              cursor: deleting ? 'not-allowed' : 'pointer',
            }}
          >
            <Trash2 size={14} /> Xoá
          </button>
        </div>
      </div>

      <div
        style={{
          padding: '14px 16px',
          background: 'var(--v-bg)',
          border: '1px solid var(--v-border)',
          borderRadius: 'var(--v-radius-sm)',
          fontFamily: 'var(--v-font-body)',
          fontSize: 'var(--v-text-md)',
          color: 'var(--v-ink)',
          lineHeight: 1.7,
          whiteSpace: 'pre-wrap',
          maxHeight: 560,
          overflowY: 'auto',
          marginBottom: 12,
        }}
      >
        {passage.content}
      </div>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 10,
          fontSize: 'var(--v-text-xs)',
          color: 'var(--v-muted)',
          fontFamily: 'var(--v-font-body)',
          fontWeight: 700,
        }}
      >
        <span>{passage.word_count.toLocaleString('vi-VN')} từ</span>
        <span>·</span>
        <span>{passage.char_count.toLocaleString('vi-VN')} ký tự</span>
        <span>·</span>
        <span>Tạo {dateStr}</span>
      </div>
    </div>
  );
}

const iconBtn: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 5,
  padding: '6px 12px',
  borderRadius: 'var(--v-radius-sm)',
  border: '1px solid var(--v-border)',
  background: 'var(--v-surface)',
  color: 'var(--v-ink)',
  fontFamily: 'var(--v-font-body)',
  fontWeight: 700,
  fontSize: 'var(--v-text-xs)',
  cursor: 'pointer',
};
