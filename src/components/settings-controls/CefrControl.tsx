'use client';

import { GraduationCap } from 'lucide-react';
import type { CefrLevel } from '@/lib/types';

interface Props {
  value: CefrLevel;
  onChange: (v: CefrLevel) => void;
  disabled: boolean;
}

const CEFR_OPTIONS: Array<{ value: CefrLevel; label: string }> = [
  { value: 'A1', label: 'A1 — Mới bắt đầu' },
  { value: 'A2', label: 'A2 — Cơ bản' },
  { value: 'B1', label: 'B1 — Trung cấp' },
  { value: 'B2', label: 'B2 — Trung cao' },
  { value: 'C1', label: 'C1 — Cao cấp' },
  { value: 'C2', label: 'C2 — Thành thạo' },
];

/**
 * 6-button segmented picker for the user's CEFR level (A1-C2). Drives
 * M4 difficulty-analysis feedback on passages.
 */
export default function CefrControl({ value, onChange, disabled }: Props) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <span style={{ color: 'var(--v-muted)', display: 'inline-flex', alignItems: 'center' }}>
          <GraduationCap size={14} />
        </span>
        <span style={{ flex: 1, fontFamily: 'var(--v-font-body)', fontSize: 'var(--v-text-md)', color: 'var(--v-ink)', fontWeight: 600 }}>
          Trình độ tiếng Anh (CEFR)
        </span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 4, marginBottom: 4 }}>
        {CEFR_OPTIONS.map((opt) => {
          const active = opt.value === value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              disabled={disabled}
              style={{
                padding: '8px 0',
                borderRadius: 'var(--v-radius-sm)',
                border: '1.5px solid',
                borderColor: active ? 'var(--v-primary)' : 'var(--v-border)',
                background: active ? 'var(--v-primary)' : 'var(--v-surface)',
                color: active ? '#fff' : 'var(--v-ink)',
                fontFamily: 'var(--v-font-head)',
                fontSize: 'var(--v-text-sm)',
                fontWeight: 800,
                cursor: disabled ? 'wait' : 'pointer',
                transition: 'background 120ms var(--v-ease)',
              }}
            >
              {opt.value}
            </button>
          );
        })}
      </div>
      <div style={{ fontSize: 'var(--v-text-xs)', color: 'var(--v-muted)' }}>
        {CEFR_OPTIONS.find((o) => o.value === value)?.label} — Bún sẽ so độ khó của bài đọc với trình độ này
      </div>
    </div>
  );
}
