'use client';

import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import type { GrammarAnalysis } from '@/lib/types';

interface Props {
  passageId: number;
  initialAnalysis: GrammarAnalysis | null;
}

interface GrammarResponse {
  analysis?: GrammarAnalysis;
  error?: string;
  message?: string;
  cached?: boolean;
}

export default function GrammarSection({ passageId, initialAnalysis }: Props) {
  const [analysis, setAnalysis] = useState<GrammarAnalysis | null>(initialAnalysis);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchGrammar() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/passages/${passageId}/grammar`, {
        method: 'POST',
      });
      const data = (await res.json().catch(() => ({}))) as GrammarResponse;
      if (res.ok && data.analysis) {
        setAnalysis(data.analysis);
        return;
      }
      if (res.status === 429 || data.error === 'ai_quota_exceeded') {
        setError('Hết hạn ngạch AI hôm nay rồi — thử lại sau nhé.');
        return;
      }
      setError(data.message ?? 'AI lỗi, thử lại sau nha.');
    } catch {
      setError('Không kết nối được — kiểm tra mạng giúp Bún nhé.');
    } finally {
      setLoading(false);
    }
  }

  const hasAnalysis = analysis !== null;

  return (
    <div style={{ marginTop: 24 }}>
      <button
        onClick={fetchGrammar}
        disabled={loading || hasAnalysis}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '10px 18px',
          borderRadius: 'var(--v-radius-md)',
          background: hasAnalysis ? 'var(--v-panel)' : 'var(--v-purple)',
          color: hasAnalysis ? 'var(--v-ink-soft)' : '#fff',
          border: hasAnalysis ? '1px solid var(--v-border)' : 'none',
          cursor: loading || hasAnalysis ? 'default' : 'pointer',
          fontFamily: 'var(--v-font-body)',
          fontWeight: 700,
          fontSize: 'var(--v-text-md)',
        }}
      >
        <Sparkles size={16} />
        {loading
          ? 'Đang phân tích…'
          : hasAnalysis
            ? 'Đã phân tích'
            : 'Tìm hiểu grammar patterns'}
      </button>

      {error && (
        <div
          style={{
            marginTop: 12,
            padding: '10px 14px',
            background: 'var(--v-panel)',
            border: '1px solid var(--v-border)',
            borderLeft: '4px solid var(--v-red)',
            borderRadius: 'var(--v-radius-sm)',
            color: 'var(--v-red)',
            fontFamily: 'var(--v-font-body)',
            fontSize: 'var(--v-text-sm)',
          }}
        >
          {error}
        </div>
      )}

      {analysis && (
        <div style={{ marginTop: 16 }}>
          {analysis.patterns.map((p, i) => (
            <section
              key={i}
              style={{
                background: 'var(--v-panel)',
                padding: 18,
                marginBottom: 12,
                borderRadius: 'var(--v-radius-md)',
                boxShadow: 'var(--v-shadow-sm)',
                borderLeft: '4px solid var(--v-purple)',
              }}
            >
              <h3
                style={{
                  margin: '0 0 8px',
                  fontFamily: 'var(--v-font-head)',
                  fontWeight: 800,
                  fontSize: 'var(--v-text-lg)',
                  color: 'var(--v-ink)',
                }}
              >
                {p.name}
              </h3>
              <p
                style={{
                  margin: '0 0 10px',
                  color: 'var(--v-ink)',
                  fontFamily: 'var(--v-font-body)',
                  fontSize: 'var(--v-text-md)',
                  lineHeight: 1.5,
                }}
              >
                {p.explanation_vi}
              </p>
              {p.examples.length > 0 && (
                <ul
                  style={{
                    margin: 0,
                    padding: '0 0 0 18px',
                    color: 'var(--v-ink-soft)',
                    fontFamily: 'var(--v-font-body)',
                    fontSize: 'var(--v-text-sm)',
                    lineHeight: 1.5,
                  }}
                >
                  {p.examples.map((ex, j) => (
                    <li
                      key={j}
                      style={{
                        marginBottom: 4,
                        fontStyle: 'italic',
                      }}
                    >
                      {ex}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
