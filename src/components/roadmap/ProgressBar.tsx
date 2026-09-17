import { STATUS_COLOR } from './skill-meta';

interface Props {
  pass: number;
  fail: number;
  untested: number;
  height?: number;
}

/**
 * Thanh 3 màu: đạt (xanh) — chưa đạt (đỏ) — chưa test (xám).
 * Đây là câu trả lời cho "mình đang thiếu gì" ở dạng một cái nhìn.
 */
export default function ProgressBar({ pass, fail, untested, height = 10 }: Props) {
  const total = pass + fail + untested;
  if (total === 0) return null;
  const pct = (n: number) => `${(n / total) * 100}%`;

  return (
    <div
      style={{
        display: 'flex',
        height,
        borderRadius: 'var(--v-radius-pill)',
        overflow: 'hidden',
        background: 'var(--v-border)',
      }}
    >
      {pass > 0 && <div style={{ width: pct(pass), background: STATUS_COLOR.pass }} />}
      {fail > 0 && <div style={{ width: pct(fail), background: STATUS_COLOR.fail }} />}
      {untested > 0 && (
        <div style={{ width: pct(untested), background: 'var(--v-border)' }} />
      )}
    </div>
  );
}
