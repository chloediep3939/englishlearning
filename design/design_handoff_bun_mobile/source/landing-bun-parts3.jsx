// landing-bun-parts3.jsx — FAQ + CTA + Footer + variant assemblies

// ─────────────────────────────────────────────────────────────────────────────
// FAQ
const BUN_FAQS = [
  {
    q: 'Có mất phí không?',
    a: 'Hiện tại Bún miễn phí dùng — bạn có thể tạo deck, dùng AI auto-fill, học SRS không giới hạn. Sau này có thể có tier pro (cho AI premium models), nhưng core sẽ luôn free.',
  },
  {
    q: 'Khác gì Anki / Duolingo?',
    a: 'Khác Anki: Bún có 8 modality (đọc to, viết câu, đoạn văn, bài đọc) + AI auto-fill, không phải chỉ flip card. Khác Duolingo: Bún không ép lộ trình bài — bạn pick & mix theo nhịp riêng, không tree linh tinh.',
  },
  {
    q: 'AI sai thì sao?',
    a: 'Bún dùng Gemini 2.5 Flash + dictionary cross-check cho IPA và nghĩa. Vẫn có thể sai — bạn edit trực tiếp được, hoặc 1-click regenerate. Bún không ép bạn tin AI.',
  },
  {
    q: 'Cần internet không?',
    a: 'Cần internet cho lần đầu mỗi thẻ (để AI sinh nội dung). Sau đó, ôn flashcard offline được — content đã cache. Đọc to, viết bài cần network.',
  },
  {
    q: 'Data của mình có an toàn không?',
    a: 'Decks và progress lưu trên Cloudflare D1 (account của bạn). Không bán data, không quảng cáo. Export sang Anki/CSV bất cứ lúc nào.',
  },
];

const FaqItem = ({ faq, idx, open, onToggle }) => (
  <div style={{
    background: '#fff', border: `1px solid ${V.border}`,
    boxShadow: open ? V.shadowMd : V.shadow, borderRadius: 16,
    overflow: 'hidden', transition: 'box-shadow .15s ease',
  }}>
    <button onClick={onToggle} style={{
      width: '100%', display: 'flex', alignItems: 'center', gap: 14, padding: '18px 22px',
      background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left',
    }}>
      <div style={{ width: 32, height: 32, borderRadius: 10, background: open ? V.primary : V.panel, color: open ? '#fff' : V.inkSoft, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: V.headFont, fontWeight: 1000, fontSize: 12, flexShrink: 0, transition: 'all .15s ease' }}>
        Q{idx + 1}
      </div>
      <h3 style={{ flex: 1, fontFamily: V.headFont, fontSize: 16, fontWeight: 900, color: V.ink, margin: 0, letterSpacing: '-0.01em' }}>{faq.q}</h3>
      <div style={{ width: 26, height: 26, borderRadius: 8, background: V.panel, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'transform .15s ease', transform: open ? 'rotate(45deg)' : 'rotate(0deg)' }}>
        <Icon name="plus" size={14} stroke={V.ink} strokeWidth={2.6} />
      </div>
    </button>
    {open && (
      <div style={{ padding: '0 22px 20px 68px', fontFamily: V.bodyFont, fontSize: 14, fontWeight: 600, color: V.inkSoft, lineHeight: 1.6 }}>
        {faq.a}
      </div>
    )}
  </div>
);

// FaqItem with explicit accent (for blue showcase)
const FaqItemBlue = ({ faq, idx, open, onToggle, accent }) => (
  <div style={{
    background: '#fff', border: `1px solid ${open ? accent + '55' : V.border}`,
    boxShadow: open ? `0 8px 20px ${accent}25, 0 3px 0 ${accent}20` : V.shadow, borderRadius: 16,
    overflow: 'hidden', transition: 'all .2s ease',
  }}>
    <button onClick={onToggle} style={{
      width: '100%', display: 'flex', alignItems: 'center', gap: 14, padding: '18px 22px',
      background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left',
    }}>
      <div style={{ width: 34, height: 34, borderRadius: 11, background: open ? accent : V.panel, color: open ? '#fff' : V.inkSoft, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: V.headFont, fontWeight: 1000, fontSize: 12, flexShrink: 0, transition: 'all .2s ease', boxShadow: open ? `0 3px 0 rgba(20,40,80,.15)` : 'none' }}>
        Q{idx + 1}
      </div>
      <h3 style={{ flex: 1, fontFamily: V.headFont, fontSize: 16, fontWeight: 900, color: V.ink, margin: 0, letterSpacing: '-0.01em' }}>{faq.q}</h3>
      <div style={{ width: 28, height: 28, borderRadius: 9, background: open ? accent : V.panel, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .25s ease', transform: open ? 'rotate(45deg)' : 'rotate(0deg)' }}>
        <Icon name="plus" size={14} stroke={open ? '#fff' : V.ink} strokeWidth={2.8} />
      </div>
    </button>
    <div style={{
      maxHeight: open ? 200 : 0, overflow: 'hidden',
      transition: 'max-height .35s cubic-bezier(.4,0,.2,1)',
    }}>
      <div style={{ padding: '0 22px 20px 70px', fontFamily: V.bodyFont, fontSize: 14, fontWeight: 600, color: V.inkSoft, lineHeight: 1.6 }}>
        {faq.a}
      </div>
    </div>
  </div>
);

const BunFAQ = ({ accent = BUN_BLUE }) => {
  const [open, setOpen] = React.useState(0);
  return (
    <section id="FAQ" style={{ padding: '72px 48px', background: V.panel }}>
      <div style={{ display: 'grid', gridTemplateColumns: '0.7fr 1.3fr', gap: 48, alignItems: 'flex-start' }}>
        <div style={{ position: 'sticky', top: 90 }}>
          <div style={{ fontFamily: V.bodyFont, fontSize: 12, fontWeight: 900, color: V.muted, letterSpacing: '0.18em', textTransform: 'uppercase' }}>Hỏi · Đáp</div>
          <h2 style={{ fontFamily: V.headFont, fontSize: 40, fontWeight: 1000, color: V.ink, margin: '6px 0 14px', letterSpacing: '-0.025em', lineHeight: 1.05 }}>
            Mấy câu <span style={{ fontStyle: 'italic', fontFamily: '"Lora", serif', fontWeight: 600, color: accent }}>thường gặp</span>
          </h2>
          <p style={{ fontFamily: V.bodyFont, fontSize: 14, fontWeight: 600, color: V.inkSoft, margin: '0 0 18px', lineHeight: 1.55 }}>
            Còn câu khác? Mình ở email <b style={{ color: V.ink }}>chao@bun.app</b> — viết cho mình bất cứ lúc nào.
          </p>
          <img src={MASCOT.dream} width={170} height={170} alt="" style={{ filter: 'drop-shadow(0 8px 18px rgba(40,30,15,.20))', animation: 'ngoc-float 4.5s ease-in-out infinite' }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {BUN_FAQS.map((f, i) => (
            <Reveal key={i} delay={i * 60} distance={16}>
              <FaqItemBlue faq={f} idx={i} open={open === i} onToggle={() => setOpen(open === i ? -1 : i)} accent={accent} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// CTA final
const BunCTA = ({ accent = BUN_BLUE, accentDark = '#1e87c0' }) => (
  <section style={{ padding: '48px 48px 80px', position: 'relative' }}>
    <Reveal>
    <div style={{
      position: 'relative', borderRadius: 32, padding: '60px 56px',
      background: `linear-gradient(135deg, ${accent} 0%, ${accentDark} 100%)`,
      border: `1px solid rgba(20,40,80,.25)`,
      boxShadow: `0 8px 0 rgba(20,40,80,.2), 0 18px 40px ${accent}55`,
      overflow: 'hidden',
    }}>
      <Sparkles items={[
        [80, 60, 12, '#fff', 0], [1100, 80, 10, V_C.yellow, 0.4],
        [1150, 280, 14, '#fff', 1.0], [40, 320, 11, V_C.yellow, 0.7],
        [560, 30, 9, '#fff', 1.5], [820, 290, 11, '#fff', 0.9],
        [200, 380, 8, V_C.pink, 1.2], [980, 380, 9, '#fff', 0.5],
      ]} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 40, position: 'relative' }}>
        <div style={{ position: 'relative', flexShrink: 0 }}>
          {/* radial halo */}
          <div style={{ position: 'absolute', inset: -20, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,255,255,.25), rgba(255,255,255,0))' }} />
          <img src={MASCOT.celebrate} width={240} height={240} alt="Bún" style={{
            position: 'relative', filter: 'drop-shadow(0 14px 28px rgba(40,30,15,.32))',
            animation: 'ngoc-bob 2.2s ease-in-out infinite',
          }} />
          {/* speech bubble */}
          <div style={{
            position: 'absolute', top: -10, right: -130, background: '#fff',
            padding: '11px 18px', borderRadius: 18, boxShadow: '0 8px 18px rgba(40,30,15,.2)',
            fontFamily: '"Lora", serif', fontStyle: 'italic', fontWeight: 600, fontSize: 16, color: V.ink,
            whiteSpace: 'nowrap',
            animation: 'bun-tilt-loop 3.5s ease-in-out infinite',
          }}>
            "Đi học thôi nha!"
            <div style={{ position: 'absolute', left: 22, bottom: -8, width: 14, height: 14, background: '#fff', transform: 'rotate(45deg)', boxShadow: '4px 4px 6px rgba(40,30,15,.08)' }} />
          </div>
        </div>
        <div style={{ flex: 1, color: '#fff' }}>
          <h2 style={{ fontFamily: V.headFont, fontSize: 62, fontWeight: 1000, lineHeight: 1, margin: 0, letterSpacing: '-0.035em', textShadow: '0 3px 0 rgba(20,40,80,.22)' }}>
            Sẵn sàng <span style={{ fontStyle: 'italic', fontFamily: '"Lora", serif', fontWeight: 600 }}>bắt đầu</span> chưa?
          </h2>
          <p style={{ fontFamily: V.bodyFont, fontSize: 19, fontWeight: 700, lineHeight: 1.4, margin: '14px 0 26px', color: 'rgba(255,255,255,0.96)', maxWidth: 520 }}>
            Tạo deck đầu tiên trong <b>30 giây</b>. Bún auto-fill IPA · audio · ví dụ · ảnh. Bạn chỉ cần dán từ.
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button className="bun-cta-btn" style={{
              position: 'relative', padding: '18px 34px', background: '#fff', color: accent, border: 'none',
              boxShadow: '0 6px 0 rgba(20,40,80,.22), 0 10px 22px rgba(40,30,15,.18)', borderRadius: 20,
              fontFamily: V.headFont, fontWeight: 1000, fontSize: 18, cursor: 'pointer', letterSpacing: '0.02em',
              display: 'inline-flex', alignItems: 'center', gap: 8,
            }}>
              <span style={{ position: 'absolute', inset: -4, borderRadius: 24, color: '#fff', animation: 'bun-pulse-ring 2.2s ease-out infinite', pointerEvents: 'none' }} />
              Vào học miễn phí <Icon name="arrowRight" size={20} stroke={accent} strokeWidth={3} />
            </button>
            <button className="bun-cta-btn" style={{
              padding: '18px 28px', background: 'rgba(255,255,255,0.20)', color: '#fff', border: '1.5px solid rgba(255,255,255,0.60)',
              borderRadius: 20, fontFamily: V.headFont, fontWeight: 900, fontSize: 15, cursor: 'pointer', letterSpacing: '0.02em',
              display: 'inline-flex', alignItems: 'center', gap: 7,
            }}>
              <Icon name="play" size={13} fill="#fff" stroke="#fff" /> Xem demo trước
            </button>
          </div>
          <div style={{ marginTop: 18, fontFamily: V.bodyFont, fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>
            Không cần thẻ tín dụng · Tiếng Việt 100% · Export sang Anki bất cứ lúc nào
          </div>
        </div>
      </div>
    </div>
    </Reveal>
  </section>
);

// ─────────────────────────────────────────────────────────────────────────────
// Footer
const BunFooter = () => (
  <footer style={{ padding: '40px 48px 32px', borderTop: `1px solid ${V.border}`, background: '#fff' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 36, flexWrap: 'wrap' }}>
      <div style={{ maxWidth: 320 }}>
        <BunLogo size={36} pose="idle" />
        <p style={{ fontFamily: V.bodyFont, fontSize: 13, fontWeight: 600, color: V.inkSoft, lineHeight: 1.55, margin: '12px 0 0' }}>
          App học tiếng Anh cho người Việt. Pick & mix 8 modality, AI lo phần khô khan, Bún làm bạn đồng hành.
        </p>
      </div>
      <div style={{ display: 'flex', gap: 56 }}>
        {[
          { title: 'Sản phẩm', items: ['Tính năng', 'Workflow mẫu', 'Roadmap', 'Changelog'] },
          { title: 'Về', items: ['Câu chuyện', 'Tại sao Bún', 'Blog (sắp có)'] },
          { title: 'Liên hệ', items: ['chao@bun.app', 'GitHub', 'X / Twitter', 'Threads'] },
        ].map(col => (
          <div key={col.title}>
            <div style={{ fontFamily: V.bodyFont, fontSize: 11, fontWeight: 900, color: V.muted, letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 10 }}>{col.title}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {col.items.map(i => (
                <a key={i} className="bun-footer-link" style={{ fontFamily: V.bodyFont, fontSize: 13, fontWeight: 700, color: V.inkSoft, textDecoration: 'none', cursor: 'pointer' }}>{i}</a>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
    <div style={{ marginTop: 30, paddingTop: 18, borderTop: `1px solid ${V.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
      <div style={{ fontFamily: V.monoFont, fontSize: 11, fontWeight: 600, color: V.muted }}>
        © 2026 Bún · Made in Sài Gòn · with <span style={{ color: V_C.red }}>♥</span> by Chloe Diep
      </div>
      <div style={{ display: 'flex', gap: 14, fontFamily: V.bodyFont, fontSize: 12, fontWeight: 700, color: V.muted }}>
        <a className="bun-footer-link" style={{ color: V.muted, textDecoration: 'none', cursor: 'pointer' }}>Privacy</a>
        <a className="bun-footer-link" style={{ color: V.muted, textDecoration: 'none', cursor: 'pointer' }}>Terms</a>
        <a className="bun-footer-link" style={{ color: V.muted, textDecoration: 'none', cursor: 'pointer' }}>v0.4 (beta)</a>
      </div>
    </div>
  </footer>
);

// ─────────────────────────────────────────────────────────────────────────────
// Variant assemblies
//
// v1 · Storybook playful (centered hero, max doodles)
// v2 · Editorial calm (gradient hero with serif emphasis, restrained whitespace)
// v3 · Bold gradient (orange gradient hero, more chunky vibe)
// All scroll within their own artboard.
// ─────────────────────────────────────────────────────────────────────────────

const BunLandingShell = ({ children }) => (
  <div style={{
    width: '100%', minHeight: '100%', background: V.bg, color: V.ink, fontFamily: V.bodyFont,
    overflow: 'hidden', // artboard already scrolls via canvas
  }}>
    {children}
  </div>
);

// V1 — BLUE accent showcase, full animations
const BunLanding_v1 = () => (
  <BunLandingShell>
    <BunNav accent={BUN_BLUE} />
    <BunHero variant="centered" pose="happy" accent={BUN_BLUE} accentSoft={BUN_BLUE_SOFT} />
    <BunMarquee accent={BUN_BLUE} />
    <BunValueProps accent={BUN_BLUE} />
    <BunFeatures accent={BUN_BLUE} />
    <BunWorkflows accent={BUN_BLUE} />
    <BunScreenshots accent={BUN_BLUE} />
    <BunWhy accent={BUN_BLUE} />
    <BunFAQ accent={BUN_BLUE} />
    <BunCTA accent={BUN_BLUE} />
    <BunFooter />
  </BunLandingShell>
);

// V2 — ORANGE gradient hero (warm alternate)
const BunLanding_v2 = () => (
  <BunLandingShell>
    <BunNav accent={V_C.orange} />
    <BunHero variant="gradient" pose="happy" accent={V_C.orange} />
    <BunMarquee accent={V_C.orange} />
    <BunValueProps accent={V_C.orange} />
    <BunFeatures accent={V_C.orange} />
    <BunWorkflows accent={V_C.orange} />
    <BunScreenshots accent={V_C.orange} />
    <BunWhy accent={V_C.orange} />
    <BunFAQ accent={V_C.orange} />
    <BunCTA accent={V_C.orange} accentDark="#cc6020" />
    <BunFooter />
  </BunLandingShell>
);

// V3 — GREEN (original V2-system primary)
const BunLanding_v3 = () => (
  <BunLandingShell>
    <BunNav accent={V.primary} />
    <BunHero variant="centered" pose="happy" accent={V.primary} accentSoft={V.primarySoft} />
    <BunMarquee accent={V.primary} />
    <BunValueProps accent={V.primary} />
    <BunFeatures accent={V.primary} />
    <BunWorkflows accent={V.primary} />
    <BunScreenshots accent={V.primary} />
    <BunWhy accent={V.primary} />
    <BunFAQ accent={V.primary} />
    <BunCTA accent={V.primary} accentDark="#5a9c30" />
    <BunFooter />
  </BunLandingShell>
);

// Inject extra keyframes for streak-fill if not yet
if (typeof document !== 'undefined' && !document.getElementById('bun-landing-keyframes')) {
  const s = document.createElement('style');
  s.id = 'bun-landing-keyframes';
  s.textContent = `
    @keyframes streak-fill { from { transform: scaleY(0); transform-origin: bottom; opacity: 0.4; } to { transform: scaleY(1); opacity: 1; } }
  `;
  document.head.appendChild(s);
}

Object.assign(window, { BUN_FAQS, BunFAQ, BunCTA, BunFooter, BunLanding_v1, BunLanding_v2, BunLanding_v3 });
