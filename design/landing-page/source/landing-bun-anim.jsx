// landing-bun-anim.jsx — Animation utilities for the Bún landing page
// Loaded BEFORE landing-bun-parts1.jsx

// ─────────────────────────────────────────────────────────────────────────────
// Blue theme accent (override for primary in v1 showcase)
const BUN_BLUE = '#3aa9e6';      // brand blue
const BUN_BLUE_SOFT = '#e3f2fb';

// ─────────────────────────────────────────────────────────────────────────────
// LiveMascot — cycles poses so Bún feels alive (idle → blink → happy)
const LiveMascot = ({ size = 180, poses = ['happy', 'happy', 'blink', 'happy'], interval = 1400, float = true, style, className }) => {
  const [i, setI] = React.useState(0);
  React.useEffect(() => {
    const id = setInterval(() => setI(x => (x + 1) % poses.length), interval);
    return () => clearInterval(id);
  }, [poses.length, interval]);
  return (
    <img
      src={MASCOT[poses[i]]}
      width={size}
      height={size}
      alt="Bún"
      className={className}
      style={{
        display: 'block',
        filter: 'drop-shadow(0 14px 28px rgba(40,30,15,.22))',
        animation: float ? 'ngoc-bob 3s ease-in-out infinite' : undefined,
        ...style,
      }}
    />
  );
};

// RunningMascot — sprite animation alternating run-a / run-b
const RunningMascot = ({ size = 200, fps = 7, style, className }) => {
  const [frame, setFrame] = React.useState(0);
  React.useEffect(() => {
    const id = setInterval(() => setFrame(x => 1 - x), 1000 / fps);
    return () => clearInterval(id);
  }, [fps]);
  return (
    <img
      src={MASCOT[frame ? 'runA' : 'runB']}
      width={size}
      height={size}
      alt="Bún chạy"
      className={className}
      style={{
        display: 'block',
        filter: 'drop-shadow(0 14px 28px rgba(40,30,15,.28))',
        ...style,
      }}
    />
  );
};

// MarchingMascot — runs from left to right repeatedly inside a container
const MarchingMascot = ({ size = 64, duration = 6, style }) => (
  <div style={{ position: 'absolute', left: 0, right: 0, height: size, pointerEvents: 'none', ...style }}>
    <div style={{ position: 'absolute', left: 0, top: 0, animation: `bun-march ${duration}s linear infinite` }}>
      <RunningMascot size={size} fps={8} />
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Animated background blob (mesh-like)
const BlobBg = ({ blobs = [], style }) => (
  <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', ...style }}>
    {blobs.map((b, i) => (
      <div
        key={i}
        style={{
          position: 'absolute',
          left: b.x,
          top: b.y,
          width: b.r,
          height: b.r,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${b.color}, ${b.color}00 70%)`,
          opacity: b.opacity || 0.55,
          filter: 'blur(8px)',
          animation: `bun-blob ${b.dur || 14}s ease-in-out ${b.delay || 0}s infinite`,
        }}
      />
    ))}
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Reveal — IntersectionObserver-driven fade-up
const useReveal = (threshold = 0.12, once = true) => {
  const ref = React.useRef(null);
  const [visible, setVisible] = React.useState(false);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') { setVisible(true); return; }
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setVisible(true);
        if (once) obs.disconnect();
      } else if (!once) {
        setVisible(false);
      }
    }, { threshold, rootMargin: '0px 0px -8% 0px' });
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold, once]);
  return [ref, visible];
};

const Reveal = ({ children, delay = 0, distance = 28, as: As = 'div', style, ...rest }) => {
  const [ref, visible] = useReveal();
  return (
    <As
      ref={ref}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0) scale(1)' : `translateY(${distance}px) scale(0.985)`,
        transition: `opacity .7s cubic-bezier(.2,.7,.3,1) ${delay}ms, transform .8s cubic-bezier(.2,.7,.3,1) ${delay}ms`,
        ...style,
      }}
      {...rest}
    >
      {children}
    </As>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// HoverLift — wraps a card with a lift-on-hover transform
const HoverLift = ({ children, lift = 6, tilt = 0, style, ...rest }) => {
  const [hover, setHover] = React.useState(false);
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        transform: hover ? `translateY(-${lift}px) rotate(${tilt}deg)` : 'translateY(0) rotate(0deg)',
        transition: 'transform .25s cubic-bezier(.2,.7,.3,1), box-shadow .25s ease',
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// TypingText — types out characters one by one (loops once visible)
const TypingText = ({ text, speed = 60, style, prefix = '', cursor = true }) => {
  const [ref, visible] = useReveal();
  const [i, setI] = React.useState(0);
  React.useEffect(() => {
    if (!visible) return;
    if (i >= text.length) return;
    const id = setTimeout(() => setI(x => x + 1), speed);
    return () => clearTimeout(id);
  }, [visible, i, text, speed]);
  React.useEffect(() => {
    if (!visible) return;
    if (i < text.length) return;
    const id = setTimeout(() => setI(0), 2400);
    return () => clearTimeout(id);
  }, [visible, i, text.length]);
  return (
    <span ref={ref} style={style}>
      {prefix}{text.slice(0, i)}
      {cursor && <span style={{ display: 'inline-block', width: 2, height: '0.9em', background: 'currentColor', marginLeft: 2, verticalAlign: 'middle', animation: 'bun-caret 0.8s steps(2) infinite' }} />}
    </span>
  );
};

// CountUp number
const CountUp = ({ to, duration = 1200, style }) => {
  const [ref, visible] = useReveal();
  const [n, setN] = React.useState(0);
  React.useEffect(() => {
    if (!visible) return;
    const start = performance.now();
    let raf;
    const tick = (t) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setN(Math.round(to * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [visible, to, duration]);
  return <span ref={ref} style={style}>{n}</span>;
};

// ─────────────────────────────────────────────────────────────────────────────
// Inject extra keyframes
if (typeof document !== 'undefined' && !document.getElementById('bun-anim-keyframes')) {
  const s = document.createElement('style');
  s.id = 'bun-anim-keyframes';
  s.textContent = `
    @keyframes bun-march {
      0%   { transform: translateX(-120px); }
      100% { transform: translateX(calc(100vw + 120px)); }
    }
    @keyframes bun-blob {
      0%, 100% { transform: translate(0, 0) scale(1); }
      33%      { transform: translate(40px, -30px) scale(1.1); }
      66%      { transform: translate(-30px, 25px) scale(0.95); }
    }
    @keyframes bun-caret { 0%, 50% { opacity: 1; } 51%, 100% { opacity: 0; } }
    @keyframes bun-float-slow {
      0%, 100% { transform: translateY(0) rotate(-3deg); }
      50%      { transform: translateY(-10px) rotate(2deg); }
    }
    @keyframes bun-pulse-ring {
      0%   { box-shadow: 0 0 0 0 currentColor; opacity: 1; }
      100% { box-shadow: 0 0 0 18px transparent; opacity: 0; }
    }
    @keyframes bun-wiggle {
      0%, 100% { transform: rotate(0deg); }
      25%      { transform: rotate(-6deg); }
      75%      { transform: rotate(6deg); }
    }
    @keyframes bun-fade-up {
      from { opacity: 0; transform: translateY(20px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes bun-shimmer-text {
      0%   { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }
    @keyframes bun-streak-pop {
      0%   { transform: scaleY(0); opacity: 0; }
      60%  { transform: scaleY(1.15); }
      100% { transform: scaleY(1); opacity: 1; }
    }
    @keyframes bun-orbit {
      from { transform: rotate(0deg) translateX(120px) rotate(0deg); }
      to   { transform: rotate(360deg) translateX(120px) rotate(-360deg); }
    }
    @keyframes bun-tilt-loop {
      0%, 100% { transform: rotate(-2deg); }
      50%      { transform: rotate(2deg); }
    }

    /* ─── Hover states ─── */
    .bun-nav-link {
      position: relative;
      transition: color .15s ease;
    }
    .bun-nav-link::after {
      content: '';
      position: absolute;
      left: 0; right: 0; bottom: -6px;
      height: 2px; background: currentColor; border-radius: 2px;
      transform: scaleX(0); transform-origin: left;
      transition: transform .25s cubic-bezier(.2,.7,.3,1);
    }
    .bun-nav-link:hover { color: #3aa9e6; }
    .bun-nav-link:hover::after { transform: scaleX(1); }

    .bun-cta-btn {
      transition: transform .18s cubic-bezier(.2,.7,.3,1), box-shadow .2s ease, filter .2s ease;
    }
    .bun-cta-btn:hover {
      transform: translateY(-2px) scale(1.02);
      filter: brightness(1.06);
    }
    .bun-cta-btn:active { transform: translateY(1px) scale(0.99); }

    .bun-footer-link {
      transition: color .15s ease, transform .15s ease;
      display: inline-block;
    }
    .bun-footer-link:hover {
      color: #1a2410 !important;
      transform: translateX(3px);
    }

    .bun-marquee-track {
      animation: bun-march 28s linear infinite;
    }
    .bun-marquee:hover .bun-marquee-track {
      animation-play-state: paused;
    }

    .bun-logo-wrap { transition: transform .25s cubic-bezier(.34,1.56,.64,1); }
    .bun-logo-wrap:hover { transform: scale(1.05) rotate(-3deg); cursor: pointer; }

    .bun-trust-item { transition: color .15s ease; }
    .bun-trust-item:hover { color: #3aa9e6; }
  `;
  document.head.appendChild(s);
}

Object.assign(window, { BUN_BLUE, BUN_BLUE_SOFT, LiveMascot, RunningMascot, MarchingMascot, BlobBg, useReveal, Reveal, HoverLift, TypingText, CountUp });
