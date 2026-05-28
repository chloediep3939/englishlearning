'use client';

import { useState } from 'react';
import { Volume2, Loader2 } from 'lucide-react';
import type { Flashcard } from '@/lib/types';
import { apiJson } from '@/lib/common/api-json';

interface RefreshAudioResponse {
  ok: boolean;
  ipa: string | null;
  failed: boolean;
  word: string;
  card: Flashcard | null;
}

interface Progress {
  total: number;
  done: number;
  ok: number;
  failed: number;
  failedWords: string[];
}

interface Props {
  cards: Flashcard[];
  /** Swap the refreshed card into the parent's state — the new `updated_at`
   *  also busts the audio cache so the new clip plays immediately. */
  onCardUpdated: (card: Flashcard) => void;
  /** Style override so the host can fit the button into its header row. */
  style?: React.CSSProperties;
}

// Same concurrency as bulk import — high enough to feel fast, low enough to
// stay polite with Oxford (1 page fetch + 1 mp3 fetch per card).
const PARALLELISM = 5;

/**
 * Per-deck "Cập nhật phát âm": re-fetches the Oxford US pronunciation for every
 * card in the deck, 5 in parallel. A compact header pill (matching
 * DeckExportButton) that shows live progress in the label and a result summary
 * — listing any words whose audio couldn't be fetched — beside it.
 */
export default function RefreshAudioButton({ cards, onCardUpdated, style }: Props) {
  const [progress, setProgress] = useState<Progress | null>(null);

  if (cards.length === 0) return null;

  const running = progress !== null && progress.done < progress.total;
  const finished = progress !== null && progress.done >= progress.total;

  async function handleRefresh() {
    if (running) return;
    const targets = cards.slice();
    setProgress({ total: targets.length, done: 0, ok: 0, failed: 0, failedWords: [] });

    let cursor = 0;
    async function worker() {
      while (cursor < targets.length) {
        const card = targets[cursor++];
        try {
          const data = await apiJson<RefreshAudioResponse>(
            `/api/cards/${card.id}/refresh-audio`,
            { method: 'POST' },
          );
          if (data.card) onCardUpdated(data.card);
          setProgress((p) =>
            p
              ? {
                  ...p,
                  done: p.done + 1,
                  ok: p.ok + (data.ok ? 1 : 0),
                  failed: p.failed + (data.ok ? 0 : 1),
                  failedWords: data.ok ? p.failedWords : [...p.failedWords, data.word],
                }
              : p,
          );
        } catch (err) {
          console.error('[refresh audio] error:', err);
          setProgress((p) =>
            p
              ? {
                  ...p,
                  done: p.done + 1,
                  failed: p.failed + 1,
                  failedWords: [...p.failedWords, card.english],
                }
              : p,
          );
        }
      }
    }

    const workers = Array.from(
      { length: Math.min(PARALLELISM, targets.length) },
      () => worker(),
    );
    await Promise.allSettled(workers);
  }

  return (
    <>
      <button
        type="button"
        onClick={handleRefresh}
        disabled={running}
        title="Tải lại phát âm Oxford (giọng Mỹ) cho cả bộ"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '6px 10px',
          background: 'var(--v-surface)',
          color: 'var(--v-ink-soft)',
          border: '1px solid var(--v-border)',
          borderRadius: 'var(--v-radius-md)',
          boxShadow: 'var(--v-shadow-sm)',
          fontFamily: 'var(--v-font-head)',
          fontWeight: 800,
          fontSize: 'var(--v-text-xs)',
          cursor: running ? 'wait' : 'pointer',
          ...style,
        }}
      >
        {running ? (
          <Loader2 size={12} style={{ animation: 'v-spin 1s linear infinite' }} />
        ) : (
          <Volume2 size={12} />
        )}
        {running ? `Đang cập nhật ${progress!.done}/${progress!.total}` : 'Cập nhật phát âm'}
      </button>
      {finished && (
        <span
          style={{
            fontFamily: 'var(--v-font-body)',
            fontSize: 'var(--v-text-xs)',
            fontWeight: 700,
            color: 'var(--v-ink-soft)',
          }}
        >
          <span style={{ color: 'var(--v-primary)' }}>OK {progress!.ok}</span>
          {progress!.failed > 0 && (
            <>
              {' · '}
              <span style={{ color: 'var(--v-red)' }}>lỗi {progress!.failed}</span>
              {`: ${progress!.failedWords.join(', ')}`}
            </>
          )}
        </span>
      )}
    </>
  );
}
