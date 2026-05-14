export default function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd
      style={{
        fontFamily: 'var(--v-font-mono)',
        fontSize: 11,
        fontWeight: 700,
        background: 'var(--v-surface)',
        border: '1px solid var(--v-border)',
        borderRadius: 4,
        padding: '1px 6px',
        color: 'var(--v-muted)',
        margin: '0 2px',
      }}
    >
      {children}
    </kbd>
  );
}
