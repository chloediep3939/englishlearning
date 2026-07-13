'use client';

import { useEffect, useRef, useState } from 'react';
import { Timer } from 'lucide-react';
import { M3_SETTINGS } from '@/lib/types';

interface Props {
  value: number;
  onCommit: (v: number) => void;
}

/**
 * Flashcard nhanh per-question timer: slider 4-20s PLUS a "Tắt đồng hồ"
 * checkbox. Checked stores 0 (no countdown bar); unchecked + dragging stores
 * 4-20. Mirrors MaxAttemptsControl's 0/unlimited pattern — 0 only writes when
 * the checkbox toggles, not when the slider drags toward small values.
 */
export default function SpeedTimerControl({ value, onCommit }: Props) {
  const off = value === 0;
  const sliderDefault = M3_SETTINGS.speed_timer_seconds.default;
  const [sliderValue, setSliderValue] = useState<number>(off ? sliderDefault : value);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragging = useRef(false);

  useEffect(() => {
    if (!dragging.current && !off) setSliderValue(value);
  }, [value, off]);

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

  function toggleOff(next: boolean) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    dragging.current = false;
    onCommit(next ? 0 : sliderValue);
  }

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <span style={{ color: 'var(--v-muted)', display: 'inline-flex', alignItems: 'center' }}>
          <Timer size={14} />
        </span>
        <span style={{ flex: 1, fontFamily: 'var(--v-font-body)', fontSize: 'var(--v-text-md)', color: 'var(--v-ink)', fontWeight: 600 }}>
          Thời gian mỗi câu (Flashcard nhanh)
        </span>
        <span style={{ fontFamily: 'var(--v-font-head)', fontSize: 'var(--v-text-md)', fontWeight: 900, color: 'var(--v-primary)' }}>
          {off ? 'Tắt' : `${sliderValue} giây`}
        </span>
      </div>
      <input
        type="range"
        min={M3_SETTINGS.speed_timer_seconds.min}
        max={M3_SETTINGS.speed_timer_seconds.max}
        step={M3_SETTINGS.speed_timer_seconds.step}
        value={sliderValue}
        disabled={off}
        onPointerDown={() => { dragging.current = true; }}
        onChange={(e) => {
          const v = Number(e.target.value);
          setSliderValue(v);
          scheduleCommit(v);
        }}
        onPointerUp={(e) => commitNow(Number((e.target as HTMLInputElement).value))}
        onKeyUp={(e) => commitNow(Number((e.target as HTMLInputElement).value))}
        style={{ width: '100%', opacity: off ? 0.5 : 1 }}
      />
      <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 4, cursor: 'pointer' }}>
        <input
          type="checkbox"
          checked={off}
          onChange={(e) => toggleOff(e.target.checked)}
        />
        <span style={{ fontSize: 'var(--v-text-sm)', color: 'var(--v-ink-soft)' }}>Tắt đồng hồ</span>
      </label>
      <div style={{ fontSize: 'var(--v-text-xs)', color: 'var(--v-muted)', marginTop: 2 }}>
        Thanh đếm ngược ở đầu mỗi câu. Tắt để đọc thong thả không áp lực.
      </div>
    </div>
  );
}
