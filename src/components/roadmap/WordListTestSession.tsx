'use client';

import { useCallback } from 'react';
import LoadingState from '@/components/common/LoadingState';
import Mascot from '@/components/common/Mascot';
import { judgeScore } from '@/lib/roadmap/threshold';
import type { RoadmapItem } from '@/lib/types';
import { playWord, usePrimeVoices } from './test/audio';
import KnowCard from './test/KnowCard';
import ListenCard from './test/ListenCard';
import TestHeader, { CloseButton } from './test/TestHeader';
import TestResult from './test/TestResult';
import TestShell from './test/TestShell';
import type { Answer, TestData, TestWord } from './test/types';
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

/** Bài bộ từ (T1): Biết / Chưa biết, hoặc nghe rồi gõ. */
export default function WordListTestSession({ itemKey, itemLabel, passWhen, threshold, variant, onClose, onSaved }: Props) {
  usePrimeVoices();

  const s = useTestSession<TestData, Answer>({
    url: `/api/roadmap/${itemKey}/wordlist-test`,
    count: (d) => d.words.length,
    buildPayload: useCallback(
      (answers: Answer[], partial: boolean) => ({
        known: answers.filter((a) => a.correct).map((a) => a.word.word),
        unknown: answers.filter((a) => !a.correct).map((a) => a.word.word),
        partial,
      }),
      [],
    ),
    onClose,
    onSaved,
  });

  // Từ trong bộ từ: nhờ tra Oxford sẵn cho lần sau nếu chưa có mp3.
  const play = (w: TestWord, rate?: number) => playWord(w.word, w.has_audio, { rate, warm: true });

  const correct = s.answers.filter((a) => a.correct).length;
  const wrong = s.position - correct;
  // Mục "càng ít càng tốt" so số LỖI, còn lại so số ĐÚNG — cùng luật với server.
  const passed = s.finished ? judgeScore(threshold, threshold.pass_dir === 'lte' ? wrong : correct) : null;

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
  } else if (s.data.words.length === 0) {
    content = (
      <>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <CloseButton onClick={onClose} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, textAlign: 'center', padding: '20px 0 30px' }}>
          <Mascot pose="happy" size={100} bob />
          <div style={{ fontFamily: 'var(--v-font-head)', fontWeight: 900, fontSize: 'var(--v-text-xl)', color: 'var(--v-ink)' }}>Hết từ để kiểm rồi!</div>
          <div style={{ fontFamily: 'var(--v-font-body)', color: 'var(--v-ink-soft)' }}>
            Bạn đã đánh dấu biết toàn bộ {s.data.total} từ trong phạm vi này.
          </div>
        </div>
      </>
    );
  } else if (s.finished) {
    content = (
      <TestResult
        answers={s.answers}
        mode={s.data.mode}
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
    const current = s.data.words[s.position];
    content = (
      <>
        <TestHeader
          onClose={s.requestClose}
          title={itemLabel}
          listLabel={s.data.list_label}
          passWhen={passWhen}
          position={s.position}
          total={s.total}
          correct={correct}
          wrong={wrong}
        />
        {s.data.mode === 'know' ? (
          <KnowCard
            word={current}
            canUndo={s.position > 0}
            disabled={s.confirmOpen}
            onPlay={play}
            onAnswer={(known) => s.record({ word: current, correct: known })}
            onUndo={s.undo}
          />
        ) : (
          <ListenCard
            word={current}
            needsStart={!s.started}
            onStarted={() => s.setStarted(true)}
            onPlay={play}
            onNext={(ok, typed) => s.record({ word: current, correct: ok, typed })}
          />
        )}
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
      save={s.save}
      onClose={onClose}
      onCancelConfirm={() => s.setConfirmOpen(false)}
    >
      {content}
    </TestShell>
  );
}
