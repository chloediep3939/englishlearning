'use client';

import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';

interface Props {
  deckId: number;
  /** Inline button shares the visual language of the rest of the deck-
   * detail header (small pill, light surface). Pass a custom style override
   * via `style` if a host needs a different fit. */
  style?: React.CSSProperties;
}

/**
 * Triggers a browser download of `/api/decks/[id]/export` as a JSON file.
 * The server sets `Content-Disposition: attachment; filename=...` so we
 * just need to navigate to the URL — but doing so in a hidden anchor lets
 * us show a small spinner while the response is being prepared.
 */
export default function DeckExportButton({ deckId, style }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/decks/${deckId}/export`);
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? `HTTP ${res.status}`);
      }
      const blob = await res.blob();
      const cd = res.headers.get('Content-Disposition') ?? '';
      const m = /filename="([^"]+)"/.exec(cd);
      const filename = m?.[1] ?? `deck-${deckId}.json`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lỗi tải file.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={run}
        disabled={busy}
        title="Tải bộ này về dạng JSON"
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
          cursor: busy ? 'wait' : 'pointer',
          ...style,
        }}
      >
        {busy ? (
          <Loader2 size={12} style={{ animation: 'v-spin 1s linear infinite' }} />
        ) : (
          <Download size={12} />
        )}
        Export
      </button>
      {error && (
        <span
          style={{
            fontFamily: 'var(--v-font-body)',
            fontSize: 'var(--v-text-xs)',
            color: 'var(--v-red)',
            fontWeight: 700,
          }}
        >
          {error}
        </span>
      )}
    </>
  );
}
