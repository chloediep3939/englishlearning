'use client';

import { useEffect, useState } from 'react';
import {
  X, Trash2, Pencil, Check, Loader2,
  RefreshCw, Image as ImageIcon, Volume2, Type, Languages, Sparkles,
} from 'lucide-react';
import AudioButton from '../AudioButton';
import { apiJson } from '@/lib/common/api-json';
import type { ClozeSentence, Flashcard, FlashcardExample } from '@/lib/types';

type RegenField = 'image' | 'audio' | 'ipa' | 'vietnamese';
const ALL_REGEN_FIELDS: RegenField[] = ['image', 'audio', 'ipa', 'vietnamese'];

interface RegenResponse {
  card: Flashcard;
  ok: RegenField[];
  failed: RegenField[];
}

const FIELD_LABEL_VI: Record<RegenField, string> = {
  image: 'hình',
  audio: 'âm thanh',
  ipa: 'phiên âm',
  vietnamese: 'nghĩa',
};

interface Props {
  card: Flashcard;
  onClose: () => void;
  onDelete: () => void;
  /** Fired after a successful save with the freshly-fetched card so the
   *  parent can replace its row in the list without a full page refresh. */
  onSaved: (updated: Flashcard) => void;
}

type Mode = 'view' | 'edit';

/**
 * Card detail drawer with a view↔edit toggle. View mode shows the
 * read-only summary (image, IPA, examples, collocations, notes). Edit
 * mode swaps the scalar fields (english, vietnamese, ipa, pos, notes)
 * into inputs and surfaces save/cancel actions.
 *
 * Edit mode also exposes the card's example sentences (en + vi rows,
 * add/remove, max 5) — the same shape the single-import preview editor
 * uses. Collocations stay read-only.
 */
export default function CardDetailModal({ card, onClose, onDelete, onSaved }: Props) {
  const [mode, setMode] = useState<Mode>('view');

  // Local form state — initialized from the card and reset when the user
  // cancels or when the parent swaps to a different card.
  const [english, setEnglish] = useState(card.english);
  const [vietnamese, setVietnamese] = useState(card.vietnamese);
  const [ipa, setIpa] = useState(card.ipa ?? '');
  const [pos, setPos] = useState(card.part_of_speech ?? '');
  const [notes, setNotes] = useState(card.notes ?? '');
  const [examples, setExamples] = useState<FlashcardExample[]>(card.examples);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Regen state. `regenerating` tracks which fields are currently being
  // refetched (so each button can show its own spinner). `regenMsg` flashes a
  // short status string under the toolbar after the call returns.
  const [regenerating, setRegenerating] = useState<Set<RegenField>>(new Set());
  const [regenMsg, setRegenMsg] = useState<{ text: string; color: string } | null>(null);

  useEffect(() => {
    setEnglish(card.english);
    setVietnamese(card.vietnamese);
    setIpa(card.ipa ?? '');
    setPos(card.part_of_speech ?? '');
    setNotes(card.notes ?? '');
    setExamples(card.examples);
    setMode('view');
    setError(null);
    setRegenerating(new Set());
    setRegenMsg(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card.id]);

  async function regenerate(fields: RegenField[]) {
    if (fields.length === 0) return;
    setRegenerating(new Set(fields));
    setRegenMsg(null);
    try {
      const data = await apiJson<RegenResponse>(`/api/cards/${card.id}/regenerate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields }),
      });
      onSaved(data.card);
      if (data.failed.length === 0) {
        const okLabels = data.ok.map((f) => FIELD_LABEL_VI[f]).join(', ');
        setRegenMsg({ text: `Đã gen lại ${okLabels}.`, color: 'var(--v-primary)' });
      } else if (data.ok.length === 0) {
        const failLabels = data.failed.map((f) => FIELD_LABEL_VI[f]).join(', ');
        setRegenMsg({ text: `Không gen được ${failLabels}.`, color: 'var(--v-red)' });
      } else {
        const okLabels = data.ok.map((f) => FIELD_LABEL_VI[f]).join(', ');
        const failLabels = data.failed.map((f) => FIELD_LABEL_VI[f]).join(', ');
        setRegenMsg({
          text: `OK: ${okLabels}. Lỗi: ${failLabels}.`,
          color: 'var(--v-orange)',
        });
      }
    } catch (e) {
      setRegenMsg({
        text: e instanceof Error ? e.message : 'Không gen lại được.',
        color: 'var(--v-red)',
      });
    } finally {
      setRegenerating(new Set());
    }
  }

  // Cloze pool examples — replaces the legacy `card.examples` column as the
  // example-sentence source. Cards saved before the pool feature landed have
  // an empty pool initially; the server lazy-fills on the first fetch.
  const [poolSentences, setPoolSentences] = useState<ClozeSentence[]>([]);
  const [poolLoading, setPoolLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setPoolLoading(true);
    (async () => {
      try {
        const data = await apiJson<{ sentences: ClozeSentence[] }>(
          `/api/cloze/pool?word=${encodeURIComponent(card.english)}&limit=2`
        );
        if (!cancelled) setPoolSentences(data.sentences ?? []);
      } catch {
        if (!cancelled) setPoolSentences([]);
      } finally {
        if (!cancelled) setPoolLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [card.id, card.english]);

  // Rows the PUT will actually persist: en required, vi kept only when
  // non-empty. Blank rows (fresh "+ Thêm ví dụ" not yet typed) drop out.
  const cleanedExamples: FlashcardExample[] = examples
    .map((ex) => {
      const en = ex.en.trim();
      const vi = (ex.vi ?? '').trim();
      return vi ? { en, vi } : { en };
    })
    .filter((ex) => ex.en.length > 0);

  const dirty =
    english.trim() !== card.english ||
    vietnamese.trim() !== card.vietnamese ||
    (ipa.trim() || null) !== (card.ipa ?? null) ||
    (pos.trim() || null) !== (card.part_of_speech ?? null) ||
    (notes.trim() || null) !== (card.notes ?? null) ||
    JSON.stringify(cleanedExamples) !== JSON.stringify(card.examples);

  function cancel() {
    setEnglish(card.english);
    setVietnamese(card.vietnamese);
    setIpa(card.ipa ?? '');
    setPos(card.part_of_speech ?? '');
    setNotes(card.notes ?? '');
    setExamples(card.examples);
    setMode('view');
    setError(null);
  }

  async function save() {
    const enT = english.trim();
    const viT = vietnamese.trim();
    if (enT.length === 0 || enT.length > 200) {
      setError('Từ tiếng Anh không hợp lệ.');
      return;
    }
    if (viT.length === 0 || viT.length > 500) {
      setError('Nghĩa tiếng Việt không hợp lệ.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const updated = await apiJson<Flashcard>(`/api/cards/${card.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          english: enT,
          vietnamese: viT,
          ipa: ipa.trim() || null,
          part_of_speech: pos.trim() || null,
          notes: notes.trim() || null,
          examples: cleanedExamples,
        }),
      });
      onSaved(updated);
      setMode('view');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không lưu được.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
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
      onClick={onClose}
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {mode === 'view' ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <h2
                    style={{
                      fontFamily: 'var(--v-font-head)',
                      fontWeight: 900,
                      fontSize: 'var(--v-text-2xl)',
                      margin: 0,
                      color: 'var(--v-ink)',
                    }}
                  >
                    {card.english}
                  </h2>
                  <AudioButton
                    fallbackText={card.english}
                    size={32}
                    showTts
                    cardId={card.id}
                    audioStatus={card.audio_us_status}
                    audioVersion={card.updated_at}
                  />
                </div>
                {card.ipa && (
                  <div
                    style={{
                      marginTop: 4,
                      fontFamily: 'var(--v-font-mono)',
                      fontSize: 'var(--v-text-md)',
                      color: 'var(--v-muted)',
                    }}
                  >
                    {card.ipa}
                  </div>
                )}
                <div
                  style={{
                    marginTop: 6,
                    fontFamily: 'var(--v-font-body)',
                    fontSize: 'var(--v-text-md)',
                    color: 'var(--v-ink-soft)',
                  }}
                >
                  {card.vietnamese}
                  {card.part_of_speech && (
                    <span style={{ marginLeft: 8, color: 'var(--v-muted)' }}>
                      · {card.part_of_speech}
                    </span>
                  )}
                </div>
              </>
            ) : (
              <EditFields
                english={english}
                vietnamese={vietnamese}
                ipa={ipa}
                pos={pos}
                setEnglish={setEnglish}
                setVietnamese={setVietnamese}
                setIpa={setIpa}
                setPos={setPos}
              />
            )}
          </div>
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            {mode === 'view' && (
              <button
                type="button"
                onClick={() => setMode('edit')}
                aria-label="Sửa"
                style={iconBtnStyle()}
              >
                <Pencil size={14} />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng"
              style={{ ...iconBtnStyle(), border: 'none' }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Image — read-only in both modes */}
        {card.image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={card.image_url}
            alt={card.english}
            style={{
              width: '100%',
              maxHeight: 220,
              objectFit: 'cover',
              borderRadius: 'var(--v-radius-md)',
              marginBottom: 12,
            }}
          />
        )}

        {/* Regen toolbar — only in view mode. Lets the user manually
            re-fetch image / audio / IPA / meaning when the auto-fill
            missed or returned a poor result. */}
        {mode === 'view' && (
          <Section title="Gen lại">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              <RegenChip
                icon={<ImageIcon size={12} />}
                label="Hình"
                onClick={() => regenerate(['image'])}
                loading={regenerating.has('image')}
                disabled={regenerating.size > 0}
              />
              <RegenChip
                icon={<Volume2 size={12} />}
                label="Audio"
                onClick={() => regenerate(['audio'])}
                loading={regenerating.has('audio')}
                disabled={regenerating.size > 0}
              />
              <RegenChip
                icon={<Type size={12} />}
                label="IPA"
                onClick={() => regenerate(['ipa'])}
                loading={regenerating.has('ipa')}
                disabled={regenerating.size > 0}
              />
              <RegenChip
                icon={<Languages size={12} />}
                label="Nghĩa"
                onClick={() => regenerate(['vietnamese'])}
                loading={regenerating.has('vietnamese')}
                disabled={regenerating.size > 0}
              />
              <RegenChip
                icon={<Sparkles size={12} />}
                label="Tất cả"
                onClick={() => regenerate(ALL_REGEN_FIELDS)}
                loading={regenerating.size > 1}
                disabled={regenerating.size > 0}
                primary
              />
            </div>
            {regenMsg && (
              <div
                style={{
                  marginTop: 8,
                  fontFamily: 'var(--v-font-body)',
                  fontSize: 'var(--v-text-sm)',
                  fontWeight: 700,
                  color: regenMsg.color,
                }}
              >
                {regenMsg.text}
              </div>
            )}
          </Section>
        )}

        {/* Notes — editable; in view mode only render when present */}
        {mode === 'edit' ? (
          <Section title="Ghi chú">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Tự ghi chú thêm (tuỳ chọn)…"
              rows={3}
              style={{
                ...inputStyle(),
                fontFamily: 'var(--v-font-body)',
                resize: 'vertical',
              }}
            />
          </Section>
        ) : (
          card.notes && (
            <Section title="Ghi chú">
              <p
                style={{
                  margin: 0,
                  fontFamily: 'var(--v-font-body)',
                  fontSize: 'var(--v-text-sm)',
                  color: 'var(--v-ink-soft)',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {card.notes}
              </p>
            </Section>
          )
        )}

        {/* Examples. Edit mode: en+vi rows over `card.examples` (the column
            "Học câu" drills), add/remove, max 5. View mode: cloze-pool
            sentences, falling back to `card.examples` for pre-pool cards. */}
        {mode === 'edit' && (
          <Section title="Ví dụ (en + vi, dùng cho Học câu)">
            {examples.map((ex, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  gap: 6,
                  alignItems: 'flex-start',
                  marginBottom: 6,
                }}
              >
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <input
                    type="text"
                    value={ex.en}
                    onChange={(e) => {
                      const next = [...examples];
                      next[i] = { ...next[i], en: e.target.value };
                      setExamples(next);
                    }}
                    placeholder={`Câu tiếng Anh ${i + 1}…`}
                    style={inputStyle()}
                  />
                  <input
                    type="text"
                    value={ex.vi ?? ''}
                    onChange={(e) => {
                      const next = [...examples];
                      next[i] = { ...next[i], vi: e.target.value };
                      setExamples(next);
                    }}
                    placeholder="Nghĩa tiếng Việt (tuỳ chọn)…"
                    style={{ ...inputStyle(), fontFamily: 'var(--v-font-body)' }}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setExamples(examples.filter((_, j) => j !== i))}
                  aria-label={`Xoá ví dụ ${i + 1}`}
                  style={{
                    marginTop: 4,
                    width: 28,
                    height: 28,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'var(--v-surface)',
                    border: '1px solid var(--v-border)',
                    borderRadius: 'var(--v-radius-sm)',
                    color: 'var(--v-red)',
                    cursor: 'pointer',
                    flexShrink: 0,
                  }}
                >
                  <X size={13} />
                </button>
              </div>
            ))}
            {examples.length < 5 && (
              <button
                type="button"
                onClick={() => setExamples([...examples, { en: '', vi: '' }])}
                style={{
                  padding: '7px 12px',
                  background: 'var(--v-surface)',
                  border: '1px dashed var(--v-border)',
                  borderRadius: 'var(--v-radius-sm)',
                  color: 'var(--v-ink-soft)',
                  fontFamily: 'var(--v-font-head)',
                  fontWeight: 800,
                  fontSize: 'var(--v-text-xs)',
                  cursor: 'pointer',
                }}
              >
                + Thêm ví dụ
              </button>
            )}
          </Section>
        )}
        {mode === 'view' && (poolSentences.length > 0 || (!poolLoading && card.examples.length > 0)) && (
          <Section title="Ví dụ">
            {poolSentences.length > 0
              ? poolSentences.map((s, i) => (
                  <div
                    key={s.id ?? i}
                    style={{
                      padding: '8px 12px',
                      background: 'var(--v-panel)',
                      borderRadius: 'var(--v-radius-sm)',
                      marginBottom: 6,
                      fontFamily: 'var(--v-font-body)',
                      fontSize: 'var(--v-text-sm)',
                      color: 'var(--v-ink)',
                    }}
                  >
                    <PoolSentence sentence={s.sentence} blankWord={s.blank_word} />
                  </div>
                ))
              : card.examples.map((ex, i) => (
                  <div
                    key={i}
                    style={{
                      padding: '8px 12px',
                      background: 'var(--v-panel)',
                      borderRadius: 'var(--v-radius-sm)',
                      marginBottom: 6,
                      fontFamily: 'var(--v-font-body)',
                      fontSize: 'var(--v-text-sm)',
                      color: 'var(--v-ink)',
                    }}
                  >
                    <div>{ex.en}</div>
                    {ex.vi && <div style={{ color: 'var(--v-muted)', marginTop: 2 }}>{ex.vi}</div>}
                  </div>
                ))}
          </Section>
        )}

        {/* Collocations — read-only in both modes */}
        {card.collocations.length > 0 && (
          <Section title="Collocations">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {card.collocations.map((co, i) => (
                <span
                  key={i}
                  style={{
                    padding: '4px 10px',
                    background: 'var(--v-panel)',
                    border: '1px solid var(--v-border)',
                    borderRadius: 'var(--v-radius-pill)',
                    fontFamily: 'var(--v-font-body)',
                    fontSize: 'var(--v-text-sm)',
                    color: 'var(--v-ink-soft)',
                  }}
                >
                  {co.phrase}
                </span>
              ))}
            </div>
          </Section>
        )}

        {error && (
          <div
            style={{
              marginTop: 14,
              padding: '8px 12px',
              background: 'rgba(255,87,87,0.08)',
              border: '1px solid rgba(255,87,87,0.25)',
              borderRadius: 'var(--v-radius-sm)',
              color: 'var(--v-red)',
              fontSize: 'var(--v-text-sm)',
            }}
          >
            {error}
          </div>
        )}

        {/* Action row */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: 18,
            gap: 8,
            flexWrap: 'wrap',
          }}
        >
          {mode === 'view' ? (
            <>
              <span />
              <button
                type="button"
                onClick={onDelete}
                style={{
                  padding: '8px 14px',
                  background: 'transparent',
                  color: 'var(--v-red)',
                  border: '1px solid var(--v-red)',
                  borderRadius: 'var(--v-radius-md)',
                  fontFamily: 'var(--v-font-head)',
                  fontWeight: 800,
                  fontSize: 'var(--v-text-sm)',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <Trash2 size={12} /> Xoá thẻ
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={cancel}
                disabled={saving}
                style={{
                  padding: '8px 14px',
                  background: 'var(--v-surface)',
                  color: 'var(--v-ink-soft)',
                  border: '1px solid var(--v-border)',
                  borderRadius: 'var(--v-radius-md)',
                  fontFamily: 'var(--v-font-head)',
                  fontWeight: 800,
                  fontSize: 'var(--v-text-sm)',
                  cursor: saving ? 'wait' : 'pointer',
                }}
              >
                Huỷ
              </button>
              <button
                type="button"
                onClick={save}
                disabled={saving || !dirty}
                style={{
                  padding: '8px 16px',
                  background: 'var(--v-primary)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 'var(--v-radius-md)',
                  boxShadow: 'var(--v-press), 0 4px 10px rgba(122,193,67,0.4)',
                  fontFamily: 'var(--v-font-head)',
                  fontWeight: 900,
                  fontSize: 'var(--v-text-sm)',
                  cursor: saving || !dirty ? 'not-allowed' : 'pointer',
                  opacity: saving || !dirty ? 0.5 : 1,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                {saving ? (
                  <Loader2 size={12} style={{ animation: 'v-spin 1s linear infinite' }} />
                ) : (
                  <Check size={12} />
                )}
                {saving ? 'ĐANG LƯU…' : 'LƯU'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function EditFields({
  english, vietnamese, ipa, pos,
  setEnglish, setVietnamese, setIpa, setPos,
}: {
  english: string;
  vietnamese: string;
  ipa: string;
  pos: string;
  setEnglish: (v: string) => void;
  setVietnamese: (v: string) => void;
  setIpa: (v: string) => void;
  setPos: (v: string) => void;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <FieldLabel>Từ tiếng Anh</FieldLabel>
      <input
        type="text"
        value={english}
        onChange={(e) => setEnglish(e.target.value)}
        autoFocus
        style={{
          ...inputStyle(),
          fontFamily: 'var(--v-font-head)',
          fontSize: 'var(--v-text-xl)',
          fontWeight: 800,
        }}
      />
      <FieldLabel>Nghĩa tiếng Việt</FieldLabel>
      <input
        type="text"
        value={vietnamese}
        onChange={(e) => setVietnamese(e.target.value)}
        style={inputStyle()}
      />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <div>
          <FieldLabel>IPA</FieldLabel>
          <input
            type="text"
            value={ipa}
            onChange={(e) => setIpa(e.target.value)}
            placeholder="/ɪnˈʃʊr/"
            style={{ ...inputStyle(), fontFamily: 'var(--v-font-mono)' }}
          />
        </div>
        <div>
          <FieldLabel>Loại từ</FieldLabel>
          <input
            type="text"
            value={pos}
            onChange={(e) => setPos(e.target.value)}
            placeholder="verb, noun, adj…"
            style={inputStyle()}
          />
        </div>
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
      }}
    >
      {children}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 14 }}>
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
        {title}
      </div>
      {children}
    </div>
  );
}

function PoolSentence({ sentence, blankWord }: { sentence: string; blankWord: string }) {
  // Pool rows store the sentence with `__` (or more) at the target word slot.
  // We render the complete sentence with the target word highlighted so the
  // example reads naturally; the cloze quiz uses the same source for testing.
  const match = sentence.match(/_{2,}/);
  if (!match) {
    return <div>{sentence}</div>;
  }
  const idx = match.index ?? 0;
  const before = sentence.slice(0, idx);
  const after = sentence.slice(idx + match[0].length);
  return (
    <div>
      {before}
      <strong style={{ color: 'var(--v-primary)', fontWeight: 800 }}>{blankWord}</strong>
      {after}
    </div>
  );
}

function iconBtnStyle(): React.CSSProperties {
  return {
    width: 30,
    height: 30,
    padding: 0,
    background: 'transparent',
    border: '1px solid var(--v-border)',
    borderRadius: 'var(--v-radius-sm)',
    cursor: 'pointer',
    color: 'var(--v-ink-soft)',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  };
}

function inputStyle(): React.CSSProperties {
  return {
    width: '100%',
    padding: '10px 12px',
    fontFamily: 'var(--v-font-body)',
    fontSize: 'var(--v-text-base)',
    fontWeight: 600,
    background: 'var(--v-bg)',
    border: '1.5px solid var(--v-border)',
    borderRadius: 'var(--v-radius-sm)',
    color: 'var(--v-ink)',
    outline: 'none',
  };
}

// Small pill button used by the regen toolbar. `primary=true` is for the
// "Tất cả" variant — filled green so it visually stands out from the per-
// field chips. `loading` swaps the leading icon for a spinner.
function RegenChip({
  icon,
  label,
  onClick,
  loading,
  disabled,
  primary,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  loading: boolean;
  disabled: boolean;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: '6px 10px',
        background: primary ? 'var(--v-primary)' : 'var(--v-surface)',
        color: primary ? '#fff' : 'var(--v-ink-soft)',
        border: primary ? 'none' : '1px solid var(--v-border)',
        borderRadius: 'var(--v-radius-pill)',
        boxShadow: primary ? 'var(--v-shadow-sm)' : 'none',
        fontFamily: 'var(--v-font-head)',
        fontSize: 11,
        fontWeight: 800,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled && !loading ? 0.55 : 1,
        transition: 'opacity 120ms var(--v-ease)',
      }}
    >
      {loading ? <Loader2 size={12} style={{ animation: 'v-spin 1s linear infinite' }} /> : icon}
      {label}
    </button>
  );
}
