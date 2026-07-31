'use client';

import { useRouter } from 'next/navigation';
import {
  Pencil, Trash2, Eye,
  BookOpen, Coffee, Briefcase, GraduationCap, Plane, Heart,
  Star, Music, Camera, Code, Flame, Sparkles,
  type LucideIcon,
} from 'lucide-react';
import type { DeckIcon, FlashcardDeckWithCounts } from '@/lib/types';
import { DECK_ICON_OPTIONS } from '@/lib/types';
import { deckProgressPct } from '@/lib/flashcards/progress';

interface Props {
  deck: FlashcardDeckWithCounts;
  onEdit: () => void;
  onDelete: () => void;
  /** 'grid' (default) = tall card. 'list' = compact full-width row. */
  layout?: 'grid' | 'list';
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

export default function DeckCard({ deck, onEdit, onDelete, layout = 'grid' }: Props) {
  const router = useRouter();
  const Icon = resolveIcon(deck.icon);

  // Weighted stage progress (new=0, học=1/3, ôn=2/3, thuộc=1).
  const progress = deckProgressPct(deck);

  function open() {
    router.push(`/decks/${deck.id}`);
  }

  if (layout === 'list') {
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={open}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            open();
          }
        }}
        style={{
          padding: '10px 14px',
          background: 'var(--v-panel)',
          border: '1px solid var(--v-border)',
          borderRadius: 'var(--v-radius-md)',
          boxShadow: 'var(--v-shadow-sm)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          transition: 'box-shadow 0.15s ease, transform 0.15s ease',
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.boxShadow = 'var(--v-shadow-md)';
          (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.boxShadow = 'var(--v-shadow-sm)';
          (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 'var(--v-radius-md)',
            background: deck.color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            flexShrink: 0,
            boxShadow: 'var(--v-shadow-sm)',
          }}
        >
          <Icon size={20} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <h3
              style={{
                fontFamily: 'var(--v-font-head)',
                fontWeight: 900,
                fontSize: 'var(--v-text-base)',
                margin: 0,
                color: 'var(--v-ink)',
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
                  flexShrink: 0,
                }}
              >
                Mặc định
              </span>
            )}
          </div>
          <div
            style={{
              fontFamily: 'var(--v-font-body)',
              fontSize: 'var(--v-text-sm)',
              color: 'var(--v-muted)',
              marginTop: 2,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {deck.total} từ{deck.subtitle ? ` · ${deck.subtitle}` : ''}
          </div>
        </div>

        {/* Progress bar */}
        <div
          style={{
            width: 110,
            height: 8,
            background: 'var(--v-border)',
            borderRadius: 'var(--v-radius-pill)',
            overflow: 'hidden',
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: `${progress}%`,
              height: '100%',
              background: 'var(--v-primary)',
              borderRadius: 'var(--v-radius-pill)',
              transition: 'width 0.3s ease',
            }}
          />
        </div>
        <span
          style={{
            fontFamily: 'var(--v-font-head)',
            fontSize: 'var(--v-text-sm)',
            fontWeight: 800,
            color: 'var(--v-ink-soft)',
            minWidth: 36,
            textAlign: 'right',
            flexShrink: 0,
          }}
        >
          {progress}%
        </span>

        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            aria-label="Sửa"
            style={cornerBtnStyle()}
          >
            <Pencil size={12} />
          </button>
          {!deck.is_default && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              aria-label="Xoá"
              style={{ ...cornerBtnStyle(), color: 'var(--v-red)' }}
            >
              <Trash2 size={12} />
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => router.push(`/decks/${deck.id}`)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          router.push(`/decks/${deck.id}`);
        }
      }}
      style={{
        padding: 16,
        background: 'var(--v-panel)',
        border: '1px solid var(--v-border)',
        borderRadius: 'var(--v-radius-md)',
        boxShadow: 'var(--v-shadow-sm)',
        position: 'relative',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        transition: 'box-shadow 0.15s ease, transform 0.15s ease',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = 'var(--v-shadow-md)';
        (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = 'var(--v-shadow-sm)';
        (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
      }}
    >
      {/* Top row: icon tile + name + count */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div
          style={{
            width: 60,
            height: 60,
            borderRadius: 'var(--v-radius-md)',
            background: deck.color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            flexShrink: 0,
            boxShadow: 'var(--v-shadow-sm)',
          }}
        >
          <Icon size={28} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <h3
              style={{
                fontFamily: 'var(--v-font-head)',
                fontWeight: 900,
                fontSize: 'var(--v-text-lg)',
                margin: 0,
                color: 'var(--v-ink)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                flex: 1,
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
            {deck.recognition_only && (
              <span
                style={{
                  padding: '1px 6px',
                  background: 'var(--v-blue-soft)',
                  color: 'var(--v-blue)',
                  borderRadius: 'var(--v-radius-pill)',
                  fontSize: 10,
                  fontWeight: 800,
                  letterSpacing: 'var(--v-tracking-wide)',
                  textTransform: 'uppercase',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 3,
                }}
              >
                <Eye size={10} strokeWidth={2.6} /> Hiểu nghĩa
              </span>
            )}
          </div>
          <div
            style={{
              fontFamily: 'var(--v-font-body)',
              fontSize: 'var(--v-text-sm)',
              color: 'var(--v-muted)',
              marginTop: 2,
            }}
          >
            {deck.total} từ
          </div>
        </div>

        {/* Edit + delete corner buttons */}
        <div
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            display: 'flex',
            gap: 4,
          }}
        >
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            aria-label="Sửa"
            style={cornerBtnStyle()}
          >
            <Pencil size={12} />
          </button>
          {!deck.is_default && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              aria-label="Xoá"
              style={{ ...cornerBtnStyle(), color: 'var(--v-red)' }}
            >
              <Trash2 size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Subtitle (only if present) */}
      {deck.subtitle && (
        <p
          style={{
            margin: 0,
            color: 'var(--v-ink-soft)',
            fontFamily: 'var(--v-font-body)',
            fontSize: 'var(--v-text-sm)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {deck.subtitle}
        </p>
      )}

      {/* Progress bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div
          style={{
            flex: 1,
            height: 8,
            background: 'var(--v-border)',
            borderRadius: 'var(--v-radius-pill)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${progress}%`,
              height: '100%',
              background: 'var(--v-primary)',
              borderRadius: 'var(--v-radius-pill)',
              transition: 'width 0.3s ease',
            }}
          />
        </div>
        <span
          style={{
            fontFamily: 'var(--v-font-head)',
            fontSize: 'var(--v-text-sm)',
            fontWeight: 800,
            color: 'var(--v-ink-soft)',
            minWidth: 36,
            textAlign: 'right',
          }}
        >
          {progress}%
        </span>
      </div>
    </div>
  );
}

function cornerBtnStyle(): React.CSSProperties {
  return {
    width: 26,
    height: 26,
    background: 'var(--v-surface)',
    border: '1px solid var(--v-border)',
    borderRadius: 'var(--v-radius-sm)',
    color: 'var(--v-ink-soft)',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
  };
}
