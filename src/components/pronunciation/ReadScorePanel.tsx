'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Volume2, Circle, Square, Play, RefreshCw } from 'lucide-react';
import type { Sound } from '@/lib/pronunciation/catalog-meta';
import { speakWord, getStoredVoicePreference, getStoredWordTtsRate } from '@/lib/tts';

/**
 * Read a word, record your own voice, and play it back A/B against the model
 * TTS. Recording stays in memory (blob URL, revoked on re-record / unmount) —
 * NOTHING is uploaded or saved.
 */
export default function ReadScorePanel({ sound }: { sound: Sound }) {
  const [targetIdx, setTargetIdx] = useState(0);
  const [recording, setRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [unsupported, setUnsupported] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const urlRef = useRef<string | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);

  const target = sound.examples[targetIdx] ?? sound.examples[0];

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (typeof MediaRecorder === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setUnsupported(true);
    }
  }, []);

  const cleanupStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    return () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      cleanupStream();
    };
  }, [cleanupStream]);

  const playModel = useCallback(() => {
    void speakWord(target?.word ?? '', {
      lang: 'en-US',
      rate: getStoredWordTtsRate(),
      voice_preference: getStoredVoicePreference(),
    });
  }, [target]);

  const startRecording = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const rec = new MediaRecorder(stream);
      rec.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || 'audio/webm' });
        if (urlRef.current) URL.revokeObjectURL(urlRef.current);
        const url = URL.createObjectURL(blob);
        urlRef.current = url;
        setAudioUrl(url);
        cleanupStream();
      };
      recorderRef.current = rec;
      rec.start();
      setRecording(true);
    } catch (err) {
      const name = err instanceof DOMException ? err.name : '';
      setError(
        name === 'NotAllowedError'
          ? 'Mình cần quyền micro. Hãy bật quyền trong trình duyệt rồi thử lại.'
          : 'Không truy cập được micro. Thử lại nhé.',
      );
      cleanupStream();
    }
  }, [cleanupStream]);

  const stopRecording = useCallback(() => {
    try { recorderRef.current?.stop(); } catch {/* noop */}
    setRecording(false);
  }, []);

  const playMine = useCallback(() => {
    audioElRef.current?.play().catch(() => {});
  }, []);

  const nextWord = useCallback(() => {
    setTargetIdx((i) => (i + 1) % Math.max(1, sound.examples.length));
  }, [sound.examples.length]);

  return (
    <div>
      {/* Target word */}
      <div style={{ textAlign: 'center', marginBottom: 12 }}>
        <div
          style={{
            fontFamily: 'var(--v-font-head)',
            fontWeight: 900,
            fontSize: 'var(--v-text-3xl)',
            color: 'var(--v-ink)',
          }}
        >
          {target?.word}
        </div>
        <div style={{ fontFamily: 'var(--v-font-mono)', color: 'var(--v-accent)', fontSize: 'var(--v-text-md)' }}>
          {target?.ipa}
        </div>
      </div>

      <p style={{ margin: '0 0 12px', color: 'var(--v-muted)', fontSize: 'var(--v-text-sm)', textAlign: 'center' }}>
        Nghe mẫu → ghi âm giọng bạn → nghe lại để tự so. Ghi âm chỉ ở trên máy bạn, mình không lưu.
      </p>

      {error && (
        <div
          style={{
            padding: '8px 12px',
            background: 'rgba(255,87,87,0.08)',
            border: '1px solid rgba(255,87,87,0.25)',
            borderRadius: 'var(--v-radius-md)',
            color: 'var(--v-red)',
            fontSize: 'var(--v-text-sm)',
            marginBottom: 10,
          }}
        >
          {error}
        </div>
      )}

      {unsupported && (
        <div
          style={{
            padding: '8px 12px',
            background: 'var(--v-panel)',
            border: '1px solid var(--v-border)',
            borderRadius: 'var(--v-radius-md)',
            color: 'var(--v-muted)',
            fontSize: 'var(--v-text-sm)',
            marginBottom: 10,
          }}
        >
          Trình duyệt này chưa hỗ trợ ghi âm. Bạn vẫn nghe mẫu được bình thường.
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
        <button type="button" onClick={playModel} style={btn('var(--v-blue)')}>
          <Volume2 size={16} /> Nghe mẫu
        </button>

        {!recording ? (
          <button type="button" onClick={startRecording} disabled={unsupported} style={{ ...btn('var(--v-red)'), opacity: unsupported ? 0.5 : 1 }}>
            <Circle size={14} fill="#fff" /> Ghi âm
          </button>
        ) : (
          <button type="button" onClick={stopRecording} style={btn('var(--v-ink)')}>
            <Square size={14} fill="#fff" /> Dừng
          </button>
        )}

        <button type="button" onClick={playMine} disabled={!audioUrl} style={{ ...btn('var(--v-teal)'), opacity: audioUrl ? 1 : 0.5 }}>
          <Play size={15} /> Nghe lại
        </button>

        <button type="button" onClick={nextWord} style={btn('var(--v-surface)', true)}>
          <RefreshCw size={16} /> Từ khác
        </button>
      </div>

      <audio ref={audioElRef} src={audioUrl ?? undefined} preload="auto" />
    </div>
  );
}

function btn(color: string, subtle = false): React.CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '10px 16px',
    background: subtle ? 'var(--v-surface)' : color,
    color: subtle ? 'var(--v-ink-soft)' : '#fff',
    border: subtle ? '1px solid var(--v-border)' : 'none',
    borderRadius: 'var(--v-radius-md)',
    fontFamily: 'var(--v-font-head)',
    fontWeight: 800,
    fontSize: 'var(--v-text-sm)',
    cursor: 'pointer',
    boxShadow: subtle ? 'none' : 'var(--v-shadow-sm)',
  };
}
