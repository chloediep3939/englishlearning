// landing-bun-parts1.jsx — Nav, Hero, ValueProps, Features
// Blue-accent version with heavy animations + 5 hand-drawn Bún poses
// Uses V tokens (direction-v2.jsx) + MASCOT + Icon + animation utils

// ─────────────────────────────────────────────────────────────────────────────
// Logo
const BunLogo = ({ size = 38, pose = 'happy' }) => (
  <div className="bun-logo-wrap" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
    <img src={MASCOT[pose]} width={size} height={size} alt="Bún" style={{ display: 'block', filter: 'drop-shadow(0 2px 4px rgba(40,30,15,.15))' }} />
    <span style={{ fontFamily: V.headFont, fontWeight: 900, fontSize: size * 0.62, color: V.ink, letterSpacing: '-0.03em', lineHeight: 1 }}>
      Bún
    </span>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Nav
const BunNav = ({ accent = BUN_BLUE }) => (
  <header style={{
    position: 'sticky', top: 0, zIndex: 30, padding: '14px 48px',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(14px)',
    borderBottom: `1px solid ${V.border}`,
  }}>
    <BunLogo size={36} />
    <nav style={{ display: 'flex', gap: 28 }}>
      {['Tính năng', 'Workflow', 'Về Bún', 'FAQ'].map(n => (
        <a key={n} href={`#${n}`} className="bun-nav-link" style={{
          fontFamily: V.bodyFont, fontSize: 14, fontWeight: 700, color: V.inkSoft,
          textDecoration: 'none', cursor: 'pointer',
        }}>{n}</a>
      ))}
    </nav>
    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
      <a className="bun-nav-link" style={{ fontFamily: V.bodyFont, fontSize: 14, fontWeight: 800, color: V.ink, textDecoration: 'none', cursor: 'pointer' }}>Đăng nhập</a>
      <button className="bun-cta-btn" style={{
        padding: '10px 18px', background: accent, color: '#fff', border: 'none',
        boxShadow: `0 3px 0 rgba(20,40,80,.18), 0 4px 12px ${accent}55`,
        borderRadius: 13, fontFamily: V.headFont, fontWeight: 900, fontSize: 13, letterSpacing: '0.02em', cursor: 'pointer',
      }}>Vào học →</button>
    </div>
  </header>
);

// ─────────────────────────────────────────────────────────────────────────────
// Sparkle decorations
const Sparkles = ({ items = [] }) => (
  <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', overflow: 'visible' }}>
    {items.map(([x, y, s, c, d], i) => (
      <g key={i} style={{ animation: `sparkle-twinkle 2.4s ease-in-out ${d}s infinite`, transformOrigin: `${x}px ${y}px` }}>
        <polygon points={`${x},${y - s} ${x + s * 0.32},${y - s * 0.32} ${x + s},${y} ${x + s * 0.32},${y + s * 0.32} ${x},${y + s} ${x - s * 0.32},${y + s * 0.32} ${x - s},${y} ${x - s * 0.32},${y - s * 0.32}`} fill={c} />
      </g>
    ))}
  </svg>
);

// ─────────────────────────────────────────────────────────────────────────────
// Mini hero mock cards — kept, with subtle bobbing
const MiniHeroCardA = ({ accent = BUN_BLUE }) => (
  <div style={{
    width: 230, background: '#fff', borderRadius: 14, padding: 12,
    border: `1px solid ${V.border}`, boxShadow: '0 14px 32px rgba(40,30,15,.14), 0 3px 0 rgba(40,30,15,.06)',
    animation: 'bun-float-slow 5s ease-in-out infinite',
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
      <span style={{ background: V_C.purple, color: '#fff', borderRadius: 999, padding: '2px 9px', fontFamily: V.headFont, fontWeight: 900, fontSize: 9, letterSpacing: '0.08em' }}>ADJ</span>
      <span style={{ fontFamily: V.bodyFont, fontSize: 10, fontWeight: 700, color: V.muted }}>thẻ 12/46</span>
    </div>
    <div style={{ fontFamily: V.headFont, fontWeight: 900, fontSize: 22, color: V.ink, lineHeight: 1, letterSpacing: '-0.02em' }}>preferential</div>
    <div style={{ fontFamily: V.monoFont, fontSize: 11, color: accent, fontWeight: 700, marginTop: 2 }}>/ˌprefəˈrenʃəl/</div>
    <div style={{ fontFamily: V.bodyFont, fontSize: 11, color: V.inkSoft, marginTop: 6, fontWeight: 700 }}>Ưu đãi, dành sự ưu tiên</div>
    <div style={{ marginTop: 10, display: 'flex', gap: 4 }}>
      {[V_C.red, V_C.orange, V.primary, V.gem].map((c, i) => (
        <div key={i} style={{ flex: 1, height: 18, background: c, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: V.headFont, fontWeight: 900, fontSize: 9, color: '#fff' }}>{['LẠI', 'KHÓ', 'TỐT', 'DỄ'][i]}</div>
      ))}
    </div>
  </div>
);

const MiniHeroStreakA = ({ accent = BUN_BLUE }) => (
  <div style={{
    width: 230, background: '#fff', borderRadius: 14, padding: '10px 12px',
    border: `1px solid ${V.border}`, boxShadow: '0 14px 32px rgba(40,30,15,.14), 0 3px 0 rgba(40,30,15,.06)',
    animation: 'bun-float-slow 5.6s ease-in-out -1.5s infinite',
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
      <div style={{ width: 28, height: 28, borderRadius: 8, background: V_C.red, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="flame" size={15} fill="#fff" stroke="#fff" />
      </div>
      <div>
        <div style={{ fontFamily: V.headFont, fontWeight: 900, fontSize: 14, lineHeight: 1, color: V.ink }}>7 ngày liên tiếp</div>
        <div style={{ fontFamily: V.bodyFont, fontSize: 9, fontWeight: 700, color: V.muted }}>kỷ lục: 12</div>
      </div>
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(14, 1fr)', gap: 2 }}>
      {Array.from({ length: 14 }).map((_, i) => {
        const filled = i < 7;
        return <div key={i} style={{ height: 16, borderRadius: 4, background: filled ? accent : V.panel, border: i === 7 ? `1.5px dashed ${accent}` : 'none', transformOrigin: 'bottom', animation: filled ? `bun-streak-pop .55s cubic-bezier(.34,1.56,.64,1) ${1 + i * 0.12}s both` : 'none' }} />;
      })}
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// HERO
const BunHero = ({ variant = 'centered', pose = 'happy', accent = BUN_BLUE, accentSoft = BUN_BLUE_SOFT }) => {
  if (variant === 'gradient') {
    return (
      <section style={{ padding: '32px 48px 60px' }}>
        <div style={{
          position: 'relative', borderRadius: 28, padding: '60px 56px',
          background: `linear-gradient(135deg, #ff8956 0%, #ffa872 100%)`,
          border: `1px solid rgba(60,20,5,.2)`,
          boxShadow: '0 6px 0 rgba(60,20,5,.15), 0 12px 32px rgba(255,137,86,.25)',
          overflow: 'hidden',
        }}>
          <Sparkles items={[[80, 60, 12, '#fff', 0], [1100, 80, 9, V_C.yellow, 0.4], [1150, 320, 14, '#fff', 1.0], [40, 360, 10, V_C.yellow, 0.7], [560, 30, 8, '#fff', 1.5]]} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.1fr', gap: 36, alignItems: 'center', position: 'relative' }}>
            <div style={{ textAlign: 'center', position: 'relative' }}>
              <LiveMascot size={300} poses={['happy', 'happy', 'blink', 'happy', 'magic', 'happy']} interval={1500} />
            </div>
            <div style={{ color: '#fff' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 12px', background: 'rgba(255,255,255,0.25)', borderRadius: 999, fontFamily: V.bodyFont, fontSize: 11, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 18 }}>
                <Icon name="sparkle" size={12} stroke="#fff" fill="#fff" /> Học tiếng Anh kiểu Việt
              </div>
              <h1 style={{ fontFamily: V.headFont, fontSize: 64, fontWeight: 1000, lineHeight: 1.0, margin: 0, letterSpacing: '-0.035em', textShadow: '0 3px 0 rgba(60,20,5,.18)' }}>
                Học tiếng Anh<br/>theo <span style={{ fontStyle: 'italic', fontFamily: '"Lora", serif', fontWeight: 600 }}>kiểu bạn thích</span>.
              </h1>
              <p style={{ fontFamily: V.bodyFont, fontSize: 18, fontWeight: 700, lineHeight: 1.45, margin: '20px 0 28px', color: 'rgba(255,255,255,0.96)', maxWidth: 480 }}>
                Bạn lo phần <b>học</b> — mình lo phần <b>thô</b>.
              </p>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <button style={{
                  padding: '15px 26px', background: '#fff', color: '#ff7849', border: 'none',
                  boxShadow: '0 4px 0 rgba(60,20,5,.18), 0 6px 14px rgba(40,30,15,.12)', borderRadius: 16,
                  fontFamily: V.headFont, fontWeight: 900, fontSize: 15, cursor: 'pointer', letterSpacing: '0.02em',
                  display: 'flex', alignItems: 'center', gap: 7,
                }}>
                  Bắt đầu học miễn phí <Icon name="arrowRight" size={16} stroke="#ff7849" strokeWidth={3} />
                </button>
                <button style={{
                  padding: '15px 26px', background: 'rgba(255,255,255,0.18)', color: '#fff', border: '1.5px solid rgba(255,255,255,0.55)',
                  borderRadius: 16, fontFamily: V.headFont, fontWeight: 900, fontSize: 15, cursor: 'pointer', letterSpacing: '0.02em',
                }}>Xem workflow mẫu</button>
              </div>
              <div style={{ marginTop: 22, display: 'flex', gap: 18, alignItems: 'center', fontFamily: V.bodyFont, fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.92)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Icon name="check" size={14} stroke="#fff" strokeWidth={3} /> Miễn phí dùng thử</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Icon name="check" size={14} stroke="#fff" strokeWidth={3} /> Tiếng Việt 100%</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Icon name="check" size={14} stroke="#fff" strokeWidth={3} /> AI tự sinh nội dung</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // 'centered' — blue-accent showcase with heavy animation
  return (
    <section style={{ padding: '60px 48px 90px', textAlign: 'center', position: 'relative', overflow: 'hidden', minHeight: 700 }}>
      {/* Animated gradient blobs */}
      <BlobBg blobs={[
        { x: '5%', y: '10%', r: 380, color: accent, opacity: 0.16, dur: 18, delay: 0 },
        { x: '70%', y: '5%', r: 320, color: V_C.pink, opacity: 0.12, dur: 22, delay: 2 },
        { x: '60%', y: '60%', r: 360, color: V_C.yellow, opacity: 0.10, dur: 20, delay: 4 },
        { x: '-5%', y: '55%', r: 300, color: V_C.teal, opacity: 0.10, dur: 17, delay: 1 },
      ]} />
      <Sparkles items={[
        [140, 80, 11, V_C.yellow, 0], [1120, 110, 12, V_C.pink, 0.5], [240, 260, 9, accent, 1.1],
        [1040, 300, 11, V_C.orange, 0.3], [60, 420, 10, V_C.purple, 0.9], [1180, 460, 9, V_C.teal, 1.4],
        [560, 600, 12, V_C.yellow, 0.6], [320, 540, 8, V_C.pink, 1.2],
      ]} />

      {/* Pre-heading badge */}
      <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 7, padding: '7px 16px', background: '#fff', border: `1.5px solid ${accent}55`, borderRadius: 999, fontFamily: V.bodyFont, fontSize: 12, fontWeight: 900, color: accent, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 28, boxShadow: `0 3px 0 ${accent}25` }}>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: accent, animation: 'sparkle-twinkle 1.4s ease-in-out infinite' }} />
        App học tiếng Anh kiểu Việt · v0.4 beta
      </div>

      {/* Live mascot center with halo */}
      <div style={{ position: 'relative', display: 'inline-block', marginBottom: 28, width: 240, height: 220 }}>
        {/* Halo */}
        <div style={{ position: 'absolute', inset: '10px 10px', borderRadius: '50%', background: `radial-gradient(circle, ${accent}40 0%, ${accent}00 65%)`, animation: 'sparkle-twinkle 3s ease-in-out infinite' }} />
        {/* Main */}
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <LiveMascot size={210} poses={['happy', 'happy', 'happy', 'blink', 'happy']} interval={1300} />
        </div>
        {/* small dialogue bubble */}
        <div style={{
          position: 'absolute', right: -150, top: 30, background: '#fff',
          padding: '9px 14px', border: `1px solid ${V.border}`, boxShadow: V.shadowMd, borderRadius: 16,
          fontFamily: V.bodyFont, fontSize: 12, fontWeight: 700, color: V.ink, whiteSpace: 'nowrap',
          animation: 'bun-tilt-loop 4s ease-in-out infinite',
        }}>
          Mình đợi bạn nha 🐲
          <div style={{ position: 'absolute', left: -7, top: 14, width: 12, height: 12, background: '#fff', borderLeft: `1px solid ${V.border}`, borderBottom: `1px solid ${V.border}`, transform: 'rotate(45deg)' }} />
        </div>
      </div>

      {/* Heading */}
      <h1 style={{ fontFamily: V.headFont, fontSize: 76, fontWeight: 1000, lineHeight: 0.98, margin: '0 auto', letterSpacing: '-0.035em', color: V.ink, maxWidth: 920, position: 'relative' }}>
        Học tiếng Anh<br/>
        theo{' '}
        <span style={{
          fontStyle: 'italic', fontFamily: '"Lora", serif', fontWeight: 600,
          backgroundImage: `linear-gradient(90deg, ${accent}, ${V_C.pink}, ${accent})`,
          backgroundSize: '200% auto', backgroundClip: 'text', WebkitBackgroundClip: 'text', color: 'transparent',
          animation: 'bun-shimmer-text 5s linear infinite',
          paddingRight: 4,
        }}>
          kiểu bạn thích
        </span>
        <span style={{ display: 'inline-block', color: V.ink, position: 'relative' }}>.</span>
      </h1>
      <p style={{ fontFamily: V.bodyFont, fontSize: 21, fontWeight: 700, lineHeight: 1.4, color: V.inkSoft, margin: '22px auto 0', maxWidth: 640, position: 'relative' }}>
        Bạn lo phần <b style={{ color: V.ink, position: 'relative' }}>học</b> — mình lo phần <b style={{ color: V.ink, position: 'relative' }}>
          thô
          <span style={{ position: 'absolute', left: -2, right: -2, bottom: 1, height: 6, background: `${accent}40`, zIndex: -1, borderRadius: 3 }} />
        </b>.
      </p>

      {/* CTAs */}
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 34, position: 'relative' }}>
        <button className="bun-cta-btn" style={{
          position: 'relative', padding: '17px 32px', background: accent, color: '#fff', border: 'none',
          boxShadow: `0 5px 0 rgba(20,40,80,.2), 0 10px 24px ${accent}66`,
          borderRadius: 18, fontFamily: V.headFont, fontWeight: 1000, fontSize: 16, cursor: 'pointer', letterSpacing: '0.02em',
          display: 'inline-flex', alignItems: 'center', gap: 8,
        }}>
          <span style={{ position: 'absolute', inset: -3, borderRadius: 21, color: accent, animation: 'bun-pulse-ring 2s ease-out infinite', pointerEvents: 'none' }} />
          Bắt đầu học <Icon name="arrowRight" size={18} stroke="#fff" strokeWidth={3} />
        </button>
        <button className="bun-cta-btn" style={{
          padding: '17px 26px', background: '#fff', color: V.ink, border: `1.5px solid ${V.border}`,
          boxShadow: V.shadowMd, borderRadius: 18,
          fontFamily: V.headFont, fontWeight: 900, fontSize: 15, cursor: 'pointer', letterSpacing: '0.02em',
          display: 'inline-flex', alignItems: 'center', gap: 7,
        }}>
          <Icon name="play" size={13} fill={accent} stroke={accent} /> Xem workflow mẫu
        </button>
      </div>

      {/* Sub-line under CTAs */}
      <div style={{ marginTop: 22, display: 'inline-flex', gap: 22, alignItems: 'center', fontFamily: V.bodyFont, fontSize: 12, fontWeight: 700, color: V.muted, position: 'relative' }}>
        <span className="bun-trust-item" style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'default' }}><Icon name="check" size={13} stroke={accent} strokeWidth={3} /> Miễn phí dùng thử</span>
        <span className="bun-trust-item" style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'default' }}><Icon name="check" size={13} stroke={accent} strokeWidth={3} /> Tiếng Việt 100%</span>
        <span className="bun-trust-item" style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'default' }}><Icon name="check" size={13} stroke={accent} strokeWidth={3} /> Không cần thẻ tín dụng</span>
      </div>

      {/* Floating mock previews — left + right */}
      <div style={{ position: 'absolute', left: 36, top: 230, transform: 'rotate(-3deg)' }}>
        <MiniHeroStreakA accent={accent} />
      </div>
      <div style={{ position: 'absolute', right: 36, top: 200, transform: 'rotate(4deg)' }}>
        <MiniHeroCardA accent={accent} />
      </div>
    </section>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Word-ticker marquee — shows what AI auto-fills
const BunMarquee = ({ accent = BUN_BLUE }) => {
  const words = [
    'preferential · /ˌprefəˈrenʃəl/',
    'serendipity · /ˌserənˈdɪpəti/',
    'meticulous · /məˈtɪkjələs/',
    'ubiquitous · /juːˈbɪkwɪtəs/',
    'epitome · /ɪˈpɪtəmi/',
    'pragmatic · /præɡˈmætɪk/',
    'inevitable · /ɪnˈevɪtəbl/',
    'elaborate · /ɪˈlæbərət/',
    'ephemeral · /ɪˈfemərəl/',
  ];
  return (
    <div style={{ background: V.panel, borderTop: `1px solid ${V.border}`, borderBottom: `1px solid ${V.border}`, padding: '14px 0', overflow: 'hidden', position: 'relative' }} className="bun-marquee">
      <div style={{
        position: 'absolute', left: 24, top: '50%', transform: 'translateY(-50%)',
        background: '#fff', padding: '4px 10px', borderRadius: 999, border: `1px solid ${V.border}`,
        fontFamily: V.bodyFont, fontSize: 11, fontWeight: 900, color: accent, letterSpacing: '0.12em', textTransform: 'uppercase',
        display: 'inline-flex', alignItems: 'center', gap: 5, zIndex: 2, boxShadow: V.shadow,
      }}>
        <Icon name="sparkle" size={12} stroke={accent} fill={accent} /> AI auto-fill →
      </div>
      <div className="bun-marquee-track" style={{
        display: 'flex', gap: 32, whiteSpace: 'nowrap',
      }}>
        {[...words, ...words, ...words].map((w, i) => (
          <span key={i} style={{ fontFamily: V.monoFont, fontSize: 14, fontWeight: 600, color: V.inkSoft, flexShrink: 0 }}>
            <span style={{ color: accent }}>✦</span> {w}
          </span>
        ))}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// 3 trụ cột / VALUE PROPS — each with a hand-drawn Bún pose + hover lift
const BunValueProps = ({ accent = BUN_BLUE }) => {
  const cards = [
    {
      eyebrow: '01 · Workflow',
      title: 'Học theo workflow của bạn',
      titleHL: 'bạn',
      body: 'Không lộ trình ép buộc. Pick & mix flashcard, đọc, nói, viết câu — bạn tự design nhịp riêng.',
      icon: 'cards',
      color: accent,
      bg: BUN_BLUE_SOFT,
      bun: 'learn',
    },
    {
      eyebrow: '02 · AI',
      title: 'AI lo phần khô khan',
      titleHL: 'khô khan',
      body: 'Dán từ tiếng Anh, Bún tự fill IPA · audio · 3 ví dụ · collocations · ảnh Pexels trong vài giây.',
      icon: 'sparkle',
      color: V_C.orange,
      bg: '#fff0e4',
      bun: 'magic',
    },
    {
      eyebrow: '03 · Modality',
      title: 'Đủ kiểu để không chán',
      titleHL: 'không chán',
      body: 'Flashcard, đọc to, viết câu, đoạn văn, đọc bài AI chấm, điền chỗ trống — tất cả trong 1 app.',
      icon: 'gem',
      color: V_C.purple,
      bg: '#f5e6f9',
      bun: 'flex',
    },
  ];
  return (
    <section style={{ padding: '60px 48px', background: V.panel, position: 'relative' }}>
      <div style={{ textAlign: 'center', marginBottom: 38 }}>
        <div style={{ fontFamily: V.bodyFont, fontSize: 12, fontWeight: 900, color: V.muted, letterSpacing: '0.18em', textTransform: 'uppercase' }}>3 trụ cột</div>
        <h2 style={{ fontFamily: V.headFont, fontSize: 38, fontWeight: 1000, color: V.ink, margin: '6px 0 0', letterSpacing: '-0.025em' }}>
          Vì sao Bún <span style={{ fontStyle: 'italic', fontFamily: '"Lora", serif', fontWeight: 600, color: accent }}>khác</span>?
        </h2>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        {cards.map((c, i) => (
          <Reveal key={i} delay={i * 120}>
            <HoverLift lift={8} style={{ height: '100%' }}>
              <div style={{
                position: 'relative', background: '#fff', border: `1px solid ${V.border}`,
                boxShadow: V.shadowLg, borderRadius: 22, padding: '24px 22px 22px', overflow: 'hidden', height: '100%',
              }}>
                <div style={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: '50%', background: c.bg }} />
                <div style={{ position: 'absolute', top: 8, right: 10, width: 96, height: 96, opacity: 0.95, animation: `ngoc-float 4s ease-in-out ${i * 0.3}s infinite` }}>
                  <img src={MASCOT[c.bun]} width={96} height={96} alt="" style={{ filter: 'drop-shadow(0 6px 12px rgba(40,30,15,.18))' }} />
                </div>
                <div style={{ position: 'relative', marginTop: 70 }}>
                  <div style={{ width: 48, height: 48, borderRadius: 14, background: c.color, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 4px 0 rgba(60,20,5,.12), 0 6px 12px ${c.color}50`, marginBottom: 14 }}>
                    <Icon name={c.icon} size={22} stroke="#fff" fill="#fff" strokeWidth={2.4} />
                  </div>
                  <div style={{ fontFamily: V.bodyFont, fontSize: 11, fontWeight: 900, color: V.muted, letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 6 }}>{c.eyebrow}</div>
                  <h3 style={{ fontFamily: V.headFont, fontSize: 22, fontWeight: 1000, color: V.ink, margin: '0 0 10px', letterSpacing: '-0.02em', lineHeight: 1.15 }}>
                    {c.title.split(c.titleHL)[0]}
                    <span style={{ color: c.color }}>{c.titleHL}</span>
                    {c.title.split(c.titleHL)[1]}
                  </h3>
                  <p style={{ fontFamily: V.bodyFont, fontSize: 14, fontWeight: 600, color: V.inkSoft, lineHeight: 1.55, margin: 0 }}>{c.body}</p>
                </div>
              </div>
            </HoverLift>
          </Reveal>
        ))}
      </div>
    </section>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// FEATURES grid — hover lift + icon wiggle
const BUN_FEATURES = [
  { icon: 'refresh', title: 'Học theo SRS thông minh', body: 'Lịch ôn khoa học (SM-2), Anki-style loop trong session — ôn đến khi thực sự thuộc.', color: V_C.purple },
  { icon: 'sparkle', title: 'AI tự sinh thẻ', body: 'Dán 30 từ tiếng Anh, Bún tự fill IPA, audio, 3 ví dụ, collocations, ảnh Pexels.', color: V_C.orange },
  { icon: 'speaker', title: 'Luyện đọc to', body: 'Đọc vào mic, Web Speech API chấm phát âm theo từng từ.', color: V_C.blue },
  { icon: 'pencil', title: 'Đặt câu có timer', body: 'Viết câu chứa từ đã học, AI Gemini chấm + góp ý cụ thể.', color: V_C.pink },
  { icon: 'book', title: 'Viết đoạn văn', body: 'Chọn pool từ đã học, viết bài, AI chấm ngữ pháp + cách dùng từ.', color: V_C.teal },
  { icon: 'quote', title: 'Bài đọc tương tác', body: 'Dán bài viết bất kỳ, app chấm CEFR, karaoke TTS, click từ lạ → định nghĩa + lưu deck.', color: V.primary },
  { icon: 'cards', title: 'Điền chỗ trống', body: 'Cloze quiz tự sinh từ pool đã học, luyện nhận diện ngữ cảnh.', color: V_C.yellow },
  { icon: 'flame', title: 'Streak + Pomodoro', body: 'Theo dõi tiến trình, mục tiêu hàng ngày, timer tập trung tích hợp.', color: V_C.red },
];

const FeatureCard = ({ f, i }) => {
  const [hover, setHover] = React.useState(false);
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: 'relative', background: '#fff', border: `1px solid ${V.border}`,
        boxShadow: hover ? `0 14px 28px rgba(40,30,15,.12), 0 5px 0 rgba(40,30,15,.07)` : V.shadowMd,
        borderRadius: 18, padding: '22px 18px 18px',
        transform: hover ? 'translateY(-6px)' : 'translateY(0)',
        transition: 'transform .25s cubic-bezier(.2,.7,.3,1), box-shadow .25s ease',
        overflow: 'hidden', cursor: 'pointer',
      }}>
      <div style={{ position: 'absolute', top: -30, right: -30, width: 90, height: 90, borderRadius: '50%', background: f.color, opacity: hover ? 0.18 : 0.08, transition: 'opacity .25s ease' }} />
      <div style={{
        width: 46, height: 46, borderRadius: 14, background: f.color,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: `0 3px 0 rgba(60,20,5,.1), 0 4px 8px ${f.color}50`, marginBottom: 14,
        transformOrigin: 'center', animation: hover ? 'bun-wiggle .55s ease-in-out' : undefined,
      }}>
        <Icon name={f.icon} size={21} stroke="#fff" fill="#fff" strokeWidth={2.4} />
      </div>
      <h3 style={{ fontFamily: V.headFont, fontSize: 16, fontWeight: 1000, color: V.ink, margin: '0 0 6px', letterSpacing: '-0.01em', lineHeight: 1.2 }}>{f.title}</h3>
      <p style={{ fontFamily: V.bodyFont, fontSize: 13, fontWeight: 600, color: V.inkSoft, lineHeight: 1.5, margin: 0 }}>{f.body}</p>
    </div>
  );
};

const BunFeatures = ({ accent = BUN_BLUE }) => (
  <section id="Tính năng" style={{ padding: '72px 48px', position: 'relative' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 32, position: 'relative' }}>
      <div>
        <div style={{ fontFamily: V.bodyFont, fontSize: 12, fontWeight: 900, color: V.muted, letterSpacing: '0.18em', textTransform: 'uppercase' }}>Tính năng</div>
        <h2 style={{ fontFamily: V.headFont, fontSize: 38, fontWeight: 1000, color: V.ink, margin: '6px 0 0', letterSpacing: '-0.025em' }}>
          8 modality, <span style={{ fontStyle: 'italic', fontFamily: '"Lora", serif', fontWeight: 600, color: accent }}>1 app</span>
        </h2>
      </div>
      <p style={{ fontFamily: V.bodyFont, fontSize: 14, fontWeight: 600, color: V.inkSoft, maxWidth: 360, margin: 0, lineHeight: 1.5 }}>
        Đừng học 1 kiểu mãi. Nhồi từ vào não qua nhiều giác quan — bạn nhớ lâu hơn, đỡ chán hơn.
      </p>
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
      {BUN_FEATURES.map((f, i) => (
        <Reveal key={i} delay={i * 70}>
          <FeatureCard f={f} i={i} />
        </Reveal>
      ))}
    </div>
  </section>
);

Object.assign(window, { BunLogo, BunNav, Sparkles, BunHero, BunValueProps, BunFeatures, BUN_FEATURES, BunMarquee, FeatureCard, MiniHeroCardA, MiniHeroStreakA });
