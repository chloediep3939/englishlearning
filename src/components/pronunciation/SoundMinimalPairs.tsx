'use client';

import Link from 'next/link';
import { Volume2, ArrowRight } from 'lucide-react';
import { getMinimalPairSetsForSlug } from '@/lib/pronunciation/minimal-pairs';
import { speak, getStoredVoicePreference } from '@/lib/tts';

/**
 * Inline minimal-pair comparisons for one sound: every set that contrasts this
 * sound (as slugA or slugB), shown right on the sound's detail page. Tapping a
 * word speaks it (TTS). Links out to the full listening drill.
 */
export default function SoundMinimalPairs({ slug }: { slug: string }) {
  const sets = getMinimalPairSetsForSlug(slug);
  if (sets.length === 0) return null;

  const play = (word: string) =>
    speak(word, { lang: 'en-US', rate: 0.9, voice_preference: getStoredVoicePreference() });

  return (
    <div>
      {sets.map((set) => (
        <div key={set.id} style={{ marginBottom: 14 }}>
          <div
            style={{
              fontFamily: 'var(--v-font-head)',
              fontWeight: 800,
              fontSize: 'var(--v-text-sm)',
              color: 'var(--v-ink-soft)',
              marginBottom: 6,
            }}
          >
            {set.label}
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: 6,
            }}
          >
            {set.pairs.map((p, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 8px',
                  background: 'var(--v-panel)',
                  border: '1px solid var(--v-border)',
                  borderRadius: 'var(--v-radius-md)',
                }}
              >
                <PairWord word={p.a} ipa={p.aIpa} onPlay={() => play(p.a)} />
                <span style={{ color: 'var(--v-muted)', fontSize: 'var(--v-text-xs)', flexShrink: 0 }}>vs</span>
                <PairWord word={p.b} ipa={p.bIpa} onPlay={() => play(p.b)} />
              </div>
            ))}
          </div>
        </div>
      ))}

      <Link
        href="/pronunciation/minimal-pairs"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          marginTop: 4,
          color: 'var(--v-purple)',
          fontFamily: 'var(--v-font-head)',
          fontWeight: 800,
          fontSize: 'var(--v-text-sm)',
          textDecoration: 'none',
        }}
      >
        Luyện các cặp âm khác <ArrowRight size={14} />
      </Link>
    </div>
  );
}

function PairWord({ word, ipa, onPlay }: { word: string; ipa: string; onPlay: () => void }) {
  return (
    <button
      type="button"
      onClick={onPlay}
      title={ipa}
      style={{
        flex: 1,
        minWidth: 0,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 6,
        padding: '4px 8px',
        background: 'var(--v-surface)',
        border: '1px solid var(--v-border)',
        borderRadius: 'var(--v-radius-sm)',
        cursor: 'pointer',
        fontFamily: 'var(--v-font-head)',
        fontWeight: 800,
        fontSize: 'var(--v-text-sm)',
        color: 'var(--v-ink)',
      }}
    >
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{word}</span>
      <Volume2 size={14} style={{ color: 'var(--v-blue)', flexShrink: 0 }} />
    </button>
  );
}
