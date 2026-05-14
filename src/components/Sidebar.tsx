'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  LayoutGrid, Plus, BookOpen, RotateCcw, Zap, FileText,
  Library, Folder, BarChart3, Settings, Mic, PenLine, BookOpenText, Newspaper,
} from 'lucide-react';
import Mascot from './Mascot';
import LogoutButton from './LogoutButton';

interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutGrid;
  color: string;
}

const NAV: NavItem[] = [
  { href: '/',           label: 'Tổng quan',       icon: LayoutGrid, color: 'var(--v-primary)' },
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
  { href: '/decks',      label: 'Bộ từ',           icon: Folder,     color: 'var(--v-pink)' },
  { href: '/stats',      label: 'Thống kê',        icon: BarChart3,  color: 'var(--v-teal)' },
  { href: '/settings',   label: 'Cài đặt',         icon: Settings,   color: 'var(--v-muted)' },
];

interface Props {
  userEmail?: string;
  userName?: string | null;
  userPicture?: string | null;
}

export default function Sidebar({ userEmail, userName, userPicture }: Props) {
  const pathname = usePathname();

  return (
    <aside
      style={{
        width: 196,
        flexShrink: 0,
        padding: '18px 12px',
        background: 'var(--v-panel)',
        borderRight: '1px solid var(--v-border)',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        height: '100vh',
        position: 'sticky',
        top: 0,
      }}
    >
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
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '8px 10px',
                borderRadius: 11,
                background: active ? 'var(--v-surface)' : 'transparent',
                boxShadow: active ? 'var(--v-shadow-sm)' : 'none',
                color: 'var(--v-ink)',
                fontFamily: 'var(--v-font-body)',
                fontWeight: active ? 800 : 700,
                fontSize: 13,
                transition: 'background 120ms var(--v-ease)',
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
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Sleeping mascot footer — pushed to bottom by marginTop: auto. */}
      <div
        style={{
          marginTop: 'auto',
          padding: '0 10px',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          opacity: 0.9,
        }}
      >
        <Mascot pose="sleep" size={34} />
        <div
          style={{
            fontFamily: 'var(--v-font-body)',
            fontSize: 10,
            fontWeight: 700,
            color: 'var(--v-muted)',
            lineHeight: 1.35,
          }}
        >
          Mình ngủ trưa<br />tí xíu rồi học tiếp
        </div>
      </div>

      {/* User info + logout (project-only — not in design). */}
      {userEmail && (
        <div
          style={{
            marginTop: 12,
            padding: 10,
            background: 'var(--v-surface)',
            border: '1px solid var(--v-border)',
            borderRadius: 'var(--v-radius-md)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
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
              }}
            >
              {(userName ?? userEmail).charAt(0).toUpperCase()}
            </div>
          )}
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
        </div>
      )}
      <div style={{ marginTop: 6 }}>
        <LogoutButton />
      </div>
    </aside>
  );
}
