'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { RoadmapItemWithProgress, RoadmapLatestRun } from '@/lib/types';
import RoadmapItemRow from './RoadmapItemRow';
import { TEST_SESSIONS } from './test-sessions';
import { STATUS_COLOR } from './skill-meta';

// Không có "Chưa test": khi chưa đánh dấu gì nó trùng hệt "Tất cả".
type Filter = 'all' | 'todo' | 'retest' | 'pass';

const FILTERS: Array<{ value: Filter; label: string; color: string }> = [
  { value: 'all', label: 'Tất cả', color: 'var(--v-ink)' },
  { value: 'todo', label: 'Chưa đạt', color: STATUS_COLOR.fail },
  { value: 'retest', label: 'Cần test lại', color: STATUS_COLOR.retest },
  { value: 'pass', label: 'Đã đạt', color: STATUS_COLOR.pass },
];

function matches(item: RoadmapItemWithProgress, filter: Filter): boolean {
  switch (filter) {
    case 'todo':
      return item.status === 'fail';
    case 'retest':
      return item.needs_retest;
    case 'pass':
      return item.status === 'pass';
    default:
      return true;
  }
}

interface Props {
  items: RoadmapItemWithProgress[];
  /** item_key → công cụ ('T1' bộ từ, 'T8' nghe cặp từ). Không có key = chưa có bài. */
  tests: Record<string, string>;
  latest: Record<string, RoadmapLatestRun>;
}

export default function RoadmapChecklist({ items, tests, latest }: Props) {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>('all');
  // Một popup duy nhất cho cả danh sách, không phải mỗi hàng một cái.
  const [testing, setTesting] = useState<RoadmapItemWithProgress | null>(null);

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { all: items.length, todo: 0, retest: 0, pass: 0 };
    for (const it of items) {
      if (it.status === 'fail') c.todo += 1;
      if (it.needs_retest) c.retest += 1;
      if (it.status === 'pass') c.pass += 1;
    }
    return c;
  }, [items]);

  // Giữ thứ tự nhóm theo position (items đã sort sẵn ở DB). Đếm tiến độ nhóm
  // trên TOÀN BỘ mục của nhóm, không phải phần còn lại sau khi lọc.
  const groups = useMemo(() => {
    const all: Array<{ name: string; total: number; passed: number; shown: RoadmapItemWithProgress[] }> = [];
    for (const it of items) {
      let g = all[all.length - 1];
      if (!g || g.name !== it.group_name) {
        g = { name: it.group_name, total: 0, passed: 0, shown: [] };
        all.push(g);
      }
      g.total += 1;
      if (it.status === 'pass') g.passed += 1;
      if (matches(it, filter)) g.shown.push(it);
    }
    return all.filter((g) => g.shown.length > 0);
  }, [items, filter]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div
        role="tablist"
        style={{
          display: 'inline-flex',
          alignSelf: 'flex-start',
          flexWrap: 'wrap',
          gap: 2,
          padding: 3,
          background: 'var(--v-panel)',
          borderRadius: 'var(--v-radius-pill)',
        }}
      >
        {FILTERS.map((f) => {
          const active = filter === f.value;
          const n = counts[f.value];
          return (
            <button
              key={f.value}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setFilter(f.value)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                background: active ? 'var(--v-surface)' : 'transparent',
                boxShadow: active ? 'var(--v-shadow-sm)' : 'none',
                color: active ? f.color : 'var(--v-muted)',
                border: 'none',
                borderRadius: 'var(--v-radius-pill)',
                fontFamily: 'var(--v-font-body)',
                fontWeight: 800,
                fontSize: 'var(--v-text-sm)',
                cursor: 'pointer',
              }}
            >
              {f.label}
              <span style={{ opacity: n === 0 ? 0.45 : 0.8, fontWeight: 700 }}>{n}</span>
            </button>
          );
        })}
      </div>

      {groups.length === 0 ? (
        <div
          style={{
            padding: 28,
            textAlign: 'center',
            background: 'var(--v-panel)',
            borderRadius: 'var(--v-radius-md)',
            color: 'var(--v-muted)',
            fontFamily: 'var(--v-font-body)',
            fontSize: 'var(--v-text-md)',
          }}
        >
          Không có mục nào ở đây.
        </div>
      ) : (
        groups.map((g) => (
          <section key={g.name} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
              <h2
                style={{
                  margin: 0,
                  fontFamily: 'var(--v-font-head)',
                  fontWeight: 900,
                  fontSize: 'var(--v-text-md)',
                  color: 'var(--v-ink)',
                }}
              >
                {g.name}
              </h2>
              <span
                style={{
                  flexShrink: 0,
                  fontFamily: 'var(--v-font-body)',
                  fontWeight: 800,
                  fontSize: 'var(--v-text-xs)',
                  color: g.passed === g.total ? STATUS_COLOR.pass : 'var(--v-muted)',
                }}
              >
                {g.passed}/{g.total} đạt
              </span>
            </div>
            {g.shown.map((it) => (
              <RoadmapItemRow
                key={it.item_key}
                item={it}
                hasTest={it.item_key in tests}
                latest={latest[it.item_key] ?? null}
                onStartTest={() => setTesting(it)}
              />
            ))}
          </section>
        ))
      )}

      {testing &&
        (() => {
          const Session = TEST_SESSIONS[tests[testing.item_key]];
          return Session ? (
            <Session
              key={testing.item_key}
              variant="modal"
              itemKey={testing.item_key}
              itemLabel={testing.label}
              passWhen={testing.pass_when}
              threshold={testing}
              onClose={() => setTesting(null)}
              onSaved={() => router.refresh()}
            />
          ) : null;
        })()}
    </div>
  );
}
