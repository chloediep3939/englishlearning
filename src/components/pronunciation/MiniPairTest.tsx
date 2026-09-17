'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Volume2, Check, X, ArrowRight } from 'lucide-react';
import { getMinimalPairSetsForSlug } from '@/lib/pronunciation/minimal-pairs';
import { speak, getStoredVoicePreference } from '@/lib/tts';
import type { MinimalPair } from '@/lib/pronunciation/minimal-pairs';

type Side = 'a' | 'b';

/**
 * Compact minimal-pair listening test scoped to ONE sound: plays a random word
 * from a pair that involves this sound, learner picks which they heard. Endless
 * quick practice with a running score. Returns null if the sound has no pairs.
 */
export default function MiniPairTest({ slug }: { slug: string }) {
  const pool = useMemo<MinimalPair[]>(
    () => getMinimalPairSetsForSlug(slug).flatMap((s) => s.pairs),
    [slug],
  );

  const [pair, setPair] = useState<MinimalPair | null>(null);
  const [target, setTarget] = useState<Side>('a');
  const [picked, setPicked] = useState<Side | null>(null);
  const [correct, setCorrect] = useState(0);
  const [total, setTotal] = useState(0);

  const play = useCallback(
    (w: string) => speak(w, { lang: 'en-US', rate: 0.9, voice_preference: getStoredVoicePreference() }),
    [],
  );

  const nextQ = useCallback(() => {
    if (pool.length === 0) return;
    const p = pool[Math.floor(Math.random() * pool.length)];
    const t: Side = Math.random() < 0.5 ? 'a' : 'b';
    setPair(p);
    setTarget(t);
    setPicked(null);
    setTimeout(() => play(t === 'a' ? p.a : p.b), 200);
  }, [pool, play]);

  useEffect(() => {
    nextQ();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (pool.length === 0 || !pair) return null;

  const choose = (side: Side) => {
    if (picked) return;
    setPicked(side);
    setTotal((t) => t + 1);
    if (side === target) setCorrect((c) => c + 1);
  };

  const replay = () => play(target === 'a' ? pair.a : pair.b);

  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <button
          type="button"
          onClick={replay}
          aria-label="Nghe lại"
          style={{
            width: 84,
            height: 84,
            borderRadius: '50%',
            background: 'var(--v-purple)',
            color: '#fff',
            border: 'none',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'var(--v-press), 0 8px 20px rgba(155,120,220,0.35)',
          }}
        >
          <Volume2 size={34} />
        </button>
        <div style={{ color: 'var(--v-ink-soft)', fontSize: 'var(--v-text-md)', fontWeight: 700, marginTop: 10 }}>
          Bạn nghe được từ nào?
        </div>
        <div style={{ fontFamily: 'var(--v-font-head)', fontWeight: 800, fontSize: 'var(--v-text-sm)', color: 'var(--v-muted)', marginTop: 2 }}>
          đúng {correct}/{total}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {(['a', 'b'] as Side[]).map((side) => {
          const word = side === 'a' ? pair.a : pair.b;
          const ipa = side === 'a' ? pair.aIpa : pair.bIpa;
          const isTarget = target === side;
          const isChosen = picked === side;
          let bg = 'var(--v-surface)';
          let border = 'var(--v-border)';
          let icon: React.ReactNode = null;
          if (picked) {
            if (isTarget) {
              bg = 'rgba(122,193,67,0.12)';
              border = 'var(--v-primary)';
              icon = <Check size={16} strokeWidth={3} style={{ color: 'var(--v-primary)' }} />;
            } else if (isChosen) {
              bg = 'rgba(255,87,87,0.10)';
              border = 'var(--v-red)';
              icon = <X size={16} strokeWidth={3} style={{ color: 'var(--v-red)' }} />;
            }
          }
          return (
            <button
              key={side}
              type="button"
              onClick={() => choose(side)}
              disabled={!!picked}
              style={{
                position: 'relative',
                padding: '14px 10px',
                background: bg,
                border: `2px solid ${border}`,
                borderRadius: 'var(--v-radius-md)',
                cursor: picked ? 'default' : 'pointer',
                textAlign: 'center',
              }}
            >
              {icon && <span style={{ position: 'absolute', top: 6, right: 6 }}>{icon}</span>}
              <div style={{ fontFamily: 'var(--v-font-head)', fontWeight: 900, fontSize: 'var(--v-text-lg)', color: 'var(--v-ink)' }}>
                {word}
              </div>
              {picked && (
                <div style={{ fontFamily: 'var(--v-font-mono)', fontSize: 'var(--v-text-xs)', color: 'var(--v-accent)' }}>
                  {ipa}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {picked && (
        <div style={{ textAlign: 'center', marginTop: 12 }}>
          <button
            type="button"
            onClick={nextQ}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '9px 16px',
              background: 'var(--v-primary)',
              color: '#fff',
              border: 'none',
              borderRadius: 'var(--v-radius-md)',
              fontFamily: 'var(--v-font-head)',
              fontWeight: 800,
              fontSize: 'var(--v-text-sm)',
              cursor: 'pointer',
              boxShadow: 'var(--v-shadow-sm)',
            }}
          >
            Tiếp <ArrowRight size={15} />
          </button>
        </div>
      )}
    </div>
  );
}
