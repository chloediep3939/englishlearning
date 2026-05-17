'use client';

import type { ReactNode } from 'react';
import MStatusBar from './MStatusBar';
import MTabBar, { type TabKey } from './MTabBar';

// Generic mobile app shell: status bar + scrollable main + sticky tab bar.
// README §3 "Shared chrome".

interface Props {
  active: TabKey;
  children: ReactNode;
  statusDark?: boolean;
  /** Hide the status bar in PWA / installed mode where the device chrome
   * handles it. Defaults to showing — design mock-style. */
  showStatusBar?: boolean;
}

export default function MAppShell({ active, children, statusDark = false, showStatusBar = true }: Props) {
  return (
    <div
      style={{
        width: '100%',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--v-bg)',
        fontFamily: 'var(--v-font-body)',
        color: 'var(--v-ink)',
      }}
    >
      {showStatusBar && <MStatusBar dark={statusDark} />}
      <main style={{ flex: 1 }}>{children}</main>
      <MTabBar active={active} />
    </div>
  );
}
