'use client';

import { useState } from 'react';
import { Headphones } from 'lucide-react';
import { MINIMAL_PAIR_SETS, type MinimalPairSet } from '@/lib/pronunciation/minimal-pairs';
import MinimalPairSession from './MinimalPairSession';

export default function MinimalPairClient() {
  const [active, setActive] = useState<MinimalPairSet | null>(null);

  if (active) {
    return <MinimalPairSession set={active} onExit={() => setActive(null)} />;
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
        gap: 10,
      }}
    >
      {MINIMAL_PAIR_SETS.map((set) => (
        <button
          key={set.id}
          type="button"
          onClick={() => setActive(set)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: 14,
            background: 'var(--v-surface)',
            border: '1px solid var(--v-border)',
            borderRadius: 'var(--v-radius-md)',
            boxShadow: 'var(--v-shadow-sm)',
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          <span
            style={{
              width: 40,
              height: 40,
              flexShrink: 0,
              borderRadius: '50%',
              background: 'var(--v-purple)',
              color: '#fff',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Headphones size={18} />
          </span>
          <span style={{ minWidth: 0 }}>
            <span
              style={{
                display: 'block',
                fontFamily: 'var(--v-font-head)',
                fontWeight: 800,
                fontSize: 'var(--v-text-md)',
                color: 'var(--v-ink)',
              }}
            >
              {set.label}
            </span>
            <span style={{ color: 'var(--v-muted)', fontSize: 'var(--v-text-xs)' }}>
              {set.pairs.length} cặp từ
            </span>
          </span>
        </button>
      ))}
    </div>
  );
}
