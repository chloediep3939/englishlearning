'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Sparkles, RefreshCw, Volume2, ExternalLink } from 'lucide-react';
import AudioButton from './AudioButton';
import POSPill from '@/components/common/POSPill';
import type {
  FlashcardExample,
  FlashcardCollocation,
  FlashcardDeckWithCounts,
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

export default function AddCardForm() {
  const router = useRouter();
  const [english, setEnglish] = useState('');
  const [vietnamese, setVietnamese] = useState('');
  const [notes, setNotes] = useState('');
  const [deckId, setDeckId] = useState<number | null>(null);
  const [decks, setDecks] = useState<FlashcardDeckWithCounts[]>([]);

  const [generated, setGenerated] = useState<GeneratedData | null>(null);
  const [generatedFor, setGeneratedFor] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justAdded, setJustAdded] = useState<string | null>(null);
  const [imageSkip, setImageSkip] = useState(0);
  const [imageReloading, setImageReloading] = useState(false);
  const englishInputRef = useRef<HTMLInputElement>(null);
  const userEditedVi = useRef(false);

  useEffect(() => {
    apiJson<{ decks?: FlashcardDeckWithCounts[] }>('/api/decks')
      .then((d) => setDecks(d.decks ?? []))
      .catch(() => {});
  }, []);

  async function runGenerate(word: string): Promise<GeneratedData | null> {
    setGenerating(true);
    setError(null);
    setImageSkip(0); // restart image cycle for a fresh word
    try {
      const res = await fetch('/api/cards/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ english: word }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error || 'Không tự sinh được.');
        return null;
      }
      const data = (await res.json()) as GeneratedData;
      setGenerated(data);
      setGeneratedFor(word);
      if (!userEditedVi.current && data.vietnamese) {
        setVietnamese(data.vietnamese);
      }
      return data;
    } catch {
      setError('Lỗi kết nối.');
      return null;
    } finally {
      setGenerating(false);
    }
  }

  function handleEnglishBlur() {
    const word = english.trim();
    if (word.length < 2) return;
    if (generating) return;
    if (generatedFor === word) return; // already generated for this word
    void runGenerate(word);
  }

  function swapAccent() {
    if (!generated || !generated.audio_url_alt) return;
    setGenerated({
      ...generated,
      audio_url: generated.audio_url_alt,
      ipa: generated.ipa_alt,
      audio_url_alt: generated.audio_url,
      ipa_alt: generated.ipa,
      accent: generated.accent === 'us' ? 'uk' : generated.accent === 'uk' ? 'us' : 'unknown',
    });
  }

  async function reloadImage() {
    const word = english.trim();
    if (!word || imageReloading) return;
    const next = imageSkip + 1;
    setImageReloading(true);
    setImageSkip(next);
    try {
      const res = await fetch(`/api/images/pexels?q=${encodeURIComponent(word)}&skip=${next}`);
      if (!res.ok) {
        // Cycle ran out — reset to 0 next time so user can keep clicking.
        if (res.status === 404) setImageSkip(0);
        return;
      }
      const data = (await res.json()) as {
        image_url: string;
        image_attribution: FlashcardImageAttribution;
      };
      setGenerated((g) =>
        g ? { ...g, image_url: data.image_url, image_attribution: data.image_attribution } : g
      );
    } catch (err) {
      console.warn('[reloadImage] failed:', err);
    } finally {
      setImageReloading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const en = english.trim();
    if (en.length === 0) {
      setError('Cần điền từ tiếng Anh.');
      return;
    }
    setSubmitting(true);
    setError(null);

    // Auto-generate if not yet done (covers users who skipped the blur trigger).
    let data = generated;
    if (!data || generatedFor !== en) {
      data = await runGenerate(en);
      if (!data) {
        setSubmitting(false);
        return;
      }
    }

    // Final Vietnamese: user-typed wins, else generated, else error.
    const vi = vietnamese.trim() || data.vietnamese?.trim() || '';
    if (vi.length === 0) {
      setError('Không sinh được nghĩa tiếng Việt. Bạn điền thử nhé.');
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch('/api/cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          english: en,
          vietnamese: vi,
          deck_id: deckId,
          ipa: data.ipa,
          part_of_speech: data.part_of_speech,
          audio_url: data.audio_url,
          examples: data.examples,
          collocations: data.collocations,
          image_url: data.image_url,
          image_attribution: data.image_attribution,
          notes: notes.trim() || null,
        }),
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        setError(d.error || 'Không thêm được từ.');
        return;
      }
      // Success: toast + reset
      setJustAdded(en);
      resetForm();
      setTimeout(() => setJustAdded(null), 3000);
      englishInputRef.current?.focus();
      router.refresh();
    } catch {
      setError('Lỗi kết nối.');
    } finally {
      setSubmitting(false);
    }
  }

  function resetForm() {
    setEnglish('');
    setVietnamese('');
    setNotes('');
    setGenerated(null);
    setGeneratedFor(null);
    setImageSkip(0);
    userEditedVi.current = false;
    setError(null);
  }

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
        {/* ─── Form ─── */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Field label="Từ tiếng Anh" required>
            <input
              ref={englishInputRef}
              type="text"
              value={english}
              onChange={(e) => setEnglish(e.target.value)}
              onBlur={handleEnglishBlur}
              placeholder="vd: preferential"
              autoComplete="off"
              autoFocus
              style={{
                ...inputStyle(),
                fontSize: 16,
                fontWeight: 800,
                fontFamily: 'var(--v-font-head)',
                borderColor: 'var(--v-primary)',
                boxShadow: '0 3px 0 rgba(122,193,67,0.15)',
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
              placeholder={generating ? 'Đang dịch...' : 'Bỏ trống để Bún tự dịch'}
              autoComplete="off"
              style={inputStyle()}
            />
          </Field>

          <Field label="Bộ từ">
            <div style={{ position: 'relative' }}>
              <select
                value={deckId ?? ''}
                onChange={(e) => setDeckId(e.target.value ? Number(e.target.value) : null)}
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

          <Field label="Ghi chú" hint="tuỳ chọn">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ghi chú cá nhân, ví dụ dịch câu, mẹo nhớ…"
              rows={3}
              style={{ ...inputStyle(), resize: 'vertical', minHeight: 80, fontFamily: 'var(--v-font-body)' }}
            />
          </Field>

          {/* Auto-generate hint banner */}
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
              {generating ? (
                <RefreshCw size={16} color="#fff" style={{ animation: 'v-spin 1s linear infinite' }} />
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
              {generating
                ? 'Đang tự sinh IPA · audio · ví dụ · ảnh · collocations...'
                : 'Tự sinh: IPA · audio · 3 ví dụ · ảnh từ Pexels · collocations'}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button
              type="submit"
              disabled={submitting || english.trim().length === 0}
              style={{
                flex: 1,
                padding: '14px 22px',
                background: 'var(--v-primary)',
                color: '#fff',
                border: 'none',
                boxShadow: '0 4px 0 rgba(60,20,5,0.15), 0 6px 14px rgba(122,193,67,0.4)',
                borderRadius: 14,
                fontFamily: 'var(--v-font-head)',
                fontWeight: 900,
                fontSize: 13,
                letterSpacing: '0.04em',
                cursor: submitting || english.trim().length === 0 ? 'not-allowed' : 'pointer',
                opacity: submitting || english.trim().length === 0 ? 0.6 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              <Check size={16} strokeWidth={3} />
              {submitting ? 'ĐANG LƯU...' : 'LƯU TỪ NÀY'}
            </button>
            <button
              type="button"
              onClick={resetForm}
              style={{
                padding: '14px 20px',
                background: 'var(--v-surface)',
                color: 'var(--v-ink-soft)',
                border: '1px solid var(--v-border)',
                boxShadow: 'var(--v-shadow-sm)',
                borderRadius: 14,
                fontFamily: 'var(--v-font-head)',
                fontWeight: 800,
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              Sửa lại
            </button>
          </div>
        </form>

        {/* ─── Live preview ─── */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <Sparkles size={14} color="var(--v-primary)" fill="var(--v-primary)" strokeWidth={2.4} />
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
          <PreviewCard
            english={english}
            vietnamese={vietnamese || generated?.vietnamese || ''}
            generated={generated}
            generating={generating}
            imageReloading={imageReloading}
            onReloadImage={reloadImage}
            onSwapAccent={swapAccent}
          />
        </div>
      </section>
    </>
  );
}

function PreviewCard({
  english, vietnamese, generated, generating, imageReloading, onReloadImage, onSwapAccent,
}: {
  english: string;
  vietnamese: string;
  generated: GeneratedData | null;
  generating: boolean;
  imageReloading: boolean;
  onReloadImage: () => void;
  onSwapAccent: () => void;
}) {
  const isEmpty = english.trim().length === 0;
  const lookupUrl = (provider: 'oxford' | 'youglish' | 'ozdic', word: string) => {
    const w = encodeURIComponent(word);
    if (provider === 'oxford') return `https://www.oxfordlearnersdictionaries.com/definition/english/${w}`;
    if (provider === 'youglish') return `https://youglish.com/pronounce/${w}/english`;
    return `https://www.ozdic.com/collocation/${w}`;
  };

  if (isEmpty) {
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

  return (
    <div className="v-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Word + speaker + POS */}
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
        {generated?.audio_url ? (
          <AudioButton audioUrl={generated.audio_url} fallbackText={english} size={30} />
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
        {/* Accent swap — only if dictionary returned a second accent variant */}
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
        <POSPill pos={generated?.part_of_speech} />
        {generating && !generated && (
          <RefreshCw
            size={14}
            color="var(--v-muted)"
            style={{ animation: 'v-spin 1s linear infinite', marginLeft: 'auto' }}
          />
        )}
      </div>

      {/* IPA */}
      {generated?.ipa && (
        <div
          style={{
            fontFamily: 'var(--v-font-mono)',
            fontSize: 12,
            color: 'var(--v-accent)',
            fontWeight: 600,
          }}
        >
          {generated.ipa}
        </div>
      )}

      {/* Meaning */}
      {vietnamese && (
        <div>
          <span className="v-eyebrow" style={{ fontSize: 11, letterSpacing: '0.1em' }}>
            Nghĩa
          </span>
          <div
            style={{
              fontFamily: 'var(--v-font-head)',
              fontSize: 15,
              fontWeight: 800,
              color: 'var(--v-ink)',
              marginTop: 2,
            }}
          >
            {vietnamese}
          </div>
        </div>
      )}

      {/* Image */}
      {generated?.image_url && (
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
            src={generated.image_url}
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
          {/* Reload-image button (top-right) */}
          <button
            type="button"
            onClick={onReloadImage}
            disabled={imageReloading}
            title="Đổi ảnh khác từ Pexels"
            style={{
              position: 'absolute',
              top: 6,
              right: 6,
              width: 30,
              height: 30,
              padding: 0,
              background: 'rgba(255,255,255,0.9)',
              border: 'none',
              borderRadius: 999,
              boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
              cursor: imageReloading ? 'wait' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--v-ink-soft)',
            }}
          >
            <RefreshCw
              size={14}
              style={imageReloading ? { animation: 'v-spin 1s linear infinite' } : undefined}
            />
          </button>
          {generated.image_attribution && (
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
              Photo by {generated.image_attribution.author} · Pexels
            </span>
          )}
        </div>
      )}

      {/* Examples */}
      {generated?.examples && generated.examples.length > 0 && (
        <div>
          <div
            className="v-eyebrow"
            style={{ fontSize: 11, letterSpacing: '0.15em', color: 'var(--v-blue)', marginBottom: 6 }}
          >
            Ví dụ
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {generated.examples.slice(0, 2).map((ex, i) => (
              <div key={i}>
                <div
                  style={{
                    fontFamily: 'var(--v-font-head)',
                    fontSize: 13,
                    fontWeight: 800,
                    color: 'var(--v-ink)',
                  }}
                  dangerouslySetInnerHTML={{
                    __html: highlightTarget(ex.en, english),
                  }}
                />
                {ex.vi && (
                  <div
                    style={{
                      fontFamily: 'var(--v-font-body)',
                      fontSize: 12,
                      fontWeight: 600,
                      color: 'var(--v-ink-soft)',
                    }}
                  >
                    {ex.vi}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lookup links */}
      <div
        style={{
          display: 'flex',
          gap: 6,
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
            alignSelf: 'center',
            marginRight: 4,
          }}
        >
          Tra cứu:
        </span>
        {(['Oxford', 'YouGlish', 'ozdic'] as const).map((provider) => {
          const key = provider.toLowerCase() as 'oxford' | 'youglish' | 'ozdic';
          return (
            <a
              key={provider}
              href={lookupUrl(key, english)}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                padding: '4px 10px',
                fontFamily: 'var(--v-font-body)',
                fontSize: 12,
                fontWeight: 700,
                color: 'var(--v-ink-soft)',
                border: '1px solid var(--v-border)',
                borderRadius: 999,
                background: 'var(--v-surface)',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              {provider} <ExternalLink size={11} />
            </a>
          );
        })}
      </div>
    </div>
  );
}

function highlightTarget(sentence: string, target: string): string {
  const safeTarget = target.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (!safeTarget) return escapeHtml(sentence);
  const re = new RegExp(`(${safeTarget}\\w*)`, 'gi');
  return escapeHtml(sentence).replace(re, '<b style="color: var(--v-primary)">$1</b>');
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function Field({
  label, children, required = false, hint,
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
