'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowRight, RotateCcw, Volume2 } from 'lucide-react';
import Kbd from '@/components/flashcard-session/Kbd';
import { useSentenceAudio } from './audio';
import {
  alignDictation,
  gradeFabrication,
  gradeLinks,
  gradeTargets,
  gradeWords,
  tokenizeReference,
} from './dictation-grade';

export interface DictationSentence {
  id: string;
  text: string;
  key: number[] | [number, number][];
  note_vi: string | null;
  /** Chỉ bài nghe-14: giọng đọc của câu này. */
  voice?: string;
}

export type TypedMode = 'targets' | 'links' | 'words' | 'fabrication' | 'accent' | 'reconstruct';

export interface DictationGraded {
  ok: boolean;
  hits: number;
  total: number;
  fabricated?: string[];
  reconstructed?: boolean;
}

interface Props {
  sentence: DictationSentence;
  mode: TypedMode;
  needsStart: boolean;
  onStarted: () => void;
  onNext: (typed: string, graded: DictationGraded) => void;
}

const VOICE_LABEL: Record<string, string> = {
  'en-US-AriaNeural': 'Giọng Mỹ',
  'en-GB-SoniaNeural': 'Giọng Anh',
  'en-AU-NatashaNeural': 'Giọng Úc',
};

const INTRO: Record<TypedMode, React.ReactNode> = {
  targets: <>Mỗi câu chỉ được nghe <strong>một lần</strong>, như bài Write From Dictation. Nghe xong gõ lại cả câu.</>,
  links: <>Mỗi câu chỉ được nghe <strong>một lần</strong>. Chú ý chỗ các từ đọc dính vào nhau. Nghe xong gõ lại cả câu.</>,
  words: <>Mỗi câu chỉ được nghe <strong>một lần</strong>. Cố giữ nguyên văn cả câu trong đầu rồi gõ lại.</>,
  fabrication: <>Mỗi câu nghe <strong>một lần</strong>. Từ nào <strong>không chắc thì để trống</strong> (hoặc gõ <Kbd>_</Kbd>) — bài này chấm việc bạn <strong>không đoán bừa</strong>.</>,
  accent: <>Mỗi câu nghe <strong>một lần</strong>, có câu giọng Mỹ, có câu giọng Anh hoặc Úc. Bài so xem bạn nghe giọng Anh/Úc kém hơn giọng Mỹ bao nhiêu.</>,
  reconstruct: <>Mỗi câu nghe <strong>một lần</strong>. Gõ đúng <strong>những âm bạn nghe được</strong>, đừng sửa câu cho "xuôi nghĩa".</>,
};

/**
 * Nghe câu MỘT lần rồi gõ lại. Ngoại lệ duy nhất: chưa gõ chữ nào thì được
 * phát lại — để lỗi âm thanh (không có tiếng) không biến thành câu trả lời sai.
 */
export default function DictationCard({ sentence, mode, needsStart, onStarted, onNext }: Props) {
  // Bài accent tải giọng strict: tải giọng Anh lỗi mà lặng lẽ phát giọng Mỹ
  // của trình duyệt thì kết quả so sánh sai mà không ai biết.
  const audio = useSentenceAudio(sentence.text, { voice: sentence.voice, strict: mode === 'accent' });
  const [typed, setTyped] = useState('');
  const [plays, setPlays] = useState(0);
  const [graded, setGraded] = useState<DictationGraded | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  // Bấm "Bắt đầu nghe" đã phát câu đầu ngay trong cú bấm (Safari đòi vậy); đánh dấu
  // để effect chạy ngay sau đó (needsStart true→false) không phát lần hai.
  const skipAutoplay = useRef(false);

  const playOnce = () => {
    audio.play();
    setPlays((p) => p + 1);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  useEffect(() => {
    setTyped('');
    setPlays(0);
    setGraded(null);
    if (needsStart) return;
    if (skipAutoplay.current) {
      // Lượt phát trong cú bấm đã tính 1 lần nghe; setPlays(0) ở trên vừa xoá mất nó.
      skipAutoplay.current = false;
      setPlays(1);
      requestAnimationFrame(() => inputRef.current?.focus());
    } else playOnce();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sentence.id, needsStart]);

  // Bài nghe-17 còn phải trả lời câu tự khai trước khi Tiếp.
  const awaitingSelfReport = mode === 'reconstruct' && graded !== null && !graded.ok && graded.reconstructed === undefined;

  useEffect(() => {
    if (graded && !awaitingSelfReport) nextRef.current?.focus();
  }, [graded, awaitingSelfReport]);

  function check() {
    switch (mode) {
      case 'targets': {
        const g = gradeTargets(sentence.text, typed, sentence.key as number[]);
        setGraded({ ok: g.hits === g.total, hits: g.hits, total: g.total });
        break;
      }
      case 'links': {
        const g = gradeLinks(sentence.text, typed, sentence.key as [number, number][]);
        setGraded({ ok: g.correct, hits: g.okLinks.filter(Boolean).length, total: g.okLinks.length });
        break;
      }
      case 'fabrication': {
        const g = gradeFabrication(sentence.text, typed);
        setGraded({ ok: g.fabricated.length === 0, hits: g.hits, total: g.total, fabricated: g.fabricated });
        break;
      }
      case 'reconstruct': {
        const g = gradeWords(sentence.text, typed);
        const perfect = g.hits === g.total;
        // Gõ đúng hết thì chắc chắn không "dựng lại" — khỏi hỏi.
        setGraded({ ok: perfect, hits: g.hits, total: g.total, reconstructed: perfect ? false : undefined });
        break;
      }
      default: {
        const g = gradeWords(sentence.text, typed);
        setGraded({ ok: g.hits === g.total, hits: g.hits, total: g.total });
      }
    }
  }

  const card: React.CSSProperties = {
    padding: '24px 20px',
    background: 'var(--v-surface)',
    border: '1px solid var(--v-border)',
    borderRadius: 'var(--v-radius-xl)',
    boxShadow: 'var(--v-shadow-md)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 16,
  };

  if (needsStart) {
    return (
      <div style={card}>
        <div style={{ fontFamily: 'var(--v-font-body)', color: 'var(--v-ink-soft)', fontSize: 'var(--v-text-md)', maxWidth: 420, lineHeight: 1.55, textAlign: 'center' }}>
          {INTRO[mode]} Bật loa lên nhé.
        </div>
        <button
          type="button"
          onClick={() => {
            onStarted();
            skipAutoplay.current = true;
            playOnce();
          }}
          style={startBtn}
        >
          <Volume2 size={24} /> Bắt đầu nghe
        </button>
      </div>
    );
  }

  // Bài accent: tải giọng lỗi thì dừng lại cho thử lại, không cho làm câu này.
  if (mode === 'accent' && audio.ready === 'failed') {
    return (
      <div style={card}>
        <div style={{ fontFamily: 'var(--v-font-body)', color: 'var(--v-red)', fontWeight: 700, textAlign: 'center', lineHeight: 1.5 }}>
          Không tạo được {VOICE_LABEL[sentence.voice ?? ''] ?? 'giọng đọc'} lúc này. Bài này so các giọng với nhau nên mình không thay bằng giọng khác được.
        </div>
        <button type="button" onClick={audio.retry} style={{ ...startBtn, background: 'var(--v-ink)' }}>
          <RotateCcw size={18} /> Thử tải lại
        </button>
      </div>
    );
  }

  const canReplay = plays < 1 || typed.trim() === '';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%' }}>
      <div style={card}>
        {sentence.voice && (
          <span style={{ padding: '3px 12px', background: 'var(--v-panel)', borderRadius: 'var(--v-radius-pill)', fontFamily: 'var(--v-font-body)', fontWeight: 800, fontSize: 'var(--v-text-xs)', color: 'var(--v-ink-soft)' }}>
            {VOICE_LABEL[sentence.voice] ?? sentence.voice}
          </span>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            type="button"
            onClick={playOnce}
            disabled={!canReplay || graded !== null || (mode === 'accent' && audio.ready !== 'ready')}
            aria-label="Phát"
            style={{
              width: 72,
              height: 72,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: canReplay && !graded ? 'var(--v-blue)' : 'var(--v-border)',
              color: '#fff',
              border: 'none',
              borderRadius: '50%',
              boxShadow: canReplay && !graded ? 'var(--v-press)' : 'none',
              cursor: canReplay && !graded ? 'pointer' : 'default',
            }}
          >
            <Volume2 size={32} />
          </button>
          <div style={{ fontFamily: 'var(--v-font-body)', fontSize: 'var(--v-text-xs)', color: 'var(--v-muted)', maxWidth: 200, lineHeight: 1.4 }}>
            {graded
              ? 'Đã chấm câu này'
              : mode === 'accent' && audio.ready === 'loading'
                ? 'Đang tải giọng đọc…'
                : typed.trim() === '' && plays > 0
                  ? 'Không có tiếng? Bấm phát lại — được phát lại khi chưa gõ chữ nào.'
                  : 'Chỉ nghe một lần.'}
          </div>
        </div>

        {graded ? (
          <Feedback
            sentence={sentence}
            mode={mode}
            typed={typed}
            graded={graded}
            onSelfReport={(reconstructed) => setGraded((g) => (g ? { ...g, reconstructed } : g))}
          />
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (typed.trim() || mode === 'fabrication') check();
            }}
            style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 10 }}
          >
            <textarea
              ref={inputRef}
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (typed.trim() || mode === 'fabrication') check();
                }
              }}
              rows={2}
              placeholder={mode === 'fabrication' ? 'Gõ những gì chắc chắn nghe được, chỗ không chắc để trống' : 'Gõ lại cả câu bạn nghe được'}
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              style={{
                width: '100%',
                padding: '12px 14px',
                background: 'var(--v-bg)',
                border: '2px solid var(--v-border)',
                borderRadius: 'var(--v-radius-md)',
                color: 'var(--v-ink)',
                fontFamily: 'var(--v-font-body)',
                fontSize: 'var(--v-text-lg)',
                lineHeight: 1.5,
                resize: 'none',
              }}
            />
            <button
              type="submit"
              disabled={!typed.trim() && mode !== 'fabrication'}
              style={{
                padding: '13px',
                background: typed.trim() || mode === 'fabrication' ? 'var(--v-primary)' : 'var(--v-border)',
                color: '#fff',
                border: 'none',
                borderRadius: 'var(--v-radius-md)',
                boxShadow: typed.trim() ? 'var(--v-press)' : 'none',
                fontFamily: 'var(--v-font-head)',
                fontWeight: 900,
                fontSize: 'var(--v-text-md)',
                cursor: 'pointer',
              }}
            >
              Kiểm tra
            </button>
          </form>
        )}
      </div>

      {graded ? (
        <button
          ref={nextRef}
          type="button"
          disabled={awaitingSelfReport}
          onClick={() => onNext(typed, graded)}
          style={{ ...nextBtn, opacity: awaitingSelfReport ? 0.35 : 1, cursor: awaitingSelfReport ? 'default' : 'pointer' }}
        >
          Tiếp <ArrowRight size={20} />
        </button>
      ) : (
        <div style={{ textAlign: 'center', fontFamily: 'var(--v-font-body)', fontSize: 'var(--v-text-xs)', color: 'var(--v-muted)' }}>
          <Kbd>Enter</Kbd> kiểm tra · <Kbd>Shift</Kbd>+<Kbd>Enter</Kbd> xuống dòng
        </div>
      )}
    </div>
  );
}

function Feedback({
  sentence,
  mode,
  typed,
  graded,
  onSelfReport,
}: {
  sentence: DictationSentence;
  mode: TypedMode;
  typed: string;
  graded: DictationGraded;
  onSelfReport: (reconstructed: boolean) => void;
}) {
  const tokens = tokenizeReference(sentence.text);
  const matched = alignDictation(sentence.text, typed);
  const gradedIdx =
    mode === 'targets'
      ? new Set(sentence.key as number[])
      : mode === 'links'
        ? new Set((sentence.key as [number, number][]).flat())
        : new Set(tokens.map((_, i) => i));
  const linkAfter = new Set<number>(mode === 'links' ? (sentence.key as [number, number][]).map(([a]) => a) : []);

  const pill =
    mode === 'targets'
      ? `Đúng ${graded.hits}/${graded.total} từ chức năng`
      : mode === 'links'
        ? `Đúng ${graded.hits}/${graded.total} chỗ nối${graded.ok ? '' : ' — câu chưa đạt'}`
        : mode === 'fabrication'
          ? graded.fabricated && graded.fabricated.length > 0
            ? `${graded.fabricated.length} từ bịa`
            : 'Không bịa từ nào'
          : `Đúng ${graded.hits}/${graded.total} từ`;

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div
        style={{
          alignSelf: 'center',
          padding: '6px 16px',
          background: graded.ok ? 'var(--v-primary-soft)' : 'var(--v-red-soft)',
          color: graded.ok ? 'var(--v-primary)' : 'var(--v-red)',
          borderRadius: 'var(--v-radius-pill)',
          fontFamily: 'var(--v-font-head)',
          fontWeight: 900,
          fontSize: 'var(--v-text-md)',
        }}
      >
        {pill}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'baseline', rowGap: 8 }}>
        {tokens.map((t, i) => {
          const isGraded = gradedIdx.has(i);
          const ok = matched[i];
          return (
            <span key={i} style={{ display: 'inline-flex', alignItems: 'baseline' }}>
              <span
                style={{
                  padding: isGraded ? '2px 7px' : '2px 3px',
                  borderRadius: 7,
                  background: isGraded ? (ok ? 'var(--v-primary-soft)' : 'var(--v-red-soft)') : 'transparent',
                  color: isGraded ? (ok ? 'var(--v-primary)' : 'var(--v-red)') : ok ? 'var(--v-ink)' : 'var(--v-muted)',
                  fontFamily: 'var(--v-font-body)',
                  fontWeight: isGraded ? 900 : 600,
                  fontSize: 'var(--v-text-lg)',
                  textDecoration: !isGraded && !ok ? 'line-through' : 'none',
                }}
              >
                {t}
              </span>
              {linkAfter.has(i) ? <span style={{ color: 'var(--v-blue)', fontWeight: 900, margin: '0 1px' }}>‿</span> : <span style={{ width: 6 }} />}
            </span>
          );
        })}
      </div>

      <div style={{ fontFamily: 'var(--v-font-body)', fontSize: 'var(--v-text-sm)', color: 'var(--v-ink-soft)', textAlign: 'center' }}>
        Bạn gõ: <span style={{ color: 'var(--v-ink)' }}>{typed || '(để trống)'}</span>
      </div>

      {mode === 'fabrication' && graded.fabricated && graded.fabricated.length > 0 && (
        <div style={{ textAlign: 'center', fontFamily: 'var(--v-font-body)', fontSize: 'var(--v-text-sm)', color: 'var(--v-ink-soft)', lineHeight: 1.6 }}>
          Từ bạn gõ ra mà câu gốc không có, cũng không gần âm với từ nào bị thiếu:{' '}
          {graded.fabricated.map((w, i) => (
            <span key={i} style={{ margin: '0 3px', padding: '1px 8px', background: 'var(--v-red-soft)', color: 'var(--v-red)', borderRadius: 6, fontWeight: 800 }}>
              {w}
            </span>
          ))}
          <div style={{ fontSize: 'var(--v-text-xs)', color: 'var(--v-muted)', marginTop: 4 }}>
            Không chắc thì để trống sẽ tốt hơn gõ đoán.
          </div>
        </div>
      )}

      {mode === 'reconstruct' && !graded.ok && (
        <div style={{ padding: 12, background: 'var(--v-panel)', borderRadius: 'var(--v-radius-md)', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontFamily: 'var(--v-font-body)', fontWeight: 800, fontSize: 'var(--v-text-sm)', color: 'var(--v-ink)', textAlign: 'center', lineHeight: 1.5 }}>
            So với câu gốc, chỗ sai của bạn là do <em>viết lại theo nghĩa</em> (khác chữ nhưng cùng ý, vd "has invested in" → "need to invest") hay do nghe sót/nhầm âm?
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {[
              { v: true, label: 'Viết lại theo nghĩa' },
              { v: false, label: 'Nghe sót / nhầm âm' },
            ].map((o) => {
              const on = graded.reconstructed === o.v;
              return (
                <button
                  key={String(o.v)}
                  type="button"
                  onClick={() => onSelfReport(o.v)}
                  style={{
                    padding: '10px',
                    background: on ? 'var(--v-ink)' : 'var(--v-surface)',
                    color: on ? 'var(--v-bg)' : 'var(--v-ink)',
                    border: '1px solid var(--v-border)',
                    borderRadius: 'var(--v-radius-sm)',
                    fontFamily: 'var(--v-font-body)',
                    fontWeight: 800,
                    fontSize: 'var(--v-text-sm)',
                    cursor: 'pointer',
                  }}
                >
                  {o.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {sentence.note_vi && mode !== 'fabrication' && mode !== 'accent' && mode !== 'reconstruct' && (
        <div style={{ padding: '10px 12px', background: 'var(--v-blue-soft)', borderRadius: 'var(--v-radius-md)', fontFamily: 'var(--v-font-body)', fontSize: 'var(--v-text-sm)', color: 'var(--v-ink)', lineHeight: 1.5 }}>
          {sentence.note_vi}
        </div>
      )}
    </div>
  );
}

const startBtn: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 10,
  padding: '16px 28px',
  background: 'var(--v-blue)',
  color: '#fff',
  border: 'none',
  borderRadius: 'var(--v-radius-pill)',
  boxShadow: 'var(--v-press)',
  fontFamily: 'var(--v-font-head)',
  fontWeight: 900,
  fontSize: 'var(--v-text-lg)',
  cursor: 'pointer',
};

const nextBtn: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  padding: '16px',
  background: 'var(--v-ink)',
  color: 'var(--v-bg)',
  border: 'none',
  borderRadius: 'var(--v-radius-lg)',
  fontFamily: 'var(--v-font-head)',
  fontWeight: 900,
  fontSize: 'var(--v-text-lg)',
};
