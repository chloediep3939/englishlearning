'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Search, X } from 'lucide-react';
import { apiJson } from '@/lib/common/api-json';
import { presetListMeta } from './preset-meta';

interface Hit {
  english: string;
  vietnamese: string;
  part_of_speech: string | null;
  level_code: string;
  level_label: string;
  list_code: string;
}

/**
 * Ô tìm kiếm toàn thư viện: gõ từ/cụm hoặc nghĩa → danh sách kết quả, bấm vào
 * mở đúng nhóm chứa nó (kèm ?q= để nhóm tự lọc sẵn).
 */
export default function PresetLibrarySearch() {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<Hit[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setHits([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const data = await apiJson<{ results: Hit[] }>(`/api/preset-levels/search?q=${encodeURIComponent(term)}`);
        setHits(data.results ?? []);
        setOpen(true);
      } catch {
        setHits([]);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  // Đóng dropdown khi bấm ra ngoài.
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  return (
    <div ref={boxRef} style={{ position: 'relative', maxWidth: 520 }}>
      <label
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '9px 12px',
          background: 'var(--v-surface)',
          border: '1px solid var(--v-border)',
          borderRadius: 'var(--v-radius-md)',
          boxShadow: 'var(--v-shadow-sm)',
          color: 'var(--v-muted)',
        }}
      >
        <Search size={16} />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => hits.length > 0 && setOpen(true)}
          placeholder="Tìm từ / cụm / nghĩa trong toàn thư viện…"
          style={{
            flex: 1,
            minWidth: 0,
            border: 'none',
            outline: 'none',
            background: 'transparent',
            fontFamily: 'var(--v-font-body)',
            fontSize: 'var(--v-text-sm)',
            color: 'var(--v-ink)',
          }}
        />
        {loading && <Loader2 size={15} className="animate-spin" />}
        {!loading && q && (
          <button type="button" onClick={() => setQ('')} aria-label="Xoá" style={{ display: 'inline-flex', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--v-muted)' }}>
            <X size={15} />
          </button>
        )}
      </label>

      {open && q.trim().length >= 2 && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            right: 0,
            zIndex: 20,
            maxHeight: 380,
            overflowY: 'auto',
            background: 'var(--v-surface)',
            border: '1px solid var(--v-border-med)',
            borderRadius: 'var(--v-radius-md)',
            boxShadow: 'var(--v-shadow-lg)',
          }}
        >
          {hits.length === 0 && !loading ? (
            <div style={{ padding: '14px 16px', fontFamily: 'var(--v-font-body)', fontSize: 'var(--v-text-sm)', color: 'var(--v-muted)' }}>
              Không tìm thấy “{q.trim()}”.
            </div>
          ) : (
            hits.map((h, i) => {
              const meta = presetListMeta(h.list_code);
              return (
                <button
                  key={`${h.level_code}-${h.english}-${i}`}
                  type="button"
                  onClick={() => router.push(`/decks/library/${h.level_code}?q=${encodeURIComponent(h.english)}`)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    width: '100%',
                    padding: '9px 14px',
                    background: 'transparent',
                    border: 'none',
                    borderBottom: '1px solid var(--v-border)',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <span style={{ minWidth: 0, flex: 1 }}>
                    <span style={{ fontFamily: 'var(--v-font-head)', fontWeight: 800, fontSize: 'var(--v-text-sm)', color: 'var(--v-ink)' }}>{h.english}</span>
                    <span style={{ fontFamily: 'var(--v-font-body)', fontSize: 'var(--v-text-xs)', color: 'var(--v-muted)' }}> — {h.vietnamese}</span>
                  </span>
                  <span
                    style={{
                      flexShrink: 0,
                      fontFamily: 'var(--v-font-body)',
                      fontSize: 'var(--v-text-2xs)',
                      fontWeight: 800,
                      color: meta.color,
                    }}
                  >
                    {meta.short}
                  </span>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
