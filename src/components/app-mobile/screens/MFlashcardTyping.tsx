'use client';

import { useState } from 'react';
import MAppShell from '../_shell/MAppShell';
import MStatPill from '../_shell/MStatPill';
import Icon from '@/components/landing/shared/Icon';
import Sparkles from '@/components/landing/shared/Sparkles';

// Mobile flashcard typing screen. README §3 Screen 2.
// Presentational shell — wire to the real flashcard session in the route.

export default function MFlashcardTyping() {
  const [answer, setAnswer] = useState('prefer');
  return (
    <MAppShell active="review">
      <div
        style={{
          padding: '8px 18px 18px',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          minHeight: 'calc(100vh - 36px - 70px)',
          boxSizing: 'border-box',
        }}
      >
        {/* Top progress */}
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
          <div
            style={{
              flex: 1,
              height: 12,
              background: '#fff',
              border: '1px solid var(--v-border)',
              borderRadius: 999,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: '26%',
                height: '100%',
                background: 'linear-gradient(90deg, var(--v-brand), #6cc4ed)',
                borderRadius: 999,
                position: 'relative',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: 2,
                  left: 4,
                  right: 4,
                  height: 3,
                  background: 'rgba(255,255,255,.45)',
                  borderRadius: 999,
                }}
              />
            </div>
          </div>
          <span style={{ fontFamily: 'var(--v-font-body)', fontSize: 11, fontWeight: 900, color: 'var(--v-ink-soft)', flexShrink: 0 }}>
            12/46
          </span>
          <MStatPill icon="heart" value={5} color="var(--v-red)" fill="var(--v-red)" />
        </div>

        {/* Center stage */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 18,
            position: 'relative',
          }}
        >
          <Sparkles
            items={[
              [40, 40, 7, 'var(--v-yellow)', 0],
              [330, 50, 8, 'var(--v-pink)', 0.5],
              [60, 280, 6, 'var(--v-brand)', 1.1],
            ]}
          />

          {/* Polaroid */}
          <div
            style={{
              background: '#fff',
              padding: 6,
              borderRadius: 10,
              boxShadow: '0 6px 14px rgba(40,30,15,.1)',
              transform: 'rotate(-1.5deg)',
            }}
          >
            <div style={{ width: 200, height: 100, background: 'var(--v-accent-soft)', borderRadius: 6, overflow: 'hidden' }}>
              <svg width="100%" height="100%" viewBox="0 0 200 100" preserveAspectRatio="xMidYMid slice">
                <rect width="200" height="100" fill="var(--v-accent-soft)" />
                <rect x="55" y="34" width="90" height="32" rx="5" fill="#fff" stroke="rgba(40,30,15,.12)" strokeWidth="1.5" />
                <circle cx="75" cy="50" r="7" fill="var(--v-blue)" />
                <rect x="90" y="44" width="38" height="3" rx="1" fill="var(--v-ink)" />
                <rect x="90" y="54" width="28" height="2.5" rx="1" fill="var(--v-ink-soft)" opacity="0.5" />
              </svg>
            </div>
          </div>

          {/* Speech bubble prompt */}
          <div
            style={{
              background: 'var(--v-brand-soft)',
              color: 'var(--v-ink)',
              padding: '14px 22px',
              borderRadius: 22,
              border: '1px solid color-mix(in srgb, var(--v-brand) 19%, transparent)',
              boxShadow:
                '0 3px 0 color-mix(in srgb, var(--v-brand) 15%, transparent), 0 5px 14px color-mix(in srgb, var(--v-brand) 9%, transparent)',
              textAlign: 'center',
              position: 'relative',
              maxWidth: 320,
            }}
          >
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
              <Icon name="sparkle" size={11} stroke="var(--v-brand)" fill="var(--v-brand)" strokeWidth={2.4} />
              <span
                style={{
                  fontFamily: 'var(--v-font-body)',
                  fontSize: 9,
                  fontWeight: 900,
                  color: 'var(--v-brand)',
                  letterSpacing: '0.16em',
                  textTransform: 'uppercase',
                }}
              >
                Hãy dịch
              </span>
              <Icon name="sparkle" size={11} stroke="var(--v-brand)" fill="var(--v-brand)" strokeWidth={2.4} />
            </div>
            <div
              style={{
                fontFamily: 'var(--v-font-head)',
                fontSize: 19,
                fontWeight: 1000,
                color: 'var(--v-ink)',
                letterSpacing: '-0.01em',
                lineHeight: 1.25,
              }}
            >
              &quot;Ưu đãi, dành sự ưu tiên.&quot;
            </div>
            <div
              aria-hidden="true"
              style={{
                position: 'absolute',
                bottom: -8,
                left: '50%',
                transform: 'translateX(-50%) rotate(45deg)',
                width: 16,
                height: 16,
                background: 'var(--v-brand-soft)',
                borderBottom: '1px solid color-mix(in srgb, var(--v-brand) 19%, transparent)',
                borderRight: '1px solid color-mix(in srgb, var(--v-brand) 19%, transparent)',
                borderRadius: '0 0 6px 0',
              }}
            />
          </div>

          {/* Input + button */}
          <div style={{ width: '100%' }}>
            <input
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Gõ tiếng Anh…"
              style={{
                width: '100%',
                padding: '15px 18px',
                fontSize: 18,
                fontFamily: 'var(--v-font-head)',
                fontWeight: 1000,
                background: '#fff',
                border: '2px solid var(--v-brand)',
                borderRadius: 14,
                boxShadow:
                  '0 3px 0 color-mix(in srgb, var(--v-brand) 19%, transparent), 0 5px 12px color-mix(in srgb, var(--v-brand) 13%, transparent)',
                color: 'var(--v-ink)',
                outline: 'none',
                letterSpacing: '0.02em',
                textAlign: 'center',
                boxSizing: 'border-box',
              }}
            />
            <button
              type="button"
              style={{
                width: '100%',
                marginTop: 12,
                padding: '14px 24px',
                background: 'var(--v-brand)',
                color: '#fff',
                border: 'none',
                boxShadow:
                  '0 4px 0 rgba(20,40,80,.18), 0 6px 14px color-mix(in srgb, var(--v-brand) 33%, transparent)',
                borderRadius: 14,
                fontFamily: 'var(--v-font-head)',
                fontWeight: 1000,
                fontSize: 13,
                letterSpacing: '0.04em',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 7,
              }}
            >
              KIỂM TRA <Icon name="arrowRight" size={15} stroke="#fff" strokeWidth={3} />
            </button>
            <div
              style={{
                marginTop: 10,
                textAlign: 'center',
                fontFamily: 'var(--v-font-body)',
                fontSize: 11,
                fontWeight: 700,
                color: 'var(--v-muted)',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: 5,
              }}
            >
              <Icon name="heart" size={12} fill="var(--v-red)" stroke="var(--v-red)" /> Không nhớ? Đoán đi — sai không sao
            </div>
          </div>
        </div>
      </div>
    </MAppShell>
  );
}
