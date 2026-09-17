'use client';

import { useEffect, useRef } from 'react';
import { Save } from 'lucide-react';

interface Props {
  answered: number;
  total: number;
  finished: boolean;
  /** Chỉ có khi đã làm xong: đạt / chưa đạt / null (ngưỡng không chấm được). */
  passed: boolean | null;
  saving: boolean;
  onSave: () => void;
  onDiscard: () => void;
  onCancel: () => void;
  /** Câu giải thích khi lưu bài dở — mỗi loại bài giữ lại thứ khác nhau. */
  partialNote?: string;
}

/**
 * Hỏi "lưu kết quả trước khi đóng?". Nút được focus sẵn là "Làm tiếp" — nút an
 * toàn nhất — để ai lỡ tay bấm Enter theo quán tính cũng không mất bài.
 */
export default function CloseConfirm({ answered, total, finished, passed, saving, onSave, onDiscard, onCancel, partialNote }: Props) {
  const safeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    safeRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  const body = finished
    ? passed === null
      ? `Bạn đã làm xong ${answered} từ. Lưu lại để ghi vào lịch sử?`
      : `Bạn đã làm xong và ${passed ? 'ĐẠT' : 'CHƯA ĐẠT'} ngưỡng. Lưu lại để đánh dấu vào lộ trình?`
    : `Bạn mới làm ${answered}/${total} câu. ${
        partialNote ?? 'Lưu lại thì các từ đã bấm "Biết" sẽ không bị bốc lại lần sau'
      } — nhưng bài chưa đủ nên sẽ chưa chấm Đạt / Chưa đạt.`;

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      style={{
        // fixed chứ không absolute: thẻ popup bên dưới cuộn được, absolute sẽ
        // lệch khỏi màn hình khi user đã cuộn xuống.
        position: 'fixed',
        inset: 0,
        zIndex: 101,
        background: 'rgba(20,20,30,0.35)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 400,
          padding: 22,
          background: 'var(--v-surface)',
          borderRadius: 'var(--v-radius-lg)',
          boxShadow: 'var(--v-shadow-lg)',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
      >
        <div style={{ fontFamily: 'var(--v-font-head)', fontWeight: 900, fontSize: 'var(--v-text-xl)', color: 'var(--v-ink)' }}>
          Lưu kết quả trước khi đóng?
        </div>
        <div style={{ fontFamily: 'var(--v-font-body)', fontSize: 'var(--v-text-md)', color: 'var(--v-ink-soft)', lineHeight: 1.5 }}>
          {body}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              padding: '12px',
              background: 'var(--v-primary)',
              color: '#fff',
              border: 'none',
              borderRadius: 'var(--v-radius-md)',
              boxShadow: 'var(--v-press)',
              fontFamily: 'var(--v-font-head)',
              fontWeight: 900,
              fontSize: 'var(--v-text-md)',
              cursor: saving ? 'default' : 'pointer',
              opacity: saving ? 0.7 : 1,
            }}
          >
            <Save size={16} /> {saving ? 'Đang lưu…' : 'Lưu và đóng'}
          </button>
          <button
            ref={safeRef}
            type="button"
            onClick={onCancel}
            disabled={saving}
            style={{
              padding: '12px',
              background: 'var(--v-surface)',
              color: 'var(--v-ink)',
              border: '1px solid var(--v-border)',
              borderRadius: 'var(--v-radius-md)',
              fontFamily: 'var(--v-font-head)',
              fontWeight: 900,
              fontSize: 'var(--v-text-md)',
              cursor: 'pointer',
            }}
          >
            {finished ? 'Chưa, ở lại xem' : 'Làm tiếp'}
          </button>
          <button
            type="button"
            onClick={onDiscard}
            disabled={saving}
            style={{
              padding: '8px',
              background: 'transparent',
              color: 'var(--v-red)',
              border: 'none',
              fontFamily: 'var(--v-font-body)',
              fontWeight: 800,
              fontSize: 'var(--v-text-sm)',
              cursor: 'pointer',
            }}
          >
            Đóng, không lưu
          </button>
        </div>
      </div>
    </div>
  );
}
