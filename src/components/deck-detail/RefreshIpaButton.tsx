'use client';

import { useState } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import { apiJson } from '@/lib/common/api-json';

interface RefreshResult {
  total: number;
  updated: number;
  unchanged: number;
  missing: number;
}

interface Props {
  deckId: number;
  /** Called after a successful refresh so the parent can reload its card
   *  list (IPA shows in the word rows). */
  onDone?: () => void;
  /** Style override so the host can fit the button into its header row. */
  style?: React.CSSProperties;
}

/**
 * Per-deck "Cập nhật IPA": rewrites the IPA of every card in the deck using
 * the CMU Pronouncing Dictionary. A compact header pill (matching
 * RefreshAudioButton) with a confirm prompt because it OVERWRITES
 * manually-edited IPAs.
 */
export default function RefreshIpaButton({ deckId, onDone, style }: Props) {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<RefreshResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    if (running) return;
    const ok = window.confirm(
      'Cập nhật IPA cho toàn bộ từ trong bộ này?\n\n' +
        'Sẽ ghi đè IPA hiện tại bằng phiên âm từ CMU Pronouncing Dictionary ' +
        '(Oxford-style). IPA bạn đã sửa tay sẽ bị thay thế.',
    );
    if (!ok) return;

    setRunning(true);
    setError(null);
    setResult(null);
    try {
      const data = await apiJson<RefreshResult>('/api/cards/refresh-ipa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deck_id: deckId }),
      });
      setResult(data);
      onDone?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lỗi.');
    } finally {
      setRunning(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={run}
        disabled={running}
        title="Cập nhật IPA (CMU) cho cả bộ — ghi đè IPA đã sửa tay"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '6px 10px',
          background: 'var(--v-surface)',
          color: 'var(--v-ink-soft)',
          border: '1px solid var(--v-border)',
          borderRadius: 'var(--v-radius-md)',
          boxShadow: 'var(--v-shadow-sm)',
          fontFamily: 'var(--v-font-head)',
          fontWeight: 800,
          fontSize: 'var(--v-text-xs)',
          cursor: running ? 'wait' : 'pointer',
          ...style,
        }}
      >
        {running ? (
          <Loader2 size={12} style={{ animation: 'v-spin 1s linear infinite' }} />
        ) : (
          <Sparkles size={12} />
        )}
        {running ? 'Đang cập nhật…' : 'Cập nhật IPA'}
      </button>
      {result && (
        <span
          style={{
            fontFamily: 'var(--v-font-body)',
            fontSize: 'var(--v-text-xs)',
            fontWeight: 700,
            color: 'var(--v-ink-soft)',
          }}
        >
          <span style={{ color: 'var(--v-primary)' }}>Đã cập nhật {result.updated}</span>
          {' · '}giữ nguyên {result.unchanged} · không có trong CMU {result.missing}
        </span>
      )}
      {error && (
        <span
          style={{
            fontFamily: 'var(--v-font-body)',
            fontSize: 'var(--v-text-xs)',
            fontWeight: 700,
            color: 'var(--v-red)',
          }}
        >
          {error}
        </span>
      )}
    </>
  );
}
