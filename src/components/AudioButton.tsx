'use client';

import { Volume2 } from 'lucide-react';

interface Props {
  audioUrl?: string | null;
  fallbackText: string;
  lang?: 'en-US' | 'vi-VN';
  size?: number;
  variant?: 'circle' | 'inline';
}

export default function AudioButton({
  audioUrl,
  fallbackText,
  lang = 'en-US',
  size = 36,
  variant = 'circle',
}: Props) {
  function play() {
    if (typeof window === 'undefined') return;
    if (!audioUrl) {
      speakTTS();
      return;
    }
    try {
      const audio = new Audio(audioUrl);
      // Either signal (network/404 via onerror, or autoplay-blocked via play
      // rejection) falls back to TTS. Without the onerror handler the audio
      // would silently fail when the URL 404s.
      let fellBack = false;
      const fallback = () => {
        if (fellBack) return;
        fellBack = true;
        speakTTS();
      };
      audio.onerror = fallback;
      audio.play().catch(fallback);
    } catch {
      speakTTS();
    }
  }

  function speakTTS() {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      console.warn('[AudioButton] speechSynthesis unavailable');
      return;
    }
    const synth = window.speechSynthesis;
    const speak = () => {
      try {
        synth.cancel();
        const u = new SpeechSynthesisUtterance(fallbackText);
        u.lang = lang;
        // Prefer an explicit en-US voice when available so AmE study cards
        // don't get spoken with the system's default (often en-GB on Mac).
        // Fall back broadly through en-US → en-* → first available.
        if (lang.startsWith('en')) {
          const voices = synth.getVoices();
          const enUs =
            voices.find((v) => v.lang === 'en-US') ??
            voices.find((v) => v.lang.toLowerCase().startsWith('en-us')) ??
            voices.find((v) => v.lang.toLowerCase().startsWith('en'));
          if (enUs) u.voice = enUs;
        }
        u.rate = 0.95;
        synth.speak(u);
      } catch (err) {
        console.warn('[AudioButton] TTS speak failed:', err);
      }
    };
    // getVoices() returns [] on first call until the engine loads them.
    if (synth.getVoices().length === 0) {
      synth.addEventListener('voiceschanged', speak, { once: true });
      // Trigger voice loading on browsers that need a kick.
      synth.getVoices();
    } else {
      speak();
    }
  }

  if (variant === 'inline') {
    return (
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
    );
  }

  return (
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
  );
}
