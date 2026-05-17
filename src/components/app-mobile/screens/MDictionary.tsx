'use client';

import { useState } from 'react';
import MAppShell from '../_shell/MAppShell';
import Icon from '@/components/landing/shared/Icon';

// Mobile dictionary lookup. README §3 Screen 6.

interface RecentWord {
  word: string;
  pos: string;
  vi: string;
  col: string;
  ipa: string;
}

const RECENT: ReadonlyArray<RecentWord> = [
  { word: 'serendipity', pos: 'NOUN', vi: 'May mắn tình cờ',   col: 'var(--v-pink)',   ipa: '/ˌserənˈdɪpəti/' },
  { word: 'ephemeral',   pos: 'ADJ',  vi: 'Phù du, chóng tàn', col: 'var(--v-purple)', ipa: '/ɪˈfemərəl/'     },
  { word: 'pragmatic',   pos: 'ADJ',  vi: 'Thực tế, thực dụng',col: 'var(--v-purple)', ipa: '/præɡˈmætɪk/'    },
  { word: 'meticulous',  pos: 'ADJ',  vi: 'Tỉ mỉ, chu đáo',    col: 'var(--v-purple)', ipa: '/məˈtɪkjələs/'   },
];

export default function MDictionary() {
  const [query, setQuery] = useState('preferential');
  return (
    <MAppShell active="more">
      <div style={{ padding: '8px 18px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
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
            Tra cứu
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
            Từ điển <span style={{ color: 'var(--v-brand)' }}>nhanh</span>
          </h1>
        </div>

        {/* Search */}
        <div style={{ position: 'relative' }}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '14px 16px 14px 44px',
              fontSize: 16,
              fontFamily: 'var(--v-font-head)',
              fontWeight: 800,
              background: '#fff',
              border: '2px solid var(--v-brand)',
              borderRadius: 14,
              boxShadow: '0 3px 0 color-mix(in srgb, var(--v-brand) 15%, transparent)',
              color: 'var(--v-ink)',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          <div style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }}>
            <Icon name="search" size={18} stroke="var(--v-brand)" strokeWidth={2.4} />
          </div>
        </div>

        {/* Word result */}
        <div
          style={{
            background: '#fff',
            border: '1px solid var(--v-border)',
            boxShadow: 'var(--v-shadow-md)',
            borderRadius: 16,
            padding: '14px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
            <h2
              style={{
                fontFamily: 'var(--v-font-head)',
                fontSize: 26,
                fontWeight: 1000,
                color: 'var(--v-ink)',
                margin: 0,
                letterSpacing: '-0.025em',
                lineHeight: 1,
              }}
            >
              preferential
            </h2>
            <span
              style={{
                background: 'var(--v-purple)',
                color: '#fff',
                borderRadius: 999,
                padding: '2px 8px',
                fontFamily: 'var(--v-font-head)',
                fontWeight: 1000,
                fontSize: 9,
                letterSpacing: '0.08em',
              }}
            >
              ADJ
            </span>
            <button
              type="button"
              aria-label="Nghe phát âm"
              style={{
                marginLeft: 'auto',
                width: 30,
                height: 30,
                background: 'var(--v-brand)',
                border: 'none',
                boxShadow:
                  '0 2px 0 rgba(20,40,80,.15), 0 3px 6px color-mix(in srgb, var(--v-brand) 33%, transparent)',
                borderRadius: 9,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name="play" size={12} fill="#fff" stroke="#fff" />
            </button>
          </div>
          <div style={{ fontFamily: 'var(--v-font-mono)', fontSize: 13, color: 'var(--v-brand)', fontWeight: 700 }}>
            /ˌprefəˈrenʃəl/
          </div>
          <div
            style={{
              fontFamily: 'var(--v-font-head)',
              fontSize: 15,
              fontWeight: 800,
              color: 'var(--v-ink)',
              paddingTop: 6,
              borderTop: '1px solid var(--v-border)',
            }}
          >
            Ưu đãi, dành sự ưu tiên
          </div>
          <div>
            <div
              style={{
                fontFamily: 'var(--v-font-body)',
                fontSize: 9,
                fontWeight: 1000,
                color: 'var(--v-blue)',
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                marginBottom: 4,
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
                margin: '0 0 3px',
                lineHeight: 1.4,
              }}
            >
              Club members received{' '}
              <span style={{ background: 'var(--v-brand-soft)', color: 'var(--v-brand)', padding: '0 4px', borderRadius: 4 }}>
                preferential
              </span>{' '}
              seating.
            </p>
            <p
              style={{
                fontFamily: 'var(--v-font-body)',
                fontSize: 11,
                fontWeight: 600,
                color: 'var(--v-ink-soft)',
                margin: 0,
                lineHeight: 1.5,
              }}
            >
              Các thành viên nhận được chỗ ngồi ưu đãi.
            </p>
          </div>
          <button
            type="button"
            style={{
              padding: '10px 14px',
              background: 'var(--v-brand)',
              color: '#fff',
              border: 'none',
              boxShadow:
                '0 3px 0 rgba(20,40,80,.18), 0 4px 10px color-mix(in srgb, var(--v-brand) 33%, transparent)',
              borderRadius: 12,
              fontFamily: 'var(--v-font-head)',
              fontWeight: 1000,
              fontSize: 12,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            <Icon name="plus" size={13} stroke="#fff" strokeWidth={3} /> Lưu vào bộ từ
          </button>
        </div>

        {/* Recent */}
        <div>
          <div
            style={{
              fontFamily: 'var(--v-font-body)',
              fontSize: 11,
              fontWeight: 900,
              color: 'var(--v-ink-soft)',
              marginBottom: 8,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span>Tra gần đây</span>
            <a
              href="#"
              style={{
                color: 'var(--v-brand)',
                fontSize: 11,
                textDecoration: 'none',
                fontWeight: 800,
              }}
            >
              Xoá lịch sử
            </a>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {RECENT.map((w) => (
              <button
                key={w.word}
                type="button"
                style={{
                  background: '#fff',
                  border: '1px solid var(--v-border)',
                  boxShadow: 'var(--v-shadow-sm)',
                  borderRadius: 11,
                  padding: '9px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span
                      style={{
                        fontFamily: 'var(--v-font-head)',
                        fontSize: 13,
                        fontWeight: 1000,
                        color: 'var(--v-ink)',
                        letterSpacing: '-0.01em',
                      }}
                    >
                      {w.word}
                    </span>
                    <span
                      style={{
                        background: w.col,
                        color: '#fff',
                        borderRadius: 999,
                        padding: '1px 6px',
                        fontFamily: 'var(--v-font-head)',
                        fontWeight: 1000,
                        fontSize: 8,
                        letterSpacing: '0.06em',
                      }}
                    >
                      {w.pos}
                    </span>
                  </div>
                  <div
                    style={{
                      fontFamily: 'var(--v-font-body)',
                      fontSize: 10.5,
                      fontWeight: 700,
                      color: 'var(--v-muted)',
                      marginTop: 1,
                    }}
                  >
                    {w.ipa} · {w.vi}
                  </div>
                </div>
                <Icon name="arrowRight" size={14} stroke="var(--v-muted)" strokeWidth={2.4} />
              </button>
            ))}
          </div>
        </div>
      </div>
    </MAppShell>
  );
}
