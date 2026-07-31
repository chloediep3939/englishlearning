'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FlatSentence } from '@/lib/reading/tokenizer';
import { cleanWord } from '@/lib/reading/tokenizer';
import { chunkSentence, chunkRanges, alignChunksToBreaks, globalBreaksToMap } from '@/lib/reading/chunker';
import { apiJson } from '@/lib/common/api-json';

interface AiChunkResult {
  i: number;
  chunks: string[];
  stress: string[];
}

export interface ChunkCursor {
  gi: number; // sentence global index
  ci: number; // chunk index within the sentence
}

// Silent gap inserted between chunks in "read whole passage" mode — the
// thought-group pause a good PTE reader leaves between phrases. Default for
// the `chunk_pause_ms` user setting.
const CHUNK_PAUSE_MS = 550;

export interface UseChunkPracticeOptions {
  sentences: FlatSentence[];
  /** Current TTS rate (mirrors the karaoke engine's rate chip). */
  rate: number;
  /** Gap between chunks in auto-read mode (`chunk_pause_ms` setting). */
  pauseMs?: number;
  /** Global word indices (chunk starts) parsed from "/" markers in the pasted
   *  text. When present, these become the default chunking and practice mode
   *  turns on automatically. */
  seedGlobalBreaks?: number[];
}

/**
 * PTE thought-group practice engine, layered on top of the karaoke reader.
 * Owns: chunk boundaries (rule-based defaults → AI refinement → manual
 * edits), echo playback (speak one chunk, wait for the learner to repeat,
 * advance on demand — no timing pressure), and AI stress-word data.
 *
 * Uses window.speechSynthesis directly with the same cancel-before-speak
 * discipline as use-karaoke; any other play action simply cancels ours.
 */
export function useChunkPractice({ sentences, rate, pauseMs = CHUNK_PAUSE_MS, seedGlobalBreaks }: UseChunkPracticeOptions) {
  const hasSeed = (seedGlobalBreaks?.length ?? 0) > 0;
  const [enabled, setEnabled] = useState(hasSeed);
  const [editMode, setEditMode] = useState(false);
  // gi → sorted word-token indices where a new chunk starts.
  const [breaks, setBreaks] = useState<Record<number, number[]>>({});
  // gi → cleaned stressed words (AI only).
  const [stress, setStress] = useState<Record<number, string[]>>({});
  const [cur, setCur] = useState<ChunkCursor | null>(null);
  const [playing, setPlaying] = useState(false);
  // Echo: chunk finished playing, waiting for the learner to read it aloud.
  const [waiting, setWaiting] = useState(false);
  const [done, setDone] = useState(false);
  // "Read whole passage with pauses" mode — auto-advances through every chunk
  // (no waiting), unlike echo mode.
  const [autoRead, setAutoRead] = useState(false);
  const autoReadRef = useRef(false);
  const pauseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiApplied, setAiApplied] = useState(false);

  const rateRef = useRef(rate);
  rateRef.current = rate;
  const pauseMsRef = useRef(pauseMs);
  pauseMsRef.current = pauseMs;

  // ── Edge TTS (Aria) chunk audio ─────────────────────────────────────────
  // Same source as the karaoke reader (/api/reading/tts) but keyed by chunk
  // TEXT — manual re-chunking produces new texts that fetch fresh, and
  // identical chunks reuse one blob. Browser speechSynthesis stays as the
  // per-chunk fallback. No word boundaries needed (whole chunk is tinted).
  const chunkAudioCacheRef = useRef<Map<string, string | 'failed'>>(new Map());
  const audioRef = useRef<HTMLAudioElement | null>(null);
  // Monotonic token — any new play/stop invalidates in-flight async work.
  const playSeqRef = useRef(0);

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      try {
        audioRef.current.pause();
      } catch {
        /* no-op */
      }
      audioRef.current = null;
    }
  }, []);

  const ensureChunkAudio = useCallback(async (text: string): Promise<string | 'failed'> => {
    const key = text.trim();
    const cached = chunkAudioCacheRef.current.get(key);
    if (cached) return cached;
    try {
      const r = await fetch('/api/reading/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: key }),
      });
      if (!r.ok) throw new Error(String(r.status));
      const data = (await r.json()) as { audio: string };
      const bytes = Uint8Array.from(atob(data.audio), (c) => c.charCodeAt(0));
      const url = URL.createObjectURL(new Blob([bytes], { type: 'audio/mpeg' }));
      chunkAudioCacheRef.current.set(key, url);
      return url;
    } catch {
      chunkAudioCacheRef.current.set(key, 'failed');
      return 'failed';
    }
  }, []);

  // Revoke cached blobs on unmount.
  useEffect(() => {
    const cache = chunkAudioCacheRef.current;
    return () => {
      for (const url of cache.values()) {
        if (url !== 'failed') URL.revokeObjectURL(url);
      }
      cache.clear();
    };
  }, []);

  // Default breaks: user's own "/" markers when the pasted text had them,
  // otherwise rule-based chunking. Recomputed when the passage changes.
  const defaultBreaks = useMemo(() => {
    if (hasSeed) return globalBreaksToMap(sentences, seedGlobalBreaks ?? []);
    const map: Record<number, number[]> = {};
    for (const s of sentences) map[s.gi] = chunkSentence(s.tokens);
    return map;
    // seedGlobalBreaks identity is stable per passage (parsed once on start).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sentences, hasSeed]);

  useEffect(() => {
    setBreaks(defaultBreaks);
    setStress({});
    setCur(null);
    setWaiting(false);
    setDone(false);
    setAiApplied(false);
  }, [defaultBreaks]);

  const rangesFor = useCallback(
    (gi: number) => {
      const s = sentences[gi];
      if (!s) return [];
      return chunkRanges(s, breaks[gi] ?? []);
    },
    [sentences, breaks],
  );

  const speakChunk = useCallback(
    (c: ChunkCursor) => {
      if (typeof window === 'undefined') return;
      const ranges = rangesFor(c.gi);
      const range = ranges[c.ci];
      if (!range) return;
      const synth = 'speechSynthesis' in window ? window.speechSynthesis : null;
      synth?.cancel();
      stopAudio();
      if (pauseTimerRef.current) {
        clearTimeout(pauseTimerRef.current);
        pauseTimerRef.current = null;
      }
      const seq = ++playSeqRef.current;
      setCur(c);
      setPlaying(true);
      setWaiting(false);
      setDone(false);

      // Shared completion: echo waits for the learner; read-whole-passage
      // pauses then auto-advances.
      const onSpoken = () => {
        if (playSeqRef.current !== seq) return;
        setPlaying(false);
        if (!autoReadRef.current) {
          setWaiting(true); // echo: learner's turn — no timer, advance manually
          return;
        }
        pauseTimerRef.current = setTimeout(() => {
          if (!autoReadRef.current) return;
          const r = rangesFor(c.gi);
          let nx: ChunkCursor | null = null;
          if (c.ci + 1 < r.length) nx = { gi: c.gi, ci: c.ci + 1 };
          else {
            for (let gi = c.gi + 1; gi < sentences.length; gi++) {
              if (rangesFor(gi).length > 0) {
                nx = { gi, ci: 0 };
                break;
              }
            }
          }
          if (nx) speakChunk(nx);
          else {
            autoReadRef.current = false;
            setAutoRead(false);
            setDone(true);
            setCur(null);
          }
        }, pauseMsRef.current);
      };

      const speakBrowser = () => {
        if (!synth || playSeqRef.current !== seq) return;
        const u = new SpeechSynthesisUtterance(range.text);
        u.lang = 'en-US';
        u.rate = rateRef.current;
        u.onend = onSpoken;
        synth.speak(u);
      };

      void (async () => {
        const url = await ensureChunkAudio(range.text);
        if (playSeqRef.current !== seq) return; // superseded while fetching
        if (url === 'failed') {
          speakBrowser();
          return;
        }
        const audio = new Audio(url);
        audioRef.current = audio;
        audio.playbackRate = rateRef.current;
        audio.onended = onSpoken;
        audio.onerror = () => {
          if (playSeqRef.current === seq) speakBrowser();
        };
        audio.play().catch(() => {
          if (playSeqRef.current === seq) speakBrowser();
        });
        // Warm the next chunk so echo/auto flow has no synthesis gap.
        if (c.ci + 1 < ranges.length) {
          void ensureChunkAudio(ranges[c.ci + 1].text);
        } else {
          for (let gi = c.gi + 1; gi < sentences.length; gi++) {
            const nr = rangesFor(gi);
            if (nr.length > 0) {
              void ensureChunkAudio(nr[0].text);
              break;
            }
          }
        }
      })();
    },
    // speakChunk recurses in auto mode (same pattern as use-karaoke).
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rangesFor, sentences.length, ensureChunkAudio, stopAudio],
  );

  /** First sentence that actually has words. */
  const firstGi = useMemo(() => sentences.find((s) => s.tokens.some((t) => t.isWord))?.gi ?? -1, [sentences]);

  // Echo actions must run in manual mode — turn auto-read off first.
  const goManual = useCallback(() => {
    autoReadRef.current = false;
    setAutoRead(false);
    if (pauseTimerRef.current) {
      clearTimeout(pauseTimerRef.current);
      pauseTimerRef.current = null;
    }
  }, []);

  /** Read the whole passage aloud, chunk by chunk, pausing between chunks. */
  const playAll = useCallback(() => {
    if (firstGi < 0) return;
    autoReadRef.current = true;
    setAutoRead(true);
    speakChunk({ gi: firstGi, ci: 0 });
  }, [firstGi, speakChunk]);

  const start = useCallback(() => {
    if (firstGi < 0) return;
    goManual();
    speakChunk({ gi: firstGi, ci: 0 });
  }, [firstGi, goManual, speakChunk]);

  const replay = useCallback(() => {
    if (cur) {
      goManual();
      speakChunk(cur);
    }
  }, [cur, goManual, speakChunk]);

  const next = useCallback(() => {
    if (!cur) return start();
    goManual();
    const ranges = rangesFor(cur.gi);
    if (cur.ci + 1 < ranges.length) return speakChunk({ gi: cur.gi, ci: cur.ci + 1 });
    // Advance to the next sentence with words.
    for (let gi = cur.gi + 1; gi < sentences.length; gi++) {
      if (rangesFor(gi).length > 0) return speakChunk({ gi, ci: 0 });
    }
    setWaiting(false);
    setPlaying(false);
    setDone(true);
  }, [cur, start, goManual, rangesFor, sentences.length, speakChunk]);

  const prev = useCallback(() => {
    if (!cur) return;
    goManual();
    if (cur.ci > 0) return speakChunk({ gi: cur.gi, ci: cur.ci - 1 });
    for (let gi = cur.gi - 1; gi >= 0; gi--) {
      const ranges = rangesFor(gi);
      if (ranges.length > 0) return speakChunk({ gi, ci: ranges.length - 1 });
    }
  }, [cur, goManual, rangesFor, speakChunk]);

  const stop = useCallback(() => {
    playSeqRef.current++; // invalidate in-flight fetch/audio callbacks
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    stopAudio();
    if (pauseTimerRef.current) {
      clearTimeout(pauseTimerRef.current);
      pauseTimerRef.current = null;
    }
    autoReadRef.current = false;
    setAutoRead(false);
    setPlaying(false);
    setWaiting(false);
    setCur(null);
    setDone(false);
  }, [stopAudio]);

  // Clear any pending inter-chunk pause on unmount.
  useEffect(() => () => {
    if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
  }, []);

  // Leaving chunk mode stops any in-flight practice.
  useEffect(() => {
    if (!enabled) {
      stop();
      setEditMode(false);
    }
  }, [enabled, stop]);

  /** Manual editing: toggle a break before word token `tokIdx` of sentence `gi`. */
  const toggleBreak = useCallback(
    (gi: number, tokIdx: number) => {
      setBreaks((prevB) => {
        const list = prevB[gi] ?? [];
        const nextList = list.includes(tokIdx)
          ? list.filter((b) => b !== tokIdx)
          : [...list, tokIdx].sort((a, b) => a - b);
        return { ...prevB, [gi]: nextList };
      });
      // Cursor chunk indices shift after an edit — stop any playback.
      goManual();
      setCur(null);
      setWaiting(false);
      setDone(false);
    },
    [goManual],
  );

  const resetBreaks = useCallback(() => {
    setBreaks(defaultBreaks);
    setStress({});
    setAiApplied(false);
    setCur(null);
    setWaiting(false);
    setDone(false);
  }, [defaultBreaks]);

  /** Ask Gemini for proper thought groups + stressed words. Sentences the AI
   *  fails to reproduce verbatim keep their current (rule/manual) breaks. */
  const runAI = useCallback(async () => {
    setAiLoading(true);
    setAiError(null);
    try {
      const payload = sentences.map((s) => s.text);
      const data = await apiJson<{ results: AiChunkResult[] }>('/api/reading/chunk-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sentences: payload }),
      });
      const nextBreaks: Record<number, number[]> = { ...defaultBreaks };
      const nextStress: Record<number, string[]> = {};
      let applied = 0;
      for (const r of data.results ?? []) {
        const s = sentences[r.i];
        if (!s || !Array.isArray(r.chunks)) continue;
        const aligned = alignChunksToBreaks(s, r.chunks);
        if (aligned) {
          nextBreaks[s.gi] = aligned;
          applied++;
        }
        if (Array.isArray(r.stress)) {
          nextStress[s.gi] = r.stress.map((w) => cleanWord(String(w))).filter(Boolean);
        }
      }
      if (applied === 0) {
        setAiError('AI không chia được cụm cho bài này — dùng cách chia mặc định.');
      } else {
        setBreaks(nextBreaks);
        setStress(nextStress);
        setAiApplied(true);
        setCur(null);
        setWaiting(false);
        setDone(false);
      }
    } catch {
      setAiError('Không gọi được AI — thử lại sau nhé.');
    } finally {
      setAiLoading(false);
    }
  }, [sentences, defaultBreaks]);

  return {
    enabled, setEnabled,
    editMode, setEditMode,
    breaks, stress,
    cur, playing, waiting, done, autoRead,
    rangesFor,
    start, replay, next, prev, stop, playAll,
    speakChunk,
    toggleBreak, resetBreaks,
    runAI, aiLoading, aiError, aiApplied,
  };
}

export type ChunkPractice = ReturnType<typeof useChunkPractice>;
