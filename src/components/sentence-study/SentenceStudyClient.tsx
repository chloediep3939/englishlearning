'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import SentenceStudySetup, { type SentenceStartOpts } from './SentenceStudySetup';
import SentenceStudySession from './SentenceStudySession';
import { apiJson } from '@/lib/common/api-json';
import type { FlashcardDeckWithCounts, SentenceStudyItem, SentenceStudyResponse } from '@/lib/types';

interface Props {
  decks: FlashcardDeckWithCounts[];
  defaultReviewLimit: number;
  defaultNewLimit: number;
}

type Stage = 'setup' | 'session';

/**
 * "Học câu" flow — same 2-step state machine as StudyClient: setup
 * (mode/deck-scope/limits/example number) → Anki-loop session over
 * sentences. The queue is built server-side by GET
 * /api/sentence-drill/session; this client never re-derives it.
 */
export default function SentenceStudyClient({ decks, defaultReviewLimit, defaultNewLimit }: Props) {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>('setup');
  const [items, setItems] = useState<SentenceStudyItem[]>([]);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStart = useCallback(async (opts: SentenceStartOpts) => {
    setStarting(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        exampleIndex: String(opts.exampleIndex),
        mode: opts.mode,
        reviewLimit: String(opts.reviewLimit),
        newLimit: String(opts.newLimit),
      });
      if (opts.deckIds !== null) params.set('deckIds', opts.deckIds.join(','));
      const res = await apiJson<SentenceStudyResponse>(`/api/sentence-drill/session?${params}`);
      const queue = res.items ?? [];
      if (queue.length === 0) {
        setError('Không có câu nào cho lựa chọn này — thử đổi số câu, chế độ hoặc bộ từ nha.');
        return;
      }
      setItems(queue);
      setStage('session');
    } catch {
      setError('Không tải được phiên học — thử lại nha.');
    } finally {
      setStarting(false);
    }
  }, []);

  const handleAnotherSession = useCallback(() => {
    router.refresh();
    setItems([]);
    setStage('setup');
  }, [router]);

  if (stage === 'session') {
    return <SentenceStudySession items={items} onAnotherSession={handleAnotherSession} />;
  }

  return (
    <div>
      {error && (
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
          {error}
        </div>
      )}
      <SentenceStudySetup
        decks={decks}
        defaultReviewLimit={defaultReviewLimit}
        defaultNewLimit={defaultNewLimit}
        starting={starting}
        onStart={handleStart}
      />
    </div>
  );
}
