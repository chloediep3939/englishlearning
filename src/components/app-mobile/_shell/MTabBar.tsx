'use client';

import Link from 'next/link';
import Icon from '@/components/landing/shared/Icon';

// Sticky bottom tab bar with center FAB. README §3 "Shared chrome".
// Pass `active` to highlight the matching tab. Each tab links to the
// corresponding route in this app.

export type TabKey = 'home' | 'review' | 'add' | 'decks' | 'more';

interface TabSpec {
  key: TabKey;
  label: string;
  icon: string;
  color: string;
  href: string;
}

const TABS: ReadonlyArray<TabSpec> = [
  { key: 'home',   label: 'Tổng quan', icon: 'home',     color: 'var(--v-primary)', href: '/dashboard' },
  { key: 'review', label: 'Học',       icon: 'refresh',  color: 'var(--v-blue)',    href: '/study' },
  { key: 'add',    label: 'Thêm',      icon: 'plus',     color: 'var(--v-brand)',   href: '/add' },
  { key: 'decks',  label: 'Bộ từ',     icon: 'folder',   color: 'var(--v-pink)',    href: '/decks' },
  { key: 'more',   label: 'Khác',      icon: 'settings', color: 'var(--v-muted)',   href: '/settings' },
];

interface Props {
  active: TabKey;
}

export default function MTabBar({ active }: Props) {
  return (
    <nav
      style={{
        position: 'sticky',
        bottom: 0,
        zIndex: 30,
        background: '#fff',
        borderTop: '1px solid var(--v-border)',
        padding: '8px 10px calc(14px + env(safe-area-inset-bottom, 0px))',
        display: 'grid',
        gridTemplateColumns: 'repeat(5, 1fr)',
        gap: 4,
        flexShrink: 0,
      }}
    >
      {TABS.map((t) => {
        const on = active === t.key;
        if (t.key === 'add') {
          return (
            <Link
              key={t.key}
              href={t.href}
              aria-current={on ? 'page' : undefined}
              style={{
                padding: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 2,
                textDecoration: 'none',
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 14,
                  background: 'var(--v-brand)',
                  marginTop: -16,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow:
                    '0 4px 0 rgba(20,40,80,.2), 0 6px 14px color-mix(in srgb, var(--v-brand) 40%, transparent)',
                }}
              >
                <Icon name="plus" size={22} stroke="#fff" strokeWidth={3} />
              </div>
              <span
                style={{
                  fontFamily: 'var(--v-font-body)',
                  fontSize: 9.5,
                  fontWeight: 800,
                  color: 'var(--v-brand)',
                }}
              >
                {t.label}
              </span>
            </Link>
          );
        }
        return (
          <Link
            key={t.key}
            href={t.href}
            aria-current={on ? 'page' : undefined}
            style={{
              padding: '4px 0',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
              textDecoration: 'none',
            }}
          >
            <Icon
              name={t.icon}
              size={20}
              stroke={on ? t.color : 'var(--v-muted)'}
              fill="none"
              strokeWidth={on ? 2.6 : 2.2}
            />
            <span
              style={{
                fontFamily: 'var(--v-font-body)',
                fontSize: 10,
                fontWeight: on ? 900 : 700,
                color: on ? t.color : 'var(--v-muted)',
              }}
            >
              {t.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
