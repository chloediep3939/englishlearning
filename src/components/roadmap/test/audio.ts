'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { speak, speakWord, getStoredVoicePreference } from '@/lib/tts';

// Phát âm dùng chung cho mọi bài tự kiểm tra.

// Từ đã nhờ /api/words/lookup tra Oxford rồi thì thôi — giữ ở cấp module để
// đổi lượt / mở lại popup cũng không gọi lại.
const warmed = new Set<string>();

/**
 * Mồi danh sách giọng đọc ngay khi mở bài. Lúc trang vừa tải getVoices() trả
 * mảng rỗng; speak() gặp mảng rỗng thì CHỜ sự kiện "voiceschanged" — Safari
 * không bắn sự kiện đó, lời gọi chờ mãi và im lặng. Gọi sớm để lúc cần đọc
 * thì danh sách đã có.
 */
export function usePrimeVoices(): void {
  useEffect(() => {
    try {
      window.speechSynthesis?.getVoices();
    } catch {
      /* không có speechSynthesis — đường mp3 vẫn chạy */
    }
  }, []);
}

/**
 * Có bản ghi Oxford thì phát mp3 thật; chưa có thì giọng máy. `warm` = nhờ tra
 * Oxford sẵn trong nền để lần sau có mp3 (chỉ nên bật cho từ trong bộ từ, vì
 * lookup còn tra cả nghĩa).
 */
export function playWord(word: string, hasAudio: boolean, opts: { rate?: number; warm?: boolean } = {}): void {
  // Chrome đôi khi kẹt speechSynthesis ở trạng thái paused — resume() vô hại.
  try {
    window.speechSynthesis?.resume();
  } catch {
    /* ignore */
  }
  const audioUrl = hasAudio ? `/api/words/audio/${encodeURIComponent(word)}` : null;
  void speakWord(word, { audioUrl, rate: opts.rate, voice_preference: getStoredVoicePreference() });

  if (opts.warm && !hasAudio && !word.includes(' ') && !warmed.has(word)) {
    warmed.add(word);
    fetch('/api/words/lookup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ word }),
    }).catch(() => {
      /* chỉ là làm nóng cache */
    });
  }
}

// ---- Phát cả câu bằng giọng neural (Edge TTS "Aria", /api/reading/tts) ----

// Cache blob URL theo (giọng, nội dung câu), dùng chung cả phiên.
const sentenceCache = new Map<string, string | 'failed'>();
const cacheKey = (text: string, voice?: string) => `${voice ?? 'default'}|${text}`;

async function fetchSentence(text: string, voice?: string): Promise<string | 'failed'> {
  const key = cacheKey(text, voice);
  const cached = sentenceCache.get(key);
  if (cached) return cached;
  try {
    const r = await fetch('/api/reading/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(voice ? { text, voice } : { text }),
    });
    if (!r.ok) throw new Error(String(r.status));
    const data = (await r.json()) as { audio: string };
    const bytes = Uint8Array.from(atob(data.audio), (c) => c.charCodeAt(0));
    const url = URL.createObjectURL(new Blob([bytes], { type: 'audio/mpeg' }));
    sentenceCache.set(key, url);
    return url;
  } catch {
    // 503 = máy chủ không tổng hợp được.
    sentenceCache.set(key, 'failed');
    return 'failed';
  }
}

/**
 * Tải SẴN mp3 của câu ngay khi câu hiện lên. Lý do: Safari chỉ cho phát âm
 * thanh nếu lệnh play() nằm ngay trong cú bấm — nếu bấm xong mới đi tải rồi
 * phát, sau độ trễ mạng Safari coi là "tự phát" và chặn. Tải trước thì lúc bấm
 * chỉ còn play() đồng bộ.
 *
 * `strict`: KHÔNG lùi về giọng trình duyệt khi tải lỗi. Bài nghe-14 so giọng
 * Anh/Úc với giọng Mỹ — tải giọng Anh lỗi mà lặng lẽ phát giọng Mỹ của trình
 * duyệt thì kết quả bài sai hoàn toàn mà không ai biết.
 */
export function useSentenceAudio(text: string, opts: { voice?: string; strict?: boolean } = {}) {
  const { voice, strict = false } = opts;
  const [ready, setReady] = useState<'loading' | 'ready' | 'failed'>('loading');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    setReady('loading');
    fetchSentence(text, voice).then((r) => {
      if (alive) setReady(r === 'failed' ? 'failed' : 'ready');
    });
    return () => {
      alive = false;
      audioRef.current?.pause();
    };
  }, [text, voice, attempt]);

  const play = useCallback(
    (rate?: number) => {
      audioRef.current?.pause();
      try {
        window.speechSynthesis?.cancel();
        window.speechSynthesis?.resume();
      } catch {
        /* ignore */
      }
      const cached = sentenceCache.get(cacheKey(text, voice));
      if (cached && cached !== 'failed') {
        const a = new Audio(cached);
        if (rate) a.playbackRate = Math.min(1.5, Math.max(0.5, rate));
        audioRef.current = a;
        a.play().catch(() => {
          if (!strict) speak(text, { rate, voice_preference: getStoredVoicePreference() });
        });
        return;
      }
      if (strict) return;
      // Chưa tải xong hoặc máy chủ lỗi → giọng trình duyệt, đọc ngay trong cú bấm.
      speak(text, { rate, voice_preference: getStoredVoicePreference() });
    },
    [text, voice, strict],
  );

  /** Thử tải lại sau khi lỗi. */
  const retry = useCallback(() => {
    sentenceCache.delete(cacheKey(text, voice));
    setAttempt((n) => n + 1);
  }, [text, voice]);

  return { ready, play, retry };
}
