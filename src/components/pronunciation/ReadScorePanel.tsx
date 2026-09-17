'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Mic, Volume2, RefreshCw, Ear } from 'lucide-react';
import Mascot from '@/components/common/Mascot';
import type { Sound } from '@/lib/pronunciation/catalog-meta';
import { scoreReading } from '@/lib/pronounce/match';
import { speakWord, getStoredVoicePreference, getStoredWordTtsRate } from '@/lib/tts';

type Phase = 'ready' | 'listening' | 'result';

interface ScoreResult {
  score: number;
  transcripts: string[];
}

function band(score: number): { label: string; color: string; pose: 'happy' | 'idle' } {
  if (score >= 85) return { label: 'Tuyệt vời!', color: 'var(--v-primary)', pose: 'happy' };
  if (score >= 70) return { label: 'Tốt!', color: 'var(--v-blue)', pose: 'happy' };
  if (score >= 50) return { label: 'Ổn — thử lại cho khớp hơn nhé', color: 'var(--v-orange)', pose: 'idle' };
  return { label: 'Chưa khớp — nghe mẫu rồi thử lại', color: 'var(--v-red)', pose: 'idle' };
}

export default function ReadScorePanel({
  sound,
  onScored,
}: {
  sound: Sound;
  onScored: (score: number) => void;
}) {
  const [targetIdx, setTargetIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>('ready');
  const [result, setResult] = useState<ScoreResult | null>(null);
  const [unsupported, setUnsupported] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);

  const target = sound.examples[targetIdx] ?? sound.examples[0];

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const listenSafetyRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const targetRef = useRef(target?.word ?? '');
  const onScoredRef = useRef(onScored);
  useEffect(() => { targetRef.current = target?.word ?? ''; }, [target]);
  useEffect(() => { onScoredRef.current = onScored; }, [onScored]);

  // Init SpeechRecognition once (mirrors PronounceSession).
  useEffect(() => {
    const Ctor =
      (typeof window !== 'undefined' && (window.SpeechRecognition ?? window.webkitSpeechRecognition)) || null;
    if (!Ctor) {
      setUnsupported(true);
      return;
    }
    const r = new Ctor();
    r.lang = 'en-US';
    r.interimResults = false;
    r.maxAlternatives = 3;
    r.continuous = false;

    r.onresult = (event) => {
      if (listenSafetyRef.current) {
        clearTimeout(listenSafetyRef.current);
        listenSafetyRef.current = null;
      }
      const res = event.results[0];
      const alts: string[] = [];
      for (let i = 0; i < res.length && i < 3; i++) alts.push(res[i].transcript);
      const confidence = res[0]?.confidence;
      const score = scoreReading(alts, confidence, targetRef.current);
      setResult({ score, transcripts: alts });
      setPhase('result');
      onScoredRef.current(score);
    };

    r.onerror = (event) => {
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setPermissionDenied(true);
      }
      setPhase('ready');
    };

    r.onend = () => {
      setPhase((p) => (p === 'listening' ? 'ready' : p));
    };

    recognitionRef.current = r;
    return () => {
      try { r.abort(); } catch {/* noop */}
    };
  }, []);

  // Listening safety timeout — if nothing fires within 5s, return to ready.
  useEffect(() => {
    if (phase !== 'listening') return;
    listenSafetyRef.current = setTimeout(() => {
      try { recognitionRef.current?.abort(); } catch {/* noop */}
      setPhase('ready');
    }, 5000);
    return () => {
      if (listenSafetyRef.current) {
        clearTimeout(listenSafetyRef.current);
        listenSafetyRef.current = null;
      }
    };
  }, [phase]);

  const startListening = useCallback(() => {
    const r = recognitionRef.current;
    if (!r) return;
    setResult(null);
    setPhase('listening');
    try {
      r.start();
    } catch (err) {
      const name = err instanceof DOMException ? err.name : '';
      if (name === 'InvalidStateError') {
        try { r.abort(); } catch {/* noop */}
        window.setTimeout(() => {
          try { r.start(); } catch { setPhase('ready'); }
        }, 100);
      } else {
        setPhase('ready');
      }
    }
  }, []);

  const playModel = useCallback(() => {
    void speakWord(target?.word ?? '', {
      lang: 'en-US',
      rate: getStoredWordTtsRate(),
      voice_preference: getStoredVoicePreference(),
    });
  }, [target]);

  const nextWord = useCallback(() => {
    setResult(null);
    setPhase('ready');
    setTargetIdx((i) => (i + 1) % Math.max(1, sound.examples.length));
  }, [sound.examples.length]);

  if (unsupported) {
    return (
      <Banner>
        Trình duyệt này chưa hỗ trợ chấm phát âm bằng micro. Hãy dùng Chrome, Edge hoặc Safari mới
        nhất. Các phần khác (video, ví dụ, nghe mẫu) vẫn dùng bình thường nhé.
      </Banner>
    );
  }

  const b = result ? band(result.score) : null;

  return (
    <div>
      {permissionDenied && (
        <Banner>
          Mình cần quyền micro để chấm. Hãy bật quyền micro trong trình duyệt rồi bấm lại.
        </Banner>
      )}

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

      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 14 }}>
        <button type="button" onClick={playModel} style={btn('var(--v-blue)')}>
          <Volume2 size={16} /> Nghe mẫu
        </button>
        <button
          type="button"
          onClick={startListening}
          disabled={phase === 'listening'}
          style={btn(phase === 'listening' ? 'var(--v-red)' : 'var(--v-primary)')}
        >
          <Mic size={16} /> {phase === 'listening' ? 'Đang nghe…' : 'Chấm điểm'}
        </button>
        <button type="button" onClick={nextWord} style={btn('var(--v-surface)', true)}>
          <RefreshCw size={16} /> Từ khác
        </button>
      </div>

      {/* Result */}
      {phase === 'result' && result && b && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            padding: 16,
            background: 'var(--v-panel)',
            border: `1px solid var(--v-border)`,
            borderLeft: `4px solid ${b.color}`,
            borderRadius: 'var(--v-radius-md)',
          }}
        >
          <Mascot pose={b.pose} size={72} bob={b.pose === 'happy'} />
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontFamily: 'var(--v-font-body)',
                fontSize: 'var(--v-text-xs)',
                fontWeight: 800,
                color: 'var(--v-muted)',
                textTransform: 'uppercase',
                letterSpacing: 'var(--v-tracking-wider)',
              }}
            >
              Điểm khớp
            </div>
            <div
              style={{
                fontFamily: 'var(--v-font-head)',
                fontWeight: 900,
                fontSize: 'var(--v-text-3xl)',
                color: b.color,
                lineHeight: 1.1,
              }}
            >
              {result.score}
              <span style={{ fontSize: 'var(--v-text-lg)', color: 'var(--v-muted)' }}>/100</span>
            </div>
            <div style={{ fontFamily: 'var(--v-font-head)', fontWeight: 800, color: 'var(--v-ink)' }}>
              {b.label}
            </div>
            <div
              style={{
                marginTop: 6,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                color: 'var(--v-ink-soft)',
                fontSize: 'var(--v-text-sm)',
              }}
            >
              <Ear size={14} /> Máy nghe bạn nói ra:{' '}
              <b style={{ color: 'var(--v-ink)' }}>“{result.transcripts[0] ?? '…'}”</b>
            </div>
          </div>
        </div>
      )}

      <p
        style={{
          margin: '12px 0 0',
          fontSize: 'var(--v-text-xs)',
          color: 'var(--v-muted)',
          lineHeight: 1.5,
        }}
      >
        Đây là điểm máy nhận ra bạn nói giống từ mẫu tới đâu — <b>không phải</b> điểm giọng chuẩn bản
        xứ. Web Speech API chỉ nghe được bạn nói từ nào, chưa chấm được từng âm.
      </p>
    </div>
  );
}

function Banner({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        padding: '10px 14px',
        background: 'rgba(255,87,87,0.08)',
        border: '1px solid rgba(255,87,87,0.25)',
        borderRadius: 'var(--v-radius-md)',
        color: 'var(--v-red)',
        fontSize: 'var(--v-text-sm)',
        marginBottom: 12,
        lineHeight: 1.5,
      }}
    >
      {children}
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
