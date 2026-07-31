'use client';

import Link from 'next/link';
import {
  Layers,
  BookOpen, Coffee, Briefcase, GraduationCap, Plane, Heart,
  Star, Music, Camera, Code, Flame, Sparkles,
  ArrowLeft, ArrowRight,
  type LucideIcon,
} from 'lucide-react';
import type { FlashcardDeckWithCounts } from '@/lib/types';
import Mascot from '@/components/common/Mascot';
import DeckViewToggle, { useDeckViewMode } from '@/components/common/DeckViewToggle';
import type { SessionMode } from './types';

const ICON_MAP: Record<string, LucideIcon> = {
  BookOpen, Coffee, Briefcase, GraduationCap, Plane, Heart,
  Star, Music, Camera, Code, Flame, Sparkles,
};

interface Props {
  mode: SessionMode;
  decks: FlashcardDeckWithCounts[];
  /** Where to navigate when the user picks a deck (e.g. "/study"). The
   *  caller's page reads `searchParams.deck_id` and switches into the
   *  session flow. */
  basePath: '/study' | '/review';
  /** Total count across all decks (= the original initialCards count
   *  the page would have shown without any filter). Drives the "Tất cả"
   *  card. */
  totalAll: number;
}

/**
 * Step 0 of /study and /review: ask the learner which deck (bộ từ) to
 * pull from before the per-card SessionPicker. Hidden automatically by
 * the parent page if the user has only the default deck.
 *
 * Click on a deck navigates to `${basePath}?deck_id=<id>` (server
 * re-renders with the filter applied). "Tất cả" navigates with
 * `?deck_id=all` so the page can distinguish "user explicitly picked
 * all" from "no choice made yet".
 */
export default function DeckPickerStep({ mode, decks, basePath, totalAll }: Props) {
  const [viewMode, setViewMode] = useDeckViewMode();
  const isStudy = mode === 'study';
  const title = isStudy ? 'Chọn bộ từ để học hôm nay' : 'Chọn bộ từ để ôn tập';
  const subtitle = isStudy
    ? 'Bún sẽ chỉ lấy từ mới trong bộ bạn chọn'
    : 'Bún sẽ chỉ lấy từ đang đến hạn trong bộ bạn chọn';

  // For study, the relevant count is new_count; for review, due_count.
  function relevantCount(d: FlashcardDeckWithCounts): number {
    return isStudy ? d.new_count : d.due_count;
  }

  // Sort: decks with cards to learn/review first, by relevant count desc,
  // then by position.
  const sortedDecks = [...decks].sort((a, b) => {
    const ca = relevantCount(a);
    const cb = relevantCount(b);
    if (ca === 0 && cb === 0) return a.position - b.position;
    if (ca === 0) return 1;
    if (cb === 0) return -1;
    return cb - ca || a.position - b.position;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <header
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <div style={{ minWidth: 0 }}>
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
        </div>
        <DeckViewToggle mode={viewMode} onChange={setViewMode} />
      </header>

      {/* "Tất cả" card */}
      <DeckCard
        href={`${basePath}?deck_id=all`}
        icon={<Layers size={22} />}
        color="var(--v-primary)"
        name="Tất cả các bộ"
        subtitleText="Lấy từ tất cả bộ bạn có"
        countLabel={isStudy ? 'từ mới' : 'tới hạn'}
        count={totalAll}
        emphasized
      />

      {/* Per-deck cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns:
            viewMode === 'grid' ? 'repeat(auto-fill, minmax(260px, 1fr))' : '1fr',
          gap: 12,
        }}
      >
        {sortedDecks.map((d) => {
          const count = relevantCount(d);
          const Icon = (d.icon && ICON_MAP[d.icon]) || BookOpen;
          return (
            <DeckCard
              key={d.id}
              href={count > 0 ? `${basePath}?deck_id=${d.id}` : undefined}
              icon={<Icon size={20} />}
              color={d.color || 'var(--v-primary)'}
              name={d.name}
              subtitleText={d.subtitle || (d.total === 0 ? 'Bộ trống' : `${d.total} từ trong bộ`)}
              countLabel={isStudy ? 'từ mới' : 'tới hạn'}
              count={count}
            />
          );
        })}
      </div>

      {decks.length === 0 && (
        <div
          style={{
            textAlign: 'center',
            padding: '2rem 1rem',
            background: 'var(--v-surface)',
            border: '1px solid var(--v-border)',
            borderRadius: 'var(--v-radius-lg)',
            boxShadow: 'var(--v-shadow-sm)',
          }}
        >
          <Mascot pose="sleep" size={100} />
          <p style={{ marginTop: 10, color: 'var(--v-muted)', fontFamily: 'var(--v-font-body)' }}>
            Bạn chưa có bộ từ nào.
          </p>
        </div>
      )}

      {/* Back link */}
      <div style={{ paddingTop: 6 }}>
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
          <ArrowLeft size={14} /> Dashboard
        </Link>
      </div>
    </div>
  );
}

/**
 * Small pill shown above the SessionPicker once a deck is locked in.
 * Echoes which deck the learner is studying — and the parent page is
 * responsible for rendering the "Đổi bộ" back link separately.
 */
export function DeckEyebrow({ name, color }: { name: string; color: string }) {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '6px 12px',
        background: 'var(--v-surface)',
        border: '1px solid var(--v-border)',
        borderRadius: 'var(--v-radius-pill)',
        boxShadow: 'var(--v-shadow-sm)',
        marginBottom: 16,
      }}
    >
      <span
        style={{
          width: 10,
          height: 10,
          borderRadius: 3,
          background: color,
          flexShrink: 0,
        }}
      />
      <span
        style={{
          fontFamily: 'var(--v-font-body)',
          fontSize: 'var(--v-text-xs)',
          fontWeight: 800,
          color: 'var(--v-ink-soft)',
          letterSpacing: '0.04em',
        }}
      >
        Bộ:{' '}
        <span style={{ color: 'var(--v-ink)', fontWeight: 900 }}>{name}</span>
      </span>
    </div>
  );
}

interface DeckCardProps {
  /** Undefined href → render as disabled (no relevant cards). */
  href: string | undefined;
  icon: React.ReactNode;
  color: string;
  name: string;
  subtitleText: string;
  countLabel: string;
  count: number;
  /** If true, span full width and use primary color treatment. */
  emphasized?: boolean;
}

function DeckCard({
  href, icon, color, name, subtitleText, countLabel, count, emphasized,
}: DeckCardProps) {
  const disabled = !href;
  const content = (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: emphasized ? '16px 18px' : '14px 16px',
        background: emphasized ? 'var(--v-primary-soft)' : 'var(--v-surface)',
        border: emphasized
          ? '1px solid color-mix(in srgb, var(--v-primary) 30%, transparent)'
          : '1px solid var(--v-border)',
        borderRadius: 'var(--v-radius-lg)',
        boxShadow: disabled ? 'none' : 'var(--v-shadow-sm)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.55 : 1,
        transition: 'transform 120ms var(--v-ease), box-shadow 120ms var(--v-ease)',
        textDecoration: 'none',
        color: 'inherit',
      }}
    >
      <span
        style={{
          width: emphasized ? 44 : 38,
          height: emphasized ? 44 : 38,
          borderRadius: 12,
          background: color,
          color: '#fff',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          boxShadow: '0 2px 4px rgba(0,0,0,0.08)',
        }}
      >
        {icon}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontFamily: 'var(--v-font-head)',
            fontWeight: 900,
            fontSize: emphasized ? 'var(--v-text-lg)' : 'var(--v-text-base)',
            color: 'var(--v-ink)',
            letterSpacing: 'var(--v-tracking-tight)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {name}
        </div>
        <div
          style={{
            fontFamily: 'var(--v-font-body)',
            fontSize: 'var(--v-text-xs)',
            color: 'var(--v-muted)',
            marginTop: 2,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {subtitleText}
        </div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div
          style={{
            fontFamily: 'var(--v-font-head)',
            fontWeight: 900,
            fontSize: 'var(--v-text-xl)',
            color: count > 0 ? color : 'var(--v-muted)',
            lineHeight: 1,
          }}
        >
          {count}
        </div>
        <div
          style={{
            fontFamily: 'var(--v-font-body)',
            fontSize: 10,
            fontWeight: 800,
            color: 'var(--v-muted)',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            marginTop: 3,
          }}
        >
          {countLabel}
        </div>
      </div>
      {!disabled && (
        <ArrowRight size={16} color="var(--v-muted)" style={{ flexShrink: 0 }} />
      )}
    </div>
  );

  if (disabled) return content;
  return (
    <Link href={href} style={{ textDecoration: 'none', color: 'inherit' }}>
      {content}
    </Link>
  );
}
