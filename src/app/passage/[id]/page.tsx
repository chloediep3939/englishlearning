'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import type { Passage } from '@/lib/types';
import PassageWizardTabs, { type StepNumber } from '@/components/PassageWizardTabs';
import PassageStep1Edit from '@/components/passage/PassageStep1Edit';
import PassageStep2Difficulty from '@/components/passage/PassageStep2Difficulty';
import PassageStep3Reader from '@/components/passage/PassageStep3Reader';
import PassageStep7Translate from '@/components/passage/PassageStep7Translate';
import PassageStep8Paraphrase from '@/components/passage/PassageStep8Paraphrase';
import LoadingState from '@/components/common/LoadingState';
import { apiJson } from '@/lib/common/api-json';

const VALID_STEPS: ReadonlySet<StepNumber> = new Set([1, 2, 3, 7, 8] as const);

export default function PassageDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [passage, setPassage] = useState<Passage | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<StepNumber>(1);

  useEffect(() => {
    let cancelled = false;
    apiJson<{ passage: Passage }>(`/api/passages/${params.id}`)
      .then(({ passage }) => {
        if (cancelled) return;
        setPassage(passage);
        const last = passage.last_step_viewed as StepNumber;
        setStep(VALID_STEPS.has(last) ? last : 1);
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

  // Debounced persistence of the active step.
  useEffect(() => {
    if (!passage) return;
    if (passage.last_step_viewed === step) return;
    const t = setTimeout(() => {
      fetch(`/api/passages/${passage.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ last_step_viewed: step }),
      }).catch(() => {
        /* non-critical; user can navigate freely */
      });
    }, 500);
    return () => clearTimeout(t);
  }, [step, passage]);

  const refreshPassage = useCallback(async () => {
    const res = await fetch(`/api/passages/${params.id}`);
    if (!res.ok) return;
    const { passage } = (await res.json()) as { passage: Passage };
    setPassage(passage);
  }, [params.id]);

  if (loading) {
    return <LoadingState message="Đang tải bài đọc…" />;
  }
  if (!passage) return null;

  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginBottom: 12,
        }}
      >
        <Link
          href="/passage"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            fontSize: 'var(--v-text-sm)',
            color: 'var(--v-muted)',
            textDecoration: 'none',
            flexShrink: 0,
          }}
        >
          <ArrowLeft size={14} /> Thư viện
        </Link>
        <h1
          style={{
            flex: 1,
            margin: 0,
            fontFamily: 'var(--v-font-head)',
            fontWeight: 800,
            fontSize: 'var(--v-text-lg)',
            color: 'var(--v-ink)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            textAlign: 'center',
          }}
        >
          {passage.title}
        </h1>
        {/* spacer so the title stays visually centred */}
        <div style={{ width: 90, flexShrink: 0 }} />
      </div>

      <PassageWizardTabs current={step} onChange={setStep} />

      <div style={{ marginTop: 18 }}>
        {step === 1 && <PassageStep1Edit passage={passage} onSaved={refreshPassage} />}
        {step === 2 && <PassageStep2Difficulty passage={passage} onAnalyzed={refreshPassage} />}
        {step === 3 && <PassageStep3Reader passage={passage} />}
        {step === 7 && <PassageStep7Translate passage={passage} />}
        {step === 8 && <PassageStep8Paraphrase passage={passage} />}
      </div>
    </div>
  );
}
