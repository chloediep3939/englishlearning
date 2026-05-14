'use client';

import { Palette, Sun, Moon, Monitor } from 'lucide-react';
import type { ThemeMode } from '@/lib/types';

interface Props {
  value: ThemeMode;
  onChange: (v: ThemeMode) => void;
  disabled: boolean;
}

const OPTIONS: Array<{ value: ThemeMode; label: string; icon: React.ReactNode }> = [
  { value: 'light', label: 'Sáng', icon: <Sun size={14} /> },
  { value: 'dark', label: 'Tối', icon: <Moon size={14} /> },
  { value: 'system', label: 'Hệ thống', icon: <Monitor size={14} /> },
];

/**
 * 3-button segmented picker: Sáng / Tối / Hệ thống. The settings page
 * applies the chosen mode to `<html data-theme>` immediately on click
 * via `applyThemeImmediately`; the PUT to /api/settings persists it.
 */
export default function ThemeControl({ value, onChange, disabled }: Props) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ color: 'var(--v-muted)', display: 'inline-flex', alignItems: 'center' }}>
          <Palette size={14} />
        </span>
        <span style={{ flex: 1, fontFamily: 'var(--v-font-body)', fontSize: 'var(--v-text-md)', color: 'var(--v-ink)', fontWeight: 600 }}>
          Chế độ màu
        </span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
        {OPTIONS.map((opt) => {
          const active = opt.value === value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              disabled={disabled}
              style={{
                padding: '10px 0',
                borderRadius: 'var(--v-radius-sm)',
                border: '1.5px solid',
                borderColor: active ? 'var(--v-primary)' : 'var(--v-border)',
                background: active ? 'var(--v-primary)' : 'var(--v-surface)',
                color: active ? '#fff' : 'var(--v-ink)',
                fontFamily: 'var(--v-font-head)',
                fontSize: 'var(--v-text-sm)',
                fontWeight: 800,
                cursor: disabled ? 'wait' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                transition: 'background 120ms var(--v-ease)',
              }}
            >
              {opt.icon}
              {opt.label}
            </button>
          );
        })}
      </div>
      <div style={{ fontSize: 'var(--v-text-xs)', color: 'var(--v-muted)', marginTop: 6 }}>
        Sáng / Tối / Theo cài đặt hệ thống của máy bạn
      </div>
    </div>
  );
}
