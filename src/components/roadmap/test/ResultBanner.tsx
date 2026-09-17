'use client';

import { CheckCircle2, RotateCcw, Save } from 'lucide-react';
import Mascot from '@/components/common/Mascot';
import { CloseButton } from './TestHeader';

/**
 * Phần đầu màn kết quả dùng chung cho mọi bài: nút đóng, khung Đạt/Chưa đạt +
 * điểm, trạng thái đã lưu, và cụm nút Lưu / Làm lại / Đóng. Tách ra ở bài thứ
 * ba theo CLAUDE.md §2.1 — phần riêng của từng bài (danh sách câu sai, điểm
 * theo nhóm…) đặt bên dưới qua `children`.
 */
interface Props {
  correct: number;
  total: number;
  passWhen: string;
  passed: boolean | null;
  saved: boolean;
  saving: boolean;
  saveError: string | null;
  onSave: () => void;
  onRestart: () => void;
  onClose: () => void;
  /** Dòng phụ dưới điểm, vd "Nhóm cần luyện nhất: /r/–/l/". */
  hint?: React.ReactNode;
  children?: React.ReactNode;
}

export default function ResultBanner({
  correct,
  total,
  passWhen,
  passed,
  saved,
  saving,
  saveError,
  onSave,
  onRestart,
  onClose,
  hint,
  children,
}: Props) {
  const tone =
    passed === null
      ? { bg: 'var(--v-panel)', fg: 'var(--v-ink)', text: 'Làm xong rồi' }
      : passed
        ? { bg: 'var(--v-primary-soft)', fg: 'var(--v-primary)', text: 'Đạt rồi!' }
        : { bg: 'var(--v-red-soft)', fg: 'var(--v-red)', text: 'Chưa đạt' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <CloseButton onClick={onClose} />
      </div>

      <div
        style={{
          padding: '22px 20px',
          background: tone.bg,
          borderRadius: 'var(--v-radius-xl)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 8,
          textAlign: 'center',
        }}
      >
        <Mascot pose={passed === false ? 'idle' : 'happy'} size={80} bob={passed === true} />
        <div style={{ fontFamily: 'var(--v-font-head)', fontWeight: 900, fontSize: 'var(--v-text-2xl)', color: tone.fg }}>{tone.text}</div>
        <div style={{ fontFamily: 'var(--v-font-head)', fontWeight: 900, fontSize: 48, color: 'var(--v-ink)', lineHeight: 1 }}>
          {correct}
          <span style={{ fontSize: 26, color: 'var(--v-muted)' }}>/{total}</span>
        </div>
        <div style={{ fontFamily: 'var(--v-font-body)', fontSize: 'var(--v-text-sm)', color: 'var(--v-ink-soft)' }}>
          Ngưỡng đạt: <strong>{passWhen}</strong>
        </div>
        {hint && <div style={{ fontFamily: 'var(--v-font-body)', fontSize: 'var(--v-text-sm)', color: 'var(--v-ink-soft)' }}>{hint}</div>}
        {saved ? (
          <div
            style={{
              marginTop: 4,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 14px',
              background: 'var(--v-surface)',
              color: 'var(--v-primary)',
              borderRadius: 'var(--v-radius-pill)',
              fontFamily: 'var(--v-font-body)',
              fontWeight: 800,
              fontSize: 'var(--v-text-sm)',
            }}
          >
            <CheckCircle2 size={15} /> Đã lưu vào lộ trình
          </div>
        ) : (
          <div style={{ marginTop: 4, fontFamily: 'var(--v-font-body)', fontSize: 'var(--v-text-xs)', color: 'var(--v-muted)' }}>
            Chưa lưu — bấm Lưu kết quả để ghi vào lộ trình
          </div>
        )}
      </div>

      {saved ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <PrimaryButton onClick={onRestart}>
            <RotateCcw size={16} /> Làm lượt mới
          </PrimaryButton>
          <SecondaryButton onClick={onClose}>Đóng</SecondaryButton>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <PrimaryButton onClick={onSave} disabled={saving}>
            <Save size={16} /> {saving ? 'Đang lưu…' : 'Lưu kết quả'}
          </PrimaryButton>
          {saveError && (
            <div style={{ color: 'var(--v-red)', fontFamily: 'var(--v-font-body)', fontSize: 'var(--v-text-sm)', fontWeight: 700, textAlign: 'center' }}>
              {saveError}
            </div>
          )}
          <button
            type="button"
            onClick={onRestart}
            disabled={saving}
            style={{
              padding: '8px',
              background: 'transparent',
              border: 'none',
              color: 'var(--v-muted)',
              fontFamily: 'var(--v-font-body)',
              fontWeight: 700,
              fontSize: 'var(--v-text-sm)',
              cursor: 'pointer',
            }}
          >
            Bỏ lượt này, làm lại
          </button>
        </div>
      )}

      {children}
    </div>
  );
}

export function PrimaryButton({ onClick, disabled, children }: { onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        padding: '14px',
        background: 'var(--v-primary)',
        color: '#fff',
        border: 'none',
        borderRadius: 'var(--v-radius-lg)',
        boxShadow: 'var(--v-press)',
        fontFamily: 'var(--v-font-head)',
        fontWeight: 900,
        fontSize: 'var(--v-text-md)',
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.7 : 1,
      }}
    >
      {children}
    </button>
  );
}

export function SecondaryButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '14px',
        background: 'var(--v-surface)',
        color: 'var(--v-ink)',
        border: '1px solid var(--v-border)',
        borderRadius: 'var(--v-radius-lg)',
        fontFamily: 'var(--v-font-head)',
        fontWeight: 900,
        fontSize: 'var(--v-text-md)',
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  );
}
