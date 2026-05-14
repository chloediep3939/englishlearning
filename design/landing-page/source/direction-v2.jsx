// V2 — Hybrid pick & mix (softened)
// Palette/chrome = Playground (multi-color, chunky-but-soft cards, mascot prominence)
// Dashboard layout = Storybook (chapter header, calendar streak, journal feel)
// Review reveal layout = Reader's Desk (big word headline, pull-quote, structured rating)

const V = {
  ...B,
  bg: '#ffffff',
  surface: '#ffffff',
  panel: '#fafaf6',
  // Soft tokens — warm-tinted instead of dark green-black
  border: 'rgba(40,30,15,0.13)',
  borderMed: 'rgba(40,30,15,0.18)',
  borderStrong: 'rgba(40,30,15,0.25)',
  inkSoft: '#5a5247',
  muted: '#9e978c',
  shadow: '0 2px 0 rgba(40,30,15,0.05), 0 1px 3px rgba(40,30,15,0.04)',
  shadowMd: '0 3px 0 rgba(40,30,15,0.07), 0 2px 6px rgba(40,30,15,0.04)',
  shadowLg: '0 4px 0 rgba(40,30,15,0.08), 0 4px 12px rgba(40,30,15,0.04)',
};
const V_C = {
  blue: '#5dc1f0', orange: '#ff9a3c', red: '#ff5757', purple: '#c179d6',
  pink: '#f06292', teal: '#6ec1a8', yellow: '#ffc94a',
};

// ─────────────────────────────────────────────────────────────────────────────
// Portfolio top nav — Chloe Diep parent context
// ─────────────────────────────────────────────────────────────────────────────
const V_PortfolioTopNav = () => (
  <header style={{
    height: 54, flexShrink: 0, padding: '0 32px',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    borderBottom: `1px solid ${V.border}`, background: '#fff',
  }}>
    <div style={{ fontFamily: '"Lora", "Times New Roman", serif', fontSize: 20, fontWeight: 500, fontStyle: 'italic', color: V.ink, letterSpacing: '-0.005em' }}>
      Chloe Diep<sup style={{ fontSize: 9, marginLeft: 1, fontStyle: 'normal', fontWeight: 400 }}>®</sup>
    </div>
    <nav style={{ display: 'flex', gap: 26 }}>
      {['DỰ ÁN', 'STUDIO', 'DỊCH VỤ', 'PERSONAL', 'HỌC AV', 'BLOG', 'CV'].map(n => {
        const active = n === 'HỌC AV';
        return (
          <span key={n} style={{
            fontFamily: V.bodyFont, fontSize: 11, fontWeight: 800, letterSpacing: '0.16em',
            color: active ? V.ink : V.muted, cursor: 'pointer', paddingBottom: 2,
            borderBottom: active ? `1.5px solid ${V.primary}` : '1.5px solid transparent',
          }}>{n}</span>
        );
      })}
    </nav>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontFamily: V.monoFont, fontSize: 11, color: V.muted, fontWeight: 600 }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: V.muted, display: 'inline-block' }} />
      02:33 HCM
      <span style={{ fontSize: 14, marginLeft: 2 }} title="dark mode">☾</span>
    </div>
  </header>
);

// Page wrapper — portfolio top + (sidebar + main)
const V_Frame = ({ children }) => (
  <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: V.bg, fontFamily: V.bodyFont, color: V.ink, overflow: 'hidden' }}>
    <V_PortfolioTopNav />
    <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
      {children}
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// V Sidebar — slim sub-nav (portfolio top owns "HỌC AV" branding)
// ─────────────────────────────────────────────────────────────────────────────
const V_Sidebar = ({ active = 'home' }) => {
  const items = [
    { key: 'home', label: 'Tổng quan', icon: 'home', color: V.primary },
    { key: 'add', label: 'Thêm từ', icon: 'plus', color: V.accent },
    { key: 'study', label: 'Học hôm nay', icon: 'book', color: V_C.orange },
    { key: 'review', label: 'Ôn tập', icon: 'refresh', color: V_C.blue },
    { key: 'flash', label: 'Flashcard nhanh', icon: 'bolt', color: V_C.yellow },
    { key: 'cloze', label: 'Điền chỗ trống', icon: 'pencil', color: V_C.teal },
    { key: 'dict', label: 'Từ điển', icon: 'library', color: V_C.purple },
    { key: 'decks', label: 'Bộ từ', icon: 'folder', color: V_C.pink },
    { key: 'stats', label: 'Thống kê', icon: 'chart', color: V_C.teal },
    { key: 'settings', label: 'Cài đặt', icon: 'settings', color: V.muted },
  ];
  return (
    <aside style={{ width: 196, flexShrink: 0, padding: '18px 12px', display: 'flex', flexDirection: 'column', gap: 4, background: V.panel, borderRight: `1px solid ${V.border}`, fontFamily: V.bodyFont }}>
      <div style={{ padding: '0 10px 8px', fontFamily: V.bodyFont, fontSize: 10, fontWeight: 800, color: V.muted, letterSpacing: '0.16em', textTransform: 'uppercase' }}>Module</div>
      <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {items.map(it => (
          <button key={it.key} style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px',
            border: 'none',
            background: active === it.key ? '#fff' : 'transparent',
            boxShadow: active === it.key ? V.shadow : 'none',
            borderRadius: 11, fontFamily: V.bodyFont, fontSize: 13, fontWeight: active === it.key ? 800 : 700,
            color: V.ink, cursor: 'pointer', textAlign: 'left',
          }}>
            <div style={{ width: 26, height: 26, borderRadius: 8, background: it.color, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 2px rgba(40,30,15,.1)', flexShrink: 0 }}>
              <Icon name={it.icon} size={13} stroke="white" strokeWidth={2.4} />
            </div>
            {it.label}
          </button>
        ))}
      </nav>
      <div style={{ marginTop: 'auto', padding: '0 10px', display: 'flex', alignItems: 'center', gap: 8, opacity: 0.9 }}>
        <img src={MASCOT.sleep} width={34} height={34} alt="" style={{ display: 'block' }} />
        <div style={{ fontFamily: V.bodyFont, fontSize: 10, fontWeight: 700, color: V.muted, lineHeight: 1.35 }}>Mình ngủ trưa<br/>tí xíu rồi học tiếp</div>
      </div>
    </aside>
  );
};

// Soft chunky stat pill
const V_TopPill = ({ icon, value, color, fill }) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px 6px 8px',
    background: '#fff', border: `1px solid ${V.border}`, borderRadius: 999, boxShadow: V.shadow,
    fontFamily: V.headFont, fontWeight: 900, fontSize: 13, color: V.ink,
  }}>
    <Icon name={icon} size={18} fill={fill || color} stroke={color} strokeWidth={2.2} />
    <span>{value}</span>
  </div>
);

// Soft chunky card
const V_Card = ({ children, color, style, padding = 16 }) => (
  <div style={{
    background: '#fff', border: `1px solid ${V.border}`, boxShadow: V.shadowMd,
    borderRadius: 18, padding, ...style,
  }}>{children}</div>
);

// ─────────────────────────────────────────────────────────────────────────────
// V Dashboard — Storybook layout · Playground colors · softened
// ─────────────────────────────────────────────────────────────────────────────
const V_Dashboard = () => (
  <V_Frame>
    <V_Sidebar active="home" />
    <main style={{ flex: 1, padding: '20px 30px 24px', overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontFamily: V.bodyFont, fontSize: 11, fontWeight: 800, color: V.muted, letterSpacing: '0.14em', textTransform: 'uppercase' }}>Chương 47 · Thứ tư 13.5</div>
          <h1 style={{ fontFamily: V.headFont, fontSize: 26, fontWeight: 900, lineHeight: 1.05, margin: '4px 0 0', letterSpacing: '-0.02em', color: V.ink }}>
            Chào buổi sáng, <span style={{ color: V.primary }}>bạn</span>!
          </h1>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <V_TopPill icon="flame" value="7" color={V_C.red} fill={V_C.red} />
          <V_TopPill icon="gem" value="248" color={V.gem} fill={V.gem} />
          <V_TopPill icon="heart" value="5" color={V_C.red} fill={V_C.red} />
        </div>
      </div>

      {/* HERO — warm orange card so mascot green pops */}
      <section style={{ position: 'relative', background: `linear-gradient(135deg, #ff8956 0%, #ffa872 100%)`, borderRadius: 22, border: `1px solid rgba(60,20,5,.2)`, boxShadow: '0 4px 0 rgba(60,20,5,.15), 0 8px 24px rgba(255,137,86,.25)', padding: '18px 22px', overflow: 'hidden' }}>
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
          {[[80,30,10],[680,40,8],[760,160,12],[60,180,10],[860,20,6]].map(([x,y,s],i) => (
            <polygon key={i} points={`${x},${y-s} ${x+s*0.3},${y-s*0.3} ${x+s},${y} ${x+s*0.3},${y+s*0.3} ${x},${y+s} ${x-s*0.3},${y+s*0.3} ${x-s},${y} ${x-s*0.3},${y-s*0.3}`} fill="#fff" opacity="0.4" />
          ))}
        </svg>
        <div style={{ display: 'flex', gap: 22, alignItems: 'center', position: 'relative' }}>
          <img src={MASCOT.happy} width={150} height={150} alt="" style={{ flexShrink: 0, filter: 'drop-shadow(0 6px 12px rgba(40,30,15,.25))', animation: 'ngoc-bob 2.5s ease-in-out infinite' }} />
          <div style={{ flex: 1, color: '#fff' }}>
            <div style={{ fontFamily: V.bodyFont, fontSize: 12, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.85)' }}>Hôm nay mình đợi bạn</div>
            <h2 style={{ fontFamily: V.headFont, fontSize: 24, fontWeight: 900, lineHeight: 1.05, margin: '4px 0 8px', letterSpacing: '-0.02em', textShadow: '0 2px 0 rgba(0,0,0,.1)' }}>
              46 từ cần ôn · 10 từ mới
            </h2>
            <p style={{ fontFamily: V.bodyFont, fontSize: 12, fontWeight: 700, margin: 0, color: 'rgba(255,255,255,0.95)' }}>
              Cố thêm <b style={{ fontWeight: 900, background: 'rgba(255,255,255,.25)', padding: '1px 8px', borderRadius: 6 }}>5 ngày nữa</b> là phá kỷ lục 12 ngày ✨
            </p>
            <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
              <button style={{
                padding: '11px 18px', background: '#fff', color: V.primary, border: 'none',
                boxShadow: '0 3px 0 rgba(60,20,5,.15), 0 4px 10px rgba(40,30,15,.08)', borderRadius: 14,
                fontFamily: V.headFont, fontWeight: 900, fontSize: 12, cursor: 'pointer', letterSpacing: '0.02em', display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <Icon name="play" size={13} fill={V.primary} stroke={V.primary} /> ÔN NGAY · 46
              </button>
              <button style={{
                padding: '11px 18px', background: V.primary, color: '#fff', border: 'none',
                boxShadow: `0 3px 0 rgba(60,20,5,.2), 0 4px 10px ${V.primary}50`, borderRadius: 14,
                fontFamily: V.headFont, fontWeight: 900, fontSize: 12, cursor: 'pointer', letterSpacing: '0.02em',
              }}>
                HỌC TỪ MỚI · 10
              </button>
            </div>
          </div>
          <div style={{ flexShrink: 0, width: 132, textAlign: 'center' }}>
            <div style={{ position: 'relative', width: 132, height: 132 }}>
              <svg viewBox="0 0 100 100" style={{ position: 'absolute', inset: 0 }}>
                <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="9" />
                <circle cx="50" cy="50" r="42" fill="none" stroke="#fff" strokeWidth="9" strokeDasharray={`${(4/50) * 264} 264`} strokeLinecap="round" transform="rotate(-90 50 50)" />
              </svg>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                <div style={{ fontFamily: V.bodyFont, fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', opacity: 0.85 }}>Mục tiêu</div>
                <div style={{ fontFamily: V.headFont, fontSize: 26, fontWeight: 900, lineHeight: 1 }}>4<span style={{ opacity: 0.7, fontSize: 15 }}>/50</span></div>
                <div style={{ fontFamily: V.bodyFont, fontSize: 10, fontWeight: 700, opacity: 0.85 }}>lượt ôn</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Calendar streak strip */}
      <V_Card padding={14} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ flexShrink: 0, paddingRight: 14, borderRight: `1px dashed ${V.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 36, height: 36, borderRadius: 11, background: V_C.red, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 4px rgba(255,87,87,.3)' }}>
              <Icon name="flame" size={17} fill="#fff" stroke="#fff" />
            </div>
            <div>
              <div style={{ fontFamily: V.headFont, fontSize: 18, fontWeight: 900, lineHeight: 1 }}>7 ngày</div>
              <div style={{ fontFamily: V.bodyFont, fontSize: 11, fontWeight: 700, color: V.muted }}>kỷ lục: 12</div>
            </div>
          </div>
        </div>
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(14, 1fr)', gap: 4 }}>
          {Array.from({ length: 14 }).map((_, i) => {
            const isPast = i < 7, isToday = i === 7;
            return (
              <div key={i} style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: V.bodyFont, fontSize: 9, fontWeight: 700, color: V.muted }}>{['T2','T3','T4','T5','T6','T7','CN'][i%7]}</div>
                <div style={{
                  marginTop: 3, height: 30, borderRadius: 9,
                  background: isPast ? V.primary : (isToday ? '#fff' : V.panel),
                  border: `1.5px ${isToday ? 'dashed' : 'solid'} ${isPast ? V.primary : (isToday ? V.primary : V.border)}`,
                  boxShadow: isPast ? '0 1px 0 rgba(60,20,5,.1)' : 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {isPast && <Icon name="check" size={14} stroke="#fff" strokeWidth={3.5} />}
                  {isToday && <span style={{ width: 6, height: 6, background: V.accent, borderRadius: '50%' }} />}
                </div>
              </div>
            );
          })}
        </div>
      </V_Card>

      {/* 4 stat tiles */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
        {[
          { value: 12, label: 'Từ mới', sub: 'chờ học', color: V_C.blue, icon: 'sparkle' },
          { value: 38, label: 'Đang học', sub: 'tuần này', color: V_C.orange, icon: 'book' },
          { value: 154, label: 'Đang ôn', sub: 'đã chín', color: V.primary, icon: 'refresh' },
          { value: 73, label: 'Thuộc rồi', sub: '+5 tuần', color: V_C.purple, icon: 'trophy' },
        ].map((s, i) => (
          <V_Card key={i} padding="13px 14px" style={{ position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: -16, right: -16, width: 60, height: 60, borderRadius: '50%', background: s.color, opacity: 0.14 }} />
            <div style={{ width: 32, height: 32, borderRadius: 10, background: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', boxShadow: `0 2px 4px ${s.color}40` }}>
              <Icon name={s.icon} size={15} stroke="#fff" strokeWidth={2.6} fill="#fff" />
            </div>
            <div style={{ fontFamily: V.headFont, fontSize: 24, fontWeight: 900, lineHeight: 1, color: V.ink, marginTop: 8, letterSpacing: '-0.02em', position: 'relative' }}>{s.value}</div>
            <div style={{ fontFamily: V.bodyFont, fontSize: 12, fontWeight: 800, color: V.inkSoft, marginTop: 1, position: 'relative' }}>{s.label}</div>
            <div style={{ fontFamily: V.bodyFont, fontSize: 11, fontWeight: 700, color: V.muted, position: 'relative' }}>{s.sub}</div>
          </V_Card>
        ))}
      </section>

      {/* Activity + decks */}
      <section style={{ display: 'grid', gridTemplateColumns: '1.15fr 1fr', gap: 12 }}>
        <V_Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
            <h3 style={{ fontFamily: V.headFont, fontSize: 15, fontWeight: 900, margin: 0, color: V.ink }}>Nhịp 30 ngày</h3>
            <div style={{ display: 'flex', gap: 10, fontFamily: V.bodyFont, fontSize: 11, fontWeight: 800, color: V.inkSoft }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 10, height: 10, background: V_C.blue, borderRadius: 3 }}/>Mới</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 10, height: 10, background: V.primary, borderRadius: 3 }}/>Ôn</span>
            </div>
          </div>
          <MiniActivityChart data={sampleActivity} width={460} height={150} palette={[V_C.blue, V.primary]} grid="#1a241010" label={V.muted} barRadius={3} />
          <div style={{ marginTop: 10, padding: '8px 12px', background: V.primarySoft, borderRadius: 12, fontFamily: V.bodyFont, fontSize: 12, fontWeight: 700, color: V.inkSoft, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon name="bolt" size={14} fill={V.primary} stroke={V.primary} /> Học 7 ngày liên tiếp — đỉnh quá! Tuần tới mở huy hiệu mới.
          </div>
        </V_Card>

        <V_Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <h3 style={{ fontFamily: V.headFont, fontSize: 15, fontWeight: 900, margin: 0, color: V.ink }}>Bộ từ</h3>
            <button style={{ background: 'transparent', border: 'none', fontFamily: V.bodyFont, fontWeight: 800, color: V.primary, cursor: 'pointer', fontSize: 12 }}>Xem tất cả →</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {sampleDecks.map((d, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 10px', background: V.panel, borderRadius: 12 }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: d.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: V.headFont, fontWeight: 900, fontSize: 12, color: '#fff', boxShadow: `0 2px 4px ${d.color}50`, flexShrink: 0 }}>
                  {d.name[0]}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: V.headFont, fontSize: 12, fontWeight: 800, color: V.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.name}</div>
                  <div style={{ height: 6, background: '#fff', border: `1px solid ${V.border}`, borderRadius: 999, marginTop: 4, overflow: 'hidden' }}>
                    <div style={{ width: `${(d.mastered / d.total) * 100}%`, height: '100%', background: d.color }} />
                  </div>
                </div>
                <div style={{ fontFamily: V.headFont, fontWeight: 900, fontSize: 12, color: V.ink, flexShrink: 0 }}>{Math.round((d.mastered / d.total) * 100)}%</div>
              </div>
            ))}
          </div>
        </V_Card>
      </section>
    </main>
  </V_Frame>
);

// ─────────────────────────────────────────────────────────────────────────────
// V Review · Typing — NO mascot beside, but extra cute via shape/copy/sparkles
// ─────────────────────────────────────────────────────────────────────────────
const V_ReviewTyping = () => (
  <V_Frame>
    <V_Sidebar active="review" />
    <main style={{ flex: 1, padding: '22px 32px', display: 'flex', flexDirection: 'column', gap: 20, position: 'relative' }}>
      {/* top progress bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button style={{ width: 36, height: 36, borderRadius: 12, background: '#fff', border: `1px solid ${V.border}`, boxShadow: V.shadow, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="arrowLeft" size={17} stroke={V.ink} strokeWidth={2.4} />
        </button>
        <div style={{ flex: 1, height: 14, background: '#fff', border: `1px solid ${V.border}`, borderRadius: 999, overflow: 'hidden' }}>
          <div style={{ width: '26%', height: '100%', background: `linear-gradient(90deg, ${V.primary}, #6cb83a)`, borderRadius: 999, position: 'relative' }}>
            <div style={{ position: 'absolute', top: 2, left: 4, right: 4, height: 4, background: 'rgba(255,255,255,.45)', borderRadius: 999 }} />
          </div>
        </div>
        <span style={{ fontFamily: V.bodyFont, fontSize: 12, fontWeight: 800, color: V.inkSoft }}>12 / 46</span>
        <V_TopPill icon="heart" value="5" color={V_C.red} fill={V_C.red} />
      </div>

      {/* Center stage */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 22, position: 'relative' }}>
        {/* Floating sparkles */}
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
          {[
            [120, 100, 8, V_C.yellow, 0],
            [780, 90, 7, V_C.pink, 0.5],
            [220, 380, 10, V_C.blue, 1.1],
            [820, 360, 9, V.primary, 0.3],
            [690, 250, 6, V_C.purple, 0.8],
            [140, 280, 7, V_C.orange, 1.4],
          ].map(([x,y,s,c,d],i) => (
            <g key={i} style={{ animation: `sparkle-twinkle 2.2s ease-in-out ${d}s infinite`, transformOrigin: `${x}px ${y}px` }}>
              <polygon points={`${x},${y-s} ${x+s*0.32},${y-s*0.32} ${x+s},${y} ${x+s*0.32},${y+s*0.32} ${x},${y+s} ${x-s*0.32},${y+s*0.32} ${x-s},${y} ${x-s*0.32},${y-s*0.32}`} fill={c} />
            </g>
          ))}
        </svg>

        {/* Image polaroid-style */}
        <div style={{ position: 'relative', transform: 'rotate(-1.5deg)' }}>
          <div style={{ background: '#fff', padding: 8, borderRadius: 12, boxShadow: '0 8px 22px rgba(40,30,15,.1), 0 2px 4px rgba(40,30,15,.06)' }}>
            <div style={{ width: 280, height: 130, background: V_C.orange + '20', borderRadius: 8, overflow: 'hidden' }}>
              <svg width="100%" height="100%" viewBox="0 0 280 130" preserveAspectRatio="xMidYMid slice">
                <rect width="280" height="130" fill="#ffe4d4"/>
                <rect x="80" y="44" width="120" height="42" rx="6" fill="#fff" stroke="rgba(40,30,15,.12)" strokeWidth="1.5"/>
                <circle cx="105" cy="65" r="9" fill={V.gem}/>
                <rect x="125" y="58" width="48" height="4" rx="2" fill={V.ink}/>
                <rect x="125" y="70" width="36" height="3" rx="1" fill={V.inkSoft} opacity="0.5"/>
              </svg>
            </div>
          </div>
        </div>

        {/* Speech-bubble-shaped prompt — soft mint pastel */}
        <div style={{ position: 'relative', maxWidth: 620 }}>
          <div style={{
            background: V.primarySoft, color: V.ink, padding: '18px 30px',
            borderRadius: 28, border: `1px solid ${V.primary}30`,
            boxShadow: `0 4px 0 ${V.primary}25, 0 6px 18px rgba(122,193,67,.15)`,
            textAlign: 'center', position: 'relative',
          }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <Icon name="sparkle" size={14} stroke={V.primary} fill={V.primary} strokeWidth={2.4} />
              <span style={{ fontFamily: V.bodyFont, fontSize: 11, fontWeight: 800, color: V.primary, letterSpacing: '0.16em', textTransform: 'uppercase' }}>Hãy dịch giúp mình</span>
              <Icon name="sparkle" size={14} stroke={V.primary} fill={V.primary} strokeWidth={2.4} />
            </div>
            <div style={{ fontFamily: V.headFont, fontSize: 26, fontWeight: 900, color: V.ink, letterSpacing: '-0.01em', lineHeight: 1.2 }}>
              "Ưu đãi, dành sự ưu tiên."
            </div>
            {/* bubble tail bottom */}
            <div style={{ position: 'absolute', bottom: -10, left: '50%', transform: 'translateX(-50%)', width: 22, height: 22, background: V.primarySoft, border: `1px solid ${V.primary}30`, borderTop: 'none', borderLeft: 'none', borderRadius: '0 0 8px 0', transform: 'translateX(-50%) rotate(45deg)' }} />
          </div>
        </div>

        {/* Input field */}
        <div style={{ width: 560 }}>
          <div style={{ position: 'relative' }}>
            <input
              defaultValue="prefer"
              style={{
                width: '100%', padding: '18px 22px', fontSize: 21, fontFamily: V.headFont, fontWeight: 800,
                background: '#fff', border: `2px solid ${V.primary}`, borderRadius: 18,
                boxShadow: `0 4px 0 ${V.primary}30, 0 6px 14px rgba(122,193,67,.18)`,
                color: V.ink, outline: 'none', letterSpacing: '0.02em', textAlign: 'center',
                boxSizing: 'border-box',
              }}
              placeholder="Gõ tiếng Anh…"
            />
          </div>
          <div style={{ marginTop: 14, display: 'flex', justifyContent: 'center' }}>
            <button style={{
              padding: '12px 32px', background: V.primary, color: '#fff', border: 'none',
              boxShadow: `0 4px 0 rgba(60,20,5,.18), 0 6px 14px rgba(122,193,67,.3)`,
              borderRadius: 16, fontFamily: V.headFont, fontWeight: 900, fontSize: 13, letterSpacing: '0.04em', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>KIỂM TRA <Icon name="arrowRight" size={16} stroke="#fff" strokeWidth={3} /></button>
          </div>
          <div style={{ marginTop: 12, textAlign: 'center', fontFamily: V.bodyFont, fontSize: 12, fontWeight: 700, color: V.muted, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6 }}>
            <Icon name="heart" size={13} fill={V_C.red} stroke={V_C.red} /> Không nhớ? Cứ đoán — sai không sao đâu!
          </div>
        </div>
      </div>
    </main>
  </V_Frame>
);

// ─────────────────────────────────────────────────────────────────────────────
// V Review · Reveal — Reader's Desk layout · soft chunky
// ─────────────────────────────────────────────────────────────────────────────
const V_CharDiffBox = ({ guess, answer }) => {
  const ansChars = answer.split('');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <div style={{ fontFamily: V.monoFont, fontSize: 21, letterSpacing: '0.08em', display: 'flex', gap: 3 }}>
        {guess.split('').map((c, i) => {
          const correct = ansChars[i] === c;
          const inWord = !correct && answer.includes(c);
          const color = correct ? V.primary : (inWord ? V_C.orange : V_C.red);
          return <span key={i} style={{ color, fontWeight: 700, textDecoration: correct ? 'none' : 'line-through' }}>{c}</span>;
        })}
      </div>
      <Icon name="arrowRight" size={16} stroke={V.muted} style={{ transform: 'rotate(90deg)' }} />
      <div style={{ fontFamily: V.monoFont, fontSize: 28, color: V.primary, fontWeight: 700, letterSpacing: '0.02em' }}>{answer}</div>
    </div>
  );
};

const V_ReviewReveal = () => (
  <V_Frame>
    <V_Sidebar active="review" />
    <main style={{ flex: 1, padding: '18px 32px 24px', overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* progress + xp */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ fontFamily: V.bodyFont, fontSize: 12, fontWeight: 800, color: V.inkSoft, letterSpacing: '0.08em', textTransform: 'uppercase', flexShrink: 0 }}>Thẻ 12 / 46</div>
        <div style={{ flex: 1, height: 12, background: '#fff', border: `1px solid ${V.border}`, borderRadius: 999, overflow: 'hidden' }}>
          <div style={{ width: '28%', height: '100%', background: `linear-gradient(90deg, ${V.primary}, #6cb83a)`, borderRadius: 999 }} />
        </div>
        <V_TopPill icon="heart" value="5" color={V_C.red} fill={V_C.red} />
        <V_TopPill icon="bolt" value="+12" color={V.gem} fill={V.gem} />
      </div>

      {/* Big word header */}
      <header style={{ paddingBottom: 12, borderBottom: `1px solid ${V.border}` }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <span style={{ background: V_C.purple, color: '#fff', boxShadow: '0 2px 6px rgba(193,121,214,.35)', borderRadius: 999, padding: '3px 12px', fontFamily: V.headFont, fontWeight: 900, fontSize: 11, letterSpacing: '0.08em' }}>ADJECTIVE</span>
          <span style={{ fontFamily: V.bodyFont, fontSize: 12, fontWeight: 700, color: V.muted }}>· bạn đã gặp 3 lần</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 18, marginTop: 6, flexWrap: 'wrap' }}>
          <h1 style={{ fontFamily: V.headFont, fontSize: 50, fontWeight: 900, margin: 0, letterSpacing: '-0.03em', color: V.ink, lineHeight: 1.05, display: 'inline-block', position: 'relative' }}>
            <span style={{ position: 'absolute', left: -2, right: -2, bottom: 2, height: '34%', background: V.primary, opacity: 0.28, zIndex: 0, borderRadius: 4 }} />
            <span style={{ position: 'relative', zIndex: 1 }}>{sampleWord.en}</span>
          </h1>
          <span style={{ fontFamily: V.monoFont, fontSize: 15, color: V.accent, fontWeight: 600 }}>{sampleWord.ipa}</span>
          <div style={{ display: 'flex', gap: 4, marginLeft: 'auto', alignSelf: 'center' }}>
            {[1,2,3,4,5,6].map(n => {
              const cols = [V_C.red, V_C.orange, V.primary, V_C.blue, V_C.purple, V_C.pink];
              return (
                <button key={n} style={{
                  width: 28, height: 28, background: n === 2 ? cols[n-1] : '#fff', border: `1px solid ${V.border}`,
                  boxShadow: n === 2 ? `0 3px 0 rgba(60,20,5,.12), 0 4px 8px ${cols[n-1]}40` : V.shadow,
                  borderRadius: 9, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon name="play" size={10} fill={n === 2 ? '#fff' : cols[n-1]} stroke={n === 2 ? '#fff' : cols[n-1]} />
                </button>
              );
            })}
          </div>
        </div>
      </header>

      <section style={{ display: 'grid', gridTemplateColumns: '1.25fr 1fr', gap: 20, alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* char diff tinted box */}
          <div style={{ background: V.primarySoft, border: `1px solid ${V.primary}50`, borderRadius: 16, padding: '14px 18px', boxShadow: `0 3px 0 ${V.primary}25, 0 6px 18px rgba(122,193,67,.12)` }}>
            <div style={{ fontFamily: V.headFont, fontSize: 12, fontWeight: 900, color: V.primary, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10, textAlign: 'center' }}>BẠN GÕ "prefer" → ĐÁP ÁN</div>
            <V_CharDiffBox guess="prefer" answer="preferential" />
            <div style={{ marginTop: 12, display: 'flex', gap: 14, justifyContent: 'center', fontFamily: V.bodyFont, fontSize: 11, fontWeight: 700, color: V.inkSoft }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 10, height: 10, background: V.primary, borderRadius: 2 }}/>đúng vị trí</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 10, height: 10, background: V_C.orange, borderRadius: 2 }}/>sai vị trí</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 10, height: 10, background: V_C.red, borderRadius: 2 }}/>không có</span>
            </div>
          </div>

          {/* meaning */}
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <div style={{ width: 5, alignSelf: 'stretch', background: V.accent, borderRadius: 3, flexShrink: 0 }} />
            <div>
              <div style={{ fontFamily: V.bodyFont, fontSize: 11, fontWeight: 900, color: V.accent, letterSpacing: '0.15em', textTransform: 'uppercase' }}>Nghĩa</div>
              <div style={{ fontFamily: V.headFont, fontSize: 18, fontWeight: 800, color: V.ink, marginTop: 2 }}>Ưu đãi, dành sự ưu tiên</div>
            </div>
          </div>

          {/* example */}
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <div style={{ width: 5, alignSelf: 'stretch', background: V_C.blue, borderRadius: 3, flexShrink: 0 }} />
            <div>
              <div style={{ fontFamily: V.bodyFont, fontSize: 11, fontWeight: 900, color: V_C.blue, letterSpacing: '0.15em', textTransform: 'uppercase' }}>Ví dụ</div>
              <p style={{ fontFamily: V.headFont, fontSize: 16, fontWeight: 800, color: V.ink, margin: '4px 0 4px', lineHeight: 1.35 }}>
                Club members received <span style={{ background: V.primarySoft, color: V.primary, padding: '0 6px', borderRadius: 5 }}>preferential</span> seating.
              </p>
              <p style={{ fontFamily: V.bodyFont, fontSize: 12, fontWeight: 600, color: V.inkSoft, margin: 0, lineHeight: 1.5 }}>Các thành viên câu lạc bộ nhận được chỗ ngồi ưu đãi.</p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Image card */}
          <V_Card padding={6}>
            <div style={{ width: '100%', height: 130, background: V_C.orange + '20', borderRadius: 12, overflow: 'hidden' }}>
              <svg width="100%" height="100%" viewBox="0 0 280 130" preserveAspectRatio="xMidYMid slice">
                <rect width="280" height="130" fill="#ffe4d4"/>
                <rect x="80" y="44" width="120" height="42" rx="6" fill="#fff" stroke="rgba(40,30,15,.12)" strokeWidth="1.5"/>
                <circle cx="105" cy="65" r="9" fill={V.gem}/>
                <rect x="125" y="58" width="48" height="4" rx="2" fill={V.ink}/>
                <rect x="125" y="70" width="36" height="3" rx="1" fill={V.inkSoft} opacity="0.5"/>
              </svg>
            </div>
          </V_Card>

          {/* Collocations */}
          <div>
            <div style={{ fontFamily: V.bodyFont, fontSize: 11, fontWeight: 900, color: V_C.purple, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 8 }}>Thường đi cùng</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {sampleWord.collocations.map((c, i) => {
                const cols = [V_C.pink, V_C.teal, V_C.yellow];
                return (
                  <div key={c} style={{ background: '#fff', border: `1px solid ${V.border}`, boxShadow: V.shadow, borderRadius: 12, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 8, height: 8, background: cols[i], borderRadius: 2, flexShrink: 0 }} />
                    <span style={{ fontFamily: V.bodyFont, fontSize: 12, fontWeight: 700, color: V.ink }}>
                      {c.split('preferential').map((part, j, arr) => (
                        <React.Fragment key={j}>
                          {part}
                          {j < arr.length - 1 && <b style={{ color: V.primary }}>preferential</b>}
                        </React.Fragment>
                      ))}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {['Oxford', 'YouGlish', 'ozdic'].map(s => (
              <a key={s} style={{ padding: '5px 10px', fontFamily: V.bodyFont, fontSize: 12, fontWeight: 700, color: V.inkSoft, border: `1px solid ${V.border}`, borderRadius: 999, background: '#fff', textDecoration: 'none' }}>{s} ↗</a>
            ))}
          </div>
        </div>
      </section>

      {/* Rating row */}
      <section style={{ borderTop: `1px solid ${V.border}`, paddingTop: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
          <div style={{ fontFamily: V.bodyFont, fontSize: 12, fontWeight: 800, color: V.inkSoft }}>Bạn thấy thế nào? <span style={{ fontWeight: 700, color: V.muted }}>(lịch ôn lại tự điều chỉnh)</span></div>
          <div style={{ fontFamily: V.bodyFont, fontSize: 11, fontWeight: 700, color: V.muted }}>Phím <kbd style={{ fontFamily: V.monoFont, background: '#fff', border: `1px solid ${V.border}`, borderRadius: 4, padding: '0 5px', fontWeight: 700 }}>1</kbd>—<kbd style={{ fontFamily: V.monoFont, background: '#fff', border: `1px solid ${V.border}`, borderRadius: 4, padding: '0 5px', fontWeight: 700 }}>4</kbd></div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
          {[
            { key: 1, label: 'LẠI', sub: '< 1 phút', emoji: '😵', bg: V_C.red },
            { key: 2, label: 'KHÓ', sub: '10 phút', emoji: '😬', bg: V_C.orange },
            { key: 3, label: 'TỐT', sub: '1 ngày', emoji: '😊', bg: V.primary },
            { key: 4, label: 'DỄ', sub: '4 ngày', emoji: '🎉', bg: V.gem },
          ].map(b => (
            <button key={b.key} style={{
              padding: '12px 14px', background: b.bg, border: 'none',
              boxShadow: `0 4px 0 rgba(60,20,5,.15), 0 6px 14px ${b.bg}40`,
              borderRadius: 14, cursor: 'pointer', textAlign: 'left', color: '#fff', display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <div style={{ fontSize: 21, lineHeight: 1, flexShrink: 0 }}>{b.emoji}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: V.headFont, fontSize: 14, fontWeight: 900, letterSpacing: '0.06em', lineHeight: 1 }}>{b.label}</div>
                <div style={{ fontFamily: V.bodyFont, fontSize: 11, fontWeight: 700, opacity: 0.9, marginTop: 2 }}>ôn sau {b.sub}</div>
              </div>
              <kbd style={{ fontFamily: V.monoFont, fontSize: 12, fontWeight: 800, background: 'rgba(0,0,0,.18)', color: '#fff', borderRadius: 5, padding: '2px 7px', flexShrink: 0 }}>{b.key}</kbd>
            </button>
          ))}
        </div>
      </section>
    </main>
  </V_Frame>
);

Object.assign(window, { V, V_C, V_Sidebar, V_TopPill, V_Card, V_Frame, V_PortfolioTopNav, V_Dashboard, V_ReviewTyping, V_ReviewReveal });
