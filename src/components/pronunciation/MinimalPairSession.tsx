'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Volume2, Check, X, RotateCcw, ArrowRight, ArrowLeft } from 'lucide-react';
import Mascot from '@/components/common/Mascot';
import { speak, getStoredVoicePreference } from '@/lib/tts';
import type { MinimalPair, MinimalPairSet } from '@/lib/pronunciation/minimal-pairs';

type Side = 'a' | 'b';
interface Round {
  pair: MinimalPair;
  target: Side;
}

function buildRounds(set: MinimalPairSet): Round[] {
  return set.pairs
    .map((pair) => ({ pair, target: (Math.random() < 0.5 ? 'a' : 'b') as Side }))
    .sort(() => Math.random() - 0.5);
}

export default function MinimalPairSession({
  set,
  onExit,
}: {
  set: MinimalPairSet;
  onExit: () => void;
}) {
  const [rounds, setRounds] = useState<Round[]>(() => buildRounds(set));
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<Side | null>(null);
  const [correct, setCorrect] = useState(0);
  const [done, setDone] = useState(false);

  const round = rounds[idx];

  const playTarget = useCallback(
    (r: Round | undefined) => {
      if (!r) return;
      const word = r.target === 'a' ? r.pair.a : r.pair.b;
      speak(word, { lang: 'en-US', rate: 0.9, voice_preference: getStoredVoicePreference() });
    },
    [],
  );

  // Auto-play the target word when a new round starts.
  useEffect(() => {
    if (done || !round || selected) return;
    const t = setTimeout(() => playTarget(round), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, done]);

  const choose = useCallback(
    (side: Side) => {
      if (selected) return;
      setSelected(side);
      if (round && side === round.target) setCorrect((c) => c + 1);
    },
    [selected, round],
  );

  const next = useCallback(() => {
    if (idx + 1 >= rounds.length) {
      setDone(true);
    } else {
      setIdx((i) => i + 1);
      setSelected(null);
    }
  }, [idx, rounds.length]);

  const restart = useCallback(() => {
    setRounds(buildRounds(set));
    setIdx(0);
    setSelected(null);
    setCorrect(0);
    setDone(false);
  }, [set]);

  if (done) {
    const pct = rounds.length > 0 ? Math.round((correct / rounds.length) * 100) : 0;
    return (
      <div
        style={{
          textAlign: 'center',
          padding: '28px 24px',
          background: 'var(--v-surface)',
          border: '1px solid var(--v-border)',
          borderRadius: 'var(--v-radius-lg)',
          boxShadow: 'var(--v-shadow-md)',
        }}
      >
        <Mascot pose={pct >= 70 ? 'happy' : 'idle'} size={110} bob />
        <h2
          style={{
            fontFamily: 'var(--v-font-head)',
            fontWeight: 900,
            fontSize: 'var(--v-text-2xl)',
            color: 'var(--v-ink)',
            margin: '10px 0 4px',
          }}
        >
          {set.label}
        </h2>
        <div
          style={{
            fontFamily: 'var(--v-font-head)',
            fontWeight: 900,
            fontSize: 'var(--v-text-4xl)',
            color: pct >= 70 ? 'var(--v-primary)' : 'var(--v-orange)',
            margin: '6px 0',
          }}
        >
          {correct}/{rounds.length}
        </div>
        <p style={{ color: 'var(--v-muted)', marginBottom: 18 }}>Đúng {pct}%</p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button type="button" onClick={restart} style={btn('var(--v-purple)')}>
            <RotateCcw size={15} /> Làm lại
          </button>
          <button type="button" onClick={onExit} style={btn('var(--v-surface)', true)}>
            <ArrowLeft size={15} /> Chọn cặp khác
          </button>
        </div>
      </div>
    );
  }

  if (!round) return null;

  return (
    <div>
      {/* Progress */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <button type="button" onClick={onExit} style={{ ...btn('var(--v-surface)', true), padding: '6px 10px' }}>
          <ArrowLeft size={14} />
        </button>
        <span style={{ color: 'var(--v-muted)', fontSize: 'var(--v-text-sm)', fontFamily: 'var(--v-font-head)', fontWeight: 700 }}>
          {set.label}
        </span>
        <span style={{ marginLeft: 'auto', color: 'var(--v-muted)', fontSize: 'var(--v-text-sm)' }}>
          {idx + 1}/{rounds.length} · đúng {correct}
        </span>
      </div>

      {/* Play button */}
      <div style={{ textAlign: 'center', marginBottom: 18 }}>
        <button
          type="button"
          onClick={() => playTarget(round)}
          aria-label="Nghe lại"
          style={{
            width: 84,
            height: 84,
            borderRadius: '50%',
            background: 'var(--v-purple)',
            color: '#fff',
            border: 'none',
            boxShadow: 'var(--v-press), 0 8px 20px rgba(155,120,220,0.35)',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Volume2 size={34} />
        </button>
        <div style={{ color: 'var(--v-muted)', fontSize: 'var(--v-text-sm)', marginTop: 8 }}>
          Bấm để nghe lại — bạn nghe được từ nào?
        </div>
      </div>

      {/* Options */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {(['a', 'b'] as Side[]).map((side) => {
          const word = side === 'a' ? round.pair.a : round.pair.b;
          const ipa = side === 'a' ? round.pair.aIpa : round.pair.bIpa;
          const isTarget = round.target === side;
          const isChosen = selected === side;
          let bg = 'var(--v-surface)';
          let border = 'var(--v-border)';
          let icon = null as React.ReactNode;
          if (selected) {
            if (isTarget) {
              bg = 'rgba(122,193,67,0.12)';
              border = 'var(--v-primary)';
              icon = <Check size={18} strokeWidth={3} style={{ color: 'var(--v-primary)' }} />;
            } else if (isChosen) {
              bg = 'rgba(255,87,87,0.10)';
              border = 'var(--v-red)';
              icon = <X size={18} strokeWidth={3} style={{ color: 'var(--v-red)' }} />;
            }
          }
          return (
            <button
              key={side}
              type="button"
              onClick={() => choose(side)}
              disabled={!!selected}
              style={{
                position: 'relative',
                padding: '20px 12px',
                background: bg,
                border: `2px solid ${border}`,
                borderRadius: 'var(--v-radius-md)',
                cursor: selected ? 'default' : 'pointer',
                textAlign: 'center',
              }}
            >
              {icon && <span style={{ position: 'absolute', top: 8, right: 8 }}>{icon}</span>}
              <div
                style={{
                  fontFamily: 'var(--v-font-head)',
                  fontWeight: 900,
                  fontSize: 'var(--v-text-2xl)',
                  color: 'var(--v-ink)',
                }}
              >
                {word}
              </div>
              {selected && (
                <div style={{ fontFamily: 'var(--v-font-mono)', fontSize: 'var(--v-text-sm)', color: 'var(--v-accent)' }}>
                  {ipa}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {selected && (
        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <button type="button" onClick={next} style={btn('var(--v-primary)')}>
            {idx + 1 >= rounds.length ? 'Xem kết quả' : 'Tiếp'} <ArrowRight size={15} />
          </button>
        </div>
      )}
    </div>
  );
}

function btn(color: string, subtle = false): React.CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '10px 16px',
    background: subtle ? 'var(--v-surface)' : color,
    color: subtle ? 'var(--v-ink-soft)' : '#fff',
    border: subtle ? '1px solid var(--v-border)' : 'none',
    borderRadius: 'var(--v-radius-md)',
    fontFamily: 'var(--v-font-head)',
    fontWeight: 800,
    fontSize: 'var(--v-text-sm)',
    cursor: 'pointer',
    boxShadow: subtle ? 'none' : 'var(--v-shadow-sm)',
  };
}
