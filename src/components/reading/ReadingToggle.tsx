'use client';

import type { ReactNode } from 'react';

/**
 * Shared toggle row for the Read-Along rail. Used for both the parallel-
 * translation toggle (teal accent + icon) and the auto-continue toggle (blue
 * accent, no icon) — one component instead of two near-identical files.
 */
export default function ReadingToggle({
  title,
  hint,
  checked,
  onChange,
  accent,
  icon,
  disabled = false,
}: {
  title: string;
  hint: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  accent: string;
  icon?: ReactNode;
  disabled?: boolean;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'var(--v-surface)',
        border: '1px solid var(--v-border)',
        boxShadow: 'var(--v-shadow-md)',
        borderRadius: 18,
        padding: '14px 16px',
        opacity: disabled ? 0.55 : 1,
      }}
    >
      <div style={{ flex: 1, minWidth: 0, paddingRight: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
        {icon && (
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 10,
              background: accent,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: `0 2px 4px ${accent}55`,
            }}
          >
            {icon}
          </div>
        )}
        <div>
          <div style={{ fontFamily: 'var(--v-font-head)', fontSize: 14, fontWeight: 900, color: 'var(--v-ink)' }}>
            {title}
          </div>
          <div style={{ fontFamily: 'var(--v-font-body)', fontSize: 11, fontWeight: 700, color: 'var(--v-muted)', marginTop: 1 }}>
            {hint}
          </div>
        </div>
      </div>
      <button
        role="switch"
        aria-checked={checked}
        aria-label={title}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        style={{
          width: 44,
          height: 24,
          borderRadius: 999,
          background: checked ? accent : 'var(--v-border)',
          position: 'relative',
          border: 'none',
          cursor: disabled ? 'default' : 'pointer',
          flexShrink: 0,
          transition: 'background .2s',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 2,
            left: checked ? 22 : 2,
            width: 20,
            height: 20,
            borderRadius: '50%',
            background: '#fff',
            boxShadow: '0 1px 3px rgba(0,0,0,.2)',
            transition: 'left .2s',
          }}
        />
      </button>
    </div>
  );
}
