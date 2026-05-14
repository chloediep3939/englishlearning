'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Library, Search, Plus, Check } from 'lucide-react';
import AudioButton from '@/components/AudioButton';
import type { DictionaryResult } from '@/lib/flashcards/dictionary';
import type { FlashcardExample } from '@/lib/types';

export default function DictionaryPage() {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<DictionaryResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedWord, setSavedWord] = useState<string | null>(null);

  async function lookup(e?: React.FormEvent) {
    e?.preventDefault();
    const word = query.trim();
    if (!word) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setSavedWord(null);
    try {
      const res = await fetch(`/api/dictionary/lookup?word=${encodeURIComponent(word)}`);
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error || 'Không tìm thấy.');
        return;
      }
      setResult((await res.json()) as DictionaryResult);
    } catch {
      setError('Lỗi kết nối.');
    } finally {
      setLoading(false);
    }
  }

  async function saveToLibrary() {
    if (!result) return;
    const vn = window.prompt(`Nhập nghĩa tiếng Việt của "${result.word}":`);
    if (!vn || vn.trim().length === 0) return;
    try {
      const res = await fetch('/api/cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          english: result.word,
          vietnamese: vn.trim(),
          ipa: result.ipa ?? null,
          audio_url: result.audio_url ?? null,
          part_of_speech: result.part_of_speech ?? null,
          examples: result.examples as FlashcardExample[],
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        alert(data.error || 'Không lưu được.');
        return;
      }
      setSavedWord(result.word);
    } catch {
      alert('Lỗi kết nối.');
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
        <Library size={24} style={{ color: 'var(--v-blue)' }} /> Từ điển
      </h1>
      <p
        style={{
          color: 'var(--v-muted)',
          margin: '0 0 24px',
          fontFamily: 'var(--v-font-body)',
          fontSize: 'var(--v-text-md)',
        }}
      >
        Tra cứu nhanh — bấm &quot;Lưu&quot; để thêm vào thư viện
      </p>

      <form onSubmit={lookup} style={{ display: 'flex', gap: 8, marginBottom: 20, maxWidth: 540 }}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Gõ từ tiếng Anh..."
          autoComplete="off"
          autoFocus
          style={{
            flex: 1,
            padding: '12px 16px',
            fontFamily: 'var(--v-font-body)',
            fontSize: 'var(--v-text-lg)',
            fontWeight: 600,
            background: 'var(--v-surface)',
            border: '2px solid var(--v-blue)',
            borderRadius: 'var(--v-radius-md)',
            color: 'var(--v-ink)',
            outline: 'none',
          }}
        />
        <button
          type="submit"
          disabled={query.trim().length === 0 || loading}
          style={{
            padding: '12px 20px',
            background: 'var(--v-blue)',
            color: '#fff',
            border: 'none',
            borderRadius: 'var(--v-radius-md)',
            boxShadow: 'var(--v-press), 0 4px 10px rgba(61,169,252,0.4)',
            fontFamily: 'var(--v-font-head)',
            fontWeight: 900,
            fontSize: 'var(--v-text-base)',
            cursor: loading || query.trim().length === 0 ? 'not-allowed' : 'pointer',
            opacity: loading || query.trim().length === 0 ? 0.6 : 1,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <Search size={14} />
          {loading ? 'Đang tìm...' : 'Tra cứu'}
        </button>
      </form>

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

      {result && (
        <div
          style={{
            background: 'var(--v-surface)',
            border: '1px solid var(--v-border)',
            borderRadius: 'var(--v-radius-lg)',
            boxShadow: 'var(--v-shadow-md)',
            padding: 24,
            maxWidth: 720,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
            <h2
              style={{
                fontFamily: 'var(--v-font-head)',
                fontWeight: 900,
                fontSize: 'var(--v-text-4xl)',
                letterSpacing: 'var(--v-tracking-tight)',
                margin: 0,
                color: 'var(--v-ink)',
              }}
            >
              {result.word}
            </h2>
            <AudioButton audioUrl={result.audio_url} fallbackText={result.word} size={36} />
          </div>
          {result.ipa && (
            <div
              style={{
                fontFamily: 'var(--v-font-mono)',
                fontSize: 'var(--v-text-base)',
                color: 'var(--v-accent)',
                marginBottom: 4,
              }}
            >
              {result.ipa}
            </div>
          )}
          {result.part_of_speech && (
            <span
              style={{
                display: 'inline-block',
                padding: '3px 10px',
                background: 'var(--v-primary-soft)',
                color: 'var(--v-primary-deep)',
                borderRadius: 'var(--v-radius-pill)',
                fontSize: 'var(--v-text-xs)',
                fontWeight: 700,
                marginTop: 4,
                marginBottom: 14,
              }}
            >
              {result.part_of_speech}
            </span>
          )}

          {result.definitions.length > 0 && (
            <div style={{ marginBottom: 18 }}>
              <div
                style={{
                  fontFamily: 'var(--v-font-body)',
                  fontSize: 'var(--v-text-xs)',
                  fontWeight: 800,
                  color: 'var(--v-muted)',
                  letterSpacing: 'var(--v-tracking-wider)',
                  textTransform: 'uppercase',
                  marginBottom: 6,
                }}
              >
                Nghĩa
              </div>
              <ol style={{ margin: 0, paddingLeft: 20 }}>
                {result.definitions.slice(0, 5).map((d, i) => (
                  <li key={i} style={{ marginBottom: 4, color: 'var(--v-ink)', fontSize: 'var(--v-text-md)' }}>
                    {d}
                  </li>
                ))}
              </ol>
            </div>
          )}

          {result.examples.length > 0 && (
            <div style={{ marginBottom: 18 }}>
              <div
                style={{
                  fontFamily: 'var(--v-font-body)',
                  fontSize: 'var(--v-text-xs)',
                  fontWeight: 800,
                  color: 'var(--v-muted)',
                  letterSpacing: 'var(--v-tracking-wider)',
                  textTransform: 'uppercase',
                  marginBottom: 6,
                }}
              >
                Ví dụ
              </div>
              {result.examples.slice(0, 3).map((ex, i) => (
                <div
                  key={i}
                  style={{
                    padding: '8px 12px',
                    background: 'var(--v-panel)',
                    borderRadius: 'var(--v-radius-sm)',
                    marginBottom: 6,
                    fontSize: 'var(--v-text-md)',
                    color: 'var(--v-ink)',
                    fontStyle: 'italic',
                  }}
                >
                  &quot;{ex.en}&quot;
                </div>
              ))}
            </div>
          )}

          {savedWord === result.word ? (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '10px 16px',
                background: 'var(--v-primary-soft)',
                color: 'var(--v-primary-deep)',
                borderRadius: 'var(--v-radius-md)',
                fontFamily: 'var(--v-font-head)',
                fontWeight: 800,
                fontSize: 'var(--v-text-md)',
              }}
            >
              <Check size={14} /> Đã lưu &quot;{savedWord}&quot; vào thư viện
            </div>
          ) : (
            <button
              type="button"
              onClick={saveToLibrary}
              style={{
                padding: '10px 18px',
                background: 'var(--v-primary)',
                color: '#fff',
                border: 'none',
                borderRadius: 'var(--v-radius-md)',
                boxShadow: 'var(--v-press), 0 4px 10px rgba(122,193,67,0.4)',
                fontFamily: 'var(--v-font-head)',
                fontWeight: 900,
                fontSize: 'var(--v-text-md)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                cursor: 'pointer',
              }}
            >
              <Plus size={14} /> LƯU VÀO THƯ VIỆN
            </button>
          )}
        </div>
      )}
    </div>
  );
}
