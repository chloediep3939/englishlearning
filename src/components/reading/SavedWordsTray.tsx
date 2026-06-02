'use client';

import Link from 'next/link';
import { Folder } from 'lucide-react';
import type { KaraokeEngine } from '@/lib/reading/use-karaoke';
import type { DeckOption } from '@/components/reading/ReadAlong';

/**
 * Saved-words tray. Shows the count + chips of words picked this session, a deck
 * picker (which deck new words save into), and an "Ôn ngay →" CTA to study the
 * deck (session tracking deferred — the link goes straight to /study?deck_id=X).
 */
export default function SavedWordsTray({
  k,
  deckId,
  decks,
  onDeckChange,
}: {
  k: KaraokeEngine;
  deckId: number | null;
  decks: DeckOption[];
  onDeckChange: (id: number) => void;
}) {
  const count = k.saved.length;
  return (
    <div
      style={{
        background: 'var(--v-surface)',
        border: '1px solid var(--v-border)',
        boxShadow: 'var(--v-shadow-md)',
        borderRadius: 18,
        padding: '14px 16px',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: count ? 10 : 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: 9,
              background: 'var(--v-pink)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 4px color-mix(in srgb, var(--v-pink) 55%, transparent)',
            }}
          >
            <Folder size={14} color="#fff" strokeWidth={2.4} />
          </div>
          <div>
            <div style={{ fontFamily: 'var(--v-font-head)', fontSize: 13, fontWeight: 900, color: 'var(--v-ink)' }}>
              Đã nhặt {count} từ
            </div>
            <div style={{ fontFamily: 'var(--v-font-body)', fontSize: 10.5, fontWeight: 700, color: 'var(--v-muted)' }}>
              vào bộ từ:
            </div>
          </div>
        </div>
        {count > 0 && deckId != null && (
          <Link
            href={`/study?deck_id=${deckId}`}
            style={{
              padding: '7px 12px',
              background: 'var(--v-pink)',
              color: '#fff',
              border: 'none',
              borderRadius: 10,
              boxShadow: '0 3px 0 rgba(80,20,50,.18)',
              fontFamily: 'var(--v-font-head)',
              fontWeight: 900,
              fontSize: 11,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              textDecoration: 'none',
            }}
          >
            Ôn ngay →
          </Link>
        )}
      </div>

      {/* Deck picker — which deck new words save into (E5.5). */}
      {decks.length > 0 && (
        <select
          value={deckId ?? ''}
          onChange={(e) => onDeckChange(Number(e.target.value))}
          aria-label="Chọn bộ từ để lưu"
          style={{
            width: '100%',
            marginBottom: 10,
            padding: '8px 10px',
            borderRadius: 10,
            border: '1px solid var(--v-border)',
            background: 'var(--v-panel)',
            color: 'var(--v-ink)',
            fontFamily: 'var(--v-font-head)',
            fontWeight: 800,
            fontSize: 12,
            cursor: 'pointer',
          }}
        >
          {decks.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      )}

      {count === 0 ? (
        <div
          style={{
            fontFamily: 'var(--v-font-body)',
            fontSize: 11.5,
            fontWeight: 700,
            color: 'var(--v-muted)',
            lineHeight: 1.5,
            paddingTop: 8,
          }}
        >
          Chưa có từ nào. Chạm một từ rồi bấm <b style={{ color: 'var(--v-ink)' }}>＋ Lưu vào bộ từ</b>.
        </div>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {k.saved.map((w) => (
            <span
              key={w.clean}
              title={w.vi}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '5px 10px',
                background: 'var(--v-panel)',
                border: '1px solid var(--v-border)',
                borderRadius: 999,
                fontFamily: 'var(--v-font-body)',
                fontSize: 12,
                fontWeight: 800,
                color: 'var(--v-ink)',
              }}
            >
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--v-pink)' }} />
              {w.raw}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
