'use client';

import { useEffect, useState } from 'react';
import { X, Trash2, Pencil, Check, Loader2 } from 'lucide-react';
import AudioButton from '../AudioButton';
import { apiJson } from '@/lib/common/api-json';
import type { Flashcard } from '@/lib/types';

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
 * Out of scope for v1 edit: examples and collocations are array-shaped
 * — editing them inline needs add/remove/reorder UI which is its own
 * mini-feature. They stay read-only in edit mode and the modal shows a
 * hint that re-generating from the Add screen is the path to refresh
 * them.
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
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setEnglish(card.english);
    setVietnamese(card.vietnamese);
    setIpa(card.ipa ?? '');
    setPos(card.part_of_speech ?? '');
    setNotes(card.notes ?? '');
    setMode('view');
    setError(null);
  }, [card.id]);

  const dirty =
    english.trim() !== card.english ||
    vietnamese.trim() !== card.vietnamese ||
    (ipa.trim() || null) !== (card.ipa ?? null) ||
    (pos.trim() || null) !== (card.part_of_speech ?? null) ||
    (notes.trim() || null) !== (card.notes ?? null);

  function cancel() {
    setEnglish(card.english);
    setVietnamese(card.vietnamese);
    setIpa(card.ipa ?? '');
    setPos(card.part_of_speech ?? '');
    setNotes(card.notes ?? '');
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
                  <AudioButton audioUrl={card.audio_url} fallbackText={card.english} size={32} />
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

        {/* Examples — read-only in both modes (array editor is out of scope) */}
        {card.examples.length > 0 && (
          <Section title="Ví dụ">
            {card.examples.map((ex, i) => (
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
