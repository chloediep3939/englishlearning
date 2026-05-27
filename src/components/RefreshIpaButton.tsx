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

/**
 * Button that bulk-rewrites IPA for every flashcard of the current user
 * using the CMU Pronouncing Dictionary. One-shot admin action — surfaces
 * a confirm prompt because it OVERWRITES manually-edited IPAs.
 */
export default function RefreshIpaButton() {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<RefreshResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    if (running) return;
    const ok = window.confirm(
      'Cập nhật IPA cho toàn bộ từ trong tất cả bộ?\n\n' +
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
      });
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lỗi.');
    } finally {
      setRunning(false);
    }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
      <button
        type="button"
        onClick={run}
        disabled={running}
        style={{
          padding: '8px 14px',
          background: running ? 'var(--v-border)' : 'var(--v-purple)',
          color: '#fff',
          border: 'none',
          borderRadius: 'var(--v-radius-md)',
          boxShadow: running ? 'none' : 'var(--v-press), 0 4px 10px rgba(193,121,214,0.35)',
          fontFamily: 'var(--v-font-head)',
          fontWeight: 900,
          fontSize: 'var(--v-text-sm)',
          cursor: running ? 'wait' : 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        {running ? (
          <Loader2 size={13} style={{ animation: 'v-spin 1s linear infinite' }} />
        ) : (
          <Sparkles size={13} />
        )}
        {running ? 'Đang cập nhật…' : 'Cập nhật IPA toàn bộ (CMU)'}
      </button>
      {result && (
        <div
          style={{
            fontFamily: 'var(--v-font-body)',
            fontSize: 'var(--v-text-sm)',
            fontWeight: 700,
            color: 'var(--v-ink-soft)',
          }}
        >
          <span style={{ color: 'var(--v-primary)' }}>
            Đã cập nhật {result.updated}
          </span>{' '}
          · giữ nguyên {result.unchanged} · không có trong CMU {result.missing} ·
          tổng {result.total} từ
        </div>
      )}
      {error && (
        <div
          style={{
            fontFamily: 'var(--v-font-body)',
            fontSize: 'var(--v-text-sm)',
            fontWeight: 700,
            color: 'var(--v-red)',
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
}
