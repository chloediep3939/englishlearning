'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Check,
  Image as ImageIcon,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  Sparkles,
  Volume2,
  X as XIcon,
} from 'lucide-react';
import AudioButton from '@/components/AudioButton';
import LoadingState from '@/components/common/LoadingState';
import LookupPills from '@/components/common/LookupPills';
import POSPill from '@/components/common/POSPill';
import type {
  FlashcardCollocation,
  FlashcardDeckWithCounts,
  FlashcardExample,
  FlashcardImageAttribution,
} from '@/lib/types';
import { apiJson } from '@/lib/common/api-json';

interface GeneratedData {
  english: string;
  vietnamese: string | null;
  ipa: string | null;
  audio_url: string | null;
  ipa_alt: string | null;
  audio_url_alt: string | null;
  accent: 'us' | 'uk' | 'unknown' | null;
  part_of_speech: string | null;
  examples: FlashcardExample[];
  collocations: FlashcardCollocation[];
  definitions: string[];
  image_url: string | null;
  image_attribution: FlashcardImageAttribution | null;
}

// Editable preview state — populated from the AI response, then mutated
// in-place as the user edits inline. We persist this exactly to /api/cards
// on save, so what the user sees in the right column IS what hits the DB.
interface EditState {
  ipa: string;
  vietnamese: string;
  part_of_speech: string | null;
  audio_url: string | null;
  examples: Array<{ en: string; vi: string }>;
  collocations: string[];
  image_url: string | null;
  image_attribution: FlashcardImageAttribution | null;
}

type Phase = 'idle' | 'generating' | 'previewing' | 'saving';

export default function SingleImport() {
  const router = useRouter();

  // Left form
  const [english, setEnglish] = useState('');
  const [vietnamese, setVietnamese] = useState('');
  const [notes, setNotes] = useState('');
  const [deckId, setDeckId] = useState<number | null>(null);
  const [decks, setDecks] = useState<FlashcardDeckWithCounts[]>([]);
  const englishInputRef = useRef<HTMLInputElement>(null);
  const userEditedVi = useRef(false);

  // Phase + preview state
  const [phase, setPhase] = useState<Phase>('idle');
  // While true, the left form is locked (input/select/textarea disabled). The
  // "Sửa lại" button drops back to false but keeps the preview intact, so the
  // user can change deck/notes without re-generating.
  const [formLocked, setFormLocked] = useState(false);
  const [generated, setGenerated] = useState<GeneratedData | null>(null);
  const [edit, setEdit] = useState<EditState | null>(null);
  const [imageReloading, setImageReloading] = useState(false);
  const imageSkipRef = useRef(0);

  // Banners
  const [error, setError] = useState<string | null>(null);
  const [justAdded, setJustAdded] = useState<string | null>(null);

  useEffect(() => {
    apiJson<{ decks?: FlashcardDeckWithCounts[] }>('/api/decks')
      .then((d) => {
        const list = d.decks ?? [];
        setDecks(list);
        // Pre-select deck from URL (e.g. coming from /decks/[id] "+ Thêm từ").
        // Only honor when the deck actually exists for this user.
        if (typeof window !== 'undefined') {
          const params = new URLSearchParams(window.location.search);
          const raw = params.get('deck_id');
          const n = raw ? Number(raw) : NaN;
          if (Number.isInteger(n) && n > 0 && list.some((deck) => deck.id === n)) {
            setDeckId(n);
          }
        }
      })
      .catch(() => {});
  }, []);

  // ───────────────────────────────────────────────────────────────────────
  // Generate / save
  // ───────────────────────────────────────────────────────────────────────

  async function runPreview() {
    const en = english.trim();
    if (en.length === 0) {
      setError('Cần điền từ tiếng Anh.');
      return;
    }
    setError(null);
    setPhase('generating');
    setFormLocked(true);
    imageSkipRef.current = 0;
    try {
      const res = await fetch('/api/cards/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          english: en,
          // If the user typed VN, override the AI translation.
          vn_meaning: vietnamese.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? 'Không tự sinh được.');
        setPhase('idle');
        setFormLocked(false);
        return;
      }
      const data = (await res.json()) as GeneratedData;
      setGenerated(data);
      setEdit(toEditState(data, vietnamese));
      if (!userEditedVi.current && data.vietnamese) setVietnamese(data.vietnamese);
      // Sync the left input to the lemmatized headword the server returned —
      // user types "boxes" / "ran" and the input flips to "box" / "run" so
      // what they see in the preview is what gets saved.
      if (data.english && data.english !== en) setEnglish(data.english);
      setPhase('previewing');
    } catch {
      setError('Lỗi kết nối.');
      setPhase('idle');
      setFormLocked(false);
    }
  }

  async function runSave() {
    if (!edit) return;
    const en = english.trim();
    // Vietnamese meaning is optional ("Bỏ trống để Bún tự dịch") — when
    // auto-translate fails the card saves with '' and the deck UI flags it
    // as "thiếu nghĩa" for a later regen.
    const vi = edit.vietnamese.trim();
    if (en.length === 0) {
      setError('Cần điền từ tiếng Anh.');
      return;
    }
    setError(null);
    setPhase('saving');
    try {
      const res = await fetch('/api/cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          english: en,
          vietnamese: vi,
          deck_id: deckId,
          ipa: edit.ipa.trim() || null,
          part_of_speech: edit.part_of_speech,
          audio_url: edit.audio_url,
          examples: edit.examples
            .map((e) => ({ en: e.en.trim(), vi: e.vi.trim() }))
            .filter((e) => e.en.length > 0)
            .map((e) => (e.vi ? e : { en: e.en })),
          collocations: edit.collocations
            .map((s) => s.trim())
            .filter((s) => s.length > 0),
          image_url: edit.image_url,
          image_attribution: edit.image_attribution,
          notes: notes.trim() || null,
        }),
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        setError(d.error ?? 'Không thêm được từ.');
        setPhase('previewing');
        return;
      }
      setJustAdded(en);
      resetAll();
      setTimeout(() => setJustAdded(null), 3000);
      englishInputRef.current?.focus();
      router.refresh();
    } catch {
      setError('Lỗi kết nối.');
      setPhase('previewing');
    }
  }

  function resetAll() {
    setEnglish('');
    setVietnamese('');
    setNotes('');
    setGenerated(null);
    setEdit(null);
    setPhase('idle');
    setFormLocked(false);
    userEditedVi.current = false;
    imageSkipRef.current = 0;
    setError(null);
  }

  function unlockForEdit() {
    // "Sửa lại" — re-enable the left form without losing the preview's
    // inline edits. Next click on "Lưu từ này" will save the current edit
    // state plus whatever the user changed on the left (deck/notes).
    setFormLocked(false);
  }

  async function reloadImage() {
    if (!edit || !english.trim() || imageReloading) return;
    const next = imageSkipRef.current + 1;
    imageSkipRef.current = next;
    setImageReloading(true);
    try {
      const res = await fetch(
        `/api/images/pexels?q=${encodeURIComponent(english.trim())}&skip=${next}`
      );
      if (!res.ok) {
        if (res.status === 404) imageSkipRef.current = 0;
        return;
      }
      const data = (await res.json()) as {
        image_url: string;
        image_attribution: FlashcardImageAttribution;
      };
      setEdit({ ...edit, image_url: data.image_url, image_attribution: data.image_attribution });
    } catch (err) {
      console.warn('[reloadImage] failed:', err);
    } finally {
      setImageReloading(false);
    }
  }

  async function fetchInitialImage() {
    if (!edit || !english.trim() || imageReloading) return;
    imageSkipRef.current = 0;
    setImageReloading(true);
    try {
      const res = await fetch(`/api/images/pexels?q=${encodeURIComponent(english.trim())}&skip=0`);
      if (!res.ok) return;
      const data = (await res.json()) as {
        image_url: string;
        image_attribution: FlashcardImageAttribution;
      };
      setEdit({ ...edit, image_url: data.image_url, image_attribution: data.image_attribution });
    } catch (err) {
      console.warn('[fetchInitialImage] failed:', err);
    } finally {
      setImageReloading(false);
    }
  }

  function swapAccent() {
    if (!generated || !edit || !generated.audio_url_alt) return;
    setGenerated({
      ...generated,
      audio_url: generated.audio_url_alt,
      ipa: generated.ipa_alt,
      audio_url_alt: generated.audio_url,
      ipa_alt: generated.ipa,
      accent: generated.accent === 'us' ? 'uk' : generated.accent === 'uk' ? 'us' : 'unknown',
    });
    setEdit({
      ...edit,
      ipa: generated.ipa_alt ?? '',
      audio_url: generated.audio_url_alt,
    });
  }

  // ───────────────────────────────────────────────────────────────────────
  // Render
  // ───────────────────────────────────────────────────────────────────────

  const isPreview = phase === 'previewing' || phase === 'saving';
  const isGenerating = phase === 'generating';

  return (
    <>
      {justAdded && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 14px',
            background: 'var(--v-primary-soft)',
            border: '1px solid var(--v-primary)',
            borderRadius: 'var(--v-radius-md)',
            color: 'var(--v-primary-deep)',
            fontFamily: 'var(--v-font-head)',
            fontWeight: 800,
            fontSize: 'var(--v-text-md)',
            marginBottom: 16,
          }}
        >
          <Check size={16} /> Đã thêm &quot;{justAdded}&quot; vào thư viện
        </div>
      )}

      {error && (
        <div
          style={{
            padding: '10px 14px',
            background: 'rgba(255,87,87,0.08)',
            border: '1px solid rgba(255,87,87,0.25)',
            borderRadius: 'var(--v-radius-md)',
            color: 'var(--v-red)',
            fontSize: 'var(--v-text-md)',
            marginBottom: 16,
          }}
        >
          {error}
        </div>
      )}

      <section
        style={{
          display: 'grid',
          gridTemplateColumns: '0.95fr 1.05fr',
          gap: 28,
          alignItems: 'flex-start',
        }}
      >
        {/* ─── Left: form ─── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Field label="Từ tiếng Anh" required>
            <input
              ref={englishInputRef}
              type="text"
              value={english}
              onChange={(e) => setEnglish(e.target.value)}
              placeholder="vd: preferential"
              autoComplete="off"
              autoFocus
              disabled={formLocked}
              style={{
                ...inputStyle(formLocked),
                fontSize: 16,
                fontWeight: 800,
                fontFamily: 'var(--v-font-head)',
                borderColor: formLocked ? 'var(--v-border)' : 'var(--v-primary)',
                boxShadow: formLocked ? 'none' : '0 3px 0 rgba(122,193,67,0.15)',
              }}
            />
          </Field>

          <Field label="Nghĩa tiếng Việt" hint="tuỳ chọn">
            <input
              type="text"
              value={vietnamese}
              onChange={(e) => {
                userEditedVi.current = e.target.value.length > 0;
                setVietnamese(e.target.value);
              }}
              placeholder={
                isGenerating ? 'Đang dịch...' : 'Bỏ trống để Bún tự dịch'
              }
              autoComplete="off"
              disabled={formLocked}
              style={inputStyle(formLocked)}
            />
          </Field>

          <Field label="Bộ từ">
            <div style={{ position: 'relative' }}>
              <select
                value={deckId ?? ''}
                onChange={(e) => setDeckId(e.target.value ? Number(e.target.value) : null)}
                disabled={formLocked && phase !== 'previewing'}
                style={{
                  ...inputStyle(formLocked && phase !== 'previewing'),
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

          <Field label="Ghi chú" hint="tuỳ chọn">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ghi chú cá nhân, ví dụ dịch câu, mẹo nhớ…"
              rows={3}
              disabled={formLocked && phase !== 'previewing'}
              style={{
                ...inputStyle(formLocked && phase !== 'previewing'),
                resize: 'vertical',
                minHeight: 80,
                fontFamily: 'var(--v-font-body)',
              }}
            />
          </Field>

          {/* Hint banner */}
          <div
            style={{
              background: 'var(--v-primary-soft)',
              border: '1px solid rgba(122,193,67,0.25)',
              borderRadius: 14,
              padding: '12px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 10,
                background: 'var(--v-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {isGenerating ? (
                <RefreshCw
                  size={16}
                  color="#fff"
                  style={{ animation: 'v-spin 1s linear infinite' }}
                />
              ) : (
                <Sparkles size={16} color="#fff" strokeWidth={2.4} />
              )}
            </div>
            <div
              style={{
                flex: 1,
                fontFamily: 'var(--v-font-body)',
                fontSize: 12,
                fontWeight: 700,
                color: 'var(--v-ink-soft)',
                lineHeight: 1.4,
              }}
            >
              {isGenerating
                ? 'Bún đang tra cứu IPA · audio · ví dụ · ảnh · collocations...'
                : 'Tự sinh: IPA · audio · 3 ví dụ Oxford + dịch Việt · ảnh Pexels · collocations'}
            </div>
          </div>

          {/* Actions */}
          {!isPreview ? (
            <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
              <button
                type="button"
                onClick={runPreview}
                disabled={isGenerating || english.trim().length === 0}
                style={primaryButton(isGenerating || english.trim().length === 0)}
              >
                <Sparkles size={16} strokeWidth={2.6} />
                {isGenerating ? 'ĐANG TRA CỨU...' : 'XEM TRƯỚC'}
              </button>
              <button
                type="button"
                onClick={resetAll}
                disabled={isGenerating}
                style={secondaryButton(isGenerating)}
              >
                <RotateCcw size={14} />
                Xoá form
              </button>
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                gap: 10,
                marginTop: 4,
                flexWrap: 'wrap',
              }}
            >
              <button
                type="button"
                onClick={runSave}
                disabled={phase === 'saving'}
                style={primaryButton(phase === 'saving')}
              >
                <Check size={16} strokeWidth={3} />
                {phase === 'saving' ? 'ĐANG LƯU...' : 'LƯU TỪ NÀY'}
              </button>
              <button
                type="button"
                onClick={runPreview}
                disabled={phase === 'saving'}
                style={secondaryButton(phase === 'saving')}
                title="Sinh lại — sẽ huỷ các sửa đổi trong preview"
              >
                <Sparkles size={14} />
                Tạo lại
              </button>
              <button
                type="button"
                onClick={unlockForEdit}
                disabled={phase === 'saving' || !formLocked}
                style={tertiaryButton(phase === 'saving' || !formLocked)}
                title="Mở khoá form bên trái để sửa bộ / ghi chú"
              >
                <Pencil size={12} />
                Sửa lại
              </button>
            </div>
          )}
        </div>

        {/* ─── Right: preview ─── */}
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 10,
            }}
          >
            <Sparkles
              size={14}
              color="var(--v-primary)"
              fill="var(--v-primary)"
              strokeWidth={2.4}
            />
            <div
              style={{
                fontFamily: 'var(--v-font-body)',
                fontSize: 11,
                fontWeight: 900,
                color: 'var(--v-primary)',
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
              }}
            >
              Xem trước
            </div>
            <div style={{ flex: 1, height: 1, background: 'var(--v-border)' }} />
          </div>

          {phase === 'idle' && <EmptyPreview />}
          {phase === 'generating' && (
            <div
              className="v-card"
              style={{
                minHeight: 320,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <LoadingState message="Bún đang tra cứu..." size={80} />
            </div>
          )}
          {(phase === 'previewing' || phase === 'saving') && edit && (
            <EditablePreview
              english={english}
              edit={edit}
              setEdit={setEdit}
              generated={generated}
              imageReloading={imageReloading}
              onReloadImage={reloadImage}
              onFetchImage={fetchInitialImage}
              onSwapAccent={swapAccent}
              disabled={phase === 'saving'}
            />
          )}
        </div>
      </section>
    </>
  );
}

// ────────────────────────────────────────────────────────────────────────
// Editable preview panel
// ────────────────────────────────────────────────────────────────────────

function EmptyPreview() {
  return (
    <div
      className="v-card"
      style={{
        minHeight: 320,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        color: 'var(--v-muted)',
        textAlign: 'center',
        padding: 32,
      }}
    >
      <Sparkles size={28} color="var(--v-muted)" strokeWidth={1.5} />
      <div style={{ fontFamily: 'var(--v-font-body)', fontSize: 13, fontWeight: 700 }}>
        Nhập từ tiếng Anh để xem preview
      </div>
    </div>
  );
}

function EditablePreview({
  english,
  edit,
  setEdit,
  generated,
  imageReloading,
  onReloadImage,
  onFetchImage,
  onSwapAccent,
  disabled,
}: {
  english: string;
  edit: EditState;
  setEdit: (e: EditState) => void;
  generated: GeneratedData | null;
  imageReloading: boolean;
  onReloadImage: () => void;
  onFetchImage: () => void;
  onSwapAccent: () => void;
  disabled: boolean;
}) {
  return (
    <div
      className="v-card"
      style={{
        padding: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        opacity: disabled ? 0.7 : 1,
        pointerEvents: disabled ? 'none' : 'auto',
      }}
    >
      {/* Word + audio + IPA */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
        <h2
          style={{
            fontFamily: 'var(--v-font-head)',
            fontSize: 26,
            fontWeight: 900,
            margin: 0,
            letterSpacing: '-0.02em',
            color: 'var(--v-ink)',
          }}
        >
          {english}
        </h2>
        {edit.audio_url ? (
          <AudioButton audioUrl={edit.audio_url} fallbackText={english} size={30} />
        ) : (
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: 9,
              background: 'var(--v-panel)',
              border: '1px solid var(--v-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--v-muted)',
            }}
          >
            <Volume2 size={14} />
          </div>
        )}
        {generated?.audio_url_alt && (
          <button
            type="button"
            onClick={onSwapAccent}
            title={`Đổi sang ${generated.accent === 'us' ? 'Anh-Anh (UK)' : 'Anh-Mỹ (US)'}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '2px 8px',
              background: 'var(--v-surface)',
              border: '1px solid var(--v-border)',
              borderRadius: 999,
              cursor: 'pointer',
              fontFamily: 'var(--v-font-body)',
              fontSize: 10,
              fontWeight: 800,
              color: 'var(--v-ink-soft)',
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
            }}
          >
            <RefreshCw size={10} />
            {generated.accent === 'us' ? 'US' : generated.accent === 'uk' ? 'UK' : '—'}
          </button>
        )}
        <POSPill pos={edit.part_of_speech} />
      </div>

      {/* IPA (editable) */}
      <EditField label="IPA">
        <input
          type="text"
          value={edit.ipa}
          onChange={(e) => setEdit({ ...edit, ipa: e.target.value })}
          placeholder="/ˈpref.ər.en.tʃəl/"
          style={{
            ...inputStyle(false),
            fontFamily: 'var(--v-font-mono)',
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--v-accent)',
          }}
        />
      </EditField>

      {/* Vietnamese (editable) */}
      <EditField label="Nghĩa tiếng Việt">
        <input
          type="text"
          value={edit.vietnamese}
          onChange={(e) => setEdit({ ...edit, vietnamese: e.target.value })}
          placeholder="vd: ưu tiên, ưu đãi"
          style={{
            ...inputStyle(false),
            fontFamily: 'var(--v-font-head)',
            fontSize: 15,
            fontWeight: 800,
          }}
        />
      </EditField>

      {/* Image */}
      <EditField label="Ảnh">
        {edit.image_url ? (
          <div>
            <div
              style={{
                position: 'relative',
                width: '100%',
                aspectRatio: '16 / 9',
                borderRadius: 12,
                overflow: 'hidden',
                background: 'var(--v-panel)',
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={edit.image_url}
                alt={english}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: 'block',
                  opacity: imageReloading ? 0.5 : 1,
                  transition: 'opacity 200ms var(--v-ease)',
                }}
              />
              {edit.image_attribution && (
                <span
                  style={{
                    position: 'absolute',
                    bottom: 6,
                    right: 8,
                    fontFamily: 'var(--v-font-body)',
                    fontSize: 10,
                    color: 'rgba(40,30,15,0.7)',
                    fontWeight: 600,
                    background: 'rgba(255,255,255,0.7)',
                    padding: '2px 6px',
                    borderRadius: 6,
                  }}
                >
                  Photo by {edit.image_attribution.author} · Pexels
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button
                type="button"
                onClick={onReloadImage}
                disabled={imageReloading}
                style={smallButton('var(--v-surface)', 'var(--v-ink)')}
              >
                <RefreshCw
                  size={12}
                  style={imageReloading ? { animation: 'v-spin 1s linear infinite' } : undefined}
                />
                Đổi ảnh
              </button>
              <button
                type="button"
                onClick={() =>
                  setEdit({ ...edit, image_url: null, image_attribution: null })
                }
                style={smallButton('var(--v-surface)', 'var(--v-red)')}
              >
                <XIcon size={12} />
                Bỏ ảnh
              </button>
            </div>
          </div>
        ) : (
          <div
            style={{
              padding: 18,
              border: '1px dashed var(--v-border)',
              borderRadius: 12,
              background: 'var(--v-panel)',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <ImageIcon size={18} color="var(--v-muted)" />
            <span
              style={{
                flex: 1,
                fontFamily: 'var(--v-font-body)',
                fontSize: 12,
                color: 'var(--v-muted)',
                fontWeight: 700,
              }}
            >
              Chưa có ảnh.
            </span>
            <button
              type="button"
              onClick={onFetchImage}
              disabled={imageReloading}
              style={smallButton('var(--v-primary-soft)', 'var(--v-primary)')}
            >
              <ImageIcon size={12} />
              Thêm ảnh
            </button>
          </div>
        )}
      </EditField>

      {/* Examples (editable + add/remove) */}
      <EditField label="Ví dụ">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {edit.examples.map((ex, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <input
                  type="text"
                  value={ex.en}
                  onChange={(e) => {
                    const next = [...edit.examples];
                    next[i] = { ...next[i], en: e.target.value };
                    setEdit({ ...edit, examples: next });
                  }}
                  placeholder="Câu ví dụ tiếng Anh"
                  style={{
                    ...inputStyle(false),
                    fontFamily: 'var(--v-font-head)',
                    fontSize: 13,
                    fontWeight: 700,
                  }}
                />
                <input
                  type="text"
                  value={ex.vi}
                  onChange={(e) => {
                    const next = [...edit.examples];
                    next[i] = { ...next[i], vi: e.target.value };
                    setEdit({ ...edit, examples: next });
                  }}
                  placeholder="Dịch tiếng Việt (tuỳ chọn)"
                  style={{
                    ...inputStyle(false),
                    fontSize: 12,
                    color: 'var(--v-ink-soft)',
                  }}
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  const next = edit.examples.filter((_, j) => j !== i);
                  setEdit({ ...edit, examples: next });
                }}
                style={iconButton()}
                title="Xoá ví dụ"
              >
                <XIcon size={12} />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() =>
              setEdit({ ...edit, examples: [...edit.examples, { en: '', vi: '' }] })
            }
            style={addRowButton()}
          >
            <Plus size={12} />
            Thêm ví dụ
          </button>
        </div>
      </EditField>

      {/* Collocations (editable + add/remove) */}
      <EditField label="Collocations (hay đi với)">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {edit.collocations.length === 0 && (
            <div
              style={{
                fontFamily: 'var(--v-font-body)',
                fontSize: 12,
                color: 'var(--v-muted)',
                fontStyle: 'italic',
              }}
            >
              Chưa có collocation — bạn có thể tự thêm nha.
            </div>
          )}
          {edit.collocations.map((coll, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                type="text"
                value={coll}
                onChange={(e) => {
                  const next = [...edit.collocations];
                  next[i] = e.target.value;
                  setEdit({ ...edit, collocations: next });
                }}
                placeholder="vd: preferential treatment"
                style={{
                  ...inputStyle(false),
                  fontFamily: 'var(--v-font-body)',
                  fontSize: 12,
                  fontWeight: 700,
                  color: 'var(--v-accent)',
                  background: 'var(--v-accent-soft)',
                  border: '1px solid var(--v-accent-soft)',
                }}
              />
              <button
                type="button"
                onClick={() =>
                  setEdit({
                    ...edit,
                    collocations: edit.collocations.filter((_, j) => j !== i),
                  })
                }
                style={iconButton()}
                title="Xoá collocation"
              >
                <XIcon size={12} />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setEdit({ ...edit, collocations: [...edit.collocations, ''] })}
            style={addRowButton()}
          >
            <Plus size={12} />
            Thêm collocation
          </button>
        </div>
      </EditField>

      {/* Lookup links */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          flexWrap: 'wrap',
          paddingTop: 8,
          borderTop: '1px dashed var(--v-border)',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--v-font-body)',
            fontSize: 11,
            fontWeight: 700,
            color: 'var(--v-muted)',
          }}
        >
          Tra cứu:
        </span>
        <LookupPills word={english} />
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────

function toEditState(data: GeneratedData, userTypedVi: string): EditState {
  return {
    ipa: data.ipa ?? '',
    vietnamese: (userTypedVi.trim() || data.vietnamese || '').trim(),
    part_of_speech: data.part_of_speech,
    audio_url: data.audio_url,
    examples: data.examples.slice(0, 3).map((e) => ({ en: e.en, vi: e.vi ?? '' })),
    collocations: data.collocations.map((c) => c.phrase).filter((p) => p.length > 0),
    image_url: data.image_url,
    image_attribution: data.image_attribution,
  };
}

function Field({
  label,
  children,
  required = false,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
  hint?: string;
}) {
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
        {required && <span style={{ color: 'var(--v-red)', marginLeft: 4 }}>*</span>}
        {hint && (
          <span
            style={{
              marginLeft: 6,
              fontWeight: 600,
              color: 'var(--v-muted)',
              textTransform: 'none',
              letterSpacing: 0,
            }}
          >
            · {hint}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

function EditField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div
        className="v-eyebrow"
        style={{ fontSize: 11, letterSpacing: '0.15em', marginBottom: 6 }}
      >
        {label}
      </div>
      {children}
    </div>
  );
}

function inputStyle(disabled: boolean): React.CSSProperties {
  return {
    width: '100%',
    padding: '10px 12px',
    fontFamily: 'var(--v-font-body)',
    fontSize: 'var(--v-text-base)',
    fontWeight: 600,
    background: disabled ? 'var(--v-panel)' : 'var(--v-surface)',
    border: '1.5px solid var(--v-border)',
    borderRadius: 'var(--v-radius-md)',
    color: disabled ? 'var(--v-ink-soft)' : 'var(--v-ink)',
    outline: 'none',
    cursor: disabled ? 'not-allowed' : 'text',
    opacity: disabled ? 0.7 : 1,
  };
}

function primaryButton(disabled: boolean): React.CSSProperties {
  return {
    flex: 1,
    padding: '14px 22px',
    background: 'var(--v-primary)',
    color: '#fff',
    border: 'none',
    boxShadow: disabled
      ? 'none'
      : '0 4px 0 rgba(60,20,5,0.15), 0 6px 14px rgba(122,193,67,0.4)',
    borderRadius: 14,
    fontFamily: 'var(--v-font-head)',
    fontWeight: 900,
    fontSize: 13,
    letterSpacing: '0.04em',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.6 : 1,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  };
}

function secondaryButton(disabled: boolean): React.CSSProperties {
  return {
    padding: '14px 18px',
    background: 'var(--v-surface)',
    color: 'var(--v-ink-soft)',
    border: '1px solid var(--v-border)',
    boxShadow: disabled ? 'none' : 'var(--v-shadow-sm)',
    borderRadius: 14,
    fontFamily: 'var(--v-font-head)',
    fontWeight: 800,
    fontSize: 12,
    letterSpacing: '0.04em',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.55 : 1,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
  };
}

function tertiaryButton(disabled: boolean): React.CSSProperties {
  return {
    padding: '10px 14px',
    background: 'transparent',
    color: 'var(--v-ink-soft)',
    border: '1px solid var(--v-border)',
    borderRadius: 12,
    fontFamily: 'var(--v-font-head)',
    fontWeight: 800,
    fontSize: 11,
    letterSpacing: '0.04em',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.55 : 1,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
  };
}

function smallButton(bg: string, color: string): React.CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '6px 12px',
    background: bg,
    color,
    border: '1px solid var(--v-border)',
    borderRadius: 999,
    fontFamily: 'var(--v-font-head)',
    fontWeight: 800,
    fontSize: 11,
    letterSpacing: '0.04em',
    cursor: 'pointer',
  };
}

function iconButton(): React.CSSProperties {
  return {
    width: 28,
    height: 28,
    padding: 0,
    background: 'var(--v-surface)',
    color: 'var(--v-muted)',
    border: '1px solid var(--v-border)',
    borderRadius: 8,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  };
}

function addRowButton(): React.CSSProperties {
  return {
    alignSelf: 'flex-start',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '6px 12px',
    background: 'transparent',
    color: 'var(--v-primary)',
    border: '1px dashed var(--v-primary)',
    borderRadius: 999,
    fontFamily: 'var(--v-font-head)',
    fontWeight: 800,
    fontSize: 11,
    letterSpacing: '0.04em',
    cursor: 'pointer',
  };
}
