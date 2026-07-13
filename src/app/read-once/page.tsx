'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, BookOpen, Play, Trash2 } from 'lucide-react';
import ReadAlong from '@/components/reading/ReadAlong';
import { parseManualBreaks } from '@/lib/reading/chunker';
import { apiJson } from '@/lib/common/api-json';
import type { FlashcardSettings } from '@/lib/types';

const MIN_CHARS = 20;
const HARD_CAP = 10_000;

export default function ReadOncePage() {
  const [content, setContent] = useState('');
  const [started, setStarted] = useState(false);
  // Parsed on "Đọc ngay": clean text (slashes stripped) + chunk-start word
  // indices from any "/" the learner typed.
  const [parsed, setParsed] = useState<{ content: string; breakWordIndices: number[] } | null>(null);
  // Reading prefs, pulled from settings so read-once matches the saved reader.
  const [initialRate, setInitialRate] = useState(1.0);
  const [initialAuto, setInitialAuto] = useState(true);

  useEffect(() => {
    apiJson<FlashcardSettings>('/api/settings')
      .then((s) => {
        if (typeof s.reading_speed === 'number') setInitialRate(s.reading_speed);
        if (typeof s.reading_auto_continue === 'boolean') setInitialAuto(s.reading_auto_continue);
      })
      .catch(() => {/* defaults are fine */});
  }, []);

  const trimmed = content.trim();
  const charCount = content.length;
  // Slash markers don't count as words in the live counter.
  const wordCount =
    trimmed.length === 0 ? 0 : (trimmed.match(/\S+/g) ?? []).filter((t) => !/^\/+$/.test(t)).length;
  const canStart = trimmed.length >= MIN_CHARS && trimmed.length <= HARD_CAP;

  function handleStart() {
    if (!canStart) return;
    setParsed(parseManualBreaks(content));
    setStarted(true);
  }

  if (started && parsed) {
    const cleanWords = parsed.content.trim().match(/\S+/g)?.length ?? 0;
    return (
      <ReadAlong
        passage={{
          id: 0,
          title: 'Đọc nhanh',
          content: parsed.content,
          word_count: cleanWords,
          level_estimate: null,
        }}
        initialRate={initialRate}
        initialAuto={initialAuto}
        initialDeckId={null}
        decks={[]}
        ephemeral
        backHref="/read-once"
        onBack={() => {
          // "Đọc bài khác" = reset the passage: back to an empty paste screen.
          setStarted(false);
          setContent('');
          setParsed(null);
        }}
        seedBreaks={parsed.breakWordIndices}
      />
    );
  }

  return (
    <div>
      <Link
        href="/passage"
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
        <ArrowLeft size={14} /> Thư viện
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
        <BookOpen size={24} style={{ color: 'var(--v-teal)' }} /> Đọc nhanh
      </h1>
      <p
        style={{
          color: 'var(--v-muted)',
          margin: '0 0 18px',
          fontFamily: 'var(--v-font-body)',
          fontSize: 'var(--v-text-md)',
        }}
      >
        Dán một đoạn văn tiếng Anh để đọc theo karaoke + dịch câu. Bài này không
        lưu vào thư viện — đọc xong là xong. Mẹo: chèn dấu <b>/</b> vào chỗ muốn
        ngắt cụm, mình sẽ tự bật chế độ luyện ngắt cụm theo đúng dấu đó.
      </p>

      <div
        style={{
          background: 'var(--v-panel)',
          border: '1px solid var(--v-border)',
          borderRadius: 'var(--v-radius-md)',
          padding: 18,
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
      >
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          autoFocus
          placeholder={`Paste đoạn văn tiếng Anh ở đây (tối thiểu ${MIN_CHARS} ký tự)…`}
          rows={15}
          style={{
            width: '100%',
            padding: '10px 12px',
            borderRadius: 'var(--v-radius-sm)',
            border: '1px solid var(--v-border)',
            background: 'var(--v-bg)',
            color: 'var(--v-ink)',
            fontFamily: 'var(--v-font-body)',
            fontSize: 'var(--v-text-md)',
            lineHeight: 1.55,
            outline: 'none',
            boxSizing: 'border-box',
            resize: 'vertical',
            minHeight: 260,
          }}
        />

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
            fontSize: 'var(--v-text-xs)',
            color: charCount > HARD_CAP ? 'var(--v-red)' : 'var(--v-muted)',
            fontFamily: 'var(--v-font-body)',
          }}
        >
          <div>{wordCount} từ</div>
          <div style={{ fontWeight: 700 }}>
            {charCount.toLocaleString('vi-VN')} / {HARD_CAP.toLocaleString('vi-VN')} ký tự
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button
            type="button"
            onClick={() => {
              setContent('');
              setParsed(null);
            }}
            disabled={content.length === 0}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '10px 16px',
              borderRadius: 'var(--v-radius-md)',
              border: '1px solid var(--v-border)',
              background: 'var(--v-surface)',
              color: 'var(--v-ink)',
              fontFamily: 'var(--v-font-body)',
              fontWeight: 700,
              fontSize: 'var(--v-text-md)',
              cursor: content.length === 0 ? 'not-allowed' : 'pointer',
              opacity: content.length === 0 ? 0.5 : 1,
            }}
          >
            <Trash2 size={15} /> Xoá
          </button>
          <button
            type="button"
            onClick={handleStart}
            disabled={!canStart}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '10px 18px',
              borderRadius: 'var(--v-radius-md)',
              border: 'none',
              color: '#fff',
              fontFamily: 'var(--v-font-body)',
              fontWeight: 800,
              fontSize: 'var(--v-text-md)',
              boxShadow: 'var(--v-shadow-sm)',
              background: canStart ? 'var(--v-primary)' : 'var(--v-muted)',
              opacity: canStart ? 1 : 0.6,
              cursor: canStart ? 'pointer' : 'not-allowed',
            }}
          >
            <Play size={15} /> Đọc ngay
          </button>
        </div>
      </div>
    </div>
  );
}
