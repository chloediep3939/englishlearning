'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import DeckEditor from './DeckEditor';

/** Fired on window after a deck is created here so DeckList (a sibling
 *  subtree that owns the fetched list) knows to reload. */
export const DECKS_CHANGED_EVENT = 'decks:changed';

/**
 * "TẠO BỘ MỚI" trigger for the /decks title row — lives next to the Import
 * button, outside DeckList, so it carries its own DeckEditor modal.
 */
export default function DeckCreateButton() {
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
          background: 'var(--v-primary)',
          color: '#fff',
          border: 'none',
          borderRadius: 'var(--v-radius-md)',
          boxShadow: 'var(--v-press), 0 4px 10px rgba(122,193,67,0.4)',
          fontFamily: 'var(--v-font-head)',
          fontWeight: 900,
          fontSize: 'var(--v-text-sm)',
          cursor: 'pointer',
        }}
      >
        <Plus size={13} /> TẠO BỘ MỚI
      </button>
      {open && (
        <DeckEditor
          deck={null}
          onClose={() => setOpen(false)}
          onSaved={() => {
            setOpen(false);
            window.dispatchEvent(new Event(DECKS_CHANGED_EVENT));
          }}
        />
      )}
    </>
  );
}
