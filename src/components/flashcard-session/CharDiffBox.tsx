import { ArrowDown } from 'lucide-react';

/**
 * Character-by-character diff between the user's guess and the answer.
 * Per-char color: green = right letter at right index, orange = letter
 * present elsewhere, red = letter not in the answer at all. Same palette
 * as the rating buttons so users associate green/orange/red with TỐT /
 * KHÓ / LẠI.
 *
 * Hard-coded to compare lowercase; the original casing of the user's
 * guess is preserved in display.
 */
export default function CharDiffBox({ guess, answer }: { guess: string; answer: string }) {
  const ansLower = answer.toLowerCase();
  return (
    <div
      style={{
        background: 'var(--v-primary-soft)',
        border: '1px solid rgba(122,193,67,0.32)',
        borderRadius: 16,
        padding: '14px 18px',
        boxShadow: '0 3px 0 rgba(122,193,67,0.18), 0 6px 18px rgba(122,193,67,0.12)',
      }}
    >
      <div
        style={{
          fontFamily: 'var(--v-font-head)',
          fontSize: 12,
          fontWeight: 900,
          color: 'var(--v-primary)',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          marginBottom: 10,
          textAlign: 'center',
        }}
      >
        Bạn gõ &ldquo;{guess}&rdquo; → đáp án
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
        <div
          style={{
            fontFamily: 'var(--v-font-mono)',
            fontSize: 21,
            letterSpacing: '0.08em',
            display: 'flex',
            gap: 3,
          }}
        >
          {guess.split('').map((c, i) => {
            const lc = c.toLowerCase();
            const correct = ansLower[i] === lc;
            const inWord = !correct && ansLower.includes(lc);
            const color = correct
              ? 'var(--v-primary)'
              : inWord
                ? 'var(--v-orange)'
                : 'var(--v-red)';
            return (
              <span
                key={i}
                style={{
                  color,
                  fontWeight: 700,
                  textDecoration: correct ? 'none' : 'line-through',
                }}
              >
                {c}
              </span>
            );
          })}
        </div>
        <ArrowDown size={16} color="var(--v-muted)" />
        <div
          style={{
            fontFamily: 'var(--v-font-mono)',
            fontSize: 28,
            color: 'var(--v-primary)',
            fontWeight: 700,
            letterSpacing: '0.02em',
          }}
        >
          {answer}
        </div>
      </div>
    </div>
  );
}
