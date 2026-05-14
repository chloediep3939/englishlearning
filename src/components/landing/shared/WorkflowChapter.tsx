'use client';

import Icon from './Icon';
import Reveal from './Reveal';
import FootprintTrail from './FootprintTrail';
import type { Pose } from './LiveMascot';

// One persona "chapter" in the Workflows section. Header has 120px circular
// avatar (mascot pose), name + italic tagline, target chip, pull-quote bar
// on the right. Step row: horizontal flex of step cards with arrow separators.
// Outcome bar at the bottom.

export interface WorkflowStep {
  icon: string;
  label: string;
  detail: string;
}

export interface Workflow {
  name: string;
  tagline: string;
  target: string;
  accent: string;         // CSS color / var
  accentSoft: string;     // pastel bg for avatar + target chip
  pose: Pose;
  moodNote: string;       // pull-quote in italic Lora
  steps: WorkflowStep[];
  outcome: string;
}

interface Props {
  w: Workflow;
  idx: number;
}

export default function WorkflowChapter({ w, idx }: Props) {
  return (
    <Reveal delay={idx * 100} distance={36}>
      <div
        style={{
          position: 'relative',
          background: 'var(--v-surface)',
          border: '1px solid var(--v-border)',
          boxShadow: 'var(--v-shadow-lg)',
          borderRadius: 26,
          padding: '32px 36px',
          overflow: 'hidden',
        }}
      >
        <FootprintTrail count={w.steps.length} color={w.accent} side={idx % 2 === 0 ? 'right' : 'left'} />

        {/* Chapter header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 18,
            marginBottom: 24,
            position: 'relative',
          }}
        >
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <div
              style={{
                width: 120,
                height: 120,
                borderRadius: '50%',
                background: w.accentSoft,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: `2px solid color-mix(in srgb, ${w.accent} 19%, transparent)`,
                boxShadow: `inset 0 -8px 16px color-mix(in srgb, ${w.accent} 8%, transparent)`,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/mascot/${w.pose.startsWith('bun-') ? w.pose : `ngoc-${w.pose}`}.png`}
                width={108}
                height={108}
                alt=""
                aria-hidden="true"
                style={{
                  filter: 'drop-shadow(0 6px 12px rgba(40,30,15,.22))',
                  animation: `v-ngoc-float ${4 + idx * 0.4}s ease-in-out infinite`,
                }}
              />
            </div>
            <div
              style={{
                position: 'absolute',
                bottom: -4,
                right: -8,
                padding: '3px 9px',
                background: w.accent,
                color: '#fff',
                borderRadius: 999,
                boxShadow: '0 2px 0 rgba(60,20,5,.15)',
                fontFamily: 'var(--v-font-head)',
                fontSize: 10,
                fontWeight: 900,
                letterSpacing: '0.08em',
              }}
            >
              #{idx + 1}
            </div>
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
              <h3
                style={{
                  fontFamily: 'var(--v-font-head)',
                  fontSize: 32,
                  fontWeight: 1000,
                  color: 'var(--v-ink)',
                  margin: 0,
                  letterSpacing: '-0.025em',
                }}
              >
                {w.name}
              </h3>
              <span
                style={{
                  fontFamily: 'var(--v-font-serif)',
                  fontStyle: 'italic',
                  fontSize: 19,
                  fontWeight: 500,
                  color: 'var(--v-ink-soft)',
                }}
              >
                — {w.tagline}
              </span>
            </div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                marginTop: 6,
                padding: '4px 11px',
                background: w.accentSoft,
                color: w.accent,
                borderRadius: 999,
                fontFamily: 'var(--v-font-body)',
                fontSize: 12,
                fontWeight: 800,
                letterSpacing: '0.04em',
              }}
            >
              <Icon name="target" size={13} stroke={w.accent} strokeWidth={2.4} /> {w.target}
            </div>
          </div>

          {/* Pull-quote */}
          <div
            style={{
              maxWidth: 320,
              fontFamily: 'var(--v-font-serif)',
              fontStyle: 'italic',
              fontSize: 14,
              fontWeight: 500,
              color: 'var(--v-ink-soft)',
              lineHeight: 1.5,
              paddingLeft: 16,
              borderLeft: `3px solid ${w.accent}`,
            }}
          >
            {w.moodNote}
          </div>
        </div>

        {/* Step row */}
        <div
          style={{
            display: 'flex',
            gap: 10,
            overflowX: 'auto',
            paddingBottom: 6,
            position: 'relative',
          }}
        >
          {w.steps.map((s, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'stretch', gap: 10, flex: '1 1 0', minWidth: 0 }}>
              <Reveal delay={idx * 100 + 200 + i * 80} distance={16} style={{ flex: '1 1 0', minWidth: 0 }}>
                <div
                  style={{
                    background: 'var(--v-panel)',
                    borderRadius: 16,
                    border: '1px solid var(--v-border)',
                    padding: '14px 14px 12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                    position: 'relative',
                    height: '100%',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 9,
                        background: w.accent,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 2px 0 rgba(60,20,5,.12)',
                      }}
                    >
                      <Icon name={s.icon} size={14} stroke="#fff" fill="#fff" strokeWidth={2.4} />
                    </div>
                    <span
                      style={{
                        fontFamily: 'var(--v-font-mono)',
                        fontSize: 10,
                        fontWeight: 700,
                        color: 'var(--v-muted)',
                      }}
                    >
                      0{i + 1}
                    </span>
                  </div>
                  <div>
                    <div
                      style={{
                        fontFamily: 'var(--v-font-head)',
                        fontSize: 13,
                        fontWeight: 900,
                        color: 'var(--v-ink)',
                        letterSpacing: '-0.005em',
                        lineHeight: 1.2,
                      }}
                    >
                      {s.label}
                    </div>
                    <div
                      style={{
                        fontFamily: 'var(--v-font-body)',
                        fontSize: 11,
                        fontWeight: 700,
                        color: 'var(--v-muted)',
                        marginTop: 3,
                        lineHeight: 1.35,
                      }}
                    >
                      {s.detail}
                    </div>
                  </div>
                </div>
              </Reveal>
              {i < w.steps.length - 1 && (
                <div style={{ alignSelf: 'center', flexShrink: 0, color: 'var(--v-muted)' }}>
                  <Icon name="arrowRight" size={14} stroke={w.accent} strokeWidth={2.6} />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Outcome */}
        <div
          style={{
            marginTop: 18,
            padding: '12px 16px',
            background: `linear-gradient(90deg, ${w.accentSoft}, transparent)`,
            borderRadius: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: 10,
              background: w.accent,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: `0 2px 4px color-mix(in srgb, ${w.accent} 25%, transparent)`,
              flexShrink: 0,
            }}
          >
            <Icon name="trophy" size={15} stroke="#fff" strokeWidth={2.4} />
          </div>
          <div>
            <div
              style={{
                fontFamily: 'var(--v-font-body)',
                fontSize: 10,
                fontWeight: 900,
                color: w.accent,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
              }}
            >
              Kết quả
            </div>
            <div
              style={{
                fontFamily: 'var(--v-font-head)',
                fontSize: 15,
                fontWeight: 900,
                color: 'var(--v-ink)',
                marginTop: 1,
              }}
            >
              {w.outcome}
            </div>
          </div>
        </div>
      </div>
    </Reveal>
  );
}
