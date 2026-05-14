import type { Flashcard } from '@/lib/types';
import AudioButton from './AudioButton';
import POSPill from '@/components/common/POSPill';
import { Quote } from 'lucide-react';

interface Props {
  card: Flashcard;
  compact?: boolean;
}

export default function WordCard({ card, compact = false }: Props) {
  return (
    <div
      style={{
        background: 'var(--v-surface)',
        border: '1px solid var(--v-border)',
        borderRadius: 'var(--v-radius-lg)',
        boxShadow: 'var(--v-shadow-md)',
        padding: compact ? 16 : 24,
      }}
    >
      {/* English word */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 4 }}>
        <h2
          style={{
            fontFamily: 'var(--v-font-head)',
            fontWeight: 900,
            fontSize: compact ? 'var(--v-text-4xl)' : 'var(--v-text-5xl)',
            letterSpacing: 'var(--v-tracking-tight)',
            color: 'var(--v-ink)',
            margin: 0,
            lineHeight: 1.05,
            flex: 1,
          }}
        >
          {card.english}
        </h2>
        <AudioButton audioUrl={card.audio_url} fallbackText={card.english} size={36} />
      </div>

      {/* IPA */}
      {card.ipa && (
        <div
          style={{
            fontFamily: 'var(--v-font-mono)',
            fontSize: 'var(--v-text-base)',
            color: 'var(--v-accent)',
            marginBottom: 8,
          }}
        >
          {card.ipa}
        </div>
      )}

      {/* Part of speech chip */}
      <POSPill pos={card.part_of_speech} marginBottom={12} />


      {/* Pexels image */}
      {card.image_url && !compact && (
        <div
          style={{
            position: 'relative',
            width: '100%',
            aspectRatio: '16 / 9',
            borderRadius: 'var(--v-radius-md)',
            overflow: 'hidden',
            marginBottom: 12,
            background: 'var(--v-panel)',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={card.image_url}
            alt={card.english}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
          {card.image_attribution && card.image_attribution.author_url && (
            <a
              href={card.image_attribution.source_url || card.image_attribution.author_url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                position: 'absolute',
                bottom: 6,
                right: 8,
                padding: '2px 8px',
                background: 'rgba(0,0,0,0.45)',
                color: '#fff',
                borderRadius: 999,
                fontFamily: 'var(--v-font-body)',
                fontSize: 10,
                fontWeight: 700,
                textDecoration: 'none',
              }}
            >
              Photo by {card.image_attribution.author} · Pexels
            </a>
          )}
        </div>
      )}

      {/* Vietnamese meaning */}
      <div
        style={{
          fontFamily: 'var(--v-font-head)',
          fontSize: compact ? 'var(--v-text-lg)' : 'var(--v-text-xl)',
          fontWeight: 800,
          color: 'var(--v-ink)',
          lineHeight: 1.4,
          marginBottom: 16,
        }}
      >
        {card.vietnamese}
      </div>

      {/* Examples */}
      {card.examples.length > 0 && (
        <div style={{ marginBottom: card.collocations.length > 0 ? 14 : 0 }}>
          <div
            style={{
              fontFamily: 'var(--v-font-body)',
              fontSize: 'var(--v-text-xs)',
              fontWeight: 800,
              color: 'var(--v-muted)',
              letterSpacing: 'var(--v-tracking-wider)',
              textTransform: 'uppercase',
              marginBottom: 6,
            }}
          >
            Ví dụ
          </div>
          {card.examples.slice(0, compact ? 1 : 3).map((ex, i) => (
            <div
              key={i}
              style={{
                padding: '8px 12px',
                background: 'var(--v-panel)',
                border: '1px solid var(--v-border)',
                borderRadius: 'var(--v-radius-sm)',
                marginBottom: 6,
                display: 'flex',
                gap: 8,
              }}
            >
              <Quote size={14} style={{ color: 'var(--v-muted)', flexShrink: 0, marginTop: 3 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 'var(--v-text-md)', color: 'var(--v-ink)', lineHeight: 1.5 }}>
                  {ex.en}
                </div>
                {ex.vi && (
                  <div
                    style={{
                      fontSize: 'var(--v-text-sm)',
                      color: 'var(--v-muted)',
                      marginTop: 2,
                      lineHeight: 1.5,
                    }}
                  >
                    {ex.vi}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Collocations */}
      {card.collocations.length > 0 && !compact && (
        <div>
          <div
            style={{
              fontFamily: 'var(--v-font-body)',
              fontSize: 'var(--v-text-xs)',
              fontWeight: 800,
              color: 'var(--v-muted)',
              letterSpacing: 'var(--v-tracking-wider)',
              textTransform: 'uppercase',
              marginBottom: 6,
            }}
          >
            Hay đi với
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {card.collocations.slice(0, 6).map((coll, i) => (
              <span
                key={i}
                style={{
                  padding: '4px 10px',
                  background: 'var(--v-accent-soft)',
                  color: 'var(--v-accent)',
                  borderRadius: 'var(--v-radius-pill)',
                  fontSize: 'var(--v-text-xs)',
                  fontWeight: 700,
                }}
              >
                {coll.phrase}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Notes */}
      {card.notes && !compact && (
        <div
          style={{
            marginTop: 12,
            padding: '8px 12px',
            background: 'var(--v-primary-soft)',
            borderRadius: 'var(--v-radius-sm)',
            fontSize: 'var(--v-text-sm)',
            color: 'var(--v-ink-soft)',
            fontStyle: 'italic',
          }}
        >
          📝 {card.notes}
        </div>
      )}
    </div>
  );
}
