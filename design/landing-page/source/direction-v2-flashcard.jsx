// V2 — Flashcard nhanh (quick MCQ mode): playing + result

// Sample flashcard data
const flashcardQ = {
  en: 'equal',
  ipa: '/ˈiːkwəl/',
  options: [
    { key: 'A', text: 'Ưu đãi, dành sự ưu tiên.', correct: false },
    { key: 'B', text: 'bằng', correct: true },
    { key: 'C', text: 'Sự tuyên bố, bản tuyên ngôn.', correct: false },
    { key: 'D', text: 'Du lịch', correct: false },
  ],
};

// Flashcard sub-header (back to dashboard breadcrumb + title)
const V_FlashSubHeader = () => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
    <a style={{ display: 'flex', alignItems: 'center', gap: 4, fontFamily: V.bodyFont, fontSize: 12, fontWeight: 700, color: V.muted, textDecoration: 'none', cursor: 'pointer' }}>
      <Icon name="arrowLeft" size={14} stroke={V.muted} strokeWidth={2.4} /> Dashboard
    </a>
    <div style={{ width: 28, height: 28, borderRadius: 9, background: V_C.yellow, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 2px 4px ${V_C.yellow}50` }}>
      <Icon name="bolt" size={15} stroke="#fff" fill="#fff" strokeWidth={2.4} />
    </div>
    <h1 style={{ fontFamily: V.headFont, fontSize: 22, fontWeight: 900, margin: 0, letterSpacing: '-0.02em', color: V.ink }}>Flashcard nhanh</h1>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Flashcard — In Progress
// ─────────────────────────────────────────────────────────────────────────────
const V_Flashcard = () => (
  <V_Frame>
    <V_Sidebar active="flash" />
    <main style={{ flex: 1, padding: '20px 32px 24px', display: 'flex', flexDirection: 'column', gap: 16, overflow: 'auto' }}>
      <V_FlashSubHeader />
      <div style={{ fontFamily: V.bodyFont, fontSize: 13, fontWeight: 600, color: V.inkSoft }}>
        20 câu — 5 giây mỗi câu. Pick đáp án đúng nhanh nhất có thể.
      </div>

      {/* Progress + timer */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ fontFamily: V.bodyFont, fontSize: 12, fontWeight: 800, color: V.inkSoft, letterSpacing: '0.06em', textTransform: 'uppercase', flexShrink: 0 }}>Câu 1 / 20</div>
        <div style={{ flex: 1, height: 12, background: '#fff', border: `1px solid ${V.border}`, borderRadius: 999, overflow: 'hidden' }}>
          <div style={{ width: '5%', height: '100%', background: `linear-gradient(90deg, ${V.primary}, #6cb83a)`, borderRadius: 999 }} />
        </div>
        {/* Timer pill */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px 5px 8px',
          background: '#fff', border: `1px solid ${V.border}`, borderRadius: 999, boxShadow: V.shadow,
          fontFamily: V.monoFont, fontWeight: 800, fontSize: 14, color: V.ink,
        }}>
          <Icon name="bolt" size={14} fill={V_C.yellow} stroke={V_C.yellow} /> 4.3s
        </div>
      </div>

      {/* Center stage */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 28, paddingTop: 8, position: 'relative' }}>
        {/* Sparkles */}
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
          {[[150,40,7,V_C.yellow,0],[870,80,8,V_C.pink,0.7],[100,420,6,V_C.blue,1.2],[890,400,9,V.primary,0.4]].map(([x,y,s,c,d],i) => (
            <g key={i} style={{ animation: `sparkle-twinkle 2.2s ease-in-out ${d}s infinite`, transformOrigin: `${x}px ${y}px` }}>
              <polygon points={`${x},${y-s} ${x+s*0.32},${y-s*0.32} ${x+s},${y} ${x+s*0.32},${y+s*0.32} ${x},${y+s} ${x-s*0.32},${y+s*0.32} ${x-s},${y} ${x-s*0.32},${y-s*0.32}`} fill={c} />
            </g>
          ))}
        </svg>

        {/* Word + audio */}
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontFamily: V.headFont, fontSize: 56, fontWeight: 900, color: V.ink, margin: 0, letterSpacing: '-0.03em', lineHeight: 1, position: 'relative', display: 'inline-block' }}>
            <span style={{ position: 'absolute', left: -4, right: -4, bottom: 2, height: '32%', background: V_C.yellow, opacity: 0.32, zIndex: 0, borderRadius: 4 }} />
            <span style={{ position: 'relative', zIndex: 1 }}>{flashcardQ.en}</span>
          </h2>
          <div style={{ fontFamily: V.monoFont, fontSize: 16, color: V.accent, fontWeight: 600, marginTop: 8 }}>{flashcardQ.ipa}</div>
          <button style={{
            marginTop: 10, width: 40, height: 40, background: '#fff', border: `1px solid ${V.border}`,
            boxShadow: V.shadow, borderRadius: '50%', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon name="speaker" size={17} stroke={V.gem} strokeWidth={2.2} />
          </button>
        </div>

        {/* Options 2x2 */}
        <div style={{ width: '100%', maxWidth: 880, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
          {flashcardQ.options.map((opt, i) => {
            const cols = [V_C.pink, V.primary, V_C.purple, V_C.blue];
            const c = cols[i];
            return (
              <button key={opt.key} style={{
                display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px',
                background: '#fff', border: `1.5px solid ${V.border}`, boxShadow: V.shadowMd,
                borderRadius: 16, cursor: 'pointer', textAlign: 'left', transition: 'transform .12s, box-shadow .12s',
              }}>
                <div style={{
                  width: 34, height: 34, borderRadius: 10, background: c, color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: V.headFont, fontWeight: 900, fontSize: 15, flexShrink: 0,
                  boxShadow: `0 2px 6px ${c}50`,
                }}>{opt.key}</div>
                <span style={{ fontFamily: V.bodyFont, fontSize: 15, fontWeight: 700, color: V.ink, lineHeight: 1.3 }}>{opt.text}</span>
              </button>
            );
          })}
        </div>

        {/* Hint */}
        <div style={{ fontFamily: V.bodyFont, fontSize: 12, fontWeight: 700, color: V.muted, display: 'flex', alignItems: 'center', gap: 6 }}>
          Phím <kbd style={{ fontFamily: V.monoFont, background: '#fff', border: `1px solid ${V.border}`, borderRadius: 4, padding: '1px 6px', fontSize: 11, fontWeight: 700 }}>A</kbd> <kbd style={{ fontFamily: V.monoFont, background: '#fff', border: `1px solid ${V.border}`, borderRadius: 4, padding: '1px 6px', fontSize: 11, fontWeight: 700 }}>B</kbd> <kbd style={{ fontFamily: V.monoFont, background: '#fff', border: `1px solid ${V.border}`, borderRadius: 4, padding: '1px 6px', fontSize: 11, fontWeight: 700 }}>C</kbd> <kbd style={{ fontFamily: V.monoFont, background: '#fff', border: `1px solid ${V.border}`, borderRadius: 4, padding: '1px 6px', fontSize: 11, fontWeight: 700 }}>D</kbd> hoặc <kbd style={{ fontFamily: V.monoFont, background: '#fff', border: `1px solid ${V.border}`, borderRadius: 4, padding: '1px 6px', fontSize: 11, fontWeight: 700 }}>1</kbd>–<kbd style={{ fontFamily: V.monoFont, background: '#fff', border: `1px solid ${V.border}`, borderRadius: 4, padding: '1px 6px', fontSize: 11, fontWeight: 700 }}>4</kbd> · <kbd style={{ fontFamily: V.monoFont, background: '#fff', border: `1px solid ${V.border}`, borderRadius: 4, padding: '1px 6px', fontSize: 11, fontWeight: 700 }}>Space</kbd> để nghe lại
        </div>
      </div>
    </main>
  </V_Frame>
);

// ─────────────────────────────────────────────────────────────────────────────
// Flashcard — Result
// ─────────────────────────────────────────────────────────────────────────────
const V_FlashcardResult = () => (
  <V_Frame>
    <V_Sidebar active="flash" />
    <main style={{ flex: 1, padding: '20px 32px 24px', display: 'flex', flexDirection: 'column', gap: 16, overflow: 'auto' }}>
      <V_FlashSubHeader />

      {/* Result hero */}
      <V_Card padding={28} style={{ position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', gap: 28 }}>
        {/* Confetti sparkles */}
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
          {[
            [80, 30, 9, V_C.yellow], [180, 60, 6, V_C.pink], [60, 200, 7, V_C.blue],
            [380, 30, 8, V.primary], [560, 50, 7, V_C.purple], [680, 90, 9, V_C.orange],
            [820, 40, 6, V_C.teal], [900, 180, 8, V_C.pink],
          ].map(([x,y,s,c],i) => (
            <g key={i} style={{ animation: `sparkle-twinkle 2s ease-in-out ${i*0.15}s infinite`, transformOrigin: `${x}px ${y}px` }}>
              <polygon points={`${x},${y-s} ${x+s*0.32},${y-s*0.32} ${x+s},${y} ${x+s*0.32},${y+s*0.32} ${x},${y+s} ${x-s*0.32},${y+s*0.32} ${x-s},${y} ${x-s*0.32},${y-s*0.32}`} fill={c} />
            </g>
          ))}
        </svg>

        <img src={MASCOT.happy} width={130} height={130} alt="" style={{ flexShrink: 0, filter: 'drop-shadow(0 6px 12px rgba(40,30,15,.18))', animation: 'ngoc-bob 2.2s ease-in-out infinite', position: 'relative' }} />

        <div style={{ flex: 1, position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ background: V.primary, color: '#fff', borderRadius: 999, padding: '3px 12px', fontFamily: V.headFont, fontWeight: 900, fontSize: 11, letterSpacing: '0.08em', boxShadow: `0 2px 6px ${V.primary}40` }}>XONG!</span>
            <span style={{ fontFamily: V.bodyFont, fontSize: 13, fontWeight: 700, color: V.inkSoft }}>🎉 cố quá!</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginTop: 8 }}>
            <div style={{ fontFamily: V.headFont, fontSize: 68, fontWeight: 900, color: V.primary, lineHeight: 1, letterSpacing: '-0.03em' }}>67%</div>
            <div>
              <div style={{ fontFamily: V.headFont, fontSize: 17, fontWeight: 800, color: V.ink, lineHeight: 1.2 }}>2 / 3 câu đúng</div>
              <div style={{ fontFamily: V.bodyFont, fontSize: 12, fontWeight: 700, color: V.muted, marginTop: 2 }}>thời gian TB mỗi câu đúng <b style={{ color: V.inkSoft }}>3.5s</b></div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0, position: 'relative' }}>
          <button style={{
            padding: '11px 20px', background: V.primary, color: '#fff', border: 'none',
            boxShadow: `0 4px 0 rgba(60,20,5,.15), 0 6px 14px ${V.primary}40`, borderRadius: 14,
            fontFamily: V.headFont, fontWeight: 900, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, letterSpacing: '0.02em',
          }}>
            <Icon name="refresh" size={14} stroke="#fff" strokeWidth={2.6} /> CHƠI LẠI
          </button>
          <button style={{
            padding: '10px 20px', background: '#fff', color: V.inkSoft, border: `1px solid ${V.border}`,
            boxShadow: V.shadow, borderRadius: 14, fontFamily: V.headFont, fontWeight: 800, fontSize: 13, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center',
          }}>
            <Icon name="home" size={13} stroke={V.inkSoft} strokeWidth={2.2} /> Về dashboard
          </button>
        </div>
      </V_Card>

      {/* Stat cards */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {[
          { value: 2, label: 'Đúng', color: V.primary, icon: 'check', emoji: '✅' },
          { value: 1, label: 'Sai', color: V_C.red, icon: 'plus', emoji: '❌' },
          { value: 0, label: 'Hết giờ', color: V_C.orange, icon: 'bolt', emoji: '⏱️' },
          { value: 2, label: 'Streak dài nhất', color: V.gem, icon: 'flame', emoji: '🔥' },
        ].map((s, i) => (
          <V_Card key={i} padding="14px 18px" style={{ position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: -16, right: -16, width: 64, height: 64, borderRadius: '50%', background: s.color, opacity: 0.13 }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, position: 'relative' }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: `0 2px 6px ${s.color}40`, fontSize: 16 }}>
                {s.emoji}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: V.headFont, fontSize: 28, fontWeight: 900, color: V.ink, lineHeight: 1, letterSpacing: '-0.02em' }}>{s.value}</div>
                <div style={{ fontFamily: V.bodyFont, fontSize: 12, fontWeight: 800, color: V.inkSoft, marginTop: 2 }}>{s.label}</div>
              </div>
            </div>
          </V_Card>
        ))}
      </section>

      {/* Mini bar chart-ish summary */}
      <V_Card padding={16}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <h3 style={{ fontFamily: V.headFont, fontSize: 15, fontWeight: 900, margin: 0, color: V.ink }}>Tốc độ theo từng câu</h3>
          <span style={{ fontFamily: V.bodyFont, fontSize: 11, fontWeight: 700, color: V.muted }}>càng ngắn càng nhanh</span>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end' }}>
          {[
            { q: 1, t: 2.1, ok: true },
            { q: 2, t: 4.8, ok: false },
            { q: 3, t: 3.5, ok: true },
          ].map((s, i) => (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{ width: '100%', height: 70, background: V.panel, borderRadius: 8, position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: `${(s.t / 5) * 100}%`, background: s.ok ? V.primary : V_C.red, borderRadius: 8 }} />
              </div>
              <div style={{ fontFamily: V.monoFont, fontSize: 11, fontWeight: 700, color: V.inkSoft }}>{s.t}s</div>
              <div style={{ fontFamily: V.bodyFont, fontSize: 10, fontWeight: 700, color: V.muted }}>Câu {s.q}</div>
            </div>
          ))}
        </div>
      </V_Card>
    </main>
  </V_Frame>
);

Object.assign(window, { V_Flashcard, V_FlashcardResult });
