'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Trash2, Repeat } from 'lucide-react';
import ComposeFeedback from './ComposeFeedback';
import { REDO_STORAGE_KEY, type ComposeRedoPayload } from '@/lib/compositions/redo';
import type { Composition, Flashcard } from '@/lib/types';

interface Props {
  composition: Composition;
  /**
   * Pool words resolved server-side via flashcardsDb.getByIds. May be fewer
   * than composition.pool_word_ids if some cards have been deleted since.
   */
  poolWords: Flashcard[];
}

export default function CompositionDetail({ composition, poolWords }: Props) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  const missingCount =
    composition.pool_word_ids.length - poolWords.length;

  async function handleDelete() {
    if (deleting) return;
    if (!confirm('Xoá bài viết này? Không thể khôi phục.')) return;
    setDeleting(true);
    const res = await fetch(`/api/compositions/${composition.id}`, {
      method: 'DELETE',
    });
    if (res.ok) {
      router.push('/compose/history');
    } else {
      alert('Xoá thất bại — thử lại nhé.');
      setDeleting(false);
    }
  }

  function handleRedo() {
    if (poolWords.length === 0) {
      alert('Tất cả các từ trong pool đã bị xoá — không thể viết lại với pool này.');
      return;
    }
    const payload: ComposeRedoPayload = {
      source: composition.source,
      source_deck_id: composition.source_deck_id,
      words: poolWords,
    };
    try {
      sessionStorage.setItem(REDO_STORAGE_KEY, JSON.stringify(payload));
    } catch {
      /* ignore storage failure — navigation still falls through to picker */
    }
    router.push('/compose');
  }

  const extraFooter = (
    <>
      <button
        type="button"
        onClick={handleRedo}
        disabled={poolWords.length === 0 || deleting}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '10px 16px',
          borderRadius: 'var(--v-radius-md)',
          border: '1px solid var(--v-border)',
          background: 'var(--v-surface)',
          color: 'var(--v-ink)',
          fontFamily: 'var(--v-font-body)',
          fontWeight: 700,
          fontSize: 'var(--v-text-md)',
          cursor:
            poolWords.length === 0 || deleting ? 'not-allowed' : 'pointer',
          opacity: poolWords.length === 0 || deleting ? 0.5 : 1,
        }}
      >
        <Repeat size={14} /> Viết lại với pool này
      </button>
      <button
        type="button"
        onClick={handleDelete}
        disabled={deleting}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '10px 16px',
          borderRadius: 'var(--v-radius-md)',
          border: '1px solid rgba(255,87,87,0.40)',
          background: 'rgba(255,87,87,0.06)',
          color: 'var(--v-red)',
          fontFamily: 'var(--v-font-body)',
          fontWeight: 700,
          fontSize: 'var(--v-text-md)',
          cursor: deleting ? 'not-allowed' : 'pointer',
          opacity: deleting ? 0.5 : 1,
        }}
      >
        <Trash2 size={14} /> Xoá
      </button>
    </>
  );

  return (
    <div>
      <Link
        href="/compose/history"
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
        <ArrowLeft size={14} /> Lịch sử
      </Link>

      <div
        style={{
          fontFamily: 'var(--v-font-body)',
          color: 'var(--v-muted)',
          fontSize: 'var(--v-text-sm)',
          marginBottom: 12,
        }}
      >
        Bài viết ngày{' '}
        <strong style={{ color: 'var(--v-ink)' }}>
          {new Date(composition.created_at).toLocaleString('vi-VN', {
            dateStyle: 'long',
            timeStyle: 'short',
          })}
        </strong>
        {' · '}
        {composition.source === 'today' ? 'Pool hôm nay' : 'Pool từ deck'}
        {missingCount > 0 && (
          <>
            {' · '}
            <span style={{ color: 'var(--v-orange)', fontWeight: 700 }}>
              {missingCount} từ đã xoá
            </span>
          </>
        )}
      </div>

      <ComposeFeedback composition={composition} extraFooter={extraFooter} />
    </div>
  );
}
