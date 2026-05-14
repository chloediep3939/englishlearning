'use client';

import { ArrowRight, Heart, Sparkles } from 'lucide-react';
import type { Flashcard } from '@/lib/types';

interface Props {
  card: Flashcard;
  input: string;
  setInput: (s: string) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onSubmit: (value: string) => void;
  /** Eyebrow text in the speech bubble (varies by page). */
  promptEyebrow: string;
  /** Placeholder for the typing input (varies by page). */
  inputPlaceholder: string;
}

/**
 * First phase of the card: show the Vietnamese meaning + optional polaroid
 * image, take the user's English guess, submit on Enter. The submit value
 * is passed in directly (not closed over) so a fast type → Enter doesn't
 * race against React state batching.
 */
export default function TypingStage({
  card, input, setInput, inputRef, onSubmit, promptEyebrow, inputPlaceholder,
}: Props) {
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
      {/* Polaroid image (if card has one) — show the whole photo (contain),
          aspect 16:9 matches typical Pexels landscape so letterboxing is minor. */}
      {card.image_url && (
        <div style={{ position: 'relative', transform: 'rotate(-1.5deg)', zIndex: 1 }}>
          <div
            style={{
              background: '#fff',
              padding: 8,
              borderRadius: 12,
              boxShadow: '0 8px 22px rgba(40,30,15,0.1), 0 2px 4px rgba(40,30,15,0.06)',
            }}
          >
            <div
              style={{
                width: 320,
                aspectRatio: '16 / 9',
                background: 'var(--v-panel)',
                borderRadius: 8,
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
        </div>
      )}

      {/* Speech-bubble prompt */}
      <div style={{ position: 'relative', maxWidth: 620, zIndex: 1 }}>
        <div
          style={{
            background: 'var(--v-primary-soft)',
            color: 'var(--v-ink)',
            padding: '18px 30px',
            borderRadius: 28,
            border: '1px solid rgba(122,193,67,0.3)',
            boxShadow: '0 4px 0 rgba(122,193,67,0.18), 0 6px 18px rgba(122,193,67,0.15)',
            textAlign: 'center',
            position: 'relative',
          }}
        >
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
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
              {promptEyebrow}
            </span>
            <Sparkles size={14} color="var(--v-primary)" fill="var(--v-primary)" strokeWidth={2.4} />
          </div>
          <div
            style={{
              fontFamily: 'var(--v-font-head)',
              fontSize: 26,
              fontWeight: 900,
              color: 'var(--v-ink)',
              letterSpacing: '-0.01em',
              lineHeight: 1.2,
            }}
          >
            &ldquo;{card.vietnamese}&rdquo;
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

      {/* Input + button */}
      <div style={{ width: '100%', maxWidth: 560, zIndex: 1 }}>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            // Bind Enter directly on the input AND read value from the DOM
            // (not React state) — sidesteps any closure-staleness race on a
            // fast type → Enter sequence.
            if (e.key === 'Enter') {
              e.preventDefault();
              onSubmit(e.currentTarget.value);
            }
          }}
          placeholder={inputPlaceholder}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          style={{
            width: '100%',
            padding: '18px 22px',
            fontSize: 21,
            fontFamily: 'var(--v-font-head)',
            fontWeight: 800,
            background: 'var(--v-surface)',
            border: '2px solid var(--v-primary)',
            borderRadius: 18,
            boxShadow: '0 4px 0 rgba(122,193,67,0.2), 0 6px 14px rgba(122,193,67,0.18)',
            color: 'var(--v-ink)',
            outline: 'none',
            letterSpacing: '0.02em',
            textAlign: 'center',
            boxSizing: 'border-box',
          }}
        />
        <div style={{ marginTop: 14, display: 'flex', justifyContent: 'center' }}>
          <button
            type="button"
            onClick={() => onSubmit(input)}
            disabled={input.trim().length === 0}
            style={{
              padding: '12px 32px',
              background: 'var(--v-primary)',
              color: '#fff',
              border: 'none',
              boxShadow: '0 4px 0 rgba(60,20,5,0.18), 0 6px 14px rgba(122,193,67,0.3)',
              borderRadius: 16,
              fontFamily: 'var(--v-font-head)',
              fontWeight: 900,
              fontSize: 13,
              letterSpacing: '0.04em',
              cursor: input.trim().length === 0 ? 'not-allowed' : 'pointer',
              opacity: input.trim().length === 0 ? 0.5 : 1,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            KIỂM TRA <ArrowRight size={16} strokeWidth={3} />
          </button>
        </div>
        <div
          style={{
            marginTop: 12,
            textAlign: 'center',
            fontFamily: 'var(--v-font-body)',
            fontSize: 12,
            fontWeight: 700,
            color: 'var(--v-muted)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <Heart size={13} color="var(--v-red)" fill="var(--v-red)" />
          Không nhớ? Cứ đoán — sai không sao đâu!
        </div>
      </div>
    </div>
  );
}
