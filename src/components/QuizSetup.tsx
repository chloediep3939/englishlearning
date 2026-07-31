'use client';

import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { FlashcardDeck, FlashcardDeckWithCounts, FlashcardSettings } from '@/lib/types';
import { apiJson } from '@/lib/common/api-json';

// Nearest chip to the user's `default_session_size`; ties break to the
// smaller chip (15 with chips [10,20,30] → 10).
function snapToOptions(target: number, options: number[]): number {
  return options.reduce((best, o) => {
    const d = Math.abs(o - target);
    const bestD = Math.abs(best - target);
    return d < bestD || (d === bestD && o < best) ? o : best;
  });
}

export interface QuizMode<V extends string = string> {
  value: V;
  label: string;
  description: string;
  icon: ReactNode;
}

export interface QuizStartOpts<V extends string = string> {
  mode: V;
  count: number;
  deckId: number | null;
}

interface Props<V extends string = string> {
  title: string;
  accent: string;
  accentText?: string;
  modes: QuizMode<V>[];
  countOptions: number[];
  defaultCount: number;
  defaultMode: V;
  onStart: (opts: QuizStartOpts<V>) => void;
  startLabel?: string;
}

export default function QuizSetup<V extends string = string>({
  title,
  accent,
  accentText = '#fff',
  modes,
  countOptions,
  defaultCount,
  defaultMode,
  onStart,
  startLabel = 'BẮT ĐẦU',
}: Props<V>) {
  const [mode, setMode] = useState<V>(defaultMode);
  const [count, setCount] = useState(defaultCount);
  const [deckId, setDeckId] = useState<number | null>(null);
  const [decks, setDecks] = useState<FlashcardDeckWithCounts[]>([]);
  // Once the user clicks a count chip, the settings fetch must not override
  // their pick (it can resolve later on a slow connection).
  const countTouchedRef = useRef(false);

  useEffect(() => {
    apiJson<{ decks?: FlashcardDeckWithCounts[] }>('/api/decks')
      .then((d) => setDecks(d.decks ?? []))
      .catch(() => {});
    // `default_session_size` pre-selects the closest chip; `defaultCount`
    // stays as the pre-fetch / error fallback.
    apiJson<FlashcardSettings>('/api/settings')
      .then((s) => {
        if (typeof s.default_session_size === 'number' && !countTouchedRef.current) {
          setCount(snapToOptions(s.default_session_size, countOptions));
        }
      })
      .catch(() => {});
    // countOptions is a per-page literal; mount-only fetch is intentional.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      <h2
        style={{
          fontFamily: 'var(--v-font-head)',
          fontWeight: 900,
          fontSize: 'var(--v-text-2xl)',
          letterSpacing: 'var(--v-tracking-tight)',
          margin: '0 0 18px',
          color: 'var(--v-ink)',
        }}
      >
        {title}
      </h2>

      <Label>Chế độ</Label>
      <div style={{ display: 'grid', gap: 8, marginBottom: 18 }}>
        {modes.map((m) => {
          const active = mode === m.value;
          return (
            <button
              key={m.value}
              type="button"
              onClick={() => setMode(m.value)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 14px',
                background: active ? accent : 'var(--v-surface)',
                color: active ? accentText : 'var(--v-ink)',
                border: active ? 'none' : '1.5px solid var(--v-border)',
                borderRadius: 'var(--v-radius-md)',
                boxShadow: active ? `var(--v-press), 0 4px 10px ${accent}40` : 'var(--v-shadow-sm)',
                cursor: 'pointer',
                fontFamily: 'var(--v-font-head)',
                textAlign: 'left',
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: active ? 'rgba(255,255,255,0.2)' : `${accent}20`,
                  color: active ? accentText : accent,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {m.icon}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 900, fontSize: 'var(--v-text-md)' }}>{m.label}</div>
                <div
                  style={{
                    fontFamily: 'var(--v-font-body)',
                    fontSize: 'var(--v-text-sm)',
                    fontWeight: 600,
                    opacity: 0.85,
                    marginTop: 2,
                  }}
                >
                  {m.description}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <Label>Số câu</Label>
      <div style={{ display: 'flex', gap: 6, marginBottom: 18 }}>
        {countOptions.map((c) => {
          const active = count === c;
          return (
            <button
              key={c}
              type="button"
              onClick={() => {
                countTouchedRef.current = true;
                setCount(c);
              }}
              style={{
                flex: 1,
                padding: '10px 0',
                background: active ? 'var(--v-ink)' : 'var(--v-surface)',
                color: active ? '#fff' : 'var(--v-ink)',
                border: '1.5px solid var(--v-border)',
                borderRadius: 'var(--v-radius-sm)',
                fontFamily: 'var(--v-font-head)',
                fontWeight: 900,
                fontSize: 'var(--v-text-md)',
                cursor: 'pointer',
              }}
            >
              {c}
            </button>
          );
        })}
      </div>

      <Label>Bộ từ</Label>
      <select
        value={deckId ?? ''}
        onChange={(e) => setDeckId(e.target.value ? Number(e.target.value) : null)}
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
          marginBottom: 20,
          outline: 'none',
        }}
      >
        <option value="">Tất cả bộ từ</option>
        {decks.map((d) => (
          <option key={d.id} value={d.id}>
            {d.name} ({d.total})
          </option>
        ))}
      </select>

      <button
        type="button"
        onClick={() => onStart({ mode, count, deckId })}
        style={{
          width: '100%',
          padding: '14px 22px',
          background: accent,
          color: accentText,
          border: 'none',
          borderRadius: 'var(--v-radius-md)',
          boxShadow: `var(--v-press), 0 6px 14px ${accent}60`,
          fontFamily: 'var(--v-font-head)',
          fontWeight: 900,
          fontSize: 'var(--v-text-lg)',
          letterSpacing: '0.04em',
          cursor: 'pointer',
        }}
      >
        {startLabel}
      </button>
    </div>
  );
}

function Label({ children }: { children: ReactNode }) {
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
