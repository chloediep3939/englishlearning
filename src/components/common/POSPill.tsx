/**
 * Part-of-speech badge used on word/card surfaces (WordCard, AddCardForm
 * preview, Review/Study reveal). Each POS gets its own color so the
 * learner can scan a list and spot nouns vs. verbs vs. adjectives at a
 * glance — the colors map deterministically via `getPOSColor`.
 *
 * Other surfaces (SentenceSession's outline chip, /dictionary's green
 * pill) deliberately use a different look — they aren't consumers of
 * this component.
 */
interface Props {
  pos: string | null | undefined;
  /** Override the bottom margin (default 0). Some callers stack the pill
   *  before a paragraph; others nest it inside flex rows. */
  marginBottom?: number | string;
}

/**
 * Map a dictionary part-of-speech string to a design-token color. Accepts
 * full names ("noun") or common abbreviations ("n.", "adj"). Unknown
 * values fall back to muted gray so they still render readably.
 */
export function getPOSColor(pos: string | null | undefined): string {
  if (!pos) return 'var(--v-muted)';
  const norm = pos.toLowerCase().trim().replace(/\.+$/, '');
  switch (norm) {
    case 'noun':
    case 'n':
      return 'var(--v-blue)';
    case 'verb':
    case 'v':
      return 'var(--v-primary)';
    case 'adjective':
    case 'adj':
      return 'var(--v-orange)';
    case 'adverb':
    case 'adv':
      return 'var(--v-purple)';
    case 'pronoun':
    case 'pron':
      return 'var(--v-teal)';
    case 'preposition':
    case 'prep':
      return 'var(--v-pink)';
    case 'conjunction':
    case 'conj':
      return 'var(--v-accent)';
    case 'interjection':
    case 'intj':
    case 'exclamation':
      return 'var(--v-red)';
    case 'determiner':
    case 'det':
    case 'article':
      return 'var(--v-muted)';
    default:
      return 'var(--v-purple)';
  }
}

export default function POSPill({ pos, marginBottom }: Props) {
  if (!pos) return null;
  const color = getPOSColor(pos);
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '3px 12px',
        background: color,
        color: '#fff',
        borderRadius: 'var(--v-radius-pill)',
        boxShadow: '0 2px 6px rgba(0,0,0,0.10)',
        fontFamily: 'var(--v-font-head)',
        fontSize: 11,
        fontWeight: 900,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        marginBottom,
      }}
    >
      {pos}
    </span>
  );
}
