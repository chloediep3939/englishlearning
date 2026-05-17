'use client';

import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import DeckEditor from './DeckEditor';
import DeckCard from './DeckCard';
import DeleteDeckDialog from './deck-detail/DeleteDeckDialog';
import LoadingState from '@/components/common/LoadingState';
import type { FlashcardDeck, FlashcardDeckWithCounts } from '@/lib/types';

export default function DeckList() {
  const [decks, setDecks] = useState<FlashcardDeckWithCounts[]>([]);
  const [loading, setLoading] = useState(true);
  // undefined = no modal open. null = creating new. FlashcardDeck = editing existing.
  const [editing, setEditing] = useState<FlashcardDeck | null | undefined>(undefined);
  const [deleting, setDeleting] = useState<FlashcardDeckWithCounts | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch('/api/decks');
      const data = (await res.json()) as { decks?: FlashcardDeckWithCounts[] };
      setDecks(data.decks ?? []);
    } catch {
      setDecks([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function handleDelete(deck: FlashcardDeckWithCounts) {
    if (deck.is_default) {
      alert('Không thể xoá bộ mặc định.');
      return;
    }
    if (deck.total === 0) {
      void confirmDelete(deck, false);
      return;
    }
    setDeleting(deck);
  }

  async function confirmDelete(deck: FlashcardDeckWithCounts, deleteCards: boolean) {
    try {
      const url = `/api/decks/${deck.id}${deleteCards ? '?delete_cards=true' : ''}`;
      const res = await fetch(url, { method: 'DELETE' });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        alert(data.error || 'Không xoá được.');
        return;
      }
      await load();
    } catch {
      alert('Lỗi kết nối.');
    } finally {
      setDeleting(null);
    }
  }

  if (loading) return <LoadingState message="Đang tải bộ từ…" />;

  return (
    <>
      <button
        type="button"
        onClick={() => setEditing(null)}
        style={{
          padding: '11px 18px',
          background: 'var(--v-primary)',
          color: '#fff',
          border: 'none',
          borderRadius: 'var(--v-radius-md)',
          boxShadow: 'var(--v-press), 0 4px 10px rgba(122,193,67,0.4)',
          fontFamily: 'var(--v-font-head)',
          fontWeight: 900,
          fontSize: 'var(--v-text-md)',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          cursor: 'pointer',
          marginBottom: 18,
        }}
      >
        <Plus size={14} /> TẠO BỘ MỚI
      </button>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 16,
        }}
      >
        {decks.map((deck) => (
          <DeckCard
            key={deck.id}
            deck={deck}
            onEdit={() => setEditing(deck)}
            onDelete={() => handleDelete(deck)}
          />
        ))}
      </div>

      {editing !== undefined && (
        <DeckEditor
          deck={editing}
          onClose={() => setEditing(undefined)}
          onSaved={() => {
            setEditing(undefined);
            void load();
          }}
        />
      )}

      {deleting && (
        <DeleteDeckDialog
          deckName={deleting.name}
          cardCount={deleting.total}
          onCancel={() => setDeleting(null)}
          onConfirm={(deleteCards) => confirmDelete(deleting, deleteCards)}
        />
      )}
    </>
  );
}
