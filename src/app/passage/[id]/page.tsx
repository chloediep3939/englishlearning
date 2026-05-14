'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import type { Passage } from '@/lib/types';
import KaraokeReader from '@/components/passage/KaraokeReader';
import GrammarSection from '@/components/passage/GrammarSection';
import LoadingState from '@/components/common/LoadingState';
import { apiJson } from '@/lib/common/api-json';

export default function PassageDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [passage, setPassage] = useState<Passage | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    apiJson<{ passage: Passage }>(`/api/passages/${params.id}`)
      .then(({ passage }) => {
        if (cancelled) return;
        setPassage(passage);
      })
      .catch(() => {
        if (!cancelled) router.push('/passage');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [params.id, router]);

  if (loading) {
    return <LoadingState message="Đang tải bài đọc…" />;
  }
  if (!passage) return null;

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
          margin: '0 0 18px',
          fontFamily: 'var(--v-font-head)',
          fontWeight: 900,
          fontSize: 'var(--v-text-3xl)',
          letterSpacing: 'var(--v-tracking-tight)',
          color: 'var(--v-ink)',
        }}
      >
        {passage.title}
      </h1>

      <KaraokeReader passageId={passage.id} content={passage.content} />

      <GrammarSection
        passageId={passage.id}
        initialAnalysis={passage.grammar_analysis}
      />
    </div>
  );
}
