import { Check, X } from 'lucide-react';

interface Props {
  /** Nút X — bên gọi quyết có hỏi lưu hay không. */
  onClose: () => void;
  title: string;
  listLabel: string;
  passWhen: string;
  position: number; // câu đang làm, tính từ 0
  total: number;
  correct: number;
  wrong: number;
}

/** Đầu màn làm bài: đường về, tên mục, ngưỡng, thanh tiến độ và bảng đếm đúng/sai. */
export default function TestHeader({ onClose, title, listLabel, passWhen, position, total, correct, wrong }: Props) {
  const pct = total > 0 ? Math.min(100, (position / total) * 100) : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontFamily: 'var(--v-font-body)',
            fontSize: 'var(--v-text-xs)',
            fontWeight: 800,
            color: 'var(--v-muted)',
            textTransform: 'uppercase',
            letterSpacing: 'var(--v-tracking-wider)',
          }}
        >
          {listLabel}
        </div>
        <h1
          style={{
            margin: '2px 0 0',
            fontFamily: 'var(--v-font-head)',
            fontWeight: 900,
            fontSize: 'var(--v-text-2xl)',
            color: 'var(--v-ink)',
            lineHeight: 1.2,
          }}
        >
          {title}
        </h1>
        <div
          style={{
            marginTop: 4,
            fontFamily: 'var(--v-font-body)',
            fontSize: 'var(--v-text-sm)',
            color: 'var(--v-muted)',
          }}
        >
          Đạt khi <strong style={{ color: 'var(--v-ink-soft)' }}>{passWhen}</strong>
        </div>
      </div>
      <CloseButton onClick={onClose} />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div
          style={{
            flex: 1,
            height: 10,
            background: 'var(--v-border)',
            borderRadius: 'var(--v-radius-pill)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${pct}%`,
              height: '100%',
              background: 'var(--v-primary)',
              borderRadius: 'var(--v-radius-pill)',
              transition: 'width 200ms var(--v-ease)',
            }}
          />
        </div>
        <span
          style={{
            fontFamily: 'var(--v-font-head)',
            fontWeight: 900,
            fontSize: 'var(--v-text-md)',
            color: 'var(--v-ink)',
            minWidth: 56,
            textAlign: 'right',
          }}
        >
          {Math.min(position + 1, total)}/{total}
        </span>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <Tally icon={<Check size={14} strokeWidth={3} />} value={correct} color="var(--v-primary)" soft="var(--v-primary-soft)" />
        <Tally icon={<X size={14} strokeWidth={3} />} value={wrong} color="var(--v-red)" soft="var(--v-red-soft)" />
      </div>
    </div>
  );
}

function Tally({ icon, value, color, soft }: { icon: React.ReactNode; value: number; color: string; soft: string }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: '4px 12px',
        background: soft,
        color,
        borderRadius: 'var(--v-radius-pill)',
        fontFamily: 'var(--v-font-head)',
        fontWeight: 900,
        fontSize: 'var(--v-text-md)',
      }}
    >
      {icon}
      {value}
    </span>
  );
}

export function CloseButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Đóng"
      title="Đóng (Esc)"
      style={{
        flexShrink: 0,
        width: 40,
        height: 40,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--v-panel)',
        color: 'var(--v-ink-soft)',
        border: 'none',
        borderRadius: '50%',
        cursor: 'pointer',
      }}
    >
      <X size={20} strokeWidth={2.4} />
    </button>
  );
}
