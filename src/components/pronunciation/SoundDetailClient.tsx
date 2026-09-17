'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Check, Mic } from 'lucide-react';
import type { Sound } from '@/lib/pronunciation/catalog-meta';
import { GROUP_META } from '@/lib/pronunciation/catalog-meta';
import type { PronunciationProgressRow } from '@/lib/db';
import SoundVideoPanel from './SoundVideoPanel';
import TipsPanel from './TipsPanel';
import ExampleWordList from './ExampleWordList';
import ReadScorePanel from './ReadScorePanel';
import YouglishWidget from './YouglishWidget';
import SoundMinimalPairs from './SoundMinimalPairs';
import SectionCard from './SectionCard';
import { getMinimalPairSetsForSlug } from '@/lib/pronunciation/minimal-pairs';

interface Props {
  sound: Sound;
  initialProgress: PronunciationProgressRow | null;
}

export default function SoundDetailClient({ sound, initialProgress }: Props) {
  const [progress, setProgress] = useState<PronunciationProgressRow | null>(initialProgress);
  const [saving, setSaving] = useState(false);
  const meta = GROUP_META[sound.group];
  const completed = progress?.completed ?? false;
  const hasPairs = getMinimalPairSetsForSlug(sound.slug).length > 0;

  const post = useCallback(
    async (body: Record<string, unknown>) => {
      const res = await fetch('/api/pronunciation/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('save failed');
      const data = (await res.json()) as { progress: PronunciationProgressRow | null };
      setProgress(data.progress ?? null);
    },
    [],
  );

  const toggleCompleted = useCallback(async () => {
    const next = !completed;
    setSaving(true);
    try {
      await post({ slug: sound.slug, action: next ? 'complete' : 'uncomplete' });
    } catch {
      /* keep previous state on failure */
    } finally {
      setSaving(false);
    }
  }, [completed, post, sound.slug]);

  return (
    <div style={{ width: '100%' }}>
      <Link
        href="/pronunciation"
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
        <ArrowLeft size={14} /> Tất cả các âm
      </Link>

      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          padding: 20,
          background: 'var(--v-surface)',
          border: `1px solid var(--v-border)`,
          borderLeft: `4px solid ${meta.color}`,
          borderRadius: 'var(--v-radius-lg)',
          boxShadow: 'var(--v-shadow-sm)',
          marginBottom: 18,
        }}
      >
        <div
          style={{
            fontFamily: 'var(--v-font-mono)',
            fontSize: 'var(--v-text-5xl)',
            fontWeight: 700,
            color: meta.color,
            lineHeight: 1,
          }}
        >
          /{sound.ipa}/
        </div>
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontFamily: 'var(--v-font-head)',
              fontWeight: 900,
              fontSize: 'var(--v-text-xl)',
              color: 'var(--v-ink)',
            }}
          >
            {sound.name}
          </div>
          <div style={{ color: 'var(--v-muted)', fontSize: 'var(--v-text-sm)' }}>
            {meta.label} · {meta.sub}
          </div>
        </div>
        <button
          type="button"
          onClick={toggleCompleted}
          disabled={saving}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '9px 14px',
            background: completed ? 'var(--v-primary)' : 'var(--v-surface)',
            color: completed ? '#fff' : 'var(--v-ink-soft)',
            border: `1px solid ${completed ? 'var(--v-primary)' : 'var(--v-border)'}`,
            borderRadius: 'var(--v-radius-md)',
            fontFamily: 'var(--v-font-head)',
            fontWeight: 800,
            fontSize: 'var(--v-text-sm)',
            cursor: saving ? 'default' : 'pointer',
            opacity: saving ? 0.6 : 1,
            whiteSpace: 'nowrap',
          }}
        >
          <Check size={15} strokeWidth={3} />
          {completed ? 'Đã học xong' : 'Đánh dấu đã học'}
        </button>
      </div>

      <SectionCard title="Video hướng dẫn & khẩu hình" color={meta.color}>
        <SoundVideoPanel sound={sound} />
      </SectionCard>

      {/* Two columns on wide screens; stacks on narrow. Left = practice
          (read/record + YouGlish), right = reference (tips + examples). */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: 16,
          alignItems: 'start',
        }}
      >
        <div>
          <SectionCard title="Đọc & nghe lại giọng mình" color="var(--v-primary)">
            <ReadScorePanel sound={sound} />
          </SectionCard>

          <SectionCard title="Nghe người bản xứ (YouGlish)" color="var(--v-pink)">
            <YouglishWidget initialQuery={sound.examples[0]?.word ?? ''} examples={sound.examples} />
          </SectionCard>
        </div>

        <div>
          <SectionCard title="Mẹo đọc & so với tiếng Việt" color="var(--v-orange)">
            <TipsPanel sound={sound} />
          </SectionCard>

          <SectionCard title={`Ví dụ (${sound.examples.length} từ)`} color="var(--v-blue)">
            <ExampleWordList examples={sound.examples} />
          </SectionCard>
        </div>
      </div>

      {hasPairs && (
        <SectionCard title={`So sánh cặp từ có âm /${sound.ipa}/`} color="var(--v-purple)">
          <SoundMinimalPairs slug={sound.slug} />
        </SectionCard>
      )}

      <div style={{ textAlign: 'center', margin: '18px 0 8px' }}>
        <Link
          href="/pronounce"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 16px',
            background: 'var(--v-surface)',
            color: 'var(--v-ink-soft)',
            border: '1px solid var(--v-border)',
            borderRadius: 'var(--v-radius-md)',
            textDecoration: 'none',
            fontFamily: 'var(--v-font-head)',
            fontWeight: 800,
            fontSize: 'var(--v-text-sm)',
          }}
        >
          <Mic size={15} style={{ color: 'var(--v-red)' }} /> Luyện phát âm từ flashcards của bạn →
        </Link>
      </div>
    </div>
  );
}
