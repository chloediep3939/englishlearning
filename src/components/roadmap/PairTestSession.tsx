'use client';

import { useCallback } from 'react';
import LoadingState from '@/components/common/LoadingState';
import type { RoadmapItem } from '@/lib/types';
import { playWord, usePrimeVoices } from './test/audio';
import PairCard from './test/PairCard';
import PairResult from './test/PairResult';
import { scorePairs } from './test/pair-scoring';
import TestHeader, { CloseButton } from './test/TestHeader';
import TestShell from './test/TestShell';
import type { PairAnswer, PairTestData } from './test/types';
import { useTestSession } from './test/useTestSession';

interface Props {
  itemKey: string;
  itemLabel: string;
  passWhen: string;
  threshold: Pick<RoadmapItem, 'pass_dir' | 'pass_value' | 'pass_total' | 'pass_unit'>;
  variant: 'modal' | 'page';
  onClose: () => void;
  onSaved?: () => void;
}

/** Bài nghe cặp từ (T8): nghe một từ, chọn nó là từ nào trong cặp. */
export default function PairTestSession({ itemKey, itemLabel, passWhen, threshold, variant, onClose, onSaved }: Props) {
  usePrimeVoices();

  const s = useTestSession<PairTestData, PairAnswer>({
    url: `/api/roadmap/${itemKey}/pair-test`,
    count: (d) => d.questions.length,
    buildPayload: useCallback(
      (answers: PairAnswer[], partial: boolean) => ({
        answers: answers.map((a) => ({ contrast: a.question.contrast, correct: a.correct })),
        partial,
      }),
      [],
    ),
    onClose,
    onSaved,
  });

  // Từ trong cặp không tra nghĩa nền (warm: false) — nhiều từ hiếm, tra chỉ tốn quota.
  const play = (word: string, hasAudio: boolean, rate?: number) => playWord(word, hasAudio, { rate });

  const correct = s.answers.filter((a) => a.correct).length;
  const { groups, passed: scored } = s.data
    ? scorePairs(s.answers, s.data.contrasts, s.data.scoring, threshold)
    : { groups: [], passed: null };
  const passed = s.finished ? scored : null;

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
    content = (
      <PairResult
        answers={s.answers}
        groups={groups}
        scoring={s.data.scoring}
        passWhen={passWhen}
        passed={passed}
        saved={s.saved}
        saving={s.saving}
        saveError={s.saveError}
        onSave={() => void s.save()}
        onRestart={s.restart}
        onClose={s.requestClose}
        onPlay={play}
      />
    );
  } else {
    const q = s.data.questions[s.position];
    content = (
      <>
        <TestHeader
          onClose={s.requestClose}
          title={itemLabel}
          listLabel="Nghe phân biệt âm"
          passWhen={passWhen}
          position={s.position}
          total={s.total}
          correct={correct}
          wrong={s.position - correct}
        />
        <PairCard
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
