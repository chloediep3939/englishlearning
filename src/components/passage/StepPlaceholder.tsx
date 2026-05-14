'use client';

/**
 * Shared empty-state used by steps not yet implemented in M4a.
 * M4b / M4c replace the per-step file's body — this file can stay.
 */
export default function StepPlaceholder({
  icon,
  title,
  hint,
}: {
  icon: string;
  title: string;
  hint: string;
}) {
  return (
    <div
      style={{
        padding: 56,
        textAlign: 'center',
        background: 'var(--v-panel)',
        border: '1px dashed var(--v-border)',
        borderRadius: 'var(--v-radius-md)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
      }}
    >
      <div style={{ fontSize: 36 }}>{icon}</div>
      <div
        style={{
          fontFamily: 'var(--v-font-head)',
          fontSize: 'var(--v-text-lg)',
          fontWeight: 800,
          color: 'var(--v-ink)',
        }}
      >
        {title}
      </div>
      <div
        style={{
          color: 'var(--v-muted)',
          fontFamily: 'var(--v-font-body)',
          fontSize: 'var(--v-text-sm)',
          maxWidth: 420,
        }}
      >
        {hint}
      </div>
    </div>
  );
}
