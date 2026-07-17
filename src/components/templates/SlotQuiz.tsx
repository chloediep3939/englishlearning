'use client';

import { useMemo, useState } from 'react';
import { ArrowLeft, Check, Eye, RotateCcw } from 'lucide-react';
import { parseFrame } from '@/lib/templates/slots';
import type { PteTemplate, PteTemplateFill } from '@/lib/types';

interface Props {
  template: PteTemplate;
  fills: PteTemplateFill[];
  onBack: () => void;
}

/** Lenient compare: lowercase, strip punctuation, collapse whitespace. */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Slot recall quiz: the frame stays visible, slot contents of a saved fill
 *  are hidden — type them back from memory. Only fills created via the slot
 *  form are quizzable (pasted-whole fills have no slot boundaries). */
export default function SlotQuiz({ template, fills, onBack }: Props) {
  const quizzable = useMemo(() => fills.filter((f) => f.slot_values !== null), [fills]);
  const [fillId, setFillId] = useState<number | null>(quizzable[0]?.id ?? null);
  const fill = quizzable.find((f) => f.id === fillId) ?? null;

  const lines = useMemo(() => {
    const tokens = parseFrame(template.frame_text);
    const byLine = new Map<number, typeof tokens>();
    for (const t of tokens) {
      const arr = byLine.get(t.lineIdx) ?? [];
      arr.push(t);
      byLine.set(t.lineIdx, arr);
    }
    return [...byLine.values()];
  }, [template.frame_text]);

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [checked, setChecked] = useState(false);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());

  const expected = fill?.slot_values ?? {};
  // Slots gradable in this fill = present in its slot_values (frame may have
  // gained new slots since the fill was created — those are skipped).
  const gradable = useMemo(() => {
    const names = new Set<string>();
    for (const line of lines) {
      for (const t of line) {
        if (t.kind === 'slot' && t.slotName && expected[t.slotName] !== undefined) {
          names.add(t.slotName);
        }
      }
    }
    return [...names];
  }, [lines, expected]);

  const correctCount = gradable.filter(
    (name) => normalize(answers[name] ?? '') === normalize(expected[name] ?? ''),
  ).length;

  const reset = () => {
    setAnswers({});
    setChecked(false);
    setRevealed(new Set());
  };

  const backBtn = (
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
  );

  if (quizzable.length === 0) {
    return (
      <div>
        {backBtn}
        <div
          style={{
            padding: 32,
            textAlign: 'center',
            background: 'var(--v-panel)',
            border: '1px dashed var(--v-border)',
            borderRadius: 'var(--v-radius-md)',
            fontFamily: 'var(--v-font-body)',
            color: 'var(--v-muted)',
            fontSize: 'var(--v-text-md)',
          }}
        >
          Quiz cần một bài mẫu tạo bằng cách <b>điền theo ô</b> (bài dán nguyên
          văn không biết ranh giới slot). Bạn vào &ldquo;Tự luyện với đề
          mới&rdquo; để tạo trước nhé.
        </div>
      </div>
    );
  }

  return (
    <div>
      {backBtn}
      <h2
        style={{
          fontFamily: 'var(--v-font-head)',
          fontWeight: 900,
          fontSize: 'var(--v-text-2xl)',
          margin: '0 0 6px',
          color: 'var(--v-ink)',
        }}
      >
        Quiz điền slot
      </h2>
      <p
        style={{
          color: 'var(--v-muted)',
          margin: '0 0 14px',
          fontFamily: 'var(--v-font-body)',
          fontSize: 'var(--v-text-sm)',
        }}
      >
        Khung hiện sẵn — bạn nhớ lại và gõ nội dung từng ô của bài mẫu. Không
        phân biệt hoa/thường hay dấu câu.
      </p>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
        {quizzable.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => {
              setFillId(f.id);
              reset();
            }}
            style={{
              padding: '7px 14px',
              borderRadius: 999,
              border: f.id === fillId ? '1px solid var(--v-purple)' : '1px solid var(--v-border)',
              background: f.id === fillId ? 'var(--v-purple)' : 'var(--v-surface)',
              color: f.id === fillId ? '#fff' : 'var(--v-ink-soft)',
              fontFamily: 'var(--v-font-head)',
              fontWeight: 800,
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            {f.topic}
          </button>
        ))}
      </div>

      {fill && (
        <div
          style={{
            background: 'var(--v-surface)',
            border: '1px solid var(--v-border)',
            borderRadius: 'var(--v-radius-md)',
            boxShadow: 'var(--v-shadow-sm)',
            padding: '18px 20px',
            fontFamily: 'var(--v-font-body)',
            fontSize: 'var(--v-text-md)',
            lineHeight: 2.2,
            color: 'var(--v-ink)',
          }}
        >
          {lines.map((line, li) => (
            <div key={li}>
              {line.map((t, ti) => {
                if (t.kind === 'break') {
                  const strong = t.breakLevel === 2;
                  return (
                    <span
                      key={ti}
                      style={{
                        color: strong ? 'var(--v-purple)' : 'var(--v-muted)',
                        fontWeight: strong ? 800 : 400,
                        margin: '0 5px',
                        opacity: strong ? 0.8 : 0.55,
                      }}
                    >
                      {strong ? '‖' : '/'}
                    </span>
                  );
                }
                if (t.kind === 'word') return <span key={ti}>{t.text} </span>;

                const name = t.slotName ?? t.text;
                const answer = expected[name];
                if (answer === undefined) {
                  return (
                    <span
                      key={ti}
                      title="Slot mới — chưa có trong bài mẫu này"
                      style={{
                        display: 'inline-block',
                        padding: '0 9px',
                        margin: '0 3px',
                        borderRadius: 999,
                        border: '1px dashed var(--v-border)',
                        color: 'var(--v-muted)',
                        fontFamily: 'var(--v-font-mono)',
                        fontSize: 12,
                      }}
                    >
                      {name} · chưa có
                    </span>
                  );
                }

                const value = answers[name] ?? '';
                const isCorrect = normalize(value) === normalize(answer);
                const showResult = checked || revealed.has(name);
                const borderColor = !showResult
                  ? 'var(--v-border)'
                  : isCorrect
                    ? 'var(--v-primary)'
                    : 'var(--v-red)';
                return (
                  <span key={ti} style={{ display: 'inline-block', margin: '0 3px', verticalAlign: 'middle' }}>
                    <input
                      value={value}
                      onChange={(e) =>
                        setAnswers((prev) => ({ ...prev, [name]: e.target.value }))
                      }
                      placeholder={name}
                      maxLength={500}
                      size={Math.max(name.length + 2, Math.min(answer.length + 2, 32))}
                      style={{
                        padding: '3px 9px',
                        borderRadius: 9,
                        border: `2px solid ${borderColor}`,
                        background: 'var(--v-bg)',
                        color: 'var(--v-ink)',
                        fontFamily: 'var(--v-font-body)',
                        fontSize: 'var(--v-text-sm)',
                        fontWeight: 700,
                        outline: 'none',
                      }}
                    />
                    {showResult && !isCorrect && (
                      <span
                        style={{
                          display: 'block',
                          fontSize: 'var(--v-text-xs)',
                          lineHeight: 1.4,
                          color: 'var(--v-primary)',
                          fontWeight: 800,
                        }}
                      >
                        → {answer}
                      </span>
                    )}
                  </span>
                );
              })}
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14 }}>
        <button
          type="button"
          onClick={() => setChecked(true)}
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
            background: 'var(--v-purple)',
            cursor: 'pointer',
          }}
        >
          <Check size={15} /> Kiểm tra
        </button>
        <button
          type="button"
          onClick={() => setRevealed(new Set(gradable))}
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
          <Eye size={15} /> Hé đáp án
        </button>
        <button
          type="button"
          onClick={reset}
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
          <RotateCcw size={15} /> Làm lại
        </button>
        {checked && (
          <span
            style={{
              marginLeft: 'auto',
              fontFamily: 'var(--v-font-head)',
              fontWeight: 900,
              fontSize: 'var(--v-text-md)',
              color: correctCount === gradable.length ? 'var(--v-primary)' : 'var(--v-ink)',
            }}
          >
            Đúng {correctCount}/{gradable.length}
          </span>
        )}
      </div>
    </div>
  );
}
