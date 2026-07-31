'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Check,
  Circle,
  Image as ImageIcon,
  Loader2,
  RefreshCw,
  Sparkles,
  X as XIcon,
} from 'lucide-react';
import Mascot from '@/components/common/Mascot';
import type { Flashcard, FlashcardDeckWithCounts } from '@/lib/types';
import { apiJson } from '@/lib/common/api-json';

const MAX_WORDS = 30;
const PARALLELISM = 5;
const LAST_DECK_KEY = 'add_last_deck_id';

type RowStatus = 'pending' | 'processing' | 'done' | 'failed';

interface Row {
  word: string;
  /** Optional user-supplied Vietnamese gloss (from `word: meaning` lines). */
  vietnamese?: string;
  status: RowStatus;
  error?: string;
}

type Phase = 'form' | 'processing' | 'done';

export default function BulkImport() {
  const router = useRouter();

  const [decks, setDecks] = useState<FlashcardDeckWithCounts[]>([]);
  const [deckId, setDeckId] = useState<number | null>(null);
  const [raw, setRaw] = useState('');
  const [skipImage, setSkipImage] = useState(true);

  const [phase, setPhase] = useState<Phase>('form');
  const [rows, setRows] = useState<Row[]>([]);
  const [skipped, setSkipped] = useState<string[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  // Deck id actually written to (resolves "Mặc định" → user's default deck).
  // Used by the completion screen to link to the right /decks/[id].
  const [resolvedDeckId, setResolvedDeckId] = useState<number | null>(null);

  useEffect(() => {
    apiJson<{ decks?: FlashcardDeckWithCounts[] }>('/api/decks')
      .then((d) => {
        const list = d.decks ?? [];
        setDecks(list);
        // URL deck_id wins over the localStorage default — landing here from
        // /decks/[id] "+ Thêm từ" should preselect that deck even if the user
        // previously picked a different one.
        if (typeof window !== 'undefined') {
          const params = new URLSearchParams(window.location.search);
          const urlRaw = params.get('deck_id');
          const urlId = urlRaw ? Number(urlRaw) : NaN;
          if (Number.isInteger(urlId) && urlId > 0 && list.some((deck) => deck.id === urlId)) {
            setDeckId(urlId);
            return;
          }
        }
        // Otherwise restore last-used deck.
        const saved = typeof window !== 'undefined' ? localStorage.getItem(LAST_DECK_KEY) : null;
        const savedId = saved ? Number(saved) : NaN;
        if (Number.isInteger(savedId) && savedId > 0 && list.some((deck) => deck.id === savedId)) {
          setDeckId(savedId);
        }
      })
      .catch(() => {});
  }, []);

  function persistDeck(id: number | null) {
    if (typeof window === 'undefined') return;
    if (id === null) localStorage.removeItem(LAST_DECK_KEY);
    else localStorage.setItem(LAST_DECK_KEY, String(id));
  }

  const parsed = useMemo(() => parseWords(raw), [raw]);
  const over = parsed.valid.length > MAX_WORDS;
  const effective = over ? parsed.valid.slice(0, MAX_WORDS) : parsed.valid;

  const selectedDeck = decks.find((d) => d.id === deckId) ?? null;
  const selectedDeckName = selectedDeck?.name ?? 'Mặc định';

  async function handleSubmit() {
    if (effective.length === 0) return;

    // Pre-flight dupe check against the chosen deck. When "Mặc định" is
    // selected we resolve to the actual default-deck id (server save targets
    // the same deck via ensureDefault), so the dedup scope matches the write.
    setToast(null);
    const targetDeckId = deckId ?? decks.find((d) => d.is_default)?.id ?? null;
    setResolvedDeckId(targetDeckId);
    let existing = new Set<string>();
    try {
      const q = targetDeckId
        ? `/api/cards?deck_id=${targetDeckId}&limit=500`
        : '/api/cards?limit=500';
      const res = await apiJson<{ cards?: Flashcard[] }>(q);
      existing = new Set((res.cards ?? []).map((c) => c.english.toLowerCase()));
    } catch {
      // Non-fatal — proceed without dupe filtering. Worst case the server
      // creates a duplicate row, which the user can clean up later.
    }

    const dupes: string[] = [];
    const todo: ParsedBulkItem[] = [];
    for (const item of effective) {
      if (existing.has(item.english)) dupes.push(item.english);
      else todo.push(item);
    }

    if (todo.length === 0) {
      setToast('Tất cả các từ đã có trong bộ rồi nha');
      setSkipped(dupes);
      return;
    }

    setSkipped(dupes);
    setRows(
      todo.map((it) => ({
        word: it.english,
        vietnamese: it.vietnamese,
        status: 'pending' as RowStatus,
      })),
    );
    setPhase('processing');

    await runBatch(todo, targetDeckId);
  }

  async function runBatch(items: ParsedBulkItem[], targetDeckId: number | null) {
    // Worker-pool pattern: keep PARALLELISM tasks in flight, pulling the next
    // word from `queue` whenever one finishes. Avoids "wait for entire batch
    // before starting the next" latency.
    let cursor = 0;
    async function worker() {
      while (cursor < items.length) {
        const idx = cursor++;
        await processOne(items[idx], targetDeckId);
      }
    }
    const workers = Array.from({ length: Math.min(PARALLELISM, items.length) }, () => worker());
    await Promise.allSettled(workers);
    setPhase('done');
    router.refresh();
  }

  async function processOne(item: ParsedBulkItem, targetDeckId: number | null) {
    const word = item.english;
    setRows((prev) =>
      prev.map((r) => (r.word === word ? { ...r, status: 'processing', error: undefined } : r))
    );
    try {
      const res = await fetch('/api/cards/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          english: word,
          // Pre-supplied gloss from `word: meaning` lines — when present, the
          // server stamps this verbatim instead of calling translate.
          vn_meaning: item.vietnamese,
          // Resolved id ("Mặc định" placeholder → actual default-deck id).
          // null only when the user has no decks yet — the server then
          // resolves via ensureDefault.
          deck_id: targetDeckId,
          skip_image: skipImage,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setRows((prev) =>
          prev.map((r) =>
            r.word === word ? { ...r, status: 'failed', error: data.error ?? `HTTP ${res.status}` } : r
          )
        );
        return;
      }
      // Never trust a bare 200: only a `saved: true` payload means the word
      // actually landed in a deck (guards against silent generate-only runs).
      const data = (await res.json().catch(() => ({}))) as { saved?: boolean };
      if (data.saved !== true) {
        setRows((prev) =>
          prev.map((r) =>
            r.word === word ? { ...r, status: 'failed', error: 'Không lưu được vào bộ từ.' } : r
          )
        );
        return;
      }
      setRows((prev) => prev.map((r) => (r.word === word ? { ...r, status: 'done', error: undefined } : r)));
    } catch (err) {
      setRows((prev) =>
        prev.map((r) =>
          r.word === word
            ? { ...r, status: 'failed', error: err instanceof Error ? err.message : 'Lỗi kết nối.' }
            : r
        )
      );
    }
  }

  function retryWord(word: string) {
    // Reconstruct the item from the row so any user-supplied VN gloss is
    // preserved on retry (we only round-trip word + vietnamese, never the
    // status fields).
    const row = rows.find((r) => r.word === word);
    if (!row) return;
    // resolvedDeckId was stamped in handleSubmit, so the retry targets the
    // same deck as the original batch.
    void processOne({ english: row.word, vietnamese: row.vietnamese }, resolvedDeckId);
  }

  function resetForRound() {
    setRaw('');
    setRows([]);
    setSkipped([]);
    setToast(null);
    setPhase('form');
  }

  // ────────────────────────────────────────────────────────────────────────
  // Render
  // ────────────────────────────────────────────────────────────────────────
  if (phase === 'processing' || phase === 'done') {
    return (
      <ProgressView
        rows={rows}
        skipped={skipped}
        deckName={selectedDeckName}
        deckId={resolvedDeckId}
        phase={phase}
        onRetry={retryWord}
        onReset={resetForRound}
      />
    );
  }

  const count = effective.length;
  const submitDisabled = count === 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {toast && (
        <div
          style={{
            padding: '10px 14px',
            background: 'rgba(255,154,60,0.10)',
            border: '1px solid rgba(255,154,60,0.30)',
            borderRadius: 'var(--v-radius-md)',
            color: 'var(--v-orange)',
            fontFamily: 'var(--v-font-head)',
            fontWeight: 800,
            fontSize: 'var(--v-text-md)',
          }}
        >
          {toast}
        </div>
      )}

      {/* Deck picker */}
      <Field label="Bộ từ">
        <div style={{ position: 'relative' }}>
          <select
            value={deckId ?? ''}
            onChange={(e) => {
              const v = e.target.value ? Number(e.target.value) : null;
              setDeckId(v);
              persistDeck(v);
            }}
            style={{
              ...inputStyle(),
              padding: '12px 38px 12px 14px',
              fontFamily: 'var(--v-font-body)',
              fontSize: 13,
              fontWeight: 700,
              appearance: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="">Mặc định</option>
            {decks.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} ({d.total})
              </option>
            ))}
          </select>
          <span
            style={{
              position: 'absolute',
              right: 14,
              top: '50%',
              transform: 'translateY(-50%)',
              pointerEvents: 'none',
              color: 'var(--v-ink-soft)',
            }}
          >
            ▾
          </span>
        </div>
      </Field>

      {/* Textarea */}
      <Field label="Danh sách từ">
        <textarea
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          placeholder={
            'Dán hoặc gõ từ tiếng Anh ở đây — mỗi dòng 1 từ, hoặc cách nhau bằng dấu phẩy / khoảng trắng.\n\nVí dụ:\n  resilient\n  thrive, mitigate\n  contingency'
          }
          rows={9}
          style={{
            ...inputStyle(),
            minHeight: 200,
            fontFamily: 'var(--v-font-mono)',
            fontSize: 13,
            lineHeight: 1.55,
            resize: 'vertical',
          }}
        />
        <div
          style={{
            marginTop: 8,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            flexWrap: 'wrap',
            fontFamily: 'var(--v-font-body)',
            fontSize: 'var(--v-text-sm)',
            fontWeight: 700,
          }}
        >
          <span style={{ color: 'var(--v-ink-soft)' }}>
            Đã nhận diện <b style={{ color: 'var(--v-primary)' }}>{count}</b> từ
            {parsed.valid.length > MAX_WORDS && (
              <span style={{ color: 'var(--v-muted)' }}> · (trong {parsed.valid.length} từ hợp lệ)</span>
            )}
          </span>
          {over && (
            <span style={{ color: 'var(--v-orange)' }}>
              Tối đa {MAX_WORDS} từ mỗi lần — mình sẽ chỉ lấy {MAX_WORDS} từ đầu nha.
            </span>
          )}
        </div>

        {parsed.invalid.length > 0 && (
          <details
            style={{
              marginTop: 8,
              padding: '8px 12px',
              background: 'var(--v-orange-soft)',
              border: '1px solid var(--v-orange)',
              borderRadius: 'var(--v-radius-md)',
              fontFamily: 'var(--v-font-body)',
              fontSize: 'var(--v-text-sm)',
            }}
          >
            <summary
              style={{
                cursor: 'pointer',
                fontWeight: 800,
                color: 'var(--v-orange)',
                listStyle: 'none',
              }}
            >
              Bỏ qua {parsed.invalid.length} dòng không hợp lệ
            </summary>
            <ul
              style={{
                margin: '8px 0 0',
                padding: '0 0 0 18px',
                color: 'var(--v-ink-soft)',
                fontFamily: 'var(--v-font-mono)',
                fontSize: 12,
                maxHeight: 160,
                overflowY: 'auto',
              }}
            >
              {parsed.invalid.map((line, i) => (
                <li key={i} style={{ marginBottom: 2 }}>
                  {line}
                </li>
              ))}
            </ul>
          </details>
        )}
      </Field>

      {/* Skip image toggle */}
      <label
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 12,
          padding: '12px 14px',
          background: 'var(--v-panel)',
          border: '1px solid var(--v-border)',
          borderRadius: 'var(--v-radius-md)',
          cursor: 'pointer',
        }}
      >
        <input
          type="checkbox"
          checked={skipImage}
          onChange={(e) => setSkipImage(e.target.checked)}
          style={{ width: 18, height: 18, accentColor: 'var(--v-primary)', marginTop: 2 }}
        />
        <div style={{ flex: 1 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontFamily: 'var(--v-font-head)',
              fontWeight: 800,
              fontSize: 'var(--v-text-md)',
              color: 'var(--v-ink)',
            }}
          >
            <ImageIcon size={14} color="var(--v-ink-soft)" />
            Bỏ qua ảnh (nhanh hơn nhiều)
          </div>
          <div
            style={{
              marginTop: 2,
              fontFamily: 'var(--v-font-body)',
              fontSize: 'var(--v-text-sm)',
              color: 'var(--v-muted)',
            }}
          >
            Có thể thêm ảnh sau khi sửa từng từ.
          </div>
        </div>
      </label>

      {/* Submit */}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={submitDisabled}
        style={{
          padding: '14px 22px',
          background: 'var(--v-primary)',
          color: '#fff',
          border: 'none',
          boxShadow: submitDisabled
            ? 'none'
            : '0 4px 0 rgba(60,20,5,0.15), 0 6px 14px rgba(122,193,67,0.4)',
          borderRadius: 14,
          fontFamily: 'var(--v-font-head)',
          fontWeight: 900,
          fontSize: 13,
          letterSpacing: '0.04em',
          cursor: submitDisabled ? 'not-allowed' : 'pointer',
          opacity: submitDisabled ? 0.55 : 1,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
        }}
      >
        <Sparkles size={16} strokeWidth={2.6} />
        Nhập {count} từ
      </button>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Progress + completion view
// ──────────────────────────────────────────────────────────────────────────

function ProgressView({
  rows,
  skipped,
  deckName,
  deckId,
  phase,
  onRetry,
  onReset,
}: {
  rows: Row[];
  skipped: string[];
  deckName: string;
  deckId: number | null;
  phase: 'processing' | 'done';
  onRetry: (word: string) => void;
  onReset: () => void;
}) {
  const total = rows.length;
  const done = rows.filter((r) => r.status === 'done').length;
  const failed = rows.filter((r) => r.status === 'failed').length;
  const finished = done + failed;
  const pct = total === 0 ? 0 : Math.round((finished / total) * 100);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {phase === 'processing' && (
        <div>
          <div
            style={{
              fontFamily: 'var(--v-font-head)',
              fontWeight: 900,
              fontSize: 'var(--v-text-xl)',
              color: 'var(--v-ink)',
              marginBottom: 8,
            }}
          >
            Đang nhập {total} từ vào &quot;{deckName}&quot;...
          </div>
          <div
            style={{
              height: 10,
              background: 'var(--v-panel)',
              border: '1px solid var(--v-border)',
              borderRadius: 999,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${pct}%`,
                height: '100%',
                background: 'var(--v-primary)',
                transition: 'width 200ms var(--v-ease)',
              }}
            />
          </div>
          <div
            style={{
              marginTop: 6,
              fontFamily: 'var(--v-font-body)',
              fontSize: 'var(--v-text-sm)',
              fontWeight: 700,
              color: 'var(--v-ink-soft)',
            }}
          >
            {finished}/{total} — Bún đang xử lý…
          </div>
        </div>
      )}

      {phase === 'done' && (
        <CompletionHeader
          done={done}
          failed={failed}
          skipped={skipped.length}
          deckId={deckId}
          onReset={onReset}
        />
      )}

      {/* Per-word rows */}
      <div
        style={{
          background: 'var(--v-surface)',
          border: '1px solid var(--v-border)',
          borderRadius: 'var(--v-radius-md)',
          boxShadow: 'var(--v-shadow-sm)',
          overflow: 'hidden',
        }}
      >
        {rows.map((row, i) => (
          <RowItem key={row.word} row={row} isLast={i === rows.length - 1} onRetry={onRetry} />
        ))}
      </div>

      {/* Skipped (already in deck) */}
      {skipped.length > 0 && (
        <div
          style={{
            padding: '12px 14px',
            background: 'rgba(255,154,60,0.10)',
            border: '1px solid rgba(255,154,60,0.30)',
            borderRadius: 'var(--v-radius-md)',
            fontFamily: 'var(--v-font-body)',
            fontSize: 'var(--v-text-sm)',
            color: 'var(--v-ink-soft)',
          }}
        >
          <div
            style={{
              fontFamily: 'var(--v-font-head)',
              fontWeight: 800,
              color: 'var(--v-orange)',
              marginBottom: 4,
            }}
          >
            {skipped.length} từ đã có trong bộ — mình bỏ qua:
          </div>
          <div style={{ fontFamily: 'var(--v-font-mono)', fontSize: 12 }}>
            {skipped.join(', ')}
          </div>
        </div>
      )}
    </div>
  );
}

function RowItem({
  row,
  isLast,
  onRetry,
}: {
  row: Row;
  isLast: boolean;
  onRetry: (word: string) => void;
}) {
  const icon = (() => {
    switch (row.status) {
      case 'pending':
        return <Circle size={16} color="var(--v-muted)" />;
      case 'processing':
        return (
          <Loader2
            size={16}
            color="var(--v-primary)"
            style={{ animation: 'v-spin 1s linear infinite' }}
          />
        );
      case 'done':
        return <Check size={16} color="var(--v-primary)" strokeWidth={3} />;
      case 'failed':
        return <XIcon size={16} color="var(--v-red)" strokeWidth={3} />;
    }
  })();

  const iconBg =
    row.status === 'done'
      ? 'var(--v-primary-soft)'
      : row.status === 'failed'
        ? 'rgba(255,87,87,0.12)'
        : 'transparent';

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 14px',
        borderBottom: isLast ? 'none' : '1px solid var(--v-border)',
        background: row.status === 'processing' ? 'var(--v-panel)' : 'transparent',
      }}
    >
      <div
        style={{
          width: 26,
          height: 26,
          borderRadius: 999,
          background: iconBg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div
        style={{
          flex: 1,
          fontFamily: 'var(--v-font-mono)',
          fontSize: 13,
          fontWeight: 700,
          color: row.status === 'failed' ? 'var(--v-ink-soft)' : 'var(--v-ink)',
        }}
      >
        {row.word}
      </div>
      {row.status === 'failed' && (
        <>
          {row.error && (
            <span
              style={{
                fontFamily: 'var(--v-font-body)',
                fontSize: 11,
                color: 'var(--v-red)',
                fontWeight: 700,
              }}
            >
              {row.error}
            </span>
          )}
          <button
            type="button"
            onClick={() => onRetry(row.word)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '4px 10px',
              background: 'var(--v-surface)',
              color: 'var(--v-ink)',
              border: '1px solid var(--v-border)',
              borderRadius: 999,
              fontFamily: 'var(--v-font-head)',
              fontWeight: 800,
              fontSize: 11,
              cursor: 'pointer',
              letterSpacing: '0.04em',
            }}
          >
            <RefreshCw size={11} />
            Thử lại
          </button>
        </>
      )}
    </div>
  );
}

function CompletionHeader({
  done,
  failed,
  skipped,
  deckId,
  onReset,
}: {
  done: number;
  failed: number;
  skipped: number;
  deckId: number | null;
  onReset: () => void;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <Mascot pose="happy" size={56} bob />
        <h2
          style={{
            margin: 0,
            fontFamily: 'var(--v-font-head)',
            fontWeight: 900,
            fontSize: 'var(--v-text-3xl)',
            letterSpacing: 'var(--v-tracking-tight)',
            color: 'var(--v-ink)',
          }}
        >
          Hoàn tất!
        </h2>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        <Pill
          icon={<Check size={13} strokeWidth={3} />}
          label={`${done} từ đã thêm`}
          bg="var(--v-primary-soft)"
          fg="var(--v-primary)"
        />
        {skipped > 0 && (
          <Pill
            icon={<RefreshCw size={12} strokeWidth={3} />}
            label={`${skipped} từ đã trùng`}
            bg="rgba(255,154,60,0.16)"
            fg="var(--v-orange)"
          />
        )}
        {failed > 0 && (
          <Pill
            icon={<XIcon size={13} strokeWidth={3} />}
            label={`${failed} từ lỗi`}
            bg="rgba(255,87,87,0.12)"
            fg="var(--v-red)"
          />
        )}
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {deckId !== null && (
          <a
            href={`/decks/${deckId}`}
            style={{
              padding: '12px 20px',
              background: 'var(--v-primary)',
              color: '#fff',
              textDecoration: 'none',
              borderRadius: 14,
              boxShadow: '0 4px 0 rgba(60,20,5,0.15)',
              fontFamily: 'var(--v-font-head)',
              fontWeight: 900,
              fontSize: 12,
              letterSpacing: '0.04em',
            }}
          >
            XEM BỘ TỪ
          </a>
        )}
        <button
          type="button"
          onClick={onReset}
          style={{
            padding: '12px 20px',
            background: 'var(--v-surface)',
            color: 'var(--v-ink)',
            border: '1px solid var(--v-border)',
            boxShadow: 'var(--v-shadow-sm)',
            borderRadius: 14,
            fontFamily: 'var(--v-font-head)',
            fontWeight: 800,
            fontSize: 12,
            letterSpacing: '0.04em',
            cursor: 'pointer',
          }}
        >
          NHẬP TIẾP
        </button>
      </div>
    </div>
  );
}

function Pill({
  icon,
  label,
  bg,
  fg,
}: {
  icon: React.ReactNode;
  label: string;
  bg: string;
  fg: string;
}) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '6px 12px',
        background: bg,
        color: fg,
        borderRadius: 999,
        fontFamily: 'var(--v-font-head)',
        fontWeight: 900,
        fontSize: 12,
        letterSpacing: '0.04em',
      }}
    >
      {icon}
      {label}
    </span>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────

export interface ParsedBulkItem {
  english: string;
  /** User-provided Vietnamese meaning extracted from the right side of the
   *  separator. When present, the server skips its auto-translation step and
   *  saves this verbatim. */
  vietnamese?: string;
}

export interface ParsedBulkInput {
  valid: ParsedBulkItem[];
  /** Lines that survived trimming but failed validation (had numbers,
   *  diacritics, multiple separators, or an empty left side after the
   *  separator). Surfaced in the UI so the user knows what got dropped. */
  invalid: string[];
}

/**
 * Parse the bulk-import textarea into a list of English headwords.
 *
 * The textarea is line-oriented: each line is one entry. Many users paste
 * lists in `word: translation` form (Vietnamese vocab books, cheat sheets,
 * etc.). The parser splits at the first separator: left side = English
 * headword, right side = optional user-supplied Vietnamese meaning. When
 * the right side is non-empty we surface it on the parsed item so the
 * downstream save can persist it instead of asking the AI to translate.
 *
 * Supported separators (in match-priority order — longest first so the
 * dash variants don't get pre-empted by a bare hyphen later):
 *   `:`  `\t`  `|`  `=`  ` — `  ` – `  ` - `
 *
 * The bare hyphen variant carries surrounding spaces so the parser preserves
 * hyphenated words like `well-known` or `state-of-the-art`.
 *
 * After separator-trimming each line is validated against `/^[a-z][a-z\s'-]*$/i`
 * — English letters plus internal spaces (for phrasal verbs like "look up"),
 * apostrophes, and hyphens. Anything with digits, diacritics, or punctuation
 * is dropped and reported via `invalid`.
 *
 * Note on backwards-compat: the prior parser split on any of `\n , ; \s`,
 * so single-line comma lists like `apple, banana, cherry` used to work.
 * They no longer do — a single line is treated as a single entry. The
 * intended UX is one word per line; users with comma-separated input can
 * reformat in seconds.
 */
export function parseWords(raw: string): ParsedBulkInput {
  // Order matters: try the multi-char dash separators before ' - ' so we
  // don't half-match an em-dash via the bare hyphen rule.
  const SEPARATORS = [':', '\t', '|', '=', ' — ', ' – ', ' - '];
  const validRe = /^[a-z][a-z\s'-]*$/i;

  const valid: ParsedBulkItem[] = [];
  const invalid: string[] = [];
  const seen = new Set<string>();

  for (const rawLine of raw.split('\n')) {
    const line = rawLine.trim();
    if (line.length === 0) continue;

    // Find the FIRST occurrence of ANY separator; everything to its left
    // is the candidate headword, everything after is the optional VN gloss.
    let earliest = -1;
    let earliestSepLen = 0;
    for (const sep of SEPARATORS) {
      const idx = line.indexOf(sep);
      if (idx >= 0 && (earliest === -1 || idx < earliest)) {
        earliest = idx;
        earliestSepLen = sep.length;
      }
    }
    let candidate = earliest >= 0 ? line.slice(0, earliest) : line;
    let rhs = earliest >= 0 ? line.slice(earliest + earliestSepLen) : '';

    // Strip trailing `.`, `,`, `;` defensively (some users leave them at
    // end of items in pasted lists).
    candidate = candidate.trim().replace(/[.,;]+$/, '').trim();
    rhs = rhs.trim().replace(/[,;]+$/, '').trim();

    if (candidate.length === 0 || !validRe.test(candidate)) {
      invalid.push(line);
      continue;
    }

    // Normalize whitespace (collapse internal runs to single spaces) and
    // lowercase for the dedup key + downstream storage.
    const normalized = candidate.toLowerCase().replace(/\s+/g, ' ');
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    valid.push(rhs.length > 0 ? { english: normalized, vietnamese: rhs } : { english: normalized });
  }

  return { valid, invalid };
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div
        style={{
          fontFamily: 'var(--v-font-body)',
          fontSize: 12,
          fontWeight: 800,
          color: 'var(--v-muted)',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      {children}
    </div>
  );
}

function inputStyle(): React.CSSProperties {
  return {
    width: '100%',
    padding: '12px 14px',
    fontFamily: 'var(--v-font-body)',
    fontSize: 'var(--v-text-base)',
    fontWeight: 600,
    background: 'var(--v-surface)',
    border: '1.5px solid var(--v-border)',
    borderRadius: 'var(--v-radius-md)',
    color: 'var(--v-ink)',
    outline: 'none',
  };
}
