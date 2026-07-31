'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Headphones, EyeOff, PenLine, ListChecks,
  Pencil, Trash2, Play, StickyNote,
} from 'lucide-react';
import { apiJson } from '@/lib/common/api-json';
import { extractSlots, stripSlots } from '@/lib/templates/slots';
import TemplateEditor from '@/components/templates/TemplateEditor';
import TemplateKaraoke from '@/components/templates/TemplateKaraoke';
import MemorizeTrainer from '@/components/templates/MemorizeTrainer';
import FillForm from '@/components/templates/FillForm';
import SlotQuiz from '@/components/templates/SlotQuiz';
import type { PteTemplate, PteTemplateFill } from '@/lib/types';

type Mode = 'menu' | 'karaoke' | 'memorize' | 'fill' | 'quiz' | 'edit';

interface Props {
  template: PteTemplate;
  fills: PteTemplateFill[];
  initialRate: number;
  initialAuto: boolean;
  /** Gap between chunks in chunk-practice auto-read (`chunk_pause_ms` setting). */
  chunkPauseMs?: number;
}

export default function TemplateDetailClient({
  template: initialTemplate,
  fills: initialFills,
  initialRate,
  initialAuto,
  chunkPauseMs,
}: Props) {
  const router = useRouter();
  const [template, setTemplate] = useState(initialTemplate);
  const [fills, setFills] = useState(initialFills);
  const [mode, setMode] = useState<Mode>('menu');
  const [karaokeSource, setKaraokeSource] = useState<{ title: string; text: string } | null>(null);
  const [editingFill, setEditingFill] = useState<PteTemplateFill | null>(null);
  const [busy, setBusy] = useState(false);

  const slotCount = extractSlots(template.frame_text).length;

  const openFrameKaraoke = () => {
    setKaraokeSource({ title: `${template.title} — khung`, text: stripSlots(template.frame_text) });
    setMode('karaoke');
  };
  const openFillKaraoke = (fill: PteTemplateFill) => {
    setKaraokeSource({ title: fill.topic, text: fill.filled_text });
    setMode('karaoke');
  };

  const handleFillSaved = (fill: PteTemplateFill, readNow: boolean) => {
    // Replace when it's an edit, prepend when it's new.
    setFills((prev) =>
      prev.some((f) => f.id === fill.id)
        ? prev.map((f) => (f.id === fill.id ? fill : f))
        : [fill, ...prev],
    );
    setEditingFill(null);
    router.refresh();
    if (readNow) openFillKaraoke(fill);
    else setMode('menu');
  };

  async function handleDeleteFill(fill: PteTemplateFill) {
    if (!window.confirm(`Xoá bài mẫu "${fill.topic}"?`)) return;
    setBusy(true);
    try {
      await apiJson<{ ok: boolean }>(`/api/templates/${template.id}/fills/${fill.id}`, {
        method: 'DELETE',
      });
      setFills((prev) => prev.filter((f) => f.id !== fill.id));
      router.refresh();
    } catch {
      window.alert('Không xoá được, thử lại nhé.');
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteTemplate() {
    if (!window.confirm(`Xoá template "${template.title}" và toàn bộ bài mẫu của nó?`)) return;
    setBusy(true);
    try {
      await apiJson<{ ok: boolean }>(`/api/templates/${template.id}`, { method: 'DELETE' });
      router.push('/templates');
      router.refresh();
    } catch {
      window.alert('Không xoá được, thử lại nhé.');
      setBusy(false);
    }
  }

  if (mode === 'karaoke' && karaokeSource) {
    return (
      <TemplateKaraoke
        title={karaokeSource.title}
        text={karaokeSource.text}
        initialRate={initialRate}
        initialAuto={initialAuto}
        chunkPauseMs={chunkPauseMs}
        onBack={() => setMode('menu')}
      />
    );
  }
  if (mode === 'memorize') {
    return (
      <MemorizeTrainer
        frameText={template.frame_text}
        rate={initialRate}
        onBack={() => setMode('menu')}
      />
    );
  }
  if (mode === 'fill') {
    return (
      <FillForm
        template={template}
        fill={editingFill ?? undefined}
        onBack={() => {
          setEditingFill(null);
          setMode('menu');
        }}
        onSaved={handleFillSaved}
      />
    );
  }
  if (mode === 'quiz') {
    return <SlotQuiz template={template} fills={fills} onBack={() => setMode('menu')} />;
  }
  if (mode === 'edit') {
    return (
      <TemplateEditor
        template={template}
        onDone={(t) => {
          setTemplate(t);
          setMode('menu');
        }}
        onCancel={() => setMode('menu')}
      />
    );
  }

  // ── Menu ──
  const modeCards: { key: Mode | 'frame-karaoke'; icon: typeof Headphones; color: string; title: string; desc: string; onClick: () => void }[] = [
    {
      key: 'frame-karaoke',
      icon: Headphones,
      color: 'var(--v-blue)',
      title: 'Karaoke + nhắc lại',
      desc: 'Nghe giọng Aria đọc khung từng cụm, bạn lặp lại theo. Bật "Lặp cả bài" để nghe như nghe nhạc.',
      onClick: openFrameKaraoke,
    },
    {
      key: 'memorize',
      icon: EyeOff,
      color: 'var(--v-purple)',
      title: 'Học thuộc dần',
      desc: 'Ẩn dần 25% → 100% số từ, bạn tự đọc, chạm để hé từ quên — có nghe từng dòng.',
      onClick: () => setMode('memorize'),
    },
    {
      key: 'fill',
      icon: PenLine,
      color: 'var(--v-teal)',
      title: 'Tự luyện với đề mới',
      desc: 'Điền các ý cho một chủ đề mới rồi nghe mình đọc cả bài hoàn chỉnh.',
      onClick: () => {
        setEditingFill(null);
        setMode('fill');
      },
    },
    {
      key: 'quiz',
      icon: ListChecks,
      color: 'var(--v-orange)',
      title: 'Quiz điền slot',
      desc: 'Khung hiện sẵn, bạn gõ lại nội dung từng ô của một bài mẫu từ trí nhớ.',
      onClick: () => setMode('quiz'),
    },
  ];

  return (
    <div>
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

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 4 }}>
        <h1
          style={{
            fontFamily: 'var(--v-font-head)',
            fontWeight: 900,
            fontSize: 'var(--v-text-3xl)',
            letterSpacing: 'var(--v-tracking-tight)',
            margin: 0,
            color: 'var(--v-ink)',
          }}
        >
          {template.title}
        </h1>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          <button
            type="button"
            onClick={() => setMode('edit')}
            title="Sửa template"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 13px',
              borderRadius: 'var(--v-radius-md)',
              border: '1px solid var(--v-border)',
              background: 'var(--v-surface)',
              color: 'var(--v-ink)',
              fontFamily: 'var(--v-font-body)',
              fontWeight: 700,
              fontSize: 'var(--v-text-sm)',
              cursor: 'pointer',
            }}
          >
            <Pencil size={14} /> Sửa
          </button>
          <button
            type="button"
            onClick={handleDeleteTemplate}
            disabled={busy}
            title="Xoá template"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 13px',
              borderRadius: 'var(--v-radius-md)',
              border: '1px solid color-mix(in srgb, var(--v-red) 45%, transparent)',
              background: 'var(--v-surface)',
              color: 'var(--v-red)',
              fontFamily: 'var(--v-font-body)',
              fontWeight: 700,
              fontSize: 'var(--v-text-sm)',
              cursor: busy ? 'not-allowed' : 'pointer',
            }}
          >
            <Trash2 size={14} /> Xoá
          </button>
        </div>
      </div>
      <div
        style={{
          fontFamily: 'var(--v-font-body)',
          fontSize: 'var(--v-text-sm)',
          color: 'var(--v-muted)',
          marginBottom: 18,
        }}
      >
        {slotCount} chỗ trống · {fills.length} bài mẫu
      </div>

      {/* Ghi chú của bạn — chỉ hiện khi template có note. Sửa qua nút "Sửa". */}
      {template.note && (
        <div
          style={{
            display: 'flex',
            gap: 10,
            alignItems: 'flex-start',
            padding: '12px 14px',
            marginBottom: 18,
            background: 'color-mix(in srgb, var(--v-yellow) 10%, var(--v-surface))',
            border: '1px solid color-mix(in srgb, var(--v-yellow) 40%, transparent)',
            borderRadius: 'var(--v-radius-md)',
          }}
        >
          <StickyNote
            size={15}
            style={{ color: 'var(--v-yellow-deep)', flexShrink: 0, marginTop: 2 }}
          />
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontFamily: 'var(--v-font-body)',
                fontSize: 11,
                fontWeight: 800,
                color: 'var(--v-yellow-deep)',
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                marginBottom: 3,
              }}
            >
              Ghi chú
            </div>
            <div
              style={{
                fontFamily: 'var(--v-font-body)',
                fontSize: 'var(--v-text-md)',
                color: 'var(--v-ink)',
                lineHeight: 1.55,
                whiteSpace: 'pre-wrap',
              }}
            >
              {template.note}
            </div>
          </div>
        </div>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
          gap: 12,
          marginBottom: 22,
        }}
      >
        {modeCards.map((c) => {
          const Icon = c.icon;
          return (
            <button
              key={c.key}
              type="button"
              onClick={c.onClick}
              style={{
                textAlign: 'left',
                padding: 16,
                background: 'var(--v-surface)',
                border: '1px solid var(--v-border)',
                borderRadius: 'var(--v-radius-md)',
                boxShadow: 'var(--v-shadow-sm)',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 10,
                  background: c.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon size={16} color="#fff" strokeWidth={2.4} />
              </div>
              <div style={{ fontFamily: 'var(--v-font-head)', fontWeight: 900, fontSize: 'var(--v-text-md)', color: 'var(--v-ink)' }}>
                {c.title}
              </div>
              <div style={{ fontFamily: 'var(--v-font-body)', fontSize: 'var(--v-text-xs)', color: 'var(--v-muted)', lineHeight: 1.5 }}>
                {c.desc}
              </div>
            </button>
          );
        })}
      </div>

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
        Bài mẫu ({fills.length})
      </div>
      {fills.length === 0 ? (
        <div
          style={{
            padding: 24,
            textAlign: 'center',
            background: 'var(--v-panel)',
            border: '1px dashed var(--v-border)',
            borderRadius: 'var(--v-radius-md)',
            fontFamily: 'var(--v-font-body)',
            fontSize: 'var(--v-text-sm)',
            color: 'var(--v-muted)',
          }}
        >
          Chưa có bài mẫu nào — vào &ldquo;Tự luyện với đề mới&rdquo; để tạo bài
          đầu tiên nhé.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {fills.map((f) => (
            <div
              key={f.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '11px 14px',
                background: 'var(--v-surface)',
                border: '1px solid var(--v-border)',
                borderRadius: 'var(--v-radius-md)',
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontFamily: 'var(--v-font-head)',
                    fontWeight: 800,
                    fontSize: 'var(--v-text-md)',
                    color: 'var(--v-ink)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {f.topic}
                </div>
                <div style={{ fontFamily: 'var(--v-font-body)', fontSize: 'var(--v-text-xs)', color: 'var(--v-muted)', marginTop: 1 }}>
                  {f.slot_values ? 'Điền theo ô' : 'Dán nguyên bài'} ·{' '}
                  {new Date(f.created_at).toLocaleDateString('vi-VN')}
                </div>
              </div>
              <button
                type="button"
                onClick={() => openFillKaraoke(f)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '7px 13px',
                  borderRadius: 'var(--v-radius-md)',
                  border: 'none',
                  background: 'var(--v-blue)',
                  color: '#fff',
                  fontFamily: 'var(--v-font-body)',
                  fontWeight: 800,
                  fontSize: 'var(--v-text-sm)',
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                <Play size={13} /> Đọc bài
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditingFill(f);
                  setMode('fill');
                }}
                title="Sửa bài mẫu"
                aria-label="Sửa bài mẫu"
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 9,
                  border: '1px solid var(--v-border)',
                  background: 'var(--v-surface)',
                  color: 'var(--v-ink-soft)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                <Pencil size={14} />
              </button>
              <button
                type="button"
                onClick={() => handleDeleteFill(f)}
                disabled={busy}
                title="Xoá bài mẫu"
                aria-label="Xoá bài mẫu"
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 9,
                  border: '1px solid var(--v-border)',
                  background: 'var(--v-surface)',
                  color: 'var(--v-red)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: busy ? 'not-allowed' : 'pointer',
                  flexShrink: 0,
                }}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
