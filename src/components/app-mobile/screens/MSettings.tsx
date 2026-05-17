'use client';

import type { ReactNode } from 'react';
import Image from 'next/image';
import MAppShell from '../_shell/MAppShell';
import Icon from '@/components/landing/shared/Icon';

// Mobile settings. README §3 Screen 10.

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <div
        style={{
          fontFamily: 'var(--v-font-body)',
          fontSize: 10,
          fontWeight: 900,
          color: 'var(--v-muted)',
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          marginBottom: 8,
          paddingLeft: 4,
        }}
      >
        {title}
      </div>
      <div
        style={{
          background: '#fff',
          border: '1px solid var(--v-border)',
          boxShadow: 'var(--v-shadow-sm)',
          borderRadius: 14,
          overflow: 'hidden',
        }}
      >
        {children}
      </div>
    </div>
  );
}

interface RowProps {
  icon: string;
  color: string;
  label: string;
  sub?: string;
  value?: string;
  toggle?: boolean;
  last?: boolean;
}

function Row({ icon, color, label, sub, value, toggle, last }: RowProps) {
  return (
    <div
      style={{
        padding: '12px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        borderBottom: last ? 'none' : '1px solid var(--v-border)',
      }}
    >
      <div
        style={{
          width: 30,
          height: 30,
          borderRadius: 9,
          background: color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Icon name={icon} size={14} stroke="#fff" fill="#fff" strokeWidth={2.4} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: 'var(--v-font-head)', fontSize: 13, fontWeight: 900, color: 'var(--v-ink)' }}>{label}</div>
        {sub && (
          <div style={{ fontFamily: 'var(--v-font-body)', fontSize: 10.5, fontWeight: 700, color: 'var(--v-muted)', marginTop: 1 }}>
            {sub}
          </div>
        )}
      </div>
      {toggle !== undefined ? (
        <div
          style={{
            width: 36,
            height: 20,
            borderRadius: 999,
            background: toggle ? 'var(--v-brand)' : 'var(--v-border)',
            position: 'relative',
            flexShrink: 0,
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 2,
              left: toggle ? 18 : 2,
              width: 16,
              height: 16,
              borderRadius: '50%',
              background: '#fff',
              boxShadow: '0 1px 3px rgba(0,0,0,.18)',
              transition: 'left .2s',
            }}
          />
        </div>
      ) : value !== undefined ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
          <span style={{ fontFamily: 'var(--v-font-body)', fontSize: 12, fontWeight: 800, color: 'var(--v-ink-soft)' }}>{value}</span>
          <Icon name="arrowRight" size={14} stroke="var(--v-muted)" strokeWidth={2.4} />
        </div>
      ) : (
        <Icon name="arrowRight" size={14} stroke="var(--v-muted)" strokeWidth={2.4} style={{ flexShrink: 0 }} />
      )}
    </div>
  );
}

export default function MSettings() {
  return (
    <MAppShell active="more">
      <div style={{ padding: '8px 18px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Header */}
        <div>
          <div
            style={{
              fontFamily: 'var(--v-font-body)',
              fontSize: 10,
              fontWeight: 900,
              color: 'var(--v-muted)',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
            }}
          >
            Cá nhân
          </div>
          <h1
            style={{
              fontFamily: 'var(--v-font-head)',
              fontSize: 24,
              fontWeight: 1000,
              lineHeight: 1.0,
              margin: '3px 0 0',
              letterSpacing: '-0.025em',
              color: 'var(--v-ink)',
            }}
          >
            Cài đặt
          </h1>
        </div>

        {/* Profile card */}
        <div
          style={{
            background: '#fff',
            border: '1px solid var(--v-border)',
            boxShadow: 'var(--v-shadow-md)',
            borderRadius: 14,
            padding: '14px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: 'var(--v-brand-soft)',
              border: '2px solid color-mix(in srgb, var(--v-brand) 25%, transparent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              flexShrink: 0,
            }}
          >
            <Image
              src="/mascot/ngoc-happy.png"
              alt=""
              aria-hidden="true"
              width={50}
              height={50}
              style={{ filter: 'drop-shadow(0 2px 4px rgba(40,30,15,.15))' }}
            />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: 'var(--v-font-head)', fontSize: 15, fontWeight: 1000, color: 'var(--v-ink)' }}>Chloe Diep</div>
            <div style={{ fontFamily: 'var(--v-font-body)', fontSize: 11, fontWeight: 700, color: 'var(--v-muted)', marginTop: 1 }}>
              chao@chloediep.com · Free
            </div>
          </div>
          <button
            type="button"
            style={{
              padding: '6px 12px',
              background: 'var(--v-brand-soft)',
              color: 'var(--v-brand)',
              border: '1px solid color-mix(in srgb, var(--v-brand) 25%, transparent)',
              borderRadius: 999,
              fontFamily: 'var(--v-font-head)',
              fontWeight: 900,
              fontSize: 10.5,
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            Pro →
          </button>
        </div>

        <Section title="Học tập">
          <Row icon="target" color="var(--v-brand)"  label="Mục tiêu hằng ngày" value="50 lượt" />
          <Row icon="bell"   color="var(--v-orange)" label="Nhắc nhở học"       sub="08:00 mỗi ngày" toggle={true} />
          <Row icon="flame"  color="var(--v-red)"    label="Streak freeze"      sub="Bảo vệ streak khi lỡ ngày" toggle={false} last />
        </Section>

        <Section title="Âm thanh & ngôn ngữ">
          <Row icon="speaker"    color="var(--v-blue)"   label="Phát âm tự động"   toggle={true} />
          <Row icon="headphones" color="var(--v-teal)"   label="Giọng đọc"         value="US English" />
          <Row icon="library"    color="var(--v-purple)" label="Ngôn ngữ giao diện" value="Tiếng Việt" last />
        </Section>

        <Section title="Dữ liệu">
          <Row icon="folder"   color="var(--v-pink)"    label="Sao lưu"          sub="Tự động · Cloudflare D1" toggle={true} />
          <Row icon="refresh"  color="var(--v-primary)" label="Export sang Anki" />
          <Row icon="settings" color="var(--v-muted)"   label="Quản lý dữ liệu"  last />
        </Section>

        <Section title="Khác">
          <Row icon="quote"   color="var(--v-purple)" label="Về Bún" />
          <Row icon="sparkle" color="var(--v-orange)" label="Đánh giá app" />
          <Row icon="heart"   color="var(--v-red)"    label="Gửi feedback" last />
        </Section>

        <button
          type="button"
          style={{
            padding: '12px 16px',
            background: 'transparent',
            color: 'var(--v-red)',
            border: '1.5px solid color-mix(in srgb, var(--v-red) 25%, transparent)',
            borderRadius: 12,
            fontFamily: 'var(--v-font-head)',
            fontWeight: 900,
            fontSize: 13,
            cursor: 'pointer',
          }}
        >
          Đăng xuất
        </button>

        <div
          style={{
            textAlign: 'center',
            fontFamily: 'var(--v-font-mono)',
            fontSize: 10,
            fontWeight: 600,
            color: 'var(--v-muted)',
            marginTop: -4,
          }}
        >
          Bún v0.4 · Made in Sài Gòn · ♥ Chloe Diep
        </div>
      </div>
    </MAppShell>
  );
}
