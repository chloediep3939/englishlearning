'use client';

import { SkipBack, SkipForward, Play, Pause, RefreshCw } from 'lucide-react';
import type { KaraokeEngine } from '@/lib/reading/use-karaoke';
import { BUN_BLUE } from '@/lib/reading/constants';

const sideBtn = {
  width: 46,
  height: 46,
  borderRadius: 13,
  background: 'var(--v-surface)',
  border: '1px solid var(--v-border)',
  boxShadow: 'var(--v-shadow-sm)',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  color: 'var(--v-ink)',
} as const;

/** Prev / play-pause / next, restart, and the sentence progress bar. */
export default function TransportControls({ k }: { k: KaraokeEngine }) {
  const total = k.sentences.length;
  const pct = k.curSent < 0 ? 0 : ((k.curSent + 1) / total) * 100;
  const playLabel = k.playing ? 'Tạm dừng' : k.curSent >= 0 ? 'Đọc tiếp' : 'Đọc to';

  return (
    <div
      style={{
        background: 'var(--v-surface)',
        border: '1px solid var(--v-border)',
        boxShadow: 'var(--v-shadow-md)',
        borderRadius: 18,
        padding: 16,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <button onClick={k.prevS} title="Câu trước" aria-label="Câu trước" style={sideBtn} disabled={!k.supported}>
          <SkipBack size={20} fill="currentColor" />
        </button>
        <button
          onClick={k.togglePlay}
          disabled={!k.supported}
          style={{
            flex: 1,
            height: 56,
            borderRadius: 16,
            background: BUN_BLUE,
            color: '#fff',
            border: 'none',
            boxShadow: `0 5px 0 rgba(20,40,80,.2), 0 10px 22px ${BUN_BLUE}55`,
            cursor: k.supported ? 'pointer' : 'not-allowed',
            opacity: k.supported ? 1 : 0.5,
            fontFamily: 'var(--v-font-head)',
            fontWeight: 900,
            fontSize: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 9,
          }}
        >
          {k.playing ? <Pause size={19} fill="#fff" /> : <Play size={19} fill="#fff" />} {playLabel}
        </button>
        <button onClick={k.nextS} title="Câu sau" aria-label="Câu sau" style={sideBtn} disabled={!k.supported}>
          <SkipForward size={20} fill="currentColor" />
        </button>
      </div>

      <button
        onClick={k.restart}
        disabled={!k.supported}
        style={{
          width: '100%',
          padding: 10,
          borderRadius: 12,
          background: 'var(--v-panel)',
          border: '1px solid var(--v-border)',
          cursor: k.supported ? 'pointer' : 'not-allowed',
          fontFamily: 'var(--v-font-head)',
          fontWeight: 800,
          fontSize: 12,
          color: 'var(--v-ink-soft)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 7,
        }}
      >
        <RefreshCw size={14} /> Đọc lại từ đầu
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
        <div style={{ flex: 1, height: 7, background: 'var(--v-panel)', borderRadius: 999, overflow: 'hidden' }}>
          <div
            style={{
              width: `${pct}%`,
              height: '100%',
              background: BUN_BLUE,
              borderRadius: 999,
              transition: 'width .3s ease',
            }}
          />
        </div>
        <span
          style={{
            fontFamily: 'var(--v-font-mono)',
            fontSize: 11,
            fontWeight: 700,
            color: 'var(--v-muted)',
            flexShrink: 0,
          }}
        >
          Câu {k.curSent < 0 ? 0 : k.curSent + 1}/{total}
        </span>
      </div>
    </div>
  );
}
