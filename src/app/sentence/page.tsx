'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, PenLine } from 'lucide-react';
import QuizSetup, { type QuizMode } from '@/components/QuizSetup';
import SentenceSession from '@/components/SentenceSession';
import LoadingState from '@/components/LoadingState';
import type { Flashcard, FlashcardSettings } from '@/lib/types';

type Phase = 'setup' | 'loading' | 'session';
type SentenceModeValue = 'all';

const MODES: QuizMode<SentenceModeValue>[] = [
  {
    value: 'all',
    label: 'Viết 1 câu với từ',
    description: 'AI sẽ chấm xem bạn đã dùng từ đúng chưa',
    icon: <PenLine size={16} />,
  },
];

export default function SentencePage() {
  const [phase, setPhase] = useState<Phase>('setup');
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [timerSeconds, setTimerSeconds] = useState(60);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json() as Promise<FlashcardSettings>)
      .then((s) => {
        if (typeof s.f2_timer_seconds === 'number' && s.f2_timer_seconds >= 15) {
          setTimerSeconds(s.f2_timer_seconds);
        }
      })
      .catch(() => {/* fall back to default 60 */});
  }, []);

  async function handleStart({ count, deckId }: { mode: SentenceModeValue; count: number; deckId: number | null }) {
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
      // Shuffle for variety
      const shuffled = fetched.slice().sort(() => Math.random() - 0.5);
      setCards(shuffled);
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
      <SentenceSession
        cards={cards}
        timerSeconds={timerSeconds}
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
        <PenLine size={24} style={{ color: 'var(--v-orange)' }} /> Đặt câu
      </h1>
      <p
        style={{
          color: 'var(--v-muted)',
          margin: '0 0 20px',
          fontFamily: 'var(--v-font-body)',
          fontSize: 'var(--v-text-md)',
        }}
      >
        Bún cho bạn {timerSeconds} giây để viết 1 câu tiếng Anh có dùng từ. AI sẽ chấm cho bạn.
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

      <QuizSetup<SentenceModeValue>
        title="Bắt đầu đặt câu"
        accent="var(--v-orange)"
        modes={MODES}
        countOptions={[5, 10, 20, 30]}
        defaultCount={10}
        defaultMode="all"
        onStart={handleStart}
        startLabel="BẮT ĐẦU VIẾT"
      />
    </div>
  );
}
