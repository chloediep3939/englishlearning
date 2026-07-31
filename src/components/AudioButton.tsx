'use client';

import { Volume2, AlertTriangle } from 'lucide-react';
import { getStoredVoicePreference, getStoredWordTtsRate, speak } from '@/lib/tts';

interface Props {
  /**
   * @deprecated Retained for call-site compatibility. The play path no longer
   * uses a recorded `audio_url` — it plays the stored Oxford mp3 (via
   * `cardId` + `audioStatus`) when available, otherwise browser TTS.
   */
  audioUrl?: string | null;
  fallbackText: string;
  lang?: 'en-US' | 'vi-VN';
  size?: number;
  variant?: 'circle' | 'inline';
  /** Render a small "TTS" chip next to the speaker that always plays via
   *  browser speechSynthesis — a clean machine voice on demand. */
  showTts?: boolean;
  /** Card id. When set together with `audioStatus === 'ok'`, the speaker plays
   *  the stored Oxford US mp3 from `/api/audio/{cardId}`. */
  cardId?: number | null;
  /** Oxford fetch status: 'ok' → play stored mp3; 'failed' → TTS + warning;
   *  null → TTS silently (never attempted). */
  audioStatus?: 'ok' | 'failed' | null;
  /** Cache-bust token (card.updated_at). The served mp3 is `immutable`-cached
   *  under a reused R2 key, so this busts a stale clip after a re-fetch. */
  audioVersion?: string | null;
}

export default function AudioButton({
  fallbackText,
  lang = 'en-US',
  size = 36,
  variant = 'circle',
  showTts = false,
  cardId = null,
  audioStatus = null,
  audioVersion = null,
}: Props) {
  // Multi-word entries (collocations / phrasal verbs) intentionally play via
  // browser TTS: Oxford has no phrase recordings, and stitched/synthesized
  // files sounded worse than the browser's neural voice (user preference).
  const isPhrase = /\s/.test(fallbackText.trim());

  function play() {
    if (typeof window === 'undefined') return;
    // Oxford US mp3 when one is stored for this card; otherwise browser TTS.
    // Vietnamese never has a recording, so it always uses TTS.
    if (lang === 'en-US' && !isPhrase && cardId && audioStatus === 'ok') {
      playOxfordMp3(cardId);
      return;
    }
    speakTTS();
  }

  function playOxfordMp3(id: number) {
    const v = audioVersion ? `?v=${encodeURIComponent(audioVersion)}` : '';
    const url = `/api/audio/${id}${v}`;
    try {
      const audio = new Audio(url);
      // Three ways the mp3 path can fail → fall back to TTS:
      //   1. Network / 404 → `onerror` fires.
      //   2. Autoplay blocked → `play()` rejects.
      //   3. File loads but is silent / zero-duration → sniff `loadedmetadata`
      //      for a usable duration; guard with a hard timeout in case metadata
      //      never arrives.
      let fellBack = false;
      const fallback = () => {
        if (fellBack) return;
        fellBack = true;
        try { audio.pause(); } catch { /* ignore */ }
        speakTTS();
      };
      audio.onerror = fallback;
      audio.addEventListener('loadedmetadata', () => {
        if (!Number.isFinite(audio.duration) || audio.duration < 0.1) {
          fallback();
        }
      });
      const timeoutId = window.setTimeout(fallback, 2500);
      audio.addEventListener('playing', () => window.clearTimeout(timeoutId), { once: true });
      audio.play().catch(fallback);
    } catch {
      speakTTS();
    }
  }

  function speakTTS() {
    speak(fallbackText, {
      lang,
      rate: getStoredWordTtsRate(),
      voice_preference: getStoredVoicePreference(),
    });
  }

  // Small force-TTS chip rendered next to the speaker when `showTts` is on.
  const ttsChip = showTts ? (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        speakTTS();
      }}
      aria-label="Phát âm bằng giọng máy"
      title="Dùng giọng máy (TTS) thay vì file ghi âm"
      style={{
        padding: '3px 8px',
        background: 'var(--v-surface)',
        border: '1px solid var(--v-border)',
        borderRadius: 999,
        color: 'var(--v-ink-soft)',
        fontFamily: 'var(--v-font-head)',
        fontSize: 10,
        fontWeight: 800,
        letterSpacing: '0.04em',
        cursor: 'pointer',
        whiteSpace: 'nowrap',
      }}
    >
      TTS
    </button>
  ) : null;

  // Warning when the Oxford mp3 fetch failed — the speaker still works (TTS),
  // we just flag that the recorded clip is unavailable. Phrases are exempt:
  // TTS is their intended playback, not a failure.
  const failedBadge =
    audioStatus === 'failed' && !isPhrase ? (
      <span
        title="Phát âm Oxford lỗi — đang dùng giọng máy"
        aria-label="Phát âm Oxford lỗi — đang dùng giọng máy"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          color: 'var(--v-orange)',
        }}
      >
        <AlertTriangle size={12} strokeWidth={2.6} />
      </span>
    ) : null;

  if (variant === 'inline') {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <button
          type="button"
          onClick={play}
          aria-label="Phát âm"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 10px',
            background: 'transparent',
            border: '1px solid var(--v-border)',
            borderRadius: 'var(--v-radius-pill)',
            color: 'var(--v-ink-soft)',
            fontFamily: 'var(--v-font-body)',
            fontSize: 'var(--v-text-sm)',
            cursor: 'pointer',
          }}
        >
          <Volume2 size={12} /> nghe
        </button>
        {failedBadge}
        {ttsChip}
      </span>
    );
  }

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
    <button
      type="button"
      onClick={play}
      aria-label="Phát âm"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size,
        background: 'var(--v-surface)',
        border: '1px solid var(--v-border)',
        borderRadius: '50%',
        boxShadow: 'var(--v-shadow-sm)',
        color: 'var(--v-blue)',
        cursor: 'pointer',
      }}
    >
      <Volume2 size={Math.floor(size * 0.45)} />
    </button>
    {failedBadge}
    {ttsChip}
    </span>
  );
}
