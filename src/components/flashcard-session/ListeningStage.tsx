'use client';

import { useEffect, useState } from 'react';
import { ArrowRight, Eye, Headphones, Heart, Volume2 } from 'lucide-react';
import type { Flashcard } from '@/lib/types';
import { speakWord, getStoredVoicePreference } from '@/lib/tts';

interface Props {
  card: Flashcard;
  input: string;
  setInput: (s: string) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onSubmit: (value: string) => void;
  /** `word_tts_rate` — playback rate for the mp3 / TTS fallback. */
  wordRate: number;
}

/** Delay before the prompt auto-plays, so the stage has settled visually. */
const LISTEN_AUTOPLAY_DELAY_MS = 400;

/**
 * Listening variant of the prompt phase: the card's pronunciation IS the
 * question. Everything that would give the word away (image, Vietnamese
 * meaning, note) is hidden — just a speaker button and the typing input.
 * The audio auto-plays once when the card appears; the button replays it.
 *
 * The input row mirrors TypingStage on purpose (2nd consumer — extract to
 * common/ only if a 3rd prompt variant appears, per CLAUDE.md §2.1).
 */
export default function ListeningStage({
  card, input, setInput, inputRef, onSubmit, wordRate,
}: Props) {
  const [playing, setPlaying] = useState(false);

  // Same source chain as AudioButton / the reveal autoplay: stored Oxford US
  // mp3 when fetched OK (speakWord skips it for phrases), else browser TTS.
  const oxfordUrl =
    card.audio_us_status === 'ok'
      ? `/api/audio/${card.id}?v=${encodeURIComponent(card.updated_at ?? '')}`
      : null;

  const play = async () => {
    setPlaying(true);
    try {
      await speakWord(card.english, {
        audioUrl: oxfordUrl,
        lang: 'en-US',
        rate: wordRate,
        voice_preference: getStoredVoicePreference(),
      });
    } finally {
      setPlaying(false);
    }
  };

  // Auto-play once per card appearance — the audio is the question, so this
  // ignores the `autoplay_audio` (reveal) setting. An in-flight mp3 can't be
  // cancelled from here (speakWord returns no handle); single words are <1s,
  // so a stale tail-end overlap after a fast skip is acceptable.
  useEffect(() => {
    const t = setTimeout(() => { void play(); }, LISTEN_AUTOPLAY_DELAY_MS);
    return () => {
      clearTimeout(t);
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        try { window.speechSynthesis.cancel(); } catch {}
      }
    };
    // Re-fire only when the card changes, not on playing-state churn.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card.id]);

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
      {/* Speaker panel — replaces the polaroid + Vietnamese bubble. */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 14,
          background: 'var(--v-primary-soft)',
          border: '1px solid rgba(122,193,67,0.3)',
          boxShadow: '0 4px 0 rgba(122,193,67,0.18), 0 6px 18px rgba(122,193,67,0.15)',
          borderRadius: 28,
          padding: '30px 56px',
        }}
      >
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <Headphones size={14} color="var(--v-primary)" strokeWidth={2.6} />
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
            Nghe và gõ lại nhé
          </span>
          <Headphones size={14} color="var(--v-primary)" strokeWidth={2.6} />
        </div>
        <button
          type="button"
          onClick={() => { void play(); }}
          aria-label="Nghe lại"
          title="Nghe lại"
          style={{
            width: 96,
            height: 96,
            borderRadius: '50%',
            border: 'none',
            background: 'var(--v-primary)',
            color: '#fff',
            boxShadow: '0 5px 0 rgba(60,20,5,0.18), 0 10px 22px rgba(122,193,67,0.4)',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            animation: playing ? 'v-ngoc-bob 0.6s ease-in-out infinite' : undefined,
          }}
        >
          <Volume2 size={42} strokeWidth={2.4} />
        </button>
        <span
          style={{
            fontFamily: 'var(--v-font-body)',
            fontSize: 12,
            fontWeight: 700,
            color: 'var(--v-ink-soft)',
          }}
        >
          Bấm loa để nghe lại
        </span>
      </div>

      {/* Input + button — mirrors TypingStage. */}
      <div style={{ width: '100%', maxWidth: 560, zIndex: 1 }}>
        <input
          ref={inputRef}
          autoFocus
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            // Same DOM-value read as TypingStage — dodges the fast
            // type → Enter state race.
            if (e.key === 'Enter') {
              e.preventDefault();
              onSubmit(e.currentTarget.value);
            }
          }}
          placeholder="Gõ từ bạn nghe được…"
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
            style={{
              padding: '12px 32px',
              background: input.trim().length === 0 ? 'var(--v-surface)' : 'var(--v-primary)',
              color: input.trim().length === 0 ? 'var(--v-ink-soft)' : '#fff',
              border: input.trim().length === 0 ? '1.5px solid var(--v-border)' : 'none',
              boxShadow:
                input.trim().length === 0
                  ? 'var(--v-shadow-sm)'
                  : '0 4px 0 rgba(60,20,5,0.18), 0 6px 14px rgba(122,193,67,0.3)',
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
            {input.trim().length === 0 ? (
              <>
                <Eye size={16} strokeWidth={3} /> XEM ĐÁP ÁN
              </>
            ) : (
              <>
                KIỂM TRA <ArrowRight size={16} strokeWidth={3} />
              </>
            )}
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
          Nghe không rõ? Bấm loa nghe lại bao nhiêu lần cũng được!
        </div>
      </div>
    </div>
  );
}
