'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Search, ExternalLink, Headphones } from 'lucide-react';
import type { ExampleWord } from '@/lib/pronunciation/catalog-meta';

/**
 * Embeds the official YouGlish widget (JS API). Docs: /api/doc/js-api.
 *
 * Behaviour: the widget does NOT load or play on mount — it only loads the
 * script, builds the player and fetches AFTER the user clicks "Tìm" (or a chip).
 * `components: 93` = search(1) + title(4) + caption(8) + speed(16) + control
 * buttons(64) so the full control bar (play / prev / next / speed) shows. Per
 * YouGlish ToS the "Powered by YouGlish" branding must stay visible.
 */
const SCRIPT_ID = 'yg-widget-script';
const SCRIPT_SRC = 'https://youglish.com/public/emb/widget.js';

type Status = 'idle' | 'loading' | 'ready' | 'error';

export default function YouglishWidget({
  initialQuery,
  examples,
}: {
  initialQuery: string;
  examples: ExampleWord[];
}) {
  const rawId = useId();
  const widgetId = `yg-${rawId.replace(/[^a-zA-Z0-9]/g, '')}`;

  const [query, setQuery] = useState('');
  const [input, setInput] = useState(initialQuery);
  const [status, setStatus] = useState<Status>('idle'); // idle until first search

  const widgetRef = useRef<YouglishWidgetInstance | null>(null);
  const queryRef = useRef('');

  const chips = examples.slice(0, 6);

  // Lazy-build the widget on first search, then run `cb` (the fetch).
  const ensureWidget = useCallback(
    (cb: () => void) => {
      const build = () => {
        if (!window.YG || !document.getElementById(widgetId)) return;
        if (!widgetRef.current) {
          try {
            widgetRef.current = new window.YG.Widget(widgetId, {
              width: 640,
              components: 93,
              events: {
                onFetchDone: () => setStatus('ready'),
                onError: () => setStatus('error'),
              },
            });
          } catch {
            setStatus('error');
            return;
          }
        }
        cb();
      };

      if (window.YG) {
        build();
        return;
      }
      const prev = window.onYouglishAPIReady;
      window.onYouglishAPIReady = () => {
        prev?.();
        build();
      };
      if (!document.getElementById(SCRIPT_ID)) {
        const s = document.createElement('script');
        s.id = SCRIPT_ID;
        s.src = SCRIPT_SRC;
        s.async = true;
        s.onerror = () => setStatus('error');
        document.body.appendChild(s);
      }
    },
    [widgetId],
  );

  // Safety net once a search is in flight: fall back to a link if it stalls.
  useEffect(() => {
    if (status !== 'loading') return;
    const t = setTimeout(() => {
      setStatus((s) => (s === 'loading' && !widgetRef.current ? 'error' : s));
    }, 9000);
    return () => clearTimeout(t);
  }, [status]);

  const doFetch = useCallback(
    (q: string) => {
      const text = q.trim();
      if (!text) return;
      setQuery(text);
      setInput(text);
      queryRef.current = text;
      setStatus('loading');
      ensureWidget(() => {
        try {
          widgetRef.current?.fetch(text, 'english');
        } catch {
          setStatus('error');
        }
      });
    },
    [ensureWidget],
  );

  const started = status !== 'idle';

  return (
    <div>
      <form
        onSubmit={(e) => { e.preventDefault(); doFetch(input); }}
        style={{ display: 'flex', gap: 8, marginBottom: 10 }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Nhập từ hoặc câu để nghe…"
          style={{
            flex: 1,
            padding: '9px 12px',
            border: '1px solid var(--v-border)',
            borderRadius: 'var(--v-radius-md)',
            fontFamily: 'var(--v-font-body)',
            fontSize: 'var(--v-text-md)',
            background: 'var(--v-surface)',
            color: 'var(--v-ink)',
          }}
        />
        <button
          type="submit"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '9px 14px',
            background: 'var(--v-pink)',
            color: '#fff',
            border: 'none',
            borderRadius: 'var(--v-radius-md)',
            fontFamily: 'var(--v-font-head)',
            fontWeight: 800,
            fontSize: 'var(--v-text-sm)',
            cursor: 'pointer',
          }}
        >
          <Search size={15} /> Tìm
        </button>
      </form>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
        {chips.map((ex) => (
          <button
            key={ex.word}
            type="button"
            onClick={() => doFetch(ex.word)}
            style={{
              padding: '5px 10px',
              background: query === ex.word ? 'var(--v-pink)' : 'var(--v-surface)',
              color: query === ex.word ? '#fff' : 'var(--v-ink-soft)',
              border: '1px solid var(--v-border)',
              borderRadius: 'var(--v-radius-pill)',
              fontFamily: 'var(--v-font-head)',
              fontWeight: 700,
              fontSize: 'var(--v-text-xs)',
              cursor: 'pointer',
            }}
          >
            {ex.word}
          </button>
        ))}
      </div>

      {/* Placeholder before the first search — nothing loads/plays until then. */}
      {!started && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            minHeight: 160,
            background: 'var(--v-panel)',
            border: '1px dashed var(--v-border)',
            borderRadius: 'var(--v-radius-md)',
            color: 'var(--v-muted)',
            textAlign: 'center',
            padding: 16,
            fontSize: 'var(--v-text-sm)',
          }}
        >
          <Headphones size={22} />
          Nhập từ/câu rồi bấm <b style={{ color: 'var(--v-pink)' }}>Tìm</b> để nghe người bản xứ đọc.
        </div>
      )}

      {/* YouGlish injects its player iframe here (by id string). Kept mounted so
          the container exists when we build the widget on first search. */}
      <div
        id={widgetId}
        style={{
          minHeight: started ? 200 : 0,
          borderRadius: 'var(--v-radius-md)',
          overflow: 'hidden',
        }}
      />

      {status === 'loading' && (
        <p style={{ margin: '8px 0 0', color: 'var(--v-muted)', fontSize: 'var(--v-text-sm)' }}>
          Đang tải YouGlish… (cần kết nối mạng)
        </p>
      )}

      {status === 'error' && (
        <a
          href={`https://youglish.com/pronounce/${encodeURIComponent(query)}/english`}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            margin: '8px 0 0',
            color: 'var(--v-pink)',
            fontSize: 'var(--v-text-sm)',
            fontFamily: 'var(--v-font-head)',
            fontWeight: 800,
            textDecoration: 'none',
          }}
        >
          <ExternalLink size={14} /> Không nhúng được — mở “{query}” trên YouGlish
        </a>
      )}

      <p style={{ margin: '8px 0 0', fontSize: 'var(--v-text-xs)', color: 'var(--v-muted)' }}>
        Powered by{' '}
        <a href="https://youglish.com" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--v-pink)' }}>
          YouGlish
        </a>
      </p>
    </div>
  );
}
