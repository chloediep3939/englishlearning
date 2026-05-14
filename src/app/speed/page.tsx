'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Zap, Languages, BookOpen, PenLine, Shuffle } from 'lucide-react';
import QuizSetup, { type QuizMode } from '@/components/QuizSetup';
import SpeedQuizSession from '@/components/SpeedQuizSession';
import LoadingState from '@/components/common/LoadingState';
import type { SpeedQuizQuestion, SpeedQuizMode } from '@/lib/types';

const MODES: QuizMode<SpeedQuizMode>[] = [
  {
    value: 'en_to_vi',
    label: 'Anh → Việt',
    description: 'Thấy từ tiếng Anh + nghe phát âm, chọn nghĩa tiếng Việt',
    icon: <Languages size={18} />,
  },
  {
    value: 'vi_to_en',
    label: 'Việt → Anh',
    description: 'Thấy nghĩa tiếng Việt, chọn từ tiếng Anh',
    icon: <BookOpen size={18} />,
  },
  {
    value: 'spelling',
    label: 'Chính tả',
    description: 'Nghe + thấy nghĩa, chọn cách viết đúng (4 lựa chọn rất giống nhau)',
    icon: <PenLine size={18} />,
  },
  {
    value: 'mix',
    label: 'Trộn lẫn',
    description: 'Mỗi câu một kiểu khác nhau — trộn cả 3 chế độ trên',
    icon: <Shuffle size={18} />,
  },
];

interface QuizState {
  questions: SpeedQuizQuestion[];
  mode: SpeedQuizMode;
}

export default function SpeedPage() {
  const [quiz, setQuiz] = useState<QuizState | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start({ mode, count, deckId }: { mode: SpeedQuizMode; count: number; deckId: number | null }) {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ mode, count: String(count) });
      if (deckId) params.set('deck_id', String(deckId));
      const res = await fetch(`/api/speed-quiz?${params}`);
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error || 'Không tải được câu hỏi.');
        return;
      }
      const data = (await res.json()) as { questions: SpeedQuizQuestion[]; mode: SpeedQuizMode };
      setQuiz({ questions: data.questions, mode: data.mode });
    } catch {
      setError('Lỗi kết nối.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <Link
        href="/dashboard"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          fontSize: 'var(--v-text-sm)',
          color: 'var(--v-muted)',
          textDecoration: 'none',
          marginBottom: 12,
        }}
      >
        <ArrowLeft size={14} /> Dashboard
      </Link>

      <h1
        style={{
          fontFamily: 'var(--v-font-head)',
          fontWeight: 900,
          fontSize: 'var(--v-text-3xl)',
          letterSpacing: 'var(--v-tracking-tight)',
          margin: '0 0 6px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          color: 'var(--v-ink)',
        }}
      >
        <Zap size={24} style={{ color: 'var(--v-yellow)' }} /> Flashcard nhanh
      </h1>
      <p
        style={{
          color: 'var(--v-muted)',
          margin: '0 0 24px',
          fontFamily: 'var(--v-font-body)',
          fontSize: 'var(--v-text-md)',
        }}
      >
        4 lựa chọn · 8 giây mỗi câu · phản xạ nhanh
      </p>

      {error && (
        <div
          style={{
            padding: '10px 14px',
            background: 'rgba(255,87,87,0.08)',
            border: '1px solid rgba(255,87,87,0.25)',
            borderRadius: 'var(--v-radius-md)',
            color: 'var(--v-red)',
            fontSize: 'var(--v-text-md)',
            marginBottom: 16,
            maxWidth: 720,
          }}
        >
          {error}
        </div>
      )}

      {loading && <LoadingState message="Đang tải câu hỏi…" />}

      {!quiz && !loading && (
        <QuizSetup<SpeedQuizMode>
          title="Cấu hình bài tập"
          accent="var(--v-yellow)"
          accentText="var(--v-ink)"
          modes={MODES}
          countOptions={[10, 20, 30]}
          defaultCount={20}
          defaultMode="en_to_vi"
          onStart={start}
        />
      )}

      {quiz && (
        <SpeedQuizSession
          questions={quiz.questions}
          mode={quiz.mode}
          onRestart={() => setQuiz(null)}
        />
      )}
    </div>
  );
}
