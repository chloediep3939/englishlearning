'use client';

import { Volume2 } from 'lucide-react';
import { getStoredVoicePreference, speak } from '@/lib/tts';

interface Props {
  audioUrl?: string | null;
  fallbackText: string;
  lang?: 'en-US' | 'vi-VN';
  size?: number;
  variant?: 'circle' | 'inline';
  /** Render a small "TTS" chip next to the speaker that always plays via
   *  browser speechSynthesis. Useful when the recorded `audio_url` sounds
   *  off and the learner wants a clean machine voice on demand. */
  showTts?: boolean;
}

export default function AudioButton({
  audioUrl,
  fallbackText,
  lang = 'en-US',
  size = 36,
  variant = 'circle',
  showTts = false,
}: Props) {
  function play() {
    if (typeof window === 'undefined') return;
    // TEMP: bypass any recorded `audio_url` and always use TTS while the
    // dictionary mp3 source is unreliable. Remove this short-circuit to
    // restore the original mp3-first behavior.
    speakTTS();
    return;
    // eslint-disable-next-line no-unreachable
    // Phrasal-verb headwords ("come in", "give up") have no per-phrase
    // recording — the dictionary's audio_url for those is just the first
    // token, which is wrong. Skip the file and let speechSynthesis say
    // the whole phrase. Only applies to English; non-English never has a
    // recorded file anyway.
    const isMultiWord = lang === 'en-US' && /\s/.test(fallbackText.trim());
    const normalizedUrl = normalizeAudioUrl(audioUrl);
    if (!normalizedUrl || isMultiWord) {
      speakTTS();
      return;
    }
    try {
      // Narrowed to non-null by the if above; cast is required because the
      // top-of-function TEMP `return` confuses TS's flow analysis here.
      const audio = new Audio(normalizedUrl as string);
      // Three ways the mp3 path can fail:
      //   1. Network/404 → `onerror` fires.
      //   2. Autoplay blocked → `play()` rejects.
      //   3. File loads but is silent / zero-duration → neither fires, so
      //      we sniff `loadedmetadata` for a usable duration and bail out
      //      to TTS if there's nothing to play. Also guard with a hard
      //      timeout in case metadata never arrives.
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

  /**
   * Normalize protocol-relative URLs the dictionary API sometimes returns
   * (e.g. `//ssl.gstatic.com/...`) and reject empty strings so the caller
   * can fast-path to TTS.
   */
  function normalizeAudioUrl(raw: string | null | undefined): string | null {
    if (!raw) return null;
    const t = raw.trim();
    if (!t) return null;
    if (t.startsWith('//')) return 'https:' + t;
    return t;
  }

  function speakTTS() {
    speak(fallbackText, {
      lang,
      rate: 0.95,
      voice_preference: getStoredVoicePreference(),
    });
  }

  // Small force-TTS chip rendered next to the speaker when `showTts` is on.
  // Bypasses `audio_url` entirely so the learner can fall back to the browser
  // voice when a recorded mp3 sounds off (mispronounced, distorted, etc.).
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
    {ttsChip}
    </span>
  );
}
