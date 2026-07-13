'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, CheckCircle2, Pencil } from 'lucide-react';
import type { Passage } from '@/lib/types';

interface Props {
  passage: Passage;
}

export default function PassageLibraryRow({ passage }: Props) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  // Both the edit + delete controls live inside the row's <Link>, so they must
  // preventDefault/stopPropagation to avoid also navigating to the reader.
  function handleEdit(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    router.push(`/passage/${passage.id}/edit`);
  }

  async function handleDelete(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (deleting) return;
    if (!confirm(`Xoá bài "${passage.title}"? Không thể khôi phục.`)) return;
    setDeleting(true);
    const res = await fetch(`/api/passages/${passage.id}`, { method: 'DELETE' });
    if (res.ok) {
      router.refresh();
    } else {
      alert('Xoá thất bại — thử lại nhé.');
      setDeleting(false);
    }
  }

  const dateStr = new Date(passage.created_at).toLocaleString('vi-VN', {
    dateStyle: 'short',
    timeStyle: 'short',
  });

  const verdictColor =
    passage.level_verdict === 'just_right' ? 'var(--v-primary)'
    : passage.level_verdict === 'too_easy' ? 'var(--v-orange)'
    : passage.level_verdict === 'too_hard' ? 'var(--v-red)'
    : 'var(--v-muted)';

  return (
    <li
      style={{
        listStyle: 'none',
        background: 'var(--v-panel)',
        border: '1px solid var(--v-border)',
        borderRadius: 'var(--v-radius-md)',
        boxShadow: 'var(--v-shadow-sm)',
        opacity: deleting ? 0.5 : 1,
        transition: 'opacity 200ms var(--v-ease)',
      }}
    >
      <Link
        href={`/read/${passage.id}`}
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 12,
          padding: 14,
          textDecoration: 'none',
          color: 'inherit',
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontFamily: 'var(--v-font-head)',
              fontSize: 'var(--v-text-md)',
              fontWeight: 800,
              color: 'var(--v-ink)',
              marginBottom: 6,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {passage.title}
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 8,
              fontSize: 'var(--v-text-xs)',
              color: 'var(--v-muted)',
              fontFamily: 'var(--v-font-body)',
              fontWeight: 700,
            }}
          >
            <span>{dateStr}</span>
            <span>·</span>
            <span>{passage.word_count} từ</span>
            {passage.source_label && (
              <>
                <span>·</span>
                <span>{passage.source_label}</span>
              </>
            )}
            {passage.level_estimate && (
              <>
                <span>·</span>
                <span style={{ color: verdictColor, fontWeight: 800 }}>
                  {passage.level_estimate}
                </span>
              </>
            )}
            {passage.completed_at && (
              <>
                <span>·</span>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 3,
                    color: 'var(--v-primary)',
                  }}
                >
                  <CheckCircle2 size={12} /> Đã học
                </span>
              </>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={handleEdit}
          aria-label="Sửa"
          disabled={deleting}
          style={{
            padding: 8,
            borderRadius: 'var(--v-radius-sm)',
            border: '1px solid transparent',
            background: 'transparent',
            color: 'var(--v-muted)',
            cursor: deleting ? 'not-allowed' : 'pointer',
            flexShrink: 0,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Pencil size={16} />
        </button>
        <button
          type="button"
          onClick={handleDelete}
          aria-label="Xoá"
          disabled={deleting}
          style={{
            padding: 8,
            borderRadius: 'var(--v-radius-sm)',
            border: '1px solid transparent',
            background: 'transparent',
            color: 'var(--v-red)',
            cursor: deleting ? 'not-allowed' : 'pointer',
            flexShrink: 0,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Trash2 size={16} />
        </button>
      </Link>
    </li>
  );
}
