import Link from 'next/link';
import { ArrowLeft, Library } from 'lucide-react';
import { requireUserId } from '@/lib/current-user';
import { presetDecksDb } from '@/lib/preset-decks/db';
import PresetLevelCard from '@/components/preset-decks/PresetLevelCard';
import PresetLibrarySearch from '@/components/preset-decks/PresetLibrarySearch';
import { presetListMeta } from '@/components/preset-decks/preset-meta';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function PresetLibraryPage() {
  const userId = await requireUserId();
  const levels = await presetDecksDb.listLevels(userId);
  const lists = ['ngsl', 'awl', 'colloc'].filter((code) => levels.some((l) => l.list_code === code));

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 32 }}>
      <header>
        <Link
          href="/decks"
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
          <ArrowLeft size={14} /> Bộ từ
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
              background: 'var(--v-primary)',
              borderRadius: 14,
              boxShadow: 'var(--v-press)',
            }}
          >
            <Library size={24} color="#fff" strokeWidth={2.4} />
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
              Thư viện bộ từ
            </h1>
            <p style={{ margin: '4px 0 0', fontFamily: 'var(--v-font-body)', fontSize: 'var(--v-text-md)', color: 'var(--v-muted)' }}>
              Từ vựng soạn sẵn theo level — nghĩa, ví dụ, collocation, phát âm và hình. Chọn từ, tự chia bộ, lấy về học.
            </p>
          </div>
        </div>
      </header>

      {lists.length > 0 && <PresetLibrarySearch />}

      {lists.map((code) => {
        const meta = presetListMeta(code);
        const listLevels = levels.filter((l) => l.list_code === code);
        const total = listLevels.reduce((a, l) => a + l.card_count, 0);
        return (
          <section key={code} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <span
                style={{
                  width: 34,
                  height: 34,
                  flexShrink: 0,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: meta.soft,
                  color: meta.color,
                  borderRadius: 10,
                }}
              >
                <meta.Icon size={18} strokeWidth={2.4} />
              </span>
              <div style={{ minWidth: 0 }}>
                <h2
                  style={{
                    margin: 0,
                    fontFamily: 'var(--v-font-head)',
                    fontWeight: 900,
                    fontSize: 'var(--v-text-xl)',
                    color: 'var(--v-ink)',
                    display: 'flex',
                    alignItems: 'baseline',
                    gap: 8,
                  }}
                >
                  {meta.title}
                  <span style={{ fontFamily: 'var(--v-font-body)', fontSize: 'var(--v-text-sm)', fontWeight: 700, color: 'var(--v-muted)' }}>
                    {total} từ sẵn sàng
                  </span>
                </h2>
                <div style={{ fontFamily: 'var(--v-font-body)', fontSize: 'var(--v-text-sm)', color: 'var(--v-muted)', marginTop: 2 }}>
                  {meta.hint}
                </div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 12 }}>
              {listLevels.map((level) => (
                <PresetLevelCard key={level.code} level={level} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
