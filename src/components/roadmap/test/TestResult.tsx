'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Check, Copy, Volume2 } from 'lucide-react';
import StatTile from '@/components/speed-quiz/StatTile';
import ResultBanner from './ResultBanner';
import type { Answer, TestWord } from './types';

interface Props {
  answers: Answer[];
  mode: 'know' | 'listen';
  passWhen: string;
  /** Kết quả tính sẵn ở client theo ngưỡng — null khi mục không chấm được. */
  passed: boolean | null;
  saved: boolean;
  saving: boolean;
  saveError: string | null;
  onSave: () => void;
  onRestart: () => void;
  onClose: () => void;
  onPlay: (word: TestWord) => void;
}

export default function TestResult({
  answers,
  mode,
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
  const [copied, setCopied] = useState(false);
  const correct = answers.filter((a) => a.correct).length;
  const missed = answers.filter((a) => !a.correct);

  async function copyMissed() {
    try {
      await navigator.clipboard.writeText(missed.map((a) => a.word.word).join('\n'));
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Trình duyệt chặn clipboard — danh sách vẫn hiện bên dưới để chép tay.
    }
  }

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
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <StatTile label={mode === 'know' ? 'Biết' : 'Gõ đúng'} value={correct} color="var(--v-primary)" />
        <StatTile label={mode === 'know' ? 'Chưa biết' : 'Gõ sai'} value={missed.length} color="var(--v-red)" />
      </div>

      {mode === 'know' && correct > 0 && saved && (
        <div style={{ fontFamily: 'var(--v-font-body)', fontSize: 'var(--v-text-sm)', color: 'var(--v-muted)', textAlign: 'center' }}>
          {correct} từ bạn bấm &quot;Biết&quot; sẽ không bị bốc lại ở lần kiểm sau.
        </div>
      )}

      {missed.length > 0 && (
        <div
          style={{
            background: 'var(--v-surface)',
            border: '1px solid var(--v-border)',
            borderRadius: 'var(--v-radius-lg)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 10,
              padding: '12px 14px',
              borderBottom: '1px solid var(--v-border)',
            }}
          >
            <div style={{ fontFamily: 'var(--v-font-head)', fontWeight: 900, fontSize: 'var(--v-text-md)', color: 'var(--v-ink)' }}>
              {missed.length} từ cần học
            </div>
            <button
              type="button"
              onClick={copyMissed}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '6px 12px',
                background: copied ? 'var(--v-primary)' : 'var(--v-blue-soft)',
                color: copied ? '#fff' : 'var(--v-blue)',
                border: 'none',
                borderRadius: 'var(--v-radius-pill)',
                fontFamily: 'var(--v-font-body)',
                fontWeight: 800,
                fontSize: 'var(--v-text-xs)',
                cursor: 'pointer',
              }}
            >
              {copied ? <Check size={13} /> : <Copy size={13} />}
              {copied ? 'Đã copy' : 'Copy danh sách'}
            </button>
          </div>
          <div style={{ maxHeight: 320, overflowY: 'auto' }}>
            {missed.map((a) => (
              <div
                key={a.word.word}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: '1px solid var(--v-border)' }}
              >
                <button
                  type="button"
                  onClick={() => onPlay(a.word)}
                  aria-label={`Nghe ${a.word.word}`}
                  style={{
                    flexShrink: 0,
                    width: 32,
                    height: 32,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'var(--v-blue-soft)',
                    color: 'var(--v-blue)',
                    border: 'none',
                    borderRadius: '50%',
                    cursor: 'pointer',
                  }}
                >
                  <Volume2 size={15} />
                </button>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: 'var(--v-font-head)', fontWeight: 900, fontSize: 'var(--v-text-md)', color: 'var(--v-ink)' }}>
                      {a.word.word}
                    </span>
                    {a.word.ipa && (
                      <span style={{ fontFamily: 'var(--v-font-mono)', fontSize: 'var(--v-text-xs)', color: 'var(--v-muted)' }}>
                        {a.word.ipa}
                      </span>
                    )}
                    {a.typed && (
                      <span style={{ fontFamily: 'var(--v-font-body)', fontSize: 'var(--v-text-xs)', color: 'var(--v-red)' }}>
                        bạn gõ: {a.typed}
                      </span>
                    )}
                  </div>
                  {(a.word.vi || a.word.meaning_en) && (
                    <div
                      style={{
                        fontFamily: 'var(--v-font-body)',
                        fontSize: 'var(--v-text-sm)',
                        color: 'var(--v-ink-soft)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {a.word.vi ?? a.word.meaning_en}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div style={{ padding: '10px 14px', fontFamily: 'var(--v-font-body)', fontSize: 'var(--v-text-xs)', color: 'var(--v-muted)' }}>
            Copy rồi dán vào{' '}
            <Link href="/add" style={{ color: 'var(--v-primary)', fontWeight: 800 }}>
              Thêm từ
            </Link>{' '}
            (nhập hàng loạt) để đưa vào bộ từ học dần.
          </div>
        </div>
      )}
    </ResultBanner>
  );
}
