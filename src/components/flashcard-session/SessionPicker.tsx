'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import type { Flashcard, FlashcardStatus } from '@/lib/types';
import type { SessionMode } from './types';

interface Props {
  mode: SessionMode;
  candidates: Flashcard[];
  onStart: (selected: Flashcard[]) => void;
  /** Pre-check only the first N candidates instead of all. Used by /study
   *  so the daily_new_limit acts as a soft default while still showing the
   *  full deck for users who want to study more in one session. */
  defaultPick?: number;
}

const STATUS_BADGE: Record<FlashcardStatus, { label: string; color: string; soft: string }> = {
  new:       { label: 'Mới',      color: 'var(--v-blue)',    soft: 'var(--v-blue-soft)' },
  learning:  { label: 'Đang học', color: 'var(--v-orange)',  soft: 'var(--v-orange-soft)' },
  review:    { label: 'Ôn',       color: 'var(--v-primary)', soft: 'var(--v-primary-soft)' },
  mastered:  { label: 'Thuộc',    color: 'var(--v-purple)',  soft: 'var(--v-purple-soft)' },
};

/**
 * Step 1 of a session: let the learner pick which cards they want to
 * drill this round. Quick-pick chips (Chọn hết / Bỏ chọn / 5 / 10 / 20)
 * for fast selection; per-row checkboxes for surgical picking. Bottom
 * sticky bar shows the running count + "Bắt đầu" CTA. State is local —
 * a refresh re-fetches candidates and re-opens the picker.
 *
 * Sort: the picker preserves the input order. /review caller passes cards
 * sorted by due priority (oldest next_review_at first, via
 * getDueForReview); /study passes by created_at ASC (via getNewForToday).
 * Status badges only render for review-mode — study cards are always
 * status='new'.
 */
export default function SessionPicker({ mode, candidates, onStart, defaultPick }: Props) {
  const [selectedIds, setSelectedIds] = useState<Set<number>>(() => {
    // Default selection: first `defaultPick` candidates if provided,
    // else all. /study passes daily_new_limit as defaultPick so the
    // picker pre-checks ~10 of N candidates (user can hit "Chọn hết"
    // to expand). /review passes nothing → all due cards pre-checked.
    const slice =
      typeof defaultPick === 'number' && defaultPick > 0
        ? candidates.slice(0, defaultPick)
        : candidates;
    return new Set(slice.map((c) => c.id));
  });

  const selectedCount = selectedIds.size;
  const total = candidates.length;

  const idToCard = useMemo(() => {
    const map = new Map<number, Flashcard>();
    for (const c of candidates) map.set(c.id, c);
    return map;
  }, [candidates]);

  const title = mode === 'study' ? 'Chọn từ để học hôm nay' : 'Chọn từ để ôn tập';
  const subtitle =
    mode === 'study'
      ? `${total} từ mới đang chờ — chọn những từ bạn muốn luyện phiên này`
      : `${total} từ đang chờ — chọn những từ bạn muốn luyện phiên này`;

  function toggle(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelectedIds(new Set(candidates.map((c) => c.id)));
  }
  function selectNone() {
    setSelectedIds(new Set());
  }
  function selectFirstN(n: number) {
    setSelectedIds(new Set(candidates.slice(0, n).map((c) => c.id)));
  }

  function handleStart() {
    // Preserve the candidates' order. Selected map gives O(1) membership.
    const selected = candidates.filter((c) => selectedIds.has(c.id));
    if (selected.length === 0) return;
    onStart(selected);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <header>
        <h2
          style={{
            fontFamily: 'var(--v-font-head)',
            fontSize: 'var(--v-text-2xl)',
            fontWeight: 900,
            margin: 0,
            color: 'var(--v-ink)',
            letterSpacing: 'var(--v-tracking-tight)',
          }}
        >
          {title}
        </h2>
        <p
          style={{
            fontFamily: 'var(--v-font-body)',
            fontSize: 'var(--v-text-md)',
            color: 'var(--v-muted)',
            margin: '4px 0 0',
          }}
        >
          {subtitle}
        </p>
      </header>

      {/* Quick actions row */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          alignItems: 'center',
          flexWrap: 'wrap',
          paddingBottom: 4,
        }}
      >
        <QuickPill label="Chọn hết" onClick={selectAll} />
        <QuickPill label="Bỏ chọn" onClick={selectNone} />
        <span
          style={{
            width: 1,
            alignSelf: 'stretch',
            background: 'var(--v-border)',
            margin: '0 4px',
          }}
        />
        <QuickPill label="5 từ" onClick={() => selectFirstN(5)} disabled={total < 1} />
        <QuickPill label="10 từ" onClick={() => selectFirstN(10)} disabled={total < 1} />
        <QuickPill label="20 từ" onClick={() => selectFirstN(20)} disabled={total < 1} />
        <span
          style={{
            marginLeft: 'auto',
            fontFamily: 'var(--v-font-body)',
            fontSize: 'var(--v-text-sm)',
            fontWeight: 800,
            color: selectedCount > 0 ? 'var(--v-primary)' : 'var(--v-muted)',
          }}
        >
          Đã chọn: {selectedCount} / {total}
        </span>
      </div>

      {/* Card list */}
      <div
        style={{
          background: 'var(--v-panel)',
          border: '1px solid var(--v-border)',
          borderRadius: 'var(--v-radius-md)',
          overflow: 'hidden',
        }}
      >
        {candidates.map((card, i) => {
          const isLast = i === candidates.length - 1;
          const isSelected = selectedIds.has(card.id);
          const badge = mode === 'review' ? STATUS_BADGE[card.status] : null;
          return (
            <div
              key={card.id}
              role="button"
              tabIndex={0}
              onClick={() => toggle(card.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  toggle(card.id);
                }
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '11px 14px',
                borderBottom: isLast ? 'none' : '1px solid var(--v-border)',
                cursor: 'pointer',
                background: isSelected ? 'var(--v-primary-soft)' : 'transparent',
                transition: 'background 120ms var(--v-ease)',
              }}
            >
              <Checkbox checked={isSelected} />
              <div
                style={{
                  fontFamily: 'var(--v-font-head)',
                  fontWeight: 800,
                  fontSize: 'var(--v-text-base)',
                  color: 'var(--v-ink)',
                  flexShrink: 0,
                  minWidth: 120,
                }}
              >
                {card.english}
              </div>
              <div
                style={{
                  fontFamily: 'var(--v-font-body)',
                  fontSize: 'var(--v-text-sm)',
                  color: 'var(--v-ink-soft)',
                  flex: 1,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {card.vietnamese}
              </div>
              {badge && (
                <span
                  style={{
                    padding: '2px 10px',
                    background: badge.soft,
                    color: badge.color,
                    borderRadius: 'var(--v-radius-pill)',
                    fontFamily: 'var(--v-font-head)',
                    fontSize: 10,
                    fontWeight: 900,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    flexShrink: 0,
                  }}
                >
                  {badge.label}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom sticky-ish bar (no actual sticky CSS — main column scrolls
          naturally and the button stays in flow at the end of the list) */}
      <div
        style={{
          position: 'sticky',
          bottom: 0,
          background: 'var(--v-bg)',
          paddingTop: 8,
          paddingBottom: 4,
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          flexWrap: 'wrap',
          borderTop: '1px dashed var(--v-border)',
        }}
      >
        <Link
          href="/dashboard"
          style={{
            fontFamily: 'var(--v-font-body)',
            fontSize: 'var(--v-text-sm)',
            color: 'var(--v-muted)',
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <ArrowLeft size={14} /> Quay lại
        </Link>
        <span style={{ flex: 1 }} />
        <button
          type="button"
          onClick={handleStart}
          disabled={selectedCount === 0}
          style={{
            padding: '11px 22px',
            background: selectedCount === 0 ? 'var(--v-border)' : 'var(--v-primary)',
            color: '#fff',
            border: 'none',
            borderRadius: 'var(--v-radius-md)',
            boxShadow: selectedCount === 0 ? 'none' : 'var(--v-press), 0 6px 14px rgba(122,193,67,0.4)',
            fontFamily: 'var(--v-font-head)',
            fontWeight: 900,
            fontSize: 'var(--v-text-base)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            cursor: selectedCount === 0 ? 'not-allowed' : 'pointer',
            opacity: selectedCount === 0 ? 0.6 : 1,
          }}
        >
          Bắt đầu ({selectedCount} từ) <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
}

function QuickPill({
  label,
  onClick,
  disabled,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '5px 12px',
        background: 'var(--v-surface)',
        border: '1px solid var(--v-border)',
        borderRadius: 'var(--v-radius-pill)',
        fontFamily: 'var(--v-font-body)',
        fontSize: 12,
        fontWeight: 800,
        color: disabled ? 'var(--v-muted)' : 'var(--v-ink-soft)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
      }}
    >
      {label}
    </button>
  );
}

function Checkbox({ checked }: { checked: boolean }) {
  return (
    <span
      aria-hidden
      style={{
        width: 18,
        height: 18,
        borderRadius: 5,
        background: checked ? 'var(--v-primary)' : 'var(--v-surface)',
        border: checked ? '1.5px solid var(--v-primary)' : '1.5px solid var(--v-border)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        transition: 'background 120ms var(--v-ease), border-color 120ms var(--v-ease)',
      }}
    >
      {checked && <Check size={12} strokeWidth={3} color="#fff" />}
    </span>
  );
}
