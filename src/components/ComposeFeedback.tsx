'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { Plus, Repeat, History as HistoryIcon, Sparkles, CheckCircle2, XCircle } from 'lucide-react';
import type { Composition } from '@/lib/types';

interface Props {
  composition: Composition;
  /** When omitted, the "new"/"rewrite" buttons are hidden — used by the history detail view. */
  onNew?: () => void;
  onRewriteSamePool?: () => void;
  /** Optional extra footer (e.g. delete + back buttons on the history page). */
  extraFooter?: React.ReactNode;
}

export default function ComposeFeedback({
  composition,
  onNew,
  onRewriteSamePool,
  extraFooter,
}: Props) {
  const { content, ai_feedback, word_usage, coherence_score, passed } = composition;

  // Used pool words (canonical English spelling)
  const usedWords = useMemo(
    () => Object.entries(word_usage).filter(([, v]) => v).map(([w]) => w),
    [word_usage],
  );
  const unusedWords = useMemo(
    () => Object.entries(word_usage).filter(([, v]) => !v).map(([w]) => w),
    [word_usage],
  );

  const scoreColor =
    coherence_score === null
      ? 'var(--v-muted)'
      : coherence_score >= 7
        ? 'var(--v-primary)'
        : coherence_score >= 5
          ? 'var(--v-orange)'
          : 'var(--v-red)';

  const annotated = useMemo(
    () => renderAnnotatedPassage(content, usedWords, ai_feedback.issues),
    [content, usedWords, ai_feedback.issues],
  );

  return (
    <div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) minmax(280px, 360px)',
          gap: 16,
          alignItems: 'start',
        }}
      >
        {/* ----- Left: passage + score ----- */}
        <div
          style={{
            background: 'var(--v-panel)',
            border: '1px solid var(--v-border)',
            borderRadius: 'var(--v-radius-md)',
            padding: 18,
            boxShadow: 'var(--v-shadow-sm)',
            minWidth: 0,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              marginBottom: 16,
              flexWrap: 'wrap',
            }}
          >
            <ScoreGauge score={coherence_score} color={scoreColor} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <VerdictPill passed={passed} />
              <div
                style={{
                  fontFamily: 'var(--v-font-body)',
                  fontSize: 'var(--v-text-sm)',
                  color: 'var(--v-muted)',
                  maxWidth: 320,
                }}
              >
                Bún chấm điểm về mức độ tự nhiên và mạch lạc của bài.
              </div>
            </div>
          </div>

          <div
            style={{
              fontFamily: 'var(--v-font-body)',
              fontSize: 'var(--v-text-md)',
              color: 'var(--v-ink)',
              lineHeight: 1.7,
              whiteSpace: 'pre-wrap',
              padding: '14px 16px',
              background: 'var(--v-bg)',
              border: '1px solid var(--v-border)',
              borderRadius: 'var(--v-radius-sm)',
            }}
          >
            {annotated}
          </div>
        </div>

        {/* ----- Right: feedback lists ----- */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }}>
          {/* Used words */}
          <SidePanel
            title="Đã dùng"
            count={usedWords.length}
            icon={<CheckCircle2 size={14} style={{ color: 'var(--v-primary)' }} />}
          >
            {usedWords.length === 0 ? (
              <EmptyHint>(Chưa dùng từ nào trong pool)</EmptyHint>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {usedWords.map((w) => (
                  <Chip key={w} variant="used">
                    {w}
                  </Chip>
                ))}
              </div>
            )}
          </SidePanel>

          {/* Suggested additions */}
          {ai_feedback.suggested_additions.length > 0 && (
            <SidePanel
              title="Gợi ý thêm"
              count={ai_feedback.suggested_additions.length}
              icon={<Sparkles size={14} style={{ color: 'var(--v-accent)' }} />}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {ai_feedback.suggested_additions.map((s) => (
                  <div
                    key={s.word}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4,
                    }}
                  >
                    <Chip variant="accent">{s.word}</Chip>
                    <div
                      style={{
                        fontSize: 'var(--v-text-sm)',
                        color: 'var(--v-ink-soft)',
                        lineHeight: 1.5,
                      }}
                    >
                      {s.hint}
                    </div>
                  </div>
                ))}
              </div>
            </SidePanel>
          )}

          {/* Unused (when there are no AI suggestions, still show them so user knows) */}
          {ai_feedback.suggested_additions.length === 0 && unusedWords.length > 0 && (
            <SidePanel
              title="Chưa dùng"
              count={unusedWords.length}
              icon={<XCircle size={14} style={{ color: 'var(--v-muted)' }} />}
            >
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {unusedWords.map((w) => (
                  <Chip key={w} variant="muted">
                    {w}
                  </Chip>
                ))}
              </div>
            </SidePanel>
          )}

          {/* Issues */}
          <SidePanel
            title="Cần sửa"
            count={ai_feedback.issues.length}
            icon={<XCircle size={14} style={{ color: 'var(--v-orange)' }} />}
          >
            {ai_feedback.issues.length === 0 ? (
              <EmptyHint>Không có lỗi nào lớn 🎉</EmptyHint>
            ) : (
              <ol
                style={{
                  margin: 0,
                  paddingLeft: 18,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                }}
              >
                {ai_feedback.issues.map((it, i) => (
                  <li
                    key={i}
                    style={{
                      fontFamily: 'var(--v-font-body)',
                      fontSize: 'var(--v-text-sm)',
                      color: 'var(--v-ink)',
                      lineHeight: 1.5,
                    }}
                  >
                    <div
                      style={{
                        fontStyle: 'italic',
                        color: 'var(--v-ink-soft)',
                        marginBottom: 4,
                      }}
                    >
                      &ldquo;{it.excerpt}&rdquo;
                    </div>
                    <div style={{ marginBottom: 2 }}>
                      <strong style={{ color: 'var(--v-orange)' }}>Vấn đề:</strong> {it.problem}
                    </div>
                    {it.suggestion && (
                      <div>
                        <strong style={{ color: 'var(--v-primary)' }}>Gợi ý:</strong>{' '}
                        {it.suggestion}
                      </div>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </SidePanel>
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          marginTop: 18,
          display: 'flex',
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
        {onNew && (
          <button
            type="button"
            onClick={onNew}
            style={primaryBtn}
          >
            <Plus size={14} /> Viết bài mới
          </button>
        )}
        {onRewriteSamePool && (
          <button
            type="button"
            onClick={onRewriteSamePool}
            style={secondaryBtn}
          >
            <Repeat size={14} /> Viết lại với pool này
          </button>
        )}
        <Link href="/compose/history" style={{ ...secondaryBtn, textDecoration: 'none' }}>
          <HistoryIcon size={14} /> Xem lịch sử
        </Link>
        {extraFooter}
      </div>
    </div>
  );
}

// ============================================================================
// Score gauge — simple SVG circle with center number
// ============================================================================

function ScoreGauge({
  score,
  color,
}: {
  score: number | null;
  color: string;
}) {
  const value = score ?? 0;
  const pct = Math.max(0, Math.min(1, value / 10));
  const R = 36;
  const C = 2 * Math.PI * R;
  const offset = C * (1 - pct);
  const size = 96;

  return (
    <div
      style={{
        position: 'relative',
        width: size,
        height: size,
        flexShrink: 0,
      }}
    >
      <svg width={size} height={size} viewBox="0 0 96 96">
        <circle
          cx={48}
          cy={48}
          r={R}
          fill="none"
          stroke="var(--v-border)"
          strokeWidth={8}
        />
        <circle
          cx={48}
          cy={48}
          r={R}
          fill="none"
          stroke={color}
          strokeWidth={8}
          strokeDasharray={C}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 48 48)"
          style={{ transition: 'stroke-dashoffset 400ms var(--v-ease)' }}
        />
      </svg>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'var(--v-font-head)',
          color,
          lineHeight: 1,
        }}
      >
        <div style={{ fontSize: 28, fontWeight: 900 }}>{value}</div>
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            opacity: 0.7,
            marginTop: 2,
          }}
        >
          / 10
        </div>
      </div>
    </div>
  );
}

function VerdictPill({ passed }: { passed: boolean }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '5px 12px',
        borderRadius: 999,
        background: passed ? 'rgba(122,193,67,0.16)' : 'rgba(245,166,35,0.16)',
        color: passed ? 'var(--v-primary)' : 'var(--v-orange)',
        fontFamily: 'var(--v-font-body)',
        fontWeight: 800,
        fontSize: 'var(--v-text-sm)',
        width: 'fit-content',
      }}
    >
      {passed ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
      {passed ? 'Đạt' : 'Chưa đạt'}
    </span>
  );
}

// ============================================================================
// Side panel + chip + button styles
// ============================================================================

function SidePanel({
  title,
  count,
  icon,
  children,
}: {
  title: string;
  count?: number;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: 'var(--v-panel)',
        border: '1px solid var(--v-border)',
        borderRadius: 'var(--v-radius-md)',
        padding: 14,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontFamily: 'var(--v-font-body)',
          fontSize: 'var(--v-text-sm)',
          fontWeight: 800,
          color: 'var(--v-ink)',
          marginBottom: 10,
          textTransform: 'uppercase',
          letterSpacing: 'var(--v-tracking-wider)',
        }}
      >
        {icon}
        {title}
        {typeof count === 'number' && (
          <span
            style={{
              marginLeft: 'auto',
              padding: '1px 8px',
              borderRadius: 999,
              background: 'var(--v-bg)',
              color: 'var(--v-muted)',
              fontSize: 'var(--v-text-xs)',
              fontWeight: 700,
            }}
          >
            {count}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

function Chip({
  children,
  variant,
}: {
  children: React.ReactNode;
  variant: 'used' | 'accent' | 'muted';
}) {
  const bg =
    variant === 'used'
      ? 'var(--v-primary)'
      : variant === 'accent'
        ? 'var(--v-accent)'
        : 'var(--v-bg)';
  const color = variant === 'muted' ? 'var(--v-muted)' : '#fff';
  const border = variant === 'muted' ? '1px solid var(--v-border)' : 'none';
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '4px 10px',
        borderRadius: 999,
        background: bg,
        color,
        border,
        fontFamily: 'var(--v-font-body)',
        fontSize: 'var(--v-text-sm)',
        fontWeight: 700,
        width: 'fit-content',
      }}
    >
      {children}
    </span>
  );
}

function EmptyHint({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        color: 'var(--v-muted)',
        fontSize: 'var(--v-text-sm)',
        fontStyle: 'italic',
      }}
    >
      {children}
    </div>
  );
}

const primaryBtn: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '10px 18px',
  borderRadius: 'var(--v-radius-md)',
  border: 'none',
  background: 'var(--v-primary)',
  color: '#fff',
  fontFamily: 'var(--v-font-body)',
  fontWeight: 800,
  fontSize: 'var(--v-text-md)',
  cursor: 'pointer',
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

// ============================================================================
// Passage annotation — best-effort highlighting
//
// Strategy: build a non-overlapping mask over the passage based on (a) pool-word
// matches (case-insensitive, whole-word-ish via boundary regex) and (b) issue
// excerpt matches (verbatim). When a pool word overlaps an issue excerpt, the
// issue wins for that span. Excerpts that don't appear verbatim are skipped —
// they still show up in the right-column issue list.
// ============================================================================

type Segment = { start: number; end: number; kind: 'used' | 'issue' };

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function findMatches(text: string, needle: string, regexOpts: string): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  if (needle.length === 0) return out;
  let re: RegExp;
  try {
    re = new RegExp(escapeRegExp(needle), regexOpts);
  } catch {
    return out;
  }
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    out.push([m.index, m.index + m[0].length]);
    if (m[0].length === 0) re.lastIndex++;
  }
  return out;
}

function renderAnnotatedPassage(
  text: string,
  usedWords: string[],
  issues: Array<{ excerpt: string }>,
): React.ReactNode {
  const segments: Segment[] = [];

  for (const w of usedWords) {
    // Use word-boundary regex so "live" doesn't match inside "lively".
    // Some pool words are multi-word phrases — boundary still works fine.
    let re: RegExp;
    try {
      re = new RegExp('\\b' + escapeRegExp(w) + '\\b', 'gi');
    } catch {
      continue;
    }
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      segments.push({ start: m.index, end: m.index + m[0].length, kind: 'used' });
      if (m[0].length === 0) re.lastIndex++;
    }
  }

  for (const it of issues) {
    if (!it.excerpt) continue;
    for (const [s, e] of findMatches(text, it.excerpt, 'g')) {
      segments.push({ start: s, end: e, kind: 'issue' });
    }
  }

  if (segments.length === 0) return text;

  // Resolve overlaps: issue wins. Sort by start, then merge by precedence.
  // Simpler approach: walk by character, assign winning kind per index.
  const kindByIndex: Array<Segment['kind'] | undefined> = new Array(text.length).fill(undefined);
  for (const seg of segments) {
    for (let i = seg.start; i < seg.end; i++) {
      const prev = kindByIndex[i];
      if (prev === undefined) {
        kindByIndex[i] = seg.kind;
      } else if (seg.kind === 'issue') {
        kindByIndex[i] = 'issue';
      }
    }
  }

  // Coalesce runs of identical kind into spans
  const nodes: React.ReactNode[] = [];
  let i = 0;
  while (i < text.length) {
    const kind = kindByIndex[i];
    let j = i + 1;
    while (j < text.length && kindByIndex[j] === kind) j++;
    const slice = text.slice(i, j);
    if (kind === undefined) {
      nodes.push(slice);
    } else if (kind === 'used') {
      nodes.push(
        <span
          key={i}
          style={{
            color: 'var(--v-primary)',
            fontWeight: 700,
            textDecoration: 'underline',
            textDecorationColor: 'var(--v-primary)',
            textDecorationThickness: 2,
            textUnderlineOffset: 3,
          }}
        >
          {slice}
        </span>,
      );
    } else {
      nodes.push(
        <span
          key={i}
          style={{
            color: 'var(--v-orange)',
            textDecoration: 'underline',
            textDecorationColor: 'var(--v-orange)',
            textDecorationStyle: 'wavy',
            textDecorationThickness: 2,
            textUnderlineOffset: 3,
          }}
        >
          {slice}
        </span>,
      );
    }
    i = j;
  }

  return nodes;
}
