'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ScrollText, Save, X } from 'lucide-react';
import { apiJson, ApiError } from '@/lib/common/api-json';
import { extractSlots } from '@/lib/templates/slots';
import type { PteTemplate } from '@/lib/types';

const MIN_CHARS = 20;
const HARD_CAP = 10_000;

interface Props {
  /** Edit mode when present; create mode otherwise. */
  template?: PteTemplate;
  /** Edit mode: called with the updated template after a successful save. */
  onDone?: (t: PteTemplate) => void;
  /** Edit mode: called when the user cancels. */
  onCancel?: () => void;
}

export default function TemplateEditor({ template, onDone, onCancel }: Props) {
  const router = useRouter();
  const editing = !!template;
  const [title, setTitle] = useState(template?.title ?? '');
  const [frame, setFrame] = useState(template?.frame_text ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmedFrame = frame.trim();
  const slots = extractSlots(trimmedFrame);
  const canSave =
    !saving &&
    title.trim().length > 0 &&
    trimmedFrame.length >= MIN_CHARS &&
    trimmedFrame.length <= HARD_CAP &&
    slots.length > 0;

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    setError(null);
    try {
      if (editing) {
        const data = await apiJson<{ template: PteTemplate }>(`/api/templates/${template.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: title.trim(), frame_text: trimmedFrame }),
        });
        onDone?.(data.template);
        router.refresh();
      } else {
        const data = await apiJson<{ template: PteTemplate }>('/api/templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: title.trim(), frame_text: trimmedFrame }),
        });
        router.push(`/templates/${data.template.id}`);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Có lỗi xảy ra, thử lại nhé.');
      setSaving(false);
    }
  }

  return (
    <div>
      {editing ? (
        <button
          type="button"
          onClick={onCancel}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            fontSize: 'var(--v-text-sm)',
            color: 'var(--v-muted)',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
            marginBottom: 12,
            fontFamily: 'inherit',
          }}
        >
          <ArrowLeft size={14} /> Quay lại
        </button>
      ) : (
        <Link
          href="/templates"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            fontSize: 'var(--v-text-sm)',
            color: 'var(--v-muted)',
            textDecoration: 'none',
            marginBottom: 12,
          }}
        >
          <ArrowLeft size={14} /> Template PTE
        </Link>
      )}

      <h1
        style={{
          fontFamily: 'var(--v-font-head)',
          fontWeight: 900,
          fontSize: 'var(--v-text-3xl)',
          letterSpacing: 'var(--v-tracking-tight)',
          margin: '0 0 6px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          color: 'var(--v-ink)',
        }}
      >
        <ScrollText size={24} style={{ color: 'var(--v-purple)' }} />
        {editing ? 'Sửa template' : 'Tạo template'}
      </h1>
      <p
        style={{
          color: 'var(--v-muted)',
          margin: '0 0 18px',
          fontFamily: 'var(--v-font-body)',
          fontSize: 'var(--v-text-md)',
        }}
      >
        Dán khung nói với chỗ trống dạng <b>[topic]</b>, <b>[N1]</b>… Chèn dấu{' '}
        <b>/</b> để ngắt cụm và <b>//</b> để kết câu — mình sẽ đọc theo đúng nhịp
        ngắt đó.
      </p>

      <div
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
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Tên template, ví dụ: Summarize Group Discussion"
          maxLength={200}
          style={{
            width: '100%',
            padding: '10px 12px',
            borderRadius: 'var(--v-radius-sm)',
            border: '1px solid var(--v-border)',
            background: 'var(--v-bg)',
            color: 'var(--v-ink)',
            fontFamily: 'var(--v-font-body)',
            fontSize: 'var(--v-text-md)',
            fontWeight: 700,
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
        <textarea
          value={frame}
          onChange={(e) => setFrame(e.target.value)}
          autoFocus={!editing}
          placeholder={`The three speakers are talking about / [topic] //\nThe first speaker starts by mentioning / that he [N1]. //\n…`}
          rows={14}
          style={{
            width: '100%',
            padding: '10px 12px',
            borderRadius: 'var(--v-radius-sm)',
            border: '1px solid var(--v-border)',
            background: 'var(--v-bg)',
            color: 'var(--v-ink)',
            fontFamily: 'var(--v-font-body)',
            fontSize: 'var(--v-text-md)',
            lineHeight: 1.55,
            outline: 'none',
            boxSizing: 'border-box',
            resize: 'vertical',
            minHeight: 240,
          }}
        />

        {slots.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
            <span
              style={{
                fontFamily: 'var(--v-font-body)',
                fontSize: 'var(--v-text-xs)',
                fontWeight: 800,
                color: 'var(--v-muted)',
              }}
            >
              {slots.length} chỗ trống:
            </span>
            {slots.map((s) => (
              <span
                key={s}
                style={{
                  padding: '2px 9px',
                  borderRadius: 999,
                  background: 'color-mix(in srgb, var(--v-purple) 14%, var(--v-surface))',
                  border: '1px solid color-mix(in srgb, var(--v-purple) 45%, transparent)',
                  color: 'var(--v-purple)',
                  fontFamily: 'var(--v-font-mono)',
                  fontSize: 11,
                  fontWeight: 700,
                }}
              >
                {s}
              </span>
            ))}
          </div>
        )}

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
            fontSize: 'var(--v-text-xs)',
            color: frame.length > HARD_CAP ? 'var(--v-red)' : 'var(--v-muted)',
            fontFamily: 'var(--v-font-body)',
          }}
        >
          <div>
            {trimmedFrame.length > 0 && slots.length === 0
              ? 'Chưa thấy chỗ trống nào — thêm [tên] vào khung nhé.'
              : ''}
          </div>
          <div style={{ fontWeight: 700 }}>
            {frame.length.toLocaleString('vi-VN')} / {HARD_CAP.toLocaleString('vi-VN')} ký tự
          </div>
        </div>

        {error && (
          <div
            style={{
              fontFamily: 'var(--v-font-body)',
              fontSize: 'var(--v-text-sm)',
              fontWeight: 700,
              color: 'var(--v-red)',
            }}
          >
            {error}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          {editing && (
            <button
              type="button"
              onClick={onCancel}
              style={{
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
              }}
            >
              <X size={15} /> Huỷ
            </button>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave}
            style={{
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
              background: canSave ? 'var(--v-purple)' : 'var(--v-muted)',
              opacity: canSave ? 1 : 0.6,
              cursor: canSave ? 'pointer' : 'not-allowed',
            }}
          >
            <Save size={15} /> {saving ? 'Đang lưu…' : 'Lưu template'}
          </button>
        </div>
      </div>
    </div>
  );
}
