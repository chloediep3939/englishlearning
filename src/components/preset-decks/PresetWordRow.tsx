'use client';

import { ArrowDown, ArrowUp, ArrowUpDown, Check, ChevronDown } from 'lucide-react';
import AudioButton from '@/components/AudioButton';
import { getPOSColor } from '@/components/common/POSPill';
import { highlightTarget } from '@/components/flashcard-session/highlight';
import type { PresetCardWithOwnership } from '@/lib/types';

export const POS_SHORT: Record<string, string> = {
  noun: 'n.',
  verb: 'v.',
  adjective: 'adj.',
  adverb: 'adv.',
  preposition: 'prep.',
  conjunction: 'conj.',
  determiner: 'det.',
  pronoun: 'pron.',
  exclamation: 'excl.',
};

/** Cột của bảng từ — header và mọi hàng dùng chung để thẳng hàng.
 *  Cột "Thông dụng" (thứ hạng NGSL) chỉ có nghĩa với danh sách NGSL nên ẩn với
 *  AWL / collocation. */
export function wordGrid(showFrequency: boolean): string {
  const rank = showFrequency ? '118px ' : '';
  return `44px ${rank}minmax(170px, 1.2fr) minmax(100px, 0.8fr) 76px minmax(180px, 2fr) 44px`;
}
/** Bảng cuộn ngang dưới độ rộng này thay vì bóp cột. */
export const WORD_TABLE_MIN_WIDTH = 800;

export type SortKey = 'rank' | 'english' | 'ipa' | 'pos' | 'vietnamese';
export type SortDir = 'asc' | 'desc';

/**
 * Mức độ thông dụng theo thứ hạng NGSL: 5 vạch = hạng 1–500, … 1 vạch =
 * 2.001–2.809, 0 = ngoài NGSL.
 */
export function frequencyBars(rank: number | null): number {
  if (rank === null) return 0;
  if (rank <= 500) return 5;
  if (rank <= 1000) return 4;
  if (rank <= 1500) return 3;
  if (rank <= 2000) return 2;
  return 1;
}

const cellText: React.CSSProperties = {
  fontFamily: 'var(--v-font-body)',
  fontSize: 'var(--v-text-sm)',
  minWidth: 0,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

interface HeaderProps {
  sortKey: SortKey | null;
  sortDir: SortDir;
  allSelected: boolean;
  someSelected: boolean;
  showFrequency: boolean;
  onSort: (key: SortKey) => void;
  onToggleAll: () => void;
}

/** Dòng tiêu đề: tick chọn cả danh sách đang hiện + các cột bấm để sắp xếp. */
export function PresetWordHeader({ sortKey, sortDir, allSelected, someSelected, showFrequency, onSort, onToggleAll }: HeaderProps) {
  const col = (key: SortKey, label: string, title?: string) => {
    const active = sortKey === key;
    const Icon = !active ? ArrowUpDown : sortDir === 'asc' ? ArrowUp : ArrowDown;
    return (
      <button
        type="button"
        onClick={() => onSort(key)}
        title={title}
        aria-sort={active ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          padding: 0,
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          fontFamily: 'var(--v-font-body)',
          fontSize: 'var(--v-text-2xs)',
          fontWeight: 800,
          letterSpacing: 'var(--v-tracking-wide)',
          textTransform: 'uppercase',
          color: active ? 'var(--v-ink)' : 'var(--v-muted)',
          whiteSpace: 'nowrap',
          justifySelf: 'start',
        }}
      >
        {label}
        <Icon size={12} style={{ opacity: active ? 1 : 0.5 }} />
      </button>
    );
  };

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: wordGrid(showFrequency),
        alignItems: 'center',
        gap: 12,
        padding: '10px 12px 10px 14px',
        background: 'var(--v-bg)',
        borderBottom: '1px solid var(--v-border)',
      }}
    >
      <Checkbox checked={allSelected} mixed={!allSelected && someSelected} onClick={onToggleAll} label="Chọn cả danh sách" />
      {showFrequency && col('rank', 'Thông dụng', 'Thứ hạng tần suất trong New General Service List (1 = gặp nhiều nhất)')}
      {col('english', 'Từ')}
      {col('ipa', 'Phát âm')}
      {col('pos', 'Loại')}
      {col('vietnamese', 'Nghĩa')}
      <span />
    </div>
  );
}

function Checkbox({ checked, mixed = false, onClick, label }: { checked: boolean; mixed?: boolean; onClick?: () => void; label?: string }) {
  const on = checked || mixed;
  return (
    <span
      role={onClick ? 'checkbox' : undefined}
      aria-checked={onClick ? (mixed ? 'mixed' : checked) : undefined}
      aria-label={label}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === ' ' || e.key === 'Enter') {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      style={{
        width: 20,
        height: 20,
        borderRadius: 6,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: on ? 'var(--v-primary)' : 'var(--v-surface)',
        border: `2px solid ${on ? 'var(--v-primary)' : 'var(--v-border-strong)'}`,
        cursor: onClick ? 'pointer' : undefined,
        transition: 'all var(--v-dur-1) var(--v-ease)',
      }}
    >
      {checked && <Check size={13} color="#fff" strokeWidth={3.5} />}
      {mixed && <span style={{ width: 9, height: 2.5, borderRadius: 2, background: '#fff' }} />}
    </span>
  );
}

interface Props {
  card: PresetCardWithOwnership;
  selected: boolean;
  open: boolean;
  isLast: boolean;
  showFrequency: boolean;
  onToggle: () => void;
  onOpen: () => void;
}

/**
 * Một hàng trong bảng từ của level: bấm cả hàng để chọn/bỏ chọn, loa để nghe,
 * mũi tên để mở chi tiết (hình, câu ví dụ kèm hình, collocation, ghi chú).
 */
export default function PresetWordRow({ card, selected, open, isLast, showFrequency, onToggle, onOpen }: Props) {
  const posColor = getPOSColor(card.part_of_speech);
  const owned = card.owned_in;
  const bars = frequencyBars(card.ngsl_rank);
  const stop = {
    onClick: (e: React.MouseEvent) => e.stopPropagation(),
    onKeyDown: (e: React.KeyboardEvent) => e.stopPropagation(),
  };

  return (
    <div
      style={{
        borderBottom: isLast ? 'none' : '1px solid var(--v-border)',
        background: selected ? 'var(--v-primary-soft)' : 'transparent',
        transition: 'background var(--v-dur-1) var(--v-ease)',
      }}
    >
      <div
        role="checkbox"
        aria-checked={selected}
        aria-label={card.english}
        tabIndex={0}
        onClick={onToggle}
        onKeyDown={(e) => {
          if (e.target !== e.currentTarget) return;
          if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
            onToggle();
          }
        }}
        style={{
          display: 'grid',
          gridTemplateColumns: wordGrid(showFrequency),
          alignItems: 'center',
          gap: 12,
          padding: '8px 12px 8px 14px',
          cursor: 'pointer',
        }}
      >
        <Checkbox checked={selected} />

        {/* Thông dụng: vạch + hạng (chỉ NGSL) */}
        {showFrequency && (
          <span
            title={card.ngsl_rank ? `Hạng ${card.ngsl_rank} trong NGSL` : 'Ngoài ~2.800 từ thông dụng nhất (NGSL)'}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
          >
            <span aria-hidden style={{ display: 'inline-flex', alignItems: 'flex-end', gap: 2, height: 14 }}>
              {[1, 2, 3, 4, 5].map((i) => (
                <span
                  key={i}
                  style={{ width: 4, height: 4 + i * 2, borderRadius: 2, background: i <= bars ? 'var(--v-primary)' : 'var(--v-border)' }}
                />
              ))}
            </span>
            <span style={{ fontFamily: 'var(--v-font-mono)', fontSize: 'var(--v-text-xs)', color: card.ngsl_rank ? 'var(--v-ink-soft)' : 'var(--v-muted)' }}>
              {card.ngsl_rank ? `#${card.ngsl_rank}` : '—'}
            </span>
          </span>
        )}

        {/* Từ + loa (+ đã có) */}
        <span style={{ minWidth: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ ...cellText, fontFamily: 'var(--v-font-head)', fontWeight: 900, fontSize: 'var(--v-text-md)', color: 'var(--v-ink)', flexShrink: 1 }}>
            {card.english}
          </span>
          <span {...stop} style={{ display: 'inline-flex', flexShrink: 0 }}>
            <AudioButton fallbackText={card.english} size={26} />
          </span>
          {owned && (
            <span
              title={`Đã có trong bộ “${owned.deck_name}”`}
              style={{
                fontFamily: 'var(--v-font-body)',
                fontSize: 'var(--v-text-2xs)',
                fontWeight: 800,
                color: 'var(--v-muted)',
                background: 'var(--v-bg)',
                border: '1px solid var(--v-border)',
                borderRadius: 'var(--v-radius-pill)',
                padding: '0 7px',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              Đã có
            </span>
          )}
        </span>

        {/* Phát âm */}
        <span style={{ ...cellText, fontFamily: 'var(--v-font-mono)', fontSize: 'var(--v-text-xs)', color: 'var(--v-muted)' }}>
          {card.ipa ?? '—'}
        </span>

        {/* Loại */}
        <span>
          {card.part_of_speech ? (
            <span
              title={card.part_of_speech}
              style={{
                display: 'inline-block',
                padding: '1px 9px',
                fontFamily: 'var(--v-font-head)',
                fontSize: 'var(--v-text-sm)',
                fontWeight: 900,
                color: posColor,
                border: `2px solid ${posColor}`,
                borderRadius: 'var(--v-radius-pill)',
                lineHeight: 1.35,
                whiteSpace: 'nowrap',
              }}
            >
              {POS_SHORT[card.part_of_speech] ?? card.part_of_speech}
            </span>
          ) : (
            <span style={{ ...cellText, color: 'var(--v-muted)' }}>—</span>
          )}
        </span>

        {/* Nghĩa */}
        <span style={{ ...cellText, color: 'var(--v-ink-soft)' }} title={card.vietnamese}>
          {card.vietnamese}
        </span>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpen();
          }}
          onKeyDown={(e) => e.stopPropagation()}
          aria-expanded={open}
          aria-label={open ? `Thu gọn ${card.english}` : `Xem ví dụ ${card.english}`}
          style={{
            width: 32,
            height: 32,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: open ? 'var(--v-surface)' : 'transparent',
            border: `1px solid ${open ? 'var(--v-border)' : 'transparent'}`,
            borderRadius: 999,
            color: 'var(--v-muted)',
            cursor: 'pointer',
          }}
        >
          <ChevronDown size={18} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform var(--v-dur-1) var(--v-ease)' }} />
        </button>
      </div>

      {open && (
        <div style={{ padding: '4px 16px 16px 58px', display: 'flex', gap: 16, alignItems: 'flex-start' }}>
          {card.image_url && (
            // eslint-disable-next-line @next/next/no-img-element -- Pexels hotlink, same as card images elsewhere
            <img
              src={card.image_url}
              alt=""
              loading="lazy"
              style={{ width: 140, height: 100, objectFit: 'cover', borderRadius: 'var(--v-radius-md)', flexShrink: 0 }}
            />
          )}
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {owned && (
              <span style={{ fontFamily: 'var(--v-font-body)', fontSize: 'var(--v-text-xs)', color: 'var(--v-muted)' }}>
                Đã có trong bộ “{owned.deck_name}”
              </span>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {card.examples.map((ex, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    gap: 12,
                    alignItems: 'center',
                    padding: 8,
                    background: 'var(--v-surface)',
                    border: '1px solid var(--v-border)',
                    borderRadius: 'var(--v-radius-md)',
                  }}
                >
                  {ex.image_url && (
                    // eslint-disable-next-line @next/next/no-img-element -- Pexels hotlink
                    <img src={ex.image_url} alt="" loading="lazy" style={{ width: 72, height: 50, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }} />
                  )}
                  <div style={{ minWidth: 0, flex: 1, fontFamily: 'var(--v-font-body)', fontSize: 'var(--v-text-sm)' }}>
                    <div style={{ color: 'var(--v-ink)' }} dangerouslySetInnerHTML={{ __html: highlightTarget(ex.en, card.english) }} />
                    {ex.vi && <div style={{ color: 'var(--v-muted)', marginTop: 2 }}>{ex.vi}</div>}
                  </div>
                  <span {...stop} style={{ display: 'inline-flex', flexShrink: 0 }}>
                    <AudioButton fallbackText={ex.en} size={26} />
                  </span>
                </div>
              ))}
            </div>

            {card.collocations.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
                <span style={{ fontFamily: 'var(--v-font-body)', fontSize: 'var(--v-text-xs)', fontWeight: 800, color: 'var(--v-muted)', marginRight: 2 }}>
                  Collocation
                </span>
                {card.collocations.map((c) => (
                  <span
                    key={c.phrase}
                    style={{
                      fontFamily: 'var(--v-font-body)',
                      fontSize: 'var(--v-text-xs)',
                      fontWeight: 700,
                      color: 'var(--v-primary-deep)',
                      background: 'var(--v-primary-soft)',
                      borderRadius: 'var(--v-radius-pill)',
                      padding: '3px 10px',
                    }}
                  >
                    {c.phrase}
                  </span>
                ))}
              </div>
            )}

            {card.notes && (
              <div
                style={{
                  fontFamily: 'var(--v-font-body)',
                  fontSize: 'var(--v-text-xs)',
                  color: 'var(--v-ink-soft)',
                  borderLeft: '3px solid var(--v-orange)',
                  paddingLeft: 10,
                }}
              >
                {card.notes}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
