// app-mobile-extra.jsx — Additional mobile screens
// Dictionary, Read-aloud, Sentence writing, Article reader, Settings

// ─────────────────────────────────────────────────────────────────────────────
// SCREEN 6 · Dictionary
// ─────────────────────────────────────────────────────────────────────────────
const MDictionary = () => (
  <MAppShell active="more">
    <div style={{ padding: '8px 18px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div>
        <div style={{ fontFamily: V.bodyFont, fontSize: 10, fontWeight: 900, color: V.muted, letterSpacing: '0.14em', textTransform: 'uppercase' }}>Tra cứu</div>
        <h1 style={{ fontFamily: V.headFont, fontSize: 24, fontWeight: 1000, lineHeight: 1.0, margin: '3px 0 0', letterSpacing: '-0.025em', color: V.ink }}>
          Từ điển <span style={{ color: BUN_BLUE }}>nhanh</span>
        </h1>
      </div>

      {/* Big search */}
      <div style={{ position: 'relative' }}>
        <input defaultValue="preferential" style={{
          width: '100%', padding: '14px 16px 14px 44px', fontSize: 16, fontFamily: V.headFont, fontWeight: 800,
          background: '#fff', border: `2px solid ${BUN_BLUE}`, borderRadius: 14, boxShadow: `0 3px 0 ${BUN_BLUE}25`,
          color: V.ink, outline: 'none', boxSizing: 'border-box',
        }} />
        <div style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }}>
          <Icon name="search" size={18} stroke={BUN_BLUE} strokeWidth={2.4} />
        </div>
      </div>

      {/* Word result */}
      <div style={{ background: '#fff', border: `1px solid ${V.border}`, boxShadow: V.shadowMd, borderRadius: 16, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
          <h2 style={{ fontFamily: V.headFont, fontSize: 26, fontWeight: 1000, color: V.ink, margin: 0, letterSpacing: '-0.025em', lineHeight: 1 }}>preferential</h2>
          <span style={{ background: V_C.purple, color: '#fff', borderRadius: 999, padding: '2px 8px', fontFamily: V.headFont, fontWeight: 1000, fontSize: 9, letterSpacing: '0.08em' }}>ADJ</span>
          <button style={{ marginLeft: 'auto', width: 30, height: 30, background: BUN_BLUE, border: 'none', boxShadow: `0 2px 0 rgba(20,40,80,.15), 0 3px 6px ${BUN_BLUE}55`, borderRadius: 9, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="play" size={12} fill="#fff" stroke="#fff" />
          </button>
        </div>
        <div style={{ fontFamily: V.monoFont, fontSize: 13, color: BUN_BLUE, fontWeight: 700 }}>/ˌprefəˈrenʃəl/</div>
        <div style={{ fontFamily: V.headFont, fontSize: 15, fontWeight: 800, color: V.ink, paddingTop: 6, borderTop: `1px solid ${V.border}` }}>Ưu đãi, dành sự ưu tiên</div>
        <div>
          <div style={{ fontFamily: V.bodyFont, fontSize: 9, fontWeight: 1000, color: V_C.blue, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 4 }}>Ví dụ</div>
          <p style={{ fontFamily: V.headFont, fontSize: 13, fontWeight: 800, color: V.ink, margin: '0 0 3px', lineHeight: 1.4 }}>
            Club members received <span style={{ background: BUN_BLUE_SOFT, color: BUN_BLUE, padding: '0 4px', borderRadius: 4 }}>preferential</span> seating.
          </p>
          <p style={{ fontFamily: V.bodyFont, fontSize: 11, fontWeight: 600, color: V.inkSoft, margin: 0, lineHeight: 1.5 }}>Các thành viên nhận được chỗ ngồi ưu đãi.</p>
        </div>
        <button style={{
          padding: '10px 14px', background: BUN_BLUE, color: '#fff', border: 'none',
          boxShadow: `0 3px 0 rgba(20,40,80,.18), 0 4px 10px ${BUN_BLUE}55`,
          borderRadius: 12, fontFamily: V.headFont, fontWeight: 1000, fontSize: 12, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        }}>
          <Icon name="plus" size={13} stroke="#fff" strokeWidth={3} /> Lưu vào bộ từ
        </button>
      </div>

      {/* Recent */}
      <div>
        <div style={{ fontFamily: V.bodyFont, fontSize: 11, fontWeight: 900, color: V.inkSoft, marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Tra gần đây</span>
          <a className="bun-footer-link" style={{ color: BUN_BLUE, fontSize: 11, textDecoration: 'none', cursor: 'pointer' }}>Xoá lịch sử</a>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {[
            { word: 'serendipity', pos: 'NOUN', vi: 'May mắn tình cờ', col: V_C.pink, ipa: '/ˌserənˈdɪpəti/' },
            { word: 'ephemeral', pos: 'ADJ', vi: 'Phù du, chóng tàn', col: V_C.purple, ipa: '/ɪˈfemərəl/' },
            { word: 'pragmatic', pos: 'ADJ', vi: 'Thực tế, thực dụng', col: V_C.purple, ipa: '/præɡˈmætɪk/' },
            { word: 'meticulous', pos: 'ADJ', vi: 'Tỉ mỉ, chu đáo', col: V_C.purple, ipa: '/məˈtɪkjələs/' },
          ].map((w, i) => (
            <div key={i} className="bun-cta-btn" style={{
              background: '#fff', border: `1px solid ${V.border}`, boxShadow: V.shadow, borderRadius: 11,
              padding: '9px 12px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontFamily: V.headFont, fontSize: 13, fontWeight: 1000, color: V.ink, letterSpacing: '-0.01em' }}>{w.word}</span>
                  <span style={{ background: w.col, color: '#fff', borderRadius: 999, padding: '1px 6px', fontFamily: V.headFont, fontWeight: 1000, fontSize: 8, letterSpacing: '0.06em' }}>{w.pos}</span>
                </div>
                <div style={{ fontFamily: V.bodyFont, fontSize: 10.5, fontWeight: 700, color: V.muted, marginTop: 1 }}>{w.ipa} · {w.vi}</div>
              </div>
              <Icon name="arrowRight" size={14} stroke={V.muted} strokeWidth={2.4} />
            </div>
          ))}
        </div>
      </div>
    </div>
  </MAppShell>
);

// ─────────────────────────────────────────────────────────────────────────────
// SCREEN 7 · Read aloud (mic + per-word scoring)
// ─────────────────────────────────────────────────────────────────────────────
const MReadAloud = () => {
  const sentence = ['Club', 'members', 'received', 'preferential', 'seating', 'at', 'the', 'event.'];
  const scores = [1, 1, 0.7, 1, 1, 1, 0.4, 1]; // 1=ok, 0.7=ok-ish, 0.4=wrong
  return (
    <MAppShell active="review">
      <div style={{ padding: '8px 18px 24px', display: 'flex', flexDirection: 'column', gap: 16, height: '100%', boxSizing: 'border-box' }}>
        {/* Top */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button style={{ width: 34, height: 34, borderRadius: 11, background: '#fff', border: `1px solid ${V.border}`, boxShadow: V.shadow, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Icon name="arrowLeft" size={16} stroke={V.ink} strokeWidth={2.4} />
          </button>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: V.bodyFont, fontSize: 9, fontWeight: 900, color: V.muted, letterSpacing: '0.14em', textTransform: 'uppercase' }}>Luyện đọc to</div>
            <div style={{ fontFamily: V.headFont, fontSize: 14, fontWeight: 1000, color: V.ink, marginTop: 1 }}>Câu 3 / 10</div>
          </div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', background: BUN_BLUE_SOFT, borderRadius: 999, fontFamily: V.bodyFont, fontSize: 11, fontWeight: 900, color: BUN_BLUE }}>
            <Icon name="target" size={11} stroke={BUN_BLUE} strokeWidth={2.4} /> 78%
          </div>
        </div>

        {/* Sentence */}
        <div style={{ background: '#fff', border: `1px solid ${V.border}`, boxShadow: V.shadowMd, borderRadius: 16, padding: '16px 18px' }}>
          <div style={{ fontFamily: V.bodyFont, fontSize: 10, fontWeight: 900, color: V.muted, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 8 }}>Đọc câu này</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
            {sentence.map((w, i) => {
              const s = scores[i];
              const col = s === 1 ? V.primary : s >= 0.6 ? V_C.orange : V_C.red;
              return (
                <span key={i} style={{
                  fontFamily: V.headFont, fontSize: 19, fontWeight: 900,
                  color: col, letterSpacing: '-0.005em',
                  borderBottom: `2.5px solid ${col}40`, paddingBottom: 1,
                }}>{w}</span>
              );
            })}
          </div>
          <div style={{ marginTop: 12, paddingTop: 10, borderTop: `1px solid ${V.border}`, fontFamily: V.bodyFont, fontSize: 12, fontWeight: 600, color: V.inkSoft, lineHeight: 1.5 }}>
            Các thành viên câu lạc bộ nhận được chỗ ngồi ưu đãi tại sự kiện.
          </div>
        </div>

        {/* Per-word scoring */}
        <div>
          <div style={{ fontFamily: V.bodyFont, fontSize: 11, fontWeight: 900, color: V.inkSoft, marginBottom: 8 }}>Điểm từng từ</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            {sentence.slice(0, 6).map((w, i) => {
              const s = scores[i];
              const col = s === 1 ? V.primary : s >= 0.6 ? V_C.orange : V_C.red;
              const emoji = s === 1 ? '✓' : s >= 0.6 ? '~' : '✗';
              return (
                <div key={i} style={{ background: '#fff', border: `1px solid ${V.border}`, borderRadius: 10, padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 22, height: 22, borderRadius: 7, background: col, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: V.headFont, fontWeight: 1000, fontSize: 12, flexShrink: 0 }}>{emoji}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: V.headFont, fontSize: 12, fontWeight: 900, color: V.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{w}</div>
                    <div style={{ fontFamily: V.monoFont, fontSize: 9.5, fontWeight: 600, color: V.muted }}>{Math.round(s * 100)}%</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Mic button (big, center) */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', gap: 8, paddingBottom: 8 }}>
          <div style={{ position: 'relative', width: 96, height: 96 }}>
            <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: V_C.red, opacity: 0.18, animation: 'sparkle-twinkle 1.4s ease-in-out infinite' }} />
            <button className="bun-cta-btn" style={{
              position: 'absolute', inset: 8, borderRadius: '50%', background: V_C.red, border: 'none',
              boxShadow: `0 5px 0 rgba(80,20,20,.22), 0 8px 18px ${V_C.red}66`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="#fff" stroke="#fff"><rect x="9" y="3" width="6" height="13" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3" stroke="#fff" strokeWidth="2" strokeLinecap="round" fill="none"/></svg>
            </button>
          </div>
          <div style={{ fontFamily: V.bodyFont, fontSize: 12, fontWeight: 800, color: V_C.red }}>Đang nghe… <span style={{ fontFamily: V.monoFont, color: V.inkSoft, fontWeight: 700 }}>00:04</span></div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={{ padding: '8px 14px', background: '#fff', border: `1px solid ${V.border}`, boxShadow: V.shadow, borderRadius: 11, fontFamily: V.headFont, fontWeight: 900, fontSize: 11, color: V.inkSoft, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <Icon name="speaker" size={12} stroke={V.inkSoft} /> Nghe mẫu
            </button>
            <button style={{ padding: '8px 14px', background: '#fff', border: `1px solid ${V.border}`, boxShadow: V.shadow, borderRadius: 11, fontFamily: V.headFont, fontWeight: 900, fontSize: 11, color: V.inkSoft, cursor: 'pointer' }}>
              Bỏ qua →
            </button>
          </div>
        </div>
      </div>
    </MAppShell>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SCREEN 8 · Sentence writing (timer)
// ─────────────────────────────────────────────────────────────────────────────
const MSentence = () => (
  <MAppShell active="review">
    <div style={{ padding: '8px 18px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Top */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button style={{ width: 34, height: 34, borderRadius: 11, background: '#fff', border: `1px solid ${V.border}`, boxShadow: V.shadow, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon name="arrowLeft" size={16} stroke={V.ink} strokeWidth={2.4} />
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: V.bodyFont, fontSize: 9, fontWeight: 900, color: V.muted, letterSpacing: '0.14em', textTransform: 'uppercase' }}>Đặt câu</div>
          <div style={{ fontFamily: V.headFont, fontSize: 14, fontWeight: 1000, color: V.ink, marginTop: 1 }}>Câu 2 / 5</div>
        </div>
        {/* Timer ring */}
        <div style={{ position: 'relative', width: 50, height: 50 }}>
          <svg viewBox="0 0 100 100" style={{ position: 'absolute', inset: 0 }}>
            <circle cx="50" cy="50" r="42" fill="none" stroke={V.panel} strokeWidth="10" />
            <circle cx="50" cy="50" r="42" fill="none" stroke={V_C.orange} strokeWidth="10" strokeDasharray={`${0.65 * 264} 264`} strokeLinecap="round" transform="rotate(-90 50 50)" />
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: V.monoFont, fontSize: 13, fontWeight: 700, color: V.ink }}>0:39</div>
        </div>
      </div>

      {/* Target word */}
      <div style={{ background: BUN_BLUE_SOFT, border: `1.5px solid ${BUN_BLUE}40`, borderRadius: 14, padding: '12px 16px', textAlign: 'center', boxShadow: `0 3px 0 ${BUN_BLUE}25` }}>
        <div style={{ fontFamily: V.bodyFont, fontSize: 9, fontWeight: 1000, color: BUN_BLUE, letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 3 }}>Viết câu dùng từ</div>
        <div style={{ fontFamily: V.headFont, fontSize: 26, fontWeight: 1000, color: V.ink, letterSpacing: '-0.02em', lineHeight: 1 }}>preferential</div>
        <div style={{ fontFamily: V.bodyFont, fontSize: 11, fontWeight: 700, color: V.inkSoft, marginTop: 4 }}>Ưu đãi, dành sự ưu tiên · /ˌprefəˈrenʃəl/</div>
      </div>

      {/* Textarea */}
      <div>
        <textarea defaultValue="Members of the elite club enjoy preferential access to exclusive events." style={{
          width: '100%', minHeight: 100, padding: '13px 14px', fontSize: 15, fontFamily: V.headFont, fontWeight: 700,
          background: '#fff', border: `1.5px solid ${V.border}`, borderRadius: 14, boxShadow: V.shadow,
          color: V.ink, outline: 'none', resize: 'vertical', boxSizing: 'border-box', lineHeight: 1.45,
        }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6, fontFamily: V.bodyFont, fontSize: 10.5, fontWeight: 700, color: V.muted }}>
          <span style={{ color: V.primary, fontWeight: 800 }}>✓ Có chứa "preferential"</span>
          <span>13 từ</span>
        </div>
      </div>

      {/* AI feedback (live) */}
      <div style={{ background: '#fff', border: `1px solid ${V.border}`, boxShadow: V.shadowMd, borderRadius: 14, padding: '12px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
          <div style={{ width: 22, height: 22, borderRadius: 7, background: V_C.purple, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="sparkle" size={12} stroke="#fff" fill="#fff" />
          </div>
          <div style={{ fontFamily: V.bodyFont, fontSize: 10, fontWeight: 1000, color: V_C.purple, letterSpacing: '0.14em', textTransform: 'uppercase' }}>AI gợi ý nhanh</div>
        </div>
        <p style={{ fontFamily: V.bodyFont, fontSize: 12, fontWeight: 600, color: V.inkSoft, margin: 0, lineHeight: 1.5 }}>
          Cách dùng <b style={{ color: V.ink }}>chuẩn ngữ pháp</b>. "enjoy preferential access" là <b style={{ color: V.primary }}>collocation phổ biến</b> — rất tự nhiên!
        </p>
      </div>

      {/* CTAs */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button style={{
          padding: '13px 16px', background: '#fff', color: V.inkSoft, border: `1px solid ${V.border}`,
          boxShadow: V.shadow, borderRadius: 13, fontFamily: V.headFont, fontWeight: 900, fontSize: 12, cursor: 'pointer',
        }}>Bỏ qua</button>
        <button className="bun-cta-btn" style={{
          flex: 1, padding: '13px 16px', background: BUN_BLUE, color: '#fff', border: 'none',
          boxShadow: `0 4px 0 rgba(20,40,80,.18), 0 6px 14px ${BUN_BLUE}55`,
          borderRadius: 13, fontFamily: V.headFont, fontWeight: 1000, fontSize: 13, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, letterSpacing: '0.02em',
        }}>
          Nộp cho Bún chấm <Icon name="arrowRight" size={14} stroke="#fff" strokeWidth={3} />
        </button>
      </div>
    </div>
  </MAppShell>
);

// ─────────────────────────────────────────────────────────────────────────────
// SCREEN 9 · Article reader (paste + click word)
// ─────────────────────────────────────────────────────────────────────────────
const MArticle = () => {
  const Word = ({ children, hl, color = BUN_BLUE }) => (
    <span style={{
      cursor: 'pointer',
      background: hl ? `${color}30` : 'transparent',
      borderBottom: hl ? `2px solid ${color}` : 'none',
      padding: hl ? '0 2px' : 0,
      borderRadius: hl ? 3 : 0,
      color: hl ? color : 'inherit',
      fontWeight: hl ? 800 : 'inherit',
    }}>{children}</span>
  );
  return (
    <MAppShell active="review">
      <div style={{ padding: '8px 18px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Top with CEFR badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button style={{ width: 34, height: 34, borderRadius: 11, background: '#fff', border: `1px solid ${V.border}`, boxShadow: V.shadow, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Icon name="arrowLeft" size={16} stroke={V.ink} strokeWidth={2.4} />
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: V.bodyFont, fontSize: 9, fontWeight: 900, color: V.muted, letterSpacing: '0.14em', textTransform: 'uppercase' }}>Bài đọc</div>
            <div style={{ fontFamily: V.headFont, fontSize: 13, fontWeight: 1000, color: V.ink, marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>How serendipity shapes science</div>
          </div>
          <div style={{ background: V_C.orange, color: '#fff', borderRadius: 8, padding: '4px 9px', fontFamily: V.headFont, fontWeight: 1000, fontSize: 11, letterSpacing: '0.04em', boxShadow: '0 2px 4px rgba(255,154,60,.4)' }}>B2</div>
        </div>

        {/* Karaoke toolbar */}
        <div style={{ background: V.panel, border: `1px solid ${V.border}`, borderRadius: 12, padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <button style={{ width: 30, height: 30, borderRadius: 9, background: BUN_BLUE, color: '#fff', border: 'none', boxShadow: `0 2px 0 rgba(20,40,80,.15)`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Icon name="play" size={12} fill="#fff" stroke="#fff" />
          </button>
          <div style={{ flex: 1, height: 5, background: '#fff', border: `1px solid ${V.border}`, borderRadius: 999, overflow: 'hidden' }}>
            <div style={{ width: '35%', height: '100%', background: BUN_BLUE, borderRadius: 999 }} />
          </div>
          <span style={{ fontFamily: V.monoFont, fontSize: 10, fontWeight: 700, color: V.inkSoft, flexShrink: 0 }}>1.0×</span>
          <button style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
            <Icon name="headphones" size={16} stroke={V.inkSoft} strokeWidth={2.2} />
          </button>
        </div>

        {/* Article body */}
        <article style={{ fontFamily: '"Lora", serif', fontSize: 15, fontWeight: 400, color: V.ink, lineHeight: 1.6 }}>
          <p style={{ margin: '0 0 12px' }}>
            Many of the most important scientific discoveries owe a debt to <Word hl color={V_C.purple}>serendipity</Word>. From penicillin to the microwave, history is full of <Word hl color={V_C.orange}>fortuitous</Word> moments that altered the course of human progress.
          </p>
          <p style={{ margin: '0 0 12px', background: `${BUN_BLUE}15`, padding: '4px 6px', borderRadius: 4 }}>
            But <Word hl color={BUN_BLUE}>chance favours</Word> the prepared mind. Researchers who recognize unexpected patterns are the ones who turn lucky accidents into <Word hl color={V_C.pink}>breakthroughs</Word>.
          </p>
          <p style={{ margin: 0 }}>
            This <Word hl color={V_C.teal}>nuanced</Word> view of discovery challenges the lone-genius myth.
          </p>
        </article>

        {/* Active word popup */}
        <div style={{ background: '#fff', border: `1.5px solid ${V_C.purple}40`, borderRadius: 14, boxShadow: `0 8px 18px ${V_C.purple}25, 0 3px 0 ${V_C.purple}20`, padding: '14px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: V.headFont, fontSize: 20, fontWeight: 1000, color: V.ink, letterSpacing: '-0.02em' }}>serendipity</span>
            <span style={{ background: V_C.purple, color: '#fff', borderRadius: 999, padding: '2px 7px', fontFamily: V.headFont, fontWeight: 1000, fontSize: 8, letterSpacing: '0.08em' }}>NOUN</span>
            <span style={{ fontFamily: V.monoFont, fontSize: 11, color: V_C.purple, fontWeight: 700 }}>/ˌserənˈdɪpəti/</span>
            <button style={{ marginLeft: 'auto', width: 26, height: 26, background: V_C.purple, border: 'none', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 2px 4px ${V_C.purple}55` }}>
              <Icon name="play" size={11} fill="#fff" stroke="#fff" />
            </button>
          </div>
          <div style={{ fontFamily: V.headFont, fontSize: 13, fontWeight: 800, color: V.ink, marginTop: 6 }}>May mắn tình cờ, sự ngẫu nhiên thú vị</div>
          <div style={{ marginTop: 10, display: 'flex', gap: 6 }}>
            <button className="bun-cta-btn" style={{
              flex: 1, padding: '9px 12px', background: V_C.purple, color: '#fff', border: 'none',
              boxShadow: `0 3px 0 rgba(60,30,80,.18), 0 4px 10px ${V_C.purple}55`,
              borderRadius: 11, fontFamily: V.headFont, fontWeight: 1000, fontSize: 11, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
            }}>
              <Icon name="plus" size={12} stroke="#fff" strokeWidth={3} /> Lưu vào bộ
            </button>
            <button style={{
              flex: 1, padding: '9px 12px', background: '#fff', color: V.ink, border: `1px solid ${V.border}`,
              boxShadow: V.shadow, borderRadius: 11, fontFamily: V.headFont, fontWeight: 900, fontSize: 11, cursor: 'pointer',
            }}>Xem chi tiết</button>
          </div>
        </div>

        {/* Stats footer */}
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 1, background: '#fff', border: `1px solid ${V.border}`, borderRadius: 11, padding: '8px 10px', textAlign: 'center' }}>
            <div style={{ fontFamily: V.headFont, fontSize: 18, fontWeight: 1000, color: BUN_BLUE, lineHeight: 1 }}>5</div>
            <div style={{ fontFamily: V.bodyFont, fontSize: 9.5, fontWeight: 700, color: V.muted, marginTop: 2 }}>từ lạ</div>
          </div>
          <div style={{ flex: 1, background: '#fff', border: `1px solid ${V.border}`, borderRadius: 11, padding: '8px 10px', textAlign: 'center' }}>
            <div style={{ fontFamily: V.headFont, fontSize: 18, fontWeight: 1000, color: V_C.orange, lineHeight: 1 }}>B2</div>
            <div style={{ fontFamily: V.bodyFont, fontSize: 9.5, fontWeight: 700, color: V.muted, marginTop: 2 }}>cấp độ</div>
          </div>
          <div style={{ flex: 1, background: '#fff', border: `1px solid ${V.border}`, borderRadius: 11, padding: '8px 10px', textAlign: 'center' }}>
            <div style={{ fontFamily: V.headFont, fontSize: 18, fontWeight: 1000, color: V.primary, lineHeight: 1 }}>3:12</div>
            <div style={{ fontFamily: V.bodyFont, fontSize: 9.5, fontWeight: 700, color: V.muted, marginTop: 2 }}>nghe</div>
          </div>
        </div>
      </div>
    </MAppShell>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SCREEN 10 · Settings
// ─────────────────────────────────────────────────────────────────────────────
const MSettings = () => {
  const Section = ({ title, children }) => (
    <div>
      <div style={{ fontFamily: V.bodyFont, fontSize: 10, fontWeight: 900, color: V.muted, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 8, paddingLeft: 4 }}>{title}</div>
      <div style={{ background: '#fff', border: `1px solid ${V.border}`, boxShadow: V.shadow, borderRadius: 14, overflow: 'hidden' }}>
        {children}
      </div>
    </div>
  );
  const Row = ({ icon, color, label, sub, value, toggle, last }) => (
    <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: last ? 'none' : `1px solid ${V.border}` }}>
      <div style={{ width: 30, height: 30, borderRadius: 9, background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon name={icon} size={14} stroke="#fff" fill="#fff" strokeWidth={2.4} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: V.headFont, fontSize: 13, fontWeight: 900, color: V.ink }}>{label}</div>
        {sub && <div style={{ fontFamily: V.bodyFont, fontSize: 10.5, fontWeight: 700, color: V.muted, marginTop: 1 }}>{sub}</div>}
      </div>
      {toggle !== undefined ? (
        <div style={{ width: 36, height: 20, borderRadius: 999, background: toggle ? BUN_BLUE : V.border, position: 'relative', flexShrink: 0 }}>
          <div style={{ position: 'absolute', top: 2, left: toggle ? 18 : 2, width: 16, height: 16, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,.18)', transition: 'left .2s' }} />
        </div>
      ) : value !== undefined ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
          <span style={{ fontFamily: V.bodyFont, fontSize: 12, fontWeight: 800, color: V.inkSoft }}>{value}</span>
          <Icon name="arrowRight" size={14} stroke={V.muted} strokeWidth={2.4} />
        </div>
      ) : (
        <Icon name="arrowRight" size={14} stroke={V.muted} strokeWidth={2.4} style={{ flexShrink: 0 }} />
      )}
    </div>
  );
  return (
    <MAppShell active="more">
      <div style={{ padding: '8px 18px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <div style={{ fontFamily: V.bodyFont, fontSize: 10, fontWeight: 900, color: V.muted, letterSpacing: '0.14em', textTransform: 'uppercase' }}>Cá nhân</div>
          <h1 style={{ fontFamily: V.headFont, fontSize: 24, fontWeight: 1000, lineHeight: 1.0, margin: '3px 0 0', letterSpacing: '-0.025em', color: V.ink }}>
            Cài đặt
          </h1>
        </div>

        {/* Profile card */}
        <div style={{ background: '#fff', border: `1px solid ${V.border}`, boxShadow: V.shadowMd, borderRadius: 14, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: BUN_BLUE_SOFT, border: `2px solid ${BUN_BLUE}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            <img src={MASCOT.happy} width={50} height={50} alt="" style={{ filter: 'drop-shadow(0 2px 4px rgba(40,30,15,.15))' }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: V.headFont, fontSize: 15, fontWeight: 1000, color: V.ink }}>Chloe Diep</div>
            <div style={{ fontFamily: V.bodyFont, fontSize: 11, fontWeight: 700, color: V.muted, marginTop: 1 }}>chao@chloediep.com · Free</div>
          </div>
          <button style={{ padding: '6px 12px', background: BUN_BLUE_SOFT, color: BUN_BLUE, border: `1px solid ${BUN_BLUE}40`, borderRadius: 999, fontFamily: V.headFont, fontWeight: 900, fontSize: 10.5, cursor: 'pointer', flexShrink: 0 }}>Pro →</button>
        </div>

        <Section title="Học tập">
          <Row icon="target" color={BUN_BLUE} label="Mục tiêu hằng ngày" value="50 lượt" />
          <Row icon="bell" color={V_C.orange} label="Nhắc nhở học" sub="08:00 mỗi ngày" toggle={true} />
          <Row icon="flame" color={V_C.red} label="Streak freeze" sub="Bảo vệ streak khi lỡ ngày" toggle={false} last />
        </Section>

        <Section title="Âm thanh & ngôn ngữ">
          <Row icon="speaker" color={V_C.blue} label="Phát âm tự động" toggle={true} />
          <Row icon="headphones" color={V_C.teal} label="Giọng đọc" value="US English" />
          <Row icon="library" color={V_C.purple} label="Ngôn ngữ giao diện" value="Tiếng Việt" last />
        </Section>

        <Section title="Dữ liệu">
          <Row icon="folder" color={V_C.pink} label="Sao lưu" sub="Tự động · Cloudflare D1" toggle={true} />
          <Row icon="refresh" color={V.primary} label="Export sang Anki" />
          <Row icon="settings" color={V.muted} label="Quản lý dữ liệu" last />
        </Section>

        <Section title="Khác">
          <Row icon="quote" color={V_C.purple} label="Về Bún" />
          <Row icon="sparkle" color={V_C.orange} label="Đánh giá app" />
          <Row icon="heart" color={V_C.red} label="Gửi feedback" last />
        </Section>

        <button style={{
          padding: '12px 16px', background: 'transparent', color: V_C.red, border: `1.5px solid ${V_C.red}40`,
          borderRadius: 12, fontFamily: V.headFont, fontWeight: 900, fontSize: 13, cursor: 'pointer',
        }}>Đăng xuất</button>

        <div style={{ textAlign: 'center', fontFamily: V.monoFont, fontSize: 10, fontWeight: 600, color: V.muted, marginTop: -4 }}>
          Bún v0.4 · Made in Sài Gòn · ♥ Chloe Diep
        </div>
      </div>
    </MAppShell>
  );
};

Object.assign(window, { MDictionary, MReadAloud, MSentence, MArticle, MSettings });
