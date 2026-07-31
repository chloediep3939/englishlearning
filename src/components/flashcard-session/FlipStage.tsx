'use client';

import { Eye, Sparkles } from 'lucide-react';
import AudioButton from '../AudioButton';
import type { Flashcard } from '@/lib/types';

interface Props {
  card: Flashcard;
  onReveal: () => void;
}

/**
 * Recognition-deck ("Chỉ hiểu nghĩa") prompt stage: EN→VI flip-and-self-grade.
 * Shows the English word (+ IPA + audio); the learner recalls the meaning,
 * then flips to the reveal stage to self-grade. No typing anywhere — the
 * production/typing exercise is excluded for recognition decks.
 */
export default function FlipStage({ card, onReveal }: Props) {
  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 22,
        padding: '20px 0',
      }}
    >
      <div style={{ position: 'relative', maxWidth: 'min(960px, 95vw)', zIndex: 1 }}>
        <div
          style={{
            background: 'var(--v-primary-soft)',
            color: 'var(--v-ink)',
            padding: '22px 40px',
            borderRadius: 28,
            border: '1px solid rgba(122,193,67,0.3)',
            boxShadow: '0 4px 0 rgba(122,193,67,0.18), 0 6px 18px rgba(122,193,67,0.15)',
            textAlign: 'center',
            position: 'relative',
          }}
        >
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <Sparkles size={14} color="var(--v-primary)" fill="var(--v-primary)" strokeWidth={2.4} />
            <span
              style={{
                fontFamily: 'var(--v-font-body)',
                fontSize: 11,
                fontWeight: 800,
                color: 'var(--v-primary)',
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
              }}
            >
              Từ này nghĩa là gì?
            </span>
            <Sparkles size={14} color="var(--v-primary)" fill="var(--v-primary)" strokeWidth={2.4} />
          </div>
          <div
            style={{
              fontFamily: 'var(--v-font-head)',
              fontSize: 42,
              fontWeight: 900,
              color: 'var(--v-ink)',
              letterSpacing: '-0.02em',
              lineHeight: 1.1,
            }}
          >
            {card.english}
          </div>
          <div
            style={{
              marginTop: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 12,
            }}
          >
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
            <AudioButton
              fallbackText={card.english}
              size={32}
              cardId={card.id}
              audioStatus={card.audio_us_status}
              audioVersion={card.updated_at}
            />
          </div>
          {/* Tail */}
          <div
            style={{
              position: 'absolute',
              bottom: -10,
              left: '50%',
              width: 22,
              height: 22,
              background: 'var(--v-primary-soft)',
              borderRight: '1px solid rgba(122,193,67,0.3)',
              borderBottom: '1px solid rgba(122,193,67,0.3)',
              borderRadius: '0 0 8px 0',
              transform: 'translateX(-50%) rotate(45deg)',
            }}
          />
        </div>
      </div>

      <button
        type="button"
        onClick={onReveal}
        style={{
          padding: '14px 36px',
          background: 'var(--v-primary)',
          color: '#fff',
          border: 'none',
          boxShadow: '0 4px 0 rgba(60,20,5,0.18), 0 6px 14px rgba(122,193,67,0.3)',
          borderRadius: 16,
          fontFamily: 'var(--v-font-head)',
          fontWeight: 900,
          fontSize: 13,
          letterSpacing: '0.04em',
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <Eye size={16} strokeWidth={3} /> XEM NGHĨA
      </button>
      <div
        style={{
          fontFamily: 'var(--v-font-body)',
          fontSize: 12,
          fontWeight: 700,
          color: 'var(--v-muted)',
        }}
      >
        Nhớ nghĩa trong đầu rồi bấm xem — Enter cũng được nha
      </div>
    </div>
  );
}
