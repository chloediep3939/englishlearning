'use client';

import { tokenizeSentence } from './compare';

/**
 * Word-level Wordle-style colorizer for the sentence reveal — the sentence
 * sibling of CharDiffBox (per-character coloring doesn't scale to full
 * sentences). Both sides are compared on normalized tokens:
 *   - green:  right word at the right position
 *   - orange: word exists in the answer, wrong position
 *   - red + strikethrough: word not in the answer
 * Missing tail words show as muted "…" slots so a too-short guess is
 * visibly incomplete. The full correct sentence renders separately in the
 * reveal panel.
 */
export default function SentenceDiff({ guess, answer }: { guess: string; answer: string }) {
  const gTokens = tokenizeSentence(guess);
  const aTokens = tokenizeSentence(answer);
  const answerSet = new Set(aTokens);

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '6px 8px',
        alignItems: 'center',
      }}
    >
      {gTokens.map((tok, i) => {
        const correct = aTokens[i] === tok;
        const inAnswer = answerSet.has(tok);
        const color = correct ? 'var(--v-primary)' : inAnswer ? 'var(--v-orange)' : 'var(--v-red)';
        return (
          <span
            key={`${tok}-${i}`}
            style={{
              fontFamily: 'var(--v-font-mono)',
              fontSize: 'var(--v-text-md)',
              fontWeight: 700,
              color,
              textDecoration: correct ? 'none' : inAnswer ? 'none' : 'line-through',
              background: correct
                ? 'color-mix(in srgb, var(--v-primary) 12%, transparent)'
                : 'transparent',
              padding: '2px 6px',
              borderRadius: 6,
            }}
          >
            {tok}
          </span>
        );
      })}
      {gTokens.length < aTokens.length &&
        aTokens.slice(gTokens.length).map((_, i) => (
          <span
            key={`missing-${i}`}
            aria-label="thiếu từ"
            style={{
              fontFamily: 'var(--v-font-mono)',
              fontSize: 'var(--v-text-md)',
              fontWeight: 700,
              color: 'var(--v-muted)',
              padding: '2px 6px',
            }}
          >
            …
          </span>
        ))}
    </div>
  );
}
