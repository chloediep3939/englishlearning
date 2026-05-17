'use client';

import { useState } from 'react';
import MAppShell from '../_shell/MAppShell';
import Icon from '@/components/landing/shared/Icon';

// Mobile sentence writing (with timer). README §3 Screen 8.

export default function MSentence() {
  const [text, setText] = useState('Members of the elite club enjoy preferential access to exclusive events.');
  const containsTarget = text.toLowerCase().includes('preferential');
  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;

  return (
    <MAppShell active="review">
      <div style={{ padding: '8px 18px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
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
              Đặt câu
            </div>
            <div style={{ fontFamily: 'var(--v-font-head)', fontSize: 14, fontWeight: 1000, color: 'var(--v-ink)', marginTop: 1 }}>
              Câu 2 / 5
            </div>
          </div>
          {/* Timer ring */}
          <div style={{ position: 'relative', width: 50, height: 50 }}>
            <svg viewBox="0 0 100 100" style={{ position: 'absolute', inset: 0 }}>
              <circle cx="50" cy="50" r="42" fill="none" stroke="var(--v-panel)" strokeWidth="10" />
              <circle
                cx="50"
                cy="50"
                r="42"
                fill="none"
                stroke="var(--v-orange)"
                strokeWidth="10"
                strokeDasharray={`${0.65 * 264} 264`}
                strokeLinecap="round"
                transform="rotate(-90 50 50)"
              />
            </svg>
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'var(--v-font-mono)',
                fontSize: 13,
                fontWeight: 700,
                color: 'var(--v-ink)',
              }}
            >
              0:39
            </div>
          </div>
        </div>

        {/* Target word card */}
        <div
          style={{
            background: 'var(--v-brand-soft)',
            border: '1.5px solid color-mix(in srgb, var(--v-brand) 25%, transparent)',
            borderRadius: 14,
            padding: '12px 16px',
            textAlign: 'center',
            boxShadow: '0 3px 0 color-mix(in srgb, var(--v-brand) 15%, transparent)',
          }}
        >
          <div
            style={{
              fontFamily: 'var(--v-font-body)',
              fontSize: 9,
              fontWeight: 1000,
              color: 'var(--v-brand)',
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              marginBottom: 3,
            }}
          >
            Viết câu dùng từ
          </div>
          <div
            style={{
              fontFamily: 'var(--v-font-head)',
              fontSize: 26,
              fontWeight: 1000,
              color: 'var(--v-ink)',
              letterSpacing: '-0.02em',
              lineHeight: 1,
            }}
          >
            preferential
          </div>
          <div style={{ fontFamily: 'var(--v-font-body)', fontSize: 11, fontWeight: 700, color: 'var(--v-ink-soft)', marginTop: 4 }}>
            Ưu đãi, dành sự ưu tiên · /ˌprefəˈrenʃəl/
          </div>
        </div>

        {/* Textarea */}
        <div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            style={{
              width: '100%',
              minHeight: 100,
              padding: '13px 14px',
              fontSize: 15,
              fontFamily: 'var(--v-font-head)',
              fontWeight: 700,
              background: '#fff',
              border: '1.5px solid var(--v-border)',
              borderRadius: 14,
              boxShadow: 'var(--v-shadow-sm)',
              color: 'var(--v-ink)',
              outline: 'none',
              resize: 'vertical',
              boxSizing: 'border-box',
              lineHeight: 1.45,
            }}
          />
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: 6,
              fontFamily: 'var(--v-font-body)',
              fontSize: 10.5,
              fontWeight: 700,
              color: 'var(--v-muted)',
            }}
          >
            <span style={{ color: containsTarget ? 'var(--v-primary)' : 'var(--v-red)', fontWeight: 800 }}>
              {containsTarget ? '✓' : '✗'} {containsTarget ? 'Có chứa' : 'Chưa có'} &quot;preferential&quot;
            </span>
            <span>{wordCount} từ</span>
          </div>
        </div>

        {/* AI feedback */}
        <div
          style={{
            background: '#fff',
            border: '1px solid var(--v-border)',
            boxShadow: 'var(--v-shadow-md)',
            borderRadius: 14,
            padding: '12px 14px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
            <div
              style={{
                width: 22,
                height: 22,
                borderRadius: 7,
                background: 'var(--v-purple)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name="sparkle" size={12} stroke="#fff" fill="#fff" />
            </div>
            <div
              style={{
                fontFamily: 'var(--v-font-body)',
                fontSize: 10,
                fontWeight: 1000,
                color: 'var(--v-purple)',
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
              }}
            >
              AI gợi ý nhanh
            </div>
          </div>
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
            Cách dùng <b style={{ color: 'var(--v-ink)' }}>chuẩn ngữ pháp</b>. &quot;enjoy preferential access&quot; là{' '}
            <b style={{ color: 'var(--v-primary)' }}>collocation phổ biến</b> — rất tự nhiên!
          </p>
        </div>

        {/* CTAs */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            style={{
              padding: '13px 16px',
              background: '#fff',
              color: 'var(--v-ink-soft)',
              border: '1px solid var(--v-border)',
              boxShadow: 'var(--v-shadow-sm)',
              borderRadius: 13,
              fontFamily: 'var(--v-font-head)',
              fontWeight: 900,
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            Bỏ qua
          </button>
          <button
            type="button"
            style={{
              flex: 1,
              padding: '13px 16px',
              background: 'var(--v-brand)',
              color: '#fff',
              border: 'none',
              boxShadow:
                '0 4px 0 rgba(20,40,80,.18), 0 6px 14px color-mix(in srgb, var(--v-brand) 33%, transparent)',
              borderRadius: 13,
              fontFamily: 'var(--v-font-head)',
              fontWeight: 1000,
              fontSize: 13,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 7,
              letterSpacing: '0.02em',
            }}
          >
            Nộp cho Bún chấm <Icon name="arrowRight" size={14} stroke="#fff" strokeWidth={3} />
          </button>
        </div>
      </div>
    </MAppShell>
  );
}
