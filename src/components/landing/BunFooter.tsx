'use client';

// Personal-project footer. Two columns on a 1180px max-width grid: branding
// on the left, a "side project" callout on the right that carries the honest
// positioning ("mình viết cho mình, share cho ai cùng chí hướng, hiện chưa
// thu phí"). Compact mono copyright underneath. No fake nav columns; no
// contact links until the user has real public channels to share.

import Link from 'next/link';

export default function BunFooter() {
  return (
    <footer
      style={{
        padding: '60px 48px 28px',
        borderTop: '1px solid var(--v-border)',
        background: 'var(--v-surface)',
      }}
    >
      <div
        style={{
          maxWidth: '100%',
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 48,
          alignItems: 'start',
        }}
      >
        {/* Left — branding */}
        <div>
          <Link
            href="/"
            className="bun-logo-wrap"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 10,
              textDecoration: 'none',
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/mascot/ngoc-idle.png"
              width={42}
              height={42}
              alt=""
              aria-hidden="true"
              style={{ display: 'block', filter: 'drop-shadow(0 2px 4px rgba(40,30,15,.15))' }}
            />
            <span
              style={{
                fontFamily: 'var(--v-font-head)',
                fontWeight: 900,
                fontSize: 26,
                color: 'var(--v-ink)',
                letterSpacing: '-0.03em',
                lineHeight: 1,
              }}
            >
              Bún
            </span>
          </Link>
          <p
            style={{
              fontFamily: 'var(--v-font-body)',
              fontSize: 14,
              fontWeight: 600,
              color: 'var(--v-ink-soft)',
              lineHeight: 1.6,
              margin: '14px 0 0',
              maxWidth: 380,
            }}
          >
            App học tiếng Anh cho người Việt. Pick &amp; mix 8 modality, AI lo phần khô khan, Bún làm bạn đồng hành.
          </p>
        </div>

        {/* Right — side-project callout. Carries the honest positioning that
            the prompt called out: personal project, share for fun, no paid
            plan today, will announce if/when that changes. */}
        <aside
          style={{
            background: 'var(--v-brand-soft)',
            border: '1px solid color-mix(in srgb, var(--v-brand) 30%, transparent)',
            borderRadius: 18,
            padding: '20px 22px',
            boxShadow: '0 3px 0 color-mix(in srgb, var(--v-brand) 12%, transparent)',
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '3px 10px',
              background: 'color-mix(in srgb, var(--v-brand) 16%, transparent)',
              color: 'var(--v-brand)',
              borderRadius: 999,
              fontFamily: 'var(--v-font-body)',
              fontSize: 11,
              fontWeight: 900,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              marginBottom: 10,
            }}
          >
            ✦ Side project
          </div>
          <h4
            style={{
              fontFamily: 'var(--v-font-head)',
              fontWeight: 1000,
              fontSize: 17,
              color: 'var(--v-ink)',
              margin: '0 0 8px',
              letterSpacing: '-0.01em',
              lineHeight: 1.2,
            }}
          >
            Bún là dự án cá nhân
          </h4>
          <p
            style={{
              fontFamily: 'var(--v-font-body)',
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--v-ink-soft)',
              margin: 0,
              lineHeight: 1.6,
            }}
          >
            Đây là phần mềm mình học và viết cho chính mình, rồi share cho mọi người cùng chí hướng.{' '}
            <b style={{ color: 'var(--v-ink)' }}>Hiện chưa có plan tính phí nào</b> — khi nào có thay đổi, mình sẽ
            thông báo trước nha.
          </p>
        </aside>
      </div>

      {/* Bottom row */}
      <div
        style={{
          maxWidth: '100%',
          margin: '40px auto 0',
          paddingTop: 18,
          borderTop: '1px solid var(--v-border)',
          textAlign: 'center',
          fontFamily: 'var(--v-font-mono)',
          fontSize: 11,
          fontWeight: 700,
          color: 'var(--v-muted)',
          letterSpacing: '0.02em',
        }}
      >
        © 2026 Bún · v0.4 beta · made with <span style={{ color: 'var(--v-red)' }}>♥</span> in Việt Nam
      </div>
    </footer>
  );
}
