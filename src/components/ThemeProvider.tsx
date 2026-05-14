'use client';

import { useEffect } from 'react';
import type { ThemeMode } from '@/lib/types';

const THEME_KEY = 'theme';

/**
 * Apply the user's preferred theme to <html data-theme="..."> so CSS rules
 * scoped under `[data-theme='dark']` in globals.css activate.
 *
 * The provider listens to system preference changes only when theme is
 * 'system'; otherwise the chosen mode wins.
 *
 * Source of truth: the DB (`theme` setting). The Settings page mirrors any
 * change into localStorage so this provider can pick it up immediately on
 * subsequent renders, but the canonical value comes from the server.
 */
export function ThemeProvider({
  children,
  theme,
}: {
  children: React.ReactNode;
  theme: ThemeMode;
}) {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(THEME_KEY, theme);
    } catch {
      /* ignore */
    }

    const root = document.documentElement;
    const apply = () => {
      const effective =
        theme === 'system'
          ? window.matchMedia('(prefers-color-scheme: dark)').matches
            ? 'dark'
            : 'light'
          : theme;
      root.setAttribute('data-theme', effective);
    };
    apply();
    if (theme === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      mq.addEventListener('change', apply);
      return () => mq.removeEventListener('change', apply);
    }
  }, [theme]);

  return <>{children}</>;
}

/**
 * Inline script that runs before React hydrates so we avoid a light-mode
 * flash when the user has chosen dark. Reads from localStorage only — the
 * first PUT after sign-in syncs DB → localStorage via ThemeProvider.
 */
export const THEME_PREHYDRATION_SCRIPT = `
(function(){
  try {
    var t = localStorage.getItem('theme') || 'system';
    var effective = t;
    if (t === 'system') {
      effective = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    document.documentElement.setAttribute('data-theme', effective);
  } catch(e){}
})();
`;
