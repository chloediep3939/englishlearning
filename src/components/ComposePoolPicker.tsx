'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Calendar, Folder, Shuffle, X } from 'lucide-react';
import Mascot from '@/components/common/Mascot';
import LoadingState from '@/components/common/LoadingState';
import type {
  CompositionSource,
  Flashcard,
  FlashcardDeckWithCounts,
  FlashcardSettings,
} from '@/lib/types';
import { apiJson } from '@/lib/common/api-json';

export interface ComposePoolSelection {
  source: CompositionSource;
  source_deck_id: number | null;
  words: Flashcard[];
}

interface Props {
  onConfirm: (selection: ComposePoolSelection) => void;
}

const DEFAULT_MAX = 30;

export default function ComposePoolPicker({ onConfirm }: Props) {
  const [tab, setTab] = useState<'today' | 'deck'>('today');
  const [maxWords, setMaxWords] = useState(DEFAULT_MAX);

  // Today tab
  const [todayWords, setTodayWords] = useState<Flashcard[] | null>(null);
  const [todayLoading, setTodayLoading] = useState(true);

  // Deck tab
  const [decks, setDecks] = useState<FlashcardDeckWithCounts[]>([]);
  const [selectedDeckId, setSelectedDeckId] = useState<number | null>(null);
  const [deckWords, setDeckWords] = useState<Flashcard[]>([]);
  const [deckWordsLoading, setDeckWordsLoading] = useState(false);
  const [selectedWordIds, setSelectedWordIds] = useState<Set<number>>(new Set());

  const [capWarning, setCapWarning] = useState(false);

  // Settings + initial load
  useEffect(() => {
    apiJson<FlashcardSettings>('/api/settings')
      .then((s) => {
        if (typeof s.f3_max_words_per_composition === 'number' && s.f3_max_words_per_composition >= 5) {
          setMaxWords(s.f3_max_words_per_composition);
        }
      })
      .catch(() => {
        /* fall back to default */
      });

    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const since = start.toISOString();
    apiJson<{ cards: Flashcard[] }>(
      `/api/compose/today-pool?since=${encodeURIComponent(since)}&limit=${DEFAULT_MAX}`
    )
      .then(({ cards }) => setTodayWords(cards))
      .catch(() => setTodayWords([]))
      .finally(() => setTodayLoading(false));

    apiJson<{ decks: FlashcardDeckWithCounts[] }>('/api/decks')
      .then(({ decks }) => setDecks(decks ?? []))
      .catch(() => {});
  }, []);

  // Fetch deck words when a deck is selected
  useEffect(() => {
    if (selectedDeckId === null) {
      setDeckWords([]);
      setSelectedWordIds(new Set());
      return;
    }
    setDeckWordsLoading(true);
    setSelectedWordIds(new Set());
    apiJson<{ cards: Flashcard[] }>(`/api/cards?deck_id=${selectedDeckId}&limit=500`)
      .then(({ cards }) => setDeckWords(cards ?? []))
      .catch(() => setDeckWords([]))
      .finally(() => setDeckWordsLoading(false));
  }, [selectedDeckId]);

  // ---------- Today tab handlers ----------
  function startToday() {
    if (!todayWords || todayWords.length === 0) return;
    onConfirm({
      source: 'today',
      source_deck_id: null,
      words: todayWords,
    });
  }

  // ---------- Deck tab handlers ----------
  function toggleWord(id: number) {
    setCapWarning(false);
    setSelectedWordIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        if (next.size >= maxWords) {
          setCapWarning(true);
          return prev;
        }
        next.add(id);
      }
      return next;
    });
  }

  function randomPick() {
    const target = Math.min(maxWords, deckWords.length);
    if (target === 0) return;
    const shuffled = deckWords.slice().sort(() => Math.random() - 0.5);
    setSelectedWordIds(new Set(shuffled.slice(0, target).map((w) => w.id)));
    setCapWarning(false);
  }

  function clearAll() {
    setSelectedWordIds(new Set());
    setCapWarning(false);
  }

  function startDeck() {
    if (selectedWordIds.size === 0) return;
    const selected = deckWords.filter((w) => selectedWordIds.has(w.id));
    onConfirm({
      source: 'deck',
      source_deck_id: selectedDeckId,
      words: selected,
    });
  }

  return (
    <div>
      {/* Tab bar */}
      <div
        style={{
          display: 'flex',
          gap: 6,
          padding: 4,
          background: 'var(--v-panel)',
          border: '1px solid var(--v-border)',
          borderRadius: 'var(--v-radius-md)',
          marginBottom: 16,
          width: 'fit-content',
        }}
      >
        <TabButton
          active={tab === 'today'}
          onClick={() => setTab('today')}
          icon={<Calendar size={14} />}
          label="Hôm nay"
        />
        <TabButton
          active={tab === 'deck'}
          onClick={() => setTab('deck')}
          icon={<Folder size={14} />}
          label="Bộ từ khác"
        />
      </div>

      {tab === 'today' && (
        <TodayPanel
          loading={todayLoading}
          words={todayWords}
          maxWords={maxWords}
          onStart={startToday}
        />
      )}

      {tab === 'deck' && (
        <DeckPanel
          decks={decks}
          selectedDeckId={selectedDeckId}
          onSelectDeck={setSelectedDeckId}
          deckWords={deckWords}
          deckWordsLoading={deckWordsLoading}
          selectedWordIds={selectedWordIds}
          onToggleWord={toggleWord}
          onRandom={randomPick}
          onClear={clearAll}
          onStart={startDeck}
          maxWords={maxWords}
          capWarning={capWarning}
        />
      )}
    </div>
  );
}

// ============================================================================
// Subcomponents
// ============================================================================

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
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '7px 14px',
        borderRadius: 8,
        border: 'none',
        background: active ? 'var(--v-surface)' : 'transparent',
        boxShadow: active ? 'var(--v-shadow-sm)' : 'none',
        color: active ? 'var(--v-ink)' : 'var(--v-muted)',
        fontFamily: 'var(--v-font-body)',
        fontWeight: 800,
        fontSize: 'var(--v-text-sm)',
        cursor: 'pointer',
      }}
    >
      {icon}
      {label}
    </button>
  );
}

function TodayPanel({
  loading,
  words,
  maxWords,
  onStart,
}: {
  loading: boolean;
  words: Flashcard[] | null;
  maxWords: number;
  onStart: () => void;
}) {
  if (loading) {
    return (
      <PanelShell>
        <LoadingState message="Đang tải các từ bạn đã học hôm nay…" />
      </PanelShell>
    );
  }

  if (!words || words.length === 0) {
    return (
      <PanelShell>
        <div
          style={{
            padding: 24,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 12,
            textAlign: 'center',
          }}
        >
          <Mascot pose="idle" size={84} />
          <div
            style={{
              fontFamily: 'var(--v-font-head)',
              fontSize: 'var(--v-text-lg)',
              fontWeight: 800,
              color: 'var(--v-ink)',
            }}
          >
            Hôm nay bạn chưa học từ nào
          </div>
          <div style={{ color: 'var(--v-muted)', maxWidth: 360 }}>
            Bún muốn bạn ôn vài thẻ trước rồi quay lại nha — bài viết sẽ dùng chính những từ vừa học.
          </div>
          <Link
            href="/study"
            style={{
              marginTop: 4,
              padding: '10px 18px',
              borderRadius: 'var(--v-radius-md)',
              background: 'var(--v-primary)',
              color: '#fff',
              fontFamily: 'var(--v-font-body)',
              fontWeight: 800,
              fontSize: 'var(--v-text-md)',
              textDecoration: 'none',
              boxShadow: 'var(--v-shadow-sm)',
            }}
          >
            Đi ôn tập
          </Link>
        </div>
      </PanelShell>
    );
  }

  return (
    <PanelShell>
      <div style={{ padding: 18 }}>
        <div
          style={{
            fontFamily: 'var(--v-font-body)',
            fontWeight: 700,
            fontSize: 'var(--v-text-md)',
            color: 'var(--v-ink)',
            marginBottom: 12,
          }}
        >
          Hôm nay bạn đã học <strong>{words.length}</strong> từ
          {words.length > maxWords && (
            <span style={{ color: 'var(--v-muted)', fontWeight: 500 }}>
              {' '}— hiển thị {Math.min(words.length, maxWords)} mới nhất
            </span>
          )}
          :
        </div>

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 6,
            maxHeight: 280,
            overflowY: 'auto',
            padding: 8,
            background: 'var(--v-bg)',
            border: '1px solid var(--v-border)',
            borderRadius: 'var(--v-radius-sm)',
            marginBottom: 16,
          }}
        >
          {words.map((w) => (
            <WordChip key={w.id} word={w} selected />
          ))}
        </div>

        <button
          onClick={onStart}
          style={{
            padding: '11px 22px',
            borderRadius: 'var(--v-radius-md)',
            background: 'var(--v-primary)',
            color: '#fff',
            border: 'none',
            fontFamily: 'var(--v-font-body)',
            fontWeight: 800,
            fontSize: 'var(--v-text-md)',
            cursor: 'pointer',
            boxShadow: 'var(--v-shadow-sm)',
          }}
        >
          Bắt đầu viết →
        </button>
      </div>
    </PanelShell>
  );
}

function DeckPanel({
  decks,
  selectedDeckId,
  onSelectDeck,
  deckWords,
  deckWordsLoading,
  selectedWordIds,
  onToggleWord,
  onRandom,
  onClear,
  onStart,
  maxWords,
  capWarning,
}: {
  decks: FlashcardDeckWithCounts[];
  selectedDeckId: number | null;
  onSelectDeck: (id: number | null) => void;
  deckWords: Flashcard[];
  deckWordsLoading: boolean;
  selectedWordIds: Set<number>;
  onToggleWord: (id: number) => void;
  onRandom: () => void;
  onClear: () => void;
  onStart: () => void;
  maxWords: number;
  capWarning: boolean;
}) {
  return (
    <PanelShell>
      <div style={{ padding: 18 }}>
        <label
          style={{
            display: 'block',
            fontFamily: 'var(--v-font-body)',
            fontWeight: 700,
            fontSize: 'var(--v-text-sm)',
            color: 'var(--v-muted)',
            marginBottom: 6,
            textTransform: 'uppercase',
            letterSpacing: 'var(--v-tracking-wider)',
          }}
        >
          Chọn bộ từ
        </label>
        <select
          value={selectedDeckId ?? ''}
          onChange={(e) => {
            const v = e.target.value;
            onSelectDeck(v ? Number(v) : null);
          }}
          style={{
            width: '100%',
            padding: '10px 12px',
            borderRadius: 'var(--v-radius-sm)',
            border: '1px solid var(--v-border)',
            background: 'var(--v-surface)',
            color: 'var(--v-ink)',
            fontFamily: 'var(--v-font-body)',
            fontSize: 'var(--v-text-md)',
            marginBottom: 16,
          }}
        >
          <option value="">— Chưa chọn bộ từ —</option>
          {decks.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name} ({d.total})
            </option>
          ))}
        </select>

        {selectedDeckId !== null && (
          <>
            {deckWordsLoading ? (
              <LoadingState message="Đang tải thẻ…" padding={24} size={56} />
            ) : deckWords.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--v-muted)' }}>
                Bộ này chưa có thẻ nào.
              </div>
            ) : (
              <>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 8,
                    gap: 8,
                    flexWrap: 'wrap',
                  }}
                >
                  <div
                    style={{
                      fontFamily: 'var(--v-font-body)',
                      fontWeight: 700,
                      fontSize: 'var(--v-text-sm)',
                      color: 'var(--v-ink)',
                    }}
                  >
                    Đã chọn: <strong>{selectedWordIds.size}</strong> / {maxWords} (tối đa)
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <SmallButton onClick={onRandom} icon={<Shuffle size={12} />}>
                      Random {Math.min(maxWords, deckWords.length)}
                    </SmallButton>
                    <SmallButton onClick={onClear} icon={<X size={12} />}>
                      Bỏ chọn hết
                    </SmallButton>
                  </div>
                </div>

                {capWarning && (
                  <div
                    style={{
                      padding: '8px 12px',
                      background: 'rgba(245,166,35,0.10)',
                      border: '1px solid rgba(245,166,35,0.30)',
                      borderRadius: 'var(--v-radius-sm)',
                      color: 'var(--v-orange)',
                      fontSize: 'var(--v-text-sm)',
                      marginBottom: 8,
                    }}
                  >
                    Tối đa {maxWords} từ — bỏ bớt từ nào đó trước nhé.
                  </div>
                )}

                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 6,
                    maxHeight: 320,
                    overflowY: 'auto',
                    padding: 8,
                    background: 'var(--v-bg)',
                    border: '1px solid var(--v-border)',
                    borderRadius: 'var(--v-radius-sm)',
                    marginBottom: 16,
                  }}
                >
                  {deckWords.map((w) => (
                    <WordChip
                      key={w.id}
                      word={w}
                      selected={selectedWordIds.has(w.id)}
                      onClick={() => onToggleWord(w.id)}
                    />
                  ))}
                </div>

                <button
                  onClick={onStart}
                  disabled={selectedWordIds.size === 0}
                  style={{
                    padding: '11px 22px',
                    borderRadius: 'var(--v-radius-md)',
                    background:
                      selectedWordIds.size === 0
                        ? 'var(--v-muted)'
                        : 'var(--v-primary)',
                    color: '#fff',
                    border: 'none',
                    fontFamily: 'var(--v-font-body)',
                    fontWeight: 800,
                    fontSize: 'var(--v-text-md)',
                    cursor: selectedWordIds.size === 0 ? 'not-allowed' : 'pointer',
                    boxShadow: 'var(--v-shadow-sm)',
                    opacity: selectedWordIds.size === 0 ? 0.6 : 1,
                  }}
                >
                  Bắt đầu viết →
                </button>
              </>
            )}
          </>
        )}
      </div>
    </PanelShell>
  );
}

function WordChip({
  word,
  selected,
  onClick,
}: {
  word: Flashcard;
  selected: boolean;
  onClick?: () => void;
}) {
  const interactive = typeof onClick === 'function';
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'baseline',
        gap: 6,
        padding: '5px 10px',
        borderRadius: 999,
        border: '1px solid',
        borderColor: selected ? 'var(--v-primary)' : 'var(--v-border)',
        background: selected ? 'var(--v-primary)' : 'var(--v-surface)',
        color: selected ? '#fff' : 'var(--v-ink)',
        fontFamily: 'var(--v-font-body)',
        fontSize: 'var(--v-text-sm)',
        fontWeight: 700,
        cursor: interactive ? 'pointer' : 'default',
      }}
    >
      <span>{word.english}</span>
      <span
        style={{
          opacity: 0.75,
          fontWeight: 500,
          fontSize: 'var(--v-text-xs)',
        }}
      >
        {word.vietnamese}
      </span>
    </button>
  );
}

function SmallButton({
  onClick,
  icon,
  children,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '6px 10px',
        borderRadius: 'var(--v-radius-sm)',
        background: 'var(--v-surface)',
        border: '1px solid var(--v-border)',
        color: 'var(--v-ink)',
        fontFamily: 'var(--v-font-body)',
        fontSize: 'var(--v-text-xs)',
        fontWeight: 700,
        cursor: 'pointer',
      }}
    >
      {icon}
      {children}
    </button>
  );
}

function PanelShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        background: 'var(--v-panel)',
        border: '1px solid var(--v-border)',
        borderRadius: 'var(--v-radius-md)',
        boxShadow: 'var(--v-shadow-sm)',
      }}
    >
      {children}
    </div>
  );
}

