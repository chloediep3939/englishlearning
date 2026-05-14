'use client';

// Decorative miniature dashboard shown inside the DASHBOARD screenshot frame.
// Static — not interactive. Mimics the real /dashboard at thumbnail scale.

export default function MockDashboard() {
  const sidebarSquares: string[] = [
    'var(--v-primary)',
    'var(--v-accent)',
    'var(--v-orange)',
    'var(--v-blue)',
    'var(--v-yellow-deep)',
    'var(--v-teal)',
    'var(--v-purple)',
  ];
  const pills: Array<[number, string]> = [
    [7, 'var(--v-red)'],
    [248, 'var(--v-blue)'],
    [5, 'var(--v-red)'],
  ];
  const tiles: Array<[number, string]> = [
    [12, 'var(--v-blue)'],
    [38, 'var(--v-orange)'],
    [154, 'var(--v-primary)'],
    [73, 'var(--v-purple)'],
  ];
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: 'var(--v-surface)',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'var(--v-font-body)',
      }}
      aria-hidden="true"
    >
      <div style={{ flex: 1, display: 'flex' }}>
        <aside
          style={{
            width: 52,
            background: 'var(--v-panel)',
            borderRight: '1px solid var(--v-border)',
            padding: '10px 6px',
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
          }}
        >
          {sidebarSquares.map((c, i) => (
            <div
              key={i}
              style={{
                width: 18,
                height: 18,
                borderRadius: 5,
                background: c,
                opacity: i === 0 ? 1 : 0.7,
                marginLeft: 12,
                boxShadow: i === 0 ? '0 1px 2px rgba(40,30,15,.2)' : 'none',
              }}
            />
          ))}
        </aside>
        <main
          style={{
            flex: 1,
            padding: '12px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 6, fontWeight: 900, color: 'var(--v-muted)', letterSpacing: '0.14em' }}>
                CHƯƠNG 47
              </div>
              <div
                style={{
                  fontFamily: 'var(--v-font-head)',
                  fontSize: 12,
                  fontWeight: 900,
                  color: 'var(--v-ink)',
                  marginTop: 1,
                }}
              >
                Chào buổi sáng!
              </div>
            </div>
            <div style={{ display: 'flex', gap: 3 }}>
              {pills.map(([val, c], i) => (
                <div
                  key={i}
                  style={{
                    background: 'var(--v-surface)',
                    border: '1px solid var(--v-border)',
                    borderRadius: 8,
                    padding: '2px 5px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                  }}
                >
                  <div style={{ width: 5, height: 5, borderRadius: '50%', background: c }} />
                  <span
                    style={{
                      fontFamily: 'var(--v-font-head)',
                      fontWeight: 900,
                      fontSize: 7,
                      color: 'var(--v-ink)',
                    }}
                  >
                    {val}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Orange hero strip */}
          <div
            style={{
              background: 'linear-gradient(135deg, #ff8956, #ffa872)',
              borderRadius: 8,
              padding: '8px 10px',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/mascot/ngoc-happy.png" width={36} height={36} alt="" aria-hidden="true" />
            <div style={{ flex: 1, color: '#fff' }}>
              <div style={{ fontSize: 6, fontWeight: 800, letterSpacing: '0.08em', opacity: 0.85 }}>HÔM NAY</div>
              <div style={{ fontFamily: 'var(--v-font-head)', fontWeight: 900, fontSize: 10 }}>46 từ ôn · 10 mới</div>
            </div>
            <div
              style={{
                background: 'var(--v-surface)',
                borderRadius: 6,
                padding: '3px 6px',
                fontFamily: 'var(--v-font-head)',
                fontSize: 7,
                fontWeight: 900,
                color: 'var(--v-primary)',
              }}
            >
              ÔN NGAY
            </div>
          </div>

          {/* 4 stat tiles */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4 }}>
            {tiles.map(([val, c], i) => (
              <div
                key={i}
                style={{
                  background: 'var(--v-surface)',
                  border: '1px solid var(--v-border)',
                  borderRadius: 7,
                  padding: '5px 6px',
                }}
              >
                <div style={{ width: 10, height: 10, borderRadius: 3, background: c }} />
                <div
                  style={{
                    fontFamily: 'var(--v-font-head)',
                    fontWeight: 900,
                    fontSize: 11,
                    color: 'var(--v-ink)',
                    marginTop: 3,
                  }}
                >
                  {val}
                </div>
              </div>
            ))}
          </div>

          {/* chart bars */}
          <div
            style={{
              flex: 1,
              background: 'var(--v-surface)',
              border: '1px solid var(--v-border)',
              borderRadius: 7,
              padding: 6,
              display: 'flex',
              alignItems: 'flex-end',
              gap: 2,
            }}
          >
            {Array.from({ length: 18 }).map((_, i) => {
              const h = 8 + ((i * 23 + 7) % 30);
              return (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    height: `${h}px`,
                    background: i % 2 ? 'var(--v-primary)' : 'var(--v-blue)',
                    borderRadius: 1,
                  }}
                />
              );
            })}
          </div>
        </main>
      </div>
    </div>
  );
}
