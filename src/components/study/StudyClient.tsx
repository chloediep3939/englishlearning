'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import FlashcardSession from '@/components/flashcard-session/FlashcardSession';
import { unifiedConfig } from '@/components/flashcard-session/configs';
import StudySetup, { type StudyStartOpts } from '@/components/study/StudySetup';
import type { SessionAudioSettings, SessionListeningSettings } from '@/components/flashcard-session/types';
import { apiJson } from '@/lib/common/api-json';
import type { Flashcard, FlashcardDeckWithCounts, StudySessionResponse } from '@/lib/types';

interface Props {
  decks: FlashcardDeckWithCounts[];
  defaultReviewLimit: number;
  defaultNewLimit: number;
  /** Reveal-autoplay settings, resolved server-side from FlashcardSettings. */
  audio: SessionAudioSettings;
  /** Listening-question settings, resolved server-side from FlashcardSettings. */
  listening: SessionListeningSettings;
}

type Stage = 'setup' | 'session';

/**
 * Unified /study flow (study-unified Part A): same-page 2-step state
 * machine — setup (mode/deck-scope/limits, no manual card picking) →
 * Anki-loop session. The queue is built server-side by
 * GET /api/study/session; this client never re-derives it.
 */
export default function StudyClient({ decks, defaultReviewLimit, defaultNewLimit, audio, listening }: Props) {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>('setup');
  const [sessionCards, setSessionCards] = useState<Flashcard[]>([]);
  const [recognition, setRecognition] = useState(false);
  const [durationMin, setDurationMin] = useState<number | null>(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStart = useCallback(async (opts: StudyStartOpts) => {
    setStarting(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        mode: opts.mode,
        group: opts.group,
        reviewLimit: String(opts.reviewLimit),
        newLimit: String(opts.newLimit),
      });
      if (opts.deckIds !== null) params.set('deckIds', opts.deckIds.join(','));
      const res = await apiJson<StudySessionResponse>(`/api/study/session?${params}`);
      const cards = res.cards ?? [];
      if (cards.length === 0) {
        setError('Không có thẻ nào cho lựa chọn này — thử đổi chế độ hoặc bộ từ nha.');
        return;
      }
      setSessionCards(cards);
      setRecognition(opts.group === 'recognition');
      setDurationMin(opts.durationMin);
      setStage('session');
    } catch {
      setError('Không tải được phiên học — thử lại nha.');
    } finally {
      setStarting(false);
    }
  }, []);

  const handleAnotherSession = useCallback(() => {
    // Back to setup; router.refresh() re-runs the server component so deck
    // counts passed down are fresh, and StudySetup refetches live counts on
    // mount anyway.
    router.refresh();
    setSessionCards([]);
    setStage('setup');
  }, [router]);

  if (stage === 'session') {
    return (
      <FlashcardSession
        cards={sessionCards}
        config={unifiedConfig}
        recognition={recognition}
        audio={audio}
        listening={listening}
        durationMin={durationMin}
        onAnotherSession={handleAnotherSession}
      />
    );
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
      <StudySetup
        decks={decks}
        defaultReviewLimit={defaultReviewLimit}
        defaultNewLimit={defaultNewLimit}
        starting={starting}
        onStart={handleStart}
      />
    </div>
  );
}
