'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Upload, X, Check, FileJson, AlertTriangle } from 'lucide-react';
import { apiJson } from '@/lib/common/api-json';
import type { FlashcardDeckWithCounts } from '@/lib/types';

interface ParsedFile {
  id: number;
  fileName: string;
  deckName: string;
  cardCount: number;
  raw: unknown;
}

interface ImportResult {
  deck_id: number;
  deck_name: string;
  inserted: number;
  skipped_dupe: number;
  skipped_invalid: number;
  total: number;
}

interface BatchImportResult {
  results: ImportResult[];
  decks_created: number;
  total_inserted: number;
  total_skipped_dupe: number;
  total_skipped_invalid: number;
}

interface Props {
  onClose: () => void;
}

type Mode = 'new' | 'existing';

/**
 * Modal that walks the learner through importing one or more deck JSON files:
 *   1. Pick file(s) → parse and preview each file's deck name + card count.
 *   2. Choose target — create a NEW deck per file (using each file's
 *      metadata) or merge ALL files INTO one existing deck.
 *   3. Submit → POST /api/decks/import → success summary → either navigate
 *      to the (single) target deck or refresh the list.
 */
export default function DeckImportDialog({ onClose }: Props) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const idRef = useRef(0);

  const [parsed, setParsed] = useState<ParsedFile[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>('new');
  const [decks, setDecks] = useState<FlashcardDeckWithCounts[]>([]);
  const [targetDeckId, setTargetDeckId] = useState<number | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<BatchImportResult | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const totalCards = parsed.reduce((a, p) => a + p.cardCount, 0);

  // Fetch existing decks once — needed for "import into existing" mode.
  useEffect(() => {
    apiJson<{ decks?: FlashcardDeckWithCounts[] }>('/api/decks')
      .then((d) => {
        const list = d.decks ?? [];
        setDecks(list);
        // Default the picker to the user's default deck (if any).
        const def = list.find((deck) => deck.is_default) ?? list[0];
        if (def) setTargetDeckId(def.id);
      })
      .catch(() => {});
  }, []);

  // Parse every picked file and append the valid ones. Files whose name is
  // already in the list are skipped so re-picking doesn't double-add.
  async function handleFiles(fileList: FileList) {
    const incoming = Array.from(fileList);
    const additions: ParsedFile[] = [];
    const errors: string[] = [];
    for (const file of incoming) {
      if (
        parsed.some((p) => p.fileName === file.name) ||
        additions.some((a) => a.fileName === file.name)
      ) {
        continue;
      }
      try {
        const text = await file.text();
        const data = JSON.parse(text) as { deck?: { name?: string }; cards?: unknown[] };
        if (!data || !Array.isArray(data.cards)) {
          throw new Error('thiếu trường "cards"');
        }
        additions.push({
          id: idRef.current++,
          fileName: file.name,
          deckName: typeof data.deck?.name === 'string' ? data.deck.name : '(không tên)',
          cardCount: data.cards.length,
          raw: data,
        });
      } catch (e) {
        errors.push(`${file.name}: ${e instanceof Error ? e.message : 'JSON lỗi'}`);
      }
    }
    if (additions.length) setParsed((prev) => [...prev, ...additions]);
    setParseError(errors.length ? errors.join(' · ') : null);
  }

  function removeFile(id: number) {
    setParsed((prev) => prev.filter((p) => p.id !== id));
  }

  async function submit() {
    if (parsed.length === 0 || submitting) return;
    if (mode === 'existing' && targetDeckId === null) {
      setSubmitError('Chọn bộ đích trước.');
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const data = await apiJson<BatchImportResult>('/api/decks/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          files: parsed.map((p) => p.raw),
          mode,
          ...(mode === 'existing' && targetDeckId !== null
            ? { target_deck_id: targetDeckId }
            : {}),
        }),
      });
      setResult(data);
      // Refresh the deck list under the hood so the new/updated counts show
      // up after the user closes the dialog.
      router.refresh();
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Lỗi khi import.');
    } finally {
      setSubmitting(false);
    }
  }

  function goToDeck() {
    const first = result?.results[0];
    if (!first) return;
    router.push(`/decks/${first.deck_id}`);
    onClose();
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(20,20,30,0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--v-surface)',
          border: '1px solid var(--v-border)',
          borderRadius: 'var(--v-radius-lg)',
          boxShadow: 'var(--v-shadow-lg)',
          padding: 24,
          width: '100%',
          maxWidth: 520,
          maxHeight: 'calc(100vh - 40px)',
          overflowY: 'auto',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h2 style={{ fontFamily: 'var(--v-font-head)', fontWeight: 900, fontSize: 'var(--v-text-xl)', margin: 0, color: 'var(--v-ink)' }}>
            Import bộ từ
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            style={{
              padding: 6,
              background: 'transparent',
              border: 'none',
              color: 'var(--v-ink-soft)',
              cursor: 'pointer',
              display: 'inline-flex',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Success state */}
        {result ? (
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
                padding: 14,
                background: 'var(--v-primary-soft)',
                border: '1px solid color-mix(in srgb, var(--v-primary) 33%, transparent)',
                borderRadius: 'var(--v-radius-md)',
                marginBottom: 14,
              }}
            >
              <Check size={18} style={{ color: 'var(--v-primary)', flexShrink: 0, marginTop: 1 }} />
              <div style={{ fontFamily: 'var(--v-font-body)', fontSize: 'var(--v-text-sm)', color: 'var(--v-ink)' }}>
                {result.decks_created > 0 ? (
                  <>
                    Đã tạo <strong>{result.decks_created}</strong> bộ, thêm{' '}
                    <strong>{result.total_inserted}</strong> từ.
                  </>
                ) : (
                  <>
                    Đã thêm <strong>{result.total_inserted}</strong> từ vào bộ{' '}
                    <strong>{result.results[0]?.deck_name}</strong>.
                  </>
                )}
                {result.total_skipped_dupe > 0 && (
                  <>
                    {' '}Bỏ qua <strong>{result.total_skipped_dupe}</strong> từ trùng.
                  </>
                )}
                {result.total_skipped_invalid > 0 && (
                  <>
                    {' '}Bỏ qua <strong>{result.total_skipped_invalid}</strong> từ lỗi format.
                  </>
                )}
              </div>
            </div>

            {/* Per-deck breakdown when more than one deck was touched. */}
            {result.results.length > 1 && (
              <div
                style={{
                  marginBottom: 14,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                  maxHeight: 220,
                  overflowY: 'auto',
                }}
              >
                {result.results.map((r) => (
                  <div
                    key={r.deck_id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'baseline',
                      gap: 10,
                      padding: '8px 12px',
                      background: 'var(--v-panel)',
                      border: '1px solid var(--v-border)',
                      borderRadius: 'var(--v-radius-sm)',
                      fontFamily: 'var(--v-font-body)',
                      fontSize: 'var(--v-text-sm)',
                    }}
                  >
                    <strong style={{ color: 'var(--v-ink)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {r.deck_name}
                    </strong>
                    <span style={{ color: 'var(--v-primary)', fontWeight: 700, flexShrink: 0 }}>
                      +{r.inserted} từ
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              {result.results.length === 1 && result.results[0] ? (
                <>
                  <button type="button" onClick={onClose} style={ghostBtn()}>Đóng</button>
                  <button type="button" onClick={goToDeck} style={primaryBtn()}>
                    Mở bộ →
                  </button>
                </>
              ) : (
                <button type="button" onClick={onClose} style={primaryBtn()}>Xong</button>
              )}
            </div>
          </div>
        ) : (
          <>
            {/* File picker */}
            <div style={{ marginBottom: 14 }}>
              <FieldLabel>Chọn file JSON (có thể chọn nhiều)</FieldLabel>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json,.json"
                multiple
                onChange={(e) => {
                  const files = e.target.files;
                  if (files && files.length) handleFiles(files);
                  // Reset so re-picking the same file fires onChange again.
                  e.target.value = '';
                }}
                style={{ display: 'none' }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  background: 'var(--v-panel)',
                  border: '1.5px dashed var(--v-border)',
                  borderRadius: 'var(--v-radius-md)',
                  color: 'var(--v-ink-soft)',
                  fontFamily: 'var(--v-font-body)',
                  fontSize: 'var(--v-text-sm)',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                <FileJson size={16} /> {parsed.length > 0 ? 'Thêm file…' : 'Chọn file…'}
              </button>
              {parseError && (
                <div
                  style={{
                    marginTop: 8,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    color: 'var(--v-red)',
                    fontFamily: 'var(--v-font-body)',
                    fontSize: 'var(--v-text-sm)',
                    fontWeight: 700,
                  }}
                >
                  <AlertTriangle size={14} /> {parseError}
                </div>
              )}
              {parsed.length > 0 && (
                <div
                  style={{
                    marginTop: 8,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                    maxHeight: 220,
                    overflowY: 'auto',
                  }}
                >
                  {parsed.map((p) => (
                    <div
                      key={p.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '8px 10px 8px 12px',
                        background: 'var(--v-panel)',
                        border: '1px solid var(--v-border)',
                        borderRadius: 'var(--v-radius-sm)',
                        fontFamily: 'var(--v-font-body)',
                        fontSize: 'var(--v-text-sm)',
                        color: 'var(--v-ink-soft)',
                      }}
                    >
                      <div style={{ minWidth: 0, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        <strong style={{ color: 'var(--v-ink)' }}>{p.deckName}</strong>
                        {' · '}
                        <strong style={{ color: 'var(--v-primary)' }}>{p.cardCount} từ</strong>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFile(p.id)}
                        aria-label={`Bỏ ${p.fileName}`}
                        style={{
                          padding: 4,
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--v-muted)',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          flexShrink: 0,
                        }}
                      >
                        <X size={15} />
                      </button>
                    </div>
                  ))}
                  {parsed.length > 1 && (
                    <div
                      style={{
                        padding: '2px 4px',
                        fontFamily: 'var(--v-font-body)',
                        fontSize: 'var(--v-text-xs)',
                        fontWeight: 700,
                        color: 'var(--v-muted)',
                      }}
                    >
                      {parsed.length} file · {totalCards} từ
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Mode toggle */}
            {parsed.length > 0 && (
              <>
                <div style={{ marginBottom: 14 }}>
                  <FieldLabel>Thêm vào</FieldLabel>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <ModeOption
                      active={mode === 'new'}
                      onClick={() => setMode('new')}
                      title="Tạo bộ mới cho mỗi file"
                      sub={
                        parsed.length > 1
                          ? `Mỗi file → 1 bộ riêng (${parsed.length} bộ)`
                          : `Tạo deck "${parsed[0].deckName}" và đổ tất cả từ vào`
                      }
                    />
                    <ModeOption
                      active={mode === 'existing'}
                      onClick={() => setMode('existing')}
                      title="Gộp vào bộ có sẵn"
                      sub={
                        parsed.length > 1
                          ? 'Đổ từ của tất cả file vào 1 bộ — trùng english bị bỏ qua'
                          : 'Chọn 1 bộ hiện tại của bạn — từ trùng english sẽ bị bỏ qua'
                      }
                    />
                  </div>
                </div>

                {mode === 'existing' && (
                  <div style={{ marginBottom: 14 }}>
                    <FieldLabel>Bộ đích</FieldLabel>
                    <select
                      value={targetDeckId ?? ''}
                      onChange={(e) => setTargetDeckId(Number(e.target.value) || null)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        background: 'var(--v-bg)',
                        border: '1.5px solid var(--v-border)',
                        borderRadius: 'var(--v-radius-sm)',
                        fontFamily: 'var(--v-font-body)',
                        fontSize: 'var(--v-text-base)',
                        fontWeight: 600,
                        color: 'var(--v-ink)',
                        outline: 'none',
                      }}
                    >
                      {decks.length === 0 ? (
                        <option value="">— chưa có bộ nào —</option>
                      ) : (
                        decks.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name} ({d.total} từ)
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                )}
              </>
            )}

            {submitError && (
              <div
                style={{
                  marginBottom: 14,
                  padding: '8px 12px',
                  background: 'rgba(255,87,87,0.08)',
                  border: '1px solid rgba(255,87,87,0.25)',
                  borderRadius: 'var(--v-radius-sm)',
                  color: 'var(--v-red)',
                  fontFamily: 'var(--v-font-body)',
                  fontSize: 'var(--v-text-sm)',
                }}
              >
                {submitError}
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" onClick={onClose} style={ghostBtn()} disabled={submitting}>
                Huỷ
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={parsed.length === 0 || submitting}
                style={{
                  ...primaryBtn(),
                  opacity: parsed.length === 0 || submitting ? 0.55 : 1,
                  cursor: parsed.length === 0 || submitting ? 'not-allowed' : 'pointer',
                }}
              >
                {submitting ? (
                  <Loader2 size={13} style={{ animation: 'v-spin 1s linear infinite' }} />
                ) : (
                  <Upload size={13} />
                )}
                {submitting ? 'Đang import…' : 'Import'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontFamily: 'var(--v-font-body)',
        fontSize: 'var(--v-text-xs)',
        fontWeight: 800,
        color: 'var(--v-muted)',
        letterSpacing: 'var(--v-tracking-wider)',
        textTransform: 'uppercase',
        marginBottom: 6,
      }}
    >
      {children}
    </div>
  );
}

function ModeOption({
  active, onClick, title, sub,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  sub: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        textAlign: 'left',
        padding: '10px 12px',
        background: active ? 'var(--v-primary-soft)' : 'var(--v-bg)',
        border: `1.5px solid ${active ? 'var(--v-primary)' : 'var(--v-border)'}`,
        borderRadius: 'var(--v-radius-sm)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
      }}
    >
      <div
        style={{
          width: 18,
          height: 18,
          borderRadius: '50%',
          border: `2px solid ${active ? 'var(--v-primary)' : 'var(--v-border)'}`,
          flexShrink: 0,
          marginTop: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {active && <div style={{ width: 9, height: 9, borderRadius: '50%', background: 'var(--v-primary)' }} />}
      </div>
      <div>
        <div style={{ fontFamily: 'var(--v-font-head)', fontWeight: 900, fontSize: 'var(--v-text-sm)', color: 'var(--v-ink)' }}>
          {title}
        </div>
        <div style={{ fontFamily: 'var(--v-font-body)', fontSize: 'var(--v-text-xs)', fontWeight: 600, color: 'var(--v-ink-soft)', marginTop: 2 }}>
          {sub}
        </div>
      </div>
    </button>
  );
}

function primaryBtn(): React.CSSProperties {
  return {
    padding: '8px 16px',
    background: 'var(--v-primary)',
    color: '#fff',
    border: 'none',
    borderRadius: 'var(--v-radius-md)',
    boxShadow: 'var(--v-press), 0 4px 10px rgba(122,193,67,0.35)',
    fontFamily: 'var(--v-font-head)',
    fontWeight: 900,
    fontSize: 'var(--v-text-sm)',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
  };
}

function ghostBtn(): React.CSSProperties {
  return {
    padding: '8px 14px',
    background: 'var(--v-surface)',
    color: 'var(--v-ink-soft)',
    border: '1px solid var(--v-border)',
    borderRadius: 'var(--v-radius-md)',
    fontFamily: 'var(--v-font-head)',
    fontWeight: 800,
    fontSize: 'var(--v-text-sm)',
    cursor: 'pointer',
  };
}
