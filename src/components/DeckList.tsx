'use client';

import { useState, useEffect } from 'react';
import { Eye, GraduationCap, Plus } from 'lucide-react';
import DeckEditor from './DeckEditor';
import DeckCard from './DeckCard';
import DeleteDeckDialog from './deck-detail/DeleteDeckDialog';
import LoadingState from '@/components/common/LoadingState';
import DeckViewToggle, { useDeckViewMode } from '@/components/common/DeckViewToggle';
import type { FlashcardDeck, FlashcardDeckWithCounts } from '@/lib/types';

type DeckTab = 'full' | 'recognition';

export default function DeckList() {
  const [decks, setDecks] = useState<FlashcardDeckWithCounts[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<DeckTab>('full');
  // undefined = no modal open. null = creating new. FlashcardDeck = editing existing.
  const [editing, setEditing] = useState<FlashcardDeck | null | undefined>(undefined);
  const [deleting, setDeleting] = useState<FlashcardDeckWithCounts | null>(null);
  const [viewMode, setViewMode] = useDeckViewMode();

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

  const visible = decks.filter((d) => d.recognition_only === (tab === 'recognition'));

  return (
    <>
      {/* Deck-group tabs — same pill tablist styling as /add */}
      <div
        role="tablist"
        style={{
          display: 'inline-flex',
          gap: 4,
          padding: 4,
          background: 'var(--v-panel)',
          border: '1px solid var(--v-border)',
          borderRadius: 999,
          marginBottom: 18,
          marginRight: 12,
        }}
      >
        <TabButton
          active={tab === 'full'}
          onClick={() => setTab('full')}
          icon={<GraduationCap size={14} strokeWidth={2.4} />}
          label="Học đầy đủ"
        />
        <TabButton
          active={tab === 'recognition'}
          onClick={() => setTab('recognition')}
          icon={<Eye size={14} strokeWidth={2.4} />}
          label="Chỉ hiểu nghĩa"
        />
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          marginBottom: 18,
        }}
      >
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
          }}
        >
          <Plus size={14} /> TẠO BỘ MỚI
        </button>
        <DeckViewToggle mode={viewMode} onChange={setViewMode} />
      </div>

      {tab === 'recognition' && visible.length === 0 ? (
        <div
          style={{
            padding: '28px 20px',
            background: 'var(--v-surface)',
            border: '1px dashed var(--v-border)',
            borderRadius: 'var(--v-radius-lg)',
            textAlign: 'center',
            fontFamily: 'var(--v-font-body)',
            color: 'var(--v-muted)',
            fontSize: 'var(--v-text-md)',
            fontWeight: 600,
            maxWidth: 640,
          }}
        >
          Chưa có bộ từ &ldquo;Chỉ hiểu nghĩa&rdquo; nào. Mở phần sửa của một bộ từ và bật
          &ldquo;Chỉ hiểu nghĩa&rdquo; — bộ đó sẽ chỉ luyện nhận diện nghĩa, không luyện chính tả
          / gõ từ.
        </div>
      ) : (
        <div
          style={
            viewMode === 'grid'
              ? {
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                  gap: 16,
                }
              : { display: 'flex', flexDirection: 'column', gap: 10 }
          }
        >
          {visible.map((deck) => (
            <DeckCard
              key={deck.id}
              deck={deck}
              layout={viewMode}
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

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '8px 16px',
        background: active ? 'var(--v-primary-soft)' : 'transparent',
        color: active ? 'var(--v-primary)' : 'var(--v-ink-soft)',
        border: 'none',
        borderRadius: 999,
        fontFamily: 'var(--v-font-head)',
        fontWeight: 900,
        fontSize: 12,
        letterSpacing: '0.04em',
        cursor: 'pointer',
        transition: 'background 150ms var(--v-ease), color 150ms var(--v-ease)',
      }}
    >
      {icon}
      {label}
    </button>
  );
}
