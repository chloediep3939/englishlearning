'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Search, X } from 'lucide-react';
import { apiJson } from '@/lib/common/api-json';
import type { PresetLevelDetail } from '@/lib/types';
import PresetWordRow, { PresetWordHeader, WORD_TABLE_MIN_WIDTH, type SortDir, type SortKey } from './PresetWordRow';
import PresetTakeBar, { TAKE_BAR_SPACE, type TakeTarget } from './PresetTakeBar';

interface Props {
  level: PresetLevelDetail;
  userDecks: { id: number; name: string }[];
  /** Lọc sẵn khi mở từ ô tìm kiếm toàn thư viện (?q=). */
  initialQuery?: string;
}

interface CopyResult {
  results: { deck_id: number; deck_name: string; inserted: number; skipped_dupe: number }[];
  total_inserted: number;
  total_skipped_dupe: number;
}

type Filter = 'all' | 'new' | 'owned';

const pill = (active: boolean): React.CSSProperties => ({
  padding: '6px 12px',
  borderRadius: 'var(--v-radius-pill)',
  border: `1px solid ${active ? 'var(--v-ink)' : 'var(--v-border)'}`,
  background: active ? 'var(--v-ink)' : 'var(--v-surface)',
  color: active ? 'var(--v-surface)' : 'var(--v-ink-soft)',
  fontFamily: 'var(--v-font-body)',
  fontWeight: 800,
  fontSize: 'var(--v-text-xs)',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
});

const ghostBtn: React.CSSProperties = {
  padding: '6px 12px',
  borderRadius: 'var(--v-radius-md)',
  border: '1px solid var(--v-border)',
  background: 'var(--v-surface)',
  color: 'var(--v-ink-soft)',
  fontFamily: 'var(--v-font-head)',
  fontWeight: 800,
  fontSize: 'var(--v-text-xs)',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
};

/**
 * Trang một level: liệt kê hết từ, lọc/tìm, chọn từng từ hoặc "chọn nhanh N từ
 * chưa có", rồi lấy về — tạo các bộ mới theo số từ mỗi bộ user gõ, hoặc thêm
 * vào một bộ đang có. Bộ gốc không đổi; server chép từ đã chọn.
 */
export default function PresetLevelClient({ level, userDecks, initialQuery = '' }: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  // Mở từ ô tìm kiếm (?q=) thì bắt đầu ở bộ lọc "Tất cả" để không giấu từ đã có.
  const [filter, setFilter] = useState<Filter>(initialQuery ? 'all' : 'new');
  const [query, setQuery] = useState(initialQuery);
  const [openWord, setOpenWord] = useState<string | null>(null);
  // Thanh "Lấy về" là position: fixed → đo vùng nội dung để khớp mép trái/phải
  // (sidebar thu gọn / mở rộng làm lệch nếu dùng left cố định).
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [box, setBox] = useState<{ left: number; width: number } | null>(null);
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      setBox({ left: r.left, width: r.width });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, []);
  const [quickN, setQuickN] = useState(20);
  // null = thứ tự soạn của level (với NGSL trùng thứ hạng).
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [target, setTarget] = useState<TakeTarget>({ mode: 'new', perDeck: 20 });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CopyResult | null>(null);

  const ownedCount = level.cards.filter((c) => c.owned_in).length;
  const newCount = level.cards.length - ownedCount;
  // Cột "Thông dụng" (thứ hạng NGSL) chỉ có nghĩa với danh sách NGSL.
  const showFrequency = level.list_code === 'ngsl';

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = level.cards.filter((c) => {
      if (filter === 'new' && c.owned_in) return false;
      if (filter === 'owned' && !c.owned_in) return false;
      if (!q) return true;
      return c.english.toLowerCase().includes(q) || c.vietnamese.toLowerCase().includes(q);
    });
    if (!sortKey) return rows;
    const sign = sortDir === 'asc' ? 1 : -1;
    const text = (c: (typeof rows)[number]): string =>
      sortKey === 'english' ? c.english : sortKey === 'ipa' ? c.ipa ?? '' : sortKey === 'pos' ? c.part_of_speech ?? '' : c.vietnamese;
    return [...rows].sort((a, b) => {
      if (sortKey === 'rank') {
        // Từ ngoài NGSL luôn nằm cuối, dù sắp xếp chiều nào.
        if (a.ngsl_rank === null || b.ngsl_rank === null) {
          return a.ngsl_rank === b.ngsl_rank ? 0 : a.ngsl_rank === null ? 1 : -1;
        }
        return sign * (a.ngsl_rank - b.ngsl_rank);
      }
      const ta = text(a);
      const tb = text(b);
      // Ô trống xếp cuối.
      if (!ta || !tb) return ta === tb ? 0 : !ta ? 1 : -1;
      return sign * ta.localeCompare(tb, sortKey === 'vietnamese' ? 'vi' : 'en');
    });
  }, [level.cards, filter, query, sortKey, sortDir]);

  function sortBy(key: SortKey) {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDir('asc');
    } else if (sortDir === 'asc') {
      setSortDir('desc');
    } else {
      setSortKey(null); // bấm lần 3: về thứ tự gốc
    }
  }

  // Gửi theo thứ tự của level, không theo thứ tự bấm.
  const selectedWords = useMemo(
    () => level.cards.filter((c) => selected.has(c.english)).map((c) => c.english),
    [level.cards, selected],
  );
  const allVisibleSelected = visible.length > 0 && visible.every((c) => selected.has(c.english));
  const someVisibleSelected = visible.some((c) => selected.has(c.english));

  function toggle(word: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(word)) next.delete(word);
      else next.add(word);
      return next;
    });
  }

  function toggleVisible() {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const c of visible) {
        if (allVisibleSelected) next.delete(c.english);
        else next.add(c.english);
      }
      return next;
    });
  }

  /** Chọn thêm N từ chưa có, chưa chọn, theo thứ tự level. */
  function quickPick() {
    const n = Math.max(1, Math.floor(quickN) || 0);
    setSelected((prev) => {
      const next = new Set(prev);
      let added = 0;
      for (const c of level.cards) {
        if (added >= n) break;
        if (c.owned_in || next.has(c.english)) continue;
        next.add(c.english);
        added++;
      }
      return next;
    });
  }

  async function submit() {
    if (selectedWords.length === 0 || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const data = await apiJson<CopyResult>(`/api/preset-levels/${level.code}/copy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          words: selectedWords,
          target: target.mode === 'new' ? { mode: 'new', per_deck: target.perDeck } : { mode: 'existing', deck_id: target.deckId },
        }),
      });
      setResult(data);
      setSelected(new Set());
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không lấy được từ, thử lại nhé.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      ref={rootRef}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        // Chừa chỗ cho thanh "Lấy về" cố định ở đáy để hàng cuối không bị che.
        paddingBottom: selectedWords.length > 0 ? TAKE_BAR_SPACE : 0,
      }}
    >
      {result && (
        <div
          style={{
            display: 'flex',
            gap: 12,
            alignItems: 'flex-start',
            padding: '14px 16px',
            background: 'var(--v-primary-soft)',
            border: '1px solid var(--v-primary)',
            borderRadius: 'var(--v-radius-lg)',
          }}
        >
          <CheckCircle2 size={22} style={{ color: 'var(--v-primary)', flexShrink: 0, marginTop: 1 }} />
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ fontFamily: 'var(--v-font-head)', fontWeight: 900, fontSize: 'var(--v-text-md)', color: 'var(--v-ink)' }}>
              Đã lấy {result.total_inserted} từ về {result.results.length > 1 ? `${result.results.length} bộ` : 'bộ của bạn'}
              {result.total_skipped_dupe > 0 && (
                <span style={{ fontFamily: 'var(--v-font-body)', fontWeight: 700, fontSize: 'var(--v-text-sm)', color: 'var(--v-muted)' }}>
                  {' '}· bỏ qua {result.total_skipped_dupe} từ trùng
                </span>
              )}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {result.results.map((r) => (
                <Link
                  key={r.deck_id}
                  href={`/decks/${r.deck_id}`}
                  style={{
                    padding: '4px 10px',
                    background: 'var(--v-surface)',
                    border: '1px solid var(--v-border)',
                    borderRadius: 'var(--v-radius-pill)',
                    fontFamily: 'var(--v-font-body)',
                    fontWeight: 800,
                    fontSize: 'var(--v-text-xs)',
                    color: 'var(--v-primary-deep)',
                    textDecoration: 'none',
                  }}
                >
                  {r.deck_name} · {r.inserted} từ →
                </Link>
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setResult(null)}
            aria-label="Đóng"
            style={{ display: 'inline-flex', padding: 2, background: 'transparent', border: 'none', color: 'var(--v-muted)', cursor: 'pointer' }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Thanh công cụ: tìm, lọc, chọn nhanh */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 10,
          padding: 10,
          background: 'var(--v-surface)',
          border: '1px solid var(--v-border)',
          borderRadius: 'var(--v-radius-lg)',
          boxShadow: 'var(--v-shadow-sm)',
        }}
      >
        <label
          style={{
            flex: '1 1 200px',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '7px 10px',
            background: 'var(--v-bg)',
            borderRadius: 'var(--v-radius-md)',
            color: 'var(--v-muted)',
          }}
        >
          <Search size={15} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm từ hoặc nghĩa…"
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
        </label>
        <div style={{ display: 'flex', gap: 6 }}>
          <button type="button" style={pill(filter === 'new')} onClick={() => setFilter('new')}>
            Chưa có {newCount}
          </button>
          <button type="button" style={pill(filter === 'owned')} onClick={() => setFilter('owned')}>
            Đã có {ownedCount}
          </button>
          <button type="button" style={pill(filter === 'all')} onClick={() => setFilter('all')}>
            Tất cả {level.cards.length}
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--v-font-body)', fontSize: 'var(--v-text-sm)', fontWeight: 700, color: 'var(--v-ink-soft)' }}>
          Chọn nhanh
          <input
            type="number"
            min={1}
            max={level.cards.length}
            value={quickN}
            onChange={(e) => setQuickN(Number(e.target.value))}
            aria-label="Số từ chọn nhanh"
            style={{
              width: 60,
              padding: '5px 6px',
              textAlign: 'center',
              fontFamily: 'var(--v-font-head)',
              fontWeight: 900,
              fontSize: 'var(--v-text-sm)',
              color: 'var(--v-ink)',
              background: 'var(--v-surface)',
              border: '1px solid var(--v-border-med)',
              borderRadius: 'var(--v-radius-sm)',
            }}
          />
          từ chưa có
          <button type="button" style={ghostBtn} onClick={quickPick} disabled={newCount === 0}>
            Chọn
          </button>
        </div>
        <span style={{ fontFamily: 'var(--v-font-body)', fontSize: 'var(--v-text-xs)', color: 'var(--v-muted)' }}>
          Bấm tiêu đề cột để sắp xếp
        </span>
      </div>

      <div
        style={{
          background: 'var(--v-surface)',
          border: '1px solid var(--v-border)',
          borderRadius: 'var(--v-radius-lg)',
          boxShadow: 'var(--v-shadow-sm)',
          overflowX: 'auto',
        }}
      >
        <div style={{ minWidth: WORD_TABLE_MIN_WIDTH }}>
          <PresetWordHeader
            sortKey={sortKey}
            sortDir={sortDir}
            allSelected={allVisibleSelected}
            someSelected={someVisibleSelected}
            showFrequency={showFrequency}
            onSort={sortBy}
            onToggleAll={toggleVisible}
          />
          {visible.length === 0 ? (
            <div style={{ padding: '32px 16px', textAlign: 'center', fontFamily: 'var(--v-font-body)', fontSize: 'var(--v-text-sm)', color: 'var(--v-muted)' }}>
              {filter === 'new' && !query ? 'Bạn đã có hết từ trong level này rồi 🎉' : 'Không có từ nào khớp.'}
            </div>
          ) : (
            visible.map((card, i) => (
              <PresetWordRow
                key={card.english}
                card={card}
                selected={selected.has(card.english)}
                open={openWord === card.english}
                isLast={i === visible.length - 1}
                showFrequency={showFrequency}
                onToggle={() => toggle(card.english)}
                onOpen={() => setOpenWord((w) => (w === card.english ? null : card.english))}
              />
            ))
          )}
        </div>
      </div>

      {selectedWords.length > 0 && (
        <PresetTakeBar
          box={box}
          count={selectedWords.length}
          target={target}
          userDecks={userDecks}
          submitting={submitting}
          error={error}
          onTarget={setTarget}
          onClear={() => setSelected(new Set())}
          onSubmit={submit}
        />
      )}
    </div>
  );
}
