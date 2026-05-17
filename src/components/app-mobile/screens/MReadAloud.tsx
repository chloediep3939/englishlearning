'use client';

import MAppShell from '../_shell/MAppShell';
import Icon from '@/components/landing/shared/Icon';

// Mobile read-aloud (mic). README §3 Screen 7.

const SENTENCE = ['Club', 'members', 'received', 'preferential', 'seating', 'at', 'the', 'event.'];
const SCORES = [1, 1, 0.7, 1, 1, 1, 0.4, 1];

function colorFor(s: number): string {
  if (s === 1) return 'var(--v-primary)';
  if (s >= 0.6) return 'var(--v-orange)';
  return 'var(--v-red)';
}

function emojiFor(s: number): string {
  if (s === 1) return '✓';
  if (s >= 0.6) return '~';
  return '✗';
}

export default function MReadAloud() {
  return (
    <MAppShell active="review">
      <div
        style={{
          padding: '8px 18px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          minHeight: 'calc(100vh - 36px - 70px)',
          boxSizing: 'border-box',
        }}
      >
        {/* Top */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            type="button"
            aria-label="Quay lại"
            style={{
              width: 34,
              height: 34,
              borderRadius: 11,
              background: '#fff',
              border: '1px solid var(--v-border)',
              boxShadow: 'var(--v-shadow-sm)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Icon name="arrowLeft" size={16} stroke="var(--v-ink)" strokeWidth={2.4} />
          </button>
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontFamily: 'var(--v-font-body)',
                fontSize: 9,
                fontWeight: 900,
                color: 'var(--v-muted)',
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
              }}
            >
              Luyện đọc to
            </div>
            <div style={{ fontFamily: 'var(--v-font-head)', fontSize: 14, fontWeight: 1000, color: 'var(--v-ink)', marginTop: 1 }}>
              Câu 3 / 10
            </div>
          </div>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '4px 10px',
              background: 'var(--v-brand-soft)',
              borderRadius: 999,
              fontFamily: 'var(--v-font-body)',
              fontSize: 11,
              fontWeight: 900,
              color: 'var(--v-brand)',
            }}
          >
            <Icon name="target" size={11} stroke="var(--v-brand)" strokeWidth={2.4} /> 78%
          </div>
        </div>

        {/* Sentence */}
        <div
          style={{
            background: '#fff',
            border: '1px solid var(--v-border)',
            boxShadow: 'var(--v-shadow-md)',
            borderRadius: 16,
            padding: '16px 18px',
          }}
        >
          <div
            style={{
              fontFamily: 'var(--v-font-body)',
              fontSize: 10,
              fontWeight: 900,
              color: 'var(--v-muted)',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              marginBottom: 8,
            }}
          >
            Đọc câu này
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
            {SENTENCE.map((w, i) => {
              const col = colorFor(SCORES[i]);
              return (
                <span
                  key={i}
                  style={{
                    fontFamily: 'var(--v-font-head)',
                    fontSize: 19,
                    fontWeight: 900,
                    color: col,
                    letterSpacing: '-0.005em',
                    borderBottom: `2.5px solid color-mix(in srgb, ${col} 25%, transparent)`,
                    paddingBottom: 1,
                  }}
                >
                  {w}
                </span>
              );
            })}
          </div>
          <div
            style={{
              marginTop: 12,
              paddingTop: 10,
              borderTop: '1px solid var(--v-border)',
              fontFamily: 'var(--v-font-body)',
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--v-ink-soft)',
              lineHeight: 1.5,
            }}
          >
            Các thành viên câu lạc bộ nhận được chỗ ngồi ưu đãi tại sự kiện.
          </div>
        </div>

        {/* Per-word scoring */}
        <div>
          <div style={{ fontFamily: 'var(--v-font-body)', fontSize: 11, fontWeight: 900, color: 'var(--v-ink-soft)', marginBottom: 8 }}>
            Điểm từng từ
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            {SENTENCE.slice(0, 6).map((w, i) => {
              const s = SCORES[i];
              const col = colorFor(s);
              return (
                <div
                  key={i}
                  style={{
                    background: '#fff',
                    border: '1px solid var(--v-border)',
                    borderRadius: 10,
                    padding: '8px 10px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <div
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 7,
                      background: col,
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontFamily: 'var(--v-font-head)',
                      fontWeight: 1000,
                      fontSize: 12,
                      flexShrink: 0,
                    }}
                  >
                    {emojiFor(s)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontFamily: 'var(--v-font-head)',
                        fontSize: 12,
                        fontWeight: 900,
                        color: 'var(--v-ink)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {w}
                    </div>
                    <div style={{ fontFamily: 'var(--v-font-mono)', fontSize: 9.5, fontWeight: 600, color: 'var(--v-muted)' }}>
                      {Math.round(s * 100)}%
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Mic button */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: 8,
            paddingBottom: 8,
          }}
        >
          <div style={{ position: 'relative', width: 96, height: 96 }}>
            <div
              aria-hidden="true"
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: '50%',
                background: 'var(--v-red)',
                opacity: 0.18,
                animation: 'v-sparkle 1.4s ease-in-out infinite',
              }}
            />
            <button
              type="button"
              aria-label="Bắt đầu thu âm"
              style={{
                position: 'absolute',
                inset: 8,
                borderRadius: '50%',
                background: 'var(--v-red)',
                border: 'none',
                boxShadow:
                  '0 5px 0 rgba(80,20,20,.22), 0 8px 18px color-mix(in srgb, var(--v-red) 40%, transparent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <svg width="32" height="32" viewBox="0 0 24 24" fill="#fff" stroke="#fff">
                <rect x="9" y="3" width="6" height="13" rx="3" />
                <path d="M5 11a7 7 0 0 0 14 0M12 18v3" stroke="#fff" strokeWidth="2" strokeLinecap="round" fill="none" />
              </svg>
            </button>
          </div>
          <div style={{ fontFamily: 'var(--v-font-body)', fontSize: 12, fontWeight: 800, color: 'var(--v-red)' }}>
            Đang nghe…{' '}
            <span style={{ fontFamily: 'var(--v-font-mono)', color: 'var(--v-ink-soft)', fontWeight: 700 }}>00:04</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              style={{
                padding: '8px 14px',
                background: '#fff',
                border: '1px solid var(--v-border)',
                boxShadow: 'var(--v-shadow-sm)',
                borderRadius: 11,
                fontFamily: 'var(--v-font-head)',
                fontWeight: 900,
                fontSize: 11,
                color: 'var(--v-ink-soft)',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <Icon name="speaker" size={12} stroke="var(--v-ink-soft)" /> Nghe mẫu
            </button>
            <button
              type="button"
              style={{
                padding: '8px 14px',
                background: '#fff',
                border: '1px solid var(--v-border)',
                boxShadow: 'var(--v-shadow-sm)',
                borderRadius: 11,
                fontFamily: 'var(--v-font-head)',
                fontWeight: 900,
                fontSize: 11,
                color: 'var(--v-ink-soft)',
                cursor: 'pointer',
              }}
            >
              Bỏ qua →
            </button>
          </div>
        </div>
      </div>
    </MAppShell>
  );
}
