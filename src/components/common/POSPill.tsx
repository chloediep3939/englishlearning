/**
 * Purple part-of-speech badge used on word/card surfaces (WordCard,
 * AddCardForm preview, Review/Study reveal). The pill is intentionally
 * loud — it's a "this is the grammatical category" stamp.
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

export default function POSPill({ pos, marginBottom }: Props) {
  if (!pos) return null;
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '3px 12px',
        background: 'var(--v-purple)',
        color: '#fff',
        borderRadius: 'var(--v-radius-pill)',
        boxShadow: '0 2px 6px rgba(193,121,214,0.35)',
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
