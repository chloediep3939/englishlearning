'use client';

import { Volume2 } from 'lucide-react';
import ResultBanner from './ResultBanner';
import type { GroupScore } from './pair-scoring';
import type { PairAnswer } from './types';

interface Props {
  answers: PairAnswer[];
  groups: GroupScore[];
  scoring: 'min_group' | 'overall';
  passWhen: string;
  passed: boolean | null;
  saved: boolean;
  saving: boolean;
  saveError: string | null;
  onSave: () => void;
  onRestart: () => void;
  onClose: () => void;
  onPlay: (word: string, hasAudio: boolean) => void;
}

// Nhóm được coi là đạt khi ≥ 90% — đúng tỉ lệ 18/20 của ngưỡng gốc.
const GROUP_PASS_RATIO = 0.9;

export default function PairResult({
  answers,
  groups,
  scoring,
  passWhen,
  passed,
  saved,
  saving,
  saveError,
  onSave,
  onRestart,
  onClose,
  onPlay,
}: Props) {
  const correct = answers.filter((a) => a.correct).length;
  const missed = answers.filter((a) => !a.correct);
  const weakest = scoring === 'min_group'
    ? [...groups].filter((g) => g.total > 0).sort((a, b) => a.correct / a.total - b.correct / b.total)[0]
    : undefined;

  return (
    <ResultBanner
      correct={correct}
      total={answers.length}
      passWhen={passWhen}
      passed={passed}
      saved={saved}
      saving={saving}
      saveError={saveError}
      onSave={onSave}
      onRestart={onRestart}
      onClose={onClose}
      hint={
        passed === false && weakest ? (
          <>
            Nhóm cần luyện nhất: <strong style={{ fontFamily: 'var(--v-font-mono)' }}>{weakest.label}</strong> ({weakest.correct}/
            {weakest.total})
          </>
        ) : undefined
      }
    >
      {/* Điểm theo nhóm âm */}
      <div style={{ background: 'var(--v-surface)', border: '1px solid var(--v-border)', borderRadius: 'var(--v-radius-lg)', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ fontFamily: 'var(--v-font-head)', fontWeight: 900, fontSize: 'var(--v-text-md)', color: 'var(--v-ink)' }}>
          Theo từng nhóm âm
        </div>
        {groups.map((g) => {
          const ratio = g.total > 0 ? g.correct / g.total : 0;
          const ok = ratio >= GROUP_PASS_RATIO;
          return (
            <div key={g.contrast} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ width: 96, flexShrink: 0, fontFamily: 'var(--v-font-mono)', fontSize: 'var(--v-text-sm)', color: 'var(--v-ink)' }}>{g.label}</span>
              <div style={{ flex: 1, height: 8, background: 'var(--v-border)', borderRadius: 999, overflow: 'hidden' }}>
                <div style={{ width: `${ratio * 100}%`, height: '100%', background: ok ? 'var(--v-primary)' : 'var(--v-red)' }} />
              </div>
              <span style={{ width: 44, flexShrink: 0, textAlign: 'right', fontFamily: 'var(--v-font-body)', fontWeight: 800, fontSize: 'var(--v-text-sm)', color: ok ? 'var(--v-primary)' : 'var(--v-red)' }}>
                {g.correct}/{g.total}
              </span>
            </div>
          );
        })}
      </div>

      {missed.length > 0 && (
        <div style={{ background: 'var(--v-surface)', border: '1px solid var(--v-border)', borderRadius: 'var(--v-radius-lg)', overflow: 'hidden' }}>
          <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--v-border)', fontFamily: 'var(--v-font-head)', fontWeight: 900, fontSize: 'var(--v-text-md)', color: 'var(--v-ink)' }}>
            {missed.length} câu nghe nhầm — nghe lại để so
          </div>
          <div style={{ maxHeight: 320, overflowY: 'auto' }}>
            {missed.map((a) => {
              const q = a.question;
              const heard = q.target === 'a' ? q.word_a : q.word_b;
              const chose = a.picked === 'a' ? q.word_a : q.word_b;
              return (
                <div key={q.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderBottom: '1px solid var(--v-border)', flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: 'var(--v-font-mono)', fontSize: 'var(--v-text-xs)', color: 'var(--v-muted)', width: 70 }}>{q.contrast_label}</span>
                  <WordChip word={heard} label="mình đọc" color="var(--v-primary)" hasAudio={q.target === 'a' ? q.audio_a : q.audio_b} onPlay={onPlay} />
                  <WordChip word={chose} label="bạn chọn" color="var(--v-red)" hasAudio={a.picked === 'a' ? q.audio_a : q.audio_b} onPlay={onPlay} />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </ResultBanner>
  );
}

function WordChip({ word, label, color, hasAudio, onPlay }: { word: string; label: string; color: string; hasAudio: boolean; onPlay: (w: string, a: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onPlay(word, hasAudio)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '5px 10px',
        background: 'var(--v-panel)',
        border: 'none',
        borderRadius: 'var(--v-radius-pill)',
        cursor: 'pointer',
      }}
    >
      <Volume2 size={13} color={color} />
      <span style={{ fontFamily: 'var(--v-font-body)', fontSize: 'var(--v-text-xs)', color: 'var(--v-muted)' }}>{label}</span>
      <span style={{ fontFamily: 'var(--v-font-head)', fontWeight: 900, fontSize: 'var(--v-text-sm)', color }}>{word}</span>
    </button>
  );
}
