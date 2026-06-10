'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import AudioButton from '../AudioButton';
import LoadingState from './LoadingState';
import POSPill from './POSPill';
import { apiJson } from '@/lib/common/api-json';
import type { Flashcard, ClozeSentence } from '@/lib/types';

interface Props {
  /** Card to re-study. The modal fetches the full card by id so callers in a
   *  quiz (which only hold a card_id + the current question) don't need the
   *  whole Flashcard on hand. */
  cardId: number;
  onClose: () => void;
}

/**
 * Read-only "review this word" popup shown mid-quiz (speed quiz + cloze) so
 * the learner can pause and re-study a word before moving on, instead of the
 * session racing to the next card. Deliberately NOT the deck-detail
 * CardDetailModal — that one is a management surface (edit / delete / regen)
 * which is the wrong affordance in the middle of a quiz.
 */
export default function WordReviewModal({ cardId, onClose }: Props) {
  const [card, setCard] = useState<Flashcard | null>(null);
  const [poolSentences, setPoolSentences] = useState<ClozeSentence[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const c = await apiJson<Flashcard>(`/api/cards/${cardId}`);
        if (cancelled) return;
        setCard(c);
        // Examples come from the shared cloze pool (same source CardDetailModal
        // uses); card.examples is the legacy fallback when the pool is empty.
        try {
          const data = await apiJson<{ sentences: ClozeSentence[] }>(
            `/api/cloze/pool?word=${encodeURIComponent(c.english)}&limit=2`,
          );
          if (!cancelled) setPoolSentences(data.sentences ?? []);
        } catch {
          if (!cancelled) setPoolSentences([]);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Không tải được từ.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [cardId]);

  // Esc to close
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(20,20,30,0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        padding: 20,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--v-surface)',
          border: '1px solid var(--v-border)',
          borderRadius: 'var(--v-radius-lg)',
          boxShadow: 'var(--v-shadow-lg)',
          padding: 24,
          width: '100%',
          maxWidth: 480,
          maxHeight: 'calc(100vh - 40px)',
          overflowY: 'auto',
        }}
      >
        {/* Close */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 4 }}>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            style={{
              width: 30,
              height: 30,
              padding: 0,
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--v-ink-soft)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {loading ? (
          <LoadingState message="Đang tải từ…" />
        ) : error || !card ? (
          <div
            style={{
              padding: '10px 14px',
              background: 'rgba(255,87,87,0.08)',
              border: '1px solid rgba(255,87,87,0.25)',
              borderRadius: 'var(--v-radius-md)',
              color: 'var(--v-red)',
              fontSize: 'var(--v-text-md)',
            }}
          >
            {error || 'Không tải được từ.'}
          </div>
        ) : (
          <>
            {/* Word + audio */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <h2
                style={{
                  fontFamily: 'var(--v-font-head)',
                  fontWeight: 900,
                  fontSize: 'var(--v-text-3xl)',
                  margin: 0,
                  color: 'var(--v-ink)',
                }}
              >
                {card.english}
              </h2>
              <AudioButton
                audioUrl={card.audio_url}
                fallbackText={card.english}
                size={36}
                showTts
                cardId={card.id}
                audioStatus={card.audio_us_status}
                audioVersion={card.updated_at}
              />
            </div>

            {card.ipa && (
              <div
                style={{
                  marginTop: 4,
                  fontFamily: 'var(--v-font-mono)',
                  fontSize: 'var(--v-text-md)',
                  color: 'var(--v-accent)',
                }}
              >
                {card.ipa}
              </div>
            )}

            <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <POSPill pos={card.part_of_speech} />
              <span
                style={{
                  fontFamily: 'var(--v-font-body)',
                  fontSize: 'var(--v-text-lg)',
                  fontWeight: 700,
                  color: 'var(--v-ink-soft)',
                }}
              >
                {card.vietnamese}
              </span>
            </div>

            {/* Image */}
            {card.image_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={card.image_url}
                alt={card.english}
                style={{
                  width: '100%',
                  maxHeight: 200,
                  objectFit: 'cover',
                  borderRadius: 'var(--v-radius-md)',
                  marginTop: 14,
                }}
              />
            )}

            {/* Notes */}
            {card.notes && (
              <Section title="Ghi chú">
                <p
                  style={{
                    margin: 0,
                    fontFamily: 'var(--v-font-body)',
                    fontSize: 'var(--v-text-sm)',
                    color: 'var(--v-ink-soft)',
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {card.notes}
                </p>
              </Section>
            )}

            {/* Examples — pool first, legacy card.examples fallback */}
            {(poolSentences.length > 0 || card.examples.length > 0) && (
              <Section title="Ví dụ">
                {poolSentences.length > 0
                  ? poolSentences.map((s, i) => (
                      <div key={s.id ?? i} style={exampleRowStyle()}>
                        <PoolSentence sentence={s.sentence} blankWord={s.blank_word} />
                      </div>
                    ))
                  : card.examples.map((ex, i) => (
                      <div key={i} style={exampleRowStyle()}>
                        <div>{ex.en}</div>
                        {ex.vi && <div style={{ color: 'var(--v-muted)', marginTop: 2 }}>{ex.vi}</div>}
                      </div>
                    ))}
              </Section>
            )}

            {/* Collocations */}
            {card.collocations.length > 0 && (
              <Section title="Collocations">
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {card.collocations.map((co, i) => (
                    <span
                      key={i}
                      style={{
                        padding: '4px 10px',
                        background: 'var(--v-panel)',
                        border: '1px solid var(--v-border)',
                        borderRadius: 'var(--v-radius-pill)',
                        fontFamily: 'var(--v-font-body)',
                        fontSize: 'var(--v-text-sm)',
                        color: 'var(--v-ink-soft)',
                      }}
                    >
                      {co.phrase}
                    </span>
                  ))}
                </div>
              </Section>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function exampleRowStyle(): React.CSSProperties {
  return {
    padding: '8px 12px',
    background: 'var(--v-panel)',
    borderRadius: 'var(--v-radius-sm)',
    marginBottom: 6,
    fontFamily: 'var(--v-font-body)',
    fontSize: 'var(--v-text-sm)',
    color: 'var(--v-ink)',
  };
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 16 }}>
      <div
        style={{
          fontFamily: 'var(--v-font-body)',
          fontSize: 'var(--v-text-xs)',
          fontWeight: 800,
          color: 'var(--v-muted)',
          letterSpacing: 'var(--v-tracking-wider)',
          textTransform: 'uppercase',
          marginBottom: 6,
        }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}

function PoolSentence({ sentence, blankWord }: { sentence: string; blankWord: string }) {
  // Pool rows store the target word slot as `__` (or more underscores). Render
  // the full sentence with the target word filled in and highlighted so the
  // example reads naturally.
  const match = sentence.match(/_{2,}/);
  if (!match) return <div>{sentence}</div>;
  const idx = match.index ?? 0;
  const before = sentence.slice(0, idx);
  const after = sentence.slice(idx + match[0].length);
  return (
    <div>
      {before}
      <strong style={{ color: 'var(--v-primary)', fontWeight: 800 }}>{blankWord}</strong>
      {after}
    </div>
  );
}
