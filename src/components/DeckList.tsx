'use client';

import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import DeckEditor from './DeckEditor';
import DeckCard from './DeckCard';
import DeleteDeckDialog from './deck-detail/DeleteDeckDialog';
import FilterPill from './deck-detail/FilterPill';
import LoadingState from '@/components/common/LoadingState';
import type { DeckStudyMode, FlashcardDeck, FlashcardDeckWithCounts } from '@/lib/types';

export default function DeckList() {
  const [decks, setDecks] = useState<FlashcardDeckWithCounts[]>([]);
  const [loading, setLoading] = useState(true);
  // Which study-mode tab is showing: 'full' (học đầy đủ) or 'meaning'
  // (chỉ hiểu nghĩa — reference decks).
  const [tab, setTab] = useState<DeckStudyMode>('full');
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

  const fullDecks = decks.filter((d) => d.study_mode !== 'meaning');
  const meaningDecks = decks.filter((d) => d.study_mode === 'meaning');
  const visible = tab === 'meaning' ? meaningDecks : fullDecks;

  return (
    <>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          flexWrap: 'wrap',
          marginBottom: 18,
        }}
      >
        <FilterPill
          label={`Học đầy đủ (${fullDecks.length})`}
          active={tab === 'full'}
          onClick={() => setTab('full')}
        />
        <FilterPill
          label={`Chỉ hiểu nghĩa (${meaningDecks.length})`}
          active={tab === 'meaning'}
          onClick={() => setTab('meaning')}
        />
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
            marginLeft: 8,
          }}
        >
          <Plus size={14} /> TẠO BỘ MỚI
        </button>
      </div>

      {visible.length === 0 ? (
        <div
          style={{
            padding: '28px 16px',
            border: '1.5px dashed var(--v-border)',
            borderRadius: 'var(--v-radius-lg)',
            textAlign: 'center',
            color: 'var(--v-muted)',
            fontFamily: 'var(--v-font-body)',
            fontSize: 'var(--v-text-md)',
          }}
        >
          {tab === 'meaning'
            ? 'Chưa có bộ "chỉ hiểu nghĩa" nào — sửa một bộ và đổi Loại bộ để chuyển sang tab này.'
            : 'Chưa có bộ nào ở tab này.'}
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 16,
          }}
        >
          {visible.map((deck) => (
            <DeckCard
              key={deck.id}
              deck={deck}
              onEdit={() => setEditing(deck)}
              onDelete={() => handleDelete(deck)}
            />
          ))}
        </div>
      )}

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
