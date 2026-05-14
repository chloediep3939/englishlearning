'use client';

import { LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function LogoutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleLogout() {
    if (busy) return;
    setBusy(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={busy}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        width: '100%',
        padding: '8px 12px',
        background: 'transparent',
        border: '1px solid var(--v-border)',
        borderRadius: 'var(--v-radius-md)',
        color: 'var(--v-ink-soft)',
        fontFamily: 'var(--v-font-head)',
        fontWeight: 700,
        fontSize: 'var(--v-text-md)',
        cursor: busy ? 'wait' : 'pointer',
        opacity: busy ? 0.6 : 1,
      }}
    >
      <LogOut size={14} />
      {busy ? 'Đăng xuất...' : 'Đăng xuất'}
    </button>
  );
}
