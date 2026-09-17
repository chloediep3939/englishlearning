'use client';

import { useMemo, useState } from 'react';
import { Info, RotateCcw } from 'lucide-react';
import type { RoadmapItemWithProgress, RoadmapLatestRun, RoadmapSkill } from '@/lib/types';
import ProgressBar from './ProgressBar';
import RoadmapChecklist from './RoadmapChecklist';
import { skillMeta, STATUS_COLOR } from './skill-meta';

interface Props {
  skills: RoadmapSkill[];
  /** Tất cả mục của cả 4 kỹ năng — lọc theo tab ở client để đổi tab không phải tải lại. */
  items: RoadmapItemWithProgress[];
  initialSkill?: string;
  /** item_key → công cụ kiểm tra có trong app. */
  tests: Record<string, string>;
  /** Lần tự kiểm gần nhất theo item_key. */
  latest: Record<string, RoadmapLatestRun>;
}

interface SkillStats {
  items: RoadmapItemWithProgress[];
  pass: number;
  fail: number;
  retest: number;
}

export default function RoadmapTabs({ skills, items, initialSkill, tests, latest }: Props) {
  const [active, setActive] = useState(
    () => skills.find((s) => s.code === initialSkill)?.code ?? skills[0]?.code ?? '',
  );

  const stats = useMemo(() => {
    const map = new Map<string, SkillStats>();
    for (const it of items) {
      let s = map.get(it.skill_code);
      if (!s) {
        s = { items: [], pass: 0, fail: 0, retest: 0 };
        map.set(it.skill_code, s);
      }
      s.items.push(it);
      if (it.status === 'pass') s.pass += 1;
      if (it.status === 'fail') s.fail += 1;
      if (it.needs_retest) s.retest += 1;
    }
    return map;
  }, [items]);

  const skill = skills.find((s) => s.code === active) ?? skills[0];
  const cur: SkillStats = stats.get(skill?.code ?? '') ?? { items: [], pass: 0, fail: 0, retest: 0 };
  const total = cur.items.length;
  const untested = total - cur.pass - cur.fail;
  const meta = skillMeta(skill?.code ?? '');

  function selectTab(code: string) {
    setActive(code);
    // Giữ ?skill= trong URL để F5 / chia sẻ link vẫn mở đúng tab, nhưng không
    // dùng router.push để tránh render lại server component mỗi lần đổi tab.
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('skill', code);
      window.history.replaceState(null, '', url.toString());
    } catch {
      /* ignore */
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Thanh tab: một hàng, gạch chân màu kỹ năng. Màn hẹp thì cuộn ngang. */}
      <div
        role="tablist"
        aria-label="Kỹ năng"
        style={{
          display: 'flex',
          gap: 4,
          borderBottom: '1px solid var(--v-border)',
          overflowX: 'auto',
          scrollbarWidth: 'none',
        }}
      >
        {skills.map((s) => {
          const st = stats.get(s.code);
          const m = skillMeta(s.code);
          const Icon = m.icon;
          const on = s.code === skill?.code;
          return (
            <button
              key={s.code}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => selectTab(s.code)}
              style={{
                flexShrink: 0,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 16px 12px',
                marginBottom: -1,
                background: 'transparent',
                border: 'none',
                borderBottom: `3px solid ${on ? m.color : 'transparent'}`,
                color: on ? 'var(--v-ink)' : 'var(--v-muted)',
                cursor: 'pointer',
                transition: 'color 120ms var(--v-ease), border-color 120ms var(--v-ease)',
              }}
            >
              <Icon size={18} color={on ? m.color : 'currentColor'} strokeWidth={2.4} />
              <span style={{ fontFamily: 'var(--v-font-head)', fontWeight: 900, fontSize: 'var(--v-text-md)' }}>{s.label}</span>
              <span
                style={{
                  padding: '1px 8px',
                  background: on ? 'var(--v-panel)' : 'transparent',
                  borderRadius: 'var(--v-radius-pill)',
                  fontFamily: 'var(--v-font-body)',
                  fontWeight: 800,
                  fontSize: 'var(--v-text-xs)',
                  color: on ? 'var(--v-ink-soft)' : 'var(--v-muted)',
                }}
              >
                {st?.pass ?? 0}/{st?.items.length ?? 0}
              </span>
              {st && st.retest > 0 && (
                <span
                  title={`${st.retest} mục cần test lại`}
                  style={{ width: 7, height: 7, borderRadius: '50%', background: STATUS_COLOR.retest }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Tiến độ của kỹ năng đang chọn — tách khỏi tab, nằm ngay dưới */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <ProgressBar pass={cur.pass} fail={cur.fail} untested={untested} height={8} />
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: '4px 16px',
            fontFamily: 'var(--v-font-body)',
            fontSize: 'var(--v-text-sm)',
            fontWeight: 700,
            color: 'var(--v-ink-soft)',
          }}
        >
          <span>
            <strong style={{ color: meta.color, fontSize: 'var(--v-text-md)' }}>{cur.pass}</strong>/{total} mục đạt
          </span>
          <Legend color={STATUS_COLOR.fail} label={`${cur.fail} chưa đạt`} />
          <Legend color="var(--v-border)" label={`${untested} chưa test`} />
          {cur.retest > 0 && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: STATUS_COLOR.retest }}>
              <RotateCcw size={13} /> {cur.retest} cần test lại
            </span>
          )}
        </div>
      </div>

      {skill?.note && (
        <details style={{ background: 'var(--v-panel)', borderRadius: 'var(--v-radius-md)', padding: '10px 14px' }}>
          <summary
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              cursor: 'pointer',
              fontFamily: 'var(--v-font-body)',
              fontWeight: 800,
              fontSize: 'var(--v-text-sm)',
              color: 'var(--v-ink-soft)',
              listStyle: 'none',
            }}
          >
            <Info size={15} style={{ color: meta.color, flexShrink: 0 }} />
            Lưu ý khi test kỹ năng {skill.label.toLowerCase()}
          </summary>
          <p style={{ margin: '8px 0 2px 23px', fontFamily: 'var(--v-font-body)', fontSize: 'var(--v-text-sm)', color: 'var(--v-ink-soft)', lineHeight: 1.55 }}>
            {skill.note}
          </p>
        </details>
      )}

      {/* key = code để bộ lọc trong checklist reset khi đổi kỹ năng */}
      <RoadmapChecklist key={skill?.code} items={cur.items} tests={tests} latest={latest} />
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <span style={{ width: 9, height: 9, borderRadius: 3, background: color }} />
      {label}
    </span>
  );
}
