'use client';

import { useCallback } from 'react';
import { Volume2 } from 'lucide-react';
import LoadingState from '@/components/common/LoadingState';
import { judgeScore } from '@/lib/roadmap/threshold';
import type { RoadmapItem } from '@/lib/types';
import { playWord, usePrimeVoices } from './test/audio';
import ResultBanner from './test/ResultBanner';
import StressCard, { type StressQuestion } from './test/StressCard';
import TestHeader, { CloseButton } from './test/TestHeader';
import TestShell from './test/TestShell';
import { useTestSession } from './test/useTestSession';

interface StressData {
  questions: StressQuestion[];
  sample: number;
}

interface StressAnswer {
  question: StressQuestion;
  picked: number;
  correct: boolean;
}

interface Props {
  itemKey: string;
  itemLabel: string;
  passWhen: string;
  threshold: Pick<RoadmapItem, 'pass_dir' | 'pass_value' | 'pass_total' | 'pass_unit'>;
  variant: 'modal' | 'page';
  onClose: () => void;
  onSaved?: () => void;
}

/** Bài nghe-05: nghe từ nhiều âm tiết, bấm vào nhịp được nhấn. */
export default function StressTestSession({ itemKey, itemLabel, passWhen, threshold, variant, onClose, onSaved }: Props) {
  usePrimeVoices();

  const s = useTestSession<StressData, StressAnswer>({
    url: `/api/roadmap/${itemKey}/stress-test`,
    count: (d) => d.questions.length,
    buildPayload: useCallback(
      (answers: StressAnswer[], partial: boolean) => ({
        answers: answers.map((a) => ({ word: a.question.word, correct: a.correct })),
        partial,
      }),
      [],
    ),
    onClose,
    onSaved,
  });

  const play = (q: StressQuestion, rate?: number) => playWord(q.word, q.has_audio, { rate, warm: true });

  const correct = s.answers.filter((a) => a.correct).length;
  const passed = s.finished ? judgeScore(threshold, correct) : null;

  let content: React.ReactNode;
  if (s.error) {
    content = (
      <>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <CloseButton onClick={onClose} />
        </div>
        <div style={{ padding: 20, background: 'var(--v-red-soft)', color: 'var(--v-red)', borderRadius: 'var(--v-radius-lg)', fontFamily: 'var(--v-font-body)', fontWeight: 700 }}>
          {s.error}
        </div>
      </>
    );
  } else if (!s.data) {
    content = <LoadingState message="Đang bốc đề…" />;
  } else if (s.finished) {
    const missed = s.answers.filter((a) => !a.correct);
    content = (
      <ResultBanner
        correct={correct}
        total={s.answers.length}
        passWhen={passWhen}
        passed={passed}
        saved={s.saved}
        saving={s.saving}
        saveError={s.saveError}
        onSave={() => void s.save()}
        onRestart={s.restart}
        onClose={s.requestClose}
      >
        {missed.length > 0 && (
          <div style={{ background: 'var(--v-surface)', border: '1px solid var(--v-border)', borderRadius: 'var(--v-radius-lg)', overflow: 'hidden' }}>
            <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--v-border)', fontFamily: 'var(--v-font-head)', fontWeight: 900, fontSize: 'var(--v-text-md)', color: 'var(--v-ink)' }}>
              {missed.length} từ nhấn nhầm — nghe lại
            </div>
            {missed.map((a) => (
              <div key={a.question.word} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: '1px solid var(--v-border)' }}>
                <button
                  type="button"
                  onClick={() => play(a.question)}
                  aria-label={`Nghe ${a.question.word}`}
                  style={{ width: 32, height: 32, flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'var(--v-blue-soft)', color: 'var(--v-blue)', border: 'none', borderRadius: '50%', cursor: 'pointer' }}
                >
                  <Volume2 size={15} />
                </button>
                <span style={{ fontFamily: 'var(--v-font-head)', fontWeight: 900, fontSize: 'var(--v-text-md)', color: 'var(--v-ink)' }}>{a.question.word}</span>
                <span style={{ fontFamily: 'var(--v-font-mono)', fontSize: 'var(--v-text-sm)', color: 'var(--v-muted)' }}>{a.question.ipa}</span>
                <span style={{ marginLeft: 'auto', fontFamily: 'var(--v-font-body)', fontSize: 'var(--v-text-xs)', color: 'var(--v-ink-soft)', whiteSpace: 'nowrap' }}>
                  bạn chọn <strong style={{ color: 'var(--v-red)' }}>{a.picked + 1}</strong> · đúng là <strong style={{ color: 'var(--v-primary)' }}>{a.question.stress_index + 1}</strong>
                </span>
              </div>
            ))}
          </div>
        )}
      </ResultBanner>
    );
  } else {
    const q = s.data.questions[s.position];
    content = (
      <>
        <TestHeader
          onClose={s.requestClose}
          title={itemLabel}
          listLabel="Nghe trọng âm từ"
          passWhen={passWhen}
          position={s.position}
          total={s.total}
          correct={correct}
          wrong={s.position - correct}
        />
        <StressCard
          question={q}
          needsStart={!s.started}
          onStarted={() => s.setStarted(true)}
          onPlay={play}
          disabled={s.confirmOpen}
          onNext={(picked, ok) => s.record({ question: q, picked, correct: ok })}
        />
      </>
    );
  }

  return (
    <TestShell
      variant={variant}
      requestClose={s.requestClose}
      confirmOpen={s.confirmOpen}
      answered={s.answers.length}
      total={s.total}
      finished={s.finished}
      passed={passed}
      saving={s.saving}
      partialNote="Lưu lại để giữ lịch sử phần đã làm"
      save={s.save}
      onClose={onClose}
      onCancelConfirm={() => s.setConfirmOpen(false)}
    >
      {content}
    </TestShell>
  );
}
