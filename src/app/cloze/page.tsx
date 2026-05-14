'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, FileText, PenLine, ListChecks } from 'lucide-react';
import QuizSetup, { type QuizMode } from '@/components/QuizSetup';
import ClozeSession, { type ClozeMode } from '@/components/ClozeSession';

const MODES: QuizMode<ClozeMode>[] = [
  {
    value: 'typing',
    label: 'Gõ điền',
    description: 'Đọc câu, gõ chính xác từ tiếng Anh vào chỗ trống',
    icon: <PenLine size={18} />,
  },
  {
    value: 'multiple_choice',
    label: 'Chọn 1 trong 4',
    description: 'Đọc câu, chọn từ đúng từ 4 lựa chọn',
    icon: <ListChecks size={18} />,
  },
];

export default function ClozePage() {
  const [session, setSession] = useState<{ cardIds: number[]; mode: ClozeMode } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start({
    mode,
    count,
    deckId,
  }: {
    mode: ClozeMode;
    count: number;
    deckId: number | null;
  }) {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ count: String(count) });
      if (deckId) params.set('deck_id', String(deckId));
      const res = await fetch(`/api/cloze-session?${params}`);
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error || 'Không tải được câu hỏi.');
        return;
      }
      const data = (await res.json()) as { card_ids?: number[] };
      if (!data.card_ids || data.card_ids.length === 0) {
        setError('Chưa có từ nào ở trạng thái "đang học" hoặc "ôn tập".');
        return;
      }
      setSession({ cardIds: data.card_ids, mode });
    } catch {
      setError('Lỗi kết nối.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <Link
        href="/"
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
        <FileText size={24} style={{ color: 'var(--v-primary)' }} /> Điền chỗ trống
      </h1>
      <p
        style={{
          color: 'var(--v-muted)',
          margin: '0 0 24px',
          fontFamily: 'var(--v-font-body)',
          fontSize: 'var(--v-text-md)',
        }}
      >
        Đặt từ vào văn cảnh — Bún nhờ Gemini tạo câu phù hợp
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

      {loading && <div style={{ color: 'var(--v-muted)', padding: 20 }}>Đang chuẩn bị...</div>}

      {!session && !loading && (
        <QuizSetup<ClozeMode>
          title="Cấu hình"
          accent="var(--v-primary)"
          modes={MODES}
          countOptions={[5, 10, 15]}
          defaultCount={10}
          defaultMode="typing"
          onStart={start}
        />
      )}

      {session && (
        <ClozeSession
          cardIds={session.cardIds}
          mode={session.mode}
          onRestart={() => setSession(null)}
        />
      )}
    </div>
  );
}
