'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, Play } from 'lucide-react';
import { apiJson } from '@/lib/common/api-json';
import type { RoadmapItemWithProgress, RoadmapLatestRun, RoadmapStatus } from '@/lib/types';
import ItemDetail from './ItemDetail';
import StatusChip from './StatusChip';

interface Props {
  item: RoadmapItemWithProgress;
  /** Mục này đã có bài kiểm tra chạy được trong app chưa. */
  hasTest: boolean;
  latest: RoadmapLatestRun | null;
  /** Mở popup làm bài. */
  onStartTest: () => void;
}

export default function RoadmapItemRow({ item, hasTest, latest, onStartTest }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<RoadmapStatus>(item.status);
  const [note, setNote] = useState(item.note ?? '');
  // Vừa đánh dấu / ghi điểm lại thì mốc 4 tuần tính từ hôm nay → tắt badge.
  const [retestDismissed, setRetestDismissed] = useState(false);
  const needsRetest = item.needs_retest && !retestDismissed && status === 'pass';

  // State cục bộ khởi tạo MỘT LẦN từ props. Lưu trong popup xong thì trang
  // router.refresh() đẩy props mới xuống — không đồng bộ lại thì chip giữ
  // nguyên màu cũ dù DB đã đổi.
  useEffect(() => {
    setStatus(item.status);
  }, [item.status]);
  useEffect(() => {
    setNote(item.note ?? '');
  }, [item.note]);

  async function saveManual(next: RoadmapStatus, nextNote: string) {
    await apiJson(`/api/roadmap/${item.item_key}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: next, note: nextNote }),
    });
    setStatus(next);
    setNote(nextNote);
    setRetestDismissed(true);
    router.refresh();
  }

  return (
    <div
      style={{
        background: 'var(--v-surface)',
        border: `1px solid ${open ? 'var(--v-ink-soft)' : 'var(--v-border)'}`,
        borderRadius: 'var(--v-radius-md)',
        transition: 'border-color 120ms var(--v-ease)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px' }}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          style={{
            flex: 1,
            minWidth: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: 0,
            background: 'transparent',
            border: 'none',
            textAlign: 'left',
            cursor: 'pointer',
          }}
        >
          <StatusChip status={status} needsRetest={needsRetest} latest={latest} unit={item.pass_unit} />
          <span
            style={{
              flex: 1,
              minWidth: 0,
              fontFamily: 'var(--v-font-body)',
              fontWeight: 700,
              fontSize: 'var(--v-text-md)',
              color: 'var(--v-ink)',
              lineHeight: 1.35,
            }}
          >
            {item.label}
          </span>
        </button>

        {hasTest && (
          <button
            type="button"
            onClick={onStartTest}
            style={{
              flexShrink: 0,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: '6px 12px',
              background: 'var(--v-primary)',
              color: '#fff',
              border: 'none',
              borderRadius: 'var(--v-radius-pill)',
              fontFamily: 'var(--v-font-body)',
              fontWeight: 800,
              fontSize: 'var(--v-text-xs)',
              cursor: 'pointer',
            }}
          >
            <Play size={12} fill="#fff" /> Làm bài
          </button>
        )}

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? 'Thu gọn' : 'Mở chi tiết'}
          style={{
            flexShrink: 0,
            width: 28,
            height: 28,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 0,
            background: 'transparent',
            border: 'none',
            color: 'var(--v-muted)',
            cursor: 'pointer',
            transform: open ? 'rotate(180deg)' : 'none',
            transition: 'transform 150ms var(--v-ease)',
          }}
        >
          <ChevronDown size={18} />
        </button>
      </div>

      {open && (
        <ItemDetail
          item={item}
          status={status}
          note={note}
          hasTest={hasTest}
          latest={latest}
          onSaveManual={saveManual}
          onScored={(passed) => {
            if (passed !== null) setStatus(passed ? 'pass' : 'fail');
            setRetestDismissed(true);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
