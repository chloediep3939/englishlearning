'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Upload, X, Check, FileJson, AlertTriangle } from 'lucide-react';
import { apiJson } from '@/lib/common/api-json';
import type { FlashcardDeckWithCounts } from '@/lib/types';

interface ParsedFile {
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

interface Props {
  onClose: () => void;
}

type Mode = 'new' | 'existing';

/**
 * Modal that walks the learner through importing a deck JSON:
 *   1. Drop / pick a file → parse and preview deck name + card count.
 *   2. Choose target — create a NEW deck (using file's metadata) or insert
 *      INTO an existing deck (picker showing all user's decks).
 *   3. Submit → POST /api/decks/import → success summary → either navigate
 *      to the target deck or refresh the list.
 */
export default function DeckImportDialog({ onClose }: Props) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [parsed, setParsed] = useState<ParsedFile | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>('new');
  const [decks, setDecks] = useState<FlashcardDeckWithCounts[]>([]);
  const [targetDeckId, setTargetDeckId] = useState<number | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

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

  function handleFile(file: File) {
    setParseError(null);
    setParsed(null);
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = String(reader.result ?? '');
        const data = JSON.parse(text) as {
          deck?: { name?: string };
          cards?: unknown[];
        };
        if (!data || !Array.isArray(data.cards)) {
          throw new Error('File không có trường "cards".');
        }
        setParsed({
          deckName: typeof data.deck?.name === 'string' ? data.deck.name : '(không tên)',
          cardCount: data.cards.length,
          raw: data,
        });
      } catch (e) {
        setParseError(e instanceof Error ? e.message : 'File JSON không hợp lệ.');
      }
    };
    reader.onerror = () => setParseError('Không đọc được file.');
    reader.readAsText(file);
  }

  async function submit() {
    if (!parsed || submitting) return;
    if (mode === 'existing' && targetDeckId === null) {
      setSubmitError('Chọn bộ đích trước.');
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const data = await apiJson<ImportResult>('/api/decks/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: parsed.raw,
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
    if (!result) return;
    router.push(`/decks/${result.deck_id}`);
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
                Đã thêm <strong>{result.inserted}</strong> từ vào bộ <strong>{result.deck_name}</strong>.
                {result.skipped_dupe > 0 && (
                  <>
                    {' '}Bỏ qua <strong>{result.skipped_dupe}</strong> từ trùng.
                  </>
                )}
                {result.skipped_invalid > 0 && (
                  <>
                    {' '}Bỏ qua <strong>{result.skipped_invalid}</strong> từ lỗi format.
                  </>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" onClick={onClose} style={ghostBtn()}>Đóng</button>
              <button type="button" onClick={goToDeck} style={primaryBtn()}>
                Mở bộ →
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* File picker */}
            <div style={{ marginBottom: 14 }}>
              <FieldLabel>Chọn file JSON</FieldLabel>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json,.json"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
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
                <FileJson size={16} /> {parsed ? 'Chọn file khác' : 'Chọn file…'}
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
              {parsed && (
                <div
                  style={{
                    marginTop: 8,
                    padding: '10px 12px',
                    background: 'var(--v-panel)',
                    border: '1px solid var(--v-border)',
                    borderRadius: 'var(--v-radius-sm)',
                    fontFamily: 'var(--v-font-body)',
                    fontSize: 'var(--v-text-sm)',
                    color: 'var(--v-ink-soft)',
                  }}
                >
                  <strong style={{ color: 'var(--v-ink)' }}>{parsed.deckName}</strong>
                  {' · '}
                  <strong style={{ color: 'var(--v-primary)' }}>{parsed.cardCount} từ</strong>
                </div>
              )}
            </div>

            {/* Mode toggle */}
            {parsed && (
              <>
                <div style={{ marginBottom: 14 }}>
                  <FieldLabel>Thêm vào</FieldLabel>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <ModeOption
                      active={mode === 'new'}
                      onClick={() => setMode('new')}
                      title="Tạo bộ mới"
                      sub={`Tạo deck "${parsed.deckName}" và đổ tất cả từ vào`}
                    />
                    <ModeOption
                      active={mode === 'existing'}
                      onClick={() => setMode('existing')}
                      title="Insert vào bộ có sẵn"
                      sub="Chọn 1 bộ hiện tại của bạn — từ trùng english sẽ bị bỏ qua"
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
                            {d.name} ({d.card_count} từ)
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
                disabled={!parsed || submitting}
                style={{
                  ...primaryBtn(),
                  opacity: !parsed || submitting ? 0.55 : 1,
                  cursor: !parsed || submitting ? 'not-allowed' : 'pointer',
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
