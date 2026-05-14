'use client';

import { useEffect, useRef, useState } from 'react';

interface Props {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onCommit: (v: number) => void;
  suffix: string;
}

/**
 * Plain settings slider with debounced commit. The local state stays
 * smooth while dragging; the parent's `onCommit` fires 400ms after the
 * last tick OR immediately on pointer-up / key-up. Stand-alone sibling
 * of SliderWithIcon (no icon column, no hint copy).
 */
export default function Slider({ label, value, min, max, step, onCommit, suffix }: Props) {
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

  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontFamily: 'var(--v-font-body)', fontSize: 'var(--v-text-md)', color: 'var(--v-ink)', fontWeight: 600 }}>
          {label}
        </span>
        <span style={{ fontFamily: 'var(--v-font-head)', fontSize: 'var(--v-text-md)', fontWeight: 900, color: 'var(--v-primary)' }}>
          {local} {suffix}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
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
    </div>
  );
}
