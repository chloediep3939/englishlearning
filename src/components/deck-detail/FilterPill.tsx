interface Props {
  label: string;
  active: boolean;
  /** Optional accent color (defaults to --v-primary). Pills tied to a stage
   *  pass the stage color so the active state reads at a glance. */
  color?: string;
  onClick: () => void;
}

export default function FilterPill({ label, active, color, onClick }: Props) {
  const accent = color ?? 'var(--v-primary)';
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '6px 14px',
        background: active ? accent : 'var(--v-surface)',
        color: active ? '#fff' : 'var(--v-ink-soft)',
        border: active ? `1px solid ${accent}` : '1px solid var(--v-border)',
        borderRadius: 'var(--v-radius-pill)',
        fontFamily: 'var(--v-font-head)',
        fontWeight: 800,
        fontSize: 'var(--v-text-sm)',
        cursor: 'pointer',
      }}
    >
      {label}
    </button>
  );
}
