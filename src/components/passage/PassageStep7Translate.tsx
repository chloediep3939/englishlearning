'use client';

import { useEffect, useState } from 'react';
import LoadingState from '@/components/common/LoadingState';
import { FeedbackSection } from '@/components/common/FeedbackSection';
import type { Passage, PassageAttempt, TranslationFeedback } from '@/lib/types';

interface Props {
  passage: Passage;
}

type Phase = 'writing' | 'submitting' | 'feedback' | 'error';

export default function PassageStep7Translate({ passage }: Props) {
  const [text, setText] = useState('');
  const [phase, setPhase] = useState<Phase>('writing');
  const [feedback, setFeedback] = useState<TranslationFeedback | null>(null);
  // The reference is pre-fetched on Step 3 and cached on the passage row.
  // Re-read it whenever this component mounts so we can show the model
  // translation alongside the learner's own attempt. Cheap (cache hit if
  // pre-fetch ran), and degrades to null silently if AI is unavailable.
  const [reference, setReference] = useState<string | null>(passage.translate_reference);
  const [error, setError] = useState('');

  useEffect(() => {
    if (reference) return;
    void fetch(`/api/passages/${passage.id}/translate-reference`, { method: 'POST' })
      .then((r) => (r.ok ? (r.json() as Promise<{ reference: string }>) : null))
      .then((d) => {
        if (d?.reference) setReference(d.reference);
      })
      .catch(() => {});
  }, [passage.id, reference]);

  async function handleSubmit() {
    const trimmed = text.trim();
    if (trimmed.length < 20) return;
    setPhase('submitting');
    setError('');
    try {
      const res = await fetch(`/api/passages/${passage.id}/translate-grade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_input: trimmed }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? 'AI lỗi');
      }
      const data = (await res.json()) as { attempt: PassageAttempt; feedback: TranslationFeedback };
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
    return (
      <TranslationFeedbackView
        feedback={feedback}
        userText={text}
        reference={reference}
        onRetry={resetToWriting}
      />
    );
  }

  // writing phase
  return (
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
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Dịch sang tiếng Việt…"
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
  );
}

function TranslationFeedbackView({
  feedback, userText, reference, onRetry,
}: {
  feedback: TranslationFeedback;
  userText: string;
  reference: string | null;
  onRetry: () => void;
}) {
  const scoreColor =
    feedback.overall_score >= 70 ? 'var(--v-primary)'
    : feedback.overall_score >= 50 ? 'var(--v-orange)'
    : 'var(--v-red)';

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 16 }}>
      {/* Left: score + user's translation */}
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
              display: 'flex',
              justifyContent: 'center',
              gap: 16,
              fontSize: 'var(--v-text-sm)',
              color: 'var(--v-ink-soft)',
              marginTop: 8,
            }}
          >
            <span>Chính xác: <strong>{feedback.accuracy_score}</strong></span>
            <span>Tự nhiên: <strong>{feedback.naturalness_score}</strong></span>
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

      {/* Right: detailed feedback sections */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {feedback.missed_meaning.length > 0 && (
          <FeedbackSection title="Ý chính bị sót" color="var(--v-orange)">
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {feedback.missed_meaning.map((m, i) => (
                <li key={i} style={{ marginBottom: 4 }}>{m}</li>
              ))}
            </ul>
          </FeedbackSection>
        )}
        {feedback.mistranslations.length > 0 && (
          <FeedbackSection title="Chỗ dịch sai" color="var(--v-red)">
            {feedback.mistranslations.map((m, i) => (
              <div
                key={i}
                style={{
                  marginBottom: i === feedback.mistranslations.length - 1 ? 0 : 8,
                  paddingBottom: i === feedback.mistranslations.length - 1 ? 0 : 8,
                  borderBottom:
                    i === feedback.mistranslations.length - 1
                      ? 'none'
                      : '1px solid var(--v-border)',
                }}
              >
                <div style={{ fontStyle: 'italic', color: 'var(--v-ink-soft)' }}>&ldquo;{m.excerpt}&rdquo;</div>
                <div>↳ {m.problem}</div>
                <div style={{ color: 'var(--v-primary)' }}>→ {m.suggestion}</div>
              </div>
            ))}
          </FeedbackSection>
        )}
        {feedback.suggested_translation && (
          <FeedbackSection title="Bản dịch của Bún" color="var(--v-primary)">
            <p style={{ margin: 0 }}>{feedback.suggested_translation}</p>
          </FeedbackSection>
        )}
        {reference && reference !== feedback.suggested_translation && (
          <FeedbackSection title="Bản dịch tham chiếu" color="var(--v-blue)">
            <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{reference}</p>
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
          Dịch lại
        </button>
      </div>
    </div>
  );
}
