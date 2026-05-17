'use client';

import { useEffect, useState } from 'react';
import { ArrowRightLeft, Trash2, X } from 'lucide-react';

interface Props {
  deckName: string;
  cardCount: number;
  onCancel: () => void;
  /** Called with `deleteCards = false` to move cards to default deck,
   *  or `true` to hard-delete the cards along with the deck. */
  onConfirm: (deleteCards: boolean) => Promise<void>;
}

/**
 * Three-way confirm shown before deleting a deck. Lets the user choose
 * between preserving cards (move to default) and discarding them. Used by
 * both `DeckList` (grid) and `DeckDetailClient` (detail page).
 *
 * Skipped at the call site when the deck is empty — there's nothing to ask.
 */
export default function DeleteDeckDialog({
  deckName,
  cardCount,
  onCancel,
  onConfirm,
}: Props) {
  const [busy, setBusy] = useState<'move' | 'delete' | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && busy === null) onCancel();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel, busy]);

  async function handle(deleteCards: boolean) {
    setBusy(deleteCards ? 'delete' : 'move');
    try {
      await onConfirm(deleteCards);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onCancel}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        zIndex: 100,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--v-surface)',
          border: '1px solid var(--v-border)',
          borderRadius: 'var(--v-radius-lg)',
          boxShadow: 'var(--v-shadow-lg)',
          padding: 24,
          maxWidth: 440,
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between', gap: 12 }}>
          <h2
            style={{
              fontFamily: 'var(--v-font-head)',
              fontWeight: 900,
              fontSize: 'var(--v-text-xl)',
              margin: 0,
              color: 'var(--v-ink)',
              letterSpacing: 'var(--v-tracking-tight)',
            }}
          >
            Xoá bộ &ldquo;{deckName}&rdquo;?
          </h2>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy !== null}
            aria-label="Đóng"
            style={{
              padding: 0,
              background: 'transparent',
              border: 'none',
              cursor: busy ? 'not-allowed' : 'pointer',
              color: 'var(--v-muted)',
              display: 'inline-flex',
            }}
          >
            <X size={18} />
          </button>
        </div>

        <p
          style={{
            margin: 0,
            color: 'var(--v-ink-soft)',
            fontFamily: 'var(--v-font-body)',
            fontSize: 'var(--v-text-md)',
            lineHeight: 1.5,
          }}
        >
          Bộ này có <strong>{cardCount} thẻ</strong>. Bạn muốn xử lý thế nào?
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button
            type="button"
            onClick={() => handle(false)}
            disabled={busy !== null}
            style={{
              ...optionBtnStyle(),
              borderColor: 'color-mix(in srgb, var(--v-primary) 35%, transparent)',
              color: 'var(--v-primary-deep)',
            }}
          >
            <ArrowRightLeft size={16} />
            <span style={{ flex: 1, textAlign: 'left' }}>
              <span style={{ display: 'block', fontWeight: 900 }}>
                Chuyển thẻ về bộ mặc định
              </span>
              <span
                style={{
                  display: 'block',
                  fontFamily: 'var(--v-font-body)',
                  fontWeight: 600,
                  fontSize: 'var(--v-text-xs)',
                  color: 'var(--v-muted)',
                  marginTop: 2,
                }}
              >
                Giữ lại {cardCount} thẻ, chỉ xoá bộ
              </span>
            </span>
            {busy === 'move' && <Spinner />}
          </button>

          <button
            type="button"
            onClick={() => handle(true)}
            disabled={busy !== null}
            style={{
              ...optionBtnStyle(),
              borderColor: 'color-mix(in srgb, var(--v-red) 35%, transparent)',
              color: 'var(--v-red)',
            }}
          >
            <Trash2 size={16} />
            <span style={{ flex: 1, textAlign: 'left' }}>
              <span style={{ display: 'block', fontWeight: 900 }}>
                Xoá luôn {cardCount} thẻ
              </span>
              <span
                style={{
                  display: 'block',
                  fontFamily: 'var(--v-font-body)',
                  fontWeight: 600,
                  fontSize: 'var(--v-text-xs)',
                  color: 'var(--v-muted)',
                  marginTop: 2,
                }}
              >
                Xoá vĩnh viễn cả bộ lẫn thẻ, không hoàn tác
              </span>
            </span>
            {busy === 'delete' && <Spinner />}
          </button>
        </div>

        <button
          type="button"
          onClick={onCancel}
          disabled={busy !== null}
          style={{
            padding: '10px 14px',
            background: 'transparent',
            border: 'none',
            color: 'var(--v-muted)',
            fontFamily: 'var(--v-font-head)',
            fontWeight: 800,
            fontSize: 'var(--v-text-sm)',
            cursor: busy ? 'not-allowed' : 'pointer',
            alignSelf: 'flex-end',
          }}
        >
          Huỷ
        </button>
      </div>
    </div>
  );
}

function optionBtnStyle(): React.CSSProperties {
  return {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    width: '100%',
    padding: '12px 14px',
    background: 'var(--v-surface)',
    border: '1.5px solid var(--v-border)',
    borderRadius: 'var(--v-radius-md)',
    fontFamily: 'var(--v-font-head)',
    fontSize: 'var(--v-text-base)',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'background 120ms var(--v-ease), border-color 120ms var(--v-ease)',
  };
}

function Spinner() {
  return (
    <span
      aria-label="Đang xử lý"
      style={{
        width: 14,
        height: 14,
        borderRadius: '50%',
        border: '2px solid currentColor',
        borderTopColor: 'transparent',
        animation: 'v-spin 0.7s linear infinite',
      }}
    />
  );
}
