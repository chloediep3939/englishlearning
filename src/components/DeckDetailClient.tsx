'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Pencil, Trash2, Search, X,
  BookOpen, Coffee, Briefcase, GraduationCap, Plane, Heart,
  Star, Music, Camera, Code, Flame, Sparkles,
  type LucideIcon,
} from 'lucide-react';
import type { DeckIcon, Flashcard, FlashcardDeck, FlashcardStatus } from '@/lib/types';
import { DECK_ICON_OPTIONS } from '@/lib/types';
import DeckEditor from './DeckEditor';
import StageBreakdown from './deck-detail/StageBreakdown';
import FilterPill from './deck-detail/FilterPill';
import WordRow from './deck-detail/WordRow';
import CardDetailModal from './deck-detail/CardDetailModal';
import { STAGE_COLOR, type FilterTab } from './deck-detail/constants';

interface Props {
  deck: FlashcardDeck;
  cards: Flashcard[];
}

const ICON_MAP: Record<DeckIcon, LucideIcon> = {
  BookOpen, Coffee, Briefcase, GraduationCap, Plane, Heart,
  Star, Music, Camera, Code, Flame, Sparkles,
};

function resolveIcon(name: string | null): LucideIcon {
  if (name && (DECK_ICON_OPTIONS as readonly string[]).includes(name)) {
    return ICON_MAP[name as DeckIcon];
  }
  return BookOpen;
}

export default function DeckDetailClient({ deck, cards: initialCards }: Props) {
  const router = useRouter();
  const [cards, setCards] = useState<Flashcard[]>(initialCards);
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<FilterTab>('all');
  const [editing, setEditing] = useState(false);
  const [selectedCard, setSelectedCard] = useState<Flashcard | null>(null);

  const Icon = resolveIcon(deck.icon);

  const counts = useMemo(() => {
    const c: Record<FlashcardStatus, number> = {
      new: 0, learning: 0, review: 0, mastered: 0,
    };
    for (const card of cards) c[card.status]++;
    return c;
  }, [cards]);

  const total = cards.length;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return cards.filter((c) => {
      if (tab !== 'all' && c.status !== tab) return false;
      if (q.length === 0) return true;
      return (
        c.english.toLowerCase().includes(q) ||
        c.vietnamese.toLowerCase().includes(q)
      );
    });
  }, [cards, query, tab]);

  async function handleDeleteDeck() {
    if (deck.is_default) {
      alert('Không thể xoá bộ mặc định.');
      return;
    }
    const ok = window.confirm(
      `Xoá "${deck.name}"? ${total} từ trong bộ này sẽ chuyển về bộ mặc định.`
    );
    if (!ok) return;
    try {
      const res = await fetch(`/api/decks/${deck.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        alert(data.error || 'Không xoá được.');
        return;
      }
      router.push('/decks');
    } catch {
      alert('Lỗi kết nối.');
    }
  }

  async function handleDeleteCard(cardId: number) {
    const ok = window.confirm('Xoá thẻ này khỏi bộ từ?');
    if (!ok) return;
    try {
      const res = await fetch(`/api/cards/${cardId}`, { method: 'DELETE' });
      if (!res.ok) {
        alert('Không xoá được.');
        return;
      }
      setCards((prev) => prev.filter((c) => c.id !== cardId));
      setSelectedCard(null);
    } catch {
      alert('Lỗi kết nối.');
    }
  }

  return (
    <div>
      {/* Header row: back + edit/delete */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 12,
        }}
      >
        <Link
          href="/decks"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            fontSize: 'var(--v-text-sm)',
            color: 'var(--v-muted)',
            textDecoration: 'none',
          }}
        >
          <ArrowLeft size={14} /> Bộ từ
        </Link>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            onClick={() => setEditing(true)}
            style={smallBtnStyle()}
          >
            <Pencil size={12} /> Sửa
          </button>
          {!deck.is_default && (
            <button
              type="button"
              onClick={handleDeleteDeck}
              style={{ ...smallBtnStyle(), color: 'var(--v-red)' }}
            >
              <Trash2 size={12} /> Xoá
            </button>
          )}
        </div>
      </div>

      {/* Hero card */}
      <div
        style={{
          padding: 24,
          background: 'var(--v-panel)',
          border: '1px solid var(--v-border)',
          borderRadius: 'var(--v-radius-lg)',
          boxShadow: 'var(--v-shadow-sm)',
          marginBottom: 18,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: 'var(--v-radius-lg)',
              background: deck.color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              flexShrink: 0,
              boxShadow: 'var(--v-shadow-md)',
            }}
          >
            <Icon size={36} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1
              style={{
                fontFamily: 'var(--v-font-head)',
                fontWeight: 900,
                fontSize: 'var(--v-text-3xl)',
                letterSpacing: 'var(--v-tracking-tight)',
                margin: 0,
                color: 'var(--v-ink)',
              }}
            >
              {deck.name}
            </h1>
            <div
              style={{
                marginTop: 4,
                color: 'var(--v-ink-soft)',
                fontFamily: 'var(--v-font-body)',
                fontSize: 'var(--v-text-md)',
              }}
            >
              {deck.subtitle ? `${deck.subtitle} · ` : ''}{total} từ
            </div>
          </div>
        </div>

        {/* Stage breakdown bar */}
        <StageBreakdown counts={counts} total={total} />
      </div>

      {/* Search + filter tabs */}
      <div
        style={{
          display: 'flex',
          gap: 12,
          alignItems: 'center',
          marginBottom: 16,
          flexWrap: 'wrap',
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 12px',
            background: 'var(--v-surface)',
            border: '1.5px solid var(--v-border)',
            borderRadius: 'var(--v-radius-md)',
            flex: '1 1 240px',
            maxWidth: 320,
          }}
        >
          <Search size={14} style={{ color: 'var(--v-muted)' }} />
          <input
            type="text"
            placeholder="Tìm từ..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              background: 'transparent',
              fontFamily: 'var(--v-font-body)',
              fontSize: 'var(--v-text-base)',
              color: 'var(--v-ink)',
              minWidth: 0,
            }}
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Xoá tìm kiếm"
              style={{
                padding: 0,
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--v-muted)',
                display: 'inline-flex',
              }}
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div style={{ display: 'inline-flex', gap: 6, flexWrap: 'wrap' }}>
          <FilterPill label="Tất cả" active={tab === 'all'} onClick={() => setTab('all')} />
          <FilterPill label="New" active={tab === 'new'} color={STAGE_COLOR.new} onClick={() => setTab('new')} />
          <FilterPill label="Học" active={tab === 'learning'} color={STAGE_COLOR.learning} onClick={() => setTab('learning')} />
          <FilterPill label="Ôn" active={tab === 'review'} color={STAGE_COLOR.review} onClick={() => setTab('review')} />
          <FilterPill label="Thuộc" active={tab === 'mastered'} color={STAGE_COLOR.mastered} onClick={() => setTab('mastered')} />
        </div>
      </div>

      {/* Word list */}
      {filtered.length === 0 ? (
        <div
          style={{
            padding: '40px 16px',
            textAlign: 'center',
            color: 'var(--v-muted)',
            fontFamily: 'var(--v-font-body)',
            fontSize: 'var(--v-text-md)',
            background: 'var(--v-panel)',
            border: '1px dashed var(--v-border)',
            borderRadius: 'var(--v-radius-md)',
          }}
        >
          {total === 0
            ? 'Bộ này chưa có từ nào. Thêm từ ở trang “Thêm từ”.'
            : 'Không có từ nào khớp.'}
        </div>
      ) : (
        <div
          style={{
            background: 'var(--v-panel)',
            border: '1px solid var(--v-border)',
            borderRadius: 'var(--v-radius-md)',
            overflow: 'hidden',
          }}
        >
          {filtered.map((card, idx) => (
            <WordRow
              key={card.id}
              card={card}
              isLast={idx === filtered.length - 1}
              onClick={() => setSelectedCard(card)}
            />
          ))}
        </div>
      )}

      {editing && (
        <DeckEditor
          deck={deck}
          onClose={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            router.refresh();
          }}
        />
      )}

      {selectedCard && (
        <CardDetailModal
          card={selectedCard}
          onClose={() => setSelectedCard(null)}
          onDelete={() => handleDeleteCard(selectedCard.id)}
        />
      )}
    </div>
  );
}


function smallBtnStyle(): React.CSSProperties {
  return {
    padding: '6px 12px',
    background: 'var(--v-surface)',
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
