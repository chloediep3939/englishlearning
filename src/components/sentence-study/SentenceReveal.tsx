'use client';

import { Volume2 } from 'lucide-react';
import SentenceDiff from './SentenceDiff';
import { sentencesMatch } from './compare';
import { highlightTarget } from '@/components/flashcard-session/highlight';
import { RATINGS, type Quality } from '@/components/flashcard-session/types';
import { intervalLabel, previewIntervals } from '@/lib/flashcards/srs';
import { speak } from '@/lib/tts';
import type { SentenceStudyItem } from '@/lib/types';

interface Props {
  item: SentenceStudyItem;
  guess: string;
  failedThisSession: boolean;
  onRate: (q: Quality) => void;
}

/**
 * Reveal phase of "Học câu": word-level diff of the typed guess, the full
 * correct sentence (headword highlighted, TTS speaker — sentences never
 * have Oxford mp3s), the VI translation, and the 4-button rating row with
 * live "ôn sau X" hints from previewIntervals. Enter's smart default
 * (correct → TỐT, wrong → LẠI) lives in the orchestrator's key handler.
 */
export default function SentenceReveal({ item, guess, failedThisSession, onRate }: Props) {
  const { example } = item;
  const isCorrect = sentencesMatch(guess, example.en);
  const intervals = previewIntervals(item.drill, { failedThisSession });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, padding: '12px 0' }}>
      {/* Your answer, word-diffed */}
      <section
        style={{
          padding: '14px 18px',
          background: isCorrect
            ? 'color-mix(in srgb, var(--v-primary) 10%, transparent)'
            : 'color-mix(in srgb, var(--v-red) 7%, transparent)',
          border: `1px solid ${
            isCorrect
              ? 'color-mix(in srgb, var(--v-primary) 35%, transparent)'
              : 'color-mix(in srgb, var(--v-red) 30%, transparent)'
          }`,
          borderRadius: 'var(--v-radius-md)',
        }}
      >
        <SectionLabel>{isCorrect ? 'Chính xác! 🎉' : 'Câu bạn gõ'}</SectionLabel>
        {guess.trim().length > 0 ? (
          <SentenceDiff guess={guess} answer={example.en} />
        ) : (
          <div style={{ color: 'var(--v-muted)', fontFamily: 'var(--v-font-body)', fontSize: 'var(--v-text-md)' }}>
            (bỏ trống)
          </div>
        )}
      </section>

      {/* The correct sentence — big, centered — + VI + optional image */}
      <section
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          gap: 10,
          padding: '20px 24px',
          background: 'var(--v-surface)',
          border: '1px solid var(--v-border)',
          borderRadius: 'var(--v-radius-md)',
          boxShadow: 'var(--v-shadow-sm)',
        }}
      >
        <SectionLabel>Câu đúng</SectionLabel>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            flexWrap: 'wrap',
            maxWidth: 'min(960px, 95vw)',
          }}
        >
          <div
            style={{
              fontFamily: 'var(--v-font-head)',
              fontSize: 'clamp(22px, 2.6vw, 32px)',
              fontWeight: 900,
              color: 'var(--v-ink)',
              lineHeight: 1.45,
            }}
            dangerouslySetInnerHTML={{ __html: highlightTarget(example.en, item.english) }}
          />
          <button
            type="button"
            onClick={() => speak(example.en)}
            aria-label="Đọc câu"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 34,
              height: 34,
              borderRadius: '50%',
              border: '1px solid var(--v-border)',
              background: 'var(--v-surface)',
              color: 'var(--v-blue)',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <Volume2 size={16} />
          </button>
        </div>
        {example.vi && (
          <div
            style={{
              fontFamily: 'var(--v-font-body)',
              fontSize: 'var(--v-text-md)',
              color: 'var(--v-ink-soft)',
              maxWidth: 'min(820px, 92vw)',
            }}
          >
            {example.vi}
          </div>
        )}
        {example.image_url && (
          <div
            style={{
              width: 'min(420px, 85vw)',
              aspectRatio: '16 / 9',
              borderRadius: 12,
              overflow: 'hidden',
              border: '1px solid var(--v-border)',
              marginTop: 4,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={example.image_url}
              alt=""
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          </div>
        )}
      </section>

      {/* Rating row */}
      <div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            marginBottom: 8,
          }}
        >
          <span
            style={{
              fontFamily: 'var(--v-font-body)',
              fontSize: 'var(--v-text-sm)',
              fontWeight: 800,
              color: 'var(--v-ink-soft)',
            }}
          >
            Bạn thấy thế nào? (lịch ôn lại tự điều chỉnh)
          </span>
          <span style={{ fontFamily: 'var(--v-font-body)', fontSize: 'var(--v-text-xs)', color: 'var(--v-muted)', fontWeight: 700 }}>
            Enter → {isCorrect ? 'TỐT' : 'LẠI'} · Phím 1—4
          </span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {RATINGS.map((r) => {
            const isDefault = isCorrect ? r.quality === 4 : r.quality === 0;
            return (
              <button
                key={r.quality}
                type="button"
                onClick={() => onRate(r.quality)}
                style={{
                  padding: '12px 10px',
                  background: r.bg,
                  color: '#fff',
                  border: isDefault ? '3px solid var(--v-ink)' : 'none',
                  borderRadius: 'var(--v-radius-md)',
                  boxShadow: 'var(--v-press)',
                  cursor: 'pointer',
                  fontFamily: 'var(--v-font-head)',
                  textAlign: 'left',
                  position: 'relative',
                }}
              >
                <span
                  style={{
                    position: 'absolute',
                    top: 8,
                    right: 10,
                    fontFamily: 'var(--v-font-mono)',
                    fontSize: 11,
                    fontWeight: 700,
                    opacity: 0.85,
                  }}
                >
                  {r.key}
                </span>
                <div style={{ fontWeight: 900, fontSize: 'var(--v-text-md)' }}>
                  {r.emoji} {r.label}
                </div>
                <div
                  style={{
                    fontFamily: 'var(--v-font-body)',
                    fontSize: 'var(--v-text-xs)',
                    fontWeight: 700,
                    opacity: 0.9,
                    marginTop: 2,
                  }}
                >
                  ôn sau {intervalLabel(intervals[r.quality])}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
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
      {children}
    </div>
  );
}
