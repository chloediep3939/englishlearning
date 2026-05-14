'use client';

import Link from 'next/link';

// Sticky header at the top of the landing. Translucent blurred bg, four
// in-page anchor links (each section's wrapper exports a matching id), login
// text-link, and a primary CTA. All CTAs link to /login — the project has no
// dedicated /signup route.

const NAV_ITEMS: Array<{ label: string; href: string }> = [
  { label: 'Tính năng', href: '#features' },
  { label: 'Workflow', href: '#workflows' },
  { label: 'Về Bún', href: '#why' },
  { label: 'FAQ', href: '#faq' },
];

export default function BunNav() {
  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 30,
        padding: '14px 48px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'rgba(255,255,255,0.85)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        borderBottom: '1px solid var(--v-border)',
      }}
    >
      <Link href="/" className="bun-logo-wrap" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/mascot/ngoc-idle.png"
          width={36}
          height={36}
          alt=""
          aria-hidden="true"
          style={{ display: 'block', filter: 'drop-shadow(0 2px 4px rgba(40,30,15,.15))' }}
        />
        <span
          style={{
            fontFamily: 'var(--v-font-head)',
            fontWeight: 900,
            fontSize: 22,
            color: 'var(--v-ink)',
            letterSpacing: '-0.03em',
            lineHeight: 1,
          }}
        >
          Bún
        </span>
      </Link>

      <nav style={{ display: 'flex', gap: 28 }}>
        {NAV_ITEMS.map((n) => (
          <a
            key={n.href}
            href={n.href}
            className="bun-nav-link"
            style={{
              fontFamily: 'var(--v-font-body)',
              fontSize: 14,
              fontWeight: 700,
              color: 'var(--v-ink-soft)',
              textDecoration: 'none',
              cursor: 'pointer',
            }}
          >
            {n.label}
          </a>
        ))}
      </nav>

      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <Link
          href="/login"
          className="bun-nav-link"
          style={{
            fontFamily: 'var(--v-font-body)',
            fontSize: 14,
            fontWeight: 800,
            color: 'var(--v-ink)',
            textDecoration: 'none',
            cursor: 'pointer',
          }}
        >
          Đăng nhập
        </Link>
        <Link
          href="/login"
          className="bun-cta-btn"
          style={{
            padding: '10px 18px',
            background: 'var(--v-brand)',
            color: '#fff',
            border: 'none',
            boxShadow: '0 3px 0 rgba(20,40,80,.18), 0 4px 12px rgba(58,169,230,0.33)',
            borderRadius: 13,
            fontFamily: 'var(--v-font-head)',
            fontWeight: 900,
            fontSize: 13,
            letterSpacing: '0.02em',
            cursor: 'pointer',
            textDecoration: 'none',
          }}
        >
          Vào học →
        </Link>
      </div>
    </header>
  );
}
