interface Props {
  label: string;
  value: number;
  color: string;
}

/**
 * Colored stat tile for the speed-quiz summary screen. Each tile is a big
 * number on a panel background with a colored border + small uppercase
 * label. Distinct from Dashboard's StatTile (which has an icon + sub-copy)
 * — these are intentionally separate.
 */
export default function StatTile({ label, value, color }: Props) {
  return (
    <div
      style={{
        padding: 14,
        background: 'var(--v-panel)',
        border: `2px solid ${color}`,
        borderRadius: 'var(--v-radius-md)',
        boxShadow: 'var(--v-shadow-sm)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
      }}
    >
      <div
        style={{
          fontFamily: 'var(--v-font-head)',
          fontSize: 'var(--v-text-4xl)',
          fontWeight: 900,
          color,
          lineHeight: 1,
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontFamily: 'var(--v-font-body)',
          fontSize: 'var(--v-text-xs)',
          fontWeight: 700,
          color: 'var(--v-muted)',
          letterSpacing: 'var(--v-tracking-wide)',
          textTransform: 'uppercase',
        }}
      >
        {label}
      </div>
    </div>
  );
}
