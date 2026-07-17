'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FlatSentence } from '@/lib/reading/tokenizer';
import { cleanWord } from '@/lib/reading/tokenizer';
import type { GlossaryEntry } from '@/lib/types';
import { READING_DEFAULT_RATE } from '@/lib/reading/constants';

// A flat sentence enriched with its global index for rendering convenience.
export interface SentenceWithGi extends FlatSentence {
  gi: number;
}

export interface SelectedWord {
  sentIdx: number; // == gi of the sentence
  tokIdx: number;
  raw: string;
  clean: string;
}

export interface SavedWord {
  clean: string;
  raw: string;
  vi: string;
}

export interface UseKaraokeOptions {
  sentences: FlatSentence[];
  /** VN text keyed by global sentence index (gi). null = not translated. */
  translations: Record<number, string | null>;
  /** Word glossary keyed by cleaned headword. */
  glossary: Record<string, GlossaryEntry>;
  initialRate?: number;
  initialAuto?: boolean;
  /** Persistence hooks (fire on user change, not on mount). */
  onRateChange?: (rate: number) => void;
  onAutoChange?: (auto: boolean) => void;
}

/**
 * Karaoke TTS engine. Ported from the design prototype's `useKaraoke` with the
 * data (sentences / translations / glossary) injected rather than hard-coded.
 *
 * Web Speech API gotchas handled (see design README):
 *  - boundary→token mapping via char offsets, filtering non-"word" boundaries
 *  - stale closures avoided with rateRef / autoRef / singleRef
 *  - rate changes restart the current sentence (can't change mid-utterance)
 *  - pause uses cancel() (resume restarts the current sentence)
 *  - speechSynthesis.cancel() on unmount
 */
export function useKaraoke(options: UseKaraokeOptions) {
  const { sentences, translations, onRateChange, onAutoChange } = options;

  const flat: SentenceWithGi[] = useMemo(
    () => sentences.map((s) => ({ ...s, gi: s.gi })),
    [sentences],
  );

  const [playing, setPlaying] = useState(false);
  const [curSent, setCurSent] = useState(-1);
  const [curTok, setCurTok] = useState(-1);
  const [rate, setRate] = useState(options.initialRate ?? READING_DEFAULT_RATE);
  const [auto, setAuto] = useState(options.initialAuto ?? true);
  // Loop whole passage: when auto-continue runs past the last sentence,
  // restart from sentence 0 instead of stopping. Session-only (not persisted).
  const [loop, setLoop] = useState(false);
  const [supported, setSupported] = useState(true);
  const [showVN, setShowVN] = useState(false);
  const [sel, setSel] = useState<SelectedWord | null>(null);
  const [saved, setSaved] = useState<SavedWord[]>([]);
  const [glossary, setGlossary] = useState<Record<string, GlossaryEntry>>(options.glossary);

  const rateRef = useRef(rate);
  rateRef.current = rate;
  const autoRef = useRef(auto);
  autoRef.current = auto;
  const loopRef = useRef(loop);
  loopRef.current = loop;
  const singleRef = useRef(false);

  // ── Edge TTS (Aria) sentence audio ──────────────────────────────────────
  // Primary playback is a server-synthesized mp3 (/api/reading/tts) with
  // word-boundary timings, so the karaoke highlight follows audio.currentTime.
  // Browser speechSynthesis remains the per-sentence fallback (dev mode, MS
  // endpoint down, request too long, autoplay refusal, ...).
  interface EdgeEntry {
    url: string; // blob: object URL of the mp3
    times: number[]; // times[i] = audio offset (s) of the i-th spoken word
  }
  const edgeCacheRef = useRef<Map<number, EdgeEntry | 'failed'>>(new Map());
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const rafRef = useRef<number>(0);
  // Monotonic token — any new play/pause invalidates in-flight async work.
  const playSeqRef = useRef(0);

  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setSupported(false);
    }
    return () => {
      playSeqRef.current++;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (audioRef.current) {
        try {
          audioRef.current.pause();
        } catch {
          /* no-op */
        }
      }
      try {
        window.speechSynthesis.cancel();
      } catch {
        /* no-op */
      }
    };
  }, []);

  // Passage changed → cached blobs belong to old sentences; drop + revoke.
  useEffect(() => {
    const cache = edgeCacheRef.current;
    return () => {
      for (const entry of cache.values()) {
        if (entry !== 'failed') URL.revokeObjectURL(entry.url);
      }
      cache.clear();
    };
  }, [flat]);

  const stopAudio = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
    if (audioRef.current) {
      try {
        audioRef.current.pause();
      } catch {
        /* no-op */
      }
      audioRef.current = null;
    }
  }, []);

  /** Fetch + memoize the Aria mp3 for sentence `idx`. 'failed' is sticky for
   *  the session so a broken sentence doesn't refetch on every replay. */
  const ensureEdge = useCallback(
    async (idx: number): Promise<EdgeEntry | 'failed'> => {
      const cached = edgeCacheRef.current.get(idx);
      if (cached) return cached;
      try {
        const r = await fetch('/api/reading/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: flat[idx].text }),
        });
        if (!r.ok) throw new Error(String(r.status));
        const data = (await r.json()) as { audio: string; boundaries: { t: number; w: string }[] };
        const bytes = Uint8Array.from(atob(data.audio), (c) => c.charCodeAt(0));
        const url = URL.createObjectURL(new Blob([bytes], { type: 'audio/mpeg' }));
        const entry: EdgeEntry = { url, times: data.boundaries.map((b) => b.t) };
        edgeCacheRef.current.set(idx, entry);
        return entry;
      } catch {
        edgeCacheRef.current.set(idx, 'failed');
        return 'failed';
      }
    },
    [flat],
  );

  const speakSentence = useCallback(
    (idx: number) => {
      if (idx < 0 || idx >= flat.length) {
        // Ran past the end with loop on → wrap to the first sentence.
        if (idx >= flat.length && loopRef.current && flat.length > 0) {
          speakSentence(0);
          return;
        }
        setPlaying(false);
        setCurSent(-1);
        setCurTok(-1);
        return;
      }
      if (typeof window === 'undefined') return;
      const synth = 'speechSynthesis' in window ? window.speechSynthesis : null;
      synth?.cancel();
      stopAudio();
      singleRef.current = false;
      const seq = ++playSeqRef.current;
      const s = flat[idx];
      setCurSent(idx);
      setCurTok(-1);
      setPlaying(true);

      // Fallback: the original speechSynthesis path (word highlight via
      // onboundary char offsets).
      const speakBrowser = () => {
        if (!synth || playSeqRef.current !== seq) return;
        const u = new SpeechSynthesisUtterance(s.text);
        u.lang = 'en-US';
        u.rate = rateRef.current;
        u.onboundary = (e: SpeechSynthesisEvent) => {
          if (e.name && e.name !== 'word') return;
          const ci = e.charIndex;
          const ti = s.tokens.findIndex((t) => t.isWord && ci >= t.start && ci < t.end);
          if (ti >= 0) setCurTok(ti);
        };
        u.onend = () => {
          if (singleRef.current || playSeqRef.current !== seq) return;
          if (autoRef.current) speakSentence(idx + 1);
          else {
            setPlaying(false);
            setCurTok(-1);
          }
        };
        synth.speak(u);
      };

      void (async () => {
        const entry = await ensureEdge(idx);
        if (playSeqRef.current !== seq) return; // superseded while fetching
        if (entry === 'failed') {
          speakBrowser();
          return;
        }
        // i-th word boundary ↔ i-th word token (both are in spoken order).
        const wordTokens: number[] = [];
        s.tokens.forEach((t, i) => {
          if (t.isWord) wordTokens.push(i);
        });
        const audio = new Audio(entry.url);
        audioRef.current = audio;
        audio.playbackRate = rateRef.current;
        const tick = () => {
          if (playSeqRef.current !== seq) return;
          const t = audio.currentTime;
          let wi = -1;
          for (let i = 0; i < entry.times.length; i++) {
            if (t >= entry.times[i]) wi = i;
            else break;
          }
          if (wi >= 0 && wi < wordTokens.length) setCurTok(wordTokens[wi]);
          rafRef.current = requestAnimationFrame(tick);
        };
        audio.onended = () => {
          if (playSeqRef.current !== seq) return;
          if (rafRef.current) cancelAnimationFrame(rafRef.current);
          if (autoRef.current) speakSentence(idx + 1);
          else {
            setPlaying(false);
            setCurTok(-1);
          }
        };
        audio.onerror = () => {
          if (playSeqRef.current === seq) speakBrowser();
        };
        audio
          .play()
          .then(() => {
            rafRef.current = requestAnimationFrame(tick);
          })
          .catch(() => {
            if (playSeqRef.current === seq) speakBrowser();
          });
        // Warm the next sentence while this one plays — auto-continue then
        // starts without a synthesis gap.
        if (idx + 1 < flat.length) void ensureEdge(idx + 1);
      })();
    },
    [flat, ensureEdge, stopAudio],
  );

  const togglePlay = useCallback(() => {
    if (typeof window === 'undefined') return;
    if (playing) {
      playSeqRef.current++; // invalidate in-flight fetch/tick callbacks
      try {
        window.speechSynthesis.cancel();
      } catch {
        /* no-op */
      }
      stopAudio();
      setPlaying(false);
      setCurTok(-1);
    } else {
      speakSentence(curSent >= 0 ? curSent : 0);
    }
  }, [playing, curSent, speakSentence, stopAudio]);

  const restart = useCallback(() => {
    if (typeof window !== 'undefined') window.speechSynthesis.cancel();
    setCurTok(-1);
    speakSentence(0);
  }, [speakSentence]);

  const prevS = useCallback(() => {
    const t = Math.max(0, (curSent < 0 ? 0 : curSent) - 1);
    if (playing) speakSentence(t);
    else {
      setCurSent(t);
      setCurTok(-1);
    }
  }, [curSent, playing, speakSentence]);

  const nextS = useCallback(() => {
    const t = Math.min(flat.length - 1, (curSent < 0 ? 0 : curSent) + 1);
    if (playing) speakSentence(t);
    else {
      setCurSent(t);
      setCurTok(-1);
    }
  }, [curSent, playing, flat.length, speakSentence]);

  const sayText = useCallback((text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const synth = window.speechSynthesis;
    // A word tap must silence the Aria sentence audio too, not just TTS.
    playSeqRef.current++;
    stopAudio();
    synth.cancel();
    singleRef.current = true;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-US';
    u.rate = rateRef.current;
    u.onend = () => {
      singleRef.current = false;
    };
    synth.speak(u);
  }, [stopAudio]);

  const speakWord = useCallback(
    (sentIdx: number, tokIdx: number) => {
      const tok = flat[sentIdx]?.tokens[tokIdx];
      if (!tok || !tok.isWord) return;
      const clean = cleanWord(tok.text);
      sayText(tok.text);
      setPlaying(false);
      setCurSent(sentIdx);
      setCurTok(tokIdx);
      setSel({ sentIdx, tokIdx, raw: tok.text, clean });
    },
    [flat, sayText],
  );

  const pickRate = useCallback(
    (r: number) => {
      setRate(r);
      rateRef.current = r;
      onRateChange?.(r);
      // Aria audio adjusts live (no restart hiccup); the speechSynthesis
      // fallback can't change rate mid-utterance → restart the sentence.
      if (audioRef.current && !audioRef.current.paused) {
        audioRef.current.playbackRate = r;
        return;
      }
      if (playing && curSent >= 0) speakSentence(curSent);
    },
    [playing, curSent, speakSentence, onRateChange],
  );

  const toggleAuto = useCallback(() => {
    setAuto((a) => {
      const next = !a;
      autoRef.current = next;
      onAutoChange?.(next);
      return next;
    });
  }, [onAutoChange]);

  const toggleLoop = useCallback(() => {
    setLoop((l) => {
      const next = !l;
      loopRef.current = next;
      return next;
    });
  }, []);

  const addWord = useCallback((entry: SavedWord) => {
    setSaved((prev) => (prev.some((w) => w.clean === entry.clean) ? prev : [...prev, entry]));
  }, []);

  const isSaved = useCallback((clean: string) => saved.some((w) => w.clean === clean), [saved]);

  const mergeGlossary = useCallback((clean: string, entry: GlossaryEntry) => {
    setGlossary((prev) => ({ ...prev, [clean]: entry }));
  }, []);

  const paras: SentenceWithGi[][] = useMemo(() => {
    const groups = new Map<number, SentenceWithGi[]>();
    for (const s of flat) {
      const arr = groups.get(s.pIdx) ?? [];
      arr.push(s);
      groups.set(s.pIdx, arr);
    }
    return [...groups.values()];
  }, [flat]);

  return {
    sentences: flat,
    paras,
    translations,
    glossary,
    playing,
    curSent,
    curTok,
    rate,
    auto,
    loop,
    supported,
    singleRef,
    showVN,
    setShowVN,
    sel,
    setSel,
    saved,
    addWord,
    isSaved,
    mergeGlossary,
    sayText,
    togglePlay,
    restart,
    prevS,
    nextS,
    speakWord,
    pickRate,
    toggleAuto,
    toggleLoop,
  };
}

export type KaraokeEngine = ReturnType<typeof useKaraoke>;
