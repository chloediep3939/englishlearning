import { ExternalLink } from 'lucide-react';

/**
 * Row of external-dictionary lookup pills (Oxford / YouGlish / ozdic) for
 * a given word. Used on the reveal stages of Review/Study and on the
 * AddCardForm preview.
 *
 * Each pill opens in a new tab. Order matches the convention across the
 * app — Oxford first (definitions), then YouGlish (pronunciation
 * examples), then ozdic (collocations).
 */

type Provider = 'Oxford' | 'YouGlish' | 'ozdic';
const PROVIDERS: ReadonlyArray<Provider> = ['Oxford', 'YouGlish', 'ozdic'];

export function lookupUrl(provider: Provider, word: string): string {
  const w = encodeURIComponent(word.trim());
  if (provider === 'Oxford')
    return `https://www.oxfordlearnersdictionaries.com/definition/english/${w}`;
  if (provider === 'YouGlish') return `https://youglish.com/pronounce/${w}/english`;
  return `https://www.ozdic.com/collocation/${w}`;
}

interface Props {
  word: string;
}

export default function LookupPills({ word }: Props) {
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {PROVIDERS.map((p) => (
        <a
          key={p}
          href={lookupUrl(p, word)}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            padding: '5px 10px',
            fontFamily: 'var(--v-font-body)',
            fontSize: 12,
            fontWeight: 700,
            color: 'var(--v-ink-soft)',
            border: '1px solid var(--v-border)',
            borderRadius: 999,
            background: 'var(--v-surface)',
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          {p} <ExternalLink size={11} />
        </a>
      ))}
    </div>
  );
}
