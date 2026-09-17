'use client';

import { useCallback } from 'react';
import LoadingState from '@/components/common/LoadingState';
import { judgeScore } from '@/lib/roadmap/threshold';
import type { RoadmapItem } from '@/lib/types';
import { usePrimeVoices } from './test/audio';
import DictationCard, { type DictationSentence } from './test/DictationCard';
import ResultBanner from './test/ResultBanner';
import StressTapCard from './test/StressTapCard';
import TestHeader, { CloseButton } from './test/TestHeader';
import TestShell from './test/TestShell';
import { useTestSession } from './test/useTestSession';

type Mode = 'targets' | 'links' | 'stress' | 'words' | 'fabrication' | 'accent' | 'reconstruct';

interface DictationData {
  mode: Mode;
  sample: number;
  sentences: DictationSentence[];
}

interface DictationAnswer {
  sentence: DictationSentence;
  typed?: string;
  tapped?: number[];
  ok: boolean;
  /** targets: từ chức năng · links: chỗ nối · còn lại: từ của câu — đúng / tổng */
  hits: number;
  total: number;
  fabricated?: string[];
  reconstructed?: boolean;
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

const LIST_LABEL: Record<Mode, string> = {
  targets: 'Nghe chép — từ chức năng',
  links: 'Nghe chép — nối âm',
  stress: 'Nghe trọng âm câu',
  words: 'Nghe chép nguyên văn',
  fabrication: 'Nghe chép — không đoán bừa',
  accent: 'Nghe chép — giọng Anh, Úc, Mỹ',
  reconstruct: 'Nghe chép — theo âm, không theo nghĩa',
};

const US_VOICE = 'en-US-AriaNeural';

/** Điểm xem trước — PHẢI khớp luật ở POST /api/roadmap/[key]/dictation-test. */
function previewScore(mode: Mode, answers: DictationAnswer[]): { score: number; hint?: string } {
  const hits = answers.reduce((n, a) => n + a.hits, 0);
  const total = answers.reduce((n, a) => n + a.total, 0);
  const pct = total > 0 ? Math.floor((hits / total) * 100) : 0;
  switch (mode) {
    case 'targets':
      return { score: pct, hint: `${pct}% từ chức năng` };
    case 'words':
      return { score: pct, hint: `${pct}% từ đúng` };
    case 'fabrication': {
      const n = answers.reduce((k, a) => k + (a.fabricated?.length ?? 0), 0);
      return { score: n, hint: n === 0 ? 'Không bịa từ nào' : `${n} từ bịa` };
    }
    case 'accent': {
      const bucket = (us: boolean) => {
        const xs = answers.filter((a) => (a.sentence.voice === US_VOICE) === us);
        const h = xs.reduce((n, a) => n + a.hits, 0);
        const t = xs.reduce((n, a) => n + a.total, 0);
        return t > 0 ? (h / t) * 100 : 0;
      };
      const us = bucket(true);
      const other = bucket(false);
      const gap = Math.max(0, Math.floor(us - other));
      return { score: gap, hint: `Giọng Mỹ ${Math.round(us)}% · Anh/Úc ${Math.round(other)}% · chênh ${gap}%` };
    }
    case 'reconstruct': {
      const n = answers.filter((a) => a.reconstructed).length;
      return { score: n, hint: `${n} câu viết lại theo nghĩa` };
    }
    default:
      return { score: answers.filter((a) => a.ok).length };
  }
}

/**
 * Mọi bài nghe câu: nghe-06 từ chức năng · 07 nối âm · 08 trọng âm câu ·
 * 13 không bịa · 14 giọng Anh/Úc · 15/16 chép nguyên văn · 17 chép theo âm.
 */
export default function DictationTestSession({ itemKey, itemLabel, passWhen, threshold, variant, onClose, onSaved }: Props) {
  usePrimeVoices();

  const s = useTestSession<DictationData, DictationAnswer>({
    url: `/api/roadmap/${itemKey}/dictation-test`,
    count: (d) => d.sentences.length,
    // Chỉ gửi bài gõ / từ đã bấm — server tự chấm lại, không tin điểm client.
    buildPayload: useCallback(
      (answers: DictationAnswer[], partial: boolean) => ({
        answers: answers.map((a) => ({
          id: a.sentence.id,
          typed: a.typed,
          tapped: a.tapped,
          voice: a.sentence.voice,
          reconstructed: a.reconstructed,
        })),
        partial,
      }),
      [],
    ),
    onClose,
    onSaved,
  });

  const mode = s.data?.mode ?? 'targets';
  const correctSentences = s.answers.filter((a) => a.ok).length;
  const { score, hint } = previewScore(mode, s.answers);

  // Con số lớn ở màn kết quả phải là đúng THỨ bài đo — không thì bài "không bịa"
  // có thể hiện 3/10 mà vẫn "Đạt rồi" (vì bài đó chấm từ bịa, không chấm câu đúng hết).
  const wordHits = s.answers.reduce((n, a) => n + a.hits, 0);
  const wordTotal = s.answers.reduce((n, a) => n + a.total, 0);
  const banner =
    mode === 'targets' || mode === 'words' || mode === 'accent'
      ? { correct: wordHits, total: wordTotal }
      : mode === 'fabrication'
        ? { correct: s.answers.filter((a) => !a.fabricated?.length).length, total: s.answers.length }
        : mode === 'reconstruct'
          ? { correct: s.answers.filter((a) => !a.reconstructed).length, total: s.answers.length }
          : { correct: correctSentences, total: s.answers.length };
  const passed = s.finished ? judgeScore(threshold, score) : null;

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
    const missed = s.answers.filter((a) =>
      mode === 'fabrication' ? (a.fabricated?.length ?? 0) > 0 : mode === 'reconstruct' ? a.reconstructed : !a.ok,
    );
    content = (
      <ResultBanner
        correct={banner.correct}
        total={banner.total}
        passWhen={passWhen}
        passed={passed}
        saved={s.saved}
        saving={s.saving}
        saveError={s.saveError}
        onSave={() => void s.save()}
        onRestart={s.restart}
        onClose={s.requestClose}
        hint={hint}
      >
        {missed.length > 0 && (
          <div style={{ background: 'var(--v-surface)', border: '1px solid var(--v-border)', borderRadius: 'var(--v-radius-lg)', overflow: 'hidden' }}>
            <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--v-border)', fontFamily: 'var(--v-font-head)', fontWeight: 900, fontSize: 'var(--v-text-md)', color: 'var(--v-ink)' }}>
              {missed.length} câu cần nghe lại
            </div>
            {missed.map((a) => (
              <div key={a.sentence.id} style={{ padding: '10px 14px', borderBottom: '1px solid var(--v-border)', display: 'flex', flexDirection: 'column', gap: 3 }}>
                <div style={{ fontFamily: 'var(--v-font-body)', fontWeight: 800, fontSize: 'var(--v-text-md)', color: 'var(--v-ink)' }}>{a.sentence.text}</div>
                {a.typed !== undefined && (
                  <div style={{ fontFamily: 'var(--v-font-body)', fontSize: 'var(--v-text-sm)', color: 'var(--v-red)' }}>Bạn gõ: {a.typed}</div>
                )}
                {mode !== 'stress' && (
                  <div style={{ fontFamily: 'var(--v-font-body)', fontSize: 'var(--v-text-xs)', color: 'var(--v-muted)' }}>
                    {mode === 'targets'
                      ? `${a.hits}/${a.total} từ chức năng`
                      : mode === 'links'
                        ? `${a.hits}/${a.total} chỗ nối`
                        : mode === 'fabrication'
                          ? a.fabricated?.length
                            ? `bịa: ${a.fabricated.join(', ')}`
                            : 'không bịa'
                          : `${a.hits}/${a.total} từ${a.reconstructed ? ' · viết lại theo nghĩa' : ''}${a.sentence.voice && a.sentence.voice !== US_VOICE ? ' · giọng Anh/Úc' : ''}`}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </ResultBanner>
    );
  } else {
    const sentence = s.data.sentences[s.position];
    content = (
      <>
        <TestHeader
          onClose={s.requestClose}
          title={itemLabel}
          listLabel={LIST_LABEL[mode]}
          passWhen={passWhen}
          position={s.position}
          total={s.total}
          correct={correctSentences}
          wrong={s.position - correctSentences}
        />
        {mode === 'stress' ? (
          <StressTapCard
            sentence={sentence}
            needsStart={!s.started}
            onStarted={() => s.setStarted(true)}
            onNext={(tapped, ok) => s.record({ sentence, tapped, ok, hits: ok ? 1 : 0, total: 1 })}
          />
        ) : (
          <DictationCard
            sentence={sentence}
            mode={mode}
            needsStart={!s.started}
            onStarted={() => s.setStarted(true)}
            onNext={(typed, g) =>
              s.record({ sentence, typed, ok: g.ok, hits: g.hits, total: g.total, fabricated: g.fabricated, reconstructed: g.reconstructed })
            }
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
      partialNote="Lưu lại để giữ lịch sử phần đã làm"
      save={s.save}
      onClose={onClose}
      onCancelConfirm={() => s.setConfirmOpen(false)}
    >
      {content}
    </TestShell>
  );
}
