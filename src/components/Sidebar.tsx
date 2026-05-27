'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  LayoutGrid, Plus, BookOpen, RotateCcw, Zap, FileText,
  Library, Folder, BarChart3, Settings, Mic, PenLine, BookOpenText, Newspaper,
  PanelLeftClose, PanelLeftOpen,
} from 'lucide-react';
import LogoutButton from './LogoutButton';
import FeedbackWidget from './feedback/feedback-widget';

interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutGrid;
  color: string;
}

const NAV: NavItem[] = [
  { href: '/dashboard',  label: 'Tổng quan',       icon: LayoutGrid, color: 'var(--v-primary)' },
  { href: '/decks',      label: 'Bộ từ',           icon: Folder,     color: 'var(--v-pink)' },
  { href: '/add',        label: 'Thêm từ',         icon: Plus,       color: 'var(--v-accent)' },
  { href: '/study',      label: 'Học hôm nay',     icon: BookOpen,   color: 'var(--v-orange)' },
  { href: '/review',     label: 'Ôn tập',          icon: RotateCcw,  color: 'var(--v-blue)' },
  // Speed tile uses yellow-deep so the white icon stays readable on the pastel
  // yellow used elsewhere; --v-yellow itself is reserved for speed surfaces.
  { href: '/speed',      label: 'Flashcard nhanh', icon: Zap,        color: 'var(--v-yellow-deep)' },
  { href: '/cloze',      label: 'Điền chỗ trống',  icon: FileText,   color: 'var(--v-teal)' },
  { href: '/pronounce',  label: 'Luyện đọc',       icon: Mic,        color: 'var(--v-red)' },
  { href: '/sentence',   label: 'Đặt câu',         icon: PenLine,    color: 'var(--v-orange)' },
  { href: '/compose',    label: 'Viết bài',        icon: BookOpenText, color: 'var(--v-blue)' },
  { href: '/passage',    label: 'Bài đọc',         icon: Newspaper,  color: 'var(--v-teal)' },
  { href: '/dictionary', label: 'Từ điển',         icon: Library,    color: 'var(--v-purple)' },
  { href: '/stats',      label: 'Thống kê',        icon: BarChart3,  color: 'var(--v-teal)' },
  { href: '/settings',   label: 'Cài đặt',         icon: Settings,   color: 'var(--v-muted)' },
];

interface Props {
  userEmail?: string;
  userName?: string | null;
  userPicture?: string | null;
  isDemo?: boolean;
}

const STORAGE_KEY = 'sidebar_collapsed';

export default function Sidebar({ userEmail, userName, userPicture, isDemo = false }: Props) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  // Defer rendering of the avatar/name block until we've read localStorage
  // so SSR + initial paint match — no flash of the wrong width.
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw === '1') setCollapsed(true);
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  function toggle() {
    const next = !collapsed;
    setCollapsed(next);
    try {
      localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
    } catch {
      /* ignore */
    }
  }

  const width = collapsed ? 64 : 196;

  return (
    <aside
      style={{
        width,
        flexShrink: 0,
        padding: collapsed ? '14px 8px' : '18px 12px',
        background: 'var(--v-panel)',
        borderRight: '1px solid var(--v-border)',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        height: '100vh',
        position: 'sticky',
        top: 0,
        transition: 'width 200ms ease, padding 200ms ease',
        overflow: 'hidden',
      }}
    >
      {/* Collapse toggle */}
      <div
        style={{
          display: 'flex',
          justifyContent: collapsed ? 'center' : 'flex-end',
          marginBottom: 4,
        }}
      >
        <button
          type="button"
          onClick={toggle}
          title={collapsed ? 'Mở sidebar' : 'Thu gọn sidebar'}
          aria-label={collapsed ? 'Mở sidebar' : 'Thu gọn sidebar'}
          style={{
            width: 28,
            height: 28,
            padding: 0,
            background: 'transparent',
            border: '1px solid var(--v-border)',
            borderRadius: 8,
            color: 'var(--v-ink-soft)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          {collapsed ? <PanelLeftOpen size={14} /> : <PanelLeftClose size={14} />}
        </button>
      </div>

      {!collapsed && (
        <div
          style={{
            padding: '0 10px 8px',
            fontFamily: 'var(--v-font-body)',
            fontSize: 10,
            fontWeight: 800,
            letterSpacing: 'var(--v-tracking-wider)',
            textTransform: 'uppercase',
            color: 'var(--v-muted)',
          }}
        >
          Module
        </div>
      )}

      <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {NAV.map((item) => {
          const Icon = item.icon;
          const active =
            pathname === item.href ||
            (item.href !== '/' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: collapsed ? 0 : 10,
                justifyContent: collapsed ? 'center' : 'flex-start',
                padding: collapsed ? '8px 0' : '8px 10px',
                borderRadius: 11,
                background: active ? 'var(--v-surface)' : 'transparent',
                boxShadow: active ? 'var(--v-shadow-sm)' : 'none',
                color: 'var(--v-ink)',
                fontFamily: 'var(--v-font-body)',
                fontWeight: active ? 800 : 700,
                fontSize: 13,
                transition: 'background 120ms var(--v-ease)',
                textDecoration: 'none',
              }}
            >
              <div
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 8,
                  background: item.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 1px 2px rgba(40,30,15,0.1)',
                  flexShrink: 0,
                }}
              >
                <Icon size={13} color="#fff" strokeWidth={2.4} />
              </div>
              {!collapsed && item.label}
            </Link>
          );
        })}
      </nav>

      {/* Feedback widget — sits between the module nav and the bottom-anchored
          avatar so it remains visible on every page in both collapsed and
          expanded modes. */}
      {hydrated && userEmail && (
        <div style={{ marginTop: 'auto', marginBottom: 6 }}>
          <FeedbackWidget
            collapsed={collapsed}
            initialEmail={userEmail}
            isDemo={isDemo}
          />
        </div>
      )}

      {/* User info + logout (project-only — not in design). Hydration-guarded so
          SSR doesn't render the expanded version then snap to collapsed. */}
      {hydrated && userEmail && (
        <div
          style={{
            padding: collapsed ? 6 : 10,
            background: 'var(--v-surface)',
            border: '1px solid var(--v-border)',
            borderRadius: 'var(--v-radius-md)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            gap: collapsed ? 0 : 8,
          }}
          title={collapsed ? (userName ?? userEmail) : undefined}
        >
          {userPicture ? (
            <Image
              src={userPicture}
              alt={userName ?? userEmail}
              width={28}
              height={28}
              style={{ borderRadius: '50%' }}
            />
          ) : (
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: 'var(--v-primary)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'var(--v-font-head)',
                fontWeight: 900,
                fontSize: 12,
                flexShrink: 0,
              }}
            >
              {(userName ?? userEmail).charAt(0).toUpperCase()}
            </div>
          )}
          {!collapsed && (
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontFamily: 'var(--v-font-head)',
                  fontSize: 'var(--v-text-sm)',
                  fontWeight: 800,
                  color: 'var(--v-ink)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {userName ?? userEmail.split('@')[0]}
              </div>
            </div>
          )}
        </div>
      )}
      {!collapsed && (
        <div style={{ marginTop: 6 }}>
          <LogoutButton />
        </div>
      )}
    </aside>
  );
}
