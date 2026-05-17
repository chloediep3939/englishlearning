export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { Flame, Play, Sparkles, BookOpen, RotateCcw, Trophy, Zap } from 'lucide-react';
import Mascot from '@/components/common/Mascot';
import ClockPill from '@/components/pomodoro/clock-pill';
import StreakBar from '@/components/dashboard/streak-bar';
import MDashboard from '@/components/app-mobile/screens/MDashboard';
import { requireUserId } from '@/lib/current-user';
import {
  flashcardsDb,
  flashcardReviewsDb,
  flashcardDecksDb,
  userSettingsDb,
  getDb,
} from '@/lib/db';

function daysAgoIso(n: number): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - n);
  // Use local YYYY-MM-DD to match SQLite date(..., 'localtime')
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default async function DashboardPage() {
  const userId = await requireUserId();
  const db = await getDb();

  const [counts, todayCount, streak, longestStreak, dueRow, activity30, decks, settings] =
    await Promise.all([
      flashcardsDb.countByStatus(userId),
      flashcardReviewsDb.getTodayCount(userId),
      flashcardReviewsDb.getStreakDays(userId),
      flashcardReviewsDb.getLongestStreak(userId),
      db
        .prepare(
          `SELECT COUNT(*) as n FROM flashcards
           WHERE user_id = ? AND status != 'mastered'
           AND (next_review_at IS NULL OR next_review_at <= datetime('now'))`
        )
        .bind(userId)
        .first<{ n: number }>(),
      flashcardReviewsDb.getActivityLastDays(userId, 30),
      flashcardDecksDb.getAllWithCounts(userId),
      userSettingsDb.getFlashcardSettings(userId),
    ]);

  const dueCount = Number(dueRow?.n) || 0;
  const total = counts.new + counts.learning + counts.review + counts.mastered;
  const goalReview = settings.daily_goal_review;
  const goalRatio = goalReview > 0 ? Math.min(1, todayCount / goalReview) : 0;

  const today = new Date();
  const monthDay = `${today.getDate()}.${today.getMonth() + 1}`;
  const weekday = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'][today.getDay()];
  const hour = today.getHours();
  const greeting =
    hour < 11 ? 'Chào buổi sáng' : hour < 14 ? 'Chào buổi trưa' : hour < 18 ? 'Chào buổi chiều' : 'Chào buổi tối';

  // Did the user review today? Used by the streak bar to render today's cell
  // as completed (check) vs pending (dashed + dot).
  const reviewedToday = todayCount > 0;

  // Decks-by-progress: show top 5 by total card count
  const topDecks = decks
    .filter((d) => d.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  return (
    <>
    <div className="md:hidden">
      <MDashboard />
    </div>
    <div className="hidden md:block">
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div className="v-eyebrow" style={{ fontSize: 11 }}>
            {weekday} {monthDay}
          </div>
          <h1
            style={{
              fontFamily: 'var(--v-font-head)',
              fontSize: 26,
              fontWeight: 900,
              lineHeight: 1.05,
              margin: '4px 0 0',
              letterSpacing: 'var(--v-tracking-tight)',
              color: 'var(--v-ink)',
            }}
          >
            {greeting}, <span style={{ color: 'var(--v-primary)' }}>bạn</span>!
          </h1>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <TopPill
            icon={<Flame size={18} color="var(--v-red)" fill={streak > 0 ? 'var(--v-red)' : 'none'} />}
            value={streak}
          />
          <ClockPill />
        </div>
      </div>

      {/* Hero — warm orange gradient */}
      <section
        style={{
          position: 'relative',
          background: 'linear-gradient(135deg, #ff8956 0%, #ffa872 100%)',
          borderRadius: 22,
          border: '1px solid rgba(60,20,5,0.2)',
          boxShadow: '0 4px 0 rgba(60,20,5,0.15), 0 8px 24px rgba(255,137,86,0.25)',
          padding: '18px 22px',
          overflow: 'hidden',
        }}
      >
        <HeroSparkles />
        <div style={{ display: 'flex', gap: 22, alignItems: 'center', position: 'relative' }}>
          <Mascot pose={streak >= 1 ? 'happy' : 'idle'} size={140} bob />
          <div style={{ flex: 1, color: '#fff', minWidth: 0 }}>
            <div
              style={{
                fontFamily: 'var(--v-font-body)',
                fontSize: 12,
                fontWeight: 800,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.85)',
              }}
            >
              {streak >= 1 ? `Đã ${streak} ngày liền — đỉnh!` : 'Hôm nay mình đợi bạn'}
            </div>
            <h2
              style={{
                fontFamily: 'var(--v-font-head)',
                fontSize: 24,
                fontWeight: 900,
                lineHeight: 1.05,
                margin: '4px 0 8px',
                letterSpacing: '-0.02em',
                textShadow: '0 2px 0 rgba(0,0,0,0.1)',
              }}
            >
              {dueCount > 0 || counts.new > 0
                ? `${dueCount} từ cần ôn · ${counts.new} từ mới`
                : 'Hôm nay không có từ nào đến hạn 🎉'}
            </h2>
            <p
              style={{
                fontFamily: 'var(--v-font-body)',
                fontSize: 12,
                fontWeight: 700,
                margin: 0,
                color: 'rgba(255,255,255,0.95)',
              }}
            >
              {dueCount === 0 && counts.new === 0
                ? 'Bún ngủ trưa tiếp đây 😴'
                : 'Học hôm nay không đau não đâu ✨'}
            </p>
            <div style={{ display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
              {dueCount > 0 && (
                <Link
                  href="/review"
                  style={{
                    padding: '11px 18px',
                    background: '#fff',
                    color: 'var(--v-primary)',
                    border: 'none',
                    boxShadow: '0 3px 0 rgba(60,20,5,0.15), 0 4px 10px rgba(40,30,15,0.08)',
                    borderRadius: 14,
                    fontFamily: 'var(--v-font-head)',
                    fontWeight: 900,
                    fontSize: 12,
                    cursor: 'pointer',
                    letterSpacing: '0.02em',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    textDecoration: 'none',
                  }}
                >
                  <Play size={13} fill="var(--v-primary)" /> ÔN NGAY · {dueCount}
                </Link>
              )}
              {counts.new > 0 && (
                <Link
                  href="/study"
                  style={{
                    padding: '11px 18px',
                    background: 'var(--v-primary)',
                    color: '#fff',
                    border: 'none',
                    boxShadow: '0 3px 0 rgba(60,20,5,0.2), 0 4px 10px rgba(122,193,67,0.5)',
                    borderRadius: 14,
                    fontFamily: 'var(--v-font-head)',
                    fontWeight: 900,
                    fontSize: 12,
                    cursor: 'pointer',
                    letterSpacing: '0.02em',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    textDecoration: 'none',
                  }}
                >
                  <BookOpen size={13} /> HỌC TỪ MỚI · {counts.new}
                </Link>
              )}
              {dueCount === 0 && counts.new === 0 && (
                <Link
                  href="/speed"
                  style={{
                    padding: '11px 18px',
                    background: '#fff',
                    color: 'var(--v-ink)',
                    border: 'none',
                    boxShadow: '0 3px 0 rgba(60,20,5,0.15)',
                    borderRadius: 14,
                    fontFamily: 'var(--v-font-head)',
                    fontWeight: 900,
                    fontSize: 12,
                    cursor: 'pointer',
                    letterSpacing: '0.02em',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    textDecoration: 'none',
                  }}
                >
                  <Zap size={13} color="var(--v-yellow-deep)" /> CHƠI FLASHCARD
                </Link>
              )}
            </div>
          </div>
          {/* Circular progress ring — today's reviews vs daily goal */}
          <div style={{ flexShrink: 0, width: 132, textAlign: 'center' }}>
            <div style={{ position: 'relative', width: 132, height: 132 }}>
              <svg viewBox="0 0 100 100" style={{ position: 'absolute', inset: 0 }}>
                <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="9" />
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  stroke="#fff"
                  strokeWidth="9"
                  strokeDasharray={`${goalRatio * 264} 264`}
                  strokeLinecap="round"
                  transform="rotate(-90 50 50)"
                />
              </svg>
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                }}
              >
                <div
                  style={{
                    fontFamily: 'var(--v-font-body)',
                    fontSize: 10,
                    fontWeight: 800,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    opacity: 0.85,
                  }}
                >
                  Mục tiêu
                </div>
                <div style={{ fontFamily: 'var(--v-font-head)', fontSize: 26, fontWeight: 900, lineHeight: 1 }}>
                  {todayCount}
                  <span style={{ opacity: 0.7, fontSize: 15 }}>/{goalReview}</span>
                </div>
                <div style={{ fontFamily: 'var(--v-font-body)', fontSize: 10, fontWeight: 700, opacity: 0.85 }}>
                  lượt ôn
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 14-day streak bar — past/today/future cells with streak # + date labels */}
      <StreakBar
        streak={streak}
        reviewedToday={reviewedToday}
        longestStreak={longestStreak}
      />

      {/* 4 stat tiles */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
        <StatTile value={counts.new}      label="Từ mới"    sub="chờ học"      color="var(--v-blue)"    icon={<Sparkles size={15} color="#fff" strokeWidth={2.6} />} />
        <StatTile value={counts.learning} label="Đang học"  sub="chưa nhuần"   color="var(--v-orange)"  icon={<BookOpen size={15} color="#fff" strokeWidth={2.6} />} />
        <StatTile value={counts.review}   label="Đang ôn"   sub="đã chín"      color="var(--v-primary)" icon={<RotateCcw size={15} color="#fff" strokeWidth={2.6} />} />
        <StatTile value={counts.mastered} label="Thuộc rồi" sub={`/ ${total} từ`} color="var(--v-purple)" icon={<Trophy size={15} color="#fff" strokeWidth={2.6} />} />
      </section>

      {/* Activity chart + decks-by-progress */}
      <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {/* 30-day activity */}
        <div className="v-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
            <h3 style={{ fontFamily: 'var(--v-font-head)', fontSize: 15, fontWeight: 900, margin: 0, color: 'var(--v-ink)' }}>
              Nhịp 30 ngày
            </h3>
            <div style={{ display: 'flex', gap: 10, fontFamily: 'var(--v-font-body)', fontSize: 11, fontWeight: 800, color: 'var(--v-ink-soft)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 10, height: 10, background: 'var(--v-blue)', borderRadius: 3 }} /> Mới
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 10, height: 10, background: 'var(--v-primary)', borderRadius: 3 }} /> Ôn
              </span>
            </div>
          </div>
          <ActivityChart data={activity30} />
        </div>

        {/* Decks */}
        <div className="v-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <h3 style={{ fontFamily: 'var(--v-font-head)', fontSize: 15, fontWeight: 900, margin: 0, color: 'var(--v-ink)' }}>
              Bộ từ
            </h3>
            <Link
              href="/decks"
              style={{
                background: 'transparent',
                border: 'none',
                fontFamily: 'var(--v-font-body)',
                fontWeight: 800,
                color: 'var(--v-primary)',
                fontSize: 12,
                textDecoration: 'none',
              }}
            >
              Xem tất cả →
            </Link>
          </div>
          {topDecks.length === 0 ? (
            <div style={{ color: 'var(--v-muted)', fontSize: 'var(--v-text-md)', padding: '8px 0' }}>
              Chưa có bộ từ nào có từ. <Link href="/add" style={{ color: 'var(--v-primary)' }}>Thêm từ →</Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {topDecks.map((d) => {
                const pct = d.total > 0 ? Math.round((d.mastered_count / d.total) * 100) : 0;
                return (
                  <Link
                    key={d.id}
                    href="/decks"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '7px 10px',
                      background: 'var(--v-panel)',
                      borderRadius: 12,
                      textDecoration: 'none',
                      color: 'var(--v-ink)',
                    }}
                  >
                    <div
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 10,
                        background: d.color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontFamily: 'var(--v-font-head)',
                        fontWeight: 900,
                        fontSize: 12,
                        color: '#fff',
                        boxShadow: `0 2px 4px ${d.color}50`,
                        flexShrink: 0,
                      }}
                    >
                      {d.name[0]?.toUpperCase() ?? '?'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontFamily: 'var(--v-font-head)',
                          fontSize: 12,
                          fontWeight: 800,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {d.name}
                      </div>
                      <div
                        style={{
                          height: 6,
                          background: '#fff',
                          border: '1px solid var(--v-border)',
                          borderRadius: 999,
                          marginTop: 4,
                          overflow: 'hidden',
                        }}
                      >
                        <div style={{ width: `${pct}%`, height: '100%', background: d.color }} />
                      </div>
                    </div>
                    <div style={{ fontFamily: 'var(--v-font-head)', fontWeight: 900, fontSize: 12, flexShrink: 0 }}>
                      {pct}%
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
    </div>
    </>
  );
}

function TopPill({ icon, value }: { icon: React.ReactNode; value: number | string }) {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '6px 12px 6px 8px',
        background: 'var(--v-surface)',
        border: '1px solid var(--v-border)',
        borderRadius: 999,
        boxShadow: 'var(--v-shadow-sm)',
        fontFamily: 'var(--v-font-head)',
        fontWeight: 900,
        fontSize: 13,
        color: 'var(--v-ink)',
      }}
    >
      {icon}
      <span>{value}</span>
    </div>
  );
}

function StatTile({
  value, label, sub, color, icon,
}: {
  value: number; label: string; sub: string; color: string; icon: React.ReactNode;
}) {
  return (
    <div
      style={{
        padding: '13px 14px',
        background: 'var(--v-surface)',
        border: '1px solid var(--v-border)',
        borderRadius: 'var(--v-radius-lg)',
        boxShadow: 'var(--v-shadow-md)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: -16,
          right: -16,
          width: 60,
          height: 60,
          borderRadius: '50%',
          background: color,
          opacity: 0.14,
        }}
      />
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 10,
          background: color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          boxShadow: `0 2px 4px ${color}40`,
        }}
      >
        {icon}
      </div>
      <div
        style={{
          fontFamily: 'var(--v-font-head)',
          fontSize: 24,
          fontWeight: 900,
          lineHeight: 1,
          color: 'var(--v-ink)',
          marginTop: 8,
          letterSpacing: '-0.02em',
          position: 'relative',
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontFamily: 'var(--v-font-body)',
          fontSize: 12,
          fontWeight: 800,
          color: 'var(--v-ink-soft)',
          marginTop: 1,
          position: 'relative',
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: 'var(--v-font-body)',
          fontSize: 11,
          fontWeight: 700,
          color: 'var(--v-muted)',
          position: 'relative',
        }}
      >
        {sub}
      </div>
    </div>
  );
}

function ActivityChart({ data }: { data: Array<{ date: string; new: number; review: number }> }) {
  // Build 30-day window with zero-filled missing days, today rightmost.
  const byDate = new Map(data.map((d) => [d.date, d]));
  const days = Array.from({ length: 30 }, (_, i) => {
    const iso = daysAgoIso(29 - i);
    const row = byDate.get(iso);
    return { iso, new: row?.new ?? 0, review: row?.review ?? 0 };
  });
  const max = Math.max(1, ...days.map((d) => d.new + d.review));
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-end',
        gap: 3,
        height: 150,
        padding: '8px 0',
      }}
    >
      {days.map((d) => {
        const totalH = ((d.new + d.review) / max) * 100;
        const newH = totalH > 0 ? (d.new / (d.new + d.review)) * totalH : 0;
        const reviewH = totalH - newH;
        return (
          <div
            key={d.iso}
            title={`${d.iso}: ${d.new} mới · ${d.review} ôn`}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'flex-end',
              height: '100%',
              minWidth: 0,
            }}
          >
            <div
              style={{
                background: 'var(--v-primary)',
                height: `${reviewH}%`,
                borderRadius: reviewH === totalH ? '3px 3px 0 0' : 0,
              }}
            />
            <div
              style={{
                background: 'var(--v-blue)',
                height: `${newH}%`,
                borderRadius: '3px 3px 0 0',
              }}
            />
          </div>
        );
      })}
    </div>
  );
}

function HeroSparkles() {
  // Decorative star polygons scattered behind the hero content.
  const stars: Array<[number, number, number]> = [
    [80, 30, 10],
    [680, 40, 8],
    [760, 160, 12],
    [60, 180, 10],
    [860, 20, 6],
  ];
  return (
    <svg
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
      viewBox="0 0 920 220"
      preserveAspectRatio="none"
    >
      {stars.map(([x, y, s], i) => (
        <polygon
          key={i}
          points={`${x},${y - s} ${x + s * 0.3},${y - s * 0.3} ${x + s},${y} ${x + s * 0.3},${y + s * 0.3} ${x},${y + s} ${x - s * 0.3},${y + s * 0.3} ${x - s},${y} ${x - s * 0.3},${y - s * 0.3}`}
          fill="#fff"
          opacity="0.4"
        />
      ))}
    </svg>
  );
}
