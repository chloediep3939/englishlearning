'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Library, StickyNote } from 'lucide-react';
import { apiJson } from '@/lib/common/api-json';
import { canAutoJudge, describeThreshold, maxScore, scoreInputLabel } from '@/lib/roadmap/threshold';
import type { RoadmapItemWithProgress, RoadmapLatestRun, RoadmapStatus, RoadmapTestRun } from '@/lib/types';
import { STATUS_COLOR } from './skill-meta';

interface Props {
  item: RoadmapItemWithProgress;
  status: RoadmapStatus;
  note: string;
  hasTest: boolean;
  latest: RoadmapLatestRun | null;
  /** Lưu trạng thái tay + ghi chú (PUT /api/roadmap/[key]). */
  onSaveManual: (status: RoadmapStatus, note: string) => Promise<void>;
  /** Sau khi nhập điểm xong. */
  onScored: (passed: boolean | null) => void;
}

/**
 * Phần mở rộng của một mục. Thứ tự cố ý theo đúng việc người học cần làm:
 *   1. Đọc cách test + ngưỡng
 *   2. Làm bài trong Bún (nếu có) — hoặc nhập điểm đã test ở ngoài
 *   3. (phụ) tự đánh dấu tay, ghi chú, xem lịch sử
 * Bản cũ trộn cả ba cách ghi kết quả ngang hàng nhau nên không rõ bấm cái nào.
 */
export default function ItemDetail({ item, status, note, hasTest, latest, onSaveManual, onScored }: Props) {
  const auto = canAutoJudge(item);
  const [score, setScore] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [runs, setRuns] = useState<RoadmapTestRun[] | null>(null);
  const [noteOpen, setNoteOpen] = useState(note.trim().length > 0);
  const [draftNote, setDraftNote] = useState(note);

  useEffect(() => {
    let alive = true;
    apiJson<{ runs: RoadmapTestRun[] }>(`/api/roadmap/${item.item_key}/test-run`)
      .then((d) => alive && setRuns(d.runs))
      .catch(() => alive && setRuns([]));
    return () => {
      alive = false;
    };
    // latest?.created_at đổi khi vừa lưu một lần làm bài trong popup → tải lại.
  }, [item.item_key, latest?.created_at]);

  async function submitScore() {
    const n = Number(score);
    if (!Number.isInteger(n) || n < 0) return setError('Nhập một số nguyên không âm.');
    if (n > maxScore(item)) return setError(`Tối đa ${maxScore(item)}.`);
    setBusy(true);
    setError(null);
    try {
      const res = await apiJson<{ passed: boolean | null; run: RoadmapTestRun }>(
        `/api/roadmap/${item.item_key}/test-run`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ score: n, source: 'manual' }),
        },
      );
      setRuns((prev) => [res.run, ...(prev ?? [])]);
      setScore('');
      onScored(res.passed);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ghi điểm không được.');
    } finally {
      setBusy(false);
    }
  }

  async function manual(next: RoadmapStatus) {
    setBusy(true);
    setError(null);
    try {
      await onSaveManual(next, draftNote);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lưu không được.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '4px 14px 16px' }}>
      {/* 1. Cách test + ngưỡng */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 10,
        }}
      >
        <InfoBox label="Cách test">{item.how_to_test}</InfoBox>
        <InfoBox label="Đạt khi" accent>
          {item.pass_when}
        </InfoBox>
      </div>

      {/* Mục từ vựng / collocation: gợi ý luyện trong Thư viện bộ từ */}
      {(item.group_name.includes('Từ vựng') || item.group_name.includes('Tầng từ')) && (
        <Link
          href="/decks/library"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            alignSelf: 'flex-start',
            padding: '7px 12px',
            background: 'var(--v-surface)',
            border: '1px solid var(--v-primary)',
            borderRadius: 'var(--v-radius-md)',
            color: 'var(--v-primary)',
            fontFamily: 'var(--v-font-head)',
            fontWeight: 800,
            fontSize: 'var(--v-text-sm)',
            textDecoration: 'none',
          }}
        >
          <Library size={14} /> Luyện từ vựng ở Thư viện bộ từ →
        </Link>
      )}

      {/* 2. Hành động chính */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          padding: 14,
          background: 'var(--v-panel)',
          borderRadius: 'var(--v-radius-md)',
        }}
      >
        {auto ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ fontFamily: 'var(--v-font-body)', fontSize: 'var(--v-text-sm)', fontWeight: 700, color: 'var(--v-ink-soft)' }}>
              {hasTest ? 'Đã test ở chỗ khác? ' : 'Test xong ở APEUni / giấy / site ngoài? '}
              {scoreInputLabel(item)}
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (score.trim()) submitScore();
              }}
              style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}
            >
              <input
                type="number"
                inputMode="numeric"
                min={0}
                max={maxScore(item)}
                value={score}
                disabled={busy}
                onChange={(e) => setScore(e.target.value)}
                placeholder="0"
                style={{
                  width: 96,
                  padding: '9px 12px',
                  background: 'var(--v-surface)',
                  border: '1px solid var(--v-border)',
                  borderRadius: 'var(--v-radius-sm)',
                  color: 'var(--v-ink)',
                  fontFamily: 'var(--v-font-head)',
                  fontWeight: 900,
                  fontSize: 'var(--v-text-lg)',
                }}
              />
              <button
                type="submit"
                disabled={busy || !score.trim()}
                style={{
                  padding: '10px 18px',
                  background: score.trim() ? 'var(--v-ink)' : 'var(--v-border)',
                  color: score.trim() ? 'var(--v-bg)' : 'var(--v-muted)',
                  border: 'none',
                  borderRadius: 'var(--v-radius-sm)',
                  fontFamily: 'var(--v-font-body)',
                  fontWeight: 800,
                  fontSize: 'var(--v-text-sm)',
                  cursor: score.trim() ? 'pointer' : 'default',
                }}
              >
                Ghi điểm
              </button>
              <span style={{ fontFamily: 'var(--v-font-body)', fontSize: 'var(--v-text-xs)', color: 'var(--v-muted)' }}>
                đạt khi {describeThreshold(item)} — mình tự đánh dấu
              </span>
            </form>
          </div>
        ) : (
          <div style={{ fontFamily: 'var(--v-font-body)', fontSize: 'var(--v-text-sm)', color: 'var(--v-ink-soft)' }}>
            Ngưỡng mục này là mô tả bằng chữ nên không chấm tự động — test xong bạn tự đánh dấu bên dưới.
          </div>
        )}

        {error && <div style={{ color: 'var(--v-red)', fontSize: 'var(--v-text-xs)', fontWeight: 700 }}>{error}</div>}
      </div>

      {/* 3. Phụ: tự đánh dấu, ghi chú, lịch sử */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        <span style={{ fontFamily: 'var(--v-font-body)', fontSize: 'var(--v-text-xs)', color: 'var(--v-muted)', fontWeight: 700, marginRight: 2 }}>
          Tự đánh dấu:
        </span>
        <MiniButton active={status === 'pass'} color={STATUS_COLOR.pass} disabled={busy} onClick={() => manual('pass')}>
          Đạt
        </MiniButton>
        <MiniButton active={status === 'fail'} color={STATUS_COLOR.fail} disabled={busy} onClick={() => manual('fail')}>
          Chưa đạt
        </MiniButton>
        <MiniButton active={status === 'untested'} color="var(--v-muted)" disabled={busy} onClick={() => manual('untested')}>
          Chưa test
        </MiniButton>
        {!noteOpen && (
          <button
            type="button"
            onClick={() => setNoteOpen(true)}
            style={{
              marginLeft: 'auto',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '4px 8px',
              background: 'transparent',
              border: 'none',
              color: 'var(--v-muted)',
              fontFamily: 'var(--v-font-body)',
              fontWeight: 700,
              fontSize: 'var(--v-text-xs)',
              cursor: 'pointer',
            }}
          >
            <StickyNote size={13} /> Thêm ghi chú
          </button>
        )}
      </div>

      {noteOpen && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <textarea
            value={draftNote}
            onChange={(e) => setDraftNote(e.target.value)}
            placeholder="Chỗ hay sai, mẹo, link bài đã làm…"
            rows={2}
            maxLength={1000}
            style={{
              width: '100%',
              padding: '8px 10px',
              background: 'var(--v-surface)',
              border: '1px solid var(--v-border)',
              borderRadius: 'var(--v-radius-sm)',
              color: 'var(--v-ink)',
              fontFamily: 'var(--v-font-body)',
              fontSize: 'var(--v-text-sm)',
              resize: 'vertical',
            }}
          />
          {draftNote !== note && (
            <button
              type="button"
              disabled={busy}
              onClick={() => manual(status)}
              style={{
                alignSelf: 'flex-start',
                padding: '6px 14px',
                background: 'var(--v-ink)',
                color: 'var(--v-bg)',
                border: 'none',
                borderRadius: 'var(--v-radius-sm)',
                fontFamily: 'var(--v-font-body)',
                fontWeight: 800,
                fontSize: 'var(--v-text-xs)',
                cursor: 'pointer',
              }}
            >
              Lưu ghi chú
            </button>
          )}
        </div>
      )}

      {runs && runs.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontFamily: 'var(--v-font-body)', fontSize: 'var(--v-text-xs)', color: 'var(--v-muted)', fontWeight: 700 }}>
            Các lần trước:
          </span>
          {runs.slice(0, 6).map((r) => (
            <span
              key={r.id}
              title={r.created_at.slice(0, 16).replace('T', ' ')}
              style={{
                padding: '2px 8px',
                background: r.passed ? 'var(--v-primary-soft)' : 'var(--v-red-soft)',
                color: r.passed ? 'var(--v-primary)' : 'var(--v-red)',
                borderRadius: 'var(--v-radius-pill)',
                fontFamily: 'var(--v-font-body)',
                fontWeight: 800,
                fontSize: 'var(--v-text-xs)',
              }}
            >
              {r.score}
              {r.total !== null && `/${r.total}`} · {r.created_at.slice(5, 10).split('-').reverse().join('/')}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function InfoBox({ label, accent, children }: { label: string; accent?: boolean; children: React.ReactNode }) {
  return (
    <div
      style={{
        padding: '10px 12px',
        background: accent ? 'var(--v-primary-soft)' : 'var(--v-bg)',
        borderRadius: 'var(--v-radius-sm)',
      }}
    >
      <div
        style={{
          fontFamily: 'var(--v-font-body)',
          fontSize: 'var(--v-text-xs)',
          fontWeight: 800,
          textTransform: 'uppercase',
          letterSpacing: 'var(--v-tracking-wider)',
          color: accent ? 'var(--v-primary)' : 'var(--v-muted)',
          marginBottom: 3,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: 'var(--v-font-body)',
          fontSize: 'var(--v-text-sm)',
          color: 'var(--v-ink)',
          fontWeight: accent ? 800 : 500,
          lineHeight: 1.5,
        }}
      >
        {children}
      </div>
    </div>
  );
}

function MiniButton({
  active,
  color,
  disabled,
  onClick,
  children,
}: {
  active: boolean;
  color: string;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '4px 10px',
        background: active ? color : 'transparent',
        color: active ? '#fff' : 'var(--v-ink-soft)',
        border: `1px solid ${active ? color : 'var(--v-border)'}`,
        borderRadius: 'var(--v-radius-pill)',
        fontFamily: 'var(--v-font-body)',
        fontWeight: 700,
        fontSize: 'var(--v-text-xs)',
        cursor: disabled ? 'default' : 'pointer',
      }}
    >
      {children}
    </button>
  );
}
