'use client';

import { useEffect, useState } from 'react';

/**
 * Tracks the `prefers-reduced-motion` media query. The Read-Along reader uses
 * it to drop the mascot bob, word-highlight transition, and sentence-tint
 * transition while keeping the instant color swap (design README accessibility
 * note + E2.9).
 */
export function useReducedMotion(): boolean {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduce(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduce(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return reduce;
}
