// Shared utilities, mascot map, icons. Exported to window.

const MASCOT = {
  idle:      'assets/mascot/ngoc-idle.png',
  happy:     'assets/mascot/ngoc-happy.png',
  blink:     'assets/mascot/ngoc-blink.png',
  runA:      'assets/mascot/ngoc-run-a.png',
  runB:      'assets/mascot/ngoc-run-b.png',
  sleep:     'assets/mascot/ngoc-sleep.png',
  wake:      'assets/mascot/ngoc-wake.png',
  // New hand-drawn 3D poses for the landing page
  learn:     'assets/mascot/bun-learn.png',      // book + lightbulb (studying)
  flex:      'assets/mascot/bun-flex.png',       // dumbbells (training)
  celebrate: 'assets/mascot/bun-celebrate.png',  // dancing (achievement)
  dream:     'assets/mascot/bun-dream.png',      // cloud + galaxy (dreamy)
  magic:     'assets/mascot/bun-magic.png',      // glowing orb (AI magic)
};

// Compact inline SVG icons used everywhere
const Icon = ({ name, size = 18, stroke = 'currentColor', strokeWidth = 2, fill = 'none', style }) => {
  const paths = {
    home: <><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></>,
    plus: <><path d="M12 5v14M5 12h14"/></>,
    book: <><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5v14z"/><path d="M4 19.5V22h16"/></>,
    refresh: <><path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 4v5h-5"/></>,
    library: <><path d="M4 3v18M10 3v18M16 3v18"/><path d="M20 5l2 14"/></>,
    folder: <><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"/></>,
    chart: <><path d="M3 21V8M9 21V3M15 21v-9M21 21v-5"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></>,
    flame: <><path d="M12 22c4.5 0 7-3 7-6.5 0-3-2-5-4-7-1.5-1.5-2.5-3-2.5-5 0 0-3 1.5-4 4.5-1 3 1 4.5 1 6.5 0 2-2 3-3 3 0 3 2.5 4.5 5.5 4.5z" fill={fill}/></>,
    sparkle: <><path d="M12 3v4M12 17v4M5 12H1M23 12h-4M6 6l3 3M15 15l3 3M6 18l3-3M15 9l3-3"/></>,
    headphones: <><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1v-6h3v4zM3 19a2 2 0 0 0 2 2h1v-6H3v4z"/></>,
    arrowRight: <><path d="M5 12h14M13 5l7 7-7 7"/></>,
    play: <><polygon points="6 4 20 12 6 20 6 4" fill={fill}/></>,
    check: <><path d="M5 12l5 5L20 7"/></>,
    target: <><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5" fill={stroke}/></>,
    cards: <><rect x="3" y="6" width="14" height="14" rx="2"/><path d="M7 3h14v14"/></>,
    search: <><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></>,
    arrowLeft: <><path d="M19 12H5M12 19l-7-7 7-7"/></>,
    speaker: <><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M19 5a9 9 0 0 1 0 14"/></>,
    pencil: <><path d="M16 3l5 5L8 21H3v-5L16 3z"/></>,
    trophy: <><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4z"/><path d="M17 5h3v3a3 3 0 0 1-3 3M7 5H4v3a3 3 0 0 0 3 3"/></>,
    bell: <><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10 21a2 2 0 0 0 4 0"/></>,
    heart: <><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" fill={fill}/></>,
    star: <><polygon points="12 2 15.1 8.6 22 9.6 17 14.6 18.2 21.5 12 18.2 5.8 21.5 7 14.6 2 9.6 8.9 8.6 12 2" fill={fill}/></>,
    gem: <><path d="M6 3h12l4 6-10 12L2 9l4-6z"/><path d="M2 9h20M12 3l4 6-4 12-4-12 4-6z"/></>,
    bolt: <><polygon points="13 2 4 14 12 14 11 22 20 10 12 10 13 2" fill={fill}/></>,
    quote: <><path d="M7 7h4v4H7a3 3 0 0 1 3-3M15 7h4v4h-4a3 3 0 0 1 3-3"/></>,
    pen: <><path d="M3 21l6-1L21 8a2 2 0 0 0-3-3L6 17l-3 4z"/></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" style={style}>
      {paths[name] || null}
    </svg>
  );
};

// Subtle paper-noise overlay used by Storybook direction
const PaperNoise = ({ opacity = 0.04, color = '#000' }) => (
  <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', opacity, mixBlendMode: 'multiply' }}>
    <filter id="noise">
      <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch"/>
      <feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.6 0"/>
    </filter>
    <rect width="100%" height="100%" filter="url(#noise)" fill={color}/>
  </svg>
);

// Mascot image — defaults to idle. Adds float animation if `float`.
const Mascot = ({ pose = 'idle', size = 80, float = false, style, className }) => (
  <img
    src={MASCOT[pose]}
    alt="ngoc"
    width={size}
    height={size}
    className={className}
    style={{
      display: 'block',
      filter: 'drop-shadow(0 4px 8px rgba(40,30,15,0.15))',
      animation: float ? 'ngoc-float 3.5s ease-in-out infinite' : undefined,
      ...style,
    }}
  />
);

// Inject keyframes once
if (typeof document !== 'undefined' && !document.getElementById('ngoc-keyframes')) {
  const s = document.createElement('style');
  s.id = 'ngoc-keyframes';
  s.textContent = `
    @keyframes ngoc-float { 0%,100% { transform: translateY(0) rotate(-2deg); } 50% { transform: translateY(-8px) rotate(2deg); } }
    @keyframes ngoc-bob { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
    @keyframes pulse-glow { 0%,100% { box-shadow: 0 0 0 0 rgba(255,140,60,.4); } 50% { box-shadow: 0 0 0 10px rgba(255,140,60,0); } }
    @keyframes shimmer { 0% { background-position: -200px 0; } 100% { background-position: 200px 0; } }
    @keyframes spin-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    @keyframes sparkle-twinkle { 0%,100% { opacity: 0.3; transform: scale(0.8); } 50% { opacity: 1; transform: scale(1.2); } }
  `;
  document.head.appendChild(s);
}

// Mini bar chart for activity (30 days) — pure SVG, no recharts
const MiniActivityChart = ({ data, width = 360, height = 140, palette = ['#3b82f6', '#22c55e'], grid = '#0001', label = '#0008', barRadius = 2 }) => {
  const max = Math.max(...data.flatMap(d => [d.new + d.review, 1]));
  const padding = { top: 12, right: 8, bottom: 22, left: 28 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;
  const barW = innerW / data.length * 0.7;
  const step = innerW / data.length;
  const yTicks = [0, Math.ceil(max / 2), max];
  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" style={{ display: 'block' }}>
      {yTicks.map((t, i) => {
        const y = padding.top + innerH - (t / max) * innerH;
        return (
          <g key={i}>
            <line x1={padding.left} x2={width - padding.right} y1={y} y2={y} stroke={grid} />
            <text x={padding.left - 6} y={y + 3} fontSize="10" textAnchor="end" fill={label}>{t}</text>
          </g>
        );
      })}
      {data.map((d, i) => {
        const x = padding.left + i * step + (step - barW) / 2;
        const total = d.new + d.review;
        const hTotal = (total / max) * innerH;
        const hNew = (d.new / max) * innerH;
        const yReview = padding.top + innerH - hTotal;
        const yNew = padding.top + innerH - hNew;
        return (
          <g key={i}>
            {d.review > 0 && <rect x={x} y={yReview} width={barW} height={(d.review / max) * innerH} rx={barRadius} fill={palette[1]} opacity={0.85} />}
            {d.new > 0 && <rect x={x} y={yNew} width={barW} height={hNew} rx={barRadius} fill={palette[0]} />}
          </g>
        );
      })}
      {data.map((d, i) => {
        if (i % 5 !== 0) return null;
        return <text key={i} x={padding.left + i * step + step / 2} y={height - 6} fontSize="10" textAnchor="middle" fill={label}>{d.day}</text>;
      })}
    </svg>
  );
};

// Sample data
const sampleActivity = Array.from({ length: 30 }, (_, i) => {
  const seed = (i * 37 + 13) % 100;
  const intensity = i < 22 ? 0 : Math.max(0, (i - 21) * 1.2);
  return {
    day: `${String(((i * 13) % 28) + 1).padStart(2, '0')}`,
    new: i >= 22 ? Math.round((seed % 5) + intensity * 0.6) : 0,
    review: i >= 22 ? Math.round((seed % 12) + intensity * 1.4) : 0,
  };
});

const sampleDecks = [
  { name: 'PTE Academic', total: 124, mastered: 38, color: '#a8cf45' },
  { name: 'Business English', total: 86, mastered: 22, color: '#5e93b0' },
  { name: 'Daily Conversation', total: 56, mastered: 41, color: '#e87c52' },
  { name: 'Phrasal Verbs', total: 72, mastered: 12, color: '#c179d6' },
];

const sampleWord = {
  en: 'preferential',
  vi: 'Ưu đãi, dành sự ưu tiên',
  pos: 'adjective',
  ipa: '/ˌprefəˈrenʃəl/',
  example: 'Club members received **preferential** seating.',
  exampleVi: 'Các thành viên câu lạc bộ nhận được chỗ ngồi ưu đãi.',
  collocations: ['preferential treatment', 'preferential rate', 'preferential access'],
};

Object.assign(window, { MASCOT, Icon, Mascot, PaperNoise, MiniActivityChart, sampleActivity, sampleDecks, sampleWord });
