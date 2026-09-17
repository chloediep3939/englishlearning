import { Check, Circle, RotateCcw, X } from 'lucide-react';
import type { RoadmapLatestRun, RoadmapStatus } from '@/lib/types';

interface Props {
  status: RoadmapStatus;
  needsRetest: boolean;
  latest: RoadmapLatestRun | null;
  unit: 'count' | 'percent' | null;
}

/**
 * Trạng thái của một mục, gói trong một viên thuốc duy nhất: chưa test / đạt /
 * chưa đạt / cần test lại, kèm điểm lần gần nhất nếu có.
 *
 * Chỉ để NHÌN — không bấm được. Đổi trạng thái tay thì mở hàng ra. Bản cũ để 3
 * nút ✓/✗/☐ ngay đầu mỗi hàng, 141 hàng thành 423 nút tròn nhỏ — đó là thứ làm
 * trang rối nhất.
 */
export default function StatusChip({ status, needsRetest, latest, unit }: Props) {
  const score = latest ? formatScore(latest, unit) : null;

  const look =
    status === 'pass' && needsRetest
      ? { bg: 'var(--v-orange-soft)', fg: 'var(--v-orange)', icon: <RotateCcw size={13} strokeWidth={2.6} />, text: 'Test lại' }
      : status === 'pass'
        ? { bg: 'var(--v-primary-soft)', fg: 'var(--v-primary)', icon: <Check size={13} strokeWidth={3} />, text: 'Đạt' }
        : status === 'fail'
          ? { bg: 'var(--v-red-soft)', fg: 'var(--v-red)', icon: <X size={13} strokeWidth={3} />, text: 'Chưa đạt' }
          : { bg: 'var(--v-panel)', fg: 'var(--v-muted)', icon: <Circle size={11} strokeWidth={2.6} />, text: 'Chưa test' };

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        flexShrink: 0,
        minWidth: 92,
        padding: '4px 10px',
        background: look.bg,
        color: look.fg,
        borderRadius: 'var(--v-radius-pill)',
        fontFamily: 'var(--v-font-body)',
        fontWeight: 800,
        fontSize: 'var(--v-text-xs)',
        whiteSpace: 'nowrap',
      }}
    >
      {look.icon}
      {score ?? look.text}
    </span>
  );
}

function formatScore(run: RoadmapLatestRun, unit: 'count' | 'percent' | null): string {
  if (unit === 'percent') return `${run.score}%`;
  if (run.total !== null) return `${run.score}/${run.total}`;
  return String(run.score);
}
