'use client';

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, BookOpen, Languages, Scissors } from 'lucide-react';
import LoadingState from '@/components/common/LoadingState';
import Mascot from '@/components/common/Mascot';
import ReadingPassage from '@/components/reading/ReadingPassage';
import WordDetailCard from '@/components/reading/WordDetailCard';
import SpeedSelector from '@/components/reading/SpeedSelector';
import ReadingToggle from '@/components/reading/ReadingToggle';
import TransportControls from '@/components/reading/TransportControls';
import SavedWordsTray from '@/components/reading/SavedWordsTray';
import { useKaraoke, type KaraokeEngine } from '@/lib/reading/use-karaoke';
import { useChunkPractice } from '@/lib/reading/use-chunk-practice';
import ChunkPracticeControls from '@/components/reading/ChunkPracticeControls';
import { useReducedMotion } from '@/lib/reading/use-reduced-motion';
import { splitPassage, contentWords } from '@/lib/reading/tokenizer';
import {
  STOP_WORDS,
  READING_SHOW_VN_KEY,
  READING_DEFAULT_DECK_NAME,
  BUN_BLUE,
  estimateSeconds,
} from '@/lib/reading/constants';
import type { FlatSentence } from '@/lib/reading/tokenizer';
import type { GlossaryEntry, TranslatedSentence } from '@/lib/types';

export interface ReadAlongPassage {
  id: number;
  title: string;
  content: string;
  word_count: number;
  level_estimate: string | null;
}

export interface DeckOption {
  id: number;
  name: string;
}

interface Props {
  passage: ReadAlongPassage;
  initialRate: number;
  initialAuto: boolean;
  initialDeckId: number | null;
  decks: DeckOption[];
  // "Read once without saving" mode: translate raw content (no cached passage
  // row) and hide all save-to-deck affordances. Defaults to the normal
  // saved-passage flow.
  ephemeral?: boolean;
  // Where the back arrows point. Defaults to the passage library.
  backHref?: string;
  // When set, the back arrows call this instead of navigating (no page
  // reload) — used by read-once to return to the paste screen.
  onBack?: () => void;
  // Global word indices (chunk starts) parsed from "/" in the pasted text.
  seedBreaks?: number[];
  // Gap between chunks in chunk-practice auto-read (`chunk_pause_ms` setting).
  chunkPauseMs?: number;
}

// ── Loader: split passage, fetch translations + glossary, then mount engine ──
export default function ReadAlong({ passage, initialRate, initialAuto, initialDeckId, decks, ephemeral = false, backHref = '/passage', onBack, seedBreaks, chunkPauseMs }: Props) {
  const { flat } = useMemo(() => splitPassage(passage.content), [passage.content]);

  const [loaded, setLoaded] = useState(false);
  const [translations, setTranslations] = useState<Record<number, string | null>>({});
  const [glossary, setGlossary] = useState<Record<string, GlossaryEntry>>({});
  const [transAvailable, setTransAvailable] = useState(false);

  useEffect(() => {
    if (flat.length === 0) {
      setLoaded(true);
      return;
    }
    let cancelled = false;

    // Ephemeral (read-once) has no passage row → use the id-less translate
    // endpoint that takes raw content; otherwise the cache-through route.
    const transP = (ephemeral
      ? fetch('/api/reading/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: passage.content }),
        })
      : fetch(`/api/passages/${passage.id}/translations`))
      .then(async (r) => {
        if (!r.ok) throw r.status;
        return (await r.json()) as { sentences: TranslatedSentence[]; translationAvailable?: boolean };
      })
      .then((data) => {
        if (cancelled) return;
        const map: Record<number, string | null> = {};
        for (const s of data.sentences) map[s.index] = s.vn;
        setTranslations(map);
        setTransAvailable(data.translationAvailable !== false);
      })
      .catch(() => {
        if (!cancelled) setTransAvailable(false);
      });

    const words = contentWords(flat, STOP_WORDS);
    const glossP = fetch('/api/words/glossary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ words }),
    })
      .then(async (r) => {
        if (!r.ok) throw r.status;
        return (await r.json()) as { entries: Record<string, GlossaryEntry> };
      })
      .then((data) => {
        if (!cancelled) setGlossary(data.entries ?? {});
      })
      .catch(() => {
        /* glossary stays empty — words still tappable via on-demand lookup */
      });

    Promise.all([transP, glossP]).finally(() => {
      if (!cancelled) setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [flat, passage.id, passage.content, ephemeral]);

  if (!loaded) return <LoadingState message="Bún đang chuẩn bị bài đọc…" />;

  if (flat.length === 0) {
    return (
      <div>
        <BackLink href={backHref} onBack={onBack} />
        <div
          style={{
            padding: 40,
            textAlign: 'center',
            background: 'var(--v-panel)',
            border: '1px dashed var(--v-border)',
            borderRadius: 'var(--v-radius-md)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 14,
          }}
        >
          <Mascot pose="sleep" size={88} />
          <div style={{ fontFamily: 'var(--v-font-head)', fontWeight: 800, color: 'var(--v-ink)' }}>
            Bài đọc chưa có nội dung
          </div>
        </div>
      </div>
    );
  }

  return (
    <ReadAlongInner
      passage={passage}
      flat={flat}
      translations={translations}
      glossary={glossary}
      transAvailable={transAvailable}
      initialRate={initialRate}
      initialAuto={initialAuto}
      initialDeckId={initialDeckId}
      decks={decks}
      ephemeral={ephemeral}
      backHref={backHref}
      onBack={onBack}
      seedBreaks={seedBreaks}
      chunkPauseMs={chunkPauseMs}
    />
  );
}

function BackLink({ href, onBack }: { href: string; onBack?: () => void }) {
  const label = onBack ? 'Đọc bài khác' : 'Thư viện';
  const style: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    fontSize: 'var(--v-text-sm)',
    color: 'var(--v-muted)',
    textDecoration: 'none',
    marginBottom: 12,
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
    fontFamily: 'inherit',
  };
  if (onBack) {
    return (
      <button type="button" onClick={onBack} style={style}>
        <ArrowLeft size={14} /> {label}
      </button>
    );
  }
  return (
    <Link href={href} style={style}>
      <ArrowLeft size={14} /> {label}
    </Link>
  );
}

/**
 * Floating popover anchored to the tapped word: finds the selected token's
 * span (via its data-tok attribute) inside the passage wrapper, positions
 * the card centered above it (flips below when too close to the top),
 * clamps horizontally, and closes on outside click / Escape. The passage
 * wrapper must be position:relative.
 */
function WordPopover({
  k,
  wrapRef,
  children,
}: {
  k: KaraokeEngine;
  wrapRef: React.RefObject<HTMLDivElement | null>;
  children: React.ReactNode;
}) {
  const [anchor, setAnchor] = useState<{
    cx: number;
    top: number;
    bottom: number;
    wrapW: number;
  } | null>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const sentIdx = k.sel?.sentIdx;
  const tokIdx = k.sel?.tokIdx;

  useLayoutEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap || sentIdx === undefined || tokIdx === undefined) {
      setAnchor(null);
      return;
    }
    const el = wrap.querySelector(`[data-tok="${sentIdx}:${tokIdx}"]`) as HTMLElement | null;
    if (!el) {
      setAnchor(null);
      return;
    }
    const wr = wrap.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    setAnchor({
      cx: r.left - wr.left + r.width / 2,
      top: r.top - wr.top,
      bottom: r.bottom - wr.top,
      wrapW: wr.width,
    });
  }, [sentIdx, tokIdx, wrapRef]);

  // Outside click / Escape → deselect (a tap on another word just re-anchors).
  useEffect(() => {
    if (sentIdx === undefined) return;
    function onDown(e: MouseEvent) {
      const t = e.target as HTMLElement;
      if (popRef.current?.contains(t)) return;
      if (t.closest('[data-tok]')) return;
      k.setSel(null);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') k.setSel(null);
    }
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sentIdx, tokIdx]);

  if (!k.sel || !anchor) return null;

  const width = Math.min(320, Math.max(240, anchor.wrapW - 16));
  const half = width / 2;
  const left = Math.min(Math.max(anchor.cx, half + 4), Math.max(half + 4, anchor.wrapW - half - 4));
  const flipBelow = anchor.top < 280; // not enough room above → open under the word

  return (
    <div
      ref={popRef}
      style={{
        position: 'absolute',
        left,
        top: flipBelow ? anchor.bottom + 12 : anchor.top - 12,
        transform: flipBelow ? 'translateX(-50%)' : 'translate(-50%, -100%)',
        width,
        zIndex: 60,
      }}
    >
      {/* Diamond arrow pointing at the word (behind the card). */}
      <div
        style={{
          position: 'absolute',
          left: Math.max(14, Math.min(width - 14, anchor.cx - (left - half))),
          [flipBelow ? 'top' : 'bottom']: -5,
          width: 12,
          height: 12,
          background: 'var(--v-surface)',
          border: `1.5px solid ${BUN_BLUE}55`,
          transform: 'translateX(-50%) rotate(45deg)',
          zIndex: 0,
        } as React.CSSProperties}
      />
      <div style={{ position: 'relative', zIndex: 1 }}>{children}</div>
    </div>
  );
}

// ── Engine + UI ──
function ReadAlongInner({
  passage,
  flat,
  translations,
  glossary,
  transAvailable,
  initialRate,
  initialAuto,
  initialDeckId,
  decks,
  ephemeral = false,
  backHref = '/passage',
  onBack,
  seedBreaks,
  chunkPauseMs,
}: Props & {
  flat: FlatSentence[];
  translations: Record<number, string | null>;
  glossary: Record<string, GlossaryEntry>;
  transAvailable: boolean;
}) {
  const reduce = useReducedMotion();

  const persistSetting = (body: Record<string, unknown>) => {
    fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).catch(() => {});
  };

  // Which deck saved words go into. User-changeable via the picker in the tray;
  // persisted as the last-used deck (BR10 / E5.5).
  const [deckId, setDeckId] = useState<number | null>(initialDeckId);
  const deckName = decks.find((d) => d.id === deckId)?.name ?? READING_DEFAULT_DECK_NAME;
  const onDeckChange = (id: number) => {
    setDeckId(id);
    persistSetting({ reading_deck_id: id });
  };

  const k = useKaraoke({
    sentences: flat,
    translations,
    glossary,
    initialRate,
    initialAuto,
    onRateChange: (rate) => persistSetting({ reading_speed: rate }),
    onAutoChange: (auto) => persistSetting({ reading_auto_continue: auto }),
  });

  // PTE thought-group practice (chunk markers + echo mode + manual/AI chunking).
  const cp = useChunkPractice({ sentences: flat, rate: k.rate, pauseMs: chunkPauseMs, seedGlobalBreaks: seedBreaks });

  // Restore the per-device parallel-translation preference (localStorage, BR9).
  useEffect(() => {
    if (typeof window === 'undefined' || !transAvailable) return;
    if (window.localStorage.getItem(READING_SHOW_VN_KEY) === '1') k.setShowVN(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transAvailable]);

  const onToggleVN = (v: boolean) => {
    k.setShowVN(v);
    try {
      window.localStorage.setItem(READING_SHOW_VN_KEY, v ? '1' : '0');
    } catch {
      /* no-op */
    }
  };

  // Anchors for the word popover — one wrapper per breakpoint block (both are
  // in the DOM; the CSS-hidden one renders nothing visible).
  const passageWrapDesktop = useRef<HTMLDivElement>(null);
  const passageWrapMobile = useRef<HTMLDivElement>(null);

  const metaPill = `${passage.word_count} từ · ~${estimateSeconds(passage.word_count)}s`;
  const wordCard = (
    <WordDetailCard
      k={k}
      passageId={passage.id}
      deckId={deckId}
      deckName={deckName}
      reduce={reduce}
      allowSave={!ephemeral}
    />
  );
  const parallelToggle = transAvailable ? (
    <ReadingToggle
      title="Dịch song song"
      hint="Hiện nghĩa tiếng Việt dưới mỗi câu"
      checked={k.showVN}
      onChange={onToggleVN}
      accent="var(--v-teal)"
      icon={<Languages size={15} color="#fff" strokeWidth={2.4} />}
    />
  ) : null;
  const autoToggle = (
    <ReadingToggle
      title={k.auto ? 'Đọc liền cả đoạn' : 'Đọc từng câu'}
      hint={k.auto ? 'Hết câu tự sang câu kế tiếp' : 'Hết câu thì dừng, bấm ▶ đọc tiếp'}
      checked={k.auto}
      onChange={k.toggleAuto}
      accent={BUN_BLUE}
    />
  );
  const chunkToggle = (
    <ReadingToggle
      title="Ngắt cụm (PTE)"
      hint="Hiện dấu / giữa các cụm ý + luyện đọc theo từng cụm"
      checked={cp.enabled}
      onChange={cp.setEnabled}
      accent="var(--v-purple)"
      icon={<Scissors size={15} color="#fff" strokeWidth={2.4} />}
    />
  );
  const chunkControls = cp.enabled ? <ChunkPracticeControls cp={cp} /> : null;
  // No save-to-deck in read-once mode → no saved-words tray / deck picker.
  const tray = ephemeral ? null : (
    <SavedWordsTray k={k} deckId={deckId} decks={decks} onDeckChange={onDeckChange} />
  );
  const unsupportedBanner = !k.supported ? (
    <div
      style={{
        background: 'color-mix(in srgb, var(--v-orange) 12%, var(--v-surface))',
        border: '1px solid color-mix(in srgb, var(--v-orange) 55%, transparent)',
        borderRadius: 12,
        padding: '12px 16px',
        fontFamily: 'var(--v-font-body)',
        fontSize: 13,
        fontWeight: 700,
        color: 'var(--v-orange)',
      }}
    >
      ⚠️ Trình duyệt này không hỗ trợ đọc to. Thử Chrome / Safari để nghe karaoke.
    </div>
  ) : null;

  const levelBadge = passage.level_estimate ? (
    <div
      style={{
        background: 'var(--v-orange)',
        color: '#fff',
        borderRadius: 10,
        padding: '6px 12px',
        fontFamily: 'var(--v-font-head)',
        fontWeight: 900,
        fontSize: 13,
        letterSpacing: '0.04em',
      }}
    >
      CEFR {passage.level_estimate}
    </div>
  ) : null;

  return (
    <>
      {/* ── Desktop (≥768px) ── */}
      <div className="hidden md:block">
        <BackLink href={backHref} onBack={onBack} />
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 18 }}>
          <div>
            <div
              style={{
                fontFamily: 'var(--v-font-body)',
                fontSize: 11,
                fontWeight: 800,
                color: 'var(--v-muted)',
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
              }}
            >
              Đọc theo · Karaoke TTS
            </div>
            <h1
              style={{
                fontFamily: 'var(--v-font-head)',
                fontSize: 'var(--v-text-3xl)',
                fontWeight: 900,
                lineHeight: 1.05,
                margin: '4px 0 0',
                letterSpacing: 'var(--v-tracking-tight)',
                color: 'var(--v-ink)',
              }}
            >
              {passage.title}
            </h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                background: 'var(--v-surface)',
                border: '1px solid var(--v-border)',
                borderRadius: 999,
                boxShadow: 'var(--v-shadow-sm)',
                fontFamily: 'var(--v-font-body)',
                fontSize: 12,
                fontWeight: 800,
                color: 'var(--v-ink-soft)',
              }}
            >
              <BookOpen size={14} /> {metaPill}
            </div>
            {levelBadge}
          </div>
        </div>

        {unsupportedBanner}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20, alignItems: 'start', marginTop: unsupportedBanner ? 14 : 0 }}>
          <div ref={passageWrapDesktop} style={{ position: 'relative' }}>
            <ReadingPassage k={k} vnMode={k.showVN} fontSize={24} reduce={reduce} cp={cp} />
            <WordPopover k={k} wrapRef={passageWrapDesktop}>{wordCard}</WordPopover>
          </div>
          <aside style={{ display: 'flex', flexDirection: 'column', gap: 14, position: 'sticky', top: 18 }}>
            {chunkToggle}
            {chunkControls}
            {parallelToggle}
            <SpeedSelector k={k} cols={2} />
            {autoToggle}
            <TransportControls k={k} />
            {tray}
          </aside>
        </div>
      </div>

      {/* ── Mobile (<768px) ──
          NOTE: no inline `display` on the `md:hidden` element — an inline style
          would override Tailwind's `display:none` and the block would never
          hide on desktop. The flex column lives on the inner wrapper. */}
      <div className="md:hidden">
       <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {(() => {
            const backStyle: React.CSSProperties = {
              width: 34,
              height: 34,
              borderRadius: 11,
              background: 'var(--v-surface)',
              border: '1px solid var(--v-border)',
              boxShadow: 'var(--v-shadow-sm)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              color: 'var(--v-ink)',
              cursor: 'pointer',
              padding: 0,
            };
            return onBack ? (
              <button type="button" onClick={onBack} aria-label="Đọc bài khác" style={backStyle}>
                <ArrowLeft size={16} />
              </button>
            ) : (
              <Link href={backHref} aria-label="Quay lại" style={backStyle}>
                <ArrowLeft size={16} />
              </Link>
            );
          })()}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontFamily: 'var(--v-font-body)',
                fontSize: 9,
                fontWeight: 900,
                color: 'var(--v-muted)',
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
              }}
            >
              Đọc theo · Karaoke
            </div>
            <div style={{ fontFamily: 'var(--v-font-head)', fontSize: 15, fontWeight: 900, color: 'var(--v-ink)', marginTop: 1 }}>
              {passage.title}
            </div>
          </div>
          {levelBadge}
        </div>

        {unsupportedBanner}
        <div ref={passageWrapMobile} style={{ position: 'relative' }}>
          <ReadingPassage k={k} vnMode={k.showVN} fontSize={16} reduce={reduce} cp={cp} />
          <WordPopover k={k} wrapRef={passageWrapMobile}>{wordCard}</WordPopover>
        </div>
        {chunkToggle}
        {chunkControls}
        {parallelToggle}
        <SpeedSelector k={k} cols={4} />
        {autoToggle}
        <TransportControls k={k} />
        {tray}
       </div>
      </div>
    </>
  );
}
