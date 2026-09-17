import { Map, RotateCcw, Wrench } from 'lucide-react';
import { requireUserId } from '@/lib/current-user';
import { roadmapDb, roadmapTestRunsDb } from '@/lib/roadmap/db';
import RoadmapTabs from '@/components/roadmap/RoadmapTabs';
import { STATUS_COLOR } from '@/components/roadmap/skill-meta';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function RoadmapPage({
  searchParams,
}: {
  searchParams: Promise<{ skill?: string }>;
}) {
  const userId = await requireUserId();
  const [{ skill: initialSkill }, skills, items, tools, tests, latest] = await Promise.all([
    searchParams,
    roadmapDb.listSkills(),
    // Tải cả 141 mục một lần: đổi tab là lọc ở client, không phải tải lại.
    roadmapDb.listItems(userId),
    roadmapDb.listTools(),
    roadmapDb.listItemTests(),
    roadmapTestRunsDb.latestByItem(userId),
  ]);

  const pass = items.filter((i) => i.status === 'pass').length;
  const retest = items.filter((i) => i.needs_retest).length;

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '8px 16px 48px', display: 'flex', flexDirection: 'column', gap: 22 }}>
      {/* Đầu trang: tên + một dòng tổng */}
      <header style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span
            style={{
              width: 38,
              height: 38,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'var(--v-blue)',
              borderRadius: 12,
              flexShrink: 0,
            }}
          >
            <Map size={20} color="#fff" strokeWidth={2.4} />
          </span>
          <div>
            <h1
              style={{
                margin: 0,
                fontFamily: 'var(--v-font-head)',
                fontWeight: 900,
                fontSize: 'var(--v-text-3xl)',
                letterSpacing: 'var(--v-tracking-tight)',
                color: 'var(--v-ink)',
                lineHeight: 1.1,
              }}
            >
              Lộ trình B2
            </h1>
            <div style={{ fontFamily: 'var(--v-font-body)', fontSize: 'var(--v-text-sm)', color: 'var(--v-muted)' }}>
              Test từng mục để biết mình đã vững gì, còn thiếu gì.
            </div>
          </div>
        </div>

        <div style={{ fontFamily: 'var(--v-font-body)', fontSize: 'var(--v-text-sm)', fontWeight: 700, color: 'var(--v-ink-soft)' }}>
          Tổng cộng <strong style={{ color: 'var(--v-ink)' }}>{pass}/{items.length}</strong> mục đạt
          {retest > 0 && (
            <span style={{ marginLeft: 12, display: 'inline-flex', alignItems: 'center', gap: 4, color: STATUS_COLOR.retest }}>
              <RotateCcw size={13} /> {retest} cần test lại
            </span>
          )}
        </div>
      </header>

      <RoadmapTabs
        skills={skills}
        items={items}
        initialSkill={initialSkill}
        tests={tests}
        latest={latest}
      />

      {/* Công cụ test ngoài — tra cứu, không phải việc chính nên gập lại */}
      <details
        style={{
          background: 'var(--v-surface)',
          border: '1px solid var(--v-border)',
          borderRadius: 'var(--v-radius-md)',
          padding: '12px 16px',
        }}
      >
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
          <Wrench size={15} /> Công cụ test bên ngoài ({tools.length})
        </summary>
        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {tools.map((t) => (
            <div key={t.task} style={{ display: 'flex', flexDirection: 'column', gap: 2, paddingBottom: 10, borderBottom: '1px solid var(--v-border)' }}>
              <div style={{ fontFamily: 'var(--v-font-body)', fontWeight: 800, fontSize: 'var(--v-text-sm)', color: 'var(--v-ink)' }}>
                {t.task}
              </div>
              <div style={{ fontFamily: 'var(--v-font-body)', fontSize: 'var(--v-text-sm)', color: 'var(--v-ink-soft)' }}>
                {t.tool}
              </div>
              {t.note && (
                <div style={{ fontFamily: 'var(--v-font-body)', fontSize: 'var(--v-text-xs)', color: 'var(--v-muted)' }}>
                  {t.note}
                </div>
              )}
            </div>
          ))}
        </div>
      </details>
    </div>
  );
}
