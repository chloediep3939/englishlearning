'use client';

import { useState } from 'react';
import MAppShell from '../_shell/MAppShell';
import Icon from '@/components/landing/shared/Icon';

// Mobile add word + AI auto-fill. README §3 Screen 5.

const DECKS = [
  { name: 'PTE Academic',       total: 124, color: 'var(--v-primary)' },
  { name: 'Business English',   total: 86,  color: 'var(--v-blue)'    },
  { name: 'Daily Conversation', total: 56,  color: 'var(--v-orange)'  },
];

const OPTIONS = [
  { label: 'IPA + audio',         default: true  },
  { label: '3 ví dụ + bản dịch',  default: true  },
  { label: 'Collocations',         default: true  },
  { label: 'Ảnh từ Pexels',        default: false },
];

export default function MAddWord() {
  const [text, setText] = useState('preferential\nubiquitous\nmeticulous\nephemeral');
  const [deckIdx, setDeckIdx] = useState(0);
  const [toggles, setToggles] = useState<boolean[]>(OPTIONS.map((o) => o.default));

  const wordCount = text.split('\n').filter((l) => l.trim().length > 0).length;

  return (
    <MAppShell active="add">
      <div style={{ padding: '8px 18px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Header */}
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
            AI auto-fill
          </div>
          <h1
            style={{
              fontFamily: 'var(--v-font-head)',
              fontSize: 24,
              fontWeight: 1000,
              lineHeight: 1.0,
              margin: '3px 0 6px',
              letterSpacing: '-0.025em',
              color: 'var(--v-ink)',
            }}
          >
            Thêm từ <span style={{ color: 'var(--v-brand)' }}>mới</span>
          </h1>
          <p
            style={{
              fontFamily: 'var(--v-font-body)',
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--v-ink-soft)',
              margin: 0,
              lineHeight: 1.5,
            }}
          >
            Dán từ tiếng Anh. Bún tự fill IPA · audio · ví dụ · ảnh.
          </p>
        </div>

        {/* Paste input */}
        <div>
          <div style={{ fontFamily: 'var(--v-font-body)', fontSize: 11, fontWeight: 900, color: 'var(--v-ink-soft)', marginBottom: 6 }}>
            Dán danh sách từ
          </div>
          <div style={{ position: 'relative' }}>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              style={{
                width: '100%',
                minHeight: 100,
                padding: '12px 14px',
                fontSize: 14,
                fontFamily: 'var(--v-font-mono)',
                fontWeight: 600,
                background: '#fff',
                border: '1.5px solid color-mix(in srgb, var(--v-brand) 33%, transparent)',
                borderRadius: 14,
                boxShadow: '0 2px 0 color-mix(in srgb, var(--v-brand) 12%, transparent)',
                color: 'var(--v-ink)',
                outline: 'none',
                resize: 'vertical',
                boxSizing: 'border-box',
                lineHeight: 1.6,
              }}
            />
            <div
              style={{
                position: 'absolute',
                bottom: 8,
                right: 10,
                fontFamily: 'var(--v-font-body)',
                fontSize: 9.5,
                fontWeight: 700,
                color: 'var(--v-muted)',
              }}
            >
              {wordCount} từ · mỗi từ 1 dòng
            </div>
          </div>
        </div>

        {/* Deck picker */}
        <div>
          <div style={{ fontFamily: 'var(--v-font-body)', fontSize: 11, fontWeight: 900, color: 'var(--v-ink-soft)', marginBottom: 6 }}>
            Thêm vào bộ
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {DECKS.map((d, i) => {
              const active = deckIdx === i;
              return (
                <label
                  key={d.name}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 12px',
                    background: active ? 'var(--v-brand-soft)' : '#fff',
                    border: `1px solid ${active ? 'var(--v-brand)' : 'var(--v-border)'}`,
                    borderRadius: 12,
                    cursor: 'pointer',
                    boxShadow: active ? '0 2px 0 color-mix(in srgb, var(--v-brand) 15%, transparent)' : 'var(--v-shadow-sm)',
                  }}
                >
                  <input
                    type="radio"
                    name="deck-picker"
                    checked={active}
                    onChange={() => setDeckIdx(i)}
                    style={{ display: 'none' }}
                  />
                  <div
                    aria-hidden="true"
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: '50%',
                      background: active ? 'var(--v-brand)' : '#fff',
                      border: `1.5px solid ${active ? 'var(--v-brand)' : 'var(--v-border)'}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {active && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff' }} />}
                  </div>
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 8,
                      background: d.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontFamily: 'var(--v-font-head)',
                      fontWeight: 1000,
                      fontSize: 11,
                      color: '#fff',
                      flexShrink: 0,
                    }}
                  >
                    {d.name[0]}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: 'var(--v-font-head)', fontSize: 13, fontWeight: 900, color: 'var(--v-ink)' }}>
                      {d.name}
                    </div>
                    <div style={{ fontFamily: 'var(--v-font-body)', fontSize: 10, fontWeight: 700, color: 'var(--v-muted)' }}>
                      {d.total} từ
                    </div>
                  </div>
                </label>
              );
            })}
            <button
              type="button"
              style={{
                padding: '8px 12px',
                background: 'transparent',
                border: '1.5px dashed var(--v-border)',
                borderRadius: 12,
                fontFamily: 'var(--v-font-body)',
                fontSize: 12,
                fontWeight: 800,
                color: 'var(--v-ink-soft)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 5,
              }}
            >
              <Icon name="plus" size={13} stroke="var(--v-ink-soft)" strokeWidth={2.6} /> Bộ mới
            </button>
          </div>
        </div>

        {/* Toggle options */}
        <div
          style={{
            background: 'var(--v-panel)',
            borderRadius: 12,
            padding: '10px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          {OPTIONS.map((o, i) => {
            const on = toggles[i];
            return (
              <button
                key={o.label}
                type="button"
                onClick={() => setToggles((ts) => ts.map((t, j) => (j === i ? !t : t)))}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: 'transparent',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <span style={{ fontFamily: 'var(--v-font-body)', fontSize: 12, fontWeight: 700, color: 'var(--v-ink)' }}>
                  {o.label}
                </span>
                <div
                  style={{
                    width: 36,
                    height: 20,
                    borderRadius: 999,
                    background: on ? 'var(--v-brand)' : 'var(--v-border)',
                    position: 'relative',
                    transition: 'background .2s',
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      top: 2,
                      left: on ? 18 : 2,
                      width: 16,
                      height: 16,
                      borderRadius: '50%',
                      background: '#fff',
                      boxShadow: '0 1px 3px rgba(0,0,0,.18)',
                      transition: 'left .2s',
                    }}
                  />
                </div>
              </button>
            );
          })}
        </div>

        {/* CTA */}
        <button
          type="button"
          style={{
            width: '100%',
            padding: '15px 24px',
            background: 'var(--v-brand)',
            color: '#fff',
            border: 'none',
            boxShadow:
              '0 4px 0 rgba(20,40,80,.2), 0 8px 18px color-mix(in srgb, var(--v-brand) 33%, transparent)',
            borderRadius: 16,
            fontFamily: 'var(--v-font-head)',
            fontWeight: 1000,
            fontSize: 14,
            cursor: 'pointer',
            letterSpacing: '0.02em',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          <Icon name="sparkle" size={15} stroke="#fff" fill="#fff" /> Bún làm hộ · {wordCount} từ
        </button>
        <div
          style={{
            textAlign: 'center',
            fontFamily: 'var(--v-font-body)',
            fontSize: 11,
            fontWeight: 700,
            color: 'var(--v-muted)',
            marginTop: -8,
          }}
        >
          ~12 giây · bạn xem lại trước khi lưu
        </div>
      </div>
    </MAppShell>
  );
}
