'use client';

import { useEffect, useRef, useState } from 'react';
import { Mic } from 'lucide-react';
import { M3_SETTINGS } from '@/lib/types';

interface Props {
  value: number;
  onCommit: (v: number) => void;
}

/**
 * F1 pronunciation: slider 1-10 PLUS a "Không giới hạn" checkbox.
 * Checked stores 0; unchecked + dragging stores 1-10. When the user
 * re-enables the slider, it snaps back to the previously stored numeric
 * value (else the M3 default of 3). 0/unlimited only writes when the
 * checkbox toggles — not when the slider drags toward small values.
 */
export default function MaxAttemptsControl({ value, onCommit }: Props) {
  const unlimited = value === 0;
  const sliderDefault = M3_SETTINGS.f1_max_attempts.default;
  const [sliderValue, setSliderValue] = useState<number>(unlimited ? sliderDefault : value);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragging = useRef(false);

  useEffect(() => {
    if (!dragging.current && !unlimited) setSliderValue(value);
  }, [value, unlimited]);

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

  function toggleUnlimited(next: boolean) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    dragging.current = false;
    onCommit(next ? 0 : sliderValue);
  }

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <span style={{ color: 'var(--v-muted)', display: 'inline-flex', alignItems: 'center' }}>
          <Mic size={14} />
        </span>
        <span style={{ flex: 1, fontFamily: 'var(--v-font-body)', fontSize: 'var(--v-text-md)', color: 'var(--v-ink)', fontWeight: 600 }}>
          Số lần thử khi luyện đọc
        </span>
        <span style={{ fontFamily: 'var(--v-font-head)', fontSize: 'var(--v-text-md)', fontWeight: 900, color: 'var(--v-primary)' }}>
          {unlimited ? '∞' : `${sliderValue} lần`}
        </span>
      </div>
      <input
        type="range"
        min={M3_SETTINGS.f1_max_attempts.min}
        max={M3_SETTINGS.f1_max_attempts.max}
        step={M3_SETTINGS.f1_max_attempts.step}
        value={sliderValue}
        disabled={unlimited}
        onPointerDown={() => { dragging.current = true; }}
        onChange={(e) => {
          const v = Number(e.target.value);
          setSliderValue(v);
          scheduleCommit(v);
        }}
        onPointerUp={(e) => commitNow(Number((e.target as HTMLInputElement).value))}
        onKeyUp={(e) => commitNow(Number((e.target as HTMLInputElement).value))}
        style={{ width: '100%', opacity: unlimited ? 0.5 : 1 }}
      />
      <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 4, cursor: 'pointer' }}>
        <input
          type="checkbox"
          checked={unlimited}
          onChange={(e) => toggleUnlimited(e.target.checked)}
        />
        <span style={{ fontSize: 'var(--v-text-sm)', color: 'var(--v-ink-soft)' }}>Không giới hạn</span>
      </label>
      <div style={{ fontSize: 'var(--v-text-xs)', color: 'var(--v-muted)', marginTop: 2 }}>
        Khi đọc sai, Bún cho bạn thử lại tối đa bao nhiêu lần
      </div>
    </div>
  );
}
