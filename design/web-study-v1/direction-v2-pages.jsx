// V2 — Additional pages: Add word, Deck detail, Decks list, Dictionary, Settings
// All use the same V tokens + V_Sidebar from direction-v2.jsx

// ─────────────────────────────────────────────────────────────────────────────
// Shared bits
// ─────────────────────────────────────────────────────────────────────────────
const V_Field = ({ label, hint, children, required }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
    <label style={{ fontFamily: V.bodyFont, fontSize: 12, fontWeight: 800, color: V.inkSoft, letterSpacing: '0.04em' }}>
      {label}{required && <span style={{ color: V_C.red, marginLeft: 4 }}>*</span>}
      {hint && <span style={{ fontWeight: 600, color: V.muted, marginLeft: 6 }}>· {hint}</span>}
    </label>
    {children}
  </div>
);

const V_Input = ({ ...props }) => (
  <input {...props} style={{
    padding: '12px 14px', fontFamily: V.bodyFont, fontSize: 13, fontWeight: 600,
    background: '#fff', border: `1.5px solid ${V.border}`, borderRadius: 12,
    color: V.ink, outline: 'none', boxSizing: 'border-box', width: '100%',
    ...props.style,
  }} />
);

// Page header — used by detail / list pages
const V_PageHeader = ({ title, subtitle, right }) => (
  <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingBottom: 14, borderBottom: `1px solid ${V.border}` }}>
    <div>
      <h1 style={{ fontFamily: V.headFont, fontSize: 26, fontWeight: 900, lineHeight: 1.05, margin: 0, letterSpacing: '-0.02em', color: V.ink }}>{title}</h1>
      {subtitle && <div style={{ fontFamily: V.bodyFont, fontSize: 12, fontWeight: 700, color: V.muted, marginTop: 4 }}>{subtitle}</div>}
    </div>
    {right}
  </header>
);

// ─────────────────────────────────────────────────────────────────────────────
// 1. Add Word — form left + LIVE preview right
// ─────────────────────────────────────────────────────────────────────────────
const V_AddWord = () => (
  <V_Frame>
    <V_Sidebar active="add" />
    <main style={{ flex: 1, padding: '24px 32px 28px', overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <V_PageHeader title={<>Thêm từ <span style={{ color: V.accent }}>mới</span></>} subtitle="Nhập từ tiếng Anh và nghĩa — Mình sẽ tự sinh IPA, ví dụ, ảnh, collocation."/>

      <section style={{ display: 'grid', gridTemplateColumns: '0.95fr 1.05fr', gap: 28, alignItems: 'flex-start' }}>
        {/* Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <V_Field label="Từ tiếng Anh" required>
            <V_Input defaultValue="preferential" style={{ fontSize: 16, fontWeight: 800, fontFamily: V.headFont, borderColor: V.primary, boxShadow: `0 3px 0 ${V.primary}25` }} />
          </V_Field>

          <V_Field label="Nghĩa tiếng Việt" required>
            <V_Input defaultValue="Ưu đãi, dành sự ưu tiên" />
          </V_Field>

          <V_Field label="Bộ từ">
            <div style={{ position: 'relative' }}>
              <select style={{
                padding: '12px 38px 12px 14px', fontFamily: V.bodyFont, fontSize: 13, fontWeight: 700,
                background: '#fff', border: `1.5px solid ${V.border}`, borderRadius: 12,
                color: V.ink, outline: 'none', appearance: 'none', width: '100%', cursor: 'pointer',
              }}>
                <option>PTE Academic</option>
                <option>Business English</option>
                <option>Daily Conversation</option>
              </select>
              <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: V.inkSoft }}>▾</span>
            </div>
          </V_Field>

          <V_Field label="Ghi chú" hint="tuỳ chọn">
            <textarea placeholder="Ghi chú cá nhân, ví dụ dịch câu, mẹo nhớ…" rows={3} style={{
              padding: '12px 14px', fontFamily: V.bodyFont, fontSize: 12, fontWeight: 500,
              background: '#fff', border: `1.5px solid ${V.border}`, borderRadius: 12,
              color: V.ink, outline: 'none', resize: 'vertical', minHeight: 80,
            }} />
          </V_Field>

          <div style={{ background: V.primarySoft, border: `1px solid ${V.primary}40`, borderRadius: 14, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: V.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon name="sparkle" size={16} stroke="#fff" fill="#fff" strokeWidth={2.4} />
            </div>
            <div style={{ flex: 1, fontFamily: V.bodyFont, fontSize: 12, fontWeight: 700, color: V.inkSoft, lineHeight: 1.4 }}>
              Tự sinh: IPA · audio · 3 ví dụ · ảnh từ Pexels · collocations
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button style={{
              flex: 1, padding: '14px 22px', background: V.primary, color: '#fff', border: 'none',
              boxShadow: `0 4px 0 rgba(60,20,5,.15), 0 6px 14px ${V.primary}40`,
              borderRadius: 14, fontFamily: V.headFont, fontWeight: 900, fontSize: 13, letterSpacing: '0.04em', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
              <Icon name="check" size={16} stroke="#fff" strokeWidth={3} /> LƯU TỪ NÀY
            </button>
            <button style={{
              padding: '14px 20px', background: '#fff', color: V.inkSoft, border: `1px solid ${V.border}`,
              boxShadow: V.shadow, borderRadius: 14, fontFamily: V.headFont, fontWeight: 800, fontSize: 12, cursor: 'pointer',
            }}>
              Sửa lại
            </button>
          </div>
        </div>

        {/* Live Preview */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <Icon name="sparkle" size={14} stroke={V.primary} fill={V.primary} strokeWidth={2.4} />
            <div style={{ fontFamily: V.bodyFont, fontSize: 11, fontWeight: 900, color: V.primary, letterSpacing: '0.18em', textTransform: 'uppercase' }}>Xem trước</div>
            <div style={{ flex: 1, height: 1, background: V.border }} />
          </div>
          <V_Card padding={20} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
              <h2 style={{ fontFamily: V.headFont, fontSize: 26, fontWeight: 900, margin: 0, letterSpacing: '-0.02em', color: V.ink }}>preferential</h2>
              <button style={{ width: 30, height: 30, background: V.gem, border: 'none', borderRadius: 9, cursor: 'pointer', boxShadow: V.shadow, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="speaker" size={14} stroke="#fff" strokeWidth={2.4} />
              </button>
              <span style={{ background: V_C.purple, color: '#fff', borderRadius: 999, padding: '2px 10px', fontFamily: V.headFont, fontWeight: 900, fontSize: 10, letterSpacing: '0.08em' }}>ADJ</span>
            </div>
            <div style={{ fontFamily: V.monoFont, fontSize: 12, color: V.accent, fontWeight: 600 }}>/ˌprefəˈrenʃəl/</div>
            <div>
              <span style={{ fontFamily: V.bodyFont, fontSize: 12, fontWeight: 800, color: V.muted, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Nghĩa</span>
              <div style={{ fontFamily: V.headFont, fontSize: 15, fontWeight: 800, color: V.ink, marginTop: 2 }}>Ưu đãi, dành sự ưu tiên</div>
            </div>

            {/* image */}
            <div style={{ width: '100%', height: 180, background: V_C.orange + '20', borderRadius: 12, overflow: 'hidden', position: 'relative' }}>
              <svg width="100%" height="100%" viewBox="0 0 460 180" preserveAspectRatio="xMidYMid slice">
                <rect width="460" height="180" fill="#ffe4d4"/>
                <rect x="160" y="60" width="140" height="60" rx="8" fill="#fff" stroke="rgba(40,30,15,.1)" strokeWidth="1"/>
                <circle cx="195" cy="90" r="11" fill={V.gem}/>
                <rect x="220" y="80" width="60" height="5" rx="2" fill={V.ink}/>
                <rect x="220" y="94" width="46" height="3" rx="1" fill={V.inkSoft} opacity="0.5"/>
              </svg>
              <span style={{ position: 'absolute', bottom: 6, right: 8, fontFamily: V.bodyFont, fontSize: 10, color: 'rgba(40,30,15,.55)', fontWeight: 600 }}>Photo by Andy Barbour · Pexels</span>
            </div>

            <div>
              <div style={{ fontFamily: V.bodyFont, fontSize: 11, fontWeight: 900, color: V_C.blue, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 6 }}>Ví dụ</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div>
                  <div style={{ fontFamily: V.headFont, fontSize: 13, fontWeight: 800, color: V.ink }}>Club members received <b style={{ color: V.primary }}>preferential</b> seating.</div>
                  <div style={{ fontFamily: V.bodyFont, fontSize: 12, fontWeight: 600, color: V.inkSoft }}>Các thành viên CLB nhận được chỗ ngồi ưu đãi.</div>
                </div>
                <div>
                  <div style={{ fontFamily: V.headFont, fontSize: 13, fontWeight: 800, color: V.ink }}>He tested positive for cancer.</div>
                  <div style={{ fontFamily: V.bodyFont, fontSize: 12, fontWeight: 600, color: V.inkSoft }}>Anh ấy xét nghiệm dương tính với ung thư.</div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', paddingTop: 8, borderTop: `1px dashed ${V.border}` }}>
              <span style={{ fontFamily: V.bodyFont, fontSize: 11, fontWeight: 700, color: V.muted, alignSelf: 'center', marginRight: 4 }}>Tra cứu:</span>
              {['Oxford', 'YouGlish', 'ozdic'].map(s => (
                <a key={s} style={{ padding: '4px 10px', fontFamily: V.bodyFont, fontSize: 12, fontWeight: 700, color: V.inkSoft, border: `1px solid ${V.border}`, borderRadius: 999, background: '#fff', textDecoration: 'none' }}>{s} ↗</a>
              ))}
            </div>
          </V_Card>
        </div>
      </section>
    </main>
  </V_Frame>
);

// ─────────────────────────────────────────────────────────────────────────────
// 2. Decks list — grid of colorful deck cards
// ─────────────────────────────────────────────────────────────────────────────
const allDecks = [
  { name: 'PTE Academic', total: 124, mastered: 38, color: V.primary, icon: 'trophy', subtitle: 'Thi cử' },
  { name: 'Business English', total: 86, mastered: 22, color: V_C.blue, icon: 'gem', subtitle: 'Công việc' },
  { name: 'Daily Conversation', total: 56, mastered: 41, color: V_C.orange, icon: 'sparkle', subtitle: 'Giao tiếp' },
  { name: 'Phrasal Verbs', total: 72, mastered: 12, color: V_C.purple, icon: 'bolt', subtitle: 'Ngữ pháp' },
  { name: 'IELTS Speaking', total: 95, mastered: 8, color: V_C.pink, icon: 'headphones', subtitle: 'Thi cử' },
  { name: 'Travel & Food', total: 48, mastered: 31, color: V_C.teal, icon: 'star', subtitle: 'Đời sống' },
];

const V_DecksList = () => (
  <V_Frame>
    <V_Sidebar active="decks" />
    <main style={{ flex: 1, padding: '24px 32px 28px', overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 22 }}>
      <V_PageHeader
        title={<>Bộ từ <span style={{ color: V.primary }}>của bạn</span></>}
        subtitle="6 bộ · 481 từ · 152 đã thuộc"
        right={
          <button style={{
            padding: '11px 18px', background: V.primary, color: '#fff', border: 'none',
            boxShadow: `0 4px 0 rgba(60,20,5,.15), 0 6px 14px ${V.primary}40`, borderRadius: 14,
            fontFamily: V.headFont, fontWeight: 900, fontSize: 12, letterSpacing: '0.02em', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <Icon name="plus" size={16} stroke="#fff" strokeWidth={3} /> TẠO BỘ MỚI
          </button>
        }
      />

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        {allDecks.map((d, i) => {
          const pct = Math.round((d.mastered / d.total) * 100);
          return (
            <V_Card key={i} padding={18} style={{ position: 'relative', overflow: 'hidden', cursor: 'pointer' }}>
              <div style={{ position: 'absolute', top: -40, right: -40, width: 140, height: 140, borderRadius: '50%', background: d.color, opacity: 0.1 }} />
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, position: 'relative' }}>
                <div style={{ width: 56, height: 56, borderRadius: 14, background: d.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: `0 4px 10px ${d.color}40` }}>
                  <Icon name={d.icon} size={26} stroke="#fff" fill="#fff" strokeWidth={2.2} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: V.bodyFont, fontSize: 10, fontWeight: 800, color: d.color, letterSpacing: '0.12em', textTransform: 'uppercase' }}>{d.subtitle}</div>
                  <h3 style={{ fontFamily: V.headFont, fontSize: 16, fontWeight: 900, margin: '2px 0 0', color: V.ink, letterSpacing: '-0.01em' }}>{d.name}</h3>
                  <div style={{ fontFamily: V.bodyFont, fontSize: 12, fontWeight: 700, color: V.muted, marginTop: 4 }}>
                    {d.total} từ · <b style={{ color: V.inkSoft }}>{d.mastered} thuộc</b>
                  </div>
                </div>
              </div>
              <div style={{ marginTop: 14, position: 'relative' }}>
                <div style={{ height: 8, background: V.panel, border: `1px solid ${V.border}`, borderRadius: 999, overflow: 'hidden' }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: d.color }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
                  <div style={{ fontFamily: V.bodyFont, fontSize: 11, fontWeight: 700, color: V.muted }}>
                    còn {d.total - d.mastered} từ
                  </div>
                  <div style={{ fontFamily: V.headFont, fontSize: 13, fontWeight: 900, color: d.color }}>{pct}%</div>
                </div>
              </div>
            </V_Card>
          );
        })}
      </section>
    </main>
  </V_Frame>
);

// ─────────────────────────────────────────────────────────────────────────────
// 3. Deck Detail — header + word list with search
// ─────────────────────────────────────────────────────────────────────────────
const deckWords = [
  { en: 'preferential', vi: 'ưu đãi, dành sự ưu tiên', pos: 'adj', stage: 'review', strength: 0.6 },
  { en: 'meticulous', vi: 'tỉ mỉ, cẩn thận', pos: 'adj', stage: 'mastered', strength: 0.95 },
  { en: 'leverage', vi: 'tận dụng, đòn bẩy', pos: 'verb', stage: 'review', strength: 0.5 },
  { en: 'feasibility', vi: 'tính khả thi', pos: 'noun', stage: 'learning', strength: 0.3 },
  { en: 'ambiguous', vi: 'mơ hồ, không rõ ràng', pos: 'adj', stage: 'review', strength: 0.7 },
  { en: 'paramount', vi: 'tối quan trọng', pos: 'adj', stage: 'new', strength: 0 },
  { en: 'discrepancy', vi: 'sự chênh lệch, không khớp', pos: 'noun', stage: 'learning', strength: 0.25 },
  { en: 'undermine', vi: 'làm suy yếu, phá hoại ngầm', pos: 'verb', stage: 'mastered', strength: 0.9 },
];
const stageMap = {
  new:      { label: 'Mới',     color: V_C.blue },
  learning: { label: 'Đang học', color: V_C.orange },
  review:   { label: 'Ôn',       color: V.primary },
  mastered: { label: 'Thuộc',   color: V_C.purple },
};

const V_DeckDetail = () => (
  <V_Frame>
    <V_Sidebar active="decks" />
    <main style={{ flex: 1, padding: '24px 32px 28px', overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: V.bodyFont, fontSize: 12, fontWeight: 700, color: V.muted }}>
        <a style={{ color: V.muted, textDecoration: 'none' }}>Bộ từ</a>
        <span>›</span>
        <span style={{ color: V.inkSoft }}>PTE Academic</span>
      </div>

      {/* Deck header card */}
      <V_Card padding={22} style={{ display: 'flex', gap: 22, alignItems: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -60, right: -60, width: 200, height: 200, borderRadius: '50%', background: V.primary, opacity: 0.08 }} />
        <div style={{ width: 84, height: 84, borderRadius: 20, background: V.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: `0 6px 14px ${V.primary}50` }}>
          <Icon name="trophy" size={40} stroke="#fff" fill="#fff" strokeWidth={2.2} />
        </div>
        <div style={{ flex: 1, position: 'relative' }}>
          <div style={{ fontFamily: V.bodyFont, fontSize: 11, fontWeight: 800, color: V.primary, letterSpacing: '0.14em', textTransform: 'uppercase' }}>Thi cử · Tạo ngày 12.3.2026</div>
          <h1 style={{ fontFamily: V.headFont, fontSize: 26, fontWeight: 900, lineHeight: 1.05, margin: '4px 0 8px', letterSpacing: '-0.02em', color: V.ink }}>PTE Academic</h1>
          <div style={{ display: 'flex', gap: 14, fontFamily: V.bodyFont, fontSize: 12, fontWeight: 700, color: V.inkSoft }}>
            <span><b style={{ color: V.ink, fontWeight: 900 }}>124</b> từ</span>
            <span style={{ color: V.muted }}>·</span>
            <span><b style={{ color: V.primary, fontWeight: 900 }}>38</b> thuộc</span>
            <span style={{ color: V.muted }}>·</span>
            <span><b style={{ color: V_C.orange, fontWeight: 900 }}>42</b> đang ôn</span>
            <span style={{ color: V.muted }}>·</span>
            <span><b style={{ color: V_C.blue, fontWeight: 900 }}>44</b> mới</span>
          </div>
          <div style={{ marginTop: 10, height: 8, background: V.panel, border: `1px solid ${V.border}`, borderRadius: 999, overflow: 'hidden', display: 'flex' }}>
            <div style={{ width: '30%', height: '100%', background: V_C.purple }} />
            <div style={{ width: '34%', height: '100%', background: V_C.orange }} />
            <div style={{ width: '36%', height: '100%', background: V_C.blue }} />
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, position: 'relative' }}>
          <button style={{
            padding: '11px 20px', background: V.primary, color: '#fff', border: 'none',
            boxShadow: `0 4px 0 rgba(60,20,5,.15), 0 6px 14px ${V.primary}40`, borderRadius: 14,
            fontFamily: V.headFont, fontWeight: 900, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <Icon name="play" size={14} fill="#fff" stroke="#fff" /> ÔN BỘ NÀY
          </button>
          <button style={{
            padding: '10px 20px', background: '#fff', color: V.inkSoft, border: `1px solid ${V.border}`,
            boxShadow: V.shadow, borderRadius: 14, fontFamily: V.headFont, fontWeight: 800, fontSize: 12, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center',
          }}>
            <Icon name="pencil" size={13} stroke={V.inkSoft} /> Sửa bộ
          </button>
        </div>
      </V_Card>

      {/* Search + filters */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Icon name="search" size={16} stroke={V.muted} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
          <input placeholder="Tìm từ trong bộ này…" style={{
            padding: '11px 14px 11px 38px', fontFamily: V.bodyFont, fontSize: 12, fontWeight: 600,
            background: '#fff', border: `1px solid ${V.border}`, borderRadius: 12, boxShadow: V.shadow,
            color: V.ink, outline: 'none', width: '100%', boxSizing: 'border-box',
          }}/>
        </div>
        <div style={{ display: 'flex', gap: 4, padding: 4, background: V.panel, borderRadius: 12 }}>
          {[{ k: 'all', l: 'Tất cả', c: V.ink, n: 124 }, { k: 'new', l: 'Mới', c: V_C.blue, n: 44 }, { k: 'learning', l: 'Đang học', c: V_C.orange, n: 42 }, { k: 'mastered', l: 'Thuộc', c: V_C.purple, n: 38 }].map((f, i) => (
            <button key={f.k} style={{
              padding: '6px 12px', background: i === 0 ? '#fff' : 'transparent',
              boxShadow: i === 0 ? V.shadow : 'none',
              border: 'none', borderRadius: 8, fontFamily: V.bodyFont, fontSize: 12, fontWeight: 800,
              color: f.c, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
            }}>
              {f.l} <span style={{ background: f.c + '20', color: f.c, padding: '0 6px', borderRadius: 4, fontFamily: V.monoFont, fontSize: 10, fontWeight: 700 }}>{f.n}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Word list */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {deckWords.map((w, i) => {
          const stage = stageMap[w.stage];
          return (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
              background: '#fff', border: `1px solid ${V.border}`, borderRadius: 12,
              boxShadow: V.shadow,
            }}>
              <div style={{ width: 6, alignSelf: 'stretch', background: stage.color, borderRadius: 3 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <span style={{ fontFamily: V.headFont, fontSize: 14, fontWeight: 800, color: V.ink }}>{w.en}</span>
                  <span style={{ fontFamily: V.bodyFont, fontSize: 11, fontWeight: 700, color: V.muted, fontStyle: 'italic' }}>{w.pos}</span>
                </div>
                <div style={{ fontFamily: V.bodyFont, fontSize: 12, fontWeight: 600, color: V.inkSoft }}>{w.vi}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, minWidth: 80 }}>
                <span style={{ fontFamily: V.bodyFont, fontSize: 10, fontWeight: 900, color: stage.color, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{stage.label}</span>
                <div style={{ width: 60, height: 4, background: V.panel, borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ width: `${w.strength * 100}%`, height: '100%', background: stage.color }} />
                </div>
              </div>
              <button style={{ width: 30, height: 30, background: V.panel, border: 'none', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="pencil" size={13} stroke={V.muted} />
              </button>
            </div>
          );
        })}
      </section>
    </main>
  </V_Frame>
);

// ─────────────────────────────────────────────────────────────────────────────
// 4. Dictionary — all words browser, big search
// ─────────────────────────────────────────────────────────────────────────────
const dictWords = [
  { en: 'preferential', vi: 'ưu đãi, dành sự ưu tiên', pos: 'adj', deck: 'PTE', stage: 'review', deckColor: V.primary },
  { en: 'meticulous', vi: 'tỉ mỉ, cẩn thận', pos: 'adj', deck: 'PTE', stage: 'mastered', deckColor: V.primary },
  { en: 'leverage', vi: 'tận dụng, đòn bẩy', pos: 'v', deck: 'Business', stage: 'review', deckColor: V_C.blue },
  { en: 'ambiguous', vi: 'mơ hồ', pos: 'adj', deck: 'PTE', stage: 'review', deckColor: V.primary },
  { en: 'paramount', vi: 'tối quan trọng', pos: 'adj', deck: 'PTE', stage: 'new', deckColor: V.primary },
  { en: 'discrepancy', vi: 'sự chênh lệch', pos: 'n', deck: 'Business', stage: 'learning', deckColor: V_C.blue },
  { en: 'undermine', vi: 'làm suy yếu', pos: 'v', deck: 'PTE', stage: 'mastered', deckColor: V.primary },
  { en: 'feasibility', vi: 'tính khả thi', pos: 'n', deck: 'Business', stage: 'learning', deckColor: V_C.blue },
  { en: 'concise', vi: 'súc tích', pos: 'adj', deck: 'PTE', stage: 'review', deckColor: V.primary },
  { en: 'cohort', vi: 'nhóm cùng lứa', pos: 'n', deck: 'Business', stage: 'new', deckColor: V_C.blue },
];

const V_Dictionary = () => (
  <V_Frame>
    <V_Sidebar active="dict" />
    <main style={{ flex: 1, padding: '24px 32px 28px', overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 18 }}>
      <V_PageHeader title={<>Từ điển <span style={{ color: V_C.purple }}>của bạn</span></>} subtitle="481 từ trong 6 bộ" />

      {/* Big search */}
      <div style={{ position: 'relative' }}>
        <Icon name="search" size={20} stroke={V.muted} style={{ position: 'absolute', left: 18, top: '50%', transform: 'translateY(-50%)' }} />
        <input placeholder="Tìm từ tiếng Anh hoặc nghĩa tiếng Việt…" style={{
          padding: '16px 16px 16px 52px', fontFamily: V.bodyFont, fontSize: 13, fontWeight: 600,
          background: '#fff', border: `1.5px solid ${V.border}`, borderRadius: 16, boxShadow: V.shadowMd,
          color: V.ink, outline: 'none', width: '100%', boxSizing: 'border-box',
        }}/>
        <kbd style={{ position: 'absolute', right: 18, top: '50%', transform: 'translateY(-50%)', fontFamily: V.monoFont, background: V.panel, border: `1px solid ${V.border}`, borderRadius: 6, padding: '3px 8px', fontSize: 11, fontWeight: 700, color: V.muted }}>⌘ K</kbd>
      </div>

      {/* Filter chips */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontFamily: V.bodyFont, fontSize: 11, fontWeight: 800, color: V.muted, letterSpacing: '0.12em', textTransform: 'uppercase', alignSelf: 'center', marginRight: 6 }}>Lọc:</span>
        {[
          { l: 'Tất cả 481', c: V.ink, active: true },
          { l: 'PTE 124', c: V.primary },
          { l: 'Business 86', c: V_C.blue },
          { l: 'Daily 56', c: V_C.orange },
          { l: 'Phrasal 72', c: V_C.purple },
          { l: 'IELTS 95', c: V_C.pink },
        ].map((f, i) => (
          <button key={i} style={{
            padding: '6px 14px', background: f.active ? f.c : '#fff', color: f.active ? '#fff' : f.c,
            border: `1px solid ${f.active ? f.c : V.border}`,
            boxShadow: f.active ? `0 2px 6px ${f.c}40` : 'none',
            borderRadius: 999, fontFamily: V.bodyFont, fontSize: 12, fontWeight: 800, cursor: 'pointer',
          }}>{f.l}</button>
        ))}
      </div>

      {/* Group: A */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ fontFamily: V.headFont, fontSize: 18, fontWeight: 900, color: V.primary, lineHeight: 1 }}>A · C</div>
          <div style={{ flex: 1, height: 1, background: V.border }} />
          <span style={{ fontFamily: V.bodyFont, fontSize: 12, fontWeight: 700, color: V.muted }}>5 từ</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
          {dictWords.slice(0, 6).map((w, i) => {
            const stage = stageMap[w.stage];
            return (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                background: '#fff', border: `1px solid ${V.border}`, borderRadius: 12, boxShadow: V.shadow,
              }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: w.deckColor + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontFamily: V.headFont, fontSize: 13, fontWeight: 900, color: w.deckColor }}>{w.en[0].toUpperCase()}</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                    <span style={{ fontFamily: V.headFont, fontSize: 13, fontWeight: 800, color: V.ink }}>{w.en}</span>
                    <span style={{ fontFamily: V.bodyFont, fontSize: 11, fontWeight: 700, color: V.muted, fontStyle: 'italic' }}>{w.pos}</span>
                  </div>
                  <div style={{ fontFamily: V.bodyFont, fontSize: 12, fontWeight: 600, color: V.inkSoft, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{w.vi}</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                  <span style={{ background: w.deckColor + '20', color: w.deckColor, padding: '1px 8px', borderRadius: 999, fontFamily: V.bodyFont, fontSize: 10, fontWeight: 800 }}>{w.deck}</span>
                  <span style={{ width: 8, height: 8, background: stage.color, borderRadius: '50%' }} title={stage.label} />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ fontFamily: V.headFont, fontSize: 18, fontWeight: 900, color: V_C.blue, lineHeight: 1 }}>D · L</div>
          <div style={{ flex: 1, height: 1, background: V.border }} />
          <span style={{ fontFamily: V.bodyFont, fontSize: 12, fontWeight: 700, color: V.muted }}>3 từ</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
          {dictWords.slice(5).map((w, i) => {
            const stage = stageMap[w.stage];
            return (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                background: '#fff', border: `1px solid ${V.border}`, borderRadius: 12, boxShadow: V.shadow,
              }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: w.deckColor + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontFamily: V.headFont, fontSize: 13, fontWeight: 900, color: w.deckColor }}>{w.en[0].toUpperCase()}</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                    <span style={{ fontFamily: V.headFont, fontSize: 13, fontWeight: 800, color: V.ink }}>{w.en}</span>
                    <span style={{ fontFamily: V.bodyFont, fontSize: 11, fontWeight: 700, color: V.muted, fontStyle: 'italic' }}>{w.pos}</span>
                  </div>
                  <div style={{ fontFamily: V.bodyFont, fontSize: 12, fontWeight: 600, color: V.inkSoft, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{w.vi}</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                  <span style={{ background: w.deckColor + '20', color: w.deckColor, padding: '1px 8px', borderRadius: 999, fontFamily: V.bodyFont, fontSize: 10, fontWeight: 800 }}>{w.deck}</span>
                  <span style={{ width: 8, height: 8, background: stage.color, borderRadius: '50%' }} />
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  </V_Frame>
);

// ─────────────────────────────────────────────────────────────────────────────
// 5. Settings
// ─────────────────────────────────────────────────────────────────────────────
const V_Toggle = ({ on }) => (
  <div style={{
    width: 44, height: 24, borderRadius: 999, background: on ? V.primary : V.border, position: 'relative',
    transition: 'background .15s', cursor: 'pointer', boxShadow: on ? `0 2px 6px ${V.primary}40` : 'none',
  }}>
    <div style={{
      position: 'absolute', top: 2, left: on ? 22 : 2, width: 20, height: 20, borderRadius: '50%',
      background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,.15)', transition: 'left .15s',
    }} />
  </div>
);

const V_Settings = () => (
  <V_Frame>
    <V_Sidebar active="settings" />
    <main style={{ flex: 1, padding: '24px 32px 28px', overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 22 }}>
      <V_PageHeader title="Cài đặt" subtitle="Tinh chỉnh để phù hợp với cách bạn học" />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Goals */}
        <V_Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: V.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 2px 6px ${V.primary}40` }}>
              <Icon name="target" size={17} stroke="#fff" strokeWidth={2.4} />
            </div>
            <h3 style={{ fontFamily: V.headFont, fontSize: 15, fontWeight: 900, margin: 0, color: V.ink }}>Mục tiêu hằng ngày</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <V_Field label="Số lượt ôn mỗi ngày" hint="khuyên: 30-60">
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <V_Input defaultValue="50" type="number" style={{ width: 90, textAlign: 'center', fontFamily: V.headFont, fontSize: 15, fontWeight: 900 }} />
                <span style={{ fontFamily: V.bodyFont, fontSize: 12, fontWeight: 700, color: V.muted }}>lượt</span>
              </div>
            </V_Field>
            <V_Field label="Số từ mới mỗi ngày" hint="khuyên: 5-15">
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <V_Input defaultValue="10" type="number" style={{ width: 90, textAlign: 'center', fontFamily: V.headFont, fontSize: 15, fontWeight: 900 }} />
                <span style={{ fontFamily: V.bodyFont, fontSize: 12, fontWeight: 700, color: V.muted }}>từ</span>
              </div>
            </V_Field>
          </div>
        </V_Card>

        {/* Reminders */}
        <V_Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: V_C.orange, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 2px 6px ${V_C.orange}40` }}>
              <Icon name="bell" size={17} stroke="#fff" strokeWidth={2.4} />
            </div>
            <h3 style={{ fontFamily: V.headFont, fontSize: 15, fontWeight: 900, margin: 0, color: V.ink }}>Nhắc nhở</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontFamily: V.bodyFont, fontSize: 12, fontWeight: 800, color: V.ink }}>Bật thông báo</div>
                <div style={{ fontFamily: V.bodyFont, fontSize: 12, fontWeight: 600, color: V.muted }}>Mình sẽ rủ học mỗi ngày</div>
              </div>
              <V_Toggle on />
            </div>
            <V_Field label="Giờ nhắc mỗi tối">
              <V_Input defaultValue="20:00" type="time" style={{ width: 130, fontFamily: V.monoFont, fontSize: 13, fontWeight: 700 }} />
            </V_Field>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontFamily: V.bodyFont, fontSize: 12, fontWeight: 800, color: V.ink }}>Nhắc duy trì chuỗi</div>
                <div style={{ fontFamily: V.bodyFont, fontSize: 12, fontWeight: 600, color: V.muted }}>Cảnh báo trước khi mất streak</div>
              </div>
              <V_Toggle on />
            </div>
          </div>
        </V_Card>

        {/* Sound */}
        <V_Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: V.gem, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 2px 6px ${V.gem}40` }}>
              <Icon name="speaker" size={17} stroke="#fff" strokeWidth={2.4} />
            </div>
            <h3 style={{ fontFamily: V.headFont, fontSize: 15, fontWeight: 900, margin: 0, color: V.ink }}>Âm thanh</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontFamily: V.bodyFont, fontSize: 12, fontWeight: 800, color: V.ink }}>Auto-play khi reveal</div>
                <div style={{ fontFamily: V.bodyFont, fontSize: 12, fontWeight: 600, color: V.muted }}>Phát ngay lần 1/6 khi hiện đáp án</div>
              </div>
              <V_Toggle on />
            </div>
            <V_Field label="Giọng phát âm">
              <div style={{ display: 'flex', gap: 6 }}>
                {['Anh-Mỹ', 'Anh-Anh', 'Anh-Úc'].map((v, i) => (
                  <button key={v} style={{
                    flex: 1, padding: '8px 12px', background: i === 0 ? V.gem : '#fff', color: i === 0 ? '#fff' : V.inkSoft,
                    border: `1px solid ${i === 0 ? V.gem : V.border}`,
                    boxShadow: i === 0 ? `0 2px 6px ${V.gem}40` : 'none',
                    borderRadius: 10, fontFamily: V.bodyFont, fontSize: 12, fontWeight: 800, cursor: 'pointer',
                  }}>{v}</button>
                ))}
              </div>
            </V_Field>
          </div>
        </V_Card>

        {/* Theme + danger */}
        <V_Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: V_C.purple, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 2px 6px ${V_C.purple}40` }}>
              <Icon name="sparkle" size={17} stroke="#fff" strokeWidth={2.4} fill="#fff" />
            </div>
            <h3 style={{ fontFamily: V.headFont, fontSize: 15, fontWeight: 900, margin: 0, color: V.ink }}>Giao diện</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <V_Field label="Chế độ">
              <div style={{ display: 'flex', gap: 6 }}>
                {['Sáng', 'Tối', 'Theo hệ thống'].map((v, i) => (
                  <button key={v} style={{
                    flex: 1, padding: '8px 12px', background: i === 0 ? V_C.purple : '#fff', color: i === 0 ? '#fff' : V.inkSoft,
                    border: `1px solid ${i === 0 ? V_C.purple : V.border}`,
                    boxShadow: i === 0 ? `0 2px 6px ${V_C.purple}40` : 'none',
                    borderRadius: 10, fontFamily: V.bodyFont, fontSize: 12, fontWeight: 800, cursor: 'pointer',
                  }}>{v}</button>
                ))}
              </div>
            </V_Field>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontFamily: V.bodyFont, fontSize: 12, fontWeight: 800, color: V.ink }}>Hoạt ảnh & celebration</div>
                <div style={{ fontFamily: V.bodyFont, fontSize: 12, fontWeight: 600, color: V.muted }}>Sparkles, mình nhảy múa, vv.</div>
              </div>
              <V_Toggle on />
            </div>
            <button style={{
              marginTop: 6, padding: '10px 14px', background: '#fff', color: V_C.red, border: `1px solid ${V_C.red}40`,
              borderRadius: 10, fontFamily: V.bodyFont, fontSize: 12, fontWeight: 800, cursor: 'pointer', textAlign: 'left',
            }}>Xoá toàn bộ dữ liệu học…</button>
          </div>
        </V_Card>
      </div>
    </main>
  </V_Frame>
);

Object.assign(window, { V_AddWord, V_DeckDetail, V_DecksList, V_Dictionary, V_Settings });
