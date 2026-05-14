interface Props {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Layout primitive for the /settings grid. A panel-styled box with a header
 * row + body. Pure visual — no state. Used as a child of a CSS grid in
 * `/settings/page.tsx`.
 */
export default function SettingsCard({ title, icon, children }: Props) {
  return (
    <div
      style={{
        background: 'var(--v-panel)',
        border: '1px solid var(--v-border)',
        borderRadius: 'var(--v-radius-md)',
        boxShadow: 'var(--v-shadow-sm)',
        padding: 18,
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
      }}
    >
      <h3
        style={{
          fontFamily: 'var(--v-font-head)',
          fontWeight: 900,
          fontSize: 'var(--v-text-base)',
          color: 'var(--v-ink)',
          margin: '0 0 12px',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        {icon && <span style={{ display: 'inline-flex', alignItems: 'center' }}>{icon}</span>}
        {title}
      </h3>
      {children}
    </div>
  );
}
