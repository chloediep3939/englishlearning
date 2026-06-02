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
  const [supported, setSupported] = useState(true);
  const [showVN, setShowVN] = useState(false);
  const [sel, setSel] = useState<SelectedWord | null>(null);
  const [saved, setSaved] = useState<SavedWord[]>([]);
  const [glossary, setGlossary] = useState<Record<string, GlossaryEntry>>(options.glossary);

  const rateRef = useRef(rate);
  rateRef.current = rate;
  const autoRef = useRef(auto);
  autoRef.current = auto;
  const singleRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setSupported(false);
    }
    return () => {
      try {
        window.speechSynthesis.cancel();
      } catch {
        /* no-op */
      }
    };
  }, []);

  const speakSentence = useCallback(
    (idx: number) => {
      if (idx < 0 || idx >= flat.length) {
        setPlaying(false);
        setCurSent(-1);
        setCurTok(-1);
        return;
      }
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
      const synth = window.speechSynthesis;
      synth.cancel();
      singleRef.current = false;
      const s = flat[idx];
      const u = new SpeechSynthesisUtterance(s.text);
      u.lang = 'en-US';
      u.rate = rateRef.current;
      setCurSent(idx);
      setCurTok(-1);
      setPlaying(true);
      u.onboundary = (e: SpeechSynthesisEvent) => {
        if (e.name && e.name !== 'word') return;
        const ci = e.charIndex;
        const ti = s.tokens.findIndex((t) => t.isWord && ci >= t.start && ci < t.end);
        if (ti >= 0) setCurTok(ti);
      };
      u.onend = () => {
        if (singleRef.current) return;
        if (autoRef.current) speakSentence(idx + 1);
        else {
          setPlaying(false);
          setCurTok(-1);
        }
      };
      synth.speak(u);
    },
    [flat],
  );

  const togglePlay = useCallback(() => {
    if (typeof window === 'undefined') return;
    const synth = window.speechSynthesis;
    if (playing) {
      synth.cancel();
      setPlaying(false);
      setCurTok(-1);
    } else {
      speakSentence(curSent >= 0 ? curSent : 0);
    }
  }, [playing, curSent, speakSentence]);

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
    synth.cancel();
    singleRef.current = true;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-US';
    u.rate = rateRef.current;
    u.onend = () => {
      singleRef.current = false;
    };
    synth.speak(u);
  }, []);

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
  };
}

export type KaraokeEngine = ReturnType<typeof useKaraoke>;
