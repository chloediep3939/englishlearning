'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Mic } from 'lucide-react';
import QuizSetup, { type QuizMode } from '@/components/QuizSetup';
import PronounceSession from '@/components/PronounceSession';
import LoadingState from '@/components/common/LoadingState';
import { apiJson } from '@/lib/common/api-json';
import type { Flashcard, FlashcardSettings } from '@/lib/types';

type Phase = 'setup' | 'loading' | 'session';
type PronounceMode = 'all';

const MODES: QuizMode<PronounceMode>[] = [
  {
    value: 'all',
    label: 'Đọc to từ tiếng Anh',
    description: 'Bún nghe và chấm phát âm bằng micro',
    icon: <Mic size={16} />,
  },
];

export default function PronouncePage() {
  const [phase, setPhase] = useState<Phase>('setup');
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [maxAttempts, setMaxAttempts] = useState(3);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    apiJson<FlashcardSettings>('/api/settings')
      .then((s) => {
        if (typeof s.f1_max_attempts === 'number') setMaxAttempts(s.f1_max_attempts);
      })
      .catch(() => {/* fall back to default 3 */});
  }, []);

  async function handleStart({ count, deckId }: { mode: PronounceMode; count: number; deckId: number | null }) {
    setPhase('loading');
    setLoadError(null);
    try {
      const q = new URLSearchParams();
      q.set('limit', String(count));
      if (deckId !== null) q.set('deck_id', String(deckId));
      const res = await fetch(`/api/cards?${q.toString()}`);
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || 'Không tải được thẻ.');
      }
      const data = (await res.json()) as { cards?: Flashcard[] };
      const fetched = data.cards ?? [];
      if (fetched.length === 0) {
        setLoadError('Bộ từ này chưa có thẻ nào. Hãy thêm từ trước nhé!');
        setPhase('setup');
        return;
      }
      setCards(fetched);
      setPhase('session');
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Lỗi không xác định.');
      setPhase('setup');
    }
  }

  function handleFinish() {
    setPhase('setup');
    setCards([]);
  }

  if (phase === 'loading') {
    return <LoadingState message="Bún đang chuẩn bị thẻ…" />;
  }

  if (phase === 'session') {
    return (
      <PronounceSession
        cards={cards}
        maxAttempts={maxAttempts}
        onFinish={handleFinish}
      />
    );
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
        <Mic size={24} style={{ color: 'var(--v-red)' }} /> Luyện đọc
      </h1>
      <p
        style={{
          color: 'var(--v-muted)',
          margin: '0 0 20px',
          fontFamily: 'var(--v-font-body)',
          fontSize: 'var(--v-text-md)',
        }}
      >
        Bún sẽ giúp bạn luyện phát âm từng từ. Nói rõ vào micro nha!
      </p>

      {loadError && (
        <div
          style={{
            padding: '10px 14px',
            background: 'rgba(255,87,87,0.08)',
            border: '1px solid rgba(255,87,87,0.25)',
            borderRadius: 'var(--v-radius-md)',
            color: 'var(--v-red)',
            fontSize: 'var(--v-text-md)',
            marginBottom: 16,
            maxWidth: 720,
          }}
        >
          {loadError}
        </div>
      )}

      <QuizSetup<PronounceMode>
        title="Bắt đầu luyện đọc"
        accent="var(--v-red)"
        modes={MODES}
        countOptions={[5, 10, 20, 30]}
        defaultCount={10}
        defaultMode="all"
        onStart={handleStart}
        startLabel="BẮT ĐẦU NGHE"
      />
    </div>
  );
}
