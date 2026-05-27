'use client';

import { useState } from 'react';
import { Upload } from 'lucide-react';
import DeckImportDialog from './DeckImportDialog';

/**
 * Tiny trigger button that opens the import dialog. Lives on /decks so the
 * learner can pick up a backed-up JSON file (from `Export` on any deck
 * detail page) and either create a new deck or insert into an existing one.
 */
export default function DeckImportButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '8px 14px',
          background: 'var(--v-surface)',
          color: 'var(--v-ink-soft)',
          border: '1px solid var(--v-border)',
          borderRadius: 'var(--v-radius-md)',
          boxShadow: 'var(--v-shadow-sm)',
          fontFamily: 'var(--v-font-head)',
          fontWeight: 800,
          fontSize: 'var(--v-text-sm)',
          cursor: 'pointer',
        }}
      >
        <Upload size={13} /> Import bộ từ
      </button>
      {open && <DeckImportDialog onClose={() => setOpen(false)} />}
    </>
  );
}
