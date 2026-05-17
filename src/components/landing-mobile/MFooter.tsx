'use client';

import Image from 'next/image';
import Link from 'next/link';

// Mobile footer. README §3.11.

export default function MFooter() {
  return (
    <footer
      style={{
        padding: '24px 20px 28px',
        background: '#fff',
        borderTop: '1px solid var(--v-border)',
      }}
    >
      {/* Top: logo + tagline */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <Image src="/mascot/ngoc-idle.png" alt="" width={32} height={32} aria-hidden="true" />
        <div
          style={{
            fontFamily: 'var(--v-font-head)',
            fontWeight: 900,
            fontSize: 20,
            color: 'var(--v-ink)',
            letterSpacing: '-0.02em',
          }}
        >
          Bún
        </div>
      </div>
      <p
        style={{
          fontFamily: 'var(--v-font-body)',
          fontSize: 12,
          fontWeight: 600,
          color: 'var(--v-ink-soft)',
          margin: '0 0 16px',
          lineHeight: 1.45,
        }}
      >
        App học tiếng Anh kiểu Việt. AI lo phần thô, bạn lo phần học.
      </p>

      {/* 2-col link grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div>
          <div
            style={{
              fontFamily: 'var(--v-font-body)',
              fontSize: 9.5,
              fontWeight: 900,
              color: 'var(--v-muted)',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              marginBottom: 8,
            }}
          >
            Sản phẩm
          </div>
          {['Tính năng', 'Workflow', 'Roadmap'].map((label) => (
            <a
              key={label}
              href={`#${label.replace(/\s+/g, '-').toLowerCase()}`}
              style={{
                display: 'block',
                padding: '5px 0',
                fontFamily: 'var(--v-font-body)',
                fontSize: 12,
                fontWeight: 700,
                color: 'var(--v-ink)',
                textDecoration: 'none',
              }}
            >
              {label}
            </a>
          ))}
        </div>
        <div>
          <div
            style={{
              fontFamily: 'var(--v-font-body)',
              fontSize: 9.5,
              fontWeight: 900,
              color: 'var(--v-muted)',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              marginBottom: 8,
            }}
          >
            Liên hệ
          </div>
          {[
            { label: 'chao@bun.app', href: 'mailto:chao@bun.app' },
            { label: 'GitHub', href: '#' },
            { label: 'X · Threads', href: '#' },
          ].map((l) => (
            <a
              key={l.label}
              href={l.href}
              style={{
                display: 'block',
                padding: '5px 0',
                fontFamily: 'var(--v-font-body)',
                fontSize: 12,
                fontWeight: 700,
                color: 'var(--v-ink)',
                textDecoration: 'none',
              }}
            >
              {l.label}
            </a>
          ))}
        </div>
      </div>

      {/* Bottom row */}
      <div
        style={{
          borderTop: '1px solid var(--v-border)',
          paddingTop: 14,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          flexWrap: 'wrap',
        }}
      >
        <div
          style={{
            fontFamily: 'var(--v-font-mono)',
            fontSize: 9.5,
            fontWeight: 600,
            color: 'var(--v-muted)',
          }}
        >
          © 2026 · with ♥ by Chloe
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {['Privacy', 'Terms', 'v0.4'].map((t) => (
            <Link
              key={t}
              href="#"
              style={{
                fontFamily: 'var(--v-font-mono)',
                fontSize: 9.5,
                fontWeight: 600,
                color: 'var(--v-muted)',
                textDecoration: 'none',
              }}
            >
              {t}
            </Link>
          ))}
        </div>
      </div>
    </footer>
  );
}
