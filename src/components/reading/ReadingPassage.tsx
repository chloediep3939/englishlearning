'use client';

import { Sparkles } from 'lucide-react';
import type { KaraokeEngine, SentenceWithGi } from '@/lib/reading/use-karaoke';
import type { Token } from '@/lib/reading/tokenizer';
import { cleanWord } from '@/lib/reading/tokenizer';
import { BUN_BLUE } from '@/lib/reading/constants';

// One token span. States (design RAWord):
//   hot    — currently spoken word: solid blue bg, white text, glow
//   picked — selected word (sel): light blue bg
//   known  — in glossary: 2px dotted blue underline (a meaning is available)
//   plain  — everything else
function ReadingWord({
  s,
  t,
  ti,
  k,
  reduce,
}: {
  s: SentenceWithGi;
  t: Token;
  ti: number;
  k: KaraokeEngine;
  reduce: boolean;
}) {
  if (!t.isWord) return <span>{t.text}</span>;
  const isCur = s.gi === k.curSent;
  const hot = isCur && ti === k.curTok && !k.singleRef.current;
  const picked = !!k.sel && k.sel.sentIdx === s.gi && k.sel.tokIdx === ti;
  const known = !!k.glossary[cleanWord(t.text)];
  return (
    <span
      role="button"
      tabIndex={0}
      onClick={() => k.speakWord(s.gi, ti)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          k.speakWord(s.gi, ti);
        }
      }}
      style={{
        cursor: 'pointer',
        background: hot ? BUN_BLUE : picked ? `${BUN_BLUE}22` : 'transparent',
        color: hot ? '#fff' : 'inherit',
        borderRadius: 5,
        padding: hot || picked ? '1px 4px' : '1px 0',
        margin: hot || picked ? '0 -1px' : 0,
        fontWeight: hot ? 700 : 400,
        boxShadow: hot ? `0 2px 8px ${BUN_BLUE}55` : 'none',
        borderBottom:
          !hot && !picked && known ? `2px dotted ${BUN_BLUE}88` : '2px solid transparent',
        transition: reduce ? 'none' : 'background .12s ease, color .12s ease',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      {t.text}
    </span>
  );
}

/**
 * The reading card body. Two render modes:
 *   vnMode=false → sentences flow inline within <p>, active sentence tinted.
 *   vnMode=true  → each sentence is a block with a left accent + VN line beneath.
 */
export default function ReadingPassage({
  k,
  vnMode,
  fontSize,
  reduce,
}: {
  k: KaraokeEngine;
  vnMode: boolean;
  fontSize: number;
  reduce: boolean;
}) {
  // VN line size matches the design (desktop 15 / mobile 13), not a ratio of
  // the serif body — a ratio made it ~9px on mobile.
  const vnSize = fontSize >= 24 ? 15 : 13;

  return (
    <article
      style={{
        background: 'var(--v-surface)',
        border: '1px solid var(--v-border)',
        boxShadow: 'var(--v-shadow-lg)',
        borderRadius: 22,
        padding: fontSize >= 24 ? '34px 40px 30px' : '18px 18px 20px',
        fontFamily: 'var(--v-font-serif)',
        fontSize,
        fontWeight: 400,
        color: 'var(--v-ink)',
        lineHeight: 1.85,
      }}
    >
      {vnMode
        ? k.paras.map((para, pi) => (
            <div key={pi} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {para.map((s) => {
                const isCur = s.gi === k.curSent;
                const vn = k.translations[s.gi];
                return (
                  <div
                    key={s.gi}
                    style={{
                      padding: '8px 12px',
                      borderRadius: 12,
                      borderLeft: `3px solid ${isCur ? BUN_BLUE : 'transparent'}`,
                      background: isCur && !k.singleRef.current ? `${BUN_BLUE}0e` : 'transparent',
                      transition: reduce ? 'none' : 'all .25s ease',
                    }}
                  >
                    <div>
                      {s.tokens.map((t, ti) => (
                        <ReadingWord key={ti} s={s} t={t} ti={ti} k={k} reduce={reduce} />
                      ))}
                    </div>
                    <div
                      style={{
                        fontFamily: 'var(--v-font-body)',
                        fontStyle: 'italic',
                        fontSize: vnSize,
                        fontWeight: 600,
                        color: 'var(--v-blue)',
                        marginTop: 5,
                        lineHeight: 1.5,
                      }}
                    >
                      {vn ?? '—'}
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        : k.paras.map((para, pi) => (
            <p key={pi} style={{ margin: pi === 0 ? '0 0 16px' : '0 0 16px' }}>
              {para.map((s) => {
                const isCur = s.gi === k.curSent;
                return (
                  <span
                    key={s.gi}
                    style={{
                      background:
                        isCur && !k.singleRef.current ? `${BUN_BLUE}12` : 'transparent',
                      borderRadius: 6,
                      transition: reduce ? 'none' : 'background .25s ease',
                      padding: '1px 0',
                    }}
                  >
                    {s.tokens.map((t, ti) => (
                      <ReadingWord key={ti} s={s} t={t} ti={ti} k={k} reduce={reduce} />
                    ))}
                  </span>
                );
              })}
            </p>
          ))}

      <div
        style={{
          marginTop: 20,
          paddingTop: 14,
          borderTop: '1px dashed var(--v-border)',
          fontFamily: 'var(--v-font-body)',
          fontSize: 13,
          fontWeight: 700,
          color: 'var(--v-muted)',
          display: 'flex',
          alignItems: 'center',
          gap: 7,
        }}
      >
        <Sparkles size={14} style={{ color: BUN_BLUE, flexShrink: 0 }} /> Từ có{' '}
        <span style={{ borderBottom: `2px dotted ${BUN_BLUE}`, paddingBottom: 1 }}>gạch chấm</span>{' '}
        là có nghĩa — click để xem &amp; lưu vào bộ từ.
      </div>
    </article>
  );
}
