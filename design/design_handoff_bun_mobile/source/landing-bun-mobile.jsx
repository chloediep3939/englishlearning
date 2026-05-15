// landing-bun-mobile.jsx — Mobile version of the Bún landing page
// Designed at 402×N (iPhone width). Single-column, touch-friendly, reuses V tokens + MASCOT + Icon.

// ─────────────────────────────────────────────────────────────────────────────
// Mobile primitives
const M_PAD = 20;     // horizontal page padding
const M_W = 402;      // device width

// Sticky nav with hamburger
const MNav = ({ accent = BUN_BLUE }) => {
  const [open, setOpen] = React.useState(false);
  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 30, padding: '12px 16px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(14px)',
      borderBottom: `1px solid ${V.border}`,
    }}>
      <BunLogo size={32} />
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <button style={{
          padding: '8px 14px', background: accent, color: '#fff', border: 'none',
          boxShadow: `0 3px 0 rgba(20,40,80,.18), 0 4px 10px ${accent}55`,
          borderRadius: 11, fontFamily: V.headFont, fontWeight: 900, fontSize: 12, letterSpacing: '0.02em', cursor: 'pointer',
        }}>Vào học</button>
        <button onClick={() => setOpen(!open)} style={{
          width: 36, height: 36, background: '#fff', border: `1px solid ${V.border}`,
          borderRadius: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ width: 14, height: 2, background: V.ink, borderRadius: 1, transform: open ? 'rotate(45deg) translateY(4px)' : 'none', transition: 'transform .2s ease' }} />
            <div style={{ width: 14, height: 2, background: V.ink, borderRadius: 1, opacity: open ? 0 : 1, transition: 'opacity .15s ease' }} />
            <div style={{ width: 14, height: 2, background: V.ink, borderRadius: 1, transform: open ? 'rotate(-45deg) translateY(-4px)' : 'none', transition: 'transform .2s ease' }} />
          </div>
        </button>
      </div>
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0,
          background: '#fff', borderBottom: `1px solid ${V.border}`,
          boxShadow: '0 8px 18px rgba(40,30,15,.08)',
          padding: '10px 16px 14px', display: 'flex', flexDirection: 'column', gap: 4,
        }}>
          {['Tính năng', 'Workflow', 'Về Bún', 'FAQ'].map(n => (
            <a key={n} href={`#${n}`} onClick={() => setOpen(false)} style={{
              padding: '10px 8px', fontFamily: V.bodyFont, fontSize: 15, fontWeight: 700, color: V.ink,
              textDecoration: 'none', borderBottom: `1px solid ${V.border}`,
            }}>{n}</a>
          ))}
          <a style={{ padding: '10px 8px', fontFamily: V.bodyFont, fontSize: 15, fontWeight: 800, color: accent, textDecoration: 'none' }}>Đăng nhập →</a>
        </div>
      )}
    </header>
  );
};

// Mobile hero — mascot center, heading below, CTAs stacked
const MHero = ({ accent = BUN_BLUE }) => (
  <section style={{ padding: '36px 20px 56px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
    <BlobBg blobs={[
      { x: '-15%', y: '5%', r: 240, color: accent, opacity: 0.18, dur: 18, delay: 0 },
      { x: '60%', y: '50%', r: 220, color: V_C.pink, opacity: 0.12, dur: 22, delay: 2 },
    ]} />
    <Sparkles items={[
      [40, 60, 8, V_C.yellow, 0], [350, 90, 10, V_C.pink, 0.5],
      [60, 380, 9, accent, 0.9], [340, 360, 8, V_C.purple, 1.4],
    ]} />
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: '#fff', border: `1.5px solid ${accent}55`, borderRadius: 999, fontFamily: V.bodyFont, fontSize: 10, fontWeight: 900, color: accent, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 22, boxShadow: `0 2px 0 ${accent}25` }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: accent, animation: 'sparkle-twinkle 1.4s ease-in-out infinite' }} />
      App học tiếng Anh kiểu Việt
    </div>
    {/* Mascot */}
    <div style={{ position: 'relative', display: 'inline-block', marginBottom: 18, width: 170, height: 160 }}>
      <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: `radial-gradient(circle, ${accent}35 0%, ${accent}00 65%)`, animation: 'sparkle-twinkle 3s ease-in-out infinite' }} />
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <LiveMascot size={150} poses={['happy', 'happy', 'happy', 'blink', 'happy']} interval={1300} />
      </div>
    </div>
    <h1 style={{ fontFamily: V.headFont, fontSize: 38, fontWeight: 1000, lineHeight: 1.0, margin: 0, letterSpacing: '-0.03em', color: V.ink }}>
      Học tiếng Anh<br/>
      theo{' '}
      <span style={{
        fontStyle: 'italic', fontFamily: '"Lora", serif', fontWeight: 600,
        backgroundImage: `linear-gradient(90deg, ${accent}, ${V_C.pink}, ${accent})`,
        backgroundSize: '200% auto', backgroundClip: 'text', WebkitBackgroundClip: 'text', color: 'transparent',
        animation: 'bun-shimmer-text 5s linear infinite',
      }}>
        kiểu bạn thích
      </span><span style={{ color: V.ink }}>.</span>
    </h1>
    <p style={{ fontFamily: V.bodyFont, fontSize: 15, fontWeight: 700, lineHeight: 1.45, color: V.inkSoft, margin: '14px auto 0', maxWidth: 320 }}>
      Bạn lo phần <b style={{ color: V.ink }}>học</b> — mình lo phần <b style={{ color: V.ink, background: `${accent}30`, padding: '0 4px', borderRadius: 3 }}>thô</b>.
    </p>
    {/* CTAs stacked */}
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 24, maxWidth: 320, marginInline: 'auto' }}>
      <button className="bun-cta-btn" style={{
        position: 'relative', padding: '15px 24px', background: accent, color: '#fff', border: 'none',
        boxShadow: `0 4px 0 rgba(20,40,80,.2), 0 8px 18px ${accent}66`,
        borderRadius: 16, fontFamily: V.headFont, fontWeight: 1000, fontSize: 15, cursor: 'pointer', letterSpacing: '0.02em',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, width: '100%',
      }}>
        <span style={{ position: 'absolute', inset: -3, borderRadius: 19, color: accent, animation: 'bun-pulse-ring 2s ease-out infinite', pointerEvents: 'none' }} />
        Bắt đầu học miễn phí <Icon name="arrowRight" size={16} stroke="#fff" strokeWidth={3} />
      </button>
      <button className="bun-cta-btn" style={{
        padding: '14px 24px', background: '#fff', color: V.ink, border: `1.5px solid ${V.border}`,
        boxShadow: V.shadow, borderRadius: 16,
        fontFamily: V.headFont, fontWeight: 900, fontSize: 14, cursor: 'pointer',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7,
      }}>
        <Icon name="play" size={12} fill={accent} stroke={accent} /> Xem workflow mẫu
      </button>
    </div>
    {/* Trust pills wrap */}
    <div style={{ marginTop: 18, display: 'flex', gap: 8, justifyContent: 'center', fontFamily: V.bodyFont, fontSize: 11, fontWeight: 700, color: V.muted, flexWrap: 'wrap' }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Icon name="check" size={12} stroke={accent} strokeWidth={3} /> Miễn phí</span>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Icon name="check" size={12} stroke={accent} strokeWidth={3} /> Tiếng Việt</span>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Icon name="check" size={12} stroke={accent} strokeWidth={3} /> No card</span>
    </div>
  </section>
);

// Mobile marquee
const MMarquee = ({ accent = BUN_BLUE }) => {
  const words = ['preferential · /ˌprefəˈrenʃəl/', 'serendipity', 'meticulous', 'ubiquitous', 'epitome', 'pragmatic', 'inevitable', 'ephemeral'];
  return (
    <div className="bun-marquee" style={{ background: V.panel, borderTop: `1px solid ${V.border}`, borderBottom: `1px solid ${V.border}`, padding: '10px 0', overflow: 'hidden', position: 'relative' }}>
      <div style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', background: '#fff', padding: '3px 8px', borderRadius: 999, border: `1px solid ${V.border}`, fontFamily: V.bodyFont, fontSize: 9, fontWeight: 900, color: accent, letterSpacing: '0.1em', textTransform: 'uppercase', display: 'inline-flex', alignItems: 'center', gap: 4, zIndex: 2, boxShadow: V.shadow }}>
        <Icon name="sparkle" size={10} stroke={accent} fill={accent} /> AI →
      </div>
      <div className="bun-marquee-track" style={{ display: 'flex', gap: 22, whiteSpace: 'nowrap', paddingLeft: 80 }}>
        {[...words, ...words, ...words].map((w, i) => (
          <span key={i} style={{ fontFamily: V.monoFont, fontSize: 12, fontWeight: 600, color: V.inkSoft, flexShrink: 0 }}>
            <span style={{ color: accent }}>✦</span> {w}
          </span>
        ))}
      </div>
    </div>
  );
};

// Mobile value props — stacked cards
const MValueProps = ({ accent = BUN_BLUE }) => {
  const cards = [
    { eyebrow: '01 · Workflow', title: 'Học theo workflow của', titleHL: 'bạn', body: 'Không lộ trình ép buộc. Pick & mix flashcard, đọc, nói, viết câu.', icon: 'cards', color: accent, bg: BUN_BLUE_SOFT, bun: 'learn' },
    { eyebrow: '02 · AI', title: 'AI lo phần', titleHL: 'khô khan', body: 'Dán từ tiếng Anh, Bún tự fill IPA · audio · ví dụ · ảnh trong vài giây.', icon: 'sparkle', color: V_C.orange, bg: '#fff0e4', bun: 'magic' },
    { eyebrow: '03 · Modality', title: 'Đủ kiểu để', titleHL: 'không chán', body: 'Flashcard, đọc to, viết câu, đoạn văn, đọc bài AI chấm — tất cả trong 1 app.', icon: 'gem', color: V_C.purple, bg: '#f5e6f9', bun: 'flex' },
  ];
  return (
    <section style={{ padding: '44px 20px', background: V.panel }}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{ fontFamily: V.bodyFont, fontSize: 10, fontWeight: 900, color: V.muted, letterSpacing: '0.16em', textTransform: 'uppercase' }}>3 trụ cột</div>
        <h2 style={{ fontFamily: V.headFont, fontSize: 28, fontWeight: 1000, color: V.ink, margin: '4px 0 0', letterSpacing: '-0.025em' }}>
          Vì sao Bún <span style={{ fontStyle: 'italic', fontFamily: '"Lora", serif', fontWeight: 600, color: accent }}>khác</span>?
        </h2>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {cards.map((c, i) => (
          <Reveal key={i} delay={i * 100}>
            <div style={{ position: 'relative', background: '#fff', border: `1px solid ${V.border}`, boxShadow: V.shadowMd, borderRadius: 18, padding: '18px 18px', overflow: 'hidden', display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ position: 'absolute', top: -30, right: -30, width: 110, height: 110, borderRadius: '50%', background: c.bg }} />
              <div style={{ flexShrink: 0, width: 72, height: 72, position: 'relative' }}>
                <img src={MASCOT[c.bun]} width={72} height={72} alt="" style={{ filter: 'drop-shadow(0 4px 8px rgba(40,30,15,.18))', animation: `ngoc-float ${4 + i * 0.3}s ease-in-out infinite` }} />
              </div>
              <div style={{ flex: 1, minWidth: 0, position: 'relative' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                  <div style={{ width: 22, height: 22, borderRadius: 7, background: c.color, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 2px 4px ${c.color}50` }}>
                    <Icon name={c.icon} size={11} stroke="#fff" fill="#fff" strokeWidth={2.4} />
                  </div>
                  <div style={{ fontFamily: V.bodyFont, fontSize: 9, fontWeight: 900, color: V.muted, letterSpacing: '0.14em', textTransform: 'uppercase' }}>{c.eyebrow}</div>
                </div>
                <h3 style={{ fontFamily: V.headFont, fontSize: 16, fontWeight: 1000, color: V.ink, margin: '0 0 4px', letterSpacing: '-0.02em', lineHeight: 1.15 }}>
                  {c.title} <span style={{ color: c.color }}>{c.titleHL}</span>
                </h3>
                <p style={{ fontFamily: V.bodyFont, fontSize: 12, fontWeight: 600, color: V.inkSoft, lineHeight: 1.45, margin: 0 }}>{c.body}</p>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
};

// Mobile features — 2-col grid
const MFeatures = ({ accent = BUN_BLUE }) => (
  <section id="Tính năng" style={{ padding: '44px 20px' }}>
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontFamily: V.bodyFont, fontSize: 10, fontWeight: 900, color: V.muted, letterSpacing: '0.16em', textTransform: 'uppercase' }}>Tính năng</div>
      <h2 style={{ fontFamily: V.headFont, fontSize: 28, fontWeight: 1000, color: V.ink, margin: '4px 0 6px', letterSpacing: '-0.025em' }}>
        8 modality, <span style={{ fontStyle: 'italic', fontFamily: '"Lora", serif', fontWeight: 600, color: accent }}>1 app</span>
      </h2>
      <p style={{ fontFamily: V.bodyFont, fontSize: 13, fontWeight: 600, color: V.inkSoft, margin: 0, lineHeight: 1.5 }}>
        Đừng học 1 kiểu mãi. Nhồi từ vào não qua nhiều giác quan.
      </p>
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
      {BUN_FEATURES.map((f, i) => (
        <Reveal key={i} delay={i * 50}>
          <div style={{
            position: 'relative', background: '#fff', border: `1px solid ${V.border}`,
            boxShadow: V.shadowMd, borderRadius: 14, padding: '14px 12px',
            overflow: 'hidden', height: '100%', boxSizing: 'border-box',
          }}>
            <div style={{ position: 'absolute', top: -20, right: -20, width: 60, height: 60, borderRadius: '50%', background: f.color, opacity: 0.1 }} />
            <div style={{ width: 32, height: 32, borderRadius: 9, background: f.color, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 2px 0 rgba(60,20,5,.1), 0 3px 6px ${f.color}50`, marginBottom: 9 }}>
              <Icon name={f.icon} size={15} stroke="#fff" fill="#fff" strokeWidth={2.4} />
            </div>
            <h3 style={{ fontFamily: V.headFont, fontSize: 13, fontWeight: 1000, color: V.ink, margin: '0 0 4px', letterSpacing: '-0.005em', lineHeight: 1.2 }}>{f.title}</h3>
            <p style={{ fontFamily: V.bodyFont, fontSize: 11, fontWeight: 600, color: V.inkSoft, lineHeight: 1.45, margin: 0 }}>{f.body}</p>
          </div>
        </Reveal>
      ))}
    </div>
  </section>
);

// Mobile workflow — vertical stack with horizontal scroll for step row
const MWorkflowChapter = ({ w, idx }) => (
  <Reveal delay={idx * 100} distance={24}>
    <div style={{ position: 'relative', background: '#fff', border: `1px solid ${V.border}`, boxShadow: V.shadowLg, borderRadius: 20, padding: '20px 18px', overflow: 'hidden' }}>
      {/* header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: w.accentSoft, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `2px solid ${w.accent}30` }}>
            <img src={MASCOT[w.pose]} width={66} height={66} alt={w.name} style={{ filter: 'drop-shadow(0 4px 8px rgba(40,30,15,.2))', animation: `ngoc-float ${4 + idx * 0.4}s ease-in-out infinite` }} />
          </div>
          <div style={{ position: 'absolute', bottom: -2, right: -4, padding: '2px 6px', background: w.accent, color: '#fff', borderRadius: 999, fontFamily: V.headFont, fontSize: 8, fontWeight: 900, letterSpacing: '0.06em', boxShadow: '0 1px 0 rgba(60,20,5,.15)' }}>#{idx + 1}</div>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{ fontFamily: V.headFont, fontSize: 22, fontWeight: 1000, color: V.ink, margin: 0, letterSpacing: '-0.02em' }}>{w.name}</h3>
          <div style={{ fontFamily: '"Lora", serif', fontStyle: 'italic', fontSize: 13, fontWeight: 500, color: V.inkSoft, marginTop: 1 }}>{w.tagline}</div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 5, padding: '2px 8px', background: w.accentSoft, color: w.accent, borderRadius: 999, fontFamily: V.bodyFont, fontSize: 10, fontWeight: 800 }}>
            <Icon name="target" size={10} stroke={w.accent} strokeWidth={2.4} /> {w.target}
          </div>
        </div>
      </div>
      {/* quote */}
      <div style={{ fontFamily: '"Lora", serif', fontStyle: 'italic', fontSize: 12, fontWeight: 500, color: V.inkSoft, lineHeight: 1.45, paddingLeft: 10, borderLeft: `3px solid ${w.accent}`, marginBottom: 14 }}>
        {w.moodNote}
      </div>
      {/* steps — horizontal scroll */}
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 6, marginLeft: -18, marginRight: -18, paddingLeft: 18, paddingRight: 18, scrollbarWidth: 'thin' }}>
        {w.steps.map((s, i) => (
          <React.Fragment key={i}>
            <div style={{ flexShrink: 0, width: 130, background: V.panel, borderRadius: 12, border: `1px solid ${V.border}`, padding: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <div style={{ width: 22, height: 22, borderRadius: 7, background: w.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 1.5px 0 rgba(60,20,5,.12)` }}>
                  <Icon name={s.icon} size={11} stroke="#fff" fill="#fff" strokeWidth={2.4} />
                </div>
                <span style={{ fontFamily: V.monoFont, fontSize: 9, fontWeight: 700, color: V.muted }}>0{i + 1}</span>
              </div>
              <div style={{ fontFamily: V.headFont, fontSize: 11, fontWeight: 900, color: V.ink, lineHeight: 1.2 }}>{s.label}</div>
              <div style={{ fontFamily: V.bodyFont, fontSize: 9.5, fontWeight: 700, color: V.muted, marginTop: 2, lineHeight: 1.35 }}>{s.detail}</div>
            </div>
            {i < w.steps.length - 1 && <div style={{ alignSelf: 'center', flexShrink: 0 }}><Icon name="arrowRight" size={12} stroke={w.accent} strokeWidth={2.6} /></div>}
          </React.Fragment>
        ))}
      </div>
      {/* outcome */}
      <div style={{ marginTop: 12, padding: '10px 12px', background: `linear-gradient(90deg, ${w.accentSoft}, ${w.accentSoft}00)`, borderRadius: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 26, height: 26, borderRadius: 8, background: w.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon name="trophy" size={13} stroke="#fff" strokeWidth={2.4} />
        </div>
        <div>
          <div style={{ fontFamily: V.bodyFont, fontSize: 9, fontWeight: 900, color: w.accent, letterSpacing: '0.14em', textTransform: 'uppercase' }}>Kết quả</div>
          <div style={{ fontFamily: V.headFont, fontSize: 12, fontWeight: 900, color: V.ink, marginTop: 1, lineHeight: 1.2 }}>{w.outcome}</div>
        </div>
      </div>
    </div>
  </Reveal>
);

const MWorkflows = ({ accent = BUN_BLUE }) => (
  <section id="Workflow" style={{ padding: '44px 20px', background: V.panel }}>
    <div style={{ textAlign: 'center', marginBottom: 22 }}>
      <div style={{ fontFamily: V.bodyFont, fontSize: 10, fontWeight: 900, color: V.muted, letterSpacing: '0.16em', textTransform: 'uppercase' }}>★ Quan trọng nhất</div>
      <h2 style={{ fontFamily: V.headFont, fontSize: 28, fontWeight: 1000, color: V.ink, margin: '4px 0 8px', letterSpacing: '-0.025em', lineHeight: 1.1 }}>
        Ba người, ba <span style={{ fontStyle: 'italic', fontFamily: '"Lora", serif', fontWeight: 600, color: accent }}>nhịp học</span>
      </h2>
      <p style={{ fontFamily: V.bodyFont, fontSize: 13, fontWeight: 600, color: V.inkSoft, margin: 0, lineHeight: 1.5 }}>
        Bún không ép 1 lộ trình. Pick & mix theo nhịp riêng.
      </p>
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {BUN_WORKFLOWS.map((w, i) => <MWorkflowChapter key={w.name} w={w} idx={i} />)}
    </div>
  </section>
);

// Mobile screenshots — horizontal swipe
const MScreenshots = ({ accent = BUN_BLUE }) => (
  <section style={{ padding: '44px 0', background: '#fff', overflow: 'hidden' }}>
    <div style={{ padding: '0 20px', marginBottom: 18 }}>
      <div style={{ fontFamily: V.bodyFont, fontSize: 10, fontWeight: 900, color: V.muted, letterSpacing: '0.16em', textTransform: 'uppercase' }}>Một vài góc</div>
      <h2 style={{ fontFamily: V.headFont, fontSize: 28, fontWeight: 1000, color: V.ink, margin: '4px 0 4px', letterSpacing: '-0.025em' }}>
        Trông thế này, <span style={{ fontStyle: 'italic', fontFamily: '"Lora", serif', fontWeight: 600, color: accent }}>cảm giác sao</span>?
      </h2>
      <div style={{ fontFamily: V.bodyFont, fontSize: 11, fontWeight: 700, color: V.muted, marginTop: 4 }}>Vuốt ngang để xem →</div>
    </div>
    <div style={{ display: 'flex', gap: 12, overflowX: 'auto', padding: '0 20px 6px', scrollSnapType: 'x mandatory' }}>
      {[
        { label: 'DASHBOARD', color: accent, hint: 'Streak, lịch ôn, 4 trạng thái từ.', mock: <MockDashboard /> },
        { label: 'FLASHCARD', color: V_C.blue, hint: 'Gõ tiếng Anh khi mình đưa nghĩa.', mock: <MockFlashcard /> },
        { label: 'ÔN TẬP', color: V_C.purple, hint: 'Char-diff hiện chỗ sai + rate.', mock: <MockReveal /> },
      ].map((s, i) => (
        <div key={i} style={{ flexShrink: 0, width: 230, scrollSnapAlign: 'start' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', background: s.color, color: '#fff', borderRadius: 999, fontFamily: V.headFont, fontWeight: 900, fontSize: 9, letterSpacing: '0.06em', marginBottom: 8 }}>{s.label}</div>
          <div style={{ width: '100%', aspectRatio: '4 / 3', background: '#fff', border: `1px solid ${V.border}`, borderRadius: 12, boxShadow: '0 12px 24px rgba(40,30,15,.10), 0 4px 0 rgba(40,30,15,.06)', overflow: 'hidden', position: 'relative' }}>
            <div style={{ height: 12, background: V.panel, borderBottom: `1px solid ${V.border}`, display: 'flex', alignItems: 'center', gap: 3, padding: '0 5px' }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: V_C.red }} />
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: V_C.yellow }} />
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: V.primary }} />
            </div>
            <div style={{ position: 'absolute', top: 12, left: 0, right: 0, bottom: 0 }}>{s.mock}</div>
          </div>
          <div style={{ fontFamily: V.bodyFont, fontSize: 11, fontWeight: 700, color: V.inkSoft, marginTop: 8, lineHeight: 1.4 }}>{s.hint}</div>
        </div>
      ))}
    </div>
  </section>
);

// Mobile why-bun
const MWhy = ({ accent = BUN_BLUE }) => (
  <section id="Về Bún" style={{ padding: '44px 20px' }}>
    <div style={{ textAlign: 'center', marginBottom: 22 }}>
      <div style={{ fontFamily: V.bodyFont, fontSize: 10, fontWeight: 900, color: V.muted, letterSpacing: '0.16em', textTransform: 'uppercase' }}>Vì sao Bún</div>
      <h2 style={{ fontFamily: V.headFont, fontSize: 28, fontWeight: 1000, color: V.ink, margin: '4px 0 0', letterSpacing: '-0.025em', lineHeight: 1.1 }}>
        4 thứ khác với app <span style={{ fontStyle: 'italic', fontFamily: '"Lora", serif', fontWeight: 600, color: accent }}>bạn đã thử</span>
      </h2>
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {BUN_REASONS.map((r, i) => (
        <Reveal key={i} delay={i * 70} distance={20}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, background: '#fff', border: `1px solid ${V.border}`, boxShadow: V.shadowMd, borderRadius: 16, padding: '16px 16px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: -20, right: -20, width: 90, height: 90, borderRadius: '50%', background: r.color, opacity: 0.08 }} />
            <div style={{ flexShrink: 0, width: 56, height: 56, borderRadius: 14, background: r.color, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 3px 0 rgba(20,40,80,.12), 0 4px 10px ${r.color}50` }}>
              <Icon name={r.icon} size={26} stroke="#fff" fill="#fff" strokeWidth={2.2} />
            </div>
            <div style={{ flex: 1, minWidth: 0, position: 'relative' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', background: `${r.color}1a`, color: r.color, borderRadius: 999, fontFamily: V.bodyFont, fontSize: 9, fontWeight: 900, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>0{i + 1} · {r.eyebrow}</div>
              <h3 style={{ fontFamily: V.headFont, fontSize: 16, fontWeight: 1000, color: V.ink, margin: '0 0 4px', letterSpacing: '-0.015em', lineHeight: 1.2 }}>{r.title}</h3>
              <p style={{ fontFamily: V.bodyFont, fontSize: 12, fontWeight: 600, color: V.inkSoft, margin: 0, lineHeight: 1.5 }}>{r.body}</p>
            </div>
          </div>
        </Reveal>
      ))}
    </div>
  </section>
);

// Mobile FAQ
const MFaq = ({ accent = BUN_BLUE }) => {
  const [open, setOpen] = React.useState(0);
  return (
    <section id="FAQ" style={{ padding: '44px 20px', background: V.panel }}>
      <div style={{ textAlign: 'center', marginBottom: 18 }}>
        <div style={{ fontFamily: V.bodyFont, fontSize: 10, fontWeight: 900, color: V.muted, letterSpacing: '0.16em', textTransform: 'uppercase' }}>Hỏi · Đáp</div>
        <h2 style={{ fontFamily: V.headFont, fontSize: 28, fontWeight: 1000, color: V.ink, margin: '4px 0 8px', letterSpacing: '-0.025em' }}>
          Mấy câu <span style={{ fontStyle: 'italic', fontFamily: '"Lora", serif', fontWeight: 600, color: accent }}>thường gặp</span>
        </h2>
        <p style={{ fontFamily: V.bodyFont, fontSize: 12, fontWeight: 600, color: V.inkSoft, margin: 0, lineHeight: 1.5 }}>
          Còn câu khác? <b style={{ color: V.ink }}>chao@bun.app</b>
        </p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {BUN_FAQS.map((f, i) => (
          <div key={i} style={{
            background: '#fff', border: `1px solid ${open === i ? accent + '55' : V.border}`,
            boxShadow: open === i ? `0 6px 14px ${accent}25, 0 2px 0 ${accent}20` : V.shadow,
            borderRadius: 13, overflow: 'hidden', transition: 'all .2s ease',
          }}>
            <button onClick={() => setOpen(open === i ? -1 : i)} style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '14px 14px',
              background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left',
            }}>
              <div style={{ width: 26, height: 26, borderRadius: 8, background: open === i ? accent : V.panel, color: open === i ? '#fff' : V.inkSoft, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: V.headFont, fontWeight: 1000, fontSize: 10, flexShrink: 0, transition: 'all .2s ease' }}>
                Q{i + 1}
              </div>
              <h3 style={{ flex: 1, fontFamily: V.headFont, fontSize: 13, fontWeight: 900, color: V.ink, margin: 0, letterSpacing: '-0.005em', lineHeight: 1.3 }}>{f.q}</h3>
              <div style={{ width: 22, height: 22, borderRadius: 7, background: open === i ? accent : V.panel, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .25s ease', transform: open === i ? 'rotate(45deg)' : 'rotate(0deg)', flexShrink: 0 }}>
                <Icon name="plus" size={11} stroke={open === i ? '#fff' : V.ink} strokeWidth={2.8} />
              </div>
            </button>
            <div style={{ maxHeight: open === i ? 240 : 0, overflow: 'hidden', transition: 'max-height .35s cubic-bezier(.4,0,.2,1)' }}>
              <div style={{ padding: '0 14px 14px 50px', fontFamily: V.bodyFont, fontSize: 12, fontWeight: 600, color: V.inkSoft, lineHeight: 1.55 }}>
                {f.a}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

// Mobile CTA
const MCTA = ({ accent = BUN_BLUE }) => (
  <section style={{ padding: '32px 20px 48px' }}>
    <Reveal>
      <div style={{
        position: 'relative', borderRadius: 24, padding: '32px 22px 26px',
        background: `linear-gradient(135deg, ${accent} 0%, #1e87c0 100%)`,
        boxShadow: `0 6px 0 rgba(20,40,80,.2), 0 14px 28px ${accent}55`,
        overflow: 'hidden', textAlign: 'center',
      }}>
        <Sparkles items={[[40, 40, 8, '#fff', 0], [330, 60, 9, V_C.yellow, 0.5], [350, 280, 10, '#fff', 1.0], [30, 320, 8, V_C.yellow, 0.7]]} />
        <div style={{ position: 'relative', display: 'inline-block', marginBottom: 14 }}>
          <div style={{ position: 'absolute', inset: -12, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,255,255,.25), rgba(255,255,255,0))' }} />
          <img src={MASCOT.celebrate} width={140} height={140} alt="Bún" style={{ position: 'relative', filter: 'drop-shadow(0 8px 18px rgba(40,30,15,.32))', animation: 'ngoc-bob 2.2s ease-in-out infinite' }} />
        </div>
        <h2 style={{ fontFamily: V.headFont, fontSize: 32, fontWeight: 1000, color: '#fff', lineHeight: 1.0, margin: 0, letterSpacing: '-0.03em', textShadow: '0 2px 0 rgba(20,40,80,.22)' }}>
          Sẵn sàng <span style={{ fontStyle: 'italic', fontFamily: '"Lora", serif', fontWeight: 600 }}>bắt đầu</span> chưa?
        </h2>
        <p style={{ fontFamily: V.bodyFont, fontSize: 14, fontWeight: 700, lineHeight: 1.4, margin: '10px 0 18px', color: 'rgba(255,255,255,0.96)' }}>
          Tạo deck đầu tiên trong <b>30 giây</b>. Bún auto-fill IPA · audio · ví dụ · ảnh.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          <button className="bun-cta-btn" style={{
            position: 'relative', padding: '15px 24px', background: '#fff', color: accent, border: 'none',
            boxShadow: '0 4px 0 rgba(20,40,80,.22), 0 6px 14px rgba(40,30,15,.18)', borderRadius: 16,
            fontFamily: V.headFont, fontWeight: 1000, fontSize: 15, cursor: 'pointer', letterSpacing: '0.02em',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7,
          }}>
            <span style={{ position: 'absolute', inset: -3, borderRadius: 19, color: '#fff', animation: 'bun-pulse-ring 2.2s ease-out infinite', pointerEvents: 'none' }} />
            Vào học miễn phí <Icon name="arrowRight" size={17} stroke={accent} strokeWidth={3} />
          </button>
          <button className="bun-cta-btn" style={{
            padding: '13px 20px', background: 'rgba(255,255,255,0.18)', color: '#fff', border: '1.5px solid rgba(255,255,255,0.55)',
            borderRadius: 14, fontFamily: V.headFont, fontWeight: 900, fontSize: 13, cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7,
          }}>
            <Icon name="play" size={11} fill="#fff" stroke="#fff" /> Xem demo trước
          </button>
        </div>
        <div style={{ marginTop: 14, fontFamily: V.bodyFont, fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.85)' }}>
          Không cần thẻ · Tiếng Việt · Export Anki
        </div>
      </div>
    </Reveal>
  </section>
);

// Mobile footer
const MFooter = () => (
  <footer style={{ padding: '24px 20px 28px', borderTop: `1px solid ${V.border}`, background: '#fff' }}>
    <div style={{ marginBottom: 18 }}>
      <BunLogo size={32} pose="idle" />
      <p style={{ fontFamily: V.bodyFont, fontSize: 12, fontWeight: 600, color: V.inkSoft, lineHeight: 1.5, margin: '8px 0 0' }}>
        App học tiếng Anh cho người Việt. 8 modality, AI lo phần khô.
      </p>
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
      {[
        { title: 'Sản phẩm', items: ['Tính năng', 'Workflow', 'Roadmap'] },
        { title: 'Liên hệ', items: ['chao@bun.app', 'GitHub', 'X / Threads'] },
      ].map(col => (
        <div key={col.title}>
          <div style={{ fontFamily: V.bodyFont, fontSize: 9, fontWeight: 900, color: V.muted, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 8 }}>{col.title}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {col.items.map(i => (
              <a key={i} className="bun-footer-link" style={{ fontFamily: V.bodyFont, fontSize: 12, fontWeight: 700, color: V.inkSoft, textDecoration: 'none' }}>{i}</a>
            ))}
          </div>
        </div>
      ))}
    </div>
    <div style={{ paddingTop: 14, borderTop: `1px solid ${V.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
      <div style={{ fontFamily: V.monoFont, fontSize: 9.5, fontWeight: 600, color: V.muted }}>
        © 2026 · with <span style={{ color: V_C.red }}>♥</span> by Chloe
      </div>
      <div style={{ display: 'flex', gap: 10, fontFamily: V.bodyFont, fontSize: 10, fontWeight: 700, color: V.muted }}>
        <a className="bun-footer-link" style={{ color: V.muted, textDecoration: 'none' }}>Privacy</a>
        <a className="bun-footer-link" style={{ color: V.muted, textDecoration: 'none' }}>Terms</a>
        <a className="bun-footer-link" style={{ color: V.muted, textDecoration: 'none' }}>v0.4</a>
      </div>
    </div>
  </footer>
);

// Assembly
const BunLanding_mobile = () => (
  <div style={{ width: '100%', minHeight: '100%', background: V.bg, color: V.ink, fontFamily: V.bodyFont, overflow: 'hidden' }}>
    <MNav />
    <MHero />
    <MMarquee />
    <MValueProps />
    <MFeatures />
    <MWorkflows />
    <MScreenshots />
    <MWhy />
    <MFaq />
    <MCTA />
    <MFooter />
  </div>
);

Object.assign(window, { BunLanding_mobile, MNav, MHero, MMarquee, MValueProps, MFeatures, MWorkflows, MScreenshots, MWhy, MFaq, MCTA, MFooter });
