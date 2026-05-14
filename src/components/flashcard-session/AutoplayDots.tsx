/**
 * Row of small dots that fill in green as the reveal-phase audio
 * auto-plays. Visual progress for the AUDIO_AUTOPLAY_COUNT cycle.
 */
export default function AutoplayDots({ played, total }: { played: number; total: number }) {
  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
      {Array.from({ length: total }).map((_, i) => {
        const active = i < played;
        return (
          <span
            key={i}
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: active ? 'var(--v-primary)' : 'var(--v-border)',
              transition: 'background 200ms var(--v-ease)',
            }}
          />
        );
      })}
    </div>
  );
}
