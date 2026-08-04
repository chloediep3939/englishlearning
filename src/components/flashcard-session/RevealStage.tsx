'use client';

import POSPill from '@/components/common/POSPill';
import LookupPills from '@/components/common/LookupPills';
import AudioButton from '../AudioButton';
import AutoplayDots from './AutoplayDots';
import CharDiffBox from './CharDiffBox';
import Kbd from './Kbd';
import { highlightTarget } from './highlight';
import { previewIntervals, intervalLabel } from '@/lib/flashcards/srs';
import type { Flashcard } from '@/lib/types';
import { RATINGS, type Quality } from './types';

const COLL_COLORS = ['var(--v-pink)', 'var(--v-teal)', 'var(--v-yellow-deep)'];

interface Props {
  card: Flashcard;
  guess: string;
  isCorrect: boolean;
  /** Recognition flip flow has no typed guess — hide the char-diff box and
   *  the Enter-default hint tied to typing accuracy. */
  hideGuess?: boolean;
  autoplayCount: number;
  /** Total autoplay repeats (`reveal_read_count` setting); 0 = autoplay off,
   *  which hides the progress dots entirely. */
  autoplayTotal: number;
  onRate: (q: Quality) => void;
  /** Label above the rating buttons (varies by page). */
  ratingRowLabel: string;
  /** True iff the learner has rated this card LẠI earlier in the current
   *  session. Threads through to previewIntervals so the "ôn sau X" hint on
   *  TỐT shows the longer interval that the mastery gate actually awards. */
  failedThisSession?: boolean;
}

/**
 * Second phase: show the answer, char-diff against guess, meaning,
 * example with target highlighted, image + collocations + external
 * lookup links, and the 4-button rating row. Enter rates as TỐT when
 * `isCorrect`, otherwise LẠI — that button is outlined as the smart
 * default so the shortcut is discoverable.
 */
export default function RevealStage({
  card, guess, isCorrect, hideGuess, autoplayCount, autoplayTotal, onRate, ratingRowLabel, failedThisSession,
}: Props) {
  const intervals = previewIntervals(card, { failedThisSession });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Headword centered so the eye lands on the key word first; the
          audio/TTS cluster is pinned to the top-right corner instead of
          sitting inline so it doesn't pull the word off-center. */}
      <header
        style={{
          paddingBottom: 12,
          borderBottom: '1px solid var(--v-border)',
          position: 'relative',
          textAlign: 'center',
        }}
      >
        <div style={{ position: 'absolute', bottom: 12, left: 0 }}>
          <POSPill pos={card.part_of_speech} />
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'center',
            gap: 18,
            flexWrap: 'wrap',
          }}
        >
          <h1
            style={{
              fontFamily: 'var(--v-font-head)',
              fontSize: 50,
              fontWeight: 900,
              margin: 0,
              letterSpacing: '-0.03em',
              color: 'var(--v-ink)',
              lineHeight: 1.05,
              display: 'inline-block',
              position: 'relative',
            }}
          >
            <span
              style={{
                position: 'absolute',
                left: -2,
                right: -2,
                bottom: 2,
                height: '34%',
                background: 'var(--v-primary)',
                opacity: 0.28,
                zIndex: 0,
                borderRadius: 4,
              }}
            />
            <span style={{ position: 'relative', zIndex: 1 }}>{card.english}</span>
          </h1>
          {card.ipa && (
            <span
              style={{
                fontFamily: 'var(--v-font-mono)',
                fontSize: 15,
                color: 'var(--v-accent)',
                fontWeight: 600,
              }}
            >
              {card.ipa}
            </span>
          )}
        </div>
        <div
          style={{
            position: 'absolute',
            bottom: 12,
            right: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          {autoplayTotal > 0 && <AutoplayDots played={autoplayCount} total={autoplayTotal} />}
          <AudioButton
            fallbackText={card.english}
            size={36}
            showTts
            cardId={card.id}
            audioStatus={card.audio_us_status}
            audioVersion={card.updated_at}
          />
        </div>
      </header>

      <section style={{ display: 'grid', gridTemplateColumns: '1.25fr 1fr', gap: 20, alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {!hideGuess && <CharDiffBox guess={guess} answer={card.english} />}

          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <div style={{ width: 5, alignSelf: 'stretch', background: 'var(--v-accent)', borderRadius: 3, flexShrink: 0 }} />
            <div>
              <div
                style={{
                  fontFamily: 'var(--v-font-body)',
                  fontSize: 11,
                  fontWeight: 900,
                  color: 'var(--v-accent)',
                  letterSpacing: '0.15em',
                  textTransform: 'uppercase',
                }}
              >
                Nghĩa
              </div>
              <div
                style={{
                  fontFamily: 'var(--v-font-head)',
                  fontSize: 18,
                  fontWeight: 800,
                  color: 'var(--v-ink)',
                  marginTop: 2,
                }}
              >
                {card.vietnamese}
              </div>
            </div>
          </div>

          {card.examples.length > 0 && (
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <div style={{ width: 5, alignSelf: 'stretch', background: 'var(--v-blue)', borderRadius: 3, flexShrink: 0 }} />
              <div>
                <div
                  style={{
                    fontFamily: 'var(--v-font-body)',
                    fontSize: 11,
                    fontWeight: 900,
                    color: 'var(--v-blue)',
                    letterSpacing: '0.15em',
                    textTransform: 'uppercase',
                  }}
                >
                  Ví dụ
                </div>
                {card.examples.map((ex, i) => (
                  <div key={i} style={{ marginBottom: i === card.examples.length - 1 ? 0 : 8 }}>
                    <p
                      style={{
                        fontFamily: 'var(--v-font-head)',
                        fontSize: 16,
                        fontWeight: 800,
                        color: 'var(--v-ink)',
                        margin: '4px 0 4px',
                        lineHeight: 1.35,
                      }}
                      dangerouslySetInnerHTML={{ __html: highlightTarget(ex.en, card.english) }}
                    />
                    {ex.vi && (
                      <p
                        style={{
                          fontFamily: 'var(--v-font-body)',
                          fontSize: 12,
                          fontWeight: 600,
                          color: 'var(--v-ink-soft)',
                          margin: 0,
                          lineHeight: 1.5,
                        }}
                      >
                        {ex.vi}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {card.image_url && (
            <div
              style={{
                background: 'var(--v-surface)',
                border: '1px solid var(--v-border)',
                boxShadow: 'var(--v-shadow-md)',
                borderRadius: 18,
                padding: 6,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: '100%',
                  aspectRatio: '16 / 9',
                  background: 'var(--v-panel)',
                  borderRadius: 12,
                  overflow: 'hidden',
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={card.image_url}
                  alt={card.english}
                  style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
                />
              </div>
            </div>
          )}

          {card.collocations.length > 0 && (
            <div>
              <div
                style={{
                  fontFamily: 'var(--v-font-body)',
                  fontSize: 11,
                  fontWeight: 900,
                  color: 'var(--v-purple)',
                  letterSpacing: '0.15em',
                  textTransform: 'uppercase',
                  marginBottom: 8,
                }}
              >
                Thường đi cùng
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {card.collocations.slice(0, 4).map((c, i) => (
                  <div
                    key={i}
                    style={{
                      background: 'var(--v-surface)',
                      border: '1px solid var(--v-border)',
                      boxShadow: 'var(--v-shadow-sm)',
                      borderRadius: 12,
                      padding: '8px 12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        background: COLL_COLORS[i % COLL_COLORS.length],
                        borderRadius: 2,
                        flexShrink: 0,
                      }}
                    />
                    <span
                      style={{
                        fontFamily: 'var(--v-font-body)',
                        fontSize: 12,
                        fontWeight: 700,
                        color: 'var(--v-ink)',
                      }}
                      dangerouslySetInnerHTML={{ __html: highlightTarget(c.phrase, card.english) }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          <LookupPills word={card.english} />
        </div>
      </section>

      <section style={{ borderTop: '1px solid var(--v-border)', paddingTop: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
          <div style={{ fontFamily: 'var(--v-font-body)', fontSize: 12, fontWeight: 800, color: 'var(--v-ink-soft)' }}>
            {ratingRowLabel}{' '}
            <span style={{ fontWeight: 700, color: 'var(--v-muted)' }}>(lịch ôn lại tự điều chỉnh)</span>
          </div>
          <div style={{ fontFamily: 'var(--v-font-body)', fontSize: 11, fontWeight: 700, color: 'var(--v-muted)' }}>
            Phím <Kbd>1</Kbd>—<Kbd>4</Kbd>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
          {RATINGS.map((r) => {
            // Smart-Enter default = TỐT if user got it right, LẠI otherwise.
            // Outline that button so the keyboard shortcut is discoverable.
            const isDefault = (isCorrect && r.quality === 4) || (!isCorrect && r.quality === 0);
            return (
              <button
                key={r.quality}
                type="button"
                onClick={() => onRate(r.quality)}
                style={{
                  padding: '12px 14px',
                  background: r.bg,
                  border: isDefault ? '2px solid var(--v-ink)' : 'none',
                  boxShadow: '0 4px 0 rgba(60,20,5,0.15), 0 6px 14px rgba(40,30,15,0.2)',
                  borderRadius: 14,
                  cursor: 'pointer',
                  textAlign: 'left',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                }}
              >
                <div style={{ fontSize: 21, lineHeight: 1, flexShrink: 0 }}>{r.emoji}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontFamily: 'var(--v-font-head)',
                      fontSize: 14,
                      fontWeight: 900,
                      letterSpacing: '0.06em',
                      lineHeight: 1,
                    }}
                  >
                    {r.label}
                  </div>
                  <div
                    style={{
                      fontFamily: 'var(--v-font-body)',
                      fontSize: 11,
                      fontWeight: 700,
                      opacity: 0.9,
                      marginTop: 2,
                    }}
                  >
                    ôn sau {intervalLabel(intervals[r.quality])}
                  </div>
                </div>
                <kbd
                  style={{
                    fontFamily: 'var(--v-font-mono)',
                    fontSize: 12,
                    fontWeight: 800,
                    background: 'rgba(0,0,0,0.18)',
                    color: '#fff',
                    borderRadius: 5,
                    padding: '2px 7px',
                    flexShrink: 0,
                  }}
                >
                  {r.key}
                </kbd>
              </button>
            );
          })}
        </div>
        <div
          style={{
            marginTop: 10,
            textAlign: 'center',
            fontFamily: 'var(--v-font-body)',
            fontSize: 11,
            color: 'var(--v-muted)',
          }}
        >
          <Kbd>Enter</Kbd> {isCorrect ? '→ TỐT' : '→ LẠI'}
        </div>
      </section>
    </div>
  );
}
