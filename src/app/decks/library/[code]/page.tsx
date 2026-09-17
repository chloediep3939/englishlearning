import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { requireUserId } from '@/lib/current-user';
import { flashcardDecksDb } from '@/lib/db';
import { presetDecksDb } from '@/lib/preset-decks/db';
import PresetLevelClient from '@/components/preset-decks/PresetLevelClient';
import { presetListMeta } from '@/components/preset-decks/preset-meta';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function PresetLevelPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { code } = await params;
  const { q } = await searchParams;
  const userId = await requireUserId();
  const [level, userDecks] = await Promise.all([
    presetDecksDb.getLevel(userId, code),
    flashcardDecksDb.getAll(userId),
  ]);
  if (!level || level.cards.length === 0) notFound();

  const meta = presetListMeta(level.list_code);
  const owned = level.cards.filter((c) => c.owned_in).length;

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <header>
        <Link
          href="/decks/library"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            fontSize: 'var(--v-text-sm)',
            color: 'var(--v-muted)',
            textDecoration: 'none',
            marginBottom: 14,
          }}
        >
          <ArrowLeft size={14} /> Thư viện bộ từ
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span
            style={{
              width: 48,
              height: 48,
              flexShrink: 0,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: meta.soft,
              color: meta.color,
              borderRadius: 14,
            }}
          >
            <meta.Icon size={24} strokeWidth={2.4} />
          </span>
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontFamily: 'var(--v-font-body)',
                fontSize: 'var(--v-text-xs)',
                fontWeight: 800,
                letterSpacing: 'var(--v-tracking-wide)',
                textTransform: 'uppercase',
                color: meta.color,
              }}
            >
              {meta.title} · {meta.short}
            </div>
            <h1
              style={{
                margin: '2px 0 0',
                fontFamily: 'var(--v-font-head)',
                fontWeight: 900,
                fontSize: 'var(--v-text-3xl)',
                letterSpacing: 'var(--v-tracking-tight)',
                color: 'var(--v-ink)',
                lineHeight: 1.1,
              }}
            >
              {level.label}
            </h1>
          </div>
        </div>
        <p style={{ margin: '10px 0 0', fontFamily: 'var(--v-font-body)', fontSize: 'var(--v-text-sm)', color: 'var(--v-muted)' }}>
          {level.cards.length} từ · bạn đã có {owned} · mỗi từ có nghĩa, 3 câu ví dụ, collocation và phát âm. Tick từ muốn học, chọn
          số từ mỗi bộ rồi lấy về.
          {level.list_code === 'ngsl' && (
            <> Đã lược bỏ các từ chức năng (the, of, he, can, two…) vì không cần học bằng thẻ.</>
          )}
        </p>
      </header>

      <PresetLevelClient
        level={level}
        userDecks={userDecks.map((d) => ({ id: d.id, name: d.name }))}
        initialQuery={typeof q === 'string' ? q : ''}
      />
    </div>
  );
}
