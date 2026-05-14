'use client';

import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Save } from 'lucide-react';

const MIN_CHARS = 100;
const SOFT_CAP = 9000;
const HARD_CAP = 10_000;

export interface PassageFormValues {
  title: string;
  content: string;
  source_label: string;
  source_url: string;
}

interface Props {
  initialValues?: Partial<PassageFormValues>;
  /** Called on submit. Should return a Promise that resolves when the
   *  server has accepted the input. Throw to surface an error banner. */
  onSubmit: (values: PassageFormValues) => Promise<void>;
  onCancel?: () => void;
  submitLabel?: string;
  /** When true, autofocus the content textarea instead of the title. */
  contentFocus?: boolean;
}

export default function PassageForm({
  initialValues,
  onSubmit,
  onCancel,
  submitLabel = 'Tạo',
  contentFocus = false,
}: Props) {
  const [title, setTitle] = useState(initialValues?.title ?? '');
  const [content, setContent] = useState(initialValues?.content ?? '');
  const [sourceLabel, setSourceLabel] = useState(initialValues?.source_label ?? '');
  const [sourceUrl, setSourceUrl] = useState(initialValues?.source_url ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const contentRef = useRef<HTMLTextAreaElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (contentFocus) contentRef.current?.focus();
    else titleRef.current?.focus();
  }, [contentFocus]);

  const trimmed = content.trim();
  const charCount = content.length;
  const wordCount = trimmed.length === 0 ? 0 : (trimmed.match(/\S+/g) ?? []).length;
  const canSubmit = trimmed.length >= MIN_CHARS && trimmed.length <= HARD_CAP && !submitting;

  let charColor: string = 'var(--v-muted)';
  if (charCount > HARD_CAP) charColor = 'var(--v-red)';
  else if (charCount > SOFT_CAP) charColor = 'var(--v-orange)';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError('');
    try {
      await onSubmit({
        title: title.trim(),
        content: trimmed,
        source_label: sourceLabel.trim(),
        source_url: sourceUrl.trim(),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi không xác định.');
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        background: 'var(--v-panel)',
        border: '1px solid var(--v-border)',
        borderRadius: 'var(--v-radius-md)',
        padding: 18,
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
      }}
    >
      <Field label="Tiêu đề">
        <input
          ref={titleRef}
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Tự lấy 60 ký tự đầu nếu bỏ trống"
          maxLength={200}
          style={inputStyle}
        />
      </Field>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Field label="Nguồn (tuỳ chọn)">
          <input
            type="text"
            value={sourceLabel}
            onChange={(e) => setSourceLabel(e.target.value)}
            placeholder="VD: BBC, Economist…"
            maxLength={200}
            style={inputStyle}
          />
        </Field>
        <Field label="Link nguồn (tuỳ chọn)">
          <input
            type="url"
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
            placeholder="https://…"
            style={inputStyle}
          />
        </Field>
      </div>

      <Field label="Nội dung">
        <textarea
          ref={contentRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={`Paste đoạn văn tiếng Anh ở đây (tối thiểu ${MIN_CHARS} ký tự)…`}
          rows={15}
          style={{
            ...inputStyle,
            fontFamily: 'var(--v-font-body)',
            lineHeight: 1.55,
            resize: 'vertical',
            minHeight: 260,
          }}
        />
      </Field>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          fontSize: 'var(--v-text-xs)',
          color: 'var(--v-muted)',
          fontFamily: 'var(--v-font-body)',
        }}
      >
        <div>{wordCount} từ</div>
        <div style={{ color: charColor, fontWeight: 700 }}>
          {charCount.toLocaleString('vi-VN')} / {HARD_CAP.toLocaleString('vi-VN')} ký tự
        </div>
      </div>

      {error && (
        <div
          style={{
            padding: '10px 14px',
            background: 'rgba(255,87,87,0.08)',
            border: '1px solid rgba(255,87,87,0.30)',
            borderRadius: 'var(--v-radius-sm)',
            color: 'var(--v-red)',
            fontSize: 'var(--v-text-sm)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <AlertTriangle size={16} /> {error}
        </div>
      )}

      <div
        style={{
          display: 'flex',
          gap: 8,
          justifyContent: 'flex-end',
          flexWrap: 'wrap',
        }}
      >
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            style={secondaryBtn}
          >
            Huỷ
          </button>
        )}
        <button
          type="submit"
          disabled={!canSubmit}
          style={{
            ...primaryBtn,
            background: canSubmit ? 'var(--v-primary)' : 'var(--v-muted)',
            opacity: canSubmit ? 1 : 0.6,
            cursor: canSubmit ? 'pointer' : 'not-allowed',
          }}
        >
          <Save size={14} /> {submitting ? 'Đang lưu…' : submitLabel}
        </button>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span
        style={{
          fontFamily: 'var(--v-font-body)',
          fontSize: 'var(--v-text-xs)',
          fontWeight: 800,
          color: 'var(--v-muted)',
          textTransform: 'uppercase',
          letterSpacing: 'var(--v-tracking-wider)',
        }}
      >
        {label}
      </span>
      {children}
    </label>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 'var(--v-radius-sm)',
  border: '1px solid var(--v-border)',
  background: 'var(--v-bg)',
  color: 'var(--v-ink)',
  fontFamily: 'var(--v-font-body)',
  fontSize: 'var(--v-text-md)',
  outline: 'none',
  boxSizing: 'border-box',
};

const primaryBtn: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '10px 18px',
  borderRadius: 'var(--v-radius-md)',
  border: 'none',
  color: '#fff',
  fontFamily: 'var(--v-font-body)',
  fontWeight: 800,
  fontSize: 'var(--v-text-md)',
  boxShadow: 'var(--v-shadow-sm)',
};

const secondaryBtn: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '10px 16px',
  borderRadius: 'var(--v-radius-md)',
  border: '1px solid var(--v-border)',
  background: 'var(--v-surface)',
  color: 'var(--v-ink)',
  fontFamily: 'var(--v-font-body)',
  fontWeight: 700,
  fontSize: 'var(--v-text-md)',
  cursor: 'pointer',
};
