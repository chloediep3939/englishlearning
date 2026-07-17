'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Lightbulb, Pause, Play, Square, Volume2 } from 'lucide-react';
import { parseFrame, isWordHidden } from '@/lib/templates/slots';
import type { FrameToken } from '@/lib/templates/slots';

const LEVELS = [0, 25, 50, 75, 100] as const;

interface WordToken extends FrameToken {
  /** Global word ordinal (words only) — feeds isWordHidden. */
  ordinal: number;
}
type LineToken = FrameToken | WordToken;

interface Line {
  lineIdx: number;
  tokens: LineToken[];
  /** Spoken text: words only (slots + slashes stripped). */
  speech: string;
}

interface Props {
  frameText: string;
  rate: number;
  onBack: () => void;
}

/** Progressive-hiding memorization: hide 25% → 100% of the frame's words
 *  (deterministic + monotonic across levels), tap a blank to peek, listen
 *  per line or play the whole frame while the text is hidden. */
export default function MemorizeTrainer({ frameText, rate, onBack }: Props) {
  const lines: Line[] = useMemo(() => {
    const tokens = parseFrame(frameText);
    const byLine = new Map<number, LineToken[]>();
    let ordinal = 0;
    for (const t of tokens) {
      const arr = byLine.get(t.lineIdx) ?? [];
      arr.push(t.kind === 'word' ? { ...t, ordinal: ordinal++ } : t);
      byLine.set(t.lineIdx, arr);
    }
    return [...byLine.entries()].map(([lineIdx, toks]) => ({
      lineIdx,
      tokens: toks,
      speech: toks
        .filter((t) => t.kind === 'word')
        .map((t) => t.text)
        .join(' '),
    }));
  }, [frameText]);

  const [level, setLevel] = useState<number>(0);
  const [revealed, setRevealed] = useState<Set<number>>(new Set());
  const [hint, setHint] = useState(true);
  const [playingLine, setPlayingLine] = useState<number | null>(null);
  const [playAll, setPlayAll] = useState(false);

  const rateRef = useRef(rate);
  rateRef.current = rate;
  // Line audio cache: lineIdx → blob URL of the Aria mp3 ('failed' is sticky).
  const cacheRef = useRef<Map<number, string | 'failed'>>(new Map());
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const seqRef = useRef(0);

  useEffect(() => {
    const cache = cacheRef.current;
    return () => {
      seqRef.current++;
      if (audioRef.current) {
        try { audioRef.current.pause(); } catch { /* no-op */ }
      }
      try { window.speechSynthesis.cancel(); } catch { /* no-op */ }
      for (const url of cache.values()) {
        if (url !== 'failed') URL.revokeObjectURL(url);
      }
      cache.clear();
    };
  }, []);

  const pickLevel = (l: number) => {
    setLevel(l);
    setRevealed(new Set());
  };

  const stopAll = useCallback(() => {
    seqRef.current++;
    if (audioRef.current) {
      try { audioRef.current.pause(); } catch { /* no-op */ }
      audioRef.current = null;
    }
    try { window.speechSynthesis.cancel(); } catch { /* no-op */ }
    setPlayingLine(null);
    setPlayAll(false);
  }, []);

  const ensureAudio = useCallback(
    async (i: number): Promise<string | 'failed'> => {
      const cached = cacheRef.current.get(i);
      if (cached) return cached;
      try {
        const r = await fetch('/api/reading/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: lines[i].speech }),
        });
        if (!r.ok) throw new Error(String(r.status));
        const data = (await r.json()) as { audio: string };
        const bytes = Uint8Array.from(atob(data.audio), (c) => c.charCodeAt(0));
        const url = URL.createObjectURL(new Blob([bytes], { type: 'audio/mpeg' }));
        cacheRef.current.set(i, url);
        return url;
      } catch {
        cacheRef.current.set(i, 'failed');
        return 'failed';
      }
    },
    [lines],
  );

  const speakLine = useCallback(
    (i: number, continueAll: boolean) => {
      if (i < 0 || i >= lines.length) {
        setPlayingLine(null);
        setPlayAll(false);
        return;
      }
      if (!lines[i].speech) {
        // Nothing speakable on this line — skip ahead when playing all.
        if (continueAll) speakLine(i + 1, true);
        else { setPlayingLine(null); setPlayAll(false); }
        return;
      }
      const seq = ++seqRef.current;
      if (audioRef.current) {
        try { audioRef.current.pause(); } catch { /* no-op */ }
        audioRef.current = null;
      }
      try { window.speechSynthesis.cancel(); } catch { /* no-op */ }
      setPlayingLine(i);
      setPlayAll(continueAll);

      const advance = () => {
        if (seqRef.current !== seq) return;
        if (continueAll) speakLine(i + 1, true);
        else { setPlayingLine(null); setPlayAll(false); }
      };
      const speakBrowser = () => {
        if (seqRef.current !== seq || !('speechSynthesis' in window)) return;
        const u = new SpeechSynthesisUtterance(lines[i].speech);
        u.lang = 'en-US';
        u.rate = rateRef.current;
        u.onend = advance;
        window.speechSynthesis.speak(u);
      };

      void (async () => {
        const url = await ensureAudio(i);
        if (seqRef.current !== seq) return;
        if (url === 'failed') { speakBrowser(); return; }
        const audio = new Audio(url);
        audioRef.current = audio;
        audio.playbackRate = rateRef.current;
        audio.onended = advance;
        audio.onerror = () => { if (seqRef.current === seq) speakBrowser(); };
        audio.play().catch(() => { if (seqRef.current === seq) speakBrowser(); });
        // Warm the next line so play-all flows without a synthesis gap.
        if (continueAll && i + 1 < lines.length && lines[i + 1].speech) void ensureAudio(i + 1);
      })();
    },
    [lines, ensureAudio],
  );

  const toggleWord = (ordinal: number) => {
    setRevealed((prev) => {
      const next = new Set(prev);
      if (next.has(ordinal)) next.delete(ordinal);
      else next.add(ordinal);
      return next;
    });
  };

  const pillBtn = (active: boolean): React.CSSProperties => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    whiteSpace: 'nowrap',
    padding: '7px 14px',
    borderRadius: 999,
    border: active ? '1px solid var(--v-purple)' : '1px solid var(--v-border)',
    background: active ? 'var(--v-purple)' : 'var(--v-surface)',
    color: active ? '#fff' : 'var(--v-ink-soft)',
    fontFamily: 'var(--v-font-head)',
    fontWeight: 800,
    fontSize: 12,
    lineHeight: 1,
    cursor: 'pointer',
  });

  return (
    <div>
      <button
        type="button"
        onClick={() => { stopAll(); onBack(); }}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          fontSize: 'var(--v-text-sm)',
          color: 'var(--v-muted)',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          padding: 0,
          marginBottom: 12,
          fontFamily: 'inherit',
        }}
      >
        <ArrowLeft size={14} /> Quay lại
      </button>

      <h2
        style={{
          fontFamily: 'var(--v-font-head)',
          fontWeight: 900,
          fontSize: 'var(--v-text-2xl)',
          margin: '0 0 6px',
          color: 'var(--v-ink)',
        }}
      >
        Học thuộc dần
      </h2>
      <p
        style={{
          color: 'var(--v-muted)',
          margin: '0 0 16px',
          fontFamily: 'var(--v-font-body)',
          fontSize: 'var(--v-text-sm)',
        }}
      >
        Tăng mức ẩn dần lên — từ đã ẩn ở mức thấp vẫn ẩn ở mức cao. Chạm vào chỗ
        trống để hé từ bạn quên, bấm loa để nghe trong lúc chữ bị che.
      </p>

      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        {LEVELS.map((l) => (
          <button key={l} type="button" onClick={() => pickLevel(l)} style={pillBtn(level === l)}>
            {l === 0 ? 'Hiện hết' : `Ẩn ${l}%`}
          </button>
        ))}
        <span style={{ flex: 1 }} />
        <button
          type="button"
          onClick={() => setHint((h) => !h)}
          title="Hiện chữ cái đầu của từ bị ẩn"
          style={pillBtn(hint)}
        >
          <Lightbulb size={12} /> Gợi ý chữ đầu
        </button>
        <button
          type="button"
          onClick={() => (playAll ? stopAll() : speakLine(0, true))}
          style={pillBtn(playAll)}
        >
          {playAll ? <Square size={12} /> : <Play size={12} />}
          {playAll ? 'Dừng' : 'Phát cả bài'}
        </button>
      </div>

      <div
        style={{
          background: 'var(--v-surface)',
          border: '1px solid var(--v-border)',
          borderRadius: 'var(--v-radius-md)',
          boxShadow: 'var(--v-shadow-sm)',
          padding: '18px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        {lines.map((line, li) => (
          <div
            key={line.lineIdx}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
              padding: '6px 8px',
              borderRadius: 10,
              background:
                playingLine === li
                  ? 'color-mix(in srgb, var(--v-purple) 10%, transparent)'
                  : 'transparent',
            }}
          >
            <button
              type="button"
              onClick={() => (playingLine === li && !playAll ? stopAll() : speakLine(li, false))}
              title="Nghe dòng này"
              aria-label="Nghe dòng này"
              disabled={!line.speech}
              style={{
                width: 28,
                height: 28,
                borderRadius: 9,
                border: '1px solid var(--v-border)',
                background: playingLine === li ? 'var(--v-purple)' : 'var(--v-panel)',
                color: playingLine === li ? '#fff' : 'var(--v-ink-soft)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: line.speech ? 'pointer' : 'not-allowed',
                opacity: line.speech ? 1 : 0.4,
                flexShrink: 0,
                marginTop: 2,
              }}
            >
              {playingLine === li && !playAll ? <Pause size={13} /> : <Volume2 size={13} />}
            </button>

            <div
              style={{
                fontFamily: 'var(--v-font-body)',
                fontSize: 'var(--v-text-lg)',
                lineHeight: 1.9,
                color: 'var(--v-ink)',
              }}
            >
              {line.tokens.map((t, ti) => {
                if (t.kind === 'break') {
                  const strong = t.breakLevel === 2;
                  return (
                    <span
                      key={ti}
                      style={{
                        color: strong ? 'var(--v-purple)' : 'var(--v-muted)',
                        fontWeight: strong ? 800 : 400,
                        margin: '0 6px',
                        opacity: strong ? 0.8 : 0.55,
                      }}
                    >
                      {strong ? '‖' : '/'}
                    </span>
                  );
                }
                if (t.kind === 'slot') {
                  return (
                    <span
                      key={ti}
                      style={{
                        display: 'inline-block',
                        padding: '0 9px',
                        margin: '0 3px',
                        borderRadius: 999,
                        background: 'color-mix(in srgb, var(--v-purple) 14%, var(--v-surface))',
                        border: '1px solid color-mix(in srgb, var(--v-purple) 45%, transparent)',
                        color: 'var(--v-purple)',
                        fontFamily: 'var(--v-font-mono)',
                        fontSize: 12,
                        fontWeight: 700,
                        verticalAlign: 1,
                      }}
                    >
                      {t.text}
                    </span>
                  );
                }
                const w = t as WordToken;
                const m = w.text.match(/^(.*?)([.,;:!?]*)$/);
                const core = m?.[1] ?? w.text;
                const punct = m?.[2] ?? '';
                // Pure punctuation (e.g. a "," left standalone after a slot)
                // is never hidden — a blank for a comma is just noise.
                if (!/[A-Za-z0-9]/.test(core)) {
                  return <span key={ti}>{w.text} </span>;
                }
                const hidden = isWordHidden(w.ordinal, level) && !revealed.has(w.ordinal);
                if (!hidden) {
                  const peeked = isWordHidden(w.ordinal, level) && revealed.has(w.ordinal);
                  return (
                    <span key={ti}>
                      <span
                        onClick={peeked ? () => toggleWord(w.ordinal) : undefined}
                        style={
                          peeked
                            ? {
                                color: 'var(--v-orange)',
                                fontWeight: 800,
                                cursor: 'pointer',
                                borderBottom: '2px dotted var(--v-orange)',
                              }
                            : undefined
                        }
                      >
                        {core}
                      </span>
                      {punct}{' '}
                    </span>
                  );
                }
                const blankLen = Math.max(2, core.length - (hint ? 1 : 0));
                return (
                  <span key={ti}>
                    <span
                      onClick={() => toggleWord(w.ordinal)}
                      title="Chạm để hé từ"
                      style={{
                        cursor: 'pointer',
                        fontFamily: 'var(--v-font-mono)',
                        color: 'var(--v-muted)',
                        letterSpacing: '0.05em',
                      }}
                    >
                      {hint ? core.charAt(0) : ''}
                      {'_'.repeat(blankLen)}
                    </span>
                    {punct}{' '}
                  </span>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
