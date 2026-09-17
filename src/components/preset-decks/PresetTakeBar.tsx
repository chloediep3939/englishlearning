'use client';

import { Download, Loader2, X } from 'lucide-react';

export type TakeTarget = { mode: 'new'; perDeck: number } | { mode: 'existing'; deckId: number | null };

interface Props {
  /** Vị trí ngang của vùng nội dung (thanh fixed phải khớp, không đè sidebar). */
  box: { left: number; width: number } | null;
  count: number;
  target: TakeTarget;
  userDecks: { id: number; name: string }[];
  submitting: boolean;
  error: string | null;
  onTarget: (t: TakeTarget) => void;
  onClear: () => void;
  onSubmit: () => void;
}

export const MIN_PER_DECK = 5;
export const MAX_PER_DECK = 200;

/** Chia n từ thành các bộ mỗi bộ perDeck từ → kích thước từng bộ. */
export function splitSizes(n: number, perDeck: number): number[] {
  if (n <= 0 || perDeck <= 0) return [];
  const out: number[] = [];
  for (let left = n; left > 0; left -= perDeck) out.push(Math.min(perDeck, left));
  return out;
}

/** [20, 20, 20, 10] → "3 bộ 20 từ và 1 bộ 10 từ" (gộp các bộ cùng cỡ). */
function describeSizes(sizes: number[]): string {
  const groups: { size: number; n: number }[] = [];
  for (const s of sizes) {
    const last = groups[groups.length - 1];
    if (last && last.size === s) last.n++;
    else groups.push({ size: s, n: 1 });
  }
  return groups.map((g) => `${g.n} bộ ${g.size} từ`).join(' và ');
}

const segBtn =(active: boolean): React.CSSProperties => ({
  padding: '7px 12px',
  border: 'none',
  borderRadius: 'var(--v-radius-sm)',
  background: active ? 'var(--v-surface)' : 'transparent',
  boxShadow: active ? 'var(--v-shadow-sm)' : 'none',
  color: active ? 'var(--v-ink)' : 'var(--v-muted)',
  fontFamily: 'var(--v-font-head)',
  fontWeight: 800,
  fontSize: 'var(--v-text-xs)',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
});

/** Chiều cao chừa ở cuối trang để thanh cố định không che hàng cuối. */
export const TAKE_BAR_SPACE = 150;

/**
 * Thanh "lấy về" cố định ở đáy màn hình khi đã chọn từ: tạo bộ mới (tự gõ số từ mỗi bộ,
 * xem trước sẽ ra mấy bộ) hoặc thêm hết vào một bộ đang có.
 */
export default function PresetTakeBar({ box, count, target, userDecks, submitting, error, onTarget, onClear, onSubmit }: Props) {
  const perDeckValid =
    target.mode === 'new' && Number.isInteger(target.perDeck) && target.perDeck >= MIN_PER_DECK && target.perDeck <= MAX_PER_DECK;
  const sizes = target.mode === 'new' && perDeckValid ? splitSizes(count, target.perDeck) : [];
  const canSubmit = count > 0 && !submitting && (target.mode === 'new' ? perDeckValid : target.deckId !== null);

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 16,
        left: box ? box.left : 16,
        width: box ? box.width : 'calc(100% - 32px)',
        boxSizing: 'border-box',
        zIndex: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        padding: '12px 14px',
        background: 'var(--v-surface)',
        border: '1px solid var(--v-border-med)',
        borderRadius: 'var(--v-radius-lg)',
        boxShadow: 'var(--v-shadow-lg)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span
            style={{
              minWidth: 32,
              height: 32,
              padding: '0 8px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'var(--v-primary)',
              color: '#fff',
              borderRadius: 999,
              fontFamily: 'var(--v-font-head)',
              fontWeight: 900,
              fontSize: 'var(--v-text-sm)',
            }}
          >
            {count}
          </span>
          <span style={{ fontFamily: 'var(--v-font-body)', fontWeight: 800, fontSize: 'var(--v-text-sm)', color: 'var(--v-ink)' }}>
            từ đã chọn
          </span>
          <button
            type="button"
            onClick={onClear}
            aria-label="Bỏ chọn tất cả"
            title="Bỏ chọn tất cả"
            style={{ display: 'inline-flex', padding: 4, background: 'transparent', border: 'none', color: 'var(--v-muted)', cursor: 'pointer' }}
          >
            <X size={16} />
          </button>
        </div>

        <div style={{ display: 'inline-flex', padding: 3, background: 'var(--v-bg)', borderRadius: 'var(--v-radius-md)', gap: 2 }}>
          <button
            type="button"
            style={segBtn(target.mode === 'new')}
            onClick={() => target.mode !== 'new' && onTarget({ mode: 'new', perDeck: 20 })}
          >
            Tạo bộ mới
          </button>
          <button
            type="button"
            style={segBtn(target.mode === 'existing')}
            disabled={userDecks.length === 0}
            onClick={() => target.mode !== 'existing' && onTarget({ mode: 'existing', deckId: userDecks[0]?.id ?? null })}
          >
            Thêm vào bộ có sẵn
          </button>
        </div>

        {target.mode === 'new' ? (
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'var(--v-font-body)', fontSize: 'var(--v-text-sm)', fontWeight: 700, color: 'var(--v-ink-soft)' }}>
            Mỗi bộ
            <input
              type="number"
              inputMode="numeric"
              min={MIN_PER_DECK}
              max={MAX_PER_DECK}
              value={Number.isNaN(target.perDeck) ? '' : target.perDeck}
              onChange={(e) => onTarget({ mode: 'new', perDeck: e.target.value === '' ? NaN : Math.floor(Number(e.target.value)) })}
              style={{
                width: 64,
                padding: '6px 8px',
                textAlign: 'center',
                fontFamily: 'var(--v-font-head)',
                fontWeight: 900,
                fontSize: 'var(--v-text-sm)',
                color: 'var(--v-ink)',
                background: 'var(--v-bg)',
                border: `1px solid ${perDeckValid ? 'var(--v-border-med)' : 'var(--v-red)'}`,
                borderRadius: 'var(--v-radius-sm)',
              }}
            />
            từ
          </label>
        ) : (
          <select
            value={target.deckId ?? ''}
            onChange={(e) => onTarget({ mode: 'existing', deckId: e.target.value ? Number(e.target.value) : null })}
            aria-label="Bộ đích"
            style={{
              flex: '1 1 180px',
              minWidth: 0,
              maxWidth: 280,
              padding: '7px 10px',
              fontFamily: 'var(--v-font-body)',
              fontSize: 'var(--v-text-sm)',
              fontWeight: 700,
              color: 'var(--v-ink)',
              background: 'var(--v-bg)',
              border: '1px solid var(--v-border-med)',
              borderRadius: 'var(--v-radius-sm)',
            }}
          >
            {userDecks.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        )}

        <button
          type="button"
          onClick={onSubmit}
          disabled={!canSubmit}
          style={{
            marginLeft: 'auto',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '10px 18px',
            background: canSubmit ? 'var(--v-primary)' : 'var(--v-border-med)',
            color: '#fff',
            border: 'none',
            borderRadius: 'var(--v-radius-md)',
            boxShadow: canSubmit ? 'var(--v-press)' : 'none',
            fontFamily: 'var(--v-font-head)',
            fontWeight: 900,
            fontSize: 'var(--v-text-sm)',
            cursor: canSubmit ? 'pointer' : 'not-allowed',
          }}
        >
          {submitting ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
          {target.mode === 'new' && sizes.length > 0 ? `Lấy về · ${sizes.length} bộ` : 'Lấy về'}
        </button>
      </div>

      {target.mode === 'new' && (
        <div style={{ fontFamily: 'var(--v-font-body)', fontSize: 'var(--v-text-xs)', color: perDeckValid ? 'var(--v-muted)' : 'var(--v-red)' }}>
          {perDeckValid
            ? `Chia thành ${sizes.length} bộ: ${describeSizes(sizes)}`
            : `Nhập số từ mỗi bộ từ ${MIN_PER_DECK} đến ${MAX_PER_DECK}.`}
        </div>
      )}
      {error && <div style={{ fontFamily: 'var(--v-font-body)', fontSize: 'var(--v-text-sm)', color: 'var(--v-red)' }}>{error}</div>}
    </div>
  );
}
