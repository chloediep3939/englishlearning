'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Pencil, Trash2, Search, X, Plus,
  BookOpen, Coffee, Briefcase, GraduationCap, Plane, Heart,
  Star, Music, Camera, Code, Flame, Sparkles,
  Loader2, AlertTriangle,
  type LucideIcon,
} from 'lucide-react';
import type { DeckIcon, Flashcard, FlashcardDeck, FlashcardStatus } from '@/lib/types';
import { DECK_ICON_OPTIONS } from '@/lib/types';
import { apiJson } from '@/lib/common/api-json';
import DeckEditor from './DeckEditor';
import StageBreakdown from './deck-detail/StageBreakdown';
import FilterPill from './deck-detail/FilterPill';
import WordRow, { getMissingFields, type RegenField } from './deck-detail/WordRow';
import CardDetailModal from './deck-detail/CardDetailModal';
import DeleteDeckDialog from './deck-detail/DeleteDeckDialog';
import DeckExportButton from './deck-detail/DeckExportButton';
import RefreshAudioButton from './deck-detail/RefreshAudioButton';
import { STAGE_COLOR, type FilterTab } from './deck-detail/constants';

interface RegenResponse {
  card: Flashcard;
  ok: RegenField[];
  failed: RegenField[];
}

interface BulkProgress {
  total: number;
  done: number;
  fixed: number;
  failed: number;
}

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
  const [deleting, setDeleting] = useState(false);

  const Icon = resolveIcon(deck.icon);

  // Bulk regen state. `bulkProgress` is non-null while a sweep is running —
  // we render an inline strip showing live counts and prevent re-entrance.
  const [bulkProgress, setBulkProgress] = useState<BulkProgress | null>(null);

  const counts = useMemo(() => {
    const c: Record<FlashcardStatus, number> = {
      new: 0, learning: 0, review: 0, mastered: 0,
    };
    for (const card of cards) c[card.status]++;
    return c;
  }, [cards]);

  const brokenCards = useMemo(
    () => cards.filter((c) => getMissingFields(c).length > 0),
    [cards],
  );

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

  function handleDeleteDeck() {
    if (deck.is_default) {
      alert('Không thể xoá bộ mặc định.');
      return;
    }
    if (total === 0) {
      void confirmDelete(false);
      return;
    }
    setDeleting(true);
  }

  async function confirmDelete(deleteCards: boolean) {
    try {
      const url = `/api/decks/${deck.id}${deleteCards ? '?delete_cards=true' : ''}`;
      const res = await fetch(url, { method: 'DELETE' });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        alert(data.error || 'Không xoá được.');
        return;
      }
      router.push('/decks');
    } catch {
      alert('Lỗi kết nối.');
    } finally {
      setDeleting(false);
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

  // Replace the row in `cards` with the just-saved version. The modal
  // closes itself via setMode('view'); we keep it open showing the
  // refreshed data so the user can confirm the change visually.
  function handleCardSaved(updated: Flashcard) {
    setCards((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    setSelectedCard(updated);
  }

  // Swap a card refreshed by the per-deck audio re-fetch into state. Unlike
  // handleCardSaved this doesn't open the modal — it's a background update.
  function handleCardUpdated(updated: Flashcard) {
    setCards((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
  }

  /**
   * Bulk regen: walks every broken card and calls /api/cards/[id]/regenerate
   * with the per-card missing-field list. Worker-pool concurrency 3 — high
   * enough to feel snappy, low enough to stay polite with Pexels/dictionary
   * upstreams. Per-card failures are logged but never abort the whole sweep.
   */
  async function handleBulkRegen() {
    if (bulkProgress !== null) return;
    const targets = brokenCards.map((c) => ({ card: c, missing: getMissingFields(c) }));
    if (targets.length === 0) return;

    setBulkProgress({ total: targets.length, done: 0, fixed: 0, failed: 0 });

    const PARALLELISM = 3;
    let cursor = 0;
    async function worker() {
      while (cursor < targets.length) {
        const idx = cursor++;
        const { card, missing } = targets[idx];
        try {
          const data = await apiJson<RegenResponse>(`/api/cards/${card.id}/regenerate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fields: missing }),
          });
          setCards((prev) => prev.map((c) => (c.id === data.card.id ? data.card : c)));
          setBulkProgress((p) =>
            p
              ? {
                  ...p,
                  done: p.done + 1,
                  fixed: p.fixed + (data.ok.length > 0 ? 1 : 0),
                  failed: p.failed + (data.ok.length === 0 ? 1 : 0),
                }
              : p,
          );
        } catch (err) {
          console.error('[bulk regen] error:', err);
          setBulkProgress((p) =>
            p ? { ...p, done: p.done + 1, failed: p.failed + 1 } : p,
          );
        }
      }
    }
    const workers = Array.from(
      { length: Math.min(PARALLELISM, targets.length) },
      () => worker(),
    );
    await Promise.allSettled(workers);

    // Keep the final-state strip visible for a few seconds so the user sees
    // the totals; then hide. The cards in state are already up-to-date.
    setTimeout(() => setBulkProgress(null), 4000);
  }

  async function handleSetDefault() {
    if (deck.is_default) return;
    try {
      const res = await fetch(`/api/decks/${deck.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_default: true }),
      });
      if (!res.ok) {
        alert('Không đặt được mặc định.');
        return;
      }
      // Server-component refetch picks up the new is_default flag.
      router.refresh();
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
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <Link
            href={`/add?deck_id=${deck.id}`}
            style={{
              ...smallBtnStyle(),
              background: 'var(--v-primary)',
              color: '#fff',
              border: 'none',
              boxShadow: 'var(--v-press), 0 4px 10px rgba(122,193,67,0.35)',
              textDecoration: 'none',
            }}
          >
            <Plus size={12} /> Thêm từ
          </Link>
          {deck.is_default ? (
            <span
              style={{
                padding: '6px 10px',
                background: 'var(--v-primary-soft)',
                color: 'var(--v-primary-deep)',
                borderRadius: 'var(--v-radius-pill)',
                fontFamily: 'var(--v-font-head)',
                fontWeight: 800,
                fontSize: 'var(--v-text-xs)',
                letterSpacing: 'var(--v-tracking-wide)',
                textTransform: 'uppercase',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <Star size={12} fill="currentColor" /> Mặc định
            </span>
          ) : (
            <button
              type="button"
              onClick={handleSetDefault}
              style={{ ...smallBtnStyle(), color: 'var(--v-primary)' }}
            >
              <Star size={12} /> Đặt mặc định
            </button>
          )}
          <DeckExportButton deckId={deck.id} />
          <RefreshAudioButton cards={cards} onCardUpdated={handleCardUpdated} />
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

        {/* Broken-card fixer — only shown when at least one card is missing
            an auto-fillable field. Sits inline so it stays adjacent to the
            stat breakdown that motivates it. */}
        {(brokenCards.length > 0 || bulkProgress) && (
          <div
            style={{
              marginTop: 14,
              padding: '10px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              flexWrap: 'wrap',
              background: 'rgba(255,154,60,0.10)',
              border: '1px solid rgba(255,154,60,0.32)',
              borderRadius: 'var(--v-radius-md)',
            }}
          >
            <AlertTriangle size={16} style={{ color: 'var(--v-orange)', flexShrink: 0 }} />
            <div
              style={{
                flex: 1,
                minWidth: 200,
                fontFamily: 'var(--v-font-body)',
                fontSize: 'var(--v-text-sm)',
                color: 'var(--v-ink)',
                fontWeight: 700,
              }}
            >
              {bulkProgress ? (
                <>
                  Đang sửa: {bulkProgress.done}/{bulkProgress.total} ·{' '}
                  <span style={{ color: 'var(--v-primary)' }}>OK {bulkProgress.fixed}</span>
                  {bulkProgress.failed > 0 && (
                    <>
                      {' · '}
                      <span style={{ color: 'var(--v-red)' }}>lỗi {bulkProgress.failed}</span>
                    </>
                  )}
                </>
              ) : (
                <>
                  <strong>{brokenCards.length} từ</strong> thiếu hình, audio, IPA, hoặc nghĩa.
                </>
              )}
            </div>
            <button
              type="button"
              onClick={handleBulkRegen}
              disabled={bulkProgress !== null}
              style={{
                padding: '8px 14px',
                background:
                  bulkProgress !== null ? 'var(--v-border)' : 'var(--v-orange)',
                color: '#fff',
                border: 'none',
                borderRadius: 'var(--v-radius-md)',
                boxShadow:
                  bulkProgress !== null
                    ? 'none'
                    : 'var(--v-press), 0 4px 10px rgba(255,154,60,0.4)',
                fontFamily: 'var(--v-font-head)',
                fontWeight: 900,
                fontSize: 'var(--v-text-sm)',
                cursor: bulkProgress !== null ? 'wait' : 'pointer',
                opacity: bulkProgress !== null ? 0.85 : 1,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              {bulkProgress !== null ? (
                <Loader2 size={12} style={{ animation: 'v-spin 1s linear infinite' }} />
              ) : (
                <Sparkles size={12} />
              )}
              {bulkProgress !== null
                ? 'Đang sửa…'
                : `Sửa ${brokenCards.length} từ thiếu info`}
            </button>
          </div>
        )}
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
          {total === 0 ? (
            <>
              Bộ này chưa có từ nào.{' '}
              <Link
                href={`/add?deck_id=${deck.id}`}
                style={{
                  color: 'var(--v-primary)',
                  fontWeight: 800,
                  textDecoration: 'none',
                }}
              >
                + Thêm từ ngay
              </Link>
            </>
          ) : (
            'Không có từ nào khớp.'
          )}
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
              index={idx + 1}
              isLast={idx === filtered.length - 1}
              onClick={() => setSelectedCard(card)}
              onCardUpdated={handleCardUpdated}
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
          onSaved={handleCardSaved}
        />
      )}

      {deleting && (
        <DeleteDeckDialog
          deckName={deck.name}
          cardCount={total}
          onCancel={() => setDeleting(false)}
          onConfirm={confirmDelete}
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
