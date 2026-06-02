// read-along.jsx — Karaoke reader (real Web Speech API TTS)
// Reads a full passage, highlights each word as spoken, speed control,
// tap a word to hear it alone, read sentence-by-sentence / pause.
// Two surfaces: <ReadAlong/> (mobile 402) + <ReadAlongDesktop/> (1280).

// Sample passage — paragraphs of sentences
const RA_TEXT = [
  [
    "Every morning, Mai opens her small coffee shop before the city wakes up.",
    "The smell of fresh beans drifts gently into the quiet street.",
    "She believes that a good day always starts with a warm cup and a kind word.",
  ],
  [
    "Tourists often stop by, curious about the old building and its painted walls.",
    "Mai greets each of them with a bright smile and a short story about her neighborhood.",
    "For her, coffee is not just a drink — it is a way to bring people together.",
  ],
];

// Parallel Vietnamese translation (per sentence, same shape as RA_TEXT)
const RA_VN = [
  [
    "Mỗi sáng, Mai mở quán cà phê nhỏ của mình trước khi thành phố thức giấc.",
    "Mùi hạt cà phê tươi mới nhẹ nhàng lan vào con phố yên tĩnh.",
    "Cô tin rằng một ngày tốt lành luôn bắt đầu bằng một tách ấm và một lời tử tế.",
  ],
  [
    "Du khách thường ghé qua, tò mò về toà nhà cũ và những bức tường được sơn vẽ.",
    "Mai chào mỗi người bằng một nụ cười rạng rỡ và một câu chuyện ngắn về khu phố của mình.",
    "Với cô, cà phê không chỉ là một thức uống — đó là cách để gắn kết mọi người lại với nhau.",
  ],
];

// Mini glossary for tappable words — clean key (lowercased, letters/' only)
const RA_GLOSS = {
  morning: { vi: 'buổi sáng', pos: 'n', ipa: '/ˈmɔːrnɪŋ/' },
  opens: { vi: 'mở (ra)', pos: 'v', ipa: '/ˈoʊpənz/' },
  small: { vi: 'nhỏ', pos: 'adj', ipa: '/smɔːl/' },
  coffee: { vi: 'cà phê', pos: 'n', ipa: '/ˈkɔːfi/' },
  shop: { vi: 'cửa hàng, quán', pos: 'n', ipa: '/ʃɑːp/' },
  before: { vi: 'trước khi', pos: 'prep', ipa: '/bɪˈfɔːr/' },
  city: { vi: 'thành phố', pos: 'n', ipa: '/ˈsɪti/' },
  wakes: { vi: 'thức dậy', pos: 'v', ipa: '/weɪks/' },
  smell: { vi: 'mùi hương', pos: 'n', ipa: '/smel/' },
  fresh: { vi: 'tươi, mới', pos: 'adj', ipa: '/freʃ/' },
  beans: { vi: 'hạt (cà phê)', pos: 'n', ipa: '/biːnz/' },
  drifts: { vi: 'trôi, lan toả', pos: 'v', ipa: '/drɪfts/' },
  gently: { vi: 'nhẹ nhàng', pos: 'adv', ipa: '/ˈdʒentli/' },
  quiet: { vi: 'yên tĩnh', pos: 'adj', ipa: '/ˈkwaɪət/' },
  street: { vi: 'con phố', pos: 'n', ipa: '/striːt/' },
  believes: { vi: 'tin rằng', pos: 'v', ipa: '/bɪˈliːvz/' },
  always: { vi: 'luôn luôn', pos: 'adv', ipa: '/ˈɔːlweɪz/' },
  starts: { vi: 'bắt đầu', pos: 'v', ipa: '/stɑːrts/' },
  warm: { vi: 'ấm', pos: 'adj', ipa: '/wɔːrm/' },
  cup: { vi: 'tách, cốc', pos: 'n', ipa: '/kʌp/' },
  kind: { vi: 'tử tế', pos: 'adj', ipa: '/kaɪnd/' },
  word: { vi: 'lời nói', pos: 'n', ipa: '/wɜːrd/' },
  tourists: { vi: 'khách du lịch', pos: 'n', ipa: '/ˈtʊrɪsts/' },
  often: { vi: 'thường xuyên', pos: 'adv', ipa: '/ˈɔːfən/' },
  curious: { vi: 'tò mò', pos: 'adj', ipa: '/ˈkjʊriəs/' },
  building: { vi: 'toà nhà', pos: 'n', ipa: '/ˈbɪldɪŋ/' },
  painted: { vi: 'được sơn vẽ', pos: 'adj', ipa: '/ˈpeɪntɪd/' },
  walls: { vi: 'bức tường', pos: 'n', ipa: '/wɔːlz/' },
  greets: { vi: 'chào đón', pos: 'v', ipa: '/ɡriːts/' },
  bright: { vi: 'rạng rỡ, tươi sáng', pos: 'adj', ipa: '/braɪt/' },
  smile: { vi: 'nụ cười', pos: 'n', ipa: '/smaɪl/' },
  story: { vi: 'câu chuyện', pos: 'n', ipa: '/ˈstɔːri/' },
  neighborhood: { vi: 'khu phố', pos: 'n', ipa: '/ˈneɪbərhʊd/' },
  drink: { vi: 'thức uống', pos: 'n', ipa: '/drɪŋk/' },
  way: { vi: 'cách thức', pos: 'n', ipa: '/weɪ/' },
  bring: { vi: 'mang lại, gắn kết', pos: 'v', ipa: '/brɪŋ/' },
  people: { vi: 'mọi người', pos: 'n', ipa: '/ˈpiːpl/' },
  together: { vi: 'cùng nhau', pos: 'adv', ipa: '/təˈɡeðər/' },
};
const RA_clean = (s) => s.toLowerCase().replace(/[^a-z']/g, '');

// Tokenize a sentence into words + spaces, keeping char offsets
const RA_tokenize = (sentence) => {
  const tokens = [];
  const re = /(\s+|[^\s]+)/g;
  let m;
  while ((m = re.exec(sentence))) {
    const text = m[0];
    tokens.push({ text, start: m.index, end: m.index + text.length, isWord: /\S/.test(text) });
  }
  return tokens;
};

const RA_SPEEDS = [
  { label: 'Chậm', rate: 0.7 },
  { label: 'Vừa', rate: 0.85 },
  { label: 'Thường', rate: 1.0 },
  { label: 'Nhanh', rate: 1.3 },
];

// ─────────────────────────────────────────────────────────────────────────────
// Shared karaoke engine hook
// ─────────────────────────────────────────────────────────────────────────────
const useKaraoke = () => {
  const sentences = React.useMemo(() => {
    const arr = [];
    RA_TEXT.forEach((para, pIdx) => para.forEach((text, sIdx) => {
      arr.push({ pIdx, sIdx, text, tokens: RA_tokenize(text) });
    }));
    return arr;
  }, []);

  const [playing, setPlaying] = React.useState(false);
  const [curSent, setCurSent] = React.useState(-1);
  const [curTok, setCurTok] = React.useState(-1);
  const [rate, setRate] = React.useState(1.0);
  const [auto, setAuto] = React.useState(true);
  const [wordPop, setWordPop] = React.useState(null);
  const [supported, setSupported] = React.useState(true);
  const [showVN, setShowVN] = React.useState(false);
  const [sel, setSel] = React.useState(null);   // selected word {sentIdx, tokIdx, raw, clean, gloss}
  const [saved, setSaved] = React.useState([]);  // [{clean, raw, vi}]
  const [deck, setDeck] = React.useState('PTE Academic');

  const rateRef = React.useRef(rate); rateRef.current = rate;
  const autoRef = React.useRef(auto); autoRef.current = auto;
  const singleRef = React.useRef(false);

  React.useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) setSupported(false);
    return () => { try { window.speechSynthesis.cancel(); } catch (e) {} };
  }, []);

  const speakSentence = React.useCallback((idx) => {
    if (idx < 0 || idx >= sentences.length) { setPlaying(false); setCurSent(-1); setCurTok(-1); return; }
    const synth = window.speechSynthesis;
    synth.cancel();
    singleRef.current = false;
    const s = sentences[idx];
    const u = new SpeechSynthesisUtterance(s.text);
    u.lang = 'en-US';
    u.rate = rateRef.current;
    setCurSent(idx); setCurTok(-1); setPlaying(true); setWordPop(null);
    u.onboundary = (e) => {
      if (e.name && e.name !== 'word') return;
      const ci = e.charIndex;
      const ti = s.tokens.findIndex(t => t.isWord && ci >= t.start && ci < t.end);
      if (ti >= 0) setCurTok(ti);
    };
    u.onend = () => {
      if (singleRef.current) return;
      if (autoRef.current) speakSentence(idx + 1);
      else { setPlaying(false); setCurTok(-1); }
    };
    synth.speak(u);
  }, [sentences]);

  const togglePlay = () => {
    const synth = window.speechSynthesis;
    if (playing) { synth.cancel(); setPlaying(false); }
    else { speakSentence(curSent >= 0 ? curSent : 0); }
  };
  const restart = () => { window.speechSynthesis.cancel(); setCurTok(-1); speakSentence(0); };
  const prevS = () => { const t = Math.max(0, (curSent < 0 ? 0 : curSent) - 1); speakSentence(t); };
  const nextS = () => { const t = Math.min(sentences.length - 1, (curSent < 0 ? 0 : curSent) + 1); speakSentence(t); };
  const sayText = (text) => {
    const synth = window.speechSynthesis;
    synth.cancel();
    singleRef.current = true;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-US';
    u.rate = rateRef.current;
    u.onend = () => { singleRef.current = false; };
    synth.speak(u);
  };
  const speakWord = (sentIdx, tokIdx) => {
    const tok = sentences[sentIdx].tokens[tokIdx];
    const clean = RA_clean(tok.text);
    sayText(tok.text);
    setPlaying(false); setCurSent(sentIdx); setCurTok(tokIdx);
    setWordPop({ text: tok.text });
    setSel({ sentIdx, tokIdx, raw: tok.text, clean, gloss: RA_GLOSS[clean] || null });
  };
  const pickRate = (r) => {
    setRate(r); rateRef.current = r;
    if (playing && curSent >= 0) speakSentence(curSent);
  };
  const addWord = (entry) => {
    if (!entry) return;
    setSaved(prev => prev.some(w => w.clean === entry.clean) ? prev : [...prev, entry]);
  };
  const isSaved = (clean) => saved.some(w => w.clean === clean);

  const paras = React.useMemo(() => {
    const g = {};
    sentences.forEach((s, gi) => { (g[s.pIdx] = g[s.pIdx] || []).push({ ...s, gi }); });
    return Object.values(g);
  }, [sentences]);

  return { sentences, paras, playing, curSent, curTok, rate, auto, wordPop, supported, singleRef,
    showVN, setShowVN, sel, setSel, saved, addWord, isSaved, deck, setDeck, sayText,
    togglePlay, restart, prevS, nextS, speakWord, pickRate, setAuto };
};

// Reusable word-rendering. vnMode renders each sentence as a block with its
// Vietnamese line beneath; otherwise sentences flow inline within paragraphs.
const RAWord = ({ s, t, ti, k, onWord }) => {
  if (!t.isWord) return <span>{t.text}</span>;
  const isCur = s.gi === k.curSent;
  const hot = isCur && ti === k.curTok && !k.singleRef.current;
  const picked = k.sel && k.sel.sentIdx === s.gi && k.sel.tokIdx === ti;
  const known = !!RA_GLOSS[RA_clean(t.text)];
  return (
    <span onClick={() => onWord(s.gi, ti)} style={{
      cursor: 'pointer',
      background: hot ? BUN_BLUE : (picked ? `${BUN_BLUE}22` : 'transparent'),
      color: hot ? '#fff' : 'inherit',
      borderRadius: 5, padding: (hot || picked) ? '1px 4px' : '1px 0', margin: (hot || picked) ? '0 -1px' : 0,
      fontWeight: hot ? 700 : 400,
      boxShadow: hot ? `0 2px 8px ${BUN_BLUE}55` : 'none',
      borderBottom: !hot && !picked && known ? `2px dotted ${BUN_BLUE}55` : '2px solid transparent',
      transition: 'background .12s ease, color .12s ease',
      WebkitTapHighlightColor: 'transparent',
    }}>{t.text}</span>
  );
};

const RAParagraphs = ({ k, onWord, gap = 14, vnMode = false, vnSize = 13, vnLabelColor }) => {
  const { paras } = k;
  if (vnMode) {
    return paras.map((para, pi) => (
      <div key={pi} style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: pi === 0 ? gap + 6 : 0 }}>
        {para.map((s) => {
          const isCur = s.gi === k.curSent;
          return (
            <div key={s.gi} style={{
              padding: '8px 12px', borderRadius: 12, borderLeft: `3px solid ${isCur ? BUN_BLUE : 'transparent'}`,
              background: isCur && !k.singleRef.current ? `${BUN_BLUE}0e` : 'transparent', transition: 'all .25s ease',
            }}>
              <div>{s.tokens.map((t, ti) => <RAWord key={ti} s={s} t={t} ti={ti} k={k} onWord={onWord} />)}</div>
              <div style={{ fontFamily: V.bodyFont, fontSize: vnSize, fontWeight: 600, color: vnLabelColor || V.muted, marginTop: 5, lineHeight: 1.5 }}>
                {RA_VN[s.pIdx][s.sIdx]}
              </div>
            </div>
          );
        })}
      </div>
    ));
  }
  return paras.map((para, pi) => (
    <p key={pi} style={{ margin: pi === 0 ? `0 0 ${gap}px` : 0 }}>
      {para.map((s) => {
        const isCur = s.gi === k.curSent;
        return (
          <span key={s.gi} style={{
            background: isCur && !k.singleRef.current ? `${BUN_BLUE}12` : 'transparent',
            borderRadius: 6, transition: 'background .25s ease', padding: '1px 0',
          }}>
            {s.tokens.map((t, ti) => <RAWord key={ti} s={s} t={t} ti={ti} k={k} onWord={onWord} />)}
          </span>
        );
      })}
    </p>
  ));
};

// Word-detail card (used in desktop rail) — meaning, IPA, listen, save-to-deck
const RAWordCard = ({ k }) => {
  const { sel } = k;
  if (!sel) {
    return (
      <div style={{ background: '#fff', border: `1px solid ${V.border}`, boxShadow: V.shadowMd, borderRadius: 18, padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
        <img src={MASCOT.happy} width={58} height={58} alt="" style={{ flexShrink: 0, filter: 'drop-shadow(0 4px 8px rgba(40,30,15,.18))', animation: k.playing ? 'ngoc-bob 1.4s ease-in-out infinite' : 'none' }} />
        <div style={{ fontFamily: V.bodyFont, fontSize: 13, fontWeight: 700, color: V.inkSoft, lineHeight: 1.45 }}>
          {k.playing ? 'Mình đang đọc, bạn nghe nha…' : 'Click vào một từ để xem nghĩa & lưu vào bộ từ.'}
        </div>
      </div>
    );
  }
  const g = sel.gloss;
  const saved = k.isSaved(sel.clean);
  const display = sel.raw.replace(/[^A-Za-z'-]/g, '');
  return (
    <div style={{ background: '#fff', border: `1.5px solid ${BUN_BLUE}55`, boxShadow: `0 8px 20px ${BUN_BLUE}22, 0 3px 0 ${BUN_BLUE}20`, borderRadius: 18, padding: '16px 18px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontFamily: V.headFont, fontSize: 24, fontWeight: 1000, color: V.ink, letterSpacing: '-0.02em', lineHeight: 1 }}>{display}</span>
        {g && g.pos && <span style={{ background: V_C.purple, color: '#fff', borderRadius: 999, padding: '2px 8px', fontFamily: V.headFont, fontWeight: 1000, fontSize: 9, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{g.pos}</span>}
        <button onClick={() => k.sayText(sel.raw)} title="Nghe lại" style={{ marginLeft: 'auto', width: 32, height: 32, background: BUN_BLUE, border: 'none', boxShadow: `0 2px 0 rgba(20,40,80,.15), 0 3px 6px ${BUN_BLUE}55`, borderRadius: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="speaker" size={14} stroke="#fff" strokeWidth={2.4} />
        </button>
      </div>
      {g && g.ipa && <div style={{ fontFamily: V.monoFont, fontSize: 13, color: BUN_BLUE, fontWeight: 700, marginTop: 4 }}>{g.ipa}</div>}
      <div style={{ fontFamily: V.headFont, fontSize: 16, fontWeight: 800, color: V.ink, marginTop: 8 }}>
        {g ? g.vi : <span style={{ fontWeight: 600, color: V.muted, fontFamily: V.bodyFont, fontSize: 13 }}>Chưa có nghĩa sẵn — bấm 🔊 để nghe phát âm.</span>}
      </div>
      <button
        onClick={() => k.addWord({ clean: sel.clean, raw: display, vi: g ? g.vi : '' })}
        disabled={saved}
        className={saved ? '' : 'bun-cta-btn'}
        style={{
          width: '100%', marginTop: 12, padding: '11px 14px', borderRadius: 12, cursor: saved ? 'default' : 'pointer',
          background: saved ? V.primarySoft : BUN_BLUE, color: saved ? V.primary : '#fff', border: 'none',
          boxShadow: saved ? 'none' : `0 3px 0 rgba(20,40,80,.18), 0 4px 10px ${BUN_BLUE}55`,
          fontFamily: V.headFont, fontWeight: 1000, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
        }}>
        {saved
          ? <><Icon name="check" size={15} stroke={V.primary} strokeWidth={3} /> Đã lưu vào "{k.deck}"</>
          : <><Icon name="plus" size={15} stroke="#fff" strokeWidth={3} /> Lưu vào bộ từ</>}
      </button>
    </div>
  );
};

const RA_PlayIcon = ({ playing, size = 18 }) => (
  playing
    ? <svg width={size} height={size} viewBox="0 0 24 24" fill="#fff"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>
    : <Icon name="play" size={size} fill="#fff" stroke="#fff" />
);

// ─────────────────────────────────────────────────────────────────────────────
// MOBILE
// ─────────────────────────────────────────────────────────────────────────────
const ReadAlong = () => {
  const k = useKaraoke();
  const { sentences, playing, curSent, rate, auto, wordPop, supported } = k;
  return (
    <MAppShell active="review">
      <div style={{ padding: '8px 18px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button style={{ width: 34, height: 34, borderRadius: 11, background: '#fff', border: `1px solid ${V.border}`, boxShadow: V.shadow, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Icon name="arrowLeft" size={16} stroke={V.ink} strokeWidth={2.4} />
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: V.bodyFont, fontSize: 9, fontWeight: 900, color: V.muted, letterSpacing: '0.14em', textTransform: 'uppercase' }}>Đọc theo · Karaoke</div>
            <div style={{ fontFamily: V.headFont, fontSize: 15, fontWeight: 1000, color: V.ink, marginTop: 1 }}>Mai's coffee shop</div>
          </div>
          <div style={{ background: V_C.orange, color: '#fff', borderRadius: 8, padding: '4px 9px', fontFamily: V.headFont, fontWeight: 1000, fontSize: 11, letterSpacing: '0.04em', boxShadow: '0 2px 4px rgba(255,154,60,.4)' }}>B1</div>
        </div>

        {!supported && (
          <div style={{ background: '#fff7ed', border: `1px solid ${V_C.orange}55`, borderRadius: 12, padding: '10px 12px', fontFamily: V.bodyFont, fontSize: 12, fontWeight: 700, color: '#b45309', lineHeight: 1.5 }}>
            ⚠️ Trình duyệt này không hỗ trợ đọc to. Thử Chrome / Safari để nghe karaoke.
          </div>
        )}

        <article style={{ background: '#fff', border: `1px solid ${V.border}`, boxShadow: V.shadowMd, borderRadius: 18, padding: '18px 18px 20px', fontFamily: '"Lora", serif', fontSize: 17, fontWeight: 400, color: V.ink, lineHeight: 1.75 }}>
          <RAParagraphs k={k} onWord={k.speakWord} vnMode={k.showVN} vnSize={13} />
          <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px dashed ${V.border}`, fontFamily: V.bodyFont, fontSize: 11, fontWeight: 700, color: V.muted, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Icon name="sparkle" size={12} stroke={BUN_BLUE} fill={BUN_BLUE} /> Từ <span style={{ borderBottom: `2px dotted ${BUN_BLUE}`, paddingBottom: 1 }}>gạch chấm</span> có nghĩa — chạm để xem &amp; lưu.
          </div>
        </article>

        {/* Word-detail card (meaning · IPA · listen · save) */}
        <RAWordCard k={k} />

        {/* Parallel translation toggle */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: V.panel, borderRadius: 12, padding: '10px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 30, height: 30, borderRadius: 9, background: V_C.teal, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: `0 2px 4px ${V_C.teal}55` }}>
              <Icon name="library" size={14} stroke="#fff" strokeWidth={2.4} />
            </div>
            <div>
              <div style={{ fontFamily: V.headFont, fontSize: 13, fontWeight: 900, color: V.ink }}>Dịch song song</div>
              <div style={{ fontFamily: V.bodyFont, fontSize: 10.5, fontWeight: 700, color: V.muted, marginTop: 1 }}>Hiện nghĩa tiếng Việt dưới mỗi câu</div>
            </div>
          </div>
          <button onClick={() => k.setShowVN(v => !v)} style={{ width: 40, height: 22, borderRadius: 999, background: k.showVN ? V_C.teal : V.border, position: 'relative', border: 'none', cursor: 'pointer', flexShrink: 0, transition: 'background .2s' }}>
            <div style={{ position: 'absolute', top: 2, left: k.showVN ? 20 : 2, width: 18, height: 18, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,.2)', transition: 'left .2s' }} />
          </button>
        </div>

        <div>
          <div style={{ fontFamily: V.bodyFont, fontSize: 10, fontWeight: 900, color: V.muted, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 7 }}>Tốc độ đọc</div>
          <div style={{ display: 'flex', gap: 6 }}>
            {RA_SPEEDS.map(sp => {
              const on = Math.abs(sp.rate - rate) < 0.001;
              return (
                <button key={sp.label} onClick={() => k.pickRate(sp.rate)} style={{
                  flex: 1, padding: '9px 6px', borderRadius: 12, cursor: 'pointer',
                  background: on ? BUN_BLUE : '#fff', color: on ? '#fff' : V.inkSoft,
                  border: `1px solid ${on ? BUN_BLUE : V.border}`, boxShadow: on ? `0 3px 0 rgba(20,40,80,.18)` : V.shadow,
                  fontFamily: V.headFont, fontWeight: 1000, fontSize: 12,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1,
                }}>
                  {sp.label}<span style={{ fontFamily: V.monoFont, fontWeight: 700, fontSize: 9, opacity: on ? 0.85 : 0.6 }}>{sp.rate}×</span>
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: V.panel, borderRadius: 12, padding: '10px 14px' }}>
          <div>
            <div style={{ fontFamily: V.headFont, fontSize: 13, fontWeight: 900, color: V.ink }}>{auto ? 'Đọc liền cả đoạn' : 'Đọc từng câu'}</div>
            <div style={{ fontFamily: V.bodyFont, fontSize: 10.5, fontWeight: 700, color: V.muted, marginTop: 1 }}>{auto ? 'Hết câu tự sang câu kế' : 'Hết câu thì dừng, bấm ▶ để đọc tiếp'}</div>
          </div>
          <button onClick={() => k.setAuto(a => !a)} style={{ width: 40, height: 22, borderRadius: 999, background: auto ? BUN_BLUE : V.border, position: 'relative', border: 'none', cursor: 'pointer', flexShrink: 0, transition: 'background .2s' }}>
            <div style={{ position: 'absolute', top: 2, left: auto ? 20 : 2, width: 18, height: 18, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,.2)', transition: 'left .2s' }} />
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={k.prevS} title="Câu trước" style={{ width: 44, height: 44, borderRadius: 13, background: '#fff', border: `1px solid ${V.border}`, boxShadow: V.shadow, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill={V.ink}><path d="M6 5h2v14H6zM20 5L9 12l11 7z"/></svg>
          </button>
          <button onClick={k.togglePlay} className="bun-cta-btn" style={{
            flex: 1, height: 52, borderRadius: 16, background: BUN_BLUE, color: '#fff', border: 'none',
            boxShadow: `0 4px 0 rgba(20,40,80,.2), 0 8px 18px ${BUN_BLUE}55`, cursor: 'pointer',
            fontFamily: V.headFont, fontWeight: 1000, fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
            <RA_PlayIcon playing={playing} size={17} /> {playing ? 'Tạm dừng' : (curSent >= 0 ? 'Đọc tiếp' : 'Đọc to')}
          </button>
          <button onClick={k.nextS} title="Câu sau" style={{ width: 44, height: 44, borderRadius: 13, background: '#fff', border: `1px solid ${V.border}`, boxShadow: V.shadow, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill={V.ink}><path d="M16 5h2v14h-2zM4 5l11 7L4 19z"/></svg>
          </button>
          <button onClick={k.restart} title="Đọc lại từ đầu" style={{ width: 44, height: 44, borderRadius: 13, background: '#fff', border: `1px solid ${V.border}`, boxShadow: V.shadow, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Icon name="refresh" size={17} stroke={V.ink} strokeWidth={2.4} />
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ flex: 1, height: 6, background: V.panel, borderRadius: 999, overflow: 'hidden' }}>
            <div style={{ width: `${curSent < 0 ? 0 : ((curSent + 1) / sentences.length) * 100}%`, height: '100%', background: BUN_BLUE, borderRadius: 999, transition: 'width .3s ease' }} />
          </div>
          <span style={{ fontFamily: V.monoFont, fontSize: 10, fontWeight: 700, color: V.muted, flexShrink: 0 }}>Câu {curSent < 0 ? 0 : curSent + 1}/{sentences.length}</span>
        </div>

        {/* Saved words tray */}
        <div style={{ background: '#fff', border: `1px solid ${V.border}`, boxShadow: V.shadowMd, borderRadius: 14, padding: '12px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: k.saved.length ? 10 : 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: V_C.pink, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 2px 4px ${V_C.pink}55` }}>
                <Icon name="folder" size={13} stroke="#fff" strokeWidth={2.4} />
              </div>
              <div>
                <div style={{ fontFamily: V.headFont, fontSize: 13, fontWeight: 1000, color: V.ink }}>Đã nhặt {k.saved.length} từ</div>
                <div style={{ fontFamily: V.bodyFont, fontSize: 10, fontWeight: 700, color: V.muted }}>vào bộ "{k.deck}"</div>
              </div>
            </div>
            {k.saved.length > 0 && (
              <button className="bun-cta-btn" style={{ padding: '7px 12px', background: V_C.pink, color: '#fff', border: 'none', borderRadius: 10, boxShadow: `0 3px 0 rgba(80,20,50,.18), 0 4px 8px ${V_C.pink}55`, fontFamily: V.headFont, fontWeight: 1000, fontSize: 11, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                Ôn ngay →
              </button>
            )}
          </div>
          {k.saved.length === 0 ? (
            <div style={{ fontFamily: V.bodyFont, fontSize: 11, fontWeight: 700, color: V.muted, lineHeight: 1.5, paddingTop: 8 }}>
              Chưa có từ nào. Chạm một từ rồi bấm <b style={{ color: V.ink }}>＋ Lưu vào bộ từ</b>.
            </div>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {k.saved.map(w => (
                <span key={w.clean} title={w.vi} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 10px', background: V.panel, border: `1px solid ${V.border}`, borderRadius: 999, fontFamily: V.bodyFont, fontSize: 12, fontWeight: 800, color: V.ink }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: V_C.pink }} />{w.raw}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </MAppShell>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// DESKTOP — V_Frame + sidebar, two-column (reading | control rail)
// ─────────────────────────────────────────────────────────────────────────────
const ReadAlongDesktop = () => {
  const k = useKaraoke();
  const { sentences, playing, curSent, rate, auto, wordPop, supported } = k;
  return (
    <V_Frame>
      <V_Sidebar active="review" />
      <main style={{ flex: 1, padding: '24px 32px 28px', overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 18 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontFamily: V.bodyFont, fontSize: 11, fontWeight: 800, color: V.muted, letterSpacing: '0.14em', textTransform: 'uppercase' }}>Đọc theo · Karaoke TTS</div>
            <h1 style={{ fontFamily: V.headFont, fontSize: 30, fontWeight: 900, lineHeight: 1.05, margin: '4px 0 0', letterSpacing: '-0.02em', color: V.ink }}>
              Mai's coffee shop
            </h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: '#fff', border: `1px solid ${V.border}`, borderRadius: 999, boxShadow: V.shadow, fontFamily: V.bodyFont, fontSize: 12, fontWeight: 800, color: V.inkSoft }}>
              <Icon name="book" size={14} stroke={V.inkSoft} strokeWidth={2.2} /> 86 từ · ~40s
            </div>
            <div style={{ background: V_C.orange, color: '#fff', borderRadius: 10, padding: '6px 12px', fontFamily: V.headFont, fontWeight: 900, fontSize: 13, letterSpacing: '0.04em', boxShadow: '0 2px 6px rgba(255,154,60,.4)' }}>CEFR B1</div>
          </div>
        </div>

        {!supported && (
          <div style={{ background: '#fff7ed', border: `1px solid ${V_C.orange}55`, borderRadius: 12, padding: '12px 16px', fontFamily: V.bodyFont, fontSize: 13, fontWeight: 700, color: '#b45309' }}>
            ⚠️ Trình duyệt này không hỗ trợ đọc to. Thử Chrome / Safari để nghe karaoke.
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20, alignItems: 'start' }}>
          {/* Reading column */}
          <article style={{ background: '#fff', border: `1px solid ${V.border}`, boxShadow: V.shadowLg, borderRadius: 22, padding: '34px 40px 30px', fontFamily: '"Lora", serif', fontSize: 27, fontWeight: 400, color: V.ink, lineHeight: 1.85, position: 'relative' }}>
            <RAParagraphs k={k} onWord={k.speakWord} gap={20} vnMode={k.showVN} vnSize={15} />
            <div style={{ marginTop: 22, paddingTop: 16, borderTop: `1px dashed ${V.border}`, fontFamily: V.bodyFont, fontSize: 13, fontWeight: 700, color: V.muted, display: 'flex', alignItems: 'center', gap: 7 }}>
              <Icon name="sparkle" size={14} stroke={BUN_BLUE} fill={BUN_BLUE} /> Từ có <span style={{ borderBottom: `2px dotted ${BUN_BLUE}`, paddingBottom: 1 }}>gạch chấm</span> là có nghĩa — click để xem &amp; lưu vào bộ từ.
            </div>
          </article>

          {/* Control rail */}
          <aside style={{ display: 'flex', flexDirection: 'column', gap: 14, position: 'sticky', top: 18 }}>
            {/* Word detail / mascot card */}
            <RAWordCard k={k} />

            {/* Parallel translation toggle */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff', border: `1px solid ${V.border}`, boxShadow: V.shadowMd, borderRadius: 18, padding: '14px 16px' }}>
              <div style={{ flex: 1, minWidth: 0, paddingRight: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 10, background: V_C.teal, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: `0 2px 4px ${V_C.teal}55` }}>
                  <Icon name="library" size={15} stroke="#fff" strokeWidth={2.4} />
                </div>
                <div>
                  <div style={{ fontFamily: V.headFont, fontSize: 14, fontWeight: 900, color: V.ink }}>Dịch song song</div>
                  <div style={{ fontFamily: V.bodyFont, fontSize: 11, fontWeight: 700, color: V.muted, marginTop: 1 }}>Hiện nghĩa tiếng Việt dưới mỗi câu</div>
                </div>
              </div>
              <button onClick={() => k.setShowVN(v => !v)} style={{ width: 44, height: 24, borderRadius: 999, background: k.showVN ? V_C.teal : V.border, position: 'relative', border: 'none', cursor: 'pointer', flexShrink: 0, transition: 'background .2s' }}>
                <div style={{ position: 'absolute', top: 2, left: k.showVN ? 22 : 2, width: 20, height: 20, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,.2)', transition: 'left .2s' }} />
              </button>
            </div>

            {/* Speed */}
            <div style={{ background: '#fff', border: `1px solid ${V.border}`, boxShadow: V.shadowMd, borderRadius: 18, padding: '14px 16px' }}>
              <div style={{ fontFamily: V.bodyFont, fontSize: 10, fontWeight: 900, color: V.muted, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 9 }}>Tốc độ đọc</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7 }}>
                {RA_SPEEDS.map(sp => {
                  const on = Math.abs(sp.rate - rate) < 0.001;
                  return (
                    <button key={sp.label} onClick={() => k.pickRate(sp.rate)} style={{
                      padding: '10px 8px', borderRadius: 12, cursor: 'pointer',
                      background: on ? BUN_BLUE : '#fff', color: on ? '#fff' : V.inkSoft,
                      border: `1px solid ${on ? BUN_BLUE : V.border}`, boxShadow: on ? `0 3px 0 rgba(20,40,80,.18)` : V.shadow,
                      fontFamily: V.headFont, fontWeight: 1000, fontSize: 13,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    }}>
                      {sp.label} <span style={{ fontFamily: V.monoFont, fontWeight: 700, fontSize: 10, opacity: on ? 0.85 : 0.55 }}>{sp.rate}×</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Auto toggle */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff', border: `1px solid ${V.border}`, boxShadow: V.shadowMd, borderRadius: 18, padding: '14px 16px' }}>
              <div style={{ flex: 1, minWidth: 0, paddingRight: 10 }}>
                <div style={{ fontFamily: V.headFont, fontSize: 14, fontWeight: 900, color: V.ink }}>{auto ? 'Đọc liền cả đoạn' : 'Đọc từng câu'}</div>
                <div style={{ fontFamily: V.bodyFont, fontSize: 11, fontWeight: 700, color: V.muted, marginTop: 2 }}>{auto ? 'Hết câu tự sang câu kế tiếp' : 'Hết câu thì dừng, bấm ▶ đọc tiếp'}</div>
              </div>
              <button onClick={() => k.setAuto(a => !a)} style={{ width: 44, height: 24, borderRadius: 999, background: auto ? BUN_BLUE : V.border, position: 'relative', border: 'none', cursor: 'pointer', flexShrink: 0, transition: 'background .2s' }}>
                <div style={{ position: 'absolute', top: 2, left: auto ? 22 : 2, width: 20, height: 20, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,.2)', transition: 'left .2s' }} />
              </button>
            </div>

            {/* Transport */}
            <div style={{ background: '#fff', border: `1px solid ${V.border}`, boxShadow: V.shadowMd, borderRadius: 18, padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <button onClick={k.prevS} title="Câu trước" style={{ width: 46, height: 46, borderRadius: 13, background: '#fff', border: `1px solid ${V.border}`, boxShadow: V.shadow, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill={V.ink}><path d="M6 5h2v14H6zM20 5L9 12l11 7z"/></svg>
                </button>
                <button onClick={k.togglePlay} className="bun-cta-btn" style={{
                  flex: 1, height: 56, borderRadius: 16, background: BUN_BLUE, color: '#fff', border: 'none',
                  boxShadow: `0 5px 0 rgba(20,40,80,.2), 0 10px 22px ${BUN_BLUE}55`, cursor: 'pointer',
                  fontFamily: V.headFont, fontWeight: 1000, fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
                }}>
                  <RA_PlayIcon playing={playing} size={19} /> {playing ? 'Tạm dừng' : (curSent >= 0 ? 'Đọc tiếp' : 'Đọc to')}
                </button>
                <button onClick={k.nextS} title="Câu sau" style={{ width: 46, height: 46, borderRadius: 13, background: '#fff', border: `1px solid ${V.border}`, boxShadow: V.shadow, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill={V.ink}><path d="M16 5h2v14h-2zM4 5l11 7L4 19z"/></svg>
                </button>
              </div>
              <button onClick={k.restart} style={{ width: '100%', padding: '10px', borderRadius: 12, background: V.panel, border: `1px solid ${V.border}`, cursor: 'pointer', fontFamily: V.headFont, fontWeight: 900, fontSize: 12, color: V.inkSoft, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
                <Icon name="refresh" size={14} stroke={V.inkSoft} strokeWidth={2.4} /> Đọc lại từ đầu
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
                <div style={{ flex: 1, height: 7, background: V.panel, borderRadius: 999, overflow: 'hidden' }}>
                  <div style={{ width: `${curSent < 0 ? 0 : ((curSent + 1) / sentences.length) * 100}%`, height: '100%', background: BUN_BLUE, borderRadius: 999, transition: 'width .3s ease' }} />
                </div>
                <span style={{ fontFamily: V.monoFont, fontSize: 11, fontWeight: 700, color: V.muted, flexShrink: 0 }}>Câu {curSent < 0 ? 0 : curSent + 1}/{sentences.length}</span>
              </div>
            </div>

            {/* Saved words tray */}
            <div style={{ background: '#fff', border: `1px solid ${V.border}`, boxShadow: V.shadowMd, borderRadius: 18, padding: '14px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: k.saved.length ? 10 : 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 30, height: 30, borderRadius: 9, background: V_C.pink, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 2px 4px ${V_C.pink}55` }}>
                    <Icon name="folder" size={14} stroke="#fff" strokeWidth={2.4} />
                  </div>
                  <div>
                    <div style={{ fontFamily: V.headFont, fontSize: 13, fontWeight: 900, color: V.ink }}>Đã nhặt {k.saved.length} từ</div>
                    <div style={{ fontFamily: V.bodyFont, fontSize: 10.5, fontWeight: 700, color: V.muted }}>vào bộ "{k.deck}"</div>
                  </div>
                </div>
                {k.saved.length > 0 && (
                  <button className="bun-cta-btn" style={{ padding: '7px 12px', background: V_C.pink, color: '#fff', border: 'none', borderRadius: 10, boxShadow: `0 3px 0 rgba(80,20,50,.18), 0 4px 8px ${V_C.pink}55`, fontFamily: V.headFont, fontWeight: 1000, fontSize: 11, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                    Ôn ngay →
                  </button>
                )}
              </div>
              {k.saved.length === 0 ? (
                <div style={{ fontFamily: V.bodyFont, fontSize: 11.5, fontWeight: 700, color: V.muted, lineHeight: 1.5, paddingTop: 8 }}>
                  Chưa có từ nào. Click một từ trong bài rồi bấm <b style={{ color: V.ink }}>＋ Lưu vào bộ từ</b>.
                </div>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {k.saved.map(w => (
                    <span key={w.clean} title={w.vi} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 10px', background: V.panel, border: `1px solid ${V.border}`, borderRadius: 999, fontFamily: V.bodyFont, fontSize: 12, fontWeight: 800, color: V.ink }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: V_C.pink }} />{w.raw}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </aside>
        </div>
      </main>
    </V_Frame>
  );
};

Object.assign(window, { ReadAlong, ReadAlongDesktop, RA_TEXT, RA_tokenize, RA_SPEEDS, useKaraoke });
