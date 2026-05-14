'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Send, AlertTriangle } from 'lucide-react';
import Mascot from '@/components/common/Mascot';
import type { Composition, Flashcard, CompositionSource } from '@/lib/types';

interface EditorPool {
  source: CompositionSource;
  source_deck_id: number | null;
  words: Flashcard[];
}

interface Props {
  pool: EditorPool;
  initialContent?: string;
  onSubmitted: (composition: Composition) => void;
  onCancel: () => void;
}

const MIN_CHARS = 20;
const SOFT_CAP = 2500;
const HARD_CAP = 3000;

export default function ComposeEditor({
  pool,
  initialContent = '',
  onSubmitted,
  onCancel,
}: Props) {
  const [text, setText] = useState(initialContent);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const trimmed = text.trim();
  const charCount = text.length;
  const wordCount = trimmed.length === 0 ? 0 : trimmed.split(/\s+/).length;
  const canSubmit = trimmed.length >= MIN_CHARS && !submitting;

  let charColor: string = 'var(--v-muted)';
  if (charCount > HARD_CAP) charColor = 'var(--v-red)';
  else if (charCount > SOFT_CAP) charColor = 'var(--v-orange)';

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/compose/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: pool.source,
          source_deck_id: pool.source_deck_id,
          pool_word_ids: pool.words.map((w) => w.id),
          content: trimmed,
        }),
      });
      if (!res.ok) {
        const errBody = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(errBody.error ?? 'AI lỗi');
      }
      const data = (await res.json()) as { composition: Composition };
      onSubmitted(data.composition);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lỗi không xác định');
      setSubmitting(false);
    }
  }

  if (submitting) {
    return (
      <div
        style={{
          background: 'var(--v-panel)',
          border: '1px solid var(--v-border)',
          borderRadius: 'var(--v-radius-md)',
          boxShadow: 'var(--v-shadow-sm)',
          padding: 48,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 16,
        }}
      >
        <Mascot pose="idle" size={96} bob />
        <div
          style={{
            fontFamily: 'var(--v-font-head)',
            fontSize: 'var(--v-text-lg)',
            fontWeight: 800,
            color: 'var(--v-ink)',
          }}
        >
          Bún đang đọc bài của bạn…
        </div>
        <div style={{ color: 'var(--v-muted)', fontSize: 'var(--v-text-sm)' }}>
          Mất khoảng 5–10 giây nha.
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Pool chips */}
      <div
        style={{
          background: 'var(--v-panel)',
          border: '1px solid var(--v-border)',
          borderRadius: 'var(--v-radius-md)',
          padding: 14,
          marginBottom: 16,
        }}
      >
        <div
          style={{
            fontFamily: 'var(--v-font-body)',
            fontWeight: 700,
            fontSize: 'var(--v-text-sm)',
            color: 'var(--v-muted)',
            marginBottom: 8,
            textTransform: 'uppercase',
            letterSpacing: 'var(--v-tracking-wider)',
          }}
        >
          Pool từ vựng ({pool.words.length})
        </div>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 6,
            maxHeight: 140,
            overflowY: 'auto',
          }}
        >
          {pool.words.map((w) => (
            <span
              key={w.id}
              style={{
                display: 'inline-flex',
                alignItems: 'baseline',
                gap: 6,
                padding: '5px 10px',
                borderRadius: 999,
                border: '1px solid var(--v-border)',
                background: 'var(--v-surface)',
                color: 'var(--v-ink)',
                fontFamily: 'var(--v-font-body)',
                fontSize: 'var(--v-text-sm)',
                fontWeight: 700,
              }}
            >
              {w.english}
              <span style={{ opacity: 0.7, fontWeight: 500, fontSize: 'var(--v-text-xs)' }}>
                {w.vietnamese}
              </span>
            </span>
          ))}
        </div>
      </div>

      {/* Textarea */}
      <div
        style={{
          background: 'var(--v-panel)',
          border: '1px solid var(--v-border)',
          borderRadius: 'var(--v-radius-md)',
          padding: 14,
        }}
      >
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Viết một đoạn ngắn (tối thiểu 20 ký tự) sử dụng các từ ở trên…"
          rows={12}
          style={{
            width: '100%',
            padding: '12px 14px',
            borderRadius: 'var(--v-radius-sm)',
            border: '1px solid var(--v-border)',
            background: 'var(--v-bg)',
            color: 'var(--v-ink)',
            fontFamily: 'var(--v-font-body)',
            fontSize: 'var(--v-text-md)',
            lineHeight: 1.55,
            resize: 'vertical',
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />

        <div
          style={{
            marginTop: 6,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: 'var(--v-text-xs)',
            color: 'var(--v-muted)',
            fontFamily: 'var(--v-font-body)',
          }}
        >
          <div>{wordCount} từ</div>
          <div style={{ color: charColor, fontWeight: 700 }}>
            {charCount} / {HARD_CAP}
          </div>
        </div>

        <div
          style={{
            marginTop: 12,
            padding: '8px 12px',
            background: 'var(--v-bg)',
            border: '1px dashed var(--v-border)',
            borderRadius: 'var(--v-radius-sm)',
            color: 'var(--v-muted)',
            fontSize: 'var(--v-text-sm)',
            fontFamily: 'var(--v-font-body)',
          }}
        >
          💡 Có thể trộn tiếng Việt và tiếng Anh — Bún chấp nhận code-switching nếu hợp lý.
        </div>

        {error && (
          <div
            style={{
              marginTop: 12,
              padding: '10px 14px',
              background: 'rgba(255,87,87,0.08)',
              border: '1px solid rgba(255,87,87,0.30)',
              borderRadius: 'var(--v-radius-sm)',
              color: 'var(--v-red)',
              fontSize: 'var(--v-text-sm)',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              justifyContent: 'space-between',
            }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <AlertTriangle size={16} /> {error}
            </span>
            <button
              type="button"
              onClick={handleSubmit}
              style={{
                padding: '5px 12px',
                borderRadius: 'var(--v-radius-sm)',
                border: '1px solid var(--v-red)',
                background: 'transparent',
                color: 'var(--v-red)',
                fontWeight: 700,
                cursor: 'pointer',
                fontSize: 'var(--v-text-xs)',
              }}
            >
              Thử lại
            </button>
          </div>
        )}

        <div
          style={{
            marginTop: 14,
            display: 'flex',
            gap: 8,
            justifyContent: 'flex-end',
            flexWrap: 'wrap',
          }}
        >
          <button
            type="button"
            onClick={onCancel}
            style={{
              padding: '10px 16px',
              borderRadius: 'var(--v-radius-md)',
              border: '1px solid var(--v-border)',
              background: 'var(--v-surface)',
              color: 'var(--v-ink)',
              fontFamily: 'var(--v-font-body)',
              fontWeight: 700,
              fontSize: 'var(--v-text-md)',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <ArrowLeft size={14} /> Quay lại pool
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            style={{
              padding: '10px 18px',
              borderRadius: 'var(--v-radius-md)',
              border: 'none',
              background: canSubmit ? 'var(--v-primary)' : 'var(--v-muted)',
              color: '#fff',
              fontFamily: 'var(--v-font-body)',
              fontWeight: 800,
              fontSize: 'var(--v-text-md)',
              cursor: canSubmit ? 'pointer' : 'not-allowed',
              boxShadow: canSubmit ? 'var(--v-shadow-sm)' : 'none',
              opacity: canSubmit ? 1 : 0.6,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Send size={14} /> Gửi cho AI chấm
          </button>
        </div>
      </div>
    </div>
  );
}
