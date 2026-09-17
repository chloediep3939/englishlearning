'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Circle, Square, Play, Volume2 } from 'lucide-react';
import type { Sound } from '@/lib/pronunciation/catalog-meta';
import { speak, getStoredVoicePreference } from '@/lib/tts';

/**
 * Record the learner's voice with MediaRecorder and play it back A/B against
 * the model TTS. Everything stays in memory — the blob URL is created locally
 * and revoked on re-record / unmount. NOTHING is uploaded or saved.
 *
 * NOTE: this uses its OWN getUserMedia stream, separate from the Web Speech
 * scorer in ReadScorePanel. They are used one at a time (separate buttons) so
 * the two never hold the microphone simultaneously — that combo is unreliable,
 * especially on mobile.
 */
export default function ABPlayback({ sound }: { sound: Sound }) {
  const [recording, setRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [unsupported, setUnsupported] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const urlRef = useRef<string | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);

  const target = sound.examples[0]?.word ?? '';

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

  // Revoke the object URL + stop the stream on unmount.
  useEffect(() => {
    return () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      cleanupStream();
    };
  }, [cleanupStream]);

  const startRecording = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const rec = new MediaRecorder(stream);
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
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
    try {
      recorderRef.current?.stop();
    } catch {/* noop */}
    setRecording(false);
  }, []);

  const playMine = useCallback(() => {
    audioElRef.current?.play().catch(() => {});
  }, []);

  const playModel = useCallback(() => {
    speak(target, { lang: 'en-US', rate: 0.85, voice_preference: getStoredVoicePreference() });
  }, [target]);

  if (unsupported) {
    return (
      <p style={{ margin: 0, color: 'var(--v-muted)', fontSize: 'var(--v-text-sm)', lineHeight: 1.5 }}>
        Trình duyệt này chưa hỗ trợ ghi âm để nghe lại. Bạn vẫn có thể nghe mẫu và luyện bình thường.
      </p>
    );
  }

  return (
    <div>
      <p style={{ margin: '0 0 12px', color: 'var(--v-ink-soft)', fontSize: 'var(--v-text-sm)', lineHeight: 1.5 }}>
        Ghi âm giọng của bạn (thử đọc <b>{target}</b> hoặc từ bất kỳ), rồi nghe lại so với giọng mẫu.
        Ghi âm chỉ ở trên máy bạn — mình <b>không lưu</b> lại.
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

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        {!recording ? (
          <button type="button" onClick={startRecording} style={btn('var(--v-red)')}>
            <Circle size={14} fill="#fff" /> Ghi âm
          </button>
        ) : (
          <button type="button" onClick={stopRecording} style={btn('var(--v-ink)')}>
            <Square size={14} fill="#fff" /> Dừng
          </button>
        )}

        <button
          type="button"
          onClick={playMine}
          disabled={!audioUrl}
          style={{ ...btn('var(--v-teal)'), opacity: audioUrl ? 1 : 0.5 }}
        >
          <Play size={15} /> Nghe lại giọng mình
        </button>

        <button type="button" onClick={playModel} style={btn('var(--v-blue)')}>
          <Volume2 size={16} /> Nghe mẫu
        </button>
      </div>

      {/* Hidden audio element for the recorded blob. */}
      <audio ref={audioElRef} src={audioUrl ?? undefined} preload="auto" />
    </div>
  );
}

function btn(color: string): React.CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '10px 16px',
    background: color,
    color: '#fff',
    border: 'none',
    borderRadius: 'var(--v-radius-md)',
    fontFamily: 'var(--v-font-head)',
    fontWeight: 800,
    fontSize: 'var(--v-text-sm)',
    cursor: 'pointer',
    boxShadow: 'var(--v-shadow-sm)',
  };
}
