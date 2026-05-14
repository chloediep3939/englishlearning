'use client';

import { useEffect, useRef, useState } from 'react';
import { Gauge, Play } from 'lucide-react';
import { M4_SETTINGS } from '@/lib/types';
import { speak } from '@/lib/tts';

interface Props {
  value: number;
  onCommit: (v: number) => void;
}

/**
 * Slider for the karaoke TTS rate on passage steps. Includes a "Nghe thử"
 * button that previews the *current local* slider position (not the saved
 * one) so the user hears exactly what they're dragging toward.
 */
export default function TtsRateControl({ value, onCommit }: Props) {
  const [local, setLocal] = useState(value);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragging = useRef(false);

  useEffect(() => {
    if (!dragging.current) setLocal(value);
  }, [value]);

  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, []);

  function scheduleCommit(v: number) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => onCommit(v), 400);
  }

  function commitNow(v: number) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = null;
    dragging.current = false;
    onCommit(v);
  }

  function preview() {
    speak('Reading practice helps you understand English more naturally.', {
      rate: local,
      lang: 'en-US',
    });
  }

  const display = local.toFixed(1);

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <span style={{ color: 'var(--v-muted)', display: 'inline-flex', alignItems: 'center' }}>
          <Gauge size={14} />
        </span>
        <span style={{ flex: 1, fontFamily: 'var(--v-font-body)', fontSize: 'var(--v-text-md)', color: 'var(--v-ink)', fontWeight: 600 }}>
          Tốc độ đọc của Bún
        </span>
        <span style={{ fontFamily: 'var(--v-font-head)', fontSize: 'var(--v-text-md)', fontWeight: 900, color: 'var(--v-primary)' }}>
          {display}×
        </span>
      </div>
      <input
        type="range"
        min={M4_SETTINGS.passage_tts_rate.min}
        max={M4_SETTINGS.passage_tts_rate.max}
        step={M4_SETTINGS.passage_tts_rate.step}
        value={local}
        onPointerDown={() => { dragging.current = true; }}
        onChange={(e) => {
          const v = Number(e.target.value);
          setLocal(v);
          scheduleCommit(v);
        }}
        onPointerUp={(e) => commitNow(Number((e.target as HTMLInputElement).value))}
        onKeyUp={(e) => commitNow(Number((e.target as HTMLInputElement).value))}
        style={{ width: '100%' }}
      />
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          marginTop: 4,
        }}
      >
        <div style={{ fontSize: 'var(--v-text-xs)', color: 'var(--v-muted)' }}>
          Tốc độ TTS khi nghe đọc bài
        </div>
        <button
          type="button"
          onClick={preview}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            padding: '4px 10px',
            borderRadius: 'var(--v-radius-sm)',
            border: '1px solid var(--v-border)',
            background: 'var(--v-surface)',
            color: 'var(--v-ink)',
            fontFamily: 'var(--v-font-body)',
            fontSize: 'var(--v-text-xs)',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          <Play size={12} /> Nghe thử
        </button>
      </div>
    </div>
  );
}
