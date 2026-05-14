'use client';

// Persistent banner shown above <main> whenever the logged-in user has
// is_demo = true. Two jobs:
//   1. Remind the user this is a trial account (data wipes in ~24h).
//   2. Provide a one-click path to "real" signup via Google OAuth.
//
// The countdown text re-renders every minute so the user sees it tick from
// hours → minutes as expiry approaches.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Sparkles, X } from 'lucide-react';

interface Props {
  expiresAtSec: number;  // unix seconds, from User.demo_expires_at
}

const DISMISS_KEY = 'demo_banner_dismissed';  // session-scoped: clears on tab close

function formatTimeLeft(expiresAtSec: number): string {
  const nowSec = Math.floor(Date.now() / 1000);
  const left = expiresAtSec - nowSec;
  if (left <= 0) return 'sắp hết hạn';
  const minutes = Math.floor(left / 60);
  if (minutes < 60) return `khoảng ${minutes} phút`;
  const hours = Math.round(minutes / 60);
  return `${hours} giờ`;
}

export default function DemoBanner({ expiresAtSec }: Props) {
  const [dismissed, setDismissed] = useState(false);
  // Tick state so the relative-time string refreshes every minute.
  const [, setTick] = useState(0);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(DISMISS_KEY);
      if (raw === '1') setDismissed(true);
    } catch {
      /* sessionStorage may throw in some sandboxes — ignore */
    }
  }, []);

  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  if (dismissed) return null;

  return (
    <div
      role="status"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 20px',
        background: 'var(--v-orange-soft)',
        borderBottom: '1px solid var(--v-orange)',
        color: 'var(--v-ink)',
        fontFamily: 'var(--v-font-body)',
        fontSize: 'var(--v-text-sm)',
        fontWeight: 600,
      }}
    >
      <Sparkles size={16} color="var(--v-orange)" />
      <div style={{ flex: 1, minWidth: 0 }}>
        Bạn đang dùng tài khoản trải nghiệm. Data sẽ tự xoá sau{' '}
        <strong style={{ color: 'var(--v-orange)' }}>{formatTimeLeft(expiresAtSec)}</strong>.
      </div>
      <Link
        href="/api/auth/google"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          padding: '6px 12px',
          background: 'var(--v-primary)',
          color: '#fff',
          borderRadius: 'var(--v-radius-sm)',
          fontFamily: 'var(--v-font-head)',
          fontSize: 'var(--v-text-xs)',
          fontWeight: 800,
          textDecoration: 'none',
          boxShadow: 'var(--v-shadow-sm)',
          whiteSpace: 'nowrap',
        }}
      >
        Đăng ký bằng Google
      </Link>
      <button
        type="button"
        onClick={() => {
          setDismissed(true);
          try {
            sessionStorage.setItem(DISMISS_KEY, '1');
          } catch {
            /* ignore */
          }
        }}
        aria-label="Đóng banner"
        title="Đóng (sẽ hiện lại sau khi đóng tab)"
        style={{
          background: 'transparent',
          border: 'none',
          color: 'var(--v-ink-soft)',
          padding: 4,
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <X size={16} />
      </button>
    </div>
  );
}
