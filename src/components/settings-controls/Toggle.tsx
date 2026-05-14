interface Props {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled: boolean;
}

/**
 * Settings checkbox + label + optional hint, vertically aligned so the
 * hint flows below the label without indent. Used by every settings card.
 */
export default function Toggle({ label, hint, checked, onChange, disabled }: Props) {
  return (
    <label
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        cursor: disabled ? 'wait' : 'pointer',
        marginBottom: 10,
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        style={{ width: 18, height: 18, cursor: disabled ? 'wait' : 'pointer', marginTop: 2 }}
      />
      <span>
        <div style={{ fontFamily: 'var(--v-font-body)', fontSize: 'var(--v-text-md)', color: 'var(--v-ink)', fontWeight: 600 }}>
          {label}
        </div>
        {hint && (
          <div style={{ fontSize: 'var(--v-text-xs)', color: 'var(--v-muted)', marginTop: 2 }}>
            {hint}
          </div>
        )}
      </span>
    </label>
  );
}
