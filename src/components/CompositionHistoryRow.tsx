'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import type { Composition } from '@/lib/types';

interface Props {
  composition: Composition;
}

export default function CompositionHistoryRow({ composition }: Props) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (deleting) return;
    if (!confirm('Xoá bài viết này? Không thể khôi phục.')) return;
    setDeleting(true);
    const res = await fetch(`/api/compositions/${composition.id}`, {
      method: 'DELETE',
    });
    if (res.ok) {
      router.refresh();
    } else {
      alert('Xoá thất bại — thử lại nhé.');
      setDeleting(false);
    }
  }

  const preview = composition.content.slice(0, 140);
  const dateStr = new Date(composition.created_at).toLocaleString('vi-VN', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
  const sourceLabel = composition.source === 'today' ? 'Hôm nay' : 'Bộ từ khác';

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
        href={`/compose/history/${composition.id}`}
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
              display: 'flex',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 8,
              fontSize: 'var(--v-text-xs)',
              color: 'var(--v-muted)',
              fontFamily: 'var(--v-font-body)',
              fontWeight: 700,
              marginBottom: 6,
            }}
          >
            <span>{dateStr}</span>
            <span>·</span>
            <span>{sourceLabel}</span>
            <span>·</span>
            <span>{composition.pool_word_ids.length} từ</span>
            {composition.coherence_score !== null && (
              <>
                <span>·</span>
                <ScorePill score={composition.coherence_score} passed={composition.passed} />
              </>
            )}
          </div>
          <div
            style={{
              fontFamily: 'var(--v-font-body)',
              fontSize: 'var(--v-text-md)',
              color: 'var(--v-ink)',
              lineHeight: 1.5,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {preview}
            {composition.content.length > 140 ? '…' : ''}
          </div>
        </div>
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

function ScorePill({ score, passed }: { score: number; passed: boolean }) {
  const color =
    score >= 7 ? 'var(--v-primary)' : score >= 5 ? 'var(--v-orange)' : 'var(--v-red)';
  return (
    <span
      style={{
        padding: '1px 8px',
        borderRadius: 999,
        background: passed ? 'rgba(122,193,67,0.16)' : 'rgba(245,166,35,0.12)',
        color,
        fontSize: 'var(--v-text-xs)',
        fontWeight: 800,
      }}
    >
      {score}/10
    </span>
  );
}
