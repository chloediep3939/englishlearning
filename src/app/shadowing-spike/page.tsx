'use client';

// ⚠️ SPIKE S0 — trang thử nghiệm BỎ ĐI ĐƯỢC. Không có trong nav; mở tay tại
// /shadowing-spike. Trả lời:
//   S0.1 — SpeechRecognition chạy SONG SONG với MediaRecorder không?
//   S0.2 — mở trang này trên Safari iOS xem webkitSpeechRecognition có chạy?
//   S0.3/S0.4 — nút "Gửi Azure chấm" đẩy bản ghi sang /api/shadowing/spike-assess.
// Ghi kết quả quan sát vào src/doc/shadowing-spike-notes.md.

import { useRef, useState } from 'react';

// Kiểu tối thiểu cho Web Speech API (không có sẵn trong lib DOM của TS).
type RecognitionResult = ArrayLike<{ transcript: string }> & { isFinal: boolean };
interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<RecognitionResult>;
}
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: unknown) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}
type RecognitionCtor = new () => SpeechRecognitionLike;

function getRecognitionCtor(): RecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: RecognitionCtor;
    webkitSpeechRecognition?: RecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

function pickMime(): string {
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/aac'];
  const MR = typeof window !== 'undefined' ? window.MediaRecorder : undefined;
  if (MR && typeof MR.isTypeSupported === 'function') {
    for (const c of candidates) if (MR.isTypeSupported(c)) return c;
  }
  return '';
}

export default function ShadowingSpikePage() {
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interim, setInterim] = useState('');
  const [logs, setLogs] = useState<string[]>([]);
  const [blobInfo, setBlobInfo] = useState<{ type: string; bytes: number } | null>(null);
  const [refText, setRefText] = useState('I want to pick it up.');
  const [azureResult, setAzureResult] = useState<string>('');
  const [sttSupported] = useState(() => getRecognitionCtor() !== null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const blobRef = useRef<Blob | null>(null);

  const log = (m: string) => setLogs((prev) => [...prev, `${new Date().toISOString().slice(11, 19)}  ${m}`]);

  async function start() {
    setTranscript('');
    setInterim('');
    setAzureResult('');
    setBlobInfo(null);
    blobRef.current = null;
    chunksRef.current = [];

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e) {
      log(`getUserMedia FAIL: ${String(e)}`);
      return;
    }
    streamRef.current = stream;

    // MediaRecorder
    const mime = pickMime();
    log(`MediaRecorder mime chọn: "${mime || '(default)'}"`);
    try {
      const rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      rec.ondataavailable = (ev) => {
        if (ev.data.size > 0) chunksRef.current.push(ev.data);
      };
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: chunksRef.current[0]?.type || mime || 'audio/webm' });
        blobRef.current = blob;
        setBlobInfo({ type: blob.type, bytes: blob.size });
        log(`MediaRecorder stop → blob ${blob.size} bytes, type "${blob.type}"`);
      };
      rec.start();
      recorderRef.current = rec;
      log('MediaRecorder start OK');
    } catch (e) {
      log(`MediaRecorder FAIL: ${String(e)}`);
    }

    // SpeechRecognition song song
    const Ctor = getRecognitionCtor();
    if (!Ctor) {
      log('SpeechRecognition KHÔNG hỗ trợ trên trình duyệt này (S0.2 note).');
    } else {
      try {
        const rec = new Ctor();
        rec.lang = 'en-US';
        rec.continuous = true;
        rec.interimResults = true;
        rec.onresult = (e) => {
          let finalTxt = '';
          let interimTxt = '';
          for (let i = e.resultIndex; i < e.results.length; i++) {
            const r = e.results[i];
            const t = r[0]?.transcript ?? '';
            if (r.isFinal) finalTxt += t;
            else interimTxt += t;
          }
          if (finalTxt) setTranscript((prev) => (prev + ' ' + finalTxt).trim());
          setInterim(interimTxt);
        };
        rec.onerror = (ev) => log(`SpeechRecognition error: ${JSON.stringify(ev)}`);
        rec.onend = () => log('SpeechRecognition onend');
        rec.start();
        recognitionRef.current = rec;
        log('SpeechRecognition start OK (song song với MediaRecorder)');
      } catch (e) {
        log(`SpeechRecognition FAIL: ${String(e)}`);
      }
    }

    setRecording(true);
  }

  function stop() {
    try {
      recorderRef.current?.stop();
    } catch (e) {
      log(`recorder.stop lỗi: ${String(e)}`);
    }
    try {
      recognitionRef.current?.stop();
    } catch {
      /* ignore */
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    setRecording(false);
    setInterim('');
  }

  async function sendToAzure() {
    const blob = blobRef.current;
    if (!blob) {
      log('Chưa có bản ghi để gửi.');
      return;
    }
    setAzureResult('… đang gửi Azure');
    try {
      const res = await fetch(
        `/api/shadowing/spike-assess?text=${encodeURIComponent(refText)}&lang=en-US`,
        { method: 'POST', headers: { 'Content-Type': blob.type || 'audio/webm' }, body: blob }
      );
      const json = await res.json();
      setAzureResult(JSON.stringify(json, null, 2));
      log(`Azure spike HTTP ${res.status}`);
    } catch (e) {
      setAzureResult(`Lỗi gửi: ${String(e)}`);
    }
  }

  const wordCount = transcript ? transcript.split(/\s+/).filter(Boolean).length : 0;

  return (
    <div style={{ width: '100%', maxWidth: 760 }}>
      <h1 style={{ fontFamily: 'var(--v-font-head)', fontWeight: 900, color: 'var(--v-ink)' }}>
        Shadowing spike (S0) — bỏ đi được
      </h1>
      <p style={{ color: 'var(--v-ink-soft)', fontSize: 'var(--v-text-sm)' }}>
        SpeechRecognition hỗ trợ: <b>{sttSupported ? 'CÓ' : 'KHÔNG'}</b>. Mở trang này trên
        Safari iOS để kiểm tra S0.2.
      </p>

      <div style={{ display: 'flex', gap: 8, margin: '12px 0' }}>
        {!recording ? (
          <button className="v-btn-primary" onClick={start} style={{ padding: '8px 16px' }}>
            Bắt đầu ghi
          </button>
        ) : (
          <button className="v-btn-primary" onClick={stop} style={{ padding: '8px 16px', background: 'var(--v-red)' }}>
            Dừng
          </button>
        )}
        <button onClick={sendToAzure} disabled={recording} style={{ padding: '8px 16px' }}>
          Gửi Azure chấm (S0.3/S0.4)
        </button>
      </div>

      <div style={{ display: 'grid', gap: 8, marginBottom: 12 }}>
        <div>
          <b>STT máy nghe ({wordCount} từ):</b> {transcript}{' '}
          <span style={{ color: 'var(--v-muted)' }}>{interim}</span>
        </div>
        <div>
          <b>Bản ghi:</b>{' '}
          {blobInfo ? `${blobInfo.bytes} bytes, type "${blobInfo.type}"` : '—'}
        </div>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 'var(--v-text-sm)' }}>
          <b>Reference text (cho Azure)</b>
          <input
            value={refText}
            onChange={(e) => setRefText(e.target.value)}
            style={{ padding: 6, border: '1px solid var(--v-border)', borderRadius: 6 }}
          />
        </label>
      </div>

      {azureResult && (
        <pre
          style={{
            background: 'var(--v-surface)',
            border: '1px solid var(--v-border)',
            borderRadius: 8,
            padding: 12,
            fontSize: 12,
            overflowX: 'auto',
            maxHeight: 320,
          }}
        >
          {azureResult}
        </pre>
      )}

      <h3 style={{ marginTop: 16 }}>Log</h3>
      <pre
        style={{
          background: 'var(--v-surface)',
          border: '1px solid var(--v-border)',
          borderRadius: 8,
          padding: 12,
          fontSize: 12,
          whiteSpace: 'pre-wrap',
        }}
      >
        {logs.join('\n')}
      </pre>
    </div>
  );
}
