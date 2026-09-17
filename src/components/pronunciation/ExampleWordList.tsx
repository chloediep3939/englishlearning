'use client';

import { Volume2, Turtle } from 'lucide-react';
import type { ExampleWord } from '@/lib/pronunciation/catalog-meta';
import { speak, speakWord, getStoredVoicePreference, getStoredWordTtsRate } from '@/lib/tts';

export default function ExampleWordList({ examples }: { examples: ExampleWord[] }) {
  function playNormal(word: string) {
    void speakWord(word, {
      lang: 'en-US',
      rate: getStoredWordTtsRate(),
      voice_preference: getStoredVoicePreference(),
    });
  }

  function playSlow(word: string) {
    // Fixed 0.5× — deliberately ignores the stored word rate so "chậm" is always slow.
    speak(word, {
      lang: 'en-US',
      rate: 0.5,
      voice_preference: getStoredVoicePreference(),
    });
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
        gap: 8,
      }}
    >
      {examples.map((ex) => (
        <div
          key={ex.word}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 10px',
            background: 'var(--v-panel)',
            border: '1px solid var(--v-border)',
            borderRadius: 'var(--v-radius-md)',
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontFamily: 'var(--v-font-head)',
                fontWeight: 800,
                fontSize: 'var(--v-text-md)',
                color: 'var(--v-ink)',
              }}
            >
              {ex.word}
            </div>
            <div
              style={{
                fontFamily: 'var(--v-font-mono)',
                fontSize: 'var(--v-text-xs)',
                color: 'var(--v-accent)',
              }}
            >
              {ex.ipa}
            </div>
            <div
              style={{
                fontSize: 'var(--v-text-xs)',
                color: 'var(--v-muted)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {ex.vi}
            </div>
          </div>
          <button
            type="button"
            onClick={() => playNormal(ex.word)}
            aria-label={`Nghe "${ex.word}"`}
            title="Nghe"
            style={iconBtn('var(--v-blue)')}
          >
            <Volume2 size={16} />
          </button>
          <button
            type="button"
            onClick={() => playSlow(ex.word)}
            aria-label={`Nghe chậm "${ex.word}"`}
            title="Đọc chậm 0.5×"
            style={iconBtn('var(--v-teal)')}
          >
            <Turtle size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}

function iconBtn(color: string): React.CSSProperties {
  return {
    flexShrink: 0,
    width: 34,
    height: 34,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 'var(--v-radius-sm)',
    background: 'var(--v-surface)',
    border: '1px solid var(--v-border)',
    color,
    cursor: 'pointer',
  };
}
