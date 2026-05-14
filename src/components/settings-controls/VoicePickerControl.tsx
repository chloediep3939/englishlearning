'use client';

import { useEffect, useState } from 'react';
import { Volume2, Play } from 'lucide-react';
import { speak } from '@/lib/tts';

interface Props {
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
}

/**
 * Dropdown over `speechSynthesis.getVoices()` filtered to en-* voices,
 * plus a "Nghe thử" preview button. Chrome returns an empty list on the
 * first call until `voiceschanged` fires — the effect subscribes to that
 * event so the dropdown populates after the engine warms up.
 */
export default function VoicePickerControl({ value, onChange, disabled }: Props) {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const refresh = () => {
      setVoices(window.speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith('en')));
    };
    refresh();
    window.speechSynthesis.addEventListener('voiceschanged', refresh);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', refresh);
  }, []);

  function preview() {
    speak("Hello, I'm Bún.", { voice_preference: value, lang: 'en-US' });
  }

  return (
    <div style={{ marginBottom: 4 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <span style={{ color: 'var(--v-muted)', display: 'inline-flex', alignItems: 'center' }}>
          <Volume2 size={14} />
        </span>
        <span style={{ flex: 1, fontFamily: 'var(--v-font-body)', fontSize: 'var(--v-text-md)', color: 'var(--v-ink)', fontWeight: 600 }}>
          Giọng nói
        </span>
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          style={{
            flex: 1,
            padding: '8px 10px',
            background: 'var(--v-surface)',
            border: '1.5px solid var(--v-border)',
            borderRadius: 'var(--v-radius-sm)',
            color: 'var(--v-ink)',
            fontFamily: 'var(--v-font-body)',
            fontSize: 'var(--v-text-sm)',
            outline: 'none',
            cursor: disabled ? 'wait' : 'pointer',
          }}
        >
          <option value="auto">Tự động (mặc định trình duyệt)</option>
          {voices.map((v) => (
            <option key={v.name} value={v.name}>
              {v.name} — {v.lang}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={preview}
          disabled={disabled}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            padding: '6px 12px',
            borderRadius: 'var(--v-radius-sm)',
            border: '1px solid var(--v-border)',
            background: 'var(--v-surface)',
            color: 'var(--v-ink)',
            fontFamily: 'var(--v-font-body)',
            fontSize: 'var(--v-text-xs)',
            fontWeight: 700,
            cursor: disabled ? 'wait' : 'pointer',
          }}
        >
          <Play size={12} /> Nghe thử
        </button>
      </div>
      <div style={{ fontSize: 'var(--v-text-xs)', color: 'var(--v-muted)', marginTop: 4 }}>
        Giọng đọc TTS{voices.length === 0 ? ' — trình duyệt chưa nạp giọng en-*' : ''}
      </div>
    </div>
  );
}
