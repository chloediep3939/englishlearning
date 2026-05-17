'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BookmarkPlus,
  Pause,
  Play,
  Square,
  Volume2,
  X,
} from 'lucide-react';
import type { Flashcard, FlashcardDeckWithCounts } from '@/lib/types';
import type { DictionaryResult } from '@/lib/flashcards/dictionary';
import { ApiError, apiJson } from '@/lib/common/api-json';
import { getStoredVoicePreference, speakWord } from '@/lib/tts';

const MAX_TTS_CHARS = 5000;
const RATE_OPTIONS = [0.75, 1, 1.25, 1.5] as const;

interface Token {
  text: string;
  isWord: boolean;
  charStart: number;
  charEnd: number;
}

type PopupPhase =
  | 'loading'
  | 'definition'
  | 'notFound'
  | 'deckPicker'
  | 'saving'
  | 'saved'
  | 'error';

interface PopupState {
  word: string;
  sentence: string;
  phase: PopupPhase;
  definition: DictionaryResult | null;
  error: string;
}

function tokenize(content: string): Token[] {
  const tokens: Token[] = [];
  const re = /([a-zA-Z][a-zA-Z'-]*[a-zA-Z]|[a-zA-Z])|([^a-zA-Z]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) {
    tokens.push({
      text: m[0],
      isWord: m[1] !== undefined,
      charStart: m.index,
      charEnd: m.index + m[0].length,
    });
  }
  return tokens;
}

function findSentenceContaining(content: string, charIndex: number): string {
  const sentenceRegex = /[^.!?]+[.!?]+(?:\s+|$)/g;
  let m: RegExpExecArray | null;
  while ((m = sentenceRegex.exec(content)) !== null) {
    const start = m.index;
    const end = start + m[0].length;
    if (charIndex >= start && charIndex < end) return m[0].trim();
  }
  const start = Math.max(0, charIndex - 200);
  const end = Math.min(content.length, charIndex + 200);
  return content.slice(start, end).trim();
}

interface KaraokeReaderProps {
  passageId: number;
  content: string;
}

export default function KaraokeReader({ passageId, content }: KaraokeReaderProps) {
  // Some browsers cut TTS off after long utterances. Cap the TTS input
  // separately from the rendered text so the reader still shows the whole
  // passage — only the karaoke highlight stops at the cap.
  const ttsContent =
    content.length > MAX_TTS_CHARS ? content.slice(0, MAX_TTS_CHARS) : content;
  const wasSliced = ttsContent.length < content.length;

  const tokens = useMemo(() => tokenize(content), [content]);

  const [activeCharIndex, setActiveCharIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [rate, setRate] = useState(1);
  const [voiceName, setVoiceName] = useState<string>('auto');
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [ttsSupported, setTtsSupported] = useState(true);

  const [savedWords, setSavedWords] = useState<Set<string>>(new Set());
  const [decks, setDecks] = useState<FlashcardDeckWithCounts[]>([]);

  const [popup, setPopup] = useState<PopupState | null>(null);

  // Detect TTS + load voice list. `voiceschanged` is the only reliable
  // signal that Chrome has populated the voice list.
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setTtsSupported(false);
      return;
    }
    setVoiceName(getStoredVoicePreference());
    const synth = window.speechSynthesis;
    const refresh = () => {
      setVoices(
        synth.getVoices().filter((v) => v.lang.toLowerCase().startsWith('en')),
      );
    };
    refresh();
    synth.addEventListener('voiceschanged', refresh);
    return () => {
      synth.removeEventListener('voiceschanged', refresh);
      synth.cancel();
    };
  }, []);

  // Pre-load saved words + decks so the popup can show "already saved"
  // and present a deck picker without a round-trip after click.
  useEffect(() => {
    let cancelled = false;
    apiJson<{ cards: Flashcard[] }>(`/api/cards?source_passage_id=${passageId}`)
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
    return () => {
      cancelled = true;
    };
  }, [passageId]);

  // ---- TTS controls ----
  const play = useCallback(() => {
    if (!ttsSupported || typeof window === 'undefined') return;
    const synth = window.speechSynthesis;
    synth.cancel();

    const u = new SpeechSynthesisUtterance(ttsContent);
    u.lang = 'en-US';
    u.rate = rate;
    if (voiceName && voiceName !== 'auto') {
      const v = voices.find((x) => x.name === voiceName);
      if (v) u.voice = v;
    }
    // iOS Safari / some Chrome builds never fire 'boundary' for the 'word'
    // unit. The highlight just stays at -1 in that case; audio still plays.
    u.onboundary = (e) => {
      if (e.name === 'word') setActiveCharIndex(e.charIndex);
    };
    u.onend = () => {
      setIsPlaying(false);
      setActiveCharIndex(-1);
    };
    u.onerror = () => {
      setIsPlaying(false);
    };
    synth.speak(u);
    setIsPlaying(true);
  }, [ttsSupported, ttsContent, rate, voiceName, voices]);

  const pause = useCallback(() => {
    if (!ttsSupported) return;
    window.speechSynthesis.cancel();
    setIsPlaying(false);
  }, [ttsSupported]);

  const stop = useCallback(() => {
    if (!ttsSupported) return;
    window.speechSynthesis.cancel();
    setIsPlaying(false);
    setActiveCharIndex(-1);
  }, [ttsSupported]);

  // ---- Word click → dictionary popup ----
  const closePopup = useCallback(() => setPopup(null), []);

  const handleWordClick = useCallback(
    (token: Token) => {
      pause();
      // Use the full passage for sentence context so words past the TTS
      // cap still get a sensible surrounding sentence on click.
      const sentence = findSentenceContaining(content, token.charStart);
      setPopup({
        word: token.text,
        sentence,
        phase: 'loading',
        definition: null,
        error: '',
      });

      apiJson<DictionaryResult>(
        `/api/dictionary/lookup?word=${encodeURIComponent(token.text)}`,
      )
        .then((definition) =>
          setPopup((p) => (p ? { ...p, phase: 'definition', definition } : p)),
        )
        .catch((e: unknown) => {
          if (e instanceof ApiError && e.status === 404) {
            setPopup((p) => (p ? { ...p, phase: 'notFound' } : p));
            return;
          }
          const msg = e instanceof Error ? e.message : 'Lỗi tra từ';
          setPopup((p) => (p ? { ...p, phase: 'error', error: msg } : p));
        });
    },
    [pause, content],
  );

  useEffect(() => {
    if (!popup) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closePopup();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [popup, closePopup]);

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
            word: current.definition.word,
            deck_id: deckId,
            passage_id: passageId,
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
    [popup, passageId],
  );

  return (
    <div>
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
          disabled={!ttsSupported}
          title={!ttsSupported ? 'Trình duyệt không hỗ trợ TTS' : undefined}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 14px',
            borderRadius: 'var(--v-radius-md)',
            background: ttsSupported ? 'var(--v-primary)' : 'var(--v-muted)',
            color: '#fff',
            border: 'none',
            cursor: ttsSupported ? 'pointer' : 'not-allowed',
            fontFamily: 'var(--v-font-body)',
            fontWeight: 700,
          }}
        >
          {isPlaying ? <Pause size={16} /> : <Play size={16} />}
          {isPlaying ? 'Tạm dừng' : 'Đọc to'}
        </button>
        <button
          onClick={stop}
          disabled={!ttsSupported}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 14px',
            borderRadius: 'var(--v-radius-md)',
            background: 'var(--v-bg)',
            border: '1px solid var(--v-border)',
            color: 'var(--v-ink)',
            cursor: ttsSupported ? 'pointer' : 'not-allowed',
            fontFamily: 'var(--v-font-body)',
            fontWeight: 600,
          }}
        >
          <Square size={14} /> Dừng
        </button>

        <label
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontFamily: 'var(--v-font-body)',
            fontSize: 'var(--v-text-sm)',
            color: 'var(--v-ink-soft)',
          }}
        >
          Tốc độ:
          <select
            value={String(rate)}
            onChange={(e) => setRate(Number(e.target.value))}
            style={{
              padding: '6px 10px',
              background: 'var(--v-surface)',
              border: '1.5px solid var(--v-border)',
              borderRadius: 'var(--v-radius-sm)',
              color: 'var(--v-ink)',
              fontFamily: 'var(--v-font-body)',
              fontSize: 'var(--v-text-sm)',
            }}
          >
            {RATE_OPTIONS.map((r) => (
              <option key={r} value={r}>
                {r}x
              </option>
            ))}
          </select>
        </label>

        <label
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontFamily: 'var(--v-font-body)',
            fontSize: 'var(--v-text-sm)',
            color: 'var(--v-ink-soft)',
          }}
        >
          Giọng:
          <select
            value={voiceName}
            onChange={(e) => setVoiceName(e.target.value)}
            disabled={!ttsSupported}
            style={{
              padding: '6px 10px',
              background: 'var(--v-surface)',
              border: '1.5px solid var(--v-border)',
              borderRadius: 'var(--v-radius-sm)',
              color: 'var(--v-ink)',
              fontFamily: 'var(--v-font-body)',
              fontSize: 'var(--v-text-sm)',
              maxWidth: 220,
            }}
          >
            <option value="auto">Tự động</option>
            {voices.map((v) => (
              <option key={v.name} value={v.name}>
                {v.name} — {v.lang}
              </option>
            ))}
          </select>
        </label>
      </div>

      {wasSliced && (
        <div
          style={{
            background: 'var(--v-panel)',
            border: '1px solid var(--v-border)',
            borderLeft: '4px solid var(--v-orange)',
            padding: '10px 14px',
            marginBottom: 16,
            borderRadius: 'var(--v-radius-sm)',
            fontSize: 'var(--v-text-sm)',
            color: 'var(--v-ink)',
            fontFamily: 'var(--v-font-body)',
          }}
        >
          Bài dài quá — mình chỉ đọc {MAX_TTS_CHARS.toLocaleString('vi-VN')} ký
          tự đầu thôi nhé.
        </div>
      )}

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
            activeCharIndex >= 0 &&
            activeCharIndex >= t.charStart &&
            activeCharIndex < t.charEnd;
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
          <p
            style={{
              textAlign: 'center',
              padding: 24,
              color: 'var(--v-ink-soft)',
            }}
          >
            Bún đang tra…
          </p>
        )}

        {popup.phase === 'notFound' && (
          <div style={{ textAlign: 'center', padding: 24 }}>
            <p
              style={{
                color: 'var(--v-ink)',
                marginBottom: 8,
                fontWeight: 700,
              }}
            >
              Không tìm thấy &ldquo;{popup.word}&rdquo;
            </p>
            <p
              style={{
                color: 'var(--v-ink-soft)',
                marginBottom: 12,
                fontSize: 'var(--v-text-sm)',
              }}
            >
              Từ này không có trong từ điển — có thể là tên riêng hoặc dạng
              biến thể. Bạn có thể bỏ qua hoặc tự thêm thẻ trong /add.
            </p>
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

        {popup.phase === 'error' && (
          <div style={{ textAlign: 'center', padding: 24 }}>
            <p style={{ color: 'var(--v-red)', marginBottom: 12 }}>
              {popup.error}
            </p>
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
          <DefinitionBody
            definition={popup.definition}
            onStartSave={onStartSave}
          />
        )}

        {popup.phase === 'deckPicker' && popup.definition && (
          <div>
            <p
              style={{
                marginBottom: 12,
                fontWeight: 700,
                color: 'var(--v-ink)',
              }}
            >
              Lưu &ldquo;{popup.definition.word}&rdquo; vào deck nào?
            </p>
            {decks.length === 0 ? (
              <p style={{ color: 'var(--v-ink-soft)' }}>
                Bạn chưa có deck nào — tạo deck trong /decks trước đã.
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
          <p
            style={{
              textAlign: 'center',
              padding: 24,
              color: 'var(--v-ink-soft)',
            }}
          >
            Bún đang tạo thẻ…
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
  definition: DictionaryResult;
  onStartSave: () => void;
}) {
  function speakLemma() {
    void speakWord(definition.word, {
      audioUrl: definition.audio_url,
      lang: 'en-US',
      voice_preference: getStoredVoicePreference(),
    });
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
        {definition.word}
      </h3>
      {(definition.ipa || definition.audio_url) && (
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
          {definition.ipa && <span>/{definition.ipa}/</span>}
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
      {definition.part_of_speech && (
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
      )}
      {definition.definitions.length > 0 && (
        <ul
          style={{
            margin: '8px 0',
            padding: '0 0 0 18px',
            color: 'var(--v-ink)',
            fontSize: 'var(--v-text-md)',
            lineHeight: 1.5,
          }}
        >
          {definition.definitions.map((d, i) => (
            <li key={i} style={{ marginBottom: 4 }}>
              {d}
            </li>
          ))}
        </ul>
      )}
      {definition.examples.length > 0 && (
        <div style={{ marginTop: 8 }}>
          {definition.examples.map((ex, i) => (
            <p
              key={i}
              style={{
                fontStyle: 'italic',
                color: 'var(--v-ink-soft)',
                borderLeft: '3px solid var(--v-blue)',
                paddingLeft: 10,
                margin: '6px 0',
                lineHeight: 1.5,
                fontSize: 'var(--v-text-sm)',
              }}
            >
              {ex.en}
            </p>
          ))}
        </div>
      )}
      <button
        onClick={onStartSave}
        style={{
          display: 'inline-flex',
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
