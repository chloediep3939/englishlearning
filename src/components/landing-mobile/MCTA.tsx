'use client';

import Image from 'next/image';
import Link from 'next/link';
import Sparkles from '../landing/shared/Sparkles';
import Icon from '../landing/shared/Icon';

// Final CTA — gradient block with bun-celebrate mascot. README §3.10.

export default function MCTA() {
  return (
    <section style={{ padding: '32px 20px 48px' }}>
      <div
        style={{
          position: 'relative',
          borderRadius: 24,
          padding: '32px 22px 26px',
          textAlign: 'center',
          background: 'linear-gradient(135deg, var(--v-brand) 0%, var(--v-brand-dark) 100%)',
          boxShadow: '0 6px 0 rgba(20,40,80,.2), 0 14px 28px color-mix(in srgb, var(--v-brand) 33%, transparent)',
          overflow: 'hidden',
        }}
      >
        <Sparkles
          items={[
            [30, 30, 8, '#fff', 0],
            [330, 50, 10, '#fff', 0.5],
            [40, 320, 9, '#fff', 1],
            [320, 340, 8, '#fff', 1.5],
          ]}
        />
        {/* Mascot */}
        <div style={{ position: 'relative', display: 'inline-block', width: 140, height: 140, marginBottom: 12 }}>
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(255,255,255,.45) 0%, transparent 65%)',
              animation: 'v-sparkle 3s ease-in-out infinite',
            }}
          />
          <Image
            src="/mascot/bun-celebrate.png"
            alt=""
            width={140}
            height={140}
            aria-hidden="true"
            style={{
              position: 'relative',
              animation: 'v-ngoc-bob 2.2s ease-in-out infinite',
              filter: 'drop-shadow(0 8px 18px rgba(20,40,80,.3))',
            }}
          />
        </div>

        <h2
          style={{
            fontFamily: 'var(--v-font-head)',
            fontSize: 32,
            fontWeight: 1000,
            color: '#fff',
            margin: '0 0 8px',
            letterSpacing: '-0.025em',
            lineHeight: 1.05,
            textShadow: '0 2px 0 rgba(20,40,80,.22)',
          }}
        >
          Sẵn sàng{' '}
          <span
            style={{
              fontStyle: 'italic',
              fontFamily: '"Lora", serif',
              fontWeight: 600,
            }}
          >
            bắt đầu
          </span>{' '}
          chưa?
        </h2>
        <p
          style={{
            fontFamily: 'var(--v-font-body)',
            fontSize: 14,
            fontWeight: 700,
            color: '#fff',
            opacity: 0.92,
            margin: '0 0 18px',
            lineHeight: 1.4,
          }}
        >
          Tạo deck đầu tiên trong <b style={{ color: '#fff' }}>30 giây</b>.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginInline: 'auto', maxWidth: 320 }}>
          <Link
            href="/login"
            style={{
              position: 'relative',
              padding: '14px 22px',
              background: '#fff',
              color: 'var(--v-brand)',
              borderRadius: 14,
              fontFamily: 'var(--v-font-head)',
              fontWeight: 1000,
              fontSize: 15,
              letterSpacing: '0.02em',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 7,
              boxShadow: '0 4px 0 rgba(20,40,80,.18)',
              textDecoration: 'none',
            }}
          >
            <span
              aria-hidden="true"
              style={{
                position: 'absolute',
                inset: -3,
                borderRadius: 17,
                animation: 'v-bun-pulse-ring 2s ease-out infinite',
                pointerEvents: 'none',
              }}
            />
            Vào học miễn phí <Icon name="arrowRight" size={16} stroke="var(--v-brand)" strokeWidth={3} />
          </Link>
          <a
            href="#workflow"
            style={{
              padding: '13px 22px',
              background: 'rgba(255,255,255,.18)',
              color: '#fff',
              border: '1.5px solid rgba(255,255,255,.4)',
              borderRadius: 14,
              fontFamily: 'var(--v-font-head)',
              fontWeight: 900,
              fontSize: 14,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 7,
              textDecoration: 'none',
            }}
          >
            <Icon name="play" size={12} fill="#fff" stroke="#fff" /> Xem demo trước
          </a>
        </div>
        <div
          style={{
            marginTop: 14,
            fontFamily: 'var(--v-font-body)',
            fontSize: 10,
            fontWeight: 700,
            color: 'rgba(255,255,255,.85)',
            letterSpacing: '0.06em',
          }}
        >
          Không cần thẻ · Tiếng Việt · Export Anki
        </div>
      </div>
    </section>
  );
}
