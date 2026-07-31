'use client';

import { useEffect, useState } from 'react';
import { LayoutGrid, List } from 'lucide-react';

export type DeckViewMode = 'grid' | 'list';

// Shared per-device preference: every page that lists decks (bộ từ) reads
// the same key so switching view once applies everywhere.
const STORAGE_KEY = 'deck-view-mode';

export function useDeckViewMode(): [DeckViewMode, (mode: DeckViewMode) => void] {
  // SSR and first client render always use 'grid'; the stored value is
  // applied after mount to avoid a hydration mismatch.
  const [mode, setMode] = useState<DeckViewMode>('grid');

  useEffect(() => {
    try {
      if (window.localStorage.getItem(STORAGE_KEY) === 'list') setMode('list');
    } catch {
      // localStorage unavailable — preference just won't persist
    }
  }, []);

  function update(next: DeckViewMode) {
    setMode(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // localStorage unavailable — preference just won't persist
    }
  }

  return [mode, update];
}

interface Props {
  mode: DeckViewMode;
  onChange: (mode: DeckViewMode) => void;
}

export default function DeckViewToggle({ mode, onChange }: Props) {
  return (
    <div
      role="group"
      aria-label="Kiểu hiển thị bộ từ"
      style={{
        display: 'inline-flex',
        padding: 3,
        gap: 2,
        background: 'var(--v-surface)',
        border: '1px solid var(--v-border)',
        borderRadius: 'var(--v-radius-md)',
        boxShadow: 'var(--v-shadow-sm)',
        flexShrink: 0,
      }}
    >
      <ToggleButton
        active={mode === 'grid'}
        label="Xem dạng lưới"
        onClick={() => onChange('grid')}
      >
        <LayoutGrid size={15} />
      </ToggleButton>
      <ToggleButton
        active={mode === 'list'}
        label="Xem dạng danh sách"
        onClick={() => onChange('list')}
      >
        <List size={15} />
      </ToggleButton>
    </div>
  );
}

function ToggleButton({
  active, label, onClick, children,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      aria-pressed={active}
      style={{
        width: 30,
        height: 26,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: active ? 'var(--v-primary-soft)' : 'transparent',
        color: active ? 'var(--v-primary-deep)' : 'var(--v-muted)',
        border: 'none',
        borderRadius: 'var(--v-radius-sm)',
        cursor: 'pointer',
        padding: 0,
      }}
    >
      {children}
    </button>
  );
}
