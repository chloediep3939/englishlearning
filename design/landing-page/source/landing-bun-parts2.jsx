// landing-bun-parts2.jsx — Workflows + Screenshots + WhyBun

// ─────────────────────────────────────────────────────────────────────────────
// Workflow data
const BUN_WORKFLOWS = [
  {
    name: 'Chloe',
    tagline: 'Học chuyên sâu',
    target: '30 từ / ngày',
    accent: V_C.pink,
    accentSoft: '#fde2ec',
    pose: 'learn',
    moodNote: '"Mình thích cày sâu một list — nhồi 1 từ qua 5 cách khác nhau, đảm bảo thuộc cho bằng được."',
    steps: [
      { icon: 'target', label: 'Đặt mục tiêu', detail: '30 từ mới mỗi ngày' },
      { icon: 'plus', label: 'Dán 30 từ tiếng Anh', detail: 'Bún auto-fill toàn bộ' },
      { icon: 'cards', label: 'Học flashcard', detail: 'Anki loop, ôn đến khi nhớ' },
      { icon: 'book', label: 'Viết đoạn văn', detail: 'Group 30 từ → AI chấm' },
      { icon: 'pencil', label: 'Điền chỗ trống', detail: 'Từ chính 30 từ đó' },
      { icon: 'speaker', label: 'Luyện đọc to', detail: 'Từng từ một' },
      { icon: 'quote', label: 'Đặt câu có timer', detail: '60s/từ, AI chấm' },
    ],
    outcome: 'Thuộc 30 từ ở 5 modality khác nhau',
  },
  {
    name: 'Minh',
    tagline: 'Người đi làm bận',
    target: '15 phút / ngày',
    accent: V_C.blue,
    accentSoft: '#e0f0fa',
    pose: 'flex',
    moodNote: '"Mình chỉ có 15 phút trước khi đi ngủ. Cần ngắn, gọn, mà vẫn giữ được streak."',
    steps: [
      { icon: 'bolt', label: '5 phút · Speed quiz', detail: 'Nhận diện 20 từ' },
      { icon: 'refresh', label: '5 phút · Flashcard', detail: 'Ôn deck due hôm nay' },
      { icon: 'speaker', label: '5 phút · Đọc to', detail: '3 từ khó nhất' },
    ],
    outcome: 'Giữ nhịp đều, không bỏ ngày',
  },
  {
    name: 'An',
    tagline: 'Học qua đọc báo',
    target: 'Input-driven',
    accent: V.primary,
    accentSoft: V.primarySoft,
    pose: 'dream',
    moodNote: '"Mình thích đọc Medium / BBC. Mỗi bài là 1 nguồn từ vựng — không cần học từ list khô khan."',
    steps: [
      { icon: 'plus', label: 'Dán bài Medium/BBC', detail: 'vào Bài đọc' },
      { icon: 'target', label: 'App chấm CEFR', detail: 'Biết khó hay dễ' },
      { icon: 'book', label: 'Click từ lạ', detail: 'Định nghĩa + lưu deck' },
      { icon: 'speaker', label: 'Karaoke TTS', detail: 'Nghe đúng âm' },
      { icon: 'pencil', label: 'Dịch sang Việt', detail: 'AI chấm bản dịch' },
      { icon: 'quote', label: 'Paraphrase tiếng Anh', detail: 'AI chấm cách viết' },
    ],
    outcome: 'Mỗi bài đọc = 1 deck + 4 bài luyện',
  },
];

// Footprint trail SVG (dragon paws in margin)
const FootprintTrail = ({ count = 6, color = V.primary, side = 'left' }) => (
  <svg width="40" height={count * 70} style={{ position: 'absolute', [side]: 12, top: 60, opacity: 0.18 }}>
    {Array.from({ length: count }).map((_, i) => {
      const y = i * 70 + 20;
      const xOffset = i % 2 === 0 ? 0 : 16;
      return (
        <g key={i} transform={`translate(${xOffset}, ${y}) rotate(${i % 2 === 0 ? -15 : 15})`}>
          <ellipse cx="10" cy="8" rx="6" ry="8" fill={color} />
          <circle cx="3" cy="0" r="2.5" fill={color} />
          <circle cx="9" cy="-3" r="2.5" fill={color} />
          <circle cx="15" cy="-1" r="2.5" fill={color} />
          <circle cx="19" cy="3" r="2.5" fill={color} />
        </g>
      );
    })}
  </svg>
);

// One persona chapter
const WorkflowChapter = ({ w, idx }) => (
  <Reveal delay={idx * 100} distance={36}>
  <div style={{
    position: 'relative', background: '#fff', border: `1px solid ${V.border}`,
    boxShadow: V.shadowLg, borderRadius: 26, padding: '32px 36px', overflow: 'hidden',
  }}>
    <FootprintTrail count={w.steps.length} color={w.accent} side={idx % 2 === 0 ? 'right' : 'left'} />
    {/* chapter header */}
    <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 24, position: 'relative' }}>
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <div style={{
          width: 120, height: 120, borderRadius: '50%', background: w.accentSoft,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: `2px solid ${w.accent}30`,
          boxShadow: `inset 0 -8px 16px ${w.accent}15`,
        }}>
          <img src={MASCOT[w.pose]} width={108} height={108} alt={w.name} style={{ filter: 'drop-shadow(0 6px 12px rgba(40,30,15,.22))', animation: `ngoc-float ${4 + idx * 0.4}s ease-in-out infinite` }} />
        </div>
        <div style={{
          position: 'absolute', bottom: -4, right: -8, padding: '3px 9px',
          background: w.accent, color: '#fff', borderRadius: 999, boxShadow: `0 2px 0 rgba(60,20,5,.15)`,
          fontFamily: V.headFont, fontSize: 10, fontWeight: 900, letterSpacing: '0.08em',
        }}>#{idx + 1}</div>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
          <h3 style={{ fontFamily: V.headFont, fontSize: 32, fontWeight: 1000, color: V.ink, margin: 0, letterSpacing: '-0.025em' }}>{w.name}</h3>
          <span style={{ fontFamily: '"Lora", serif', fontStyle: 'italic', fontSize: 19, fontWeight: 500, color: V.inkSoft }}>— {w.tagline}</span>
        </div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 6, padding: '4px 11px', background: w.accentSoft, color: w.accent, borderRadius: 999, fontFamily: V.bodyFont, fontSize: 12, fontWeight: 800, letterSpacing: '0.04em' }}>
          <Icon name="target" size={13} stroke={w.accent} strokeWidth={2.4} /> {w.target}
        </div>
      </div>
      {/* mood note pull-quote */}
      <div style={{ maxWidth: 320, fontFamily: '"Lora", serif', fontStyle: 'italic', fontSize: 14, fontWeight: 500, color: V.inkSoft, lineHeight: 1.5, paddingLeft: 16, borderLeft: `3px solid ${w.accent}` }}>
        {w.moodNote}
      </div>
    </div>

    {/* Step row */}
    <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 6, position: 'relative' }}>
      {w.steps.map((s, i) => (
        <React.Fragment key={i}>
          <Reveal delay={idx * 100 + 200 + i * 80} distance={16} style={{ flex: '1 1 0', minWidth: 0 }}>
          <div style={{
            background: V.panel, borderRadius: 16,
            border: `1px solid ${V.border}`, padding: '14px 14px 12px',
            display: 'flex', flexDirection: 'column', gap: 8, position: 'relative', height: '100%',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 28, height: 28, borderRadius: 9, background: w.accent,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: `0 2px 0 rgba(60,20,5,.12)`,
              }}>
                <Icon name={s.icon} size={14} stroke="#fff" fill="#fff" strokeWidth={2.4} />
              </div>
              <span style={{ fontFamily: V.monoFont, fontSize: 10, fontWeight: 700, color: V.muted }}>0{i + 1}</span>
            </div>
            <div>
              <div style={{ fontFamily: V.headFont, fontSize: 13, fontWeight: 900, color: V.ink, letterSpacing: '-0.005em', lineHeight: 1.2 }}>{s.label}</div>
              <div style={{ fontFamily: V.bodyFont, fontSize: 11, fontWeight: 700, color: V.muted, marginTop: 3, lineHeight: 1.35 }}>{s.detail}</div>
            </div>
          </div>
          </Reveal>
          {i < w.steps.length - 1 && (
            <div style={{ alignSelf: 'center', flexShrink: 0, color: V.muted }}>
              <Icon name="arrowRight" size={14} stroke={w.accent} strokeWidth={2.6} />
            </div>
          )}
        </React.Fragment>
      ))}
    </div>

    {/* Outcome */}
    <div style={{
      marginTop: 18, padding: '12px 16px',
      background: `linear-gradient(90deg, ${w.accentSoft}, ${w.accentSoft}00)`,
      borderRadius: 12, display: 'flex', alignItems: 'center', gap: 12,
    }}>
      <div style={{ width: 30, height: 30, borderRadius: 10, background: w.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 2px 4px ${w.accent}40`, flexShrink: 0 }}>
        <Icon name="trophy" size={15} stroke="#fff" strokeWidth={2.4} />
      </div>
      <div>
        <div style={{ fontFamily: V.bodyFont, fontSize: 10, fontWeight: 900, color: w.accent, letterSpacing: '0.16em', textTransform: 'uppercase' }}>Kết quả</div>
        <div style={{ fontFamily: V.headFont, fontSize: 15, fontWeight: 900, color: V.ink, marginTop: 1 }}>{w.outcome}</div>
      </div>
    </div>
  </div>
  </Reveal>
);

const BunWorkflows = ({ accent = BUN_BLUE }) => (
  <section id="Workflow" style={{ padding: '72px 48px', background: V.panel, position: 'relative' }}>
    <div style={{ textAlign: 'center', marginBottom: 40 }}>
      <div style={{ fontFamily: V.bodyFont, fontSize: 12, fontWeight: 900, color: V.muted, letterSpacing: '0.18em', textTransform: 'uppercase' }}>★ Quan trọng nhất</div>
      <h2 style={{ fontFamily: V.headFont, fontSize: 44, fontWeight: 1000, color: V.ink, margin: '6px 0 12px', letterSpacing: '-0.025em' }}>
        Ba người, ba <span style={{ fontStyle: 'italic', fontFamily: '"Lora", serif', fontWeight: 600, color: accent }}>nhịp học</span> khác nhau
      </h2>
      <p style={{ fontFamily: V.bodyFont, fontSize: 16, fontWeight: 600, color: V.inkSoft, margin: '0 auto', maxWidth: 580, lineHeight: 1.5 }}>
        Bún không ép bạn theo 1 lộ trình. Đây là cách 3 người Việt thật đang dùng — pick & mix module hợp với nhịp riêng.
      </p>
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {BUN_WORKFLOWS.map((w, i) => (
        <WorkflowChapter key={w.name} w={w} idx={i} />
      ))}
    </div>
    {/* Hint to mix */}
    <div style={{ marginTop: 28, textAlign: 'center', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 10, width: '100%' }}>
      <div style={{ flex: 1, height: 1, background: V.border }} />
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 14px', background: '#fff', border: `1px solid ${V.border}`, borderRadius: 999, boxShadow: V.shadow, fontFamily: V.bodyFont, fontSize: 13, fontWeight: 700, color: V.inkSoft }}>
        <Icon name="sparkle" size={14} stroke={accent} fill={accent} /> Hoặc trộn lại — workflow của bạn là của bạn.
      </div>
      <div style={{ flex: 1, height: 1, background: V.border }} />
    </div>
  </section>
);

// ─────────────────────────────────────────────────────────────────────────────
// Screenshot / micro-demo section — mini mockups of V2 pages
// ─────────────────────────────────────────────────────────────────────────────

// Mini Dashboard mock (simplified version of V_Dashboard)
const MockDashboard = () => (
  <div style={{ width: '100%', height: '100%', background: '#fff', display: 'flex', flexDirection: 'column', fontFamily: V.bodyFont }}>
    {/* sidebar strip */}
    <div style={{ flex: 1, display: 'flex' }}>
      <aside style={{ width: 52, background: V.panel, borderRight: `1px solid ${V.border}`, padding: '10px 6px', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {[V.primary, V.accent, V_C.orange, V_C.blue, V_C.yellow, V_C.teal, V_C.purple].map((c, i) => (
          <div key={i} style={{ width: 18, height: 18, borderRadius: 5, background: c, opacity: i === 0 ? 1 : 0.7, marginLeft: 12, boxShadow: i === 0 ? '0 1px 2px rgba(40,30,15,.2)' : 'none' }} />
        ))}
      </aside>
      <main style={{ flex: 1, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 6, fontWeight: 900, color: V.muted, letterSpacing: '0.14em' }}>CHƯƠNG 47</div>
            <div style={{ fontFamily: V.headFont, fontSize: 12, fontWeight: 900, color: V.ink, marginTop: 1 }}>Chào buổi sáng!</div>
          </div>
          <div style={{ display: 'flex', gap: 3 }}>
            {[V_C.red, V.gem, V_C.red].map((c, i) => <div key={i} style={{ background: '#fff', border: `1px solid ${V.border}`, borderRadius: 8, padding: '2px 5px', display: 'flex', alignItems: 'center', gap: 2 }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: c }} />
              <span style={{ fontFamily: V.headFont, fontWeight: 900, fontSize: 7, color: V.ink }}>{[7, 248, 5][i]}</span>
            </div>)}
          </div>
        </div>
        {/* hero strip */}
        <div style={{ background: 'linear-gradient(135deg, #ff8956, #ffa872)', borderRadius: 8, padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <img src={MASCOT.happy} width={36} height={36} />
          <div style={{ flex: 1, color: '#fff' }}>
            <div style={{ fontSize: 6, fontWeight: 800, letterSpacing: '0.08em', opacity: 0.85 }}>HÔM NAY</div>
            <div style={{ fontFamily: V.headFont, fontWeight: 900, fontSize: 10 }}>46 từ ôn · 10 mới</div>
          </div>
          <div style={{ background: '#fff', borderRadius: 6, padding: '3px 6px', fontFamily: V.headFont, fontSize: 7, fontWeight: 900, color: V.primary }}>ÔN NGAY</div>
        </div>
        {/* stat tiles */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4 }}>
          {[[12, V_C.blue], [38, V_C.orange], [154, V.primary], [73, V_C.purple]].map(([v, c], i) => (
            <div key={i} style={{ background: '#fff', border: `1px solid ${V.border}`, borderRadius: 7, padding: '5px 6px' }}>
              <div style={{ width: 10, height: 10, borderRadius: 3, background: c }} />
              <div style={{ fontFamily: V.headFont, fontWeight: 900, fontSize: 11, color: V.ink, marginTop: 3 }}>{v}</div>
            </div>
          ))}
        </div>
        {/* chart placeholder */}
        <div style={{ flex: 1, background: '#fff', border: `1px solid ${V.border}`, borderRadius: 7, padding: 6, display: 'flex', alignItems: 'flex-end', gap: 2 }}>
          {Array.from({ length: 18 }).map((_, i) => {
            const h = 8 + (((i * 23 + 7) % 30));
            return <div key={i} style={{ flex: 1, height: `${h}px`, background: i % 2 ? V.primary : V_C.blue, borderRadius: 1 }} />;
          })}
        </div>
      </main>
    </div>
  </div>
);

// Mini Flashcard mock
const MockFlashcard = () => (
  <div style={{ width: '100%', height: '100%', background: '#fff', padding: 14, display: 'flex', flexDirection: 'column', gap: 8, fontFamily: V.bodyFont }}>
    <div style={{ height: 8, background: V.panel, borderRadius: 999, overflow: 'hidden' }}>
      <div style={{ width: '26%', height: '100%', background: V.primary, borderRadius: 999 }} />
    </div>
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
      <div style={{ background: '#fff', padding: 4, borderRadius: 6, boxShadow: '0 4px 10px rgba(40,30,15,.08)', transform: 'rotate(-2deg)' }}>
        <div style={{ width: 90, height: 50, background: '#ffe4d4', borderRadius: 4 }} />
      </div>
      <div style={{ background: V.primarySoft, padding: '10px 16px', borderRadius: 16, border: `1px solid ${V.primary}30`, textAlign: 'center' }}>
        <div style={{ fontSize: 6, fontWeight: 900, color: V.primary, letterSpacing: '0.14em', marginBottom: 2 }}>HÃY DỊCH</div>
        <div style={{ fontFamily: V.headFont, fontWeight: 900, fontSize: 13, color: V.ink }}>"Ưu đãi, dành sự ưu tiên."</div>
      </div>
      <div style={{ width: '85%', padding: '8px 12px', background: '#fff', border: `2px solid ${V.primary}`, borderRadius: 10, fontFamily: V.headFont, fontWeight: 800, fontSize: 11, color: V.ink, textAlign: 'center', boxShadow: `0 2px 0 ${V.primary}30` }}>prefer<span style={{ borderRight: `1.5px solid ${V.primary}`, marginLeft: 2 }} /></div>
      <div style={{ padding: '7px 18px', background: V.primary, color: '#fff', borderRadius: 9, fontFamily: V.headFont, fontWeight: 900, fontSize: 9, letterSpacing: '0.06em', boxShadow: '0 2px 0 rgba(60,20,5,.18)' }}>KIỂM TRA</div>
    </div>
  </div>
);

// Mini Reveal mock
const MockReveal = () => (
  <div style={{ width: '100%', height: '100%', background: '#fff', padding: 14, display: 'flex', flexDirection: 'column', gap: 8, fontFamily: V.bodyFont }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{ fontSize: 6, fontWeight: 900, color: V.inkSoft, letterSpacing: '0.1em' }}>THẺ 12/46</span>
      <div style={{ flex: 1, height: 6, background: V.panel, borderRadius: 999, overflow: 'hidden' }}>
        <div style={{ width: '28%', height: '100%', background: V.primary }} />
      </div>
    </div>
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, paddingBottom: 6, borderBottom: `1px solid ${V.border}` }}>
      <div style={{ position: 'relative', display: 'inline-block' }}>
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 2, height: '35%', background: V.primary, opacity: 0.28, borderRadius: 2 }} />
        <span style={{ position: 'relative', fontFamily: V.headFont, fontWeight: 1000, fontSize: 26, color: V.ink, letterSpacing: '-0.03em' }}>preferential</span>
      </div>
      <span style={{ fontFamily: V.monoFont, fontSize: 10, color: V.accent, fontWeight: 600 }}>/ˌprefəˈrenʃəl/</span>
    </div>
    <div style={{ background: V.primarySoft, borderRadius: 8, padding: '8px 10px', border: `1px solid ${V.primary}30` }}>
      <div style={{ fontFamily: V.monoFont, fontSize: 10, color: V_C.red, fontWeight: 700, textAlign: 'center' }}>
        <span style={{ color: V.primary }}>prefer</span><span style={{ textDecoration: 'line-through' }}></span> → <span style={{ color: V.primary, fontSize: 12 }}>preferential</span>
      </div>
    </div>
    <div style={{ display: 'flex', gap: 6 }}>
      <div style={{ width: 3, alignSelf: 'stretch', background: V.accent, borderRadius: 2 }} />
      <div>
        <div style={{ fontSize: 6, fontWeight: 900, color: V.accent, letterSpacing: '0.12em' }}>NGHĨA</div>
        <div style={{ fontFamily: V.headFont, fontWeight: 800, fontSize: 11, color: V.ink }}>Ưu đãi, dành sự ưu tiên</div>
      </div>
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4, marginTop: 'auto' }}>
      {[V_C.red, V_C.orange, V.primary, V.gem].map((c, i) => (
        <div key={i} style={{ background: c, color: '#fff', borderRadius: 7, padding: '5px', textAlign: 'center', fontFamily: V.headFont, fontWeight: 900, fontSize: 8, letterSpacing: '0.04em', boxShadow: `0 2px 0 rgba(60,20,5,.15)` }}>
          {['LẠI', 'KHÓ', 'TỐT', 'DỄ'][i]}
        </div>
      ))}
    </div>
  </div>
);

const ScreenshotFrame = ({ label, hint, children, color, rotate = 0 }) => {
  const [hover, setHover] = React.useState(false);
  return (
  <div
    onMouseEnter={() => setHover(true)}
    onMouseLeave={() => setHover(false)}
    style={{
      position: 'relative', flex: 1,
      transform: `rotate(${hover ? 0 : rotate}deg) translateY(${hover ? -8 : 0}px)`,
      transition: 'transform .3s cubic-bezier(.2,.7,.3,1)',
      cursor: 'pointer',
    }}>
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', background: color, color: '#fff', borderRadius: 999, fontFamily: V.headFont, fontWeight: 900, fontSize: 11, letterSpacing: '0.04em', boxShadow: `0 2px 0 rgba(60,20,5,.12)`, marginBottom: 10 }}>{label}</div>
    <div style={{
      width: '100%', aspectRatio: '4 / 3', background: '#fff',
      border: `1px solid ${V.border}`, borderRadius: 16,
      boxShadow: hover ? '0 28px 50px rgba(40,30,15,.18), 0 8px 0 rgba(40,30,15,.06)' : '0 18px 36px rgba(40,30,15,.10), 0 6px 0 rgba(40,30,15,.06)',
      overflow: 'hidden', position: 'relative',
      transition: 'box-shadow .25s ease',
    }}>
      <div style={{ height: 14, background: V.panel, borderBottom: `1px solid ${V.border}`, display: 'flex', alignItems: 'center', gap: 3, padding: '0 6px' }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: V_C.red }} />
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: V_C.yellow }} />
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: V.primary }} />
      </div>
      <div style={{ position: 'absolute', top: 14, left: 0, right: 0, bottom: 0 }}>{children}</div>
    </div>
    <div style={{ fontFamily: V.bodyFont, fontSize: 12, fontWeight: 700, color: V.inkSoft, marginTop: 12, lineHeight: 1.4 }}>{hint}</div>
  </div>
  );
};

const BunScreenshots = ({ accent = BUN_BLUE }) => (
  <section style={{ padding: '80px 48px', background: '#fff', position: 'relative', overflow: 'hidden' }}>
    <Sparkles items={[[90, 60, 9, V_C.pink, 0], [1150, 100, 11, V_C.yellow, 0.6], [60, 480, 10, accent, 1.2]]} />
    <div style={{ textAlign: 'center', marginBottom: 44 }}>
      <div style={{ fontFamily: V.bodyFont, fontSize: 12, fontWeight: 900, color: V.muted, letterSpacing: '0.18em', textTransform: 'uppercase' }}>Một vài góc trong app</div>
      <h2 style={{ fontFamily: V.headFont, fontSize: 38, fontWeight: 1000, color: V.ink, margin: '6px 0 0', letterSpacing: '-0.025em' }}>
        Trông thế này, <span style={{ fontStyle: 'italic', fontFamily: '"Lora", serif', fontWeight: 600, color: accent }}>cảm giác thế nào</span>?
      </h2>
      <div style={{ fontFamily: V.bodyFont, fontSize: 13, fontWeight: 700, color: V.muted, marginTop: 6 }}>Di chuột vào ảnh để xem rõ hơn →</div>
    </div>
    <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
      <ScreenshotFrame label="DASHBOARD" color={accent} rotate={-1.4} hint="Chương 47 của bạn — streak, lịch ôn, 4 trạng thái từ. Bún chào mỗi sáng.">
        <MockDashboard />
      </ScreenshotFrame>
      <ScreenshotFrame label="FLASHCARD" color={V_C.blue} rotate={0.8} hint="Gõ tiếng Anh khi mình đưa nghĩa. Sai không sao — Bún tự điều chỉnh lịch ôn.">
        <MockFlashcard />
      </ScreenshotFrame>
      <ScreenshotFrame label="ÔN TẬP · REVEAL" color={V_C.purple} rotate={-0.5} hint="Char-diff hiện chỗ sai. Nghĩa, ví dụ, collocations — đọc xong tự rate.">
        <MockReveal />
      </ScreenshotFrame>
    </div>
  </section>
);

// ─────────────────────────────────────────────────────────────────────────────
// Why Bún — 4 reasons stacked alternating with mascot reactions
// ─────────────────────────────────────────────────────────────────────────────
const BUN_REASONS = [
  {
    eyebrow: 'Vietnamese-first',
    title: 'Không phải app dịch máy',
    body: 'Mọi nghĩa, ví dụ, gợi ý đều viết cho người Việt học — không phải bản dịch Google của Anki English deck.',
    icon: 'quote', color: V_C.pink, pose: 'celebrate',
  },
  {
    eyebrow: 'Không phải Anki copycat',
    title: 'Có Anki loop, mà mềm hơn',
    body: 'SM-2 vẫn ở dưới. Nhưng trên là 8 modality — không chỉ flip card khô khan như Anki vanilla.',
    icon: 'refresh', color: V_C.purple, pose: 'dream',
  },
  {
    eyebrow: 'AI thực sự hữu ích',
    title: 'Auto-fill, chấm bài — không phải chatbot',
    body: 'Bún không chat với bạn. Bún làm việc: sinh nội dung thẻ trong 3 giây, chấm bản dịch trong 5 giây.',
    icon: 'sparkle', color: V_C.orange, pose: 'magic',
  },
  {
    eyebrow: 'Workflow linh hoạt',
    title: 'Không ép lộ trình',
    body: 'Hôm nay muốn cày 30 từ? OK. Hôm sau chỉ muốn đọc 1 bài Medium? Cũng OK. Bún không gắt.',
    icon: 'gem', color: BUN_BLUE, pose: 'flex',
  },
];

const BunWhy = ({ accent = BUN_BLUE }) => (
  <section id="Về Bún" style={{ padding: '80px 48px', position: 'relative', overflow: 'hidden' }}>
    <div style={{ textAlign: 'center', marginBottom: 44 }}>
      <div style={{ fontFamily: V.bodyFont, fontSize: 12, fontWeight: 900, color: V.muted, letterSpacing: '0.18em', textTransform: 'uppercase' }}>Vì sao Bún</div>
      <h2 style={{ fontFamily: V.headFont, fontSize: 38, fontWeight: 1000, color: V.ink, margin: '6px 0 0', letterSpacing: '-0.025em' }}>
        4 thứ khác với app <span style={{ fontStyle: 'italic', fontFamily: '"Lora", serif', fontWeight: 600, color: accent }}>bạn đã thử</span>
      </h2>
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {BUN_REASONS.map((r, i) => {
        const flipped = i % 2 === 1;
        return (
          <Reveal key={i} delay={i * 80} distance={26}>
          <HoverLift lift={4}>
          <div style={{
            display: 'flex', flexDirection: flipped ? 'row-reverse' : 'row', alignItems: 'center', gap: 26,
            background: '#fff', border: `1px solid ${V.border}`, boxShadow: V.shadowMd, borderRadius: 22,
            padding: '22px 28px', position: 'relative', overflow: 'hidden',
          }}>
            <div style={{ position: 'absolute', [flipped ? 'left' : 'right']: -40, top: -30, width: 160, height: 160, borderRadius: '50%', background: r.color, opacity: 0.10 }} />
            <div style={{ flexShrink: 0, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 96, height: 96 }}>
              <div style={{ position: 'absolute', inset: 0, borderRadius: 22, background: r.color, boxShadow: `0 6px 0 rgba(20,40,80,.12), 0 8px 16px ${r.color}45` }} />
              <Icon name={r.icon} size={44} stroke="#fff" fill="#fff" strokeWidth={2.2} style={{ position: 'relative' }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 10px', background: `${r.color}1a`, color: r.color, borderRadius: 999, fontFamily: V.bodyFont, fontSize: 11, fontWeight: 900, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 7 }}>
                <Icon name={r.icon} size={12} stroke={r.color} fill={r.color} strokeWidth={2.4} /> {r.eyebrow}
              </div>
              <h3 style={{ fontFamily: V.headFont, fontSize: 24, fontWeight: 1000, color: V.ink, margin: '0 0 6px', letterSpacing: '-0.02em', lineHeight: 1.15 }}>{r.title}</h3>
              <p style={{ fontFamily: V.bodyFont, fontSize: 14, fontWeight: 600, color: V.inkSoft, margin: 0, lineHeight: 1.55 }}>{r.body}</p>
            </div>
            <div style={{ flexShrink: 0, fontFamily: V.headFont, fontWeight: 1000, fontSize: 70, color: V.panel, lineHeight: 1, letterSpacing: '-0.04em' }}>
              0{i + 1}
            </div>
          </div>
          </HoverLift>
          </Reveal>
        );
      })}
    </div>
  </section>
);

Object.assign(window, { BUN_WORKFLOWS, WorkflowChapter, BunWorkflows, MockDashboard, MockFlashcard, MockReveal, ScreenshotFrame, BunScreenshots, BunWhy, BUN_REASONS });
