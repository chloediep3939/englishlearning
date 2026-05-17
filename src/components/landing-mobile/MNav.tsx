'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';

// Mobile sticky top nav with hamburger menu. Burger lines morph to X.
// See README §3.1.

export default function MNav() {
  const [open, setOpen] = useState(false);
  const navLinks = ['Tính năng', 'Workflow', 'Về Bún', 'FAQ'];

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 30,
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        borderBottom: '1px solid var(--v-border)',
      }}
    >
      {/* Logo */}
      <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
        <Image src="/mascot/ngoc-idle.png" alt="" width={32} height={32} aria-hidden="true" />
        <span
          style={{
            fontFamily: 'var(--v-font-head)',
            fontWeight: 900,
            fontSize: 20,
            color: 'var(--v-ink)',
            letterSpacing: '-0.02em',
          }}
        >
          Bún
        </span>
      </Link>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <Link
          href="/login"
          style={{
            padding: '8px 14px',
            background: 'var(--v-brand)',
            color: '#fff',
            border: 'none',
            boxShadow: '0 3px 0 rgba(20,40,80,.18), 0 4px 10px color-mix(in srgb, var(--v-brand) 33%, transparent)',
            borderRadius: 11,
            fontFamily: 'var(--v-font-head)',
            fontWeight: 900,
            fontSize: 12,
            letterSpacing: '0.02em',
            textDecoration: 'none',
          }}
        >
          Vào học
        </Link>
        <button
          type="button"
          aria-label={open ? 'Đóng menu' : 'Mở menu'}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          style={{
            width: 36,
            height: 36,
            background: '#fff',
            border: '1px solid var(--v-border)',
            borderRadius: 11,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 0,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div
              style={{
                width: 14,
                height: 2,
                background: 'var(--v-ink)',
                borderRadius: 1,
                transform: open ? 'rotate(45deg) translateY(4px)' : 'none',
                transition: 'transform .2s ease',
              }}
            />
            <div
              style={{
                width: 14,
                height: 2,
                background: 'var(--v-ink)',
                borderRadius: 1,
                opacity: open ? 0 : 1,
                transition: 'opacity .15s ease',
              }}
            />
            <div
              style={{
                width: 14,
                height: 2,
                background: 'var(--v-ink)',
                borderRadius: 1,
                transform: open ? 'rotate(-45deg) translateY(-4px)' : 'none',
                transition: 'transform .2s ease',
              }}
            />
          </div>
        </button>
      </div>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            background: '#fff',
            borderBottom: '1px solid var(--v-border)',
            boxShadow: '0 8px 18px rgba(40,30,15,.08)',
            padding: '10px 16px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
          }}
        >
          {navLinks.map((label) => (
            <a
              key={label}
              href={`#${label.replace(/\s+/g, '-').toLowerCase()}`}
              onClick={() => setOpen(false)}
              style={{
                padding: '10px 8px',
                fontFamily: 'var(--v-font-body)',
                fontSize: 15,
                fontWeight: 700,
                color: 'var(--v-ink)',
                textDecoration: 'none',
                borderBottom: '1px solid var(--v-border)',
              }}
            >
              {label}
            </a>
          ))}
          <Link
            href="/login"
            onClick={() => setOpen(false)}
            style={{
              padding: '10px 8px',
              fontFamily: 'var(--v-font-body)',
              fontSize: 15,
              fontWeight: 800,
              color: 'var(--v-brand)',
              textDecoration: 'none',
            }}
          >
            Đăng nhập →
          </Link>
        </div>
      )}
    </header>
  );
}
