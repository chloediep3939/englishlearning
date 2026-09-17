export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { ArrowLeft, Repeat2, Mic } from 'lucide-react';
import Mascot from '@/components/common/Mascot';
import { requireUserId } from '@/lib/current-user';
import { shadowingLessonsDb } from '@/lib/db';
import type { ShadowingLesson } from '@/lib/types';

// Nhãn bậc 0..5 (khớp thang 6 bậc trong kế hoạch S3).
const LEVEL_LABELS: Record<number, string> = {
  0: 'Bậc 0 · Cặp từ',
  1: 'Bậc 1 · Cụm ngắn',
  2: 'Bậc 2 · Câu chậm',
  3: 'Bậc 3 · Câu thật',
  4: 'Bậc 4 · Ẩn chữ',
  5: 'Bậc 5 · Đoạn dài',
};

// Nhãn độ khó tính từ số từ/phút (chỉ hiện khi có wpm).
function paceLabel(wpm: number | null): string | null {
  if (wpm == null) return null;
  if (wpm < 120) return 'Chậm';
  if (wpm <= 150) return 'Vừa';
  return 'Nhanh';
}

export default async function ShadowingPage() {
  await requireUserId();
  const lessons = await shadowingLessonsDb.list();

  // Gom theo bậc, giữ thứ tự bậc tăng dần.
  const byLevel = new Map<number, ShadowingLesson[]>();
  for (const l of lessons) {
    const arr = byLevel.get(l.level) ?? [];
    arr.push(l);
    byLevel.set(l.level, arr);
  }
  const levels = [...byLevel.keys()].sort((a, b) => a - b);

  return (
    <div style={{ width: '100%' }}>
      <Link
        href="/dashboard"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          fontSize: 'var(--v-text-sm)',
          color: 'var(--v-muted)',
          textDecoration: 'none',
          marginBottom: 12,
        }}
      >
        <ArrowLeft size={14} /> Dashboard
      </Link>

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 16 }}>
        <div style={{ flex: 1 }}>
          <h1
            style={{
              fontFamily: 'var(--v-font-head)',
              fontWeight: 900,
              fontSize: 'var(--v-text-2xl)',
              color: 'var(--v-ink)',
              margin: 0,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Repeat2 size={24} color="var(--v-blue)" /> Nhại theo
          </h1>
          <p style={{ margin: '6px 0 0', color: 'var(--v-ink-soft)', fontSize: 'var(--v-text-sm)' }}>
            Nghe giọng thật rồi nhại lại từng câu. Bún chấm phát âm và chỉ chỗ cần sửa.
          </p>
        </div>
      </div>

      {lessons.length === 0 ? (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 12,
            textAlign: 'center',
            padding: '48px 16px',
          }}
        >
          <Mascot pose="sleep" size={96} />
          <p style={{ color: 'var(--v-ink-soft)', fontSize: 'var(--v-text-base)', maxWidth: 360, margin: 0 }}>
            Chưa có bài nào. Kho bài sẽ được nhập từ VOA Learning English — quay lại
            sau khi nhập xong nhé.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {levels.map((level) => (
            <section key={level}>
              <h2
                style={{
                  fontFamily: 'var(--v-font-head)',
                  fontWeight: 800,
                  fontSize: 'var(--v-text-sm)',
                  color: 'var(--v-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  margin: '0 0 10px',
                }}
              >
                {LEVEL_LABELS[level] ?? `Bậc ${level}`}
              </h2>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                  gap: 12,
                }}
              >
                {byLevel.get(level)!.map((l) => {
                  const pace = paceLabel(l.wpm);
                  return (
                    <div
                      key={l.id}
                      className="v-card"
                      style={{
                        padding: 14,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 8,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Mic size={16} color="var(--v-blue)" />
                        <span
                          style={{
                            fontFamily: 'var(--v-font-head)',
                            fontWeight: 700,
                            fontSize: 'var(--v-text-base)',
                            color: 'var(--v-ink)',
                            lineHeight: 1.25,
                          }}
                        >
                          {l.title}
                        </span>
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: 6,
                          fontSize: 'var(--v-text-xs)',
                          color: 'var(--v-muted)',
                        }}
                      >
                        {l.program && <span>{l.program}</span>}
                        {pace && (
                          <span>
                            · {pace}
                            {l.wpm ? ` (${l.wpm} từ/phút)` : ''}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
