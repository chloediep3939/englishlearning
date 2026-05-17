'use client';

import { Fragment } from 'react';
import MAppShell from '../_shell/MAppShell';
import MStatPill from '../_shell/MStatPill';
import Icon from '@/components/landing/shared/Icon';

// Mobile reveal + rate screen. README §3 Screen 3.

const SAMPLE = {
  en: 'preferential',
  ipa: '/ˌprefəˈrenʃəl/',
  pos: 'ADJ',
  meaning: 'Ưu đãi, dành sự ưu tiên',
  example: {
    en: 'Club members received preferential seating.',
    vi: 'Các thành viên câu lạc bộ nhận được chỗ ngồi ưu đãi.',
  },
  collocations: [
    'preferential treatment',
    'preferential rate',
    'give preferential access',
  ],
};

const RATING_BUTTONS = [
  { key: 1, label: 'LẠI', sub: '< 1 phút', emoji: '😵', bg: 'var(--v-red)'     },
  { key: 2, label: 'KHÓ', sub: '10 phút',  emoji: '😬', bg: 'var(--v-orange)'  },
  { key: 3, label: 'TỐT', sub: '1 ngày',   emoji: '😊', bg: 'var(--v-primary)' },
  { key: 4, label: 'DỄ',  sub: '4 ngày',   emoji: '🎉', bg: 'var(--v-blue)'    },
];

export default function MReveal() {
  const colocColors = ['var(--v-pink)', 'var(--v-teal)', 'var(--v-yellow-deep)'];
  return (
    <MAppShell active="review">
      <div style={{ padding: '8px 18px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Progress */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            style={{
              fontFamily: 'var(--v-font-body)',
              fontSize: 10,
              fontWeight: 900,
              color: 'var(--v-ink-soft)',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              flexShrink: 0,
            }}
          >
            Thẻ 12/46
          </span>
          <div style={{ flex: 1, height: 9, background: '#fff', border: '1px solid var(--v-border)', borderRadius: 999, overflow: 'hidden' }}>
            <div
              style={{
                width: '28%',
                height: '100%',
                background: 'linear-gradient(90deg, var(--v-brand), #6cc4ed)',
                borderRadius: 999,
              }}
            />
          </div>
          <MStatPill icon="bolt" value="+12" color="var(--v-blue)" fill="var(--v-blue)" />
        </div>

        {/* Big word */}
        <header style={{ paddingBottom: 10, borderBottom: '1px solid var(--v-border)' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span
              style={{
                background: 'var(--v-purple)',
                color: '#fff',
                boxShadow: '0 2px 4px rgba(193,121,214,.35)',
                borderRadius: 999,
                padding: '2px 9px',
                fontFamily: 'var(--v-font-head)',
                fontWeight: 1000,
                fontSize: 9,
                letterSpacing: '0.08em',
              }}
            >
              {SAMPLE.pos}
            </span>
            <span style={{ fontFamily: 'var(--v-font-body)', fontSize: 10, fontWeight: 700, color: 'var(--v-muted)' }}>
              · đã gặp 3 lần
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
            <h1
              style={{
                fontFamily: 'var(--v-font-head)',
                fontSize: 32,
                fontWeight: 1000,
                margin: 0,
                letterSpacing: '-0.025em',
                color: 'var(--v-ink)',
                lineHeight: 1,
                display: 'inline-block',
                position: 'relative',
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  left: -2,
                  right: -2,
                  bottom: 1,
                  height: '32%',
                  background: 'var(--v-brand)',
                  opacity: 0.28,
                  zIndex: 0,
                  borderRadius: 3,
                }}
              />
              <span style={{ position: 'relative', zIndex: 1 }}>{SAMPLE.en}</span>
            </h1>
            <span style={{ fontFamily: 'var(--v-font-mono)', fontSize: 12, color: 'var(--v-brand)', fontWeight: 700 }}>
              {SAMPLE.ipa}
            </span>
            <button
              type="button"
              aria-label="Nghe phát âm"
              style={{
                marginLeft: 'auto',
                width: 32,
                height: 32,
                background: 'var(--v-brand)',
                border: 'none',
                boxShadow:
                  '0 2px 0 rgba(20,40,80,.15), 0 3px 6px color-mix(in srgb, var(--v-brand) 33%, transparent)',
                borderRadius: 10,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name="play" size={13} fill="#fff" stroke="#fff" />
            </button>
          </div>
        </header>

        {/* Char diff */}
        <div
          style={{
            background: 'var(--v-brand-soft)',
            border: '1px solid color-mix(in srgb, var(--v-brand) 31%, transparent)',
            borderRadius: 14,
            padding: '10px 14px',
            boxShadow: '0 2px 0 color-mix(in srgb, var(--v-brand) 15%, transparent)',
          }}
        >
          <div
            style={{
              fontFamily: 'var(--v-font-head)',
              fontSize: 9,
              fontWeight: 1000,
              color: 'var(--v-brand)',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              marginBottom: 6,
              textAlign: 'center',
            }}
          >
            Bạn gõ → Đáp án
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <div style={{ fontFamily: 'var(--v-font-mono)', fontSize: 16, letterSpacing: '0.06em', display: 'flex', gap: 2 }}>
              {'prefer'.split('').map((c, i) => {
                const correct = SAMPLE.en[i] === c;
                return (
                  <span
                    key={i}
                    style={{
                      color: correct ? 'var(--v-brand)' : 'var(--v-red)',
                      fontWeight: 700,
                      textDecoration: correct ? 'none' : 'line-through',
                    }}
                  >
                    {c}
                  </span>
                );
              })}
            </div>
            <Icon name="arrowRight" size={12} stroke="var(--v-muted)" style={{ transform: 'rotate(90deg)' }} />
            <div
              style={{
                fontFamily: 'var(--v-font-mono)',
                fontSize: 21,
                color: 'var(--v-brand)',
                fontWeight: 800,
                letterSpacing: '0.02em',
              }}
            >
              {SAMPLE.en}
            </div>
          </div>
        </div>

        {/* Meaning */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <div style={{ width: 4, alignSelf: 'stretch', background: 'var(--v-accent)', borderRadius: 2, flexShrink: 0 }} />
          <div>
            <div
              style={{
                fontFamily: 'var(--v-font-body)',
                fontSize: 9,
                fontWeight: 1000,
                color: 'var(--v-accent)',
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
              }}
            >
              Nghĩa
            </div>
            <div style={{ fontFamily: 'var(--v-font-head)', fontSize: 15, fontWeight: 900, color: 'var(--v-ink)', marginTop: 1 }}>
              {SAMPLE.meaning}
            </div>
          </div>
        </div>

        {/* Example */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <div style={{ width: 4, alignSelf: 'stretch', background: 'var(--v-blue)', borderRadius: 2, flexShrink: 0 }} />
          <div>
            <div
              style={{
                fontFamily: 'var(--v-font-body)',
                fontSize: 9,
                fontWeight: 1000,
                color: 'var(--v-blue)',
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
              }}
            >
              Ví dụ
            </div>
            <p
              style={{
                fontFamily: 'var(--v-font-head)',
                fontSize: 13,
                fontWeight: 800,
                color: 'var(--v-ink)',
                margin: '3px 0 3px',
                lineHeight: 1.4,
              }}
            >
              Club members received{' '}
              <span style={{ background: 'var(--v-brand-soft)', color: 'var(--v-brand)', padding: '0 4px', borderRadius: 4 }}>
                {SAMPLE.en}
              </span>{' '}
              seating.
            </p>
            <p style={{ fontFamily: 'var(--v-font-body)', fontSize: 11, fontWeight: 600, color: 'var(--v-ink-soft)', margin: 0, lineHeight: 1.5 }}>
              {SAMPLE.example.vi}
            </p>
          </div>
        </div>

        {/* Collocations */}
        <div>
          <div
            style={{
              fontFamily: 'var(--v-font-body)',
              fontSize: 9,
              fontWeight: 1000,
              color: 'var(--v-purple)',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              marginBottom: 6,
            }}
          >
            Thường đi cùng
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {SAMPLE.collocations.map((c, i) => (
              <div
                key={c}
                style={{
                  background: '#fff',
                  border: '1px solid var(--v-border)',
                  boxShadow: 'var(--v-shadow-sm)',
                  borderRadius: 10,
                  padding: '6px 10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <span style={{ width: 6, height: 6, background: colocColors[i % colocColors.length], borderRadius: 2, flexShrink: 0 }} />
                <span style={{ fontFamily: 'var(--v-font-body)', fontSize: 11, fontWeight: 700, color: 'var(--v-ink)' }}>
                  {c.split(SAMPLE.en).map((part, j, arr) => (
                    <Fragment key={j}>
                      {part}
                      {j < arr.length - 1 && <b style={{ color: 'var(--v-brand)' }}>{SAMPLE.en}</b>}
                    </Fragment>
                  ))}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Rating 2×2 */}
        <section style={{ borderTop: '1px solid var(--v-border)', paddingTop: 12, marginTop: 4 }}>
          <div style={{ fontFamily: 'var(--v-font-body)', fontSize: 11, fontWeight: 900, color: 'var(--v-ink-soft)', marginBottom: 8 }}>
            Bạn thấy thế nào?
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {RATING_BUTTONS.map((b) => (
              <button
                key={b.key}
                type="button"
                style={{
                  padding: '11px 12px',
                  background: b.bg,
                  border: 'none',
                  boxShadow: `0 3px 0 rgba(60,20,5,.15), 0 5px 12px color-mix(in srgb, ${b.bg} 25%, transparent)`,
                  borderRadius: 13,
                  cursor: 'pointer',
                  textAlign: 'left',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <div style={{ fontSize: 18, lineHeight: 1, flexShrink: 0 }}>{b.emoji}</div>
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontFamily: 'var(--v-font-head)',
                      fontSize: 12,
                      fontWeight: 1000,
                      letterSpacing: '0.06em',
                      lineHeight: 1,
                    }}
                  >
                    {b.label}
                  </div>
                  <div
                    style={{
                      fontFamily: 'var(--v-font-body)',
                      fontSize: 9.5,
                      fontWeight: 700,
                      opacity: 0.9,
                      marginTop: 1,
                    }}
                  >
                    {b.sub}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>
      </div>
    </MAppShell>
  );
}
