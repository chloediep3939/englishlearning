// app-mobile.jsx — Mobile screens for Bún app (matches landing style)
// 402px wide. Shared bottom tab bar. Reuses V tokens + MASCOT + Icon + sampleWord.

// ─────────────────────────────────────────────────────────────────────────────
// Status bar (mobile-style)
const MStatusBar = ({ time = '9:41', dark = false }) => {
  const c = dark ? '#fff' : V.ink;
  return (
    <div style={{ height: 36, padding: '0 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontFamily: '-apple-system, "SF Pro", system-ui', fontSize: 14, fontWeight: 700, color: c, flexShrink: 0 }}>
      <span>{time}</span>
      <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
        <svg width="16" height="10" viewBox="0 0 16 10"><rect x="0" y="6" width="3" height="4" rx="0.5" fill={c}/><rect x="4" y="4" width="3" height="6" rx="0.5" fill={c}/><rect x="8" y="2" width="3" height="8" rx="0.5" fill={c}/><rect x="12" y="0" width="3" height="10" rx="0.5" fill={c}/></svg>
        <svg width="22" height="11" viewBox="0 0 22 11"><rect x="0.5" y="0.5" width="19" height="10" rx="2.5" stroke={c} fill="none" opacity="0.4"/><rect x="2" y="2" width="16" height="7" rx="1.2" fill={c}/><rect x="20" y="3.5" width="1.5" height="4" rx="0.5" fill={c} opacity="0.4"/></svg>
      </div>
    </div>
  );
};

// Bottom tab bar
const MTabBar = ({ active = 'home' }) => {
  const tabs = [
    { key: 'home', label: 'Tổng quan', icon: 'home', color: V.primary },
    { key: 'review', label: 'Ôn tập', icon: 'refresh', color: V_C.blue },
    { key: 'add', label: 'Thêm', icon: 'plus', color: BUN_BLUE },
    { key: 'decks', label: 'Bộ từ', icon: 'folder', color: V_C.pink },
    { key: 'more', label: 'Khác', icon: 'settings', color: V.muted },
  ];
  return (
    <nav style={{
      position: 'sticky', bottom: 0, zIndex: 30, background: '#fff',
      borderTop: `1px solid ${V.border}`,
      padding: '8px 10px 14px', display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 4, flexShrink: 0,
    }}>
      {tabs.map(t => {
        const on = active === t.key;
        const isAdd = t.key === 'add';
        if (isAdd) {
          return (
            <button key={t.key} style={{
              border: 'none', background: 'transparent', padding: 0, cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
            }}>
              <div style={{
                width: 44, height: 44, borderRadius: 14, background: BUN_BLUE, marginTop: -16,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: `0 4px 0 rgba(20,40,80,.2), 0 6px 14px ${BUN_BLUE}66`,
              }}>
                <Icon name="plus" size={22} stroke="#fff" strokeWidth={3} />
              </div>
              <span style={{ fontFamily: V.bodyFont, fontSize: 9.5, fontWeight: 800, color: BUN_BLUE }}>{t.label}</span>
            </button>
          );
        }
        return (
          <button key={t.key} style={{
            border: 'none', background: 'transparent', padding: '4px 0', cursor: 'pointer',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
          }}>
            <Icon name={t.icon} size={20} stroke={on ? t.color : V.muted} fill="none" strokeWidth={on ? 2.6 : 2.2} />
            <span style={{ fontFamily: V.bodyFont, fontSize: 10, fontWeight: on ? 900 : 700, color: on ? t.color : V.muted }}>{t.label}</span>
          </button>
        );
      })}
    </nav>
  );
};

// Generic mobile shell
const MAppShell = ({ active, children, statusDark = false }) => (
  <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: V.bg, fontFamily: V.bodyFont, color: V.ink, overflow: 'hidden' }}>
    <MStatusBar dark={statusDark} />
    <main style={{ flex: 1, overflow: 'auto' }}>{children}</main>
    <MTabBar active={active} />
  </div>
);

// Stat pill (top of dashboard)
const MStatPill = ({ icon, value, color, fill }) => (
  <div style={{
    display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 10px 5px 7px',
    background: '#fff', border: `1px solid ${V.border}`, borderRadius: 999, boxShadow: V.shadow,
    fontFamily: V.headFont, fontWeight: 900, fontSize: 12, color: V.ink,
  }}>
    <Icon name={icon} size={14} fill={fill || color} stroke={color} strokeWidth={2.2} />
    <span>{value}</span>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// SCREEN 1 · Dashboard
// ─────────────────────────────────────────────────────────────────────────────
const MDashboard = () => (
  <MAppShell active="home">
    <div style={{ padding: '8px 18px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontFamily: V.bodyFont, fontSize: 10, fontWeight: 900, color: V.muted, letterSpacing: '0.14em', textTransform: 'uppercase' }}>Chương 47 · T4 13.5</div>
          <h1 style={{ fontFamily: V.headFont, fontSize: 24, fontWeight: 1000, lineHeight: 1.0, margin: '3px 0 0', letterSpacing: '-0.025em', color: V.ink }}>
            Chào buổi sáng, <span style={{ color: BUN_BLUE }}>bạn</span>!
          </h1>
        </div>
        <div style={{ display: 'flex', gap: 5 }}>
          <MStatPill icon="flame" value="7" color={V_C.red} fill={V_C.red} />
          <MStatPill icon="gem" value="248" color={V.gem} fill={V.gem} />
        </div>
      </div>

      {/* HERO card */}
      <section style={{ position: 'relative', background: `linear-gradient(135deg, ${BUN_BLUE} 0%, #1e87c0 100%)`, borderRadius: 20, boxShadow: `0 4px 0 rgba(20,40,80,.15), 0 8px 20px ${BUN_BLUE}40`, padding: '16px 16px 18px', overflow: 'hidden' }}>
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
          {[[40, 22, 7], [330, 30, 6], [340, 130, 8], [30, 140, 7]].map(([x, y, s], i) => (
            <polygon key={i} points={`${x},${y-s} ${x+s*0.3},${y-s*0.3} ${x+s},${y} ${x+s*0.3},${y+s*0.3} ${x},${y+s} ${x-s*0.3},${y+s*0.3} ${x-s},${y} ${x-s*0.3},${y-s*0.3}`} fill="#fff" opacity="0.4" />
          ))}
        </svg>
        <div style={{ position: 'relative', display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
          <img src={MASCOT.happy} width={70} height={70} alt="" style={{ filter: 'drop-shadow(0 4px 8px rgba(20,40,80,.25))', animation: 'ngoc-bob 2.5s ease-in-out infinite' }} />
          <div style={{ flex: 1, color: '#fff' }}>
            <div style={{ fontFamily: V.bodyFont, fontSize: 10, fontWeight: 900, letterSpacing: '0.1em', textTransform: 'uppercase', opacity: 0.85 }}>Hôm nay</div>
            <div style={{ fontFamily: V.headFont, fontSize: 18, fontWeight: 1000, lineHeight: 1.1, marginTop: 2, letterSpacing: '-0.015em' }}>46 từ ôn<br/>+ 10 từ mới</div>
          </div>
          <div style={{ width: 70, height: 70, position: 'relative', flexShrink: 0 }}>
            <svg viewBox="0 0 100 100" style={{ position: 'absolute', inset: 0 }}>
              <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="9" />
              <circle cx="50" cy="50" r="42" fill="none" stroke="#fff" strokeWidth="9" strokeDasharray={`${(4/50) * 264} 264`} strokeLinecap="round" transform="rotate(-90 50 50)" />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
              <div style={{ fontFamily: V.headFont, fontSize: 16, fontWeight: 1000, lineHeight: 1 }}>4<span style={{ opacity: 0.7, fontSize: 10 }}>/50</span></div>
              <div style={{ fontFamily: V.bodyFont, fontSize: 8, fontWeight: 800, opacity: 0.85 }}>mục tiêu</div>
            </div>
          </div>
        </div>
        <div style={{ position: 'relative', display: 'flex', gap: 8 }}>
          <button className="bun-cta-btn" style={{
            flex: 1, padding: '12px 14px', background: '#fff', color: BUN_BLUE, border: 'none',
            boxShadow: '0 3px 0 rgba(20,40,80,.15), 0 3px 8px rgba(40,30,15,.1)', borderRadius: 13,
            fontFamily: V.headFont, fontWeight: 1000, fontSize: 12, cursor: 'pointer', letterSpacing: '0.02em',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
          }}>
            <Icon name="play" size={11} fill={BUN_BLUE} stroke={BUN_BLUE} /> ÔN · 46
          </button>
          <button className="bun-cta-btn" style={{
            flex: 1, padding: '12px 14px', background: 'rgba(255,255,255,0.22)', color: '#fff', border: '1.5px solid rgba(255,255,255,0.5)',
            borderRadius: 13, fontFamily: V.headFont, fontWeight: 1000, fontSize: 12, cursor: 'pointer', letterSpacing: '0.02em',
          }}>HỌC MỚI · 10</button>
        </div>
      </section>

      {/* Streak bar */}
      <div style={{ background: '#fff', border: `1px solid ${V.border}`, boxShadow: V.shadowMd, borderRadius: 14, padding: '12px 14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 9, background: V_C.red, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 4px rgba(255,87,87,.3)' }}>
              <Icon name="flame" size={14} fill="#fff" stroke="#fff" />
            </div>
            <div>
              <div style={{ fontFamily: V.headFont, fontSize: 15, fontWeight: 1000, lineHeight: 1 }}>7 ngày</div>
              <div style={{ fontFamily: V.bodyFont, fontSize: 10, fontWeight: 700, color: V.muted }}>kỷ lục: 12</div>
            </div>
          </div>
          <div style={{ fontFamily: V.bodyFont, fontSize: 11, fontWeight: 800, color: V.primary }}>+5 phá kỷ lục</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(14, 1fr)', gap: 3 }}>
          {Array.from({ length: 14 }).map((_, i) => {
            const isPast = i < 7, isToday = i === 7;
            return (
              <div key={i} style={{
                height: 22, borderRadius: 6,
                background: isPast ? V.primary : (isToday ? '#fff' : V.panel),
                border: `1.5px ${isToday ? 'dashed' : 'solid'} ${isPast ? V.primary : (isToday ? V.primary : V.border)}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {isPast && <Icon name="check" size={10} stroke="#fff" strokeWidth={3.5} />}
                {isToday && <span style={{ width: 5, height: 5, background: V.accent, borderRadius: '50%' }} />}
              </div>
            );
          })}
        </div>
      </div>

      {/* Stat tiles 2x2 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {[
          { value: 12, label: 'Từ mới', sub: 'chờ học', color: V_C.blue, icon: 'sparkle' },
          { value: 38, label: 'Đang học', sub: 'tuần này', color: V_C.orange, icon: 'book' },
          { value: 154, label: 'Đang ôn', sub: 'đã chín', color: V.primary, icon: 'refresh' },
          { value: 73, label: 'Thuộc rồi', sub: '+5 tuần', color: V_C.purple, icon: 'trophy' },
        ].map((s, i) => (
          <div key={i} style={{ position: 'relative', background: '#fff', border: `1px solid ${V.border}`, boxShadow: V.shadow, borderRadius: 14, padding: '12px 12px 10px', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: -14, right: -14, width: 50, height: 50, borderRadius: '50%', background: s.color, opacity: 0.14 }} />
            <div style={{ width: 26, height: 26, borderRadius: 8, background: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', boxShadow: `0 2px 4px ${s.color}40` }}>
              <Icon name={s.icon} size={13} stroke="#fff" strokeWidth={2.6} fill="#fff" />
            </div>
            <div style={{ fontFamily: V.headFont, fontSize: 22, fontWeight: 1000, lineHeight: 1, color: V.ink, marginTop: 6, letterSpacing: '-0.02em', position: 'relative' }}>{s.value}</div>
            <div style={{ fontFamily: V.bodyFont, fontSize: 11, fontWeight: 800, color: V.inkSoft, marginTop: 2, position: 'relative' }}>{s.label}</div>
            <div style={{ fontFamily: V.bodyFont, fontSize: 10, fontWeight: 700, color: V.muted, position: 'relative' }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Decks preview */}
      <div style={{ background: '#fff', border: `1px solid ${V.border}`, boxShadow: V.shadowMd, borderRadius: 14, padding: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <h3 style={{ fontFamily: V.headFont, fontSize: 14, fontWeight: 1000, margin: 0, color: V.ink }}>Bộ từ</h3>
          <a className="bun-footer-link" style={{ fontFamily: V.bodyFont, fontWeight: 800, color: BUN_BLUE, fontSize: 11, textDecoration: 'none' }}>Tất cả →</a>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {sampleDecks.slice(0, 3).map((d, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '6px 8px', background: V.panel, borderRadius: 10 }}>
              <div style={{ width: 30, height: 30, borderRadius: 9, background: d.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: V.headFont, fontWeight: 1000, fontSize: 11, color: '#fff', flexShrink: 0 }}>{d.name[0]}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: V.headFont, fontSize: 11, fontWeight: 900, color: V.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.name}</div>
                <div style={{ height: 5, background: '#fff', border: `1px solid ${V.border}`, borderRadius: 999, marginTop: 3, overflow: 'hidden' }}>
                  <div style={{ width: `${(d.mastered / d.total) * 100}%`, height: '100%', background: d.color }} />
                </div>
              </div>
              <div style={{ fontFamily: V.headFont, fontWeight: 1000, fontSize: 11, color: V.ink, flexShrink: 0 }}>{Math.round((d.mastered / d.total) * 100)}%</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </MAppShell>
);

// ─────────────────────────────────────────────────────────────────────────────
// SCREEN 2 · Flashcard typing
// ─────────────────────────────────────────────────────────────────────────────
const MFlashcardTyping = () => (
  <MAppShell active="review">
    <div style={{ padding: '8px 18px 18px', display: 'flex', flexDirection: 'column', gap: 16, height: '100%', boxSizing: 'border-box' }}>
      {/* Top progress */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button style={{ width: 34, height: 34, borderRadius: 11, background: '#fff', border: `1px solid ${V.border}`, boxShadow: V.shadow, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon name="arrowLeft" size={16} stroke={V.ink} strokeWidth={2.4} />
        </button>
        <div style={{ flex: 1, height: 12, background: '#fff', border: `1px solid ${V.border}`, borderRadius: 999, overflow: 'hidden' }}>
          <div style={{ width: '26%', height: '100%', background: `linear-gradient(90deg, ${BUN_BLUE}, #6cc4ed)`, borderRadius: 999, position: 'relative' }}>
            <div style={{ position: 'absolute', top: 2, left: 4, right: 4, height: 3, background: 'rgba(255,255,255,.45)', borderRadius: 999 }} />
          </div>
        </div>
        <span style={{ fontFamily: V.bodyFont, fontSize: 11, fontWeight: 900, color: V.inkSoft, flexShrink: 0 }}>12/46</span>
        <MStatPill icon="heart" value="5" color={V_C.red} fill={V_C.red} />
      </div>

      {/* Center stage */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 18, position: 'relative' }}>
        <Sparkles items={[[40, 40, 7, V_C.yellow, 0], [330, 50, 8, V_C.pink, 0.5], [60, 280, 6, BUN_BLUE, 1.1]]} />

        {/* polaroid image */}
        <div style={{ background: '#fff', padding: 6, borderRadius: 10, boxShadow: '0 6px 14px rgba(40,30,15,.1)', transform: 'rotate(-1.5deg)' }}>
          <div style={{ width: 200, height: 100, background: '#ffe4d4', borderRadius: 6, overflow: 'hidden' }}>
            <svg width="100%" height="100%" viewBox="0 0 200 100" preserveAspectRatio="xMidYMid slice">
              <rect width="200" height="100" fill="#ffe4d4"/>
              <rect x="55" y="34" width="90" height="32" rx="5" fill="#fff" stroke="rgba(40,30,15,.12)" strokeWidth="1.5"/>
              <circle cx="75" cy="50" r="7" fill={V.gem}/>
              <rect x="90" y="44" width="38" height="3" rx="1" fill={V.ink}/>
              <rect x="90" y="54" width="28" height="2.5" rx="1" fill={V.inkSoft} opacity="0.5"/>
            </svg>
          </div>
        </div>

        {/* Speech-bubble prompt */}
        <div style={{ background: BUN_BLUE_SOFT, color: V.ink, padding: '14px 22px', borderRadius: 22, border: `1px solid ${BUN_BLUE}30`, boxShadow: `0 3px 0 ${BUN_BLUE}25, 0 5px 14px ${BUN_BLUE}18`, textAlign: 'center', position: 'relative', maxWidth: 320 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
            <Icon name="sparkle" size={11} stroke={BUN_BLUE} fill={BUN_BLUE} strokeWidth={2.4} />
            <span style={{ fontFamily: V.bodyFont, fontSize: 9, fontWeight: 900, color: BUN_BLUE, letterSpacing: '0.16em', textTransform: 'uppercase' }}>Hãy dịch</span>
            <Icon name="sparkle" size={11} stroke={BUN_BLUE} fill={BUN_BLUE} strokeWidth={2.4} />
          </div>
          <div style={{ fontFamily: V.headFont, fontSize: 19, fontWeight: 1000, color: V.ink, letterSpacing: '-0.01em', lineHeight: 1.25 }}>
            "Ưu đãi, dành sự ưu tiên."
          </div>
          <div style={{ position: 'absolute', bottom: -8, left: '50%', transform: 'translateX(-50%) rotate(45deg)', width: 16, height: 16, background: BUN_BLUE_SOFT, border: `1px solid ${BUN_BLUE}30`, borderTop: 'none', borderLeft: 'none', borderRadius: '0 0 6px 0' }} />
        </div>

        {/* Input */}
        <div style={{ width: '100%' }}>
          <div style={{ position: 'relative' }}>
            <input
              defaultValue="prefer"
              style={{
                width: '100%', padding: '15px 18px', fontSize: 18, fontFamily: V.headFont, fontWeight: 1000,
                background: '#fff', border: `2px solid ${BUN_BLUE}`, borderRadius: 14,
                boxShadow: `0 3px 0 ${BUN_BLUE}30, 0 5px 12px ${BUN_BLUE}20`,
                color: V.ink, outline: 'none', letterSpacing: '0.02em', textAlign: 'center',
                boxSizing: 'border-box',
              }}
              placeholder="Gõ tiếng Anh…"
            />
          </div>
          <button className="bun-cta-btn" style={{
            width: '100%', marginTop: 12, padding: '14px 24px', background: BUN_BLUE, color: '#fff', border: 'none',
            boxShadow: `0 4px 0 rgba(20,40,80,.18), 0 6px 14px ${BUN_BLUE}55`,
            borderRadius: 14, fontFamily: V.headFont, fontWeight: 1000, fontSize: 13, letterSpacing: '0.04em', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
          }}>KIỂM TRA <Icon name="arrowRight" size={15} stroke="#fff" strokeWidth={3} /></button>
          <div style={{ marginTop: 10, textAlign: 'center', fontFamily: V.bodyFont, fontSize: 11, fontWeight: 700, color: V.muted, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 5 }}>
            <Icon name="heart" size={12} fill={V_C.red} stroke={V_C.red} /> Không nhớ? Đoán đi — sai không sao
          </div>
        </div>
      </div>
    </div>
  </MAppShell>
);

// ─────────────────────────────────────────────────────────────────────────────
// SCREEN 3 · Reveal + rate
// ─────────────────────────────────────────────────────────────────────────────
const MReveal = () => (
  <MAppShell active="review">
    <div style={{ padding: '8px 18px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* progress */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontFamily: V.bodyFont, fontSize: 10, fontWeight: 900, color: V.inkSoft, letterSpacing: '0.06em', textTransform: 'uppercase', flexShrink: 0 }}>Thẻ 12/46</span>
        <div style={{ flex: 1, height: 9, background: '#fff', border: `1px solid ${V.border}`, borderRadius: 999, overflow: 'hidden' }}>
          <div style={{ width: '28%', height: '100%', background: `linear-gradient(90deg, ${BUN_BLUE}, #6cc4ed)`, borderRadius: 999 }} />
        </div>
        <MStatPill icon="bolt" value="+12" color={V.gem} fill={V.gem} />
      </div>

      {/* Big word */}
      <header style={{ paddingBottom: 10, borderBottom: `1px solid ${V.border}` }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span style={{ background: V_C.purple, color: '#fff', boxShadow: '0 2px 4px rgba(193,121,214,.35)', borderRadius: 999, padding: '2px 9px', fontFamily: V.headFont, fontWeight: 1000, fontSize: 9, letterSpacing: '0.08em' }}>ADJ</span>
          <span style={{ fontFamily: V.bodyFont, fontSize: 10, fontWeight: 700, color: V.muted }}>· đã gặp 3 lần</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
          <h1 style={{ fontFamily: V.headFont, fontSize: 32, fontWeight: 1000, margin: 0, letterSpacing: '-0.025em', color: V.ink, lineHeight: 1, display: 'inline-block', position: 'relative' }}>
            <span style={{ position: 'absolute', left: -2, right: -2, bottom: 1, height: '32%', background: BUN_BLUE, opacity: 0.28, zIndex: 0, borderRadius: 3 }} />
            <span style={{ position: 'relative', zIndex: 1 }}>{sampleWord.en}</span>
          </h1>
          <span style={{ fontFamily: V.monoFont, fontSize: 12, color: BUN_BLUE, fontWeight: 700 }}>{sampleWord.ipa}</span>
          <button style={{ marginLeft: 'auto', width: 32, height: 32, background: BUN_BLUE, border: 'none', boxShadow: `0 2px 0 rgba(20,40,80,.15), 0 3px 6px ${BUN_BLUE}55`, borderRadius: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="play" size={13} fill="#fff" stroke="#fff" />
          </button>
        </div>
      </header>

      {/* Char diff */}
      <div style={{ background: BUN_BLUE_SOFT, border: `1px solid ${BUN_BLUE}50`, borderRadius: 14, padding: '10px 14px', boxShadow: `0 2px 0 ${BUN_BLUE}25` }}>
        <div style={{ fontFamily: V.headFont, fontSize: 9, fontWeight: 1000, color: BUN_BLUE, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 6, textAlign: 'center' }}>BẠN GÕ → ĐÁP ÁN</div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <div style={{ fontFamily: V.monoFont, fontSize: 16, letterSpacing: '0.06em', display: 'flex', gap: 2 }}>
            {'prefer'.split('').map((c, i) => {
              const ans = 'preferential';
              const correct = ans[i] === c;
              const color = correct ? BUN_BLUE : V_C.red;
              return <span key={i} style={{ color, fontWeight: 700, textDecoration: correct ? 'none' : 'line-through' }}>{c}</span>;
            })}
          </div>
          <Icon name="arrowRight" size={12} stroke={V.muted} style={{ transform: 'rotate(90deg)' }} />
          <div style={{ fontFamily: V.monoFont, fontSize: 21, color: BUN_BLUE, fontWeight: 800, letterSpacing: '0.02em' }}>preferential</div>
        </div>
      </div>

      {/* Meaning */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <div style={{ width: 4, alignSelf: 'stretch', background: V.accent, borderRadius: 2, flexShrink: 0 }} />
        <div>
          <div style={{ fontFamily: V.bodyFont, fontSize: 9, fontWeight: 1000, color: V.accent, letterSpacing: '0.14em', textTransform: 'uppercase' }}>Nghĩa</div>
          <div style={{ fontFamily: V.headFont, fontSize: 15, fontWeight: 900, color: V.ink, marginTop: 1 }}>Ưu đãi, dành sự ưu tiên</div>
        </div>
      </div>

      {/* Example */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <div style={{ width: 4, alignSelf: 'stretch', background: V_C.blue, borderRadius: 2, flexShrink: 0 }} />
        <div>
          <div style={{ fontFamily: V.bodyFont, fontSize: 9, fontWeight: 1000, color: V_C.blue, letterSpacing: '0.14em', textTransform: 'uppercase' }}>Ví dụ</div>
          <p style={{ fontFamily: V.headFont, fontSize: 13, fontWeight: 800, color: V.ink, margin: '3px 0 3px', lineHeight: 1.4 }}>
            Club members received <span style={{ background: BUN_BLUE_SOFT, color: BUN_BLUE, padding: '0 4px', borderRadius: 4 }}>preferential</span> seating.
          </p>
          <p style={{ fontFamily: V.bodyFont, fontSize: 11, fontWeight: 600, color: V.inkSoft, margin: 0, lineHeight: 1.5 }}>Các thành viên câu lạc bộ nhận được chỗ ngồi ưu đãi.</p>
        </div>
      </div>

      {/* Collocations */}
      <div>
        <div style={{ fontFamily: V.bodyFont, fontSize: 9, fontWeight: 1000, color: V_C.purple, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 6 }}>Thường đi cùng</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {sampleWord.collocations.map((c, i) => {
            const cols = [V_C.pink, V_C.teal, V_C.yellow];
            return (
              <div key={c} style={{ background: '#fff', border: `1px solid ${V.border}`, boxShadow: V.shadow, borderRadius: 10, padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 6, height: 6, background: cols[i], borderRadius: 2, flexShrink: 0 }} />
                <span style={{ fontFamily: V.bodyFont, fontSize: 11, fontWeight: 700, color: V.ink }}>
                  {c.split('preferential').map((part, j, arr) => (
                    <React.Fragment key={j}>
                      {part}
                      {j < arr.length - 1 && <b style={{ color: BUN_BLUE }}>preferential</b>}
                    </React.Fragment>
                  ))}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Rating 2x2 grid */}
      <section style={{ borderTop: `1px solid ${V.border}`, paddingTop: 12, marginTop: 4 }}>
        <div style={{ fontFamily: V.bodyFont, fontSize: 11, fontWeight: 900, color: V.inkSoft, marginBottom: 8 }}>Bạn thấy thế nào?</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {[
            { key: 1, label: 'LẠI', sub: '< 1 phút', emoji: '😵', bg: V_C.red },
            { key: 2, label: 'KHÓ', sub: '10 phút', emoji: '😬', bg: V_C.orange },
            { key: 3, label: 'TỐT', sub: '1 ngày', emoji: '😊', bg: V.primary },
            { key: 4, label: 'DỄ', sub: '4 ngày', emoji: '🎉', bg: V.gem },
          ].map(b => (
            <button key={b.key} className="bun-cta-btn" style={{
              padding: '11px 12px', background: b.bg, border: 'none',
              boxShadow: `0 3px 0 rgba(60,20,5,.15), 0 5px 12px ${b.bg}40`,
              borderRadius: 13, cursor: 'pointer', textAlign: 'left', color: '#fff', display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <div style={{ fontSize: 18, lineHeight: 1, flexShrink: 0 }}>{b.emoji}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: V.headFont, fontSize: 12, fontWeight: 1000, letterSpacing: '0.06em', lineHeight: 1 }}>{b.label}</div>
                <div style={{ fontFamily: V.bodyFont, fontSize: 9.5, fontWeight: 700, opacity: 0.9, marginTop: 1 }}>{b.sub}</div>
              </div>
            </button>
          ))}
        </div>
      </section>
    </div>
  </MAppShell>
);

// ─────────────────────────────────────────────────────────────────────────────
// SCREEN 4 · Decks list
// ─────────────────────────────────────────────────────────────────────────────
const MDecksList = () => (
  <MAppShell active="decks">
    <div style={{ padding: '8px 18px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontFamily: V.bodyFont, fontSize: 10, fontWeight: 900, color: V.muted, letterSpacing: '0.14em', textTransform: 'uppercase' }}>Pick & mix</div>
          <h1 style={{ fontFamily: V.headFont, fontSize: 24, fontWeight: 1000, lineHeight: 1.0, margin: '3px 0 0', letterSpacing: '-0.025em', color: V.ink }}>
            Bộ từ <span style={{ color: BUN_BLUE }}>của bạn</span>
          </h1>
        </div>
        <button className="bun-cta-btn" style={{
          padding: '8px 12px', background: BUN_BLUE, color: '#fff', border: 'none',
          boxShadow: `0 3px 0 rgba(20,40,80,.18), 0 4px 10px ${BUN_BLUE}55`,
          borderRadius: 11, fontFamily: V.headFont, fontWeight: 900, fontSize: 11, cursor: 'pointer',
          display: 'inline-flex', alignItems: 'center', gap: 5,
        }}>
          <Icon name="plus" size={13} stroke="#fff" strokeWidth={3} /> Bộ mới
        </button>
      </div>

      {/* Search */}
      <div style={{ position: 'relative' }}>
        <input placeholder="Tìm trong bộ từ…" style={{
          width: '100%', padding: '10px 14px 10px 38px', fontSize: 13, fontFamily: V.bodyFont, fontWeight: 600,
          background: '#fff', border: `1px solid ${V.border}`, borderRadius: 12, boxShadow: V.shadow,
          color: V.ink, outline: 'none', boxSizing: 'border-box',
        }} />
        <div style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}>
          <Icon name="search" size={15} stroke={V.muted} strokeWidth={2.2} />
        </div>
      </div>

      {/* Filter chips */}
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
        {[
          { label: 'Tất cả', count: 12, active: true },
          { label: 'Đang học', count: 5 },
          { label: 'Đã thuộc', count: 3 },
          { label: 'Tạm dừng', count: 1 },
        ].map((c, i) => (
          <div key={i} style={{
            padding: '6px 12px', background: c.active ? V.ink : '#fff', color: c.active ? '#fff' : V.inkSoft,
            border: `1px solid ${c.active ? V.ink : V.border}`, borderRadius: 999,
            fontFamily: V.headFont, fontWeight: 900, fontSize: 11, whiteSpace: 'nowrap', cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', gap: 4, flexShrink: 0,
          }}>
            {c.label}
            <span style={{ background: c.active ? 'rgba(255,255,255,.25)' : V.panel, color: 'inherit', borderRadius: 999, padding: '0 6px', fontSize: 10, fontWeight: 800 }}>{c.count}</span>
          </div>
        ))}
      </div>

      {/* Deck cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {[...sampleDecks, { name: 'TOEIC từ vựng', total: 110, mastered: 18, color: V_C.teal }, { name: 'Idioms hằng ngày', total: 64, mastered: 0, color: V_C.yellow }].map((d, i) => {
          const pct = Math.round((d.mastered / d.total) * 100);
          return (
            <div key={i} className="bun-cta-btn" style={{
              background: '#fff', border: `1px solid ${V.border}`, boxShadow: V.shadowMd, borderRadius: 14,
              padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
            }}>
              <div style={{ width: 46, height: 46, borderRadius: 12, background: d.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: V.headFont, fontWeight: 1000, fontSize: 16, color: '#fff', boxShadow: `0 3px 0 rgba(60,20,5,.12), 0 4px 8px ${d.color}55`, flexShrink: 0 }}>
                {d.name[0]}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: V.headFont, fontSize: 14, fontWeight: 1000, color: V.ink, letterSpacing: '-0.01em' }}>{d.name}</div>
                <div style={{ fontFamily: V.bodyFont, fontSize: 10, fontWeight: 700, color: V.muted, marginTop: 2 }}>{d.mastered}/{d.total} từ · {pct}% thuộc</div>
                <div style={{ height: 5, background: V.panel, borderRadius: 999, marginTop: 5, overflow: 'hidden' }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: d.color }} />
                </div>
              </div>
              <Icon name="arrowRight" size={16} stroke={V.muted} strokeWidth={2.4} style={{ flexShrink: 0 }} />
            </div>
          );
        })}
      </div>
    </div>
  </MAppShell>
);

// ─────────────────────────────────────────────────────────────────────────────
// SCREEN 5 · Add word
// ─────────────────────────────────────────────────────────────────────────────
const MAddWord = () => (
  <MAppShell active="add">
    <div style={{ padding: '8px 18px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div>
        <div style={{ fontFamily: V.bodyFont, fontSize: 10, fontWeight: 900, color: V.muted, letterSpacing: '0.14em', textTransform: 'uppercase' }}>AI auto-fill</div>
        <h1 style={{ fontFamily: V.headFont, fontSize: 24, fontWeight: 1000, lineHeight: 1.0, margin: '3px 0 6px', letterSpacing: '-0.025em', color: V.ink }}>
          Thêm từ <span style={{ color: BUN_BLUE }}>mới</span>
        </h1>
        <p style={{ fontFamily: V.bodyFont, fontSize: 12, fontWeight: 600, color: V.inkSoft, margin: 0, lineHeight: 1.5 }}>
          Dán từ tiếng Anh. Bún tự fill IPA · audio · ví dụ · ảnh.
        </p>
      </div>

      {/* Paste input */}
      <div>
        <div style={{ fontFamily: V.bodyFont, fontSize: 11, fontWeight: 900, color: V.inkSoft, marginBottom: 6 }}>Dán danh sách từ</div>
        <div style={{ position: 'relative' }}>
          <textarea defaultValue={'preferential\nubiquitous\nmeticulous\nephemeral'} style={{
            width: '100%', minHeight: 100, padding: '12px 14px', fontSize: 14, fontFamily: V.monoFont, fontWeight: 600,
            background: '#fff', border: `1.5px solid ${BUN_BLUE}55`, borderRadius: 14, boxShadow: `0 2px 0 ${BUN_BLUE}20`,
            color: V.ink, outline: 'none', resize: 'vertical', boxSizing: 'border-box', lineHeight: 1.6,
          }} />
          <div style={{ position: 'absolute', bottom: 8, right: 10, fontFamily: V.bodyFont, fontSize: 9.5, fontWeight: 700, color: V.muted }}>4 từ · mỗi từ 1 dòng</div>
        </div>
      </div>

      {/* Deck picker */}
      <div>
        <div style={{ fontFamily: V.bodyFont, fontSize: 11, fontWeight: 900, color: V.inkSoft, marginBottom: 6 }}>Thêm vào bộ</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {sampleDecks.slice(0, 3).map((d, i) => (
            <label key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: i === 0 ? BUN_BLUE_SOFT : '#fff', border: `1px solid ${i === 0 ? BUN_BLUE : V.border}`, borderRadius: 12, cursor: 'pointer', boxShadow: i === 0 ? `0 2px 0 ${BUN_BLUE}25` : V.shadow }}>
              <div style={{ width: 18, height: 18, borderRadius: '50%', background: i === 0 ? BUN_BLUE : '#fff', border: `1.5px solid ${i === 0 ? BUN_BLUE : V.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {i === 0 && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff' }} />}
              </div>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: d.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: V.headFont, fontWeight: 1000, fontSize: 11, color: '#fff', flexShrink: 0 }}>{d.name[0]}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: V.headFont, fontSize: 13, fontWeight: 900, color: V.ink }}>{d.name}</div>
                <div style={{ fontFamily: V.bodyFont, fontSize: 10, fontWeight: 700, color: V.muted }}>{d.total} từ</div>
              </div>
            </label>
          ))}
          <button style={{ padding: '8px 12px', background: 'transparent', border: `1.5px dashed ${V.border}`, borderRadius: 12, fontFamily: V.bodyFont, fontSize: 12, fontWeight: 800, color: V.inkSoft, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
            <Icon name="plus" size={13} stroke={V.inkSoft} strokeWidth={2.6} /> Bộ mới
          </button>
        </div>
      </div>

      {/* Toggle options */}
      <div style={{ background: V.panel, borderRadius: 12, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {[
          { label: 'IPA + audio', on: true },
          { label: '3 ví dụ + bản dịch', on: true },
          { label: 'Collocations', on: true },
          { label: 'Ảnh từ Pexels', on: false },
        ].map((o, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontFamily: V.bodyFont, fontSize: 12, fontWeight: 700, color: V.ink }}>{o.label}</span>
            <div style={{ width: 36, height: 20, borderRadius: 999, background: o.on ? BUN_BLUE : V.border, position: 'relative', transition: 'background .2s' }}>
              <div style={{ position: 'absolute', top: 2, left: o.on ? 18 : 2, width: 16, height: 16, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,.18)', transition: 'left .2s' }} />
            </div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <button className="bun-cta-btn" style={{
        width: '100%', padding: '15px 24px', background: BUN_BLUE, color: '#fff', border: 'none',
        boxShadow: `0 4px 0 rgba(20,40,80,.2), 0 8px 18px ${BUN_BLUE}55`,
        borderRadius: 16, fontFamily: V.headFont, fontWeight: 1000, fontSize: 14, cursor: 'pointer', letterSpacing: '0.02em',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      }}>
        <Icon name="sparkle" size={15} stroke="#fff" fill="#fff" /> Bún làm hộ · 4 từ
      </button>
      <div style={{ textAlign: 'center', fontFamily: V.bodyFont, fontSize: 11, fontWeight: 700, color: V.muted, marginTop: -8 }}>
        ~12 giây · bạn xem lại trước khi lưu
      </div>
    </div>
  </MAppShell>
);

Object.assign(window, { MAppShell, MStatusBar, MTabBar, MStatPill, MDashboard, MFlashcardTyping, MReveal, MDecksList, MAddWord });
