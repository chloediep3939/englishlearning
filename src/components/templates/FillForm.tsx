'use client';

import { useMemo, useState } from 'react';
import { ArrowLeft, Play, Save } from 'lucide-react';
import { apiJson, ApiError } from '@/lib/common/api-json';
import { extractSlots, SLOT_RE } from '@/lib/templates/slots';
import type { PteTemplate, PteTemplateFill } from '@/lib/types';

interface Props {
  template: PteTemplate;
  /** Edit mode when present: prefill and PATCH instead of POST. */
  fill?: PteTemplateFill;
  onBack: () => void;
  /** Called after a successful save. `readNow` = jump straight to karaoke. */
  onSaved: (fill: PteTemplateFill, readNow: boolean) => void;
}

type Segment = { kind: 'text'; text: string } | { kind: 'slot'; name: string };

/** Split the frame into text/slot segments for the live preview. */
function segmentFrame(frame: string): Segment[] {
  const out: Segment[] = [];
  let last = 0;
  for (const m of frame.matchAll(SLOT_RE)) {
    const idx = m.index ?? 0;
    if (idx > last) out.push({ kind: 'text', text: frame.slice(last, idx) });
    out.push({ kind: 'slot', name: m[1].trim() });
    last = idx + m[0].length;
  }
  if (last < frame.length) out.push({ kind: 'text', text: frame.slice(last) });
  return out;
}

export default function FillForm({ template, fill, onBack, onSaved }: Props) {
  const slots = useMemo(() => extractSlots(template.frame_text), [template.frame_text]);
  const segments = useMemo(() => segmentFrame(template.frame_text), [template.frame_text]);
  const editing = !!fill;

  const [mode, setMode] = useState<'form' | 'paste'>(
    fill && !fill.slot_values ? 'paste' : 'form',
  );
  const [topic, setTopic] = useState(fill?.topic ?? '');
  const [values, setValues] = useState<Record<string, string>>(fill?.slot_values ?? {});
  const [pasted, setPasted] = useState(fill && !fill.slot_values ? fill.filled_text : '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filledCount = slots.filter((s) => values[s]?.trim()).length;
  const canSave =
    !saving &&
    topic.trim().length > 0 &&
    (mode === 'form' ? filledCount === slots.length : pasted.trim().length >= 20);

  async function handleSave(readNow: boolean) {
    if (!canSave) return;
    setSaving(true);
    setError(null);
    try {
      const body =
        mode === 'form'
          ? { topic: topic.trim(), slot_values: values }
          : { topic: topic.trim(), filled_text: pasted.trim() };
      const data = await apiJson<{ fill: PteTemplateFill }>(
        editing
          ? `/api/templates/${template.id}/fills/${fill.id}`
          : `/api/templates/${template.id}/fills`,
        {
          method: editing ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        },
      );
      onSaved(data.fill, readNow);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Có lỗi xảy ra, thử lại nhé.');
      setSaving(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 11px',
    borderRadius: 'var(--v-radius-sm)',
    border: '1px solid var(--v-border)',
    background: 'var(--v-bg)',
    color: 'var(--v-ink)',
    fontFamily: 'var(--v-font-body)',
    fontSize: 'var(--v-text-sm)',
    outline: 'none',
    boxSizing: 'border-box',
  };

  const modeTab = (active: boolean): React.CSSProperties => ({
    padding: '8px 14px',
    borderRadius: 999,
    border: active ? '1px solid var(--v-purple)' : '1px solid var(--v-border)',
    background: active ? 'var(--v-purple)' : 'var(--v-surface)',
    color: active ? '#fff' : 'var(--v-ink-soft)',
    fontFamily: 'var(--v-font-head)',
    fontWeight: 800,
    fontSize: 12,
    cursor: 'pointer',
  });

  return (
    <div>
      <button
        type="button"
        onClick={onBack}
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

      <h2
        style={{
          fontFamily: 'var(--v-font-head)',
          fontWeight: 900,
          fontSize: 'var(--v-text-2xl)',
          margin: '0 0 6px',
          color: 'var(--v-ink)',
        }}
      >
        {editing ? 'Sửa bài mẫu' : 'Tự luyện với đề mới'}
      </h2>
      <p
        style={{
          color: 'var(--v-muted)',
          margin: '0 0 16px',
          fontFamily: 'var(--v-font-body)',
          fontSize: 'var(--v-text-sm)',
        }}
      >
        {editing
          ? 'Sửa nội dung rồi lưu — bài nghe sẽ cập nhật theo ngay.'
          : 'Điền ý cho một chủ đề mới rồi nghe mình đọc cả bài — hoặc dán bài đã điền sẵn từ nơi khác.'}
      </p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <button type="button" onClick={() => setMode('form')} style={modeTab(mode === 'form')}>
          Điền theo ô
        </button>
        <button type="button" onClick={() => setMode('paste')} style={modeTab(mode === 'paste')}>
          Dán bài hoàn chỉnh
        </button>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: mode === 'form' ? 'minmax(0, 1fr) minmax(0, 1fr)' : 'minmax(0, 1fr)',
          gap: 16,
          alignItems: 'start',
        }}
      >
        <div
          style={{
            background: 'var(--v-panel)',
            border: '1px solid var(--v-border)',
            borderRadius: 'var(--v-radius-md)',
            padding: 16,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          <label
            style={{
              fontFamily: 'var(--v-font-body)',
              fontSize: 'var(--v-text-xs)',
              fontWeight: 800,
              color: 'var(--v-muted)',
            }}
          >
            Chủ đề (tên bài mẫu)
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Ví dụ: Phone use in class"
              maxLength={200}
              style={{ ...inputStyle, marginTop: 4, fontWeight: 700 }}
            />
          </label>

          {mode === 'form' ? (
            <>
              {slots.map((s) => (
                <label
                  key={s}
                  style={{
                    fontFamily: 'var(--v-font-mono)',
                    fontSize: 11,
                    fontWeight: 700,
                    color: values[s]?.trim() ? 'var(--v-primary)' : 'var(--v-purple)',
                  }}
                >
                  [{s}]
                  <input
                    value={values[s] ?? ''}
                    onChange={(e) => setValues((prev) => ({ ...prev, [s]: e.target.value }))}
                    maxLength={500}
                    style={{ ...inputStyle, marginTop: 3 }}
                  />
                </label>
              ))}
              <div
                style={{
                  fontFamily: 'var(--v-font-body)',
                  fontSize: 'var(--v-text-xs)',
                  fontWeight: 700,
                  color: 'var(--v-muted)',
                }}
              >
                Đã điền {filledCount}/{slots.length} ô
              </div>
            </>
          ) : (
            <textarea
              value={pasted}
              onChange={(e) => setPasted(e.target.value)}
              placeholder="Dán bài đã điền hoàn chỉnh (giữ dấu / nếu muốn ngắt cụm đúng chỗ)…"
              rows={14}
              style={{
                ...inputStyle,
                lineHeight: 1.55,
                resize: 'vertical',
                minHeight: 220,
                fontSize: 'var(--v-text-md)',
              }}
            />
          )}
        </div>

        {mode === 'form' && (
          <div
            style={{
              background: 'var(--v-surface)',
              border: '1px solid var(--v-border)',
              borderRadius: 'var(--v-radius-md)',
              boxShadow: 'var(--v-shadow-sm)',
              padding: 16,
              position: 'sticky',
              top: 18,
            }}
          >
            <div
              style={{
                fontFamily: 'var(--v-font-body)',
                fontSize: 11,
                fontWeight: 800,
                color: 'var(--v-muted)',
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                marginBottom: 8,
              }}
            >
              Xem trước
            </div>
            <div
              style={{
                fontFamily: 'var(--v-font-body)',
                fontSize: 'var(--v-text-md)',
                lineHeight: 1.8,
                color: 'var(--v-ink)',
                whiteSpace: 'pre-wrap',
              }}
            >
              {segments.map((seg, i) => {
                if (seg.kind === 'text') return <span key={i}>{seg.text}</span>;
                const v = values[seg.name]?.trim();
                return v ? (
                  <b key={i} style={{ color: 'var(--v-primary)' }}>
                    {v}
                  </b>
                ) : (
                  <span
                    key={i}
                    style={{
                      color: 'var(--v-orange)',
                      fontFamily: 'var(--v-font-mono)',
                      fontSize: 13,
                      fontWeight: 700,
                    }}
                  >
                    [{seg.name}]
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {error && (
        <div
          style={{
            marginTop: 12,
            fontFamily: 'var(--v-font-body)',
            fontSize: 'var(--v-text-sm)',
            fontWeight: 700,
            color: 'var(--v-red)',
          }}
        >
          {error}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 14 }}>
        <button
          type="button"
          onClick={() => handleSave(false)}
          disabled={!canSave}
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
            cursor: canSave ? 'pointer' : 'not-allowed',
            opacity: canSave ? 1 : 0.5,
          }}
        >
          <Save size={15} /> {saving ? 'Đang lưu…' : editing ? 'Lưu thay đổi' : 'Lưu bài mẫu'}
        </button>
        <button
          type="button"
          onClick={() => handleSave(true)}
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
          <Play size={15} /> Lưu và đọc ngay
        </button>
      </div>
    </div>
  );
}
