'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Send, AlertTriangle, Sparkles, Check, Loader2 } from 'lucide-react';
import Mascot from '@/components/common/Mascot';
import { apiJson } from '@/lib/common/api-json';
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
  const [suggesting, setSuggesting] = useState(false);
  const [suggestError, setSuggestError] = useState<string | null>(null);
  /** Card id of the chip currently being dragged. Used to dim the source
   *  chip so the user has a visual handle on the in-flight drag. */
  const [draggingId, setDraggingId] = useState<number | null>(null);
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

  // Detect which pool words already appear in the textarea. Word-boundary
  // + optional 0-3 trailing letters catches the headword plus common
  // English inflections (run/runs/runner, advise/advised, but not "running"
  // which is 4 extra letters — acceptable trade-off; the server-side AI
  // grader is the authoritative check). The pattern explicitly avoids
  // matching subword hits like "before" when the pool word is "be".
  const usedIds = useMemo(() => {
    const used = new Set<number>();
    if (text.trim().length === 0) return used;
    for (const card of pool.words) {
      const esc = escapeRegExp(card.english);
      const re = new RegExp(`\\b${esc}\\w{0,3}\\b`, 'i');
      if (re.test(text)) used.add(card.id);
    }
    return used;
  }, [text, pool.words]);

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

  async function handleSuggest() {
    if (suggesting) return;
    if (text.trim().length > 0) {
      const ok = window.confirm(
        'Đoạn văn hiện tại sẽ bị ghi đè bằng gợi ý từ Bún. Tiếp tục?',
      );
      if (!ok) return;
    }
    setSuggesting(true);
    setSuggestError(null);
    try {
      const data = await apiJson<{ story: string }>('/api/compose/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pool_word_ids: pool.words.map((w) => w.id) }),
      });
      setText(data.story);
      // Defer focus to next tick so the new value is in the DOM first.
      setTimeout(() => textareaRef.current?.focus(), 0);
    } catch (e) {
      setSuggestError(e instanceof Error ? e.message : 'Không tạo được gợi ý.');
    } finally {
      setSuggesting(false);
    }
  }

  // ---- Drag-and-drop handlers ----

  function handleChipDragStart(e: React.DragEvent<HTMLSpanElement>, card: Flashcard) {
    e.dataTransfer.setData('text/plain', card.english);
    e.dataTransfer.effectAllowed = 'copy';
    setDraggingId(card.id);
  }

  function handleChipDragEnd() {
    setDraggingId(null);
  }

  function handleTextareaDragOver(e: React.DragEvent<HTMLTextAreaElement>) {
    // The default text-drop handler would also paste the word, but its caret
    // position is browser-dependent. Prevent default so we own the insertion.
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }

  function handleTextareaDrop(e: React.DragEvent<HTMLTextAreaElement>) {
    e.preventDefault();
    const word = e.dataTransfer.getData('text/plain');
    if (!word) return;
    const ta = textareaRef.current;
    if (!ta) {
      // Fallback: append.
      setText((prev) => (prev.length === 0 ? word + ' ' : prev.replace(/\s*$/, ' ') + word + ' '));
      return;
    }
    // Insert at the current selection (which, during a drop, has been moved
    // by the browser to the cursor's drop position).
    const start = ta.selectionStart ?? ta.value.length;
    const end = ta.selectionEnd ?? start;
    const before = text.slice(0, start);
    const after = text.slice(end);
    // Pad with a leading space if the previous char isn't whitespace, and a
    // trailing space if the next char isn't whitespace/punctuation. Keeps
    // dropped words from clobbering neighboring tokens.
    const needsLeadSpace = before.length > 0 && !/\s$/.test(before);
    const needsTrailSpace = after.length > 0 && !/^[\s.,;:!?)]/.test(after);
    const inserted = (needsLeadSpace ? ' ' : '') + word + (needsTrailSpace ? ' ' : ' ');
    const next = before + inserted + after;
    setText(next);
    // Restore cursor after the inserted run.
    const newCursor = before.length + inserted.length;
    setTimeout(() => {
      const node = textareaRef.current;
      if (!node) return;
      node.focus();
      node.setSelectionRange(newCursor, newCursor);
    }, 0);
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
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            marginBottom: 8,
          }}
        >
          <div
            style={{
              fontFamily: 'var(--v-font-body)',
              fontWeight: 700,
              fontSize: 'var(--v-text-sm)',
              color: 'var(--v-muted)',
              textTransform: 'uppercase',
              letterSpacing: 'var(--v-tracking-wider)',
            }}
          >
            Pool từ vựng ({pool.words.length}) ·{' '}
            <span style={{ color: 'var(--v-primary)' }}>
              đã dùng {usedIds.size}/{pool.words.length}
            </span>
          </div>
          <span style={{ color: 'var(--v-muted)', fontSize: 'var(--v-text-xs)' }}>
            Kéo từ vào ô viết để chèn
          </span>
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
          {pool.words.map((w) => {
            const used = usedIds.has(w.id);
            const dragging = draggingId === w.id;
            return (
              <span
                key={w.id}
                draggable
                onDragStart={(e) => handleChipDragStart(e, w)}
                onDragEnd={handleChipDragEnd}
                title={`Kéo "${w.english}" vào đoạn văn`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'baseline',
                  gap: 6,
                  padding: '5px 10px',
                  borderRadius: 999,
                  border: used
                    ? '1px solid var(--v-primary)'
                    : '1px solid var(--v-border)',
                  background: used ? 'var(--v-primary-soft)' : 'var(--v-surface)',
                  color: used ? 'var(--v-primary-deep)' : 'var(--v-ink)',
                  fontFamily: 'var(--v-font-body)',
                  fontSize: 'var(--v-text-sm)',
                  fontWeight: 700,
                  cursor: 'grab',
                  opacity: dragging ? 0.4 : 1,
                  transition: 'background 150ms var(--v-ease), opacity 100ms var(--v-ease)',
                  userSelect: 'none',
                }}
              >
                {used && (
                  <Check
                    size={11}
                    strokeWidth={3}
                    color="var(--v-primary)"
                    style={{ alignSelf: 'center' }}
                  />
                )}
                {w.english}
                <span style={{ opacity: 0.7, fontWeight: 500, fontSize: 'var(--v-text-xs)' }}>
                  {w.vietnamese}
                </span>
              </span>
            );
          })}
        </div>
      </div>

      {/* Suggest action row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginBottom: 10,
          flexWrap: 'wrap',
        }}
      >
        <button
          type="button"
          onClick={handleSuggest}
          disabled={suggesting || pool.words.length === 0}
          style={{
            padding: '8px 14px',
            borderRadius: 'var(--v-radius-md)',
            border: '1px solid var(--v-primary)',
            background: 'var(--v-primary-soft)',
            color: 'var(--v-primary-deep)',
            fontFamily: 'var(--v-font-head)',
            fontWeight: 800,
            fontSize: 'var(--v-text-sm)',
            cursor: suggesting ? 'wait' : 'pointer',
            opacity: suggesting ? 0.7 : 1,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          {suggesting ? (
            <Loader2 size={14} style={{ animation: 'v-spin 1s linear infinite' }} />
          ) : (
            <Sparkles size={14} />
          )}
          {suggesting ? 'Bún đang viết…' : 'Gợi ý câu chuyện'}
        </button>
        {suggestError && (
          <span
            style={{
              color: 'var(--v-red)',
              fontSize: 'var(--v-text-sm)',
              fontFamily: 'var(--v-font-body)',
            }}
          >
            {suggestError}
          </span>
        )}
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
          onDragOver={handleTextareaDragOver}
          onDrop={handleTextareaDrop}
          placeholder="Viết một đoạn ngắn (tối thiểu 20 ký tự) sử dụng các từ ở trên — hoặc kéo từ pool xuống đây…"
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

/** RegExp.escape isn't standard in all runtimes; do it ourselves. */
function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
