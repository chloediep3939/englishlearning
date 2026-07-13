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
// thought-group pause a good PTE reader leaves between phrases.
const CHUNK_PAUSE_MS = 550;

export interface UseChunkPracticeOptions {
  sentences: FlatSentence[];
  /** Current TTS rate (mirrors the karaoke engine's rate chip). */
  rate: number;
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
export function useChunkPractice({ sentences, rate, seedGlobalBreaks }: UseChunkPracticeOptions) {
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
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
      const ranges = rangesFor(c.gi);
      const range = ranges[c.ci];
      if (!range) return;
      const synth = window.speechSynthesis;
      synth.cancel();
      if (pauseTimerRef.current) {
        clearTimeout(pauseTimerRef.current);
        pauseTimerRef.current = null;
      }
      const u = new SpeechSynthesisUtterance(range.text);
      u.lang = 'en-US';
      u.rate = rateRef.current;
      setCur(c);
      setPlaying(true);
      setWaiting(false);
      setDone(false);
      u.onend = () => {
        setPlaying(false);
        if (!autoReadRef.current) {
          setWaiting(true); // echo: learner's turn — no timer, advance manually
          return;
        }
        // Read-whole-passage: pause, then auto-advance to the next chunk.
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
        }, CHUNK_PAUSE_MS);
      };
      synth.speak(u);
    },
    // speakChunk recurses in auto mode (same pattern as use-karaoke).
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rangesFor, sentences.length],
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
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
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
  }, []);

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
