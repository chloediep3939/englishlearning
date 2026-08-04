'use client';

import { ArrowRight, Sparkles } from 'lucide-react';
import type { SentenceStudyItem } from '@/lib/types';

interface Props {
  item: SentenceStudyItem;
  input: string;
  setInput: (s: string) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onSubmit: (value: string) => void;
}

/**
 * Prompt phase of "Học câu": example image (polaroid, hidden while the
 * background Pexels fill hasn't landed yet) + the sentence's Vietnamese
 * translation, then a full-width input for typing the whole English
 * sentence. No hints beyond image + VI, per spec. The submit value is
 * passed raw (not closed over) to dodge state-batching races — same
 * pattern as TypingStage.
 */
export default function SentencePrompt({ item, input, setInput, inputRef, onSubmit }: Props) {
  const { example } = item;
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
      {example.image_url && (
        <div style={{ position: 'relative', transform: 'rotate(-1.5deg)', zIndex: 1 }}>
          <div
            style={{
              background: '#fff',
              padding: 10,
              borderRadius: 14,
              boxShadow: '0 12px 28px rgba(40,30,15,0.12), 0 3px 6px rgba(40,30,15,0.06)',
            }}
          >
            <div
              style={{
                width: 'min(640px, 88vw)',
                aspectRatio: '16 / 9',
                background: 'var(--v-panel)',
                borderRadius: 10,
                overflow: 'hidden',
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={example.image_url}
                alt=""
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Speech-bubble prompt: the sentence's Vietnamese translation */}
      <div style={{ position: 'relative', maxWidth: 'min(960px, 95vw)', zIndex: 1 }}>
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
              Gõ lại câu tiếng Anh · Câu {item.example_index + 1}
            </span>
            <Sparkles size={14} color="var(--v-primary)" fill="var(--v-primary)" strokeWidth={2.4} />
          </div>
          <div
            style={{
              fontFamily: 'var(--v-font-head)',
              fontSize: 20,
              fontWeight: 900,
              color: 'var(--v-ink)',
              letterSpacing: '-0.01em',
              lineHeight: 1.4,
            }}
          >
            {example.vi}
          </div>
        </div>
      </div>

      {/* Full-sentence input */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(input);
        }}
        style={{ width: 'min(960px, 95vw)', display: 'flex', gap: 10 }}
      >
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Gõ nguyên câu tiếng Anh rồi Enter…"
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          style={{
            flex: 1,
            padding: '14px 18px',
            fontFamily: 'var(--v-font-mono)',
            fontSize: 'var(--v-text-md)',
            fontWeight: 600,
            background: 'var(--v-surface)',
            border: '2px solid var(--v-border)',
            borderRadius: 'var(--v-radius-md)',
            color: 'var(--v-ink)',
            outline: 'none',
          }}
        />
        <button
          type="submit"
          aria-label="Trả lời"
          style={{
            padding: '0 18px',
            background: 'var(--v-primary)',
            color: '#fff',
            border: 'none',
            borderRadius: 'var(--v-radius-md)',
            boxShadow: 'var(--v-press), 0 4px 10px rgba(122,193,67,0.4)',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
          }}
        >
          <ArrowRight size={18} />
        </button>
      </form>
    </div>
  );
}
