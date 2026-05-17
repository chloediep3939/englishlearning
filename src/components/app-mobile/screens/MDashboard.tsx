'use client';

import Image from 'next/image';
import Link from 'next/link';
import MAppShell from '../_shell/MAppShell';
import MStatPill from '../_shell/MStatPill';
import Icon from '@/components/landing/shared/Icon';

// Mobile Dashboard. README §3 Screen 1.

interface DeckPreview {
  name: string;
  total: number;
  mastered: number;
  color: string;
}

const SAMPLE_DECKS: ReadonlyArray<DeckPreview> = [
  { name: 'PTE Academic',      total: 124, mastered: 38, color: 'var(--v-primary)' },
  { name: 'Business English',  total: 86,  mastered: 22, color: 'var(--v-blue)' },
  { name: 'Daily Conversation',total: 56,  mastered: 41, color: 'var(--v-orange)' },
];

const STAT_TILES = [
  { value: 12,  label: 'Từ mới',    sub: 'chờ học',  color: 'var(--v-blue)',    icon: 'sparkle' },
  { value: 38,  label: 'Đang học',  sub: 'tuần này', color: 'var(--v-orange)',  icon: 'book'    },
  { value: 154, label: 'Đang ôn',   sub: 'đã chín',  color: 'var(--v-primary)', icon: 'refresh' },
  { value: 73,  label: 'Thuộc rồi', sub: '+5 tuần',  color: 'var(--v-purple)',  icon: 'trophy'  },
] as const;

export default function MDashboard() {
  return (
    <MAppShell active="home">
      <div style={{ padding: '8px 18px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
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
              Chương 47 · T4 13.5
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
              Chào buổi sáng, <span style={{ color: 'var(--v-brand)' }}>bạn</span>!
            </h1>
          </div>
          <div style={{ display: 'flex', gap: 5 }}>
            <MStatPill icon="flame" value={7} color="var(--v-red)" fill="var(--v-red)" />
            <MStatPill icon="gem" value={248} color="var(--v-blue)" fill="var(--v-blue)" />
          </div>
        </div>

        {/* HERO card */}
        <section
          style={{
            position: 'relative',
            background: 'linear-gradient(135deg, var(--v-brand) 0%, var(--v-brand-dark) 100%)',
            borderRadius: 20,
            boxShadow: '0 4px 0 rgba(20,40,80,.15), 0 8px 20px color-mix(in srgb, var(--v-brand) 25%, transparent)',
            padding: '16px 16px 18px',
            overflow: 'hidden',
          }}
        >
          <svg
            aria-hidden="true"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
          >
            {[
              [40, 22, 7],
              [330, 30, 6],
              [340, 130, 8],
              [30, 140, 7],
            ].map(([x, y, s], i) => (
              <polygon
                key={i}
                points={`${x},${y - s} ${x + s * 0.3},${y - s * 0.3} ${x + s},${y} ${x + s * 0.3},${y + s * 0.3} ${x},${y + s} ${x - s * 0.3},${y + s * 0.3} ${x - s},${y} ${x - s * 0.3},${y - s * 0.3}`}
                fill="#fff"
                opacity="0.4"
              />
            ))}
          </svg>
          <div style={{ position: 'relative', display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
            <Image
              src="/mascot/ngoc-happy.png"
              alt=""
              aria-hidden="true"
              width={70}
              height={70}
              style={{
                filter: 'drop-shadow(0 4px 8px rgba(20,40,80,.25))',
                animation: 'v-ngoc-bob 2.5s ease-in-out infinite',
              }}
            />
            <div style={{ flex: 1, color: '#fff' }}>
              <div
                style={{
                  fontFamily: 'var(--v-font-body)',
                  fontSize: 10,
                  fontWeight: 900,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  opacity: 0.85,
                }}
              >
                Hôm nay
              </div>
              <div
                style={{
                  fontFamily: 'var(--v-font-head)',
                  fontSize: 18,
                  fontWeight: 1000,
                  lineHeight: 1.1,
                  marginTop: 2,
                  letterSpacing: '-0.015em',
                }}
              >
                46 từ ôn
                <br />+ 10 từ mới
              </div>
            </div>
            <div style={{ width: 70, height: 70, position: 'relative', flexShrink: 0 }}>
              <svg viewBox="0 0 100 100" style={{ position: 'absolute', inset: 0 }}>
                <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="9" />
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  stroke="#fff"
                  strokeWidth="9"
                  strokeDasharray={`${(4 / 50) * 264} 264`}
                  strokeLinecap="round"
                  transform="rotate(-90 50 50)"
                />
              </svg>
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                }}
              >
                <div style={{ fontFamily: 'var(--v-font-head)', fontSize: 16, fontWeight: 1000, lineHeight: 1 }}>
                  4<span style={{ opacity: 0.7, fontSize: 10 }}>/50</span>
                </div>
                <div style={{ fontFamily: 'var(--v-font-body)', fontSize: 8, fontWeight: 800, opacity: 0.85 }}>
                  mục tiêu
                </div>
              </div>
            </div>
          </div>
          <div style={{ position: 'relative', display: 'flex', gap: 8 }}>
            <Link
              href="/review"
              style={{
                flex: 1,
                padding: '12px 14px',
                background: '#fff',
                color: 'var(--v-brand)',
                boxShadow: '0 3px 0 rgba(20,40,80,.15), 0 3px 8px rgba(40,30,15,.1)',
                borderRadius: 13,
                fontFamily: 'var(--v-font-head)',
                fontWeight: 1000,
                fontSize: 12,
                letterSpacing: '0.02em',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 5,
                textDecoration: 'none',
              }}
            >
              <Icon name="play" size={11} fill="var(--v-brand)" stroke="var(--v-brand)" /> ÔN · 46
            </Link>
            <Link
              href="/study"
              style={{
                flex: 1,
                padding: '12px 14px',
                background: 'rgba(255,255,255,0.22)',
                color: '#fff',
                border: '1.5px solid rgba(255,255,255,0.5)',
                borderRadius: 13,
                fontFamily: 'var(--v-font-head)',
                fontWeight: 1000,
                fontSize: 12,
                letterSpacing: '0.02em',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                textDecoration: 'none',
              }}
            >
              HỌC MỚI · 10
            </Link>
          </div>
        </section>

        {/* Streak bar */}
        <div
          style={{
            background: '#fff',
            border: '1px solid var(--v-border)',
            boxShadow: 'var(--v-shadow-md)',
            borderRadius: 14,
            padding: '12px 14px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 9,
                  background: 'var(--v-red)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 4px rgba(255,87,87,.3)',
                }}
              >
                <Icon name="flame" size={14} fill="#fff" stroke="#fff" />
              </div>
              <div>
                <div style={{ fontFamily: 'var(--v-font-head)', fontSize: 15, fontWeight: 1000, lineHeight: 1 }}>
                  7 ngày
                </div>
                <div style={{ fontFamily: 'var(--v-font-body)', fontSize: 10, fontWeight: 700, color: 'var(--v-muted)' }}>
                  kỷ lục: 12
                </div>
              </div>
            </div>
            <div style={{ fontFamily: 'var(--v-font-body)', fontSize: 11, fontWeight: 800, color: 'var(--v-primary)' }}>
              +5 phá kỷ lục
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(14, 1fr)', gap: 3 }}>
            {Array.from({ length: 14 }).map((_, i) => {
              const isPast = i < 7;
              const isToday = i === 7;
              return (
                <div
                  key={i}
                  style={{
                    height: 22,
                    borderRadius: 6,
                    background: isPast ? 'var(--v-primary)' : isToday ? '#fff' : 'var(--v-panel)',
                    border: isToday
                      ? '1.5px dashed var(--v-primary)'
                      : isPast
                        ? '1.5px solid var(--v-primary)'
                        : '1.5px solid var(--v-border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {isPast && <Icon name="check" size={10} stroke="#fff" strokeWidth={3.5} />}
                  {isToday && (
                    <span style={{ width: 5, height: 5, background: 'var(--v-accent)', borderRadius: '50%' }} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Stat tiles 2×2 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {STAT_TILES.map((s) => (
            <div
              key={s.label}
              style={{
                position: 'relative',
                background: '#fff',
                border: '1px solid var(--v-border)',
                boxShadow: 'var(--v-shadow-sm)',
                borderRadius: 14,
                padding: '12px 12px 10px',
                overflow: 'hidden',
              }}
            >
              <div
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  top: -14,
                  right: -14,
                  width: 50,
                  height: 50,
                  borderRadius: '50%',
                  background: s.color,
                  opacity: 0.14,
                }}
              />
              <div
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 8,
                  background: s.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  boxShadow: `0 2px 4px color-mix(in srgb, ${s.color} 25%, transparent)`,
                }}
              >
                <Icon name={s.icon} size={13} stroke="#fff" strokeWidth={2.6} fill="#fff" />
              </div>
              <div
                style={{
                  fontFamily: 'var(--v-font-head)',
                  fontSize: 22,
                  fontWeight: 1000,
                  lineHeight: 1,
                  color: 'var(--v-ink)',
                  marginTop: 6,
                  letterSpacing: '-0.02em',
                  position: 'relative',
                }}
              >
                {s.value}
              </div>
              <div
                style={{
                  fontFamily: 'var(--v-font-body)',
                  fontSize: 11,
                  fontWeight: 800,
                  color: 'var(--v-ink-soft)',
                  marginTop: 2,
                  position: 'relative',
                }}
              >
                {s.label}
              </div>
              <div
                style={{
                  fontFamily: 'var(--v-font-body)',
                  fontSize: 10,
                  fontWeight: 700,
                  color: 'var(--v-muted)',
                  position: 'relative',
                }}
              >
                {s.sub}
              </div>
            </div>
          ))}
        </div>

        {/* Decks preview */}
        <div
          style={{
            background: '#fff',
            border: '1px solid var(--v-border)',
            boxShadow: 'var(--v-shadow-md)',
            borderRadius: 14,
            padding: 14,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <h3 style={{ fontFamily: 'var(--v-font-head)', fontSize: 14, fontWeight: 1000, margin: 0, color: 'var(--v-ink)' }}>
              Bộ từ
            </h3>
            <Link
              href="/decks"
              style={{
                fontFamily: 'var(--v-font-body)',
                fontWeight: 800,
                color: 'var(--v-brand)',
                fontSize: 11,
                textDecoration: 'none',
              }}
            >
              Tất cả →
            </Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {SAMPLE_DECKS.map((d) => (
              <div
                key={d.name}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 9,
                  padding: '6px 8px',
                  background: 'var(--v-panel)',
                  borderRadius: 10,
                }}
              >
                <div
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 9,
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
                  <div
                    style={{
                      fontFamily: 'var(--v-font-head)',
                      fontSize: 11,
                      fontWeight: 900,
                      color: 'var(--v-ink)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {d.name}
                  </div>
                  <div
                    style={{
                      height: 5,
                      background: '#fff',
                      border: '1px solid var(--v-border)',
                      borderRadius: 999,
                      marginTop: 3,
                      overflow: 'hidden',
                    }}
                  >
                    <div style={{ width: `${(d.mastered / d.total) * 100}%`, height: '100%', background: d.color }} />
                  </div>
                </div>
                <div
                  style={{
                    fontFamily: 'var(--v-font-head)',
                    fontWeight: 1000,
                    fontSize: 11,
                    color: 'var(--v-ink)',
                    flexShrink: 0,
                  }}
                >
                  {Math.round((d.mastered / d.total) * 100)}%
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </MAppShell>
  );
}
