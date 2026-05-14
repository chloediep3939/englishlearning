'use client';

import { useEffect, useRef, useState } from 'react';

// IntersectionObserver-driven fade-up trigger. Returns [ref, visible].
// rootMargin '0px 0px -8% 0px' fires the reveal slightly before the element is
// fully in view, matching the design's snappier feel.
export function useReveal(threshold = 0.12, once = true) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          if (once) obs.disconnect();
        } else if (!once) {
          setVisible(false);
        }
      },
      { threshold, rootMargin: '0px 0px -8% 0px' },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold, once]);

  return [ref, visible] as const;
}
