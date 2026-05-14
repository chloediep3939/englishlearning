'use client';

import { useState, useEffect } from 'react';
import { Plus, Folder, Pencil, Trash2 } from 'lucide-react';
import DeckEditor from './DeckEditor';
import LoadingState from './LoadingState';
import type { FlashcardDeck, FlashcardDeckWithCounts } from '@/lib/types';

export default function DeckList() {
  const [decks, setDecks] = useState<FlashcardDeckWithCounts[]>([]);
  const [loading, setLoading] = useState(true);
  // undefined = no modal open. null = creating new. FlashcardDeck = editing existing.
  const [editing, setEditing] = useState<FlashcardDeck | null | undefined>(undefined);

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

  async function handleDelete(deck: FlashcardDeckWithCounts) {
    if (deck.is_default) {
      alert('Không thể xoá bộ mặc định.');
      return;
    }
    const confirmed = window.confirm(
      `Xoá "${deck.name}"? ${deck.total} từ trong bộ này sẽ chuyển về bộ mặc định.`
    );
    if (!confirmed) return;
    try {
      const res = await fetch(`/api/decks/${deck.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        alert(data.error || 'Không xoá được.');
        return;
      }
      await load();
    } catch {
      alert('Lỗi kết nối.');
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
          gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
          gap: 12,
        }}
      >
        {decks.map((deck) => (
          <div
            key={deck.id}
            style={{
              padding: 16,
              background: 'var(--v-surface)',
              border: '1px solid var(--v-border)',
              borderRadius: 'var(--v-radius-md)',
              boxShadow: 'var(--v-shadow-sm)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                width: 4,
                background: deck.color,
              }}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, marginLeft: 6 }}>
              <Folder size={16} style={{ color: deck.color }} />
              <h3
                style={{
                  fontFamily: 'var(--v-font-head)',
                  fontWeight: 900,
                  fontSize: 'var(--v-text-lg)',
                  margin: 0,
                  color: 'var(--v-ink)',
                  flex: 1,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {deck.name}
              </h3>
              {deck.is_default && (
                <span
                  style={{
                    padding: '1px 6px',
                    background: 'var(--v-primary-soft)',
                    color: 'var(--v-primary-deep)',
                    borderRadius: 'var(--v-radius-pill)',
                    fontSize: 10,
                    fontWeight: 800,
                    letterSpacing: 'var(--v-tracking-wide)',
                    textTransform: 'uppercase',
                  }}
                >
                  Mặc định
                </span>
              )}
            </div>
            <div
              style={{
                marginLeft: 6,
                fontFamily: 'var(--v-font-head)',
                fontSize: 'var(--v-text-3xl)',
                fontWeight: 900,
                color: deck.color,
                lineHeight: 1,
                marginBottom: 6,
              }}
            >
              {deck.total}
              <span style={{ fontSize: 'var(--v-text-sm)', fontWeight: 700, color: 'var(--v-muted)', marginLeft: 6 }}>
                từ
              </span>
            </div>
            {deck.description && (
              <p style={{ marginLeft: 6, color: 'var(--v-muted)', fontSize: 'var(--v-text-sm)', margin: '0 0 10px 6px' }}>
                {deck.description}
              </p>
            )}
            <div style={{ marginLeft: 6, display: 'flex', gap: 6 }}>
              <button
                type="button"
                onClick={() => setEditing(deck)}
                style={iconBtnStyle()}
              >
                <Pencil size={12} /> Sửa
              </button>
              {!deck.is_default && (
                <button
                  type="button"
                  onClick={() => handleDelete(deck)}
                  style={{ ...iconBtnStyle(), color: 'var(--v-red)' }}
                >
                  <Trash2 size={12} /> Xoá
                </button>
              )}
            </div>
          </div>
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
    </>
  );
}

function iconBtnStyle(): React.CSSProperties {
  return {
    padding: '4px 10px',
    background: 'transparent',
    border: '1px solid var(--v-border)',
    borderRadius: 'var(--v-radius-sm)',
    color: 'var(--v-ink-soft)',
    fontFamily: 'var(--v-font-head)',
    fontWeight: 700,
    fontSize: 'var(--v-text-xs)',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
  };
}
