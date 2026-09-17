'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Search, ExternalLink } from 'lucide-react';
import type { ExampleWord } from '@/lib/pronunciation/catalog-meta';

/**
 * Embeds the official YouGlish widget (JS API) so the learner can hear native
 * speakers say a word / phrase in real videos, inside our app.
 *
 * Integration per https://youglish.com/api/doc/js-api :
 *   1. Inject <script async src="https://youglish.com/public/emb/widget.js">.
 *   2. Define the GLOBAL window.onYouglishAPIReady — the script calls it once
 *      window.YG is available.
 *   3. `new YG.Widget(<container id STRING>, { width, components, events })`,
 *      then `widget.fetch(query, 'english')`.
 *
 * The constructor takes the container's id STRING (not the DOM element). Per
 * YouGlish ToS the widget's "Powered by YouGlish" branding must stay visible.
 */
const SCRIPT_ID = 'yg-widget-script';
const SCRIPT_SRC = 'https://youglish.com/public/emb/widget.js';

type Status = 'loading' | 'ready' | 'error';

export default function YouglishWidget({
  initialQuery,
  examples,
}: {
  initialQuery: string;
  examples: ExampleWord[];
}) {
  const rawId = useId();
  const widgetId = `yg-${rawId.replace(/[^a-zA-Z0-9]/g, '')}`;

  const [query, setQuery] = useState(initialQuery);
  const [input, setInput] = useState(initialQuery);
  const [status, setStatus] = useState<Status>('loading');

  const widgetRef = useRef<YouglishWidgetInstance | null>(null);
  const queryRef = useRef(initialQuery);
  useEffect(() => { queryRef.current = query; }, [query]);

  const chips = examples.slice(0, 6);

  useEffect(() => {
    let cancelled = false;

    const construct = () => {
      if (cancelled || widgetRef.current || !window.YG) return;
      try {
        widgetRef.current = new window.YG.Widget(widgetId, {
          width: 640,
          components: 9, // search box + caption; keeps the default branding
          events: {
            onFetchDone: () => { if (!cancelled) setStatus('ready'); },
            onError: () => { if (!cancelled) setStatus('error'); },
          },
        });
        widgetRef.current.fetch(queryRef.current || 'hello', 'english');
        // The player renders synchronously; don't wait only on onFetchDone.
        if (!cancelled) setStatus((s) => (s === 'loading' ? 'ready' : s));
      } catch {
        if (!cancelled) setStatus('error');
      }
    };

    // Chain the global callback so we don't clobber another widget's handler.
    const prev = window.onYouglishAPIReady;
    window.onYouglishAPIReady = () => {
      prev?.();
      construct();
    };

    if (window.YG) {
      construct();
    } else if (!document.getElementById(SCRIPT_ID)) {
      const s = document.createElement('script');
      s.id = SCRIPT_ID;
      s.src = SCRIPT_SRC;
      s.async = true;
      s.onerror = () => { if (!cancelled) setStatus('error'); };
      document.body.appendChild(s);
    }

    // Safety net: if nothing loaded after 8s, show the fallback link.
    const t = setTimeout(() => {
      if (!cancelled && !widgetRef.current) setStatus('error');
    }, 8000);

    return () => {
      cancelled = true;
      window.onYouglishAPIReady = prev;
      clearTimeout(t);
    };
  }, [widgetId]);

  const doFetch = useCallback((q: string) => {
    const text = q.trim();
    if (!text) return;
    setQuery(text);
    setInput(text);
    queryRef.current = text;
    if (widgetRef.current) {
      try { widgetRef.current.fetch(text, 'english'); } catch {/* noop */}
    }
  }, []);

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

      {/* YouGlish injects its player iframe into this container (by id string). */}
      <div id={widgetId} style={{ minHeight: 200, borderRadius: 'var(--v-radius-md)', overflow: 'hidden' }} />

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
