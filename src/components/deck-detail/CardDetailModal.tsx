'use client';

import { X, Trash2 } from 'lucide-react';
import AudioButton from '../AudioButton';
import type { Flashcard } from '@/lib/types';

interface Props {
  card: Flashcard;
  onClose: () => void;
  onDelete: () => void;
}

/**
 * Read-only card detail drawer opened when a row in the deck-detail word
 * list is clicked. Shows IPA, image, examples, collocations, notes, and a
 * Xoá thẻ button. No edit path — the project doesn't have /add?edit yet.
 */
export default function CardDetailModal({ card, onClose, onDelete }: Props) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(20,20,30,0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        padding: 20,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--v-surface)',
          border: '1px solid var(--v-border)',
          borderRadius: 'var(--v-radius-lg)',
          boxShadow: 'var(--v-shadow-lg)',
          padding: 24,
          width: '100%',
          maxWidth: 520,
          maxHeight: 'calc(100vh - 40px)',
          overflowY: 'auto',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h2
                style={{
                  fontFamily: 'var(--v-font-head)',
                  fontWeight: 900,
                  fontSize: 'var(--v-text-2xl)',
                  margin: 0,
                  color: 'var(--v-ink)',
                }}
              >
                {card.english}
              </h2>
              <AudioButton audioUrl={card.audio_url} fallbackText={card.english} size={32} />
            </div>
            {card.ipa && (
              <div
                style={{
                  marginTop: 4,
                  fontFamily: 'var(--v-font-mono)',
                  fontSize: 'var(--v-text-md)',
                  color: 'var(--v-muted)',
                }}
              >
                {card.ipa}
              </div>
            )}
            <div
              style={{
                marginTop: 6,
                fontFamily: 'var(--v-font-body)',
                fontSize: 'var(--v-text-md)',
                color: 'var(--v-ink-soft)',
              }}
            >
              {card.vietnamese}
              {card.part_of_speech && (
                <span style={{ marginLeft: 8, color: 'var(--v-muted)' }}>
                  · {card.part_of_speech}
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            style={{
              padding: 6,
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--v-muted)',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {card.image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={card.image_url}
            alt={card.english}
            style={{
              width: '100%',
              maxHeight: 220,
              objectFit: 'cover',
              borderRadius: 'var(--v-radius-md)',
              marginBottom: 12,
            }}
          />
        )}

        {card.examples.length > 0 && (
          <Section title="Ví dụ">
            {card.examples.map((ex, i) => (
              <div
                key={i}
                style={{
                  padding: '8px 12px',
                  background: 'var(--v-panel)',
                  borderRadius: 'var(--v-radius-sm)',
                  marginBottom: 6,
                  fontFamily: 'var(--v-font-body)',
                  fontSize: 'var(--v-text-sm)',
                  color: 'var(--v-ink)',
                }}
              >
                <div>{ex.en}</div>
                {ex.vi && (
                  <div style={{ color: 'var(--v-muted)', marginTop: 2 }}>{ex.vi}</div>
                )}
              </div>
            ))}
          </Section>
        )}

        {card.collocations.length > 0 && (
          <Section title="Collocations">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {card.collocations.map((co, i) => (
                <span
                  key={i}
                  style={{
                    padding: '4px 10px',
                    background: 'var(--v-panel)',
                    border: '1px solid var(--v-border)',
                    borderRadius: 'var(--v-radius-pill)',
                    fontFamily: 'var(--v-font-body)',
                    fontSize: 'var(--v-text-sm)',
                    color: 'var(--v-ink-soft)',
                  }}
                >
                  {co.phrase}
                </span>
              ))}
            </div>
          </Section>
        )}

        {card.notes && (
          <Section title="Ghi chú">
            <p
              style={{
                margin: 0,
                fontFamily: 'var(--v-font-body)',
                fontSize: 'var(--v-text-sm)',
                color: 'var(--v-ink-soft)',
                whiteSpace: 'pre-wrap',
              }}
            >
              {card.notes}
            </p>
          </Section>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 18 }}>
          <button
            type="button"
            onClick={onDelete}
            style={{
              padding: '8px 14px',
              background: 'transparent',
              color: 'var(--v-red)',
              border: '1px solid var(--v-red)',
              borderRadius: 'var(--v-radius-md)',
              fontFamily: 'var(--v-font-head)',
              fontWeight: 800,
              fontSize: 'var(--v-text-sm)',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Trash2 size={12} /> Xoá thẻ
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 14 }}>
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
        {title}
      </div>
      {children}
    </div>
  );
}
