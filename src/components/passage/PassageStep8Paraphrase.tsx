'use client';

import { useEffect, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import LoadingState from '@/components/common/LoadingState';
import { FeedbackSection } from '@/components/common/FeedbackSection';
import type { ParaphraseFeedback, Passage, PassageAttempt } from '@/lib/types';

interface Props {
  passage: Passage;
}

type Phase = 'writing' | 'submitting' | 'feedback' | 'error';

export default function PassageStep8Paraphrase({ passage }: Props) {
  const [text, setText] = useState('');
  const [phase, setPhase] = useState<Phase>('writing');
  const [feedback, setFeedback] = useState<ParaphraseFeedback | null>(null);
  const [tips, setTips] = useState<string[] | null>(passage.paraphrase_tips);
  const [error, setError] = useState('');

  // If pre-fetch hasn't filled the cache (or it's missing), fire on mount.
  // Same idempotent route as the pre-fetch — second call hits the cache.
  useEffect(() => {
    if (tips && tips.length > 0) return;
    void fetch(`/api/passages/${passage.id}/paraphrase-tips`, { method: 'POST' })
      .then((r) => (r.ok ? (r.json() as Promise<{ tips: string[] }>) : null))
      .then((d) => {
        if (d?.tips && d.tips.length > 0) setTips(d.tips);
      })
      .catch(() => {});
  }, [passage.id, tips]);

  async function handleSubmit() {
    const trimmed = text.trim();
    if (trimmed.length < 20) return;
    setPhase('submitting');
    setError('');
    try {
      const res = await fetch(`/api/passages/${passage.id}/paraphrase-grade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_input: trimmed }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? 'AI lỗi');
      }
      const data = (await res.json()) as { attempt: PassageAttempt; feedback: ParaphraseFeedback };
      setFeedback(data.feedback);
      setPhase('feedback');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lỗi');
      setPhase('error');
    }
  }

  function resetToWriting() {
    setText('');
    setFeedback(null);
    setPhase('writing');
  }

  if (phase === 'submitting') {
    return <LoadingState message="Bún đang chấm bài… (~5s)" />;
  }

  if (phase === 'error') {
    return (
      <div style={{ textAlign: 'center', padding: 24 }}>
        <p style={{ color: 'var(--v-red)', marginBottom: 12, fontFamily: 'var(--v-font-body)' }}>{error}</p>
        <button
          type="button"
          onClick={handleSubmit}
          style={{
            padding: '8px 18px',
            borderRadius: 'var(--v-radius-md)',
            background: 'var(--v-primary)',
            color: '#fff',
            border: 'none',
            fontFamily: 'var(--v-font-head)',
            fontWeight: 800,
            cursor: 'pointer',
          }}
        >
          Thử lại
        </button>
      </div>
    );
  }

  if (phase === 'feedback' && feedback) {
    return <ParaphraseFeedbackView feedback={feedback} userText={text} onRetry={resetToWriting} />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {tips && tips.length > 0 && <TipsPanel tips={tips} />}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div
          style={{
            background: 'var(--v-panel)',
            padding: 16,
            borderRadius: 'var(--v-radius-md)',
            maxHeight: 500,
            overflow: 'auto',
            lineHeight: 1.6,
          }}
        >
          <div
            style={{
              fontSize: 'var(--v-text-xs)',
              color: 'var(--v-ink-soft)',
              marginBottom: 8,
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: 'var(--v-tracking-wider)',
            }}
          >
            Đoạn gốc
          </div>
          <div style={{ whiteSpace: 'pre-wrap', fontSize: 'var(--v-text-base)' }}>{passage.content}</div>
        </div>
        <div>
          <div
            style={{
              fontSize: 'var(--v-text-xs)',
              color: 'var(--v-ink-soft)',
              marginBottom: 8,
              fontStyle: 'italic',
            }}
          >
            💡 Dùng từ + cấu trúc của riêng bạn. Đừng copy y nguyên — Bún sẽ trừ điểm Vocabulary.
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Viết lại đoạn này bằng tiếng Anh…"
            autoFocus
            style={{
              width: '100%',
              minHeight: 300,
              padding: 12,
              borderRadius: 'var(--v-radius-md)',
              border: '1.5px solid var(--v-border)',
              fontSize: 'var(--v-text-base)',
              fontFamily: 'var(--v-font-body)',
              resize: 'vertical',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: 10,
              fontSize: 'var(--v-text-sm)',
              color: 'var(--v-ink-soft)',
            }}
          >
            <span>{text.length} ký tự</span>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={text.trim().length < 20}
              style={{
                padding: '10px 20px',
                borderRadius: 'var(--v-radius-md)',
                background: text.trim().length < 20 ? 'var(--v-muted)' : 'var(--v-primary)',
                color: '#fff',
                border: 'none',
                boxShadow: text.trim().length < 20 ? 'none' : 'var(--v-press), 0 6px 14px rgba(122,193,67,0.4)',
                fontFamily: 'var(--v-font-head)',
                fontWeight: 900,
                fontSize: 'var(--v-text-md)',
                cursor: text.trim().length < 20 ? 'not-allowed' : 'pointer',
              }}
            >
              Gửi cho Bún chấm
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function TipsPanel({ tips }: { tips: string[] }) {
  const [open, setOpen] = useState(true);
  return (
    <div
      style={{
        background: 'var(--v-primary-soft)',
        border: '1px solid rgba(122,193,67,0.3)',
        borderRadius: 'var(--v-radius-md)',
        padding: '10px 14px',
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          width: '100%',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          padding: 0,
          fontFamily: 'var(--v-font-head)',
          fontWeight: 800,
          fontSize: 'var(--v-text-md)',
          color: 'var(--v-primary-deep)',
          textAlign: 'left',
        }}
      >
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        💡 Gợi ý từ Bún
      </button>
      {open && (
        <ul
          style={{
            margin: '8px 0 0',
            paddingLeft: 22,
            fontSize: 'var(--v-text-sm)',
            color: 'var(--v-ink-soft)',
          }}
        >
          {tips.map((t, i) => (
            <li key={i} style={{ marginBottom: 4 }}>{t}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ParaphraseFeedbackView({
  feedback, userText, onRetry,
}: {
  feedback: ParaphraseFeedback;
  userText: string;
  onRetry: () => void;
}) {
  const scoreColor =
    feedback.overall_score >= 70 ? 'var(--v-primary)'
    : feedback.overall_score >= 50 ? 'var(--v-orange)'
    : 'var(--v-red)';

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 16 }}>
      <div>
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <div
            style={{
              fontSize: 56,
              fontWeight: 900,
              color: scoreColor,
              fontFamily: 'var(--v-font-head)',
              lineHeight: 1,
            }}
          >
            {feedback.overall_score}
            <span style={{ fontSize: 24, color: 'var(--v-muted)' }}>/100</span>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 6,
              fontSize: 'var(--v-text-sm)',
              color: 'var(--v-ink-soft)',
              marginTop: 10,
            }}
          >
            <SubScore label="Ý" value={feedback.meaning_preserved} />
            <SubScore label="Ngữ pháp" value={feedback.grammar} />
            <SubScore label="Từ vựng" value={feedback.vocabulary} />
            <SubScore label="Tự nhiên" value={feedback.naturalness} />
          </div>
        </div>
        <div
          style={{
            background: 'var(--v-panel)',
            padding: 12,
            borderRadius: 'var(--v-radius-md)',
            fontSize: 'var(--v-text-sm)',
            fontStyle: 'italic',
            whiteSpace: 'pre-wrap',
          }}
        >
          {userText}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {feedback.issues.length > 0 && (
          <FeedbackSection title="Vấn đề cần sửa" color="var(--v-orange)">
            {feedback.issues.map((m, i) => (
              <div
                key={i}
                style={{
                  marginBottom: i === feedback.issues.length - 1 ? 0 : 8,
                  paddingBottom: i === feedback.issues.length - 1 ? 0 : 8,
                  borderBottom:
                    i === feedback.issues.length - 1 ? 'none' : '1px solid var(--v-border)',
                }}
              >
                <div style={{ fontStyle: 'italic', color: 'var(--v-ink-soft)' }}>&ldquo;{m.excerpt}&rdquo;</div>
                <div>↳ {m.problem}</div>
                <div style={{ color: 'var(--v-primary)' }}>→ {m.suggestion}</div>
              </div>
            ))}
          </FeedbackSection>
        )}
        {feedback.better_phrasings.length > 0 && (
          <FeedbackSection title="Có thể viết hay hơn" color="var(--v-blue)">
            {feedback.better_phrasings.map((p, i) => (
              <div
                key={i}
                style={{
                  marginBottom: i === feedback.better_phrasings.length - 1 ? 0 : 8,
                  paddingBottom: i === feedback.better_phrasings.length - 1 ? 0 : 8,
                  borderBottom:
                    i === feedback.better_phrasings.length - 1 ? 'none' : '1px solid var(--v-border)',
                }}
              >
                <div style={{ fontStyle: 'italic', color: 'var(--v-ink-soft)' }}>{p.original}</div>
                <div style={{ color: 'var(--v-primary)' }}>→ {p.suggested}</div>
              </div>
            ))}
          </FeedbackSection>
        )}
        <button
          type="button"
          onClick={onRetry}
          style={{
            padding: '10px 18px',
            borderRadius: 'var(--v-radius-md)',
            background: 'var(--v-panel)',
            border: '1px solid var(--v-border)',
            color: 'var(--v-ink-soft)',
            fontFamily: 'var(--v-font-head)',
            fontWeight: 800,
            fontSize: 'var(--v-text-md)',
            cursor: 'pointer',
            marginTop: 4,
          }}
        >
          Viết lại
        </button>
      </div>
    </div>
  );
}

function SubScore({ label, value }: { label: string; value: number }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 4,
        padding: '4px 8px',
        background: 'var(--v-panel)',
        borderRadius: 'var(--v-radius-sm)',
      }}
    >
      <span>{label}</span>
      <strong>{value}</strong>
    </span>
  );
}
