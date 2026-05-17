'use client';

import Link from 'next/link';
import MAppShell from '../_shell/MAppShell';
import Icon from '@/components/landing/shared/Icon';

// Mobile decks list. README §3 Screen 4.

const FILTERS = [
  { label: 'Tất cả',   count: 12, active: true  },
  { label: 'Đang học', count: 5,  active: false },
  { label: 'Đã thuộc', count: 3,  active: false },
  { label: 'Tạm dừng', count: 1,  active: false },
];

interface Deck {
  name: string;
  total: number;
  mastered: number;
  color: string;
}

const SAMPLE_DECKS: ReadonlyArray<Deck> = [
  { name: 'PTE Academic',       total: 124, mastered: 38, color: 'var(--v-primary)' },
  { name: 'Business English',   total: 86,  mastered: 22, color: 'var(--v-blue)'    },
  { name: 'Daily Conversation', total: 56,  mastered: 41, color: 'var(--v-orange)'  },
  { name: 'Phrasal Verbs',      total: 72,  mastered: 12, color: 'var(--v-purple)'  },
  { name: 'TOEIC từ vựng',      total: 110, mastered: 18, color: 'var(--v-teal)'    },
  { name: 'Idioms hằng ngày',   total: 64,  mastered: 0,  color: 'var(--v-yellow-deep)' },
];

export default function MDecksList() {
  return (
    <MAppShell active="decks">
      <div style={{ padding: '8px 18px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div
              style={{
                fontFamily: 'var(--v-font-body)',
                fontSize: 10,
                fontWeight: 900,
                color: 'var(--v-muted)',
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
              }}
            >
              Pick &amp; mix
            </div>
            <h1
              style={{
                fontFamily: 'var(--v-font-head)',
                fontSize: 24,
                fontWeight: 1000,
                lineHeight: 1.0,
                margin: '3px 0 0',
                letterSpacing: '-0.025em',
                color: 'var(--v-ink)',
              }}
            >
              Bộ từ <span style={{ color: 'var(--v-brand)' }}>của bạn</span>
            </h1>
          </div>
          <Link
            href="/add"
            style={{
              padding: '8px 12px',
              background: 'var(--v-brand)',
              color: '#fff',
              boxShadow:
                '0 3px 0 rgba(20,40,80,.18), 0 4px 10px color-mix(in srgb, var(--v-brand) 33%, transparent)',
              borderRadius: 11,
              fontFamily: 'var(--v-font-head)',
              fontWeight: 900,
              fontSize: 11,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              textDecoration: 'none',
            }}
          >
            <Icon name="plus" size={13} stroke="#fff" strokeWidth={3} /> Bộ mới
          </Link>
        </div>

        {/* Search */}
        <div style={{ position: 'relative' }}>
          <input
            placeholder="Tìm trong bộ từ…"
            style={{
              width: '100%',
              padding: '10px 14px 10px 38px',
              fontSize: 13,
              fontFamily: 'var(--v-font-body)',
              fontWeight: 600,
              background: '#fff',
              border: '1px solid var(--v-border)',
              borderRadius: 12,
              boxShadow: 'var(--v-shadow-sm)',
              color: 'var(--v-ink)',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          <div style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}>
            <Icon name="search" size={15} stroke="var(--v-muted)" strokeWidth={2.2} />
          </div>
        </div>

        {/* Filter chips */}
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none' }}>
          {FILTERS.map((c) => (
            <button
              key={c.label}
              type="button"
              style={{
                padding: '6px 12px',
                background: c.active ? 'var(--v-ink)' : '#fff',
                color: c.active ? '#fff' : 'var(--v-ink-soft)',
                border: `1px solid ${c.active ? 'var(--v-ink)' : 'var(--v-border)'}`,
                borderRadius: 999,
                fontFamily: 'var(--v-font-head)',
                fontWeight: 900,
                fontSize: 11,
                whiteSpace: 'nowrap',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                flexShrink: 0,
              }}
            >
              {c.label}
              <span
                style={{
                  background: c.active ? 'rgba(255,255,255,.25)' : 'var(--v-panel)',
                  color: 'inherit',
                  borderRadius: 999,
                  padding: '0 6px',
                  fontSize: 10,
                  fontWeight: 800,
                }}
              >
                {c.count}
              </span>
            </button>
          ))}
        </div>

        {/* Deck cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {SAMPLE_DECKS.map((d) => {
            const pct = Math.round((d.mastered / d.total) * 100);
            return (
              <Link
                key={d.name}
                href="/decks"
                style={{
                  background: '#fff',
                  border: '1px solid var(--v-border)',
                  boxShadow: 'var(--v-shadow-md)',
                  borderRadius: 14,
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  textDecoration: 'none',
                }}
              >
                <div
                  style={{
                    width: 46,
                    height: 46,
                    borderRadius: 12,
                    background: d.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: 'var(--v-font-head)',
                    fontWeight: 1000,
                    fontSize: 16,
                    color: '#fff',
                    boxShadow: `0 3px 0 rgba(60,20,5,.12), 0 4px 8px color-mix(in srgb, ${d.color} 33%, transparent)`,
                    flexShrink: 0,
                  }}
                >
                  {d.name[0]}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontFamily: 'var(--v-font-head)',
                      fontSize: 14,
                      fontWeight: 1000,
                      color: 'var(--v-ink)',
                      letterSpacing: '-0.01em',
                    }}
                  >
                    {d.name}
                  </div>
                  <div style={{ fontFamily: 'var(--v-font-body)', fontSize: 10, fontWeight: 700, color: 'var(--v-muted)', marginTop: 2 }}>
                    {d.mastered}/{d.total} từ · {pct}% thuộc
                  </div>
                  <div style={{ height: 5, background: 'var(--v-panel)', borderRadius: 999, marginTop: 5, overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: d.color }} />
                  </div>
                </div>
                <Icon name="arrowRight" size={16} stroke="var(--v-muted)" strokeWidth={2.4} style={{ flexShrink: 0 }} />
              </Link>
            );
          })}
        </div>
      </div>
    </MAppShell>
  );
}
