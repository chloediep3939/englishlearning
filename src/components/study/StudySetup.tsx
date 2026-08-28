'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { AlarmClock, ChevronDown, Eye, GraduationCap, Infinity as InfinityIcon, Play, RotateCcw, Sparkles } from 'lucide-react';
import { apiJson } from '@/lib/common/api-json';
import type {
  FlashcardDeckWithCounts,
  StudyDeckGroup,
  StudySessionMode,
  StudySessionResponse,
} from '@/lib/types';

export interface StudyStartOpts {
  mode: StudySessionMode;
  group: StudyDeckGroup;
  /** null = all decks in the group. */
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
  onStart: (opts: StudyStartOpts) => void;
}

const MODE_OPTIONS: Array<{ value: StudySessionMode; label: string; hint: string }> = [
  { value: 'review', label: 'Ôn',       hint: 'Chỉ thẻ đến hạn' },
  { value: 'new',    label: 'Học',      hint: 'Chỉ từ mới' },
  { value: 'mix',    label: 'Ôn + Học', hint: 'Xen kẽ kiểu Anki' },
];

function parseLimit(raw: string, fallback: number): number {
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1) return fallback;
  return Math.min(n, 200);
}

/**
 * /study session setup (study-unified A2). No manual card selection —
 * picking is automatic server-side; here the learner only chooses mode,
 * deck scope, per-session limits, and (when recognition decks exist) the
 * deck group segment. Live pool counts refresh on scope changes.
 */
export default function StudySetup({
  decks, defaultReviewLimit, defaultNewLimit, starting, onStart,
}: Props) {
  const hasRecognitionDecks = decks.some((d) => d.recognition_only);
  const [group, setGroup] = useState<StudyDeckGroup>('full');
  const [mode, setMode] = useState<StudySessionMode>('mix');
  const [reviewLimitRaw, setReviewLimitRaw] = useState(String(defaultReviewLimit));
  const [newLimitRaw, setNewLimitRaw] = useState(String(defaultNewLimit));
  // null = học theo số thẻ (như cũ); 25/45 = học theo thời gian.
  const [durationMin, setDurationMin] = useState<number | null>(null);
  // null = all decks in the active group.
  const [pickedDeckIds, setPickedDeckIds] = useState<Set<number> | null>(null);
  const [deckMenuOpen, setDeckMenuOpen] = useState(false);
  const [counts, setCounts] = useState<{ due: number; fresh: number } | null>(null);
  const [countsLoading, setCountsLoading] = useState(true);
  const deckMenuRef = useRef<HTMLDivElement>(null);

  const groupDecks = useMemo(
    () => decks.filter((d) => d.recognition_only === (group === 'recognition')),
    [decks, group],
  );

  const selectedIds = useMemo(() => {
    const all = groupDecks.map((d) => d.id);
    if (pickedDeckIds === null) return all;
    return all.filter((id) => pickedDeckIds.has(id));
  }, [groupDecks, pickedDeckIds]);

  // Live counts — refetch when the deck scope or segment changes.
  useEffect(() => {
    let cancelled = false;
    setCountsLoading(true);
    const params = new URLSearchParams({ countsOnly: '1', group });
    params.set('deckIds', selectedIds.join(','));
    apiJson<StudySessionResponse>(`/api/study/session?${params}`)
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
  }, [group, selectedIds]);

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
      const next = new Set(prev ?? groupDecks.map((d) => d.id));
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const deckScopeLabel =
    selectedIds.length === groupDecks.length
      ? 'Tất cả bộ từ'
      : `${selectedIds.length} / ${groupDecks.length} bộ từ`;

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
      {/* Deck-group segments — hidden when the user has no recognition decks */}
      {hasRecognitionDecks && (
        <>
          <Label>Nhóm bộ từ</Label>
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
            <SegmentButton
              active={group === 'full'}
              onClick={() => {
                setGroup('full');
                setPickedDeckIds(null);
              }}
              icon={<GraduationCap size={14} strokeWidth={2.4} />}
              label="Học đầy đủ"
            />
            <SegmentButton
              active={group === 'recognition'}
              onClick={() => {
                setGroup('recognition');
                setPickedDeckIds(null);
              }}
              icon={<Eye size={14} strokeWidth={2.4} />}
              label="Chỉ hiểu nghĩa"
            />
          </div>
        </>
      )}

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
          {countsLoading ? (
            'Đang đếm…'
          ) : !counts ? (
            'Không đếm được — tải lại trang thử nha'
          ) : (
            <>
              <span style={{ color: 'var(--v-stage-review)' }}>{counts.due} từ cần ôn</span>
              {' · '}
              <span style={{ color: 'var(--v-blue)' }}>{counts.fresh} từ mới</span>
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
            Số thẻ ôn
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
            Số thẻ mới
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

      {/* Deck scope — multi-select dropdown, default all decks in the group */}
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
            {/* Chọn hết / bỏ hết cả danh sách bộ từ */}
            <div
              style={{
                display: 'flex',
                gap: 6,
                padding: '2px 2px 8px',
                borderBottom: '1px solid var(--v-border)',
                marginBottom: 6,
              }}
            >
              <button
                type="button"
                onClick={() => setPickedDeckIds(null)}
                disabled={selectedIds.length === groupDecks.length}
                style={bulkBtnStyle(selectedIds.length === groupDecks.length)}
              >
                Chọn hết
              </button>
              <button
                type="button"
                onClick={() => setPickedDeckIds(new Set())}
                disabled={selectedIds.length === 0}
                style={bulkBtnStyle(selectedIds.length === 0)}
              >
                Bỏ hết
              </button>
            </div>
            {groupDecks.map((d) => {
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
        <SegmentButton
          active={durationMin === null}
          onClick={() => setDurationMin(null)}
          icon={<InfinityIcon size={14} strokeWidth={2.4} />}
          label="Tự do"
        />
        <SegmentButton
          active={durationMin === 25}
          onClick={() => setDurationMin(25)}
          icon={<AlarmClock size={14} strokeWidth={2.4} />}
          label="25 phút"
        />
        <SegmentButton
          active={durationMin === 45}
          onClick={() => setDurationMin(45)}
          icon={<AlarmClock size={14} strokeWidth={2.4} />}
          label="45 phút"
        />
      </div>

      <button
        type="button"
        disabled={!canStart}
        onClick={() =>
          onStart({
            mode,
            group,
            deckIds: selectedIds.length === groupDecks.length ? null : selectedIds,
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
          Không có thẻ nào cho lựa chọn này — đổi chế độ hoặc bộ từ nha.
        </div>
      )}
    </div>
  );
}

function SegmentButton({
  active, onClick, icon, label,
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

function bulkBtnStyle(disabled: boolean): React.CSSProperties {
  return {
    flex: 1,
    padding: '6px 10px',
    background: 'transparent',
    border: '1px solid var(--v-border)',
    borderRadius: 999,
    fontFamily: 'var(--v-font-head)',
    fontWeight: 900,
    fontSize: 11,
    letterSpacing: '0.04em',
    color: disabled ? 'var(--v-muted)' : 'var(--v-primary)',
    cursor: disabled ? 'default' : 'pointer',
    opacity: disabled ? 0.5 : 1,
  };
}
