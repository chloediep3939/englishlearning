'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { AlarmClock, ChevronDown, Infinity as InfinityIcon, Play, RotateCcw, Sparkles } from 'lucide-react';
import { apiJson } from '@/lib/common/api-json';
import type {
  FlashcardDeckWithCounts,
  SentenceStudyResponse,
  StudySessionMode,
} from '@/lib/types';

export interface SentenceStartOpts {
  /** 0-based example index (UI shows "Câu 1/2/3"). */
  exampleIndex: number;
  mode: StudySessionMode;
  /** null = all decks. */
  deckIds: number[] | null;
  reviewLimit: number;
  newLimit: number;
  /** Time-boxed session length in minutes (25/45); null = count-based. */
  durationMin: number | null;
}

interface Props {
  decks: FlashcardDeckWithCounts[];
  defaultReviewLimit: number;
  defaultNewLimit: number;
  starting: boolean;
  onStart: (opts: SentenceStartOpts) => void;
}

const MODE_OPTIONS: Array<{ value: StudySessionMode; label: string; hint: string }> = [
  { value: 'review', label: 'Ôn',       hint: 'Chỉ câu đến hạn' },
  { value: 'new',    label: 'Học',      hint: 'Chỉ câu mới' },
  { value: 'mix',    label: 'Ôn + Học', hint: 'Xen kẽ kiểu Anki' },
];

function parseLimit(raw: string, fallback: number): number {
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1) return fallback;
  return Math.min(n, 200);
}

/**
 * "Học câu" setup — StudySetup's layout with the deck-group segment
 * replaced by the example-number segment (Câu 1/2/3, applied to the whole
 * session). Live pool counts refetch on scope / example-number changes.
 */
export default function SentenceStudySetup({
  decks, defaultReviewLimit, defaultNewLimit, starting, onStart,
}: Props) {
  const [exampleIndex, setExampleIndex] = useState(0);
  const [mode, setMode] = useState<StudySessionMode>('mix');
  const [reviewLimitRaw, setReviewLimitRaw] = useState(String(defaultReviewLimit));
  const [newLimitRaw, setNewLimitRaw] = useState(String(defaultNewLimit));
  // null = học theo số câu (như cũ); 25/45 = học theo thời gian.
  const [durationMin, setDurationMin] = useState<number | null>(null);
  // null = all decks.
  const [pickedDeckIds, setPickedDeckIds] = useState<Set<number> | null>(null);
  const [deckMenuOpen, setDeckMenuOpen] = useState(false);
  const [counts, setCounts] = useState<{ due: number; fresh: number } | null>(null);
  const [countsLoading, setCountsLoading] = useState(true);
  const deckMenuRef = useRef<HTMLDivElement>(null);

  const selectedIds = useMemo(() => {
    const all = decks.map((d) => d.id);
    if (pickedDeckIds === null) return all;
    return all.filter((id) => pickedDeckIds.has(id));
  }, [decks, pickedDeckIds]);

  // Live counts — refetch when scope or example number changes.
  useEffect(() => {
    let cancelled = false;
    setCountsLoading(true);
    const params = new URLSearchParams({ countsOnly: '1', exampleIndex: String(exampleIndex) });
    params.set('deckIds', selectedIds.join(','));
    apiJson<SentenceStudyResponse>(`/api/sentence-drill/session?${params}`)
      .then((r) => {
        if (!cancelled) setCounts({ due: r.due_count, fresh: r.new_count });
      })
      .catch(() => {
        if (!cancelled) setCounts(null);
      })
      .finally(() => {
        if (!cancelled) setCountsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [exampleIndex, selectedIds]);

  // Close the deck dropdown on outside click.
  useEffect(() => {
    if (!deckMenuOpen) return;
    function onClick(e: MouseEvent) {
      if (deckMenuRef.current && !deckMenuRef.current.contains(e.target as Node)) {
        setDeckMenuOpen(false);
      }
    }
    window.addEventListener('mousedown', onClick);
    return () => window.removeEventListener('mousedown', onClick);
  }, [deckMenuOpen]);

  const reviewLimit = parseLimit(reviewLimitRaw, defaultReviewLimit);
  const newLimit = parseLimit(newLimitRaw, defaultNewLimit);

  const expectedQueue = counts
    ? (mode === 'new' ? 0 : Math.min(counts.due, reviewLimit)) +
      (mode === 'review' ? 0 : Math.min(counts.fresh, newLimit))
    : 0;
  const canStart = !countsLoading && !starting && expectedQueue > 0;

  function toggleDeck(id: number) {
    setPickedDeckIds((prev) => {
      const next = new Set(prev ?? decks.map((d) => d.id));
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const deckScopeLabel =
    selectedIds.length === decks.length
      ? 'Tất cả bộ từ'
      : `${selectedIds.length} / ${decks.length} bộ từ`;

  return (
    <div
      style={{
        background: 'var(--v-surface)',
        border: '1px solid var(--v-border)',
        borderRadius: 'var(--v-radius-lg)',
        boxShadow: 'var(--v-shadow-md)',
        padding: 24,
        maxWidth: 720,
      }}
    >
      {/* Example-number segment — one number for the whole session */}
      <Label>Câu ví dụ số</Label>
      <div
        style={{
          display: 'inline-flex',
          gap: 4,
          padding: 4,
          background: 'var(--v-panel)',
          border: '1px solid var(--v-border)',
          borderRadius: 999,
          marginBottom: 18,
        }}
      >
        {[0, 1, 2].map((idx) => {
          const active = exampleIndex === idx;
          return (
            <button
              key={idx}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setExampleIndex(idx)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 20px',
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
              Câu {idx + 1}
            </button>
          );
        })}
      </div>

      {/* Mode picker + live counts */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <Label>Chế độ</Label>
        <div
          style={{
            fontFamily: 'var(--v-font-body)',
            fontSize: 'var(--v-text-sm)',
            fontWeight: 800,
            color: 'var(--v-ink-soft)',
          }}
        >
          {countsLoading || !counts ? (
            'Đang đếm…'
          ) : (
            <>
              <span style={{ color: 'var(--v-stage-review)' }}>{counts.due} câu cần ôn</span>
              {' · '}
              <span style={{ color: 'var(--v-blue)' }}>{counts.fresh} câu mới</span>
            </>
          )}
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 18 }}>
        {MODE_OPTIONS.map((m) => {
          const active = mode === m.value;
          return (
            <button
              key={m.value}
              type="button"
              onClick={() => setMode(m.value)}
              style={{
                padding: '12px 10px',
                background: active ? 'var(--v-primary)' : 'var(--v-surface)',
                color: active ? '#fff' : 'var(--v-ink)',
                border: active ? 'none' : '1.5px solid var(--v-border)',
                borderRadius: 'var(--v-radius-md)',
                boxShadow: active ? 'var(--v-press), 0 4px 10px rgba(122,193,67,0.4)' : 'var(--v-shadow-sm)',
                cursor: 'pointer',
                fontFamily: 'var(--v-font-head)',
                textAlign: 'center',
              }}
            >
              <div style={{ fontWeight: 900, fontSize: 'var(--v-text-md)' }}>{m.label}</div>
              <div
                style={{
                  fontFamily: 'var(--v-font-body)',
                  fontSize: 'var(--v-text-xs)',
                  fontWeight: 700,
                  opacity: 0.85,
                  marginTop: 2,
                }}
              >
                {m.hint}
              </div>
            </button>
          );
        })}
      </div>

      {/* Per-session limits — editable, NOT persisted back to settings */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 18 }}>
        <div style={{ opacity: mode === 'new' ? 0.45 : 1 }}>
          <Label>
            <RotateCcw size={11} style={{ display: 'inline', verticalAlign: -1, marginRight: 4 }} />
            Số câu ôn
          </Label>
          <input
            type="number"
            min={1}
            max={200}
            value={reviewLimitRaw}
            disabled={mode === 'new'}
            onChange={(e) => setReviewLimitRaw(e.target.value)}
            style={numberInputStyle()}
          />
        </div>
        <div style={{ opacity: mode === 'review' ? 0.45 : 1 }}>
          <Label>
            <Sparkles size={11} style={{ display: 'inline', verticalAlign: -1, marginRight: 4 }} />
            Số câu mới
          </Label>
          <input
            type="number"
            min={1}
            max={200}
            value={newLimitRaw}
            disabled={mode === 'review'}
            onChange={(e) => setNewLimitRaw(e.target.value)}
            style={numberInputStyle()}
          />
        </div>
      </div>

      {/* Deck scope — multi-select dropdown, default all decks */}
      <Label>Bộ từ</Label>
      <div ref={deckMenuRef} style={{ position: 'relative', marginBottom: 20 }}>
        <button
          type="button"
          onClick={() => setDeckMenuOpen((v) => !v)}
          style={{
            width: '100%',
            padding: '11px 14px',
            background: 'var(--v-surface)',
            border: '1.5px solid var(--v-border)',
            borderRadius: 'var(--v-radius-md)',
            fontFamily: 'var(--v-font-body)',
            fontSize: 'var(--v-text-base)',
            fontWeight: 600,
            color: 'var(--v-ink)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
          }}
        >
          {deckScopeLabel}
          <ChevronDown size={16} style={{ color: 'var(--v-muted)' }} />
        </button>
        {deckMenuOpen && (
          <div
            style={{
              position: 'absolute',
              top: 'calc(100% + 4px)',
              left: 0,
              right: 0,
              zIndex: 20,
              background: 'var(--v-surface)',
              border: '1px solid var(--v-border)',
              borderRadius: 'var(--v-radius-md)',
              boxShadow: 'var(--v-shadow-lg)',
              padding: 8,
              maxHeight: 260,
              overflowY: 'auto',
            }}
          >
            {decks.map((d) => {
              const checked = selectedIds.includes(d.id);
              return (
                <label
                  key={d.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '8px 10px',
                    borderRadius: 'var(--v-radius-sm)',
                    cursor: 'pointer',
                    fontFamily: 'var(--v-font-body)',
                    fontSize: 'var(--v-text-md)',
                    fontWeight: 600,
                    color: 'var(--v-ink)',
                  }}
                >
                  <input type="checkbox" checked={checked} onChange={() => toggleDeck(d.id)} />
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 3,
                      background: d.color,
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {d.name}
                  </span>
                  <span style={{ color: 'var(--v-muted)', fontSize: 'var(--v-text-sm)' }}>
                    {d.total} từ
                  </span>
                </label>
              );
            })}
          </div>
        )}
      </div>

      {/* Time-boxed mode — hết giờ thì hỏi học tiếp (loop lại) hay ngưng */}
      <Label>Thời gian phiên</Label>
      <div
        style={{
          display: 'inline-flex',
          gap: 4,
          padding: 4,
          background: 'var(--v-panel)',
          border: '1px solid var(--v-border)',
          borderRadius: 999,
          marginBottom: 18,
        }}
      >
        {(
          [
            { value: null, label: 'Tự do', icon: <InfinityIcon size={14} strokeWidth={2.4} /> },
            { value: 25, label: '25 phút', icon: <AlarmClock size={14} strokeWidth={2.4} /> },
            { value: 45, label: '45 phút', icon: <AlarmClock size={14} strokeWidth={2.4} /> },
          ] as const
        ).map((opt) => {
          const active = durationMin === opt.value;
          return (
            <button
              key={opt.label}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setDurationMin(opt.value)}
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
              {opt.icon}
              {opt.label}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        disabled={!canStart}
        onClick={() =>
          onStart({
            exampleIndex,
            mode,
            deckIds: selectedIds.length === decks.length ? null : selectedIds,
            reviewLimit,
            newLimit,
            durationMin,
          })
        }
        style={{
          width: '100%',
          padding: '14px 22px',
          background: 'var(--v-primary)',
          color: '#fff',
          border: 'none',
          borderRadius: 'var(--v-radius-md)',
          boxShadow: canStart ? 'var(--v-press), 0 6px 14px rgba(122,193,67,0.5)' : 'none',
          fontFamily: 'var(--v-font-head)',
          fontWeight: 900,
          fontSize: 'var(--v-text-lg)',
          letterSpacing: '0.04em',
          cursor: canStart ? 'pointer' : 'not-allowed',
          opacity: canStart ? 1 : 0.55,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
        }}
      >
        <Play size={16} fill="#fff" /> {starting ? 'ĐANG CHUẨN BỊ…' : 'BẮT ĐẦU'}
      </button>
      {!countsLoading && counts && expectedQueue === 0 && (
        <div
          style={{
            marginTop: 10,
            textAlign: 'center',
            fontFamily: 'var(--v-font-body)',
            fontSize: 'var(--v-text-sm)',
            fontWeight: 700,
            color: 'var(--v-muted)',
          }}
        >
          Không có câu nào cho lựa chọn này — đổi số câu, chế độ hoặc bộ từ nha.
        </div>
      )}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
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
      {children}
    </div>
  );
}

function numberInputStyle(): React.CSSProperties {
  return {
    width: '100%',
    padding: '11px 14px',
    fontFamily: 'var(--v-font-head)',
    fontSize: 'var(--v-text-lg)',
    fontWeight: 800,
    background: 'var(--v-bg)',
    border: '1.5px solid var(--v-border)',
    borderRadius: 'var(--v-radius-md)',
    color: 'var(--v-ink)',
    outline: 'none',
    boxSizing: 'border-box',
  };
}
