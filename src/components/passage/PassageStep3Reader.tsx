'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { BookmarkPlus, Pause, Play, RotateCcw, Volume2, X } from 'lucide-react';
import type {
  Flashcard,
  FlashcardDeckWithCounts,
  FlashcardSettings,
  Passage,
  WordDefinitionInContext,
} from '@/lib/types';
import { apiJson } from '@/lib/common/api-json';

interface Props {
  passage: Passage;
}

interface Token {
  text: string;
  isWord: boolean;
  charStart: number;
  charEnd: number;
}

type PopupPhase = 'loading' | 'definition' | 'deckPicker' | 'saving' | 'saved' | 'error';

interface PopupState {
  word: string;
  charIndex: number;
  sentence: string;
  phase: PopupPhase;
  definition: WordDefinitionInContext | null;
  error: string;
}

function tokenize(content: string): Token[] {
  const tokens: Token[] = [];
  // Words = letters with optional inner apostrophe / hyphen. Everything else
  // (whitespace, punctuation, numbers, em-dashes…) lumped into non-word runs.
  const re = /([a-zA-Z][a-zA-Z'-]*[a-zA-Z]|[a-zA-Z])|([^a-zA-Z]+)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(content)) !== null) {
    const text = match[0];
    const isWord = match[1] !== undefined;
    tokens.push({
      text,
      isWord,
      charStart: match.index,
      charEnd: match.index + text.length,
    });
  }
  return tokens;
}

function findSentenceContaining(content: string, charIndex: number): string {
  const sentenceRegex = /[^.!?]+[.!?]+(?:\s+|$)/g;
  let match: RegExpExecArray | null;
  while ((match = sentenceRegex.exec(content)) !== null) {
    const start = match.index;
    const end = start + match[0].length;
    if (charIndex >= start && charIndex < end) return match[0].trim();
  }
  // Passage may not have terminal punctuation — fall back to a generous window
  // around the click so the AI still has context.
  const start = Math.max(0, charIndex - 200);
  const end = Math.min(content.length, charIndex + 200);
  return content.slice(start, end).trim();
}

export default function PassageStep3Reader({ passage }: Props) {
  const tokens = useMemo(() => tokenize(passage.content), [passage.content]);

  const [savedWords, setSavedWords] = useState<Set<string>>(new Set());
  const [decks, setDecks] = useState<FlashcardDeckWithCounts[]>([]);
  const [ttsRate, setTtsRate] = useState(1.0);

  // Karaoke
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentCharIndex, setCurrentCharIndex] = useState(-1);

  // Popup
  const [popup, setPopup] = useState<PopupState | null>(null);

  // Track whether speech synthesis is supported. SSR guard.
  const ttsSupported = useRef(false);
  useEffect(() => {
    ttsSupported.current = typeof window !== 'undefined' && 'speechSynthesis' in window;
  }, []);

  // ---- Initial loads: saved words + decks + settings ----
  useEffect(() => {
    let cancelled = false;
    apiJson<{ cards: Flashcard[] }>(`/api/cards?source_passage_id=${passage.id}`)
      .then(({ cards }) => {
        if (cancelled) return;
        setSavedWords(new Set(cards.map((c) => c.english.toLowerCase())));
      })
      .catch(() => {});

    apiJson<{ decks: FlashcardDeckWithCounts[] }>('/api/decks')
      .then(({ decks }) => {
        if (cancelled) return;
        setDecks(decks ?? []);
      })
      .catch(() => {});

    apiJson<FlashcardSettings>('/api/settings')
      .then((s) => {
        if (cancelled) return;
        if (typeof s.passage_tts_rate === 'number') setTtsRate(s.passage_tts_rate);
        // M4c pre-fetch: while the learner is reading on Step 3, kick off
        // the analyze + translate-reference + paraphrase-tips routes so
        // Step 2 / Step 7 / Step 8 hit warm caches when the learner gets
        // there. Each route is idempotent (server-side DB cache), so the
        // re-call from the actual step view is a no-op.
        if (s.passage_pre_fetch === false) return;
        void fetch(`/api/passages/${passage.id}/analyze`, { method: 'POST' }).catch(() => {});
        void fetch(`/api/passages/${passage.id}/translate-reference`, { method: 'POST' }).catch(() => {});
        void fetch(`/api/passages/${passage.id}/paraphrase-tips`, { method: 'POST' }).catch(() => {});
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [passage.id]);

  // ---- Karaoke playback ----
  const play = useCallback(() => {
    if (!ttsSupported.current) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(passage.content);
    u.lang = 'en-US';
    u.rate = ttsRate;
    u.onboundary = (e) => {
      if (e.name === 'word') setCurrentCharIndex(e.charIndex);
    };
    u.onend = () => {
      setIsPlaying(false);
      setCurrentCharIndex(-1);
    };
    u.onerror = () => {
      setIsPlaying(false);
    };
    window.speechSynthesis.speak(u);
    setIsPlaying(true);
  }, [passage.content, ttsRate]);

  const pause = useCallback(() => {
    if (!ttsSupported.current) return;
    window.speechSynthesis.cancel();
    setIsPlaying(false);
  }, []);

  const restart = useCallback(() => {
    pause();
    setCurrentCharIndex(-1);
    // Small delay so the cancelled utterance is fully torn down before we
    // queue a new one — otherwise Chrome occasionally drops the new utterance.
    setTimeout(play, 50);
  }, [pause, play]);

  // ---- Popup helpers ----
  const closePopup = useCallback(() => setPopup(null), []);

  const handleWordClick = useCallback(
    (token: Token) => {
      pause();
      const sentence = findSentenceContaining(passage.content, token.charStart);
      setPopup({
        word: token.text,
        charIndex: token.charStart,
        sentence,
        phase: 'loading',
        definition: null,
        error: '',
      });

      apiJson<{ definition: WordDefinitionInContext }>(
        `/api/passages/${passage.id}/define-word`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ word: token.text, sentence_context: sentence }),
        },
      )
        .then(({ definition }) =>
          setPopup((p) => (p ? { ...p, phase: 'definition', definition } : p)),
        )
        .catch((e: unknown) => {
          const msg = e instanceof Error ? e.message : 'AI lỗi';
          setPopup((p) => (p ? { ...p, phase: 'error', error: msg } : p));
        });
    },
    [pause, passage.content, passage.id],
  );

  // Esc to close popup.
  useEffect(() => {
    if (!popup) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closePopup();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [popup, closePopup]);

  // ---- Save flow ----
  const startSave = useCallback(() => {
    setPopup((p) => (p && p.definition ? { ...p, phase: 'deckPicker' } : p));
  }, []);

  const saveToDeck = useCallback(
    async (deckId: number) => {
      const current = popup;
      if (!current?.definition) return;
      setPopup({ ...current, phase: 'saving' });
      try {
        const res = await fetch('/api/cards/from-passage', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            word: current.definition.english,
            deck_id: deckId,
            passage_id: passage.id,
            source_context: current.sentence,
          }),
        });
        if (!res.ok) {
          const b = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(b.error ?? 'Save lỗi');
        }
        const { card } = (await res.json()) as { card: Flashcard };
        setSavedWords((prev) => {
          const next = new Set(prev);
          next.add(card.english.toLowerCase());
          return next;
        });
        setPopup({ ...current, phase: 'saved' });
        setTimeout(() => setPopup(null), 800);
      } catch (e) {
        setPopup({
          ...current,
          phase: 'error',
          error: e instanceof Error ? e.message : 'Lỗi',
        });
      }
    },
    [popup, passage.id],
  );

  // ---- Render ----
  return (
    <div>
      {/* Controls */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: 16,
          marginBottom: 16,
          background: 'var(--v-panel)',
          borderRadius: 'var(--v-radius-md)',
          boxShadow: 'var(--v-shadow-sm)',
          flexWrap: 'wrap',
        }}
      >
        <button
          onClick={isPlaying ? pause : play}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 14px',
            borderRadius: 'var(--v-radius-md)',
            background: 'var(--v-primary)',
            color: '#fff',
            border: 'none',
            cursor: 'pointer',
            fontFamily: 'var(--v-font-body)',
            fontWeight: 700,
          }}
        >
          {isPlaying ? <Pause size={16} /> : <Play size={16} />}
          {isPlaying ? 'Tạm dừng' : 'Phát'}
        </button>
        <button
          onClick={restart}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 14px',
            borderRadius: 'var(--v-radius-md)',
            background: 'var(--v-bg)',
            border: '1px solid var(--v-border)',
            color: 'var(--v-ink)',
            cursor: 'pointer',
            fontFamily: 'var(--v-font-body)',
            fontWeight: 600,
          }}
        >
          <RotateCcw size={16} /> Phát lại
        </button>
        <div
          style={{
            marginLeft: 'auto',
            fontSize: 'var(--v-text-sm)',
            color: 'var(--v-ink-soft)',
          }}
        >
          Tốc độ: <strong style={{ color: 'var(--v-ink)' }}>{ttsRate.toFixed(1)}x</strong>{' '}
          <Link
            href="/settings"
            style={{
              fontSize: 'var(--v-text-xs)',
              color: 'var(--v-primary)',
              textDecoration: 'underline',
            }}
          >
            (đổi trong Cài đặt)
          </Link>
        </div>
      </div>

      {/* Passage with clickable tokens */}
      <div
        style={{
          background: 'var(--v-panel)',
          padding: 24,
          borderRadius: 'var(--v-radius-md)',
          boxShadow: 'var(--v-shadow-sm)',
          lineHeight: 1.8,
          fontSize: 'var(--v-text-lg)',
          fontFamily: 'var(--v-font-body)',
          whiteSpace: 'pre-wrap',
          color: 'var(--v-ink)',
        }}
      >
        {tokens.map((t, i) => {
          if (!t.isWord) return <span key={i}>{t.text}</span>;
          const isCurrent =
            currentCharIndex >= 0 &&
            currentCharIndex >= t.charStart &&
            currentCharIndex < t.charEnd;
          const isSaved = savedWords.has(t.text.toLowerCase());
          return (
            <span
              key={i}
              onClick={() => handleWordClick(t)}
              style={{
                cursor: 'pointer',
                background: isCurrent
                  ? 'var(--v-yellow)'
                  : isSaved
                    ? 'var(--v-primary-soft)'
                    : 'transparent',
                padding: '0 2px',
                borderRadius: 4,
                transition: 'background 150ms',
              }}
            >
              {t.text}
            </span>
          );
        })}
      </div>

      {popup && (
        <DefinePopup
          popup={popup}
          decks={decks}
          onClose={closePopup}
          onStartSave={startSave}
          onPickDeck={saveToDeck}
        />
      )}
    </div>
  );
}

function DefinePopup({
  popup,
  decks,
  onClose,
  onStartSave,
  onPickDeck,
}: {
  popup: PopupState;
  decks: FlashcardDeckWithCounts[];
  onClose: () => void;
  onStartSave: () => void;
  onPickDeck: (deckId: number) => void;
}) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.35)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--v-bg)',
          padding: 20,
          borderRadius: 'var(--v-radius-lg)',
          minWidth: 320,
          maxWidth: 480,
          width: '100%',
          boxShadow: 'var(--v-shadow-lg)',
          position: 'relative',
          fontFamily: 'var(--v-font-body)',
        }}
      >
        <button
          onClick={onClose}
          aria-label="Đóng"
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            padding: 4,
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--v-ink-soft)',
            display: 'flex',
          }}
        >
          <X size={18} />
        </button>

        {popup.phase === 'loading' && (
          <p style={{ textAlign: 'center', padding: 24, color: 'var(--v-ink-soft)' }}>
            Bún đang tra…
          </p>
        )}

        {popup.phase === 'error' && (
          <div style={{ textAlign: 'center', padding: 24 }}>
            <p style={{ color: 'var(--v-red)', marginBottom: 12 }}>{popup.error}</p>
            <button
              onClick={onClose}
              style={{
                padding: '6px 12px',
                borderRadius: 'var(--v-radius-md)',
                background: 'var(--v-panel)',
                border: '1px solid var(--v-border)',
                cursor: 'pointer',
                color: 'var(--v-ink)',
                fontFamily: 'var(--v-font-body)',
              }}
            >
              Đóng
            </button>
          </div>
        )}

        {popup.phase === 'definition' && popup.definition && (
          <DefinitionBody definition={popup.definition} onStartSave={onStartSave} />
        )}

        {popup.phase === 'deckPicker' && (
          <div>
            <p style={{ marginBottom: 12, fontWeight: 700, color: 'var(--v-ink)' }}>
              Lưu &ldquo;{popup.definition?.english}&rdquo; vào deck nào?
            </p>
            {decks.length === 0 ? (
              <p style={{ color: 'var(--v-ink-soft)' }}>
                Bạn chưa có deck nào.{' '}
                <Link
                  href="/decks"
                  style={{ color: 'var(--v-primary)', textDecoration: 'underline' }}
                >
                  Tạo deck trong /decks trước đã.
                </Link>
              </p>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {decks.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => onPickDeck(d.id)}
                    style={{
                      padding: '8px 14px',
                      borderRadius: 'var(--v-radius-md)',
                      background: d.color || 'var(--v-panel)',
                      color: '#fff',
                      border: 'none',
                      cursor: 'pointer',
                      fontFamily: 'var(--v-font-body)',
                      fontWeight: 700,
                    }}
                  >
                    {d.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {popup.phase === 'saving' && (
          <p style={{ textAlign: 'center', padding: 24, color: 'var(--v-ink-soft)' }}>
            Bún đang tạo thẻ… (~5s)
          </p>
        )}

        {popup.phase === 'saved' && (
          <p
            style={{
              textAlign: 'center',
              padding: 24,
              color: 'var(--v-primary)',
              fontWeight: 700,
              fontFamily: 'var(--v-font-head)',
            }}
          >
            ✓ Đã lưu!
          </p>
        )}
      </div>
    </div>
  );
}

function DefinitionBody({
  definition,
  onStartSave,
}: {
  definition: WordDefinitionInContext;
  onStartSave: () => void;
}) {
  function speakLemma() {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(definition.english);
    u.lang = 'en-US';
    window.speechSynthesis.speak(u);
  }

  return (
    <div>
      <h3
        style={{
          fontSize: 'var(--v-text-2xl)',
          fontWeight: 800,
          fontFamily: 'var(--v-font-head)',
          margin: '0 0 4px',
          color: 'var(--v-ink)',
        }}
      >
        {definition.english}
      </h3>
      {definition.ipa && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontFamily: 'var(--v-font-mono)',
            color: 'var(--v-ink-soft)',
            marginBottom: 6,
            fontSize: 'var(--v-text-md)',
          }}
        >
          /{definition.ipa}/
          <button
            onClick={speakLemma}
            aria-label="Phát âm"
            style={{
              padding: '2px 8px',
              borderRadius: 6,
              background: 'var(--v-panel)',
              border: '1px solid var(--v-border)',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              color: 'var(--v-ink)',
            }}
          >
            <Volume2 size={14} />
          </button>
        </div>
      )}
      <div
        style={{
          display: 'inline-block',
          padding: '2px 10px',
          background: 'var(--v-purple)',
          color: '#fff',
          borderRadius: 'var(--v-radius-pill)',
          fontSize: 'var(--v-text-xs)',
          fontWeight: 700,
          marginBottom: 12,
          textTransform: 'lowercase',
        }}
      >
        {definition.part_of_speech}
      </div>
      <p
        style={{
          fontSize: 'var(--v-text-lg)',
          margin: '8px 0',
          color: 'var(--v-ink)',
          lineHeight: 1.5,
        }}
      >
        {definition.vietnamese}
      </p>
      {definition.example_sentence && (
        <p
          style={{
            fontStyle: 'italic',
            color: 'var(--v-ink-soft)',
            borderLeft: '3px solid var(--v-blue)',
            paddingLeft: 10,
            margin: '12px 0',
            lineHeight: 1.5,
          }}
        >
          {definition.example_sentence}
        </p>
      )}
      <button
        onClick={onStartSave}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '8px 14px',
          borderRadius: 'var(--v-radius-md)',
          background: 'var(--v-primary)',
          color: '#fff',
          marginTop: 8,
          border: 'none',
          cursor: 'pointer',
          fontFamily: 'var(--v-font-body)',
          fontWeight: 700,
        }}
      >
        <BookmarkPlus size={16} /> Lưu vào Word Bank
      </button>
    </div>
  );
}
