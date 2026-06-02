'use client';

import { useEffect, useRef, useState } from 'react';
import { Volume2, Plus, Check, RotateCw } from 'lucide-react';
import Mascot from '@/components/common/Mascot';
import type { KaraokeEngine } from '@/lib/reading/use-karaoke';
import type { Flashcard, GlossaryEntry } from '@/lib/types';
import { apiJson, ApiError } from '@/lib/common/api-json';
import { speakWord, getStoredVoicePreference } from '@/lib/tts';
import { BUN_BLUE } from '@/lib/reading/constants';

interface LookupResponse {
  word: string;
  vn: string | null;
  pos: string | null;
  ipa: string | null;
  audioUrl: string | null;
  source: string;
}

/**
 * Word-detail card. Renders mascot prompt when nothing is selected; otherwise
 * the word + POS + IPA + VN meaning + listen + save. On selecting a word not in
 * the glossary it fires an on-demand /api/words/lookup (Flow 4a) and merges the
 * result. Save POSTs to /api/cards/from-passage with prefilled gloss (Flow 5).
 */
export default function WordDetailCard({
  k,
  passageId,
  deckId,
  deckName,
  reduce,
}: {
  k: KaraokeEngine;
  passageId: number;
  deckId: number | null;
  deckName: string;
  reduce: boolean;
}) {
  const { sel } = k;
  const clean = sel?.clean ?? '';
  const gloss: GlossaryEntry | undefined = clean ? k.glossary[clean] : undefined;

  const [looking, setLooking] = useState(false);
  const [lookupError, setLookupError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const attempted = useRef<Set<string>>(new Set());

  function doLookup(word: string) {
    setLooking(true);
    setLookupError(false);
    attempted.current.add(word);
    apiJson<LookupResponse>('/api/words/lookup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ word }),
    })
      .then((r) => k.mergeGlossary(word, { vn: r.vn, pos: r.pos, ipa: r.ipa, audioUrl: r.audioUrl }))
      .catch(() => setLookupError(true))
      .finally(() => setLooking(false));
  }

  // On selecting an unknown word, look it up once.
  useEffect(() => {
    if (!clean) return;
    if (k.glossary[clean] || attempted.current.has(clean)) return;
    doLookup(clean);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clean]);

  if (!sel) {
    return (
      <div
        style={{
          background: 'var(--v-surface)',
          border: '1px solid var(--v-border)',
          boxShadow: 'var(--v-shadow-md)',
          borderRadius: 18,
          padding: '16px 18px',
          display: 'flex',
          alignItems: 'center',
          gap: 14,
        }}
      >
        <Mascot pose="happy" size={58} bob={!reduce && k.playing} />
        <div
          style={{
            fontFamily: 'var(--v-font-body)',
            fontSize: 13,
            fontWeight: 700,
            color: 'var(--v-ink-soft)',
            lineHeight: 1.45,
          }}
        >
          {k.playing ? 'Mình đang đọc, bạn nghe nha…' : 'Click vào một từ để xem nghĩa & lưu vào bộ từ.'}
        </div>
      </div>
    );
  }

  const saved = k.isSaved(sel.clean);
  const display = sel.raw.replace(/[^A-Za-z'-]/g, '') || sel.clean;

  async function handleSave() {
    if (!sel || saved) return;
    setSaving(true);
    setSaveError(false);
    const sentence = k.sentences[sel.sentIdx]?.text ?? '';
    try {
      await apiJson<{ card: Flashcard; deduped?: boolean }>('/api/cards/from-passage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          word: sel.clean,
          deck_id: deckId,
          passage_id: passageId,
          source_context: sentence,
          prefilled: { vi: gloss?.vn ?? '', pos: gloss?.pos ?? '', ipa: gloss?.ipa ?? '' },
        }),
      });
      k.addWord({ clean: sel.clean, raw: display, vi: gloss?.vn ?? '' });
    } catch (err) {
      // 404 = no deck (caller should have ensured one); surface a retry.
      setSaveError(true);
      if (err instanceof ApiError) console.error('[read-along save] ', err.status, err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      style={{
        background: 'var(--v-surface)',
        border: `1.5px solid ${BUN_BLUE}55`,
        boxShadow: `0 8px 20px ${BUN_BLUE}22, 0 3px 0 ${BUN_BLUE}20`,
        borderRadius: 18,
        padding: '16px 18px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
        <span
          style={{
            fontFamily: 'var(--v-font-head)',
            fontSize: 24,
            fontWeight: 900,
            color: 'var(--v-ink)',
            letterSpacing: '-0.02em',
            lineHeight: 1,
          }}
        >
          {display}
        </span>
        {gloss?.pos && (
          <span
            style={{
              background: 'var(--v-purple)',
              color: '#fff',
              borderRadius: 999,
              padding: '2px 8px',
              fontFamily: 'var(--v-font-head)',
              fontWeight: 900,
              fontSize: 9,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}
          >
            {gloss.pos}
          </span>
        )}
        <button
          onClick={() =>
            speakWord(sel.raw, {
              audioUrl: gloss?.audioUrl ?? null,
              rate: k.rate,
              voice_preference: getStoredVoicePreference(),
            })
          }
          title="Nghe lại"
          aria-label="Nghe lại"
          style={{
            marginLeft: 'auto',
            width: 32,
            height: 32,
            background: BUN_BLUE,
            border: 'none',
            boxShadow: `0 2px 0 rgba(20,40,80,.15), 0 3px 6px ${BUN_BLUE}55`,
            borderRadius: 10,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Volume2 size={14} color="#fff" strokeWidth={2.4} />
        </button>
      </div>

      {gloss?.ipa && (
        <div
          style={{
            fontFamily: 'var(--v-font-mono)',
            fontSize: 13,
            color: BUN_BLUE,
            fontWeight: 700,
            marginTop: 4,
          }}
        >
          {gloss.ipa}
        </div>
      )}

      <div
        style={{
          fontFamily: 'var(--v-font-head)',
          fontSize: 16,
          fontWeight: 800,
          color: 'var(--v-ink)',
          marginTop: 8,
          minHeight: 20,
        }}
      >
        {looking ? (
          <span style={{ fontWeight: 600, color: 'var(--v-muted)', fontFamily: 'var(--v-font-body)', fontSize: 13 }}>
            Đang tra nghĩa…
          </span>
        ) : lookupError ? (
          <button
            onClick={() => doLookup(clean)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'var(--v-font-body)',
              fontSize: 13,
              fontWeight: 700,
              color: 'var(--v-red)',
            }}
          >
            <RotateCw size={13} /> Không thể tra nghĩa lúc này — thử lại
          </button>
        ) : gloss?.vn ? (
          gloss.vn
        ) : (
          <span style={{ fontWeight: 600, color: 'var(--v-muted)', fontFamily: 'var(--v-font-body)', fontSize: 13 }}>
            Chưa có nghĩa sẵn — bấm 🔊 để nghe phát âm.
          </span>
        )}
      </div>

      <button
        onClick={handleSave}
        disabled={saved || saving}
        style={{
          width: '100%',
          marginTop: 12,
          padding: '11px 14px',
          borderRadius: 12,
          cursor: saved || saving ? 'default' : 'pointer',
          background: saved ? 'color-mix(in srgb, var(--v-primary) 16%, transparent)' : BUN_BLUE,
          color: saved ? 'var(--v-primary)' : '#fff',
          border: 'none',
          boxShadow: saved ? 'none' : `0 3px 0 rgba(20,40,80,.18), 0 4px 10px ${BUN_BLUE}55`,
          fontFamily: 'var(--v-font-head)',
          fontWeight: 900,
          fontSize: 13,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 7,
          opacity: saving ? 0.7 : 1,
        }}
      >
        {saved ? (
          <>
            <Check size={15} strokeWidth={3} /> Đã lưu vào “{deckName}”
          </>
        ) : (
          <>
            <Plus size={15} strokeWidth={3} /> {saving ? 'Đang lưu…' : 'Lưu vào bộ từ'}
          </>
        )}
      </button>

      {saveError && (
        <div
          style={{
            marginTop: 8,
            fontFamily: 'var(--v-font-body)',
            fontSize: 12,
            fontWeight: 700,
            color: 'var(--v-red)',
          }}
        >
          Không thể lưu, bấm để thử lại.
        </div>
      )}
    </div>
  );
}
