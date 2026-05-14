'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, BookOpenText, History as HistoryIcon } from 'lucide-react';
import ComposePoolPicker, { type ComposePoolSelection } from '@/components/ComposePoolPicker';
import ComposeEditor from '@/components/ComposeEditor';
import ComposeFeedback from '@/components/ComposeFeedback';
import LoadingState from '@/components/LoadingState';
import { REDO_STORAGE_KEY, type ComposeRedoPayload } from '@/lib/compositions/redo';
import type { Composition } from '@/lib/types';

type Phase = 'picker' | 'editing' | 'feedback';

export default function ComposePage() {
  const [phase, setPhase] = useState<Phase>('picker');
  const [pool, setPool] = useState<ComposePoolSelection | null>(null);
  const [composition, setComposition] = useState<Composition | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // sessionStorage redo handoff: if the history detail page set a payload,
  // pick it up and jump straight to the editor.
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(REDO_STORAGE_KEY);
      if (raw) {
        sessionStorage.removeItem(REDO_STORAGE_KEY);
        const payload = JSON.parse(raw) as ComposeRedoPayload;
        if (
          payload &&
          Array.isArray(payload.words) &&
          payload.words.length > 0 &&
          (payload.source === 'today' || payload.source === 'deck')
        ) {
          setPool(payload);
          setPhase('editing');
        }
      }
    } catch {
      /* ignore malformed payload */
    }
    setHydrated(true);
  }, []);

  if (!hydrated) {
    return <LoadingState message="Bún đang chuẩn bị bài viết…" />;
  }

  return (
    <div>
      <Link
        href="/"
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
          marginBottom: 8,
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
          <BookOpenText size={24} style={{ color: 'var(--v-blue)' }} /> Viết bài
        </h1>
        <Link
          href="/compose/history"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 14px',
            borderRadius: 'var(--v-radius-md)',
            background: 'var(--v-surface)',
            border: '1px solid var(--v-border)',
            color: 'var(--v-ink)',
            fontFamily: 'var(--v-font-body)',
            fontWeight: 700,
            fontSize: 'var(--v-text-sm)',
            textDecoration: 'none',
          }}
        >
          <HistoryIcon size={14} /> Lịch sử
        </Link>
      </div>

      {phase === 'picker' && (
        <>
          <p
            style={{
              color: 'var(--v-muted)',
              margin: '0 0 18px',
              fontFamily: 'var(--v-font-body)',
              fontSize: 'var(--v-text-md)',
            }}
          >
            Chọn nhóm từ bạn muốn dùng, rồi viết một đoạn ngắn. Bún sẽ chấm điểm và gợi ý chỗ cần sửa.
          </p>
          <ComposePoolPicker
            onConfirm={(sel) => {
              setPool(sel);
              setPhase('editing');
            }}
          />
        </>
      )}

      {phase === 'editing' && pool && (
        <ComposeEditor
          pool={pool}
          onSubmitted={(c) => {
            setComposition(c);
            setPhase('feedback');
          }}
          onCancel={() => setPhase('picker')}
        />
      )}

      {phase === 'feedback' && composition && (
        <ComposeFeedback
          composition={composition}
          onNew={() => {
            setComposition(null);
            setPool(null);
            setPhase('picker');
          }}
          onRewriteSamePool={() => {
            setComposition(null);
            setPhase('editing');
          }}
        />
      )}
    </div>
  );
}
