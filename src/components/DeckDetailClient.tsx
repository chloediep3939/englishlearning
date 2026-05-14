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
import type {
  DeckIcon, Flashcard, FlashcardDeck, FlashcardStatus,
} from '@/lib/types';
import { DECK_ICON_OPTIONS } from '@/lib/types';
import AudioButton from './AudioButton';
import DeckEditor from './DeckEditor';

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

type FilterTab = 'all' | FlashcardStatus;

const STAGE_LABEL: Record<FlashcardStatus, string> = {
  new: 'New',
  learning: 'Học',
  review: 'Ôn',
  mastered: 'Thuộc',
};

const STAGE_COLOR: Record<FlashcardStatus, string> = {
  new: 'var(--v-blue)',
  learning: 'var(--v-orange)',
  review: 'var(--v-primary)',
  mastered: 'var(--v-purple)',
};

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

// ============================================================================
// Stage breakdown bar
// ============================================================================

function StageBreakdown({
  counts,
  total,
}: {
  counts: Record<FlashcardStatus, number>;
  total: number;
}) {
  const stages: FlashcardStatus[] = ['new', 'learning', 'review', 'mastered'];

  return (
    <div>
      <div
        style={{
          display: 'flex',
          height: 12,
          borderRadius: 'var(--v-radius-pill)',
          overflow: 'hidden',
          background: 'var(--v-border)',
          marginBottom: 10,
        }}
      >
        {stages.map((s) => {
          const pct = total > 0 ? (counts[s] / total) * 100 : 0;
          if (pct === 0) return null;
          return (
            <div
              key={s}
              style={{
                width: `${pct}%`,
                background: STAGE_COLOR[s],
                transition: 'width 0.3s ease',
              }}
              title={`${STAGE_LABEL[s]}: ${counts[s]}`}
            />
          );
        })}
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 8,
        }}
      >
        {stages.map((s) => (
          <div key={s} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: STAGE_COLOR[s],
                  display: 'inline-block',
                }}
              />
              <span
                style={{
                  fontFamily: 'var(--v-font-body)',
                  fontSize: 'var(--v-text-xs)',
                  fontWeight: 700,
                  letterSpacing: 'var(--v-tracking-wide)',
                  textTransform: 'uppercase',
                  color: 'var(--v-muted)',
                }}
              >
                {STAGE_LABEL[s]}
              </span>
            </div>
            <span
              style={{
                fontFamily: 'var(--v-font-head)',
                fontSize: 'var(--v-text-xl)',
                fontWeight: 900,
                color: 'var(--v-ink)',
              }}
            >
              {counts[s]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Filter pill
// ============================================================================

function FilterPill({
  label,
  active,
  color,
  onClick,
}: {
  label: string;
  active: boolean;
  color?: string;
  onClick: () => void;
}) {
  const accent = color ?? 'var(--v-primary)';
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '6px 14px',
        background: active ? accent : 'var(--v-surface)',
        color: active ? '#fff' : 'var(--v-ink-soft)',
        border: active ? `1px solid ${accent}` : '1px solid var(--v-border)',
        borderRadius: 'var(--v-radius-pill)',
        fontFamily: 'var(--v-font-head)',
        fontWeight: 800,
        fontSize: 'var(--v-text-sm)',
        cursor: 'pointer',
      }}
    >
      {label}
    </button>
  );
}

// ============================================================================
// Word row
// ============================================================================

function WordRow({
  card,
  isLast,
  onClick,
}: {
  card: Flashcard;
  isLast: boolean;
  onClick: () => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(120px, 1.2fr) minmax(100px, 1fr) minmax(120px, 1.5fr) auto',
        gap: 12,
        alignItems: 'center',
        padding: '12px 16px',
        borderBottom: isLast ? 'none' : '1px solid var(--v-border)',
        cursor: 'pointer',
        background: 'transparent',
        transition: 'background 0.15s ease',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.background = 'var(--v-surface)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.background = 'transparent';
      }}
    >
      <div
        style={{
          fontFamily: 'var(--v-font-head)',
          fontWeight: 800,
          fontSize: 'var(--v-text-base)',
          color: 'var(--v-ink)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {card.english}
      </div>
      <div
        style={{
          fontFamily: 'var(--v-font-mono)',
          fontSize: 'var(--v-text-sm)',
          color: 'var(--v-muted)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {card.ipa ?? '—'}
      </div>
      <div
        style={{
          fontFamily: 'var(--v-font-body)',
          fontSize: 'var(--v-text-sm)',
          color: 'var(--v-ink-soft)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {card.vietnamese}
      </div>
      <span
        style={{
          padding: '2px 10px',
          background: STAGE_COLOR[card.status],
          color: '#fff',
          borderRadius: 'var(--v-radius-pill)',
          fontFamily: 'var(--v-font-head)',
          fontSize: 'var(--v-text-xs)',
          fontWeight: 800,
          letterSpacing: 'var(--v-tracking-wide)',
          textTransform: 'uppercase',
          justifySelf: 'end',
        }}
      >
        {STAGE_LABEL[card.status]}
      </span>
    </div>
  );
}

// ============================================================================
// Card detail modal
// ============================================================================

function CardDetailModal({
  card,
  onClose,
  onDelete,
}: {
  card: Flashcard;
  onClose: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(20,20,30,0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        padding: 20,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--v-surface)',
          border: '1px solid var(--v-border)',
          borderRadius: 'var(--v-radius-lg)',
          boxShadow: 'var(--v-shadow-lg)',
          padding: 24,
          width: '100%',
          maxWidth: 520,
          maxHeight: 'calc(100vh - 40px)',
          overflowY: 'auto',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h2
                style={{
                  fontFamily: 'var(--v-font-head)',
                  fontWeight: 900,
                  fontSize: 'var(--v-text-2xl)',
                  margin: 0,
                  color: 'var(--v-ink)',
                }}
              >
                {card.english}
              </h2>
              <AudioButton audioUrl={card.audio_url} fallbackText={card.english} size={32} />
            </div>
            {card.ipa && (
              <div
                style={{
                  marginTop: 4,
                  fontFamily: 'var(--v-font-mono)',
                  fontSize: 'var(--v-text-md)',
                  color: 'var(--v-muted)',
                }}
              >
                {card.ipa}
              </div>
            )}
            <div
              style={{
                marginTop: 6,
                fontFamily: 'var(--v-font-body)',
                fontSize: 'var(--v-text-md)',
                color: 'var(--v-ink-soft)',
              }}
            >
              {card.vietnamese}
              {card.part_of_speech && (
                <span style={{ marginLeft: 8, color: 'var(--v-muted)' }}>
                  · {card.part_of_speech}
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            style={{
              padding: 6,
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--v-muted)',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {card.image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={card.image_url}
            alt={card.english}
            style={{
              width: '100%',
              maxHeight: 220,
              objectFit: 'cover',
              borderRadius: 'var(--v-radius-md)',
              marginBottom: 12,
            }}
          />
        )}

        {card.examples.length > 0 && (
          <Section title="Ví dụ">
            {card.examples.map((ex, i) => (
              <div
                key={i}
                style={{
                  padding: '8px 12px',
                  background: 'var(--v-panel)',
                  borderRadius: 'var(--v-radius-sm)',
                  marginBottom: 6,
                  fontFamily: 'var(--v-font-body)',
                  fontSize: 'var(--v-text-sm)',
                  color: 'var(--v-ink)',
                }}
              >
                <div>{ex.en}</div>
                {ex.vi && (
                  <div style={{ color: 'var(--v-muted)', marginTop: 2 }}>{ex.vi}</div>
                )}
              </div>
            ))}
          </Section>
        )}

        {card.collocations.length > 0 && (
          <Section title="Collocations">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {card.collocations.map((co, i) => (
                <span
                  key={i}
                  style={{
                    padding: '4px 10px',
                    background: 'var(--v-panel)',
                    border: '1px solid var(--v-border)',
                    borderRadius: 'var(--v-radius-pill)',
                    fontFamily: 'var(--v-font-body)',
                    fontSize: 'var(--v-text-sm)',
                    color: 'var(--v-ink-soft)',
                  }}
                >
                  {co.phrase}
                </span>
              ))}
            </div>
          </Section>
        )}

        {card.notes && (
          <Section title="Ghi chú">
            <p
              style={{
                margin: 0,
                fontFamily: 'var(--v-font-body)',
                fontSize: 'var(--v-text-sm)',
                color: 'var(--v-ink-soft)',
                whiteSpace: 'pre-wrap',
              }}
            >
              {card.notes}
            </p>
          </Section>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 18 }}>
          <button
            type="button"
            onClick={onDelete}
            style={{
              padding: '8px 14px',
              background: 'transparent',
              color: 'var(--v-red)',
              border: '1px solid var(--v-red)',
              borderRadius: 'var(--v-radius-md)',
              fontFamily: 'var(--v-font-head)',
              fontWeight: 800,
              fontSize: 'var(--v-text-sm)',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Trash2 size={12} /> Xoá thẻ
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 14 }}>
      <div
        style={{
          fontFamily: 'var(--v-font-body)',
          fontSize: 'var(--v-text-xs)',
          fontWeight: 800,
          color: 'var(--v-muted)',
          letterSpacing: 'var(--v-tracking-wider)',
          textTransform: 'uppercase',
          marginBottom: 6,
        }}
      >
        {title}
      </div>
      {children}
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
