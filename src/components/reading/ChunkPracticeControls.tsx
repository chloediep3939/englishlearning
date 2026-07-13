'use client';

import { useEffect } from 'react';
import { Play, RotateCcw, SkipBack, SkipForward, Square, Pencil, Sparkles, Undo2, AudioLines } from 'lucide-react';
import type { ChunkPractice } from '@/lib/reading/use-chunk-practice';

const btnBase: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  padding: '9px 12px',
  borderRadius: 11,
  border: '1px solid var(--v-border)',
  background: 'var(--v-surface)',
  color: 'var(--v-ink)',
  fontFamily: 'var(--v-font-head)',
  fontWeight: 800,
  fontSize: 12,
  cursor: 'pointer',
  boxShadow: 'var(--v-shadow-sm)',
};

/**
 * Echo-practice controls for PTE thought-group reading. Flow: play one chunk
 * → the learner repeats it aloud (no timer — self-paced) → "Cụm tiếp".
 * Also hosts manual re-chunking (edit mode) and the AI chunking upgrade.
 */
export default function ChunkPracticeControls({ cp }: { cp: ChunkPractice }) {
  // Enter advances to the next chunk while waiting for the learner —
  // hands-free-ish practice. Skips focused controls to avoid double-firing.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== 'Enter' || !cp.waiting) return;
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'BUTTON' || el.getAttribute('role') === 'button')) return;
      e.preventDefault();
      cp.next();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [cp]);

  const status = cp.autoRead
    ? '🔊 Đang đọc cả bài — nghe kỹ chỗ ngắt cụm nha…'
    : cp.done
      ? '🎉 Hết bài rồi! Bấm "Bắt đầu" để luyện lại từ đầu.'
      : cp.waiting
        ? '🎤 Tới lượt bạn — đọc to cụm vừa nghe, xong bấm "Cụm tiếp" (hoặc Enter).'
        : cp.playing
          ? '👂 Nghe kỹ cách ngắt nha…'
          : 'Nghe cả bài để nắm nhịp, hoặc luyện đọc lại từng cụm bên dưới.';

  return (
    <div
      style={{
        background: 'var(--v-surface)',
        border: '1.5px solid color-mix(in srgb, var(--v-purple) 45%, transparent)',
        boxShadow: 'var(--v-shadow-md)',
        borderRadius: 18,
        padding: '14px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <div
        style={{
          fontFamily: 'var(--v-font-head)',
          fontWeight: 900,
          fontSize: 13,
          color: 'var(--v-purple)',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        Luyện ngắt cụm · PTE Read Aloud
      </div>

      <div
        style={{
          fontFamily: 'var(--v-font-body)',
          fontSize: 12,
          fontWeight: 700,
          color: 'var(--v-ink-soft)',
          lineHeight: 1.5,
          minHeight: 18,
        }}
      >
        {status}
      </div>

      {/* Read whole passage with pauses (not echo — auto-advances). */}
      <button
        type="button"
        onClick={cp.autoRead ? cp.stop : cp.playAll}
        style={{
          ...btnBase,
          background: cp.autoRead ? 'var(--v-red)' : 'var(--v-purple)',
          color: '#fff',
          border: 'none',
        }}
      >
        {cp.autoRead ? <Square size={13} /> : <AudioLines size={14} />}
        {cp.autoRead ? 'Dừng đọc cả bài' : 'Nghe cả bài (có ngắt)'}
      </button>

      <div style={{ borderTop: '1px dashed var(--v-border)' }} />
      <div style={{ fontFamily: 'var(--v-font-body)', fontSize: 11, fontWeight: 800, color: 'var(--v-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        Luyện đọc lại từng cụm
      </div>

      {/* Echo transport */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {cp.cur === null || cp.autoRead ? (
          <button
            type="button"
            onClick={cp.start}
            style={{ ...btnBase, background: 'var(--v-purple)', color: '#fff', border: 'none', flex: 1 }}
          >
            <Play size={14} /> Bắt đầu
          </button>
        ) : (
          <>
            <button type="button" onClick={cp.prev} aria-label="Cụm trước" style={btnBase}>
              <SkipBack size={14} />
            </button>
            <button type="button" onClick={cp.replay} style={btnBase}>
              <RotateCcw size={14} /> Nghe lại
            </button>
            <button
              type="button"
              onClick={cp.next}
              style={{
                ...btnBase,
                flex: 1,
                background: cp.waiting ? 'var(--v-purple)' : 'var(--v-surface)',
                color: cp.waiting ? '#fff' : 'var(--v-ink)',
                border: cp.waiting ? 'none' : btnBase.border,
              }}
            >
              Cụm tiếp <SkipForward size={14} />
            </button>
            <button type="button" onClick={cp.stop} aria-label="Dừng" style={btnBase}>
              <Square size={13} />
            </button>
          </>
        )}
      </div>

      <div style={{ borderTop: '1px dashed var(--v-border)' }} />

      {/* Manual re-chunking */}
      <button
        type="button"
        onClick={() => cp.setEditMode(!cp.editMode)}
        style={{
          ...btnBase,
          justifyContent: 'flex-start',
          background: cp.editMode ? 'color-mix(in srgb, var(--v-purple) 14%, transparent)' : 'var(--v-surface)',
          color: cp.editMode ? 'var(--v-purple)' : 'var(--v-ink)',
        }}
      >
        <Pencil size={13} /> {cp.editMode ? 'Xong — tắt chỉnh cụm' : 'Tự chia cụm'}
      </button>
      {cp.editMode && (
        <div style={{ fontFamily: 'var(--v-font-body)', fontSize: 11, fontWeight: 600, color: 'var(--v-muted)', lineHeight: 1.5 }}>
          Bấm vào dấu <b style={{ color: 'var(--v-muted)' }}>·</b> giữa hai từ để thêm dấu ngắt,
          bấm dấu <b style={{ color: 'var(--v-purple)' }}>/</b> để bỏ. Chia cụm ngắn hơn nếu bạn
          muốn đọc chậm rãi.
        </div>
      )}

      {/* AI upgrade */}
      <button
        type="button"
        onClick={cp.runAI}
        disabled={cp.aiLoading}
        style={{
          ...btnBase,
          justifyContent: 'flex-start',
          opacity: cp.aiLoading ? 0.6 : 1,
          cursor: cp.aiLoading ? 'default' : 'pointer',
        }}
      >
        <Sparkles size={13} style={{ color: 'var(--v-purple)' }} />
        {cp.aiLoading ? 'AI đang chia cụm…' : cp.aiApplied ? 'AI đã chia cụm ✓ — chia lại' : 'AI chia cụm chuẩn'}
      </button>
      {cp.aiApplied && !cp.aiLoading && (
        <div style={{ fontFamily: 'var(--v-font-body)', fontSize: 11, fontWeight: 600, color: 'var(--v-muted)' }}>
          Từ <b>in đậm</b> là từ cần nhấn trọng âm.
        </div>
      )}
      {cp.aiError && (
        <div style={{ fontFamily: 'var(--v-font-body)', fontSize: 11, fontWeight: 700, color: 'var(--v-red)' }}>
          {cp.aiError}
        </div>
      )}

      <button
        type="button"
        onClick={cp.resetBreaks}
        style={{ ...btnBase, justifyContent: 'flex-start', color: 'var(--v-red)' }}
      >
        <Undo2 size={13} /> Reset — về cách chia ban đầu
      </button>
    </div>
  );
}
