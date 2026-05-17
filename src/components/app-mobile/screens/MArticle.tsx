'use client';

import type { ReactNode } from 'react';
import MAppShell from '../_shell/MAppShell';
import Icon from '@/components/landing/shared/Icon';

// Mobile article reader. README §3 Screen 9.

function Word({ children, color = 'var(--v-brand)' }: { children: ReactNode; color?: string }) {
  return (
    <span
      style={{
        cursor: 'pointer',
        background: `color-mix(in srgb, ${color} 19%, transparent)`,
        borderBottom: `2px solid ${color}`,
        padding: '0 2px',
        borderRadius: 3,
        color,
        fontWeight: 800,
      }}
    >
      {children}
    </span>
  );
}

export default function MArticle() {
  return (
    <MAppShell active="review">
      <div style={{ padding: '8px 18px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
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
          <div style={{ flex: 1, minWidth: 0 }}>
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
              Bài đọc
            </div>
            <div
              style={{
                fontFamily: 'var(--v-font-head)',
                fontSize: 13,
                fontWeight: 1000,
                color: 'var(--v-ink)',
                marginTop: 1,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              How serendipity shapes science
            </div>
          </div>
          <div
            style={{
              background: 'var(--v-orange)',
              color: '#fff',
              borderRadius: 8,
              padding: '4px 9px',
              fontFamily: 'var(--v-font-head)',
              fontWeight: 1000,
              fontSize: 11,
              letterSpacing: '0.04em',
              boxShadow: '0 2px 4px rgba(255,154,60,.4)',
            }}
          >
            B2
          </div>
        </div>

        {/* Karaoke toolbar */}
        <div
          style={{
            background: 'var(--v-panel)',
            border: '1px solid var(--v-border)',
            borderRadius: 12,
            padding: '8px 10px',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <button
            type="button"
            aria-label="Phát/dừng"
            style={{
              width: 30,
              height: 30,
              borderRadius: 9,
              background: 'var(--v-brand)',
              color: '#fff',
              border: 'none',
              boxShadow: '0 2px 0 rgba(20,40,80,.15)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Icon name="play" size={12} fill="#fff" stroke="#fff" />
          </button>
          <div
            style={{
              flex: 1,
              height: 5,
              background: '#fff',
              border: '1px solid var(--v-border)',
              borderRadius: 999,
              overflow: 'hidden',
            }}
          >
            <div style={{ width: '35%', height: '100%', background: 'var(--v-brand)', borderRadius: 999 }} />
          </div>
          <span style={{ fontFamily: 'var(--v-font-mono)', fontSize: 10, fontWeight: 700, color: 'var(--v-ink-soft)', flexShrink: 0 }}>
            1.0×
          </span>
          <button
            type="button"
            aria-label="Bật tai nghe"
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', flexShrink: 0 }}
          >
            <Icon name="headphones" size={16} stroke="var(--v-ink-soft)" strokeWidth={2.2} />
          </button>
        </div>

        {/* Article body */}
        <article
          style={{
            fontFamily: '"Lora", serif',
            fontSize: 15,
            fontWeight: 400,
            color: 'var(--v-ink)',
            lineHeight: 1.6,
          }}
        >
          <p style={{ margin: '0 0 12px' }}>
            Many of the most important scientific discoveries owe a debt to <Word color="var(--v-purple)">serendipity</Word>. From
            penicillin to the microwave, history is full of <Word color="var(--v-orange)">fortuitous</Word> moments that altered
            the course of human progress.
          </p>
          <p
            style={{
              margin: '0 0 12px',
              background: 'color-mix(in srgb, var(--v-brand) 8%, transparent)',
              padding: '4px 6px',
              borderRadius: 4,
            }}
          >
            But <Word color="var(--v-brand)">chance favours</Word> the prepared mind. Researchers who recognize unexpected
            patterns are the ones who turn lucky accidents into <Word color="var(--v-pink)">breakthroughs</Word>.
          </p>
          <p style={{ margin: 0 }}>
            This <Word color="var(--v-teal)">nuanced</Word> view of discovery challenges the lone-genius myth.
          </p>
        </article>

        {/* Active word popup */}
        <div
          style={{
            background: '#fff',
            border: '1.5px solid color-mix(in srgb, var(--v-purple) 25%, transparent)',
            borderRadius: 14,
            boxShadow:
              '0 8px 18px color-mix(in srgb, var(--v-purple) 15%, transparent), 0 3px 0 color-mix(in srgb, var(--v-purple) 13%, transparent)',
            padding: '14px 16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
            <span
              style={{
                fontFamily: 'var(--v-font-head)',
                fontSize: 20,
                fontWeight: 1000,
                color: 'var(--v-ink)',
                letterSpacing: '-0.02em',
              }}
            >
              serendipity
            </span>
            <span
              style={{
                background: 'var(--v-purple)',
                color: '#fff',
                borderRadius: 999,
                padding: '2px 7px',
                fontFamily: 'var(--v-font-head)',
                fontWeight: 1000,
                fontSize: 8,
                letterSpacing: '0.08em',
              }}
            >
              NOUN
            </span>
            <span style={{ fontFamily: 'var(--v-font-mono)', fontSize: 11, color: 'var(--v-purple)', fontWeight: 700 }}>
              /ˌserənˈdɪpəti/
            </span>
            <button
              type="button"
              aria-label="Nghe phát âm"
              style={{
                marginLeft: 'auto',
                width: 26,
                height: 26,
                background: 'var(--v-purple)',
                border: 'none',
                borderRadius: 8,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 4px color-mix(in srgb, var(--v-purple) 33%, transparent)',
              }}
            >
              <Icon name="play" size={11} fill="#fff" stroke="#fff" />
            </button>
          </div>
          <div style={{ fontFamily: 'var(--v-font-head)', fontSize: 13, fontWeight: 800, color: 'var(--v-ink)', marginTop: 6 }}>
            May mắn tình cờ, sự ngẫu nhiên thú vị
          </div>
          <div style={{ marginTop: 10, display: 'flex', gap: 6 }}>
            <button
              type="button"
              style={{
                flex: 1,
                padding: '9px 12px',
                background: 'var(--v-purple)',
                color: '#fff',
                border: 'none',
                boxShadow:
                  '0 3px 0 rgba(60,30,80,.18), 0 4px 10px color-mix(in srgb, var(--v-purple) 33%, transparent)',
                borderRadius: 11,
                fontFamily: 'var(--v-font-head)',
                fontWeight: 1000,
                fontSize: 11,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 5,
              }}
            >
              <Icon name="plus" size={12} stroke="#fff" strokeWidth={3} /> Lưu vào bộ
            </button>
            <button
              type="button"
              style={{
                flex: 1,
                padding: '9px 12px',
                background: '#fff',
                color: 'var(--v-ink)',
                border: '1px solid var(--v-border)',
                boxShadow: 'var(--v-shadow-sm)',
                borderRadius: 11,
                fontFamily: 'var(--v-font-head)',
                fontWeight: 900,
                fontSize: 11,
                cursor: 'pointer',
              }}
            >
              Xem chi tiết
            </button>
          </div>
        </div>

        {/* Stats footer */}
        <div style={{ display: 'flex', gap: 8 }}>
          {[
            { value: '5',   label: 'từ lạ',  color: 'var(--v-brand)'   },
            { value: 'B2',  label: 'cấp độ', color: 'var(--v-orange)'  },
            { value: '3:12', label: 'nghe',  color: 'var(--v-primary)' },
          ].map((s) => (
            <div
              key={s.label}
              style={{
                flex: 1,
                background: '#fff',
                border: '1px solid var(--v-border)',
                borderRadius: 11,
                padding: '8px 10px',
                textAlign: 'center',
              }}
            >
              <div style={{ fontFamily: 'var(--v-font-head)', fontSize: 18, fontWeight: 1000, color: s.color, lineHeight: 1 }}>
                {s.value}
              </div>
              <div style={{ fontFamily: 'var(--v-font-body)', fontSize: 9.5, fontWeight: 700, color: 'var(--v-muted)', marginTop: 2 }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </MAppShell>
  );
}
