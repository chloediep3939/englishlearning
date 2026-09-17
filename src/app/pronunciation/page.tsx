export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { AudioLines, ArrowLeft, Check, SplitSquareHorizontal, Mic } from 'lucide-react';
import Mascot from '@/components/common/Mascot';
import { requireUserId } from '@/lib/current-user';
import { pronunciationProgressDb } from '@/lib/db';
import { getGroups, GROUP_META, soundCount } from '@/lib/pronunciation/catalog';

export default async function PronunciationOverviewPage() {
  const userId = await requireUserId();
  const progress = await pronunciationProgressDb.getAll(userId);
  const bySlug = new Map(progress.map((p) => [p.sound_slug, p]));
  const completedCount = progress.filter((p) => p.completed).length;
  const total = soundCount();
  const groups = getGroups();

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

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 8 }}>
        <div style={{ flex: 1 }}>
          <h1
            style={{
              fontFamily: 'var(--v-font-head)',
              fontWeight: 900,
              fontSize: 'var(--v-text-3xl)',
              letterSpacing: 'var(--v-tracking-tight)',
              margin: '0 0 6px',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              color: 'var(--v-ink)',
            }}
          >
            <AudioLines size={24} style={{ color: 'var(--v-purple)' }} /> Phát âm 44 âm
          </h1>
          <p
            style={{
              color: 'var(--v-muted)',
              margin: 0,
              fontFamily: 'var(--v-font-body)',
              fontSize: 'var(--v-text-md)',
            }}
          >
            Học từng âm IPA: xem khẩu hình, nghe ví dụ, đọc và để mình chấm, rồi so sánh các cặp từ.
          </p>
        </div>
        <div style={{ flexShrink: 0 }}>
          <Mascot pose="idle" size={72} bob />
        </div>
      </div>

      {/* Progress + shortcuts */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 10,
          alignItems: 'center',
          marginBottom: 22,
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 14px',
            background: 'var(--v-surface)',
            border: '1px solid var(--v-border)',
            borderRadius: 'var(--v-radius-pill)',
            fontFamily: 'var(--v-font-head)',
            fontWeight: 800,
            fontSize: 'var(--v-text-sm)',
            color: 'var(--v-ink-soft)',
          }}
        >
          <Check size={15} style={{ color: 'var(--v-primary)' }} />
          Đã học {completedCount}/{total} âm
        </div>

        <Link
          href="/pronunciation/minimal-pairs"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 14px',
            background: 'var(--v-purple)',
            color: '#fff',
            borderRadius: 'var(--v-radius-pill)',
            textDecoration: 'none',
            fontFamily: 'var(--v-font-head)',
            fontWeight: 800,
            fontSize: 'var(--v-text-sm)',
            boxShadow: 'var(--v-shadow-sm)',
          }}
        >
          <SplitSquareHorizontal size={15} /> So sánh cặp từ
        </Link>

        <Link
          href="/pronounce"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 14px',
            background: 'var(--v-surface)',
            color: 'var(--v-ink-soft)',
            border: '1px solid var(--v-border)',
            borderRadius: 'var(--v-radius-pill)',
            textDecoration: 'none',
            fontFamily: 'var(--v-font-head)',
            fontWeight: 800,
            fontSize: 'var(--v-text-sm)',
          }}
        >
          <Mic size={15} style={{ color: 'var(--v-red)' }} /> Luyện đọc từ flashcards
        </Link>
      </div>

      {groups.map(({ group, sounds }) => {
        const meta = GROUP_META[group];
        return (
          <section key={group} style={{ marginBottom: 26 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 12 }}>
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 3,
                  background: meta.color,
                  display: 'inline-block',
                }}
              />
              <h2
                style={{
                  fontFamily: 'var(--v-font-head)',
                  fontWeight: 900,
                  fontSize: 'var(--v-text-xl)',
                  color: 'var(--v-ink)',
                  margin: 0,
                }}
              >
                {meta.label}
              </h2>
              <span style={{ color: 'var(--v-muted)', fontSize: 'var(--v-text-sm)' }}>
                {meta.sub} · {sounds.length}
              </span>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
                gap: 10,
              }}
            >
              {sounds.map((s) => {
                const p = bySlug.get(s.slug);
                const done = p?.completed ?? false;
                return (
                  <Link
                    key={s.slug}
                    href={`/pronunciation/${s.slug}`}
                    style={{
                      position: 'relative',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 4,
                      padding: '16px 10px 12px',
                      background: 'var(--v-surface)',
                      border: `1px solid ${done ? meta.color : 'var(--v-border)'}`,
                      borderRadius: 'var(--v-radius-md)',
                      textDecoration: 'none',
                      boxShadow: 'var(--v-shadow-sm)',
                    }}
                  >
                    {done && (
                      <span
                        style={{
                          position: 'absolute',
                          top: 6,
                          right: 6,
                          width: 18,
                          height: 18,
                          borderRadius: '50%',
                          background: 'var(--v-primary)',
                          color: '#fff',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Check size={12} strokeWidth={3} />
                      </span>
                    )}
                    <span
                      style={{
                        fontFamily: 'var(--v-font-mono)',
                        fontSize: 'var(--v-text-2xl)',
                        fontWeight: 700,
                        color: meta.color,
                      }}
                    >
                      /{s.ipa}/
                    </span>
                    <span
                      style={{
                        fontFamily: 'var(--v-font-body)',
                        fontSize: 'var(--v-text-xs)',
                        color: 'var(--v-muted)',
                        textAlign: 'center',
                      }}
                    >
                      {s.examples[0]?.word ?? ''}
                    </span>
                    {p?.best_score != null && (
                      <span
                        style={{
                          fontFamily: 'var(--v-font-head)',
                          fontSize: 'var(--v-text-xs)',
                          fontWeight: 800,
                          color: 'var(--v-ink-soft)',
                        }}
                      >
                        {p.best_score}/100
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
