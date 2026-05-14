'use client';

import { Suspense, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Layers, Type } from 'lucide-react';
import SingleImport from './single-import';
import BulkImport from './bulk-import';

type Tab = 'single' | 'bulk';

function AddTabsInner() {
  const router = useRouter();
  const params = useSearchParams();
  const rawTab = params.get('tab');
  const tab: Tab = rawTab === 'bulk' ? 'bulk' : 'single';

  const setTab = useCallback(
    (next: Tab) => {
      if (next === tab) return;
      const sp = new URLSearchParams(params.toString());
      if (next === 'single') sp.delete('tab');
      else sp.set('tab', next);
      const qs = sp.toString();
      router.replace(qs ? `/add?${qs}` : '/add');
    },
    [params, router, tab]
  );

  return (
    <div>
      <div
        role="tablist"
        style={{
          display: 'inline-flex',
          gap: 4,
          padding: 4,
          background: 'var(--v-panel)',
          border: '1px solid var(--v-border)',
          borderRadius: 999,
          marginBottom: 22,
        }}
      >
        <TabButton
          active={tab === 'single'}
          onClick={() => setTab('single')}
          icon={<Type size={14} strokeWidth={2.4} />}
          label="Một từ"
        />
        <TabButton
          active={tab === 'bulk'}
          onClick={() => setTab('bulk')}
          icon={<Layers size={14} strokeWidth={2.4} />}
          label="Nhiều từ"
        />
      </div>

      {tab === 'single' ? <SingleImport /> : <BulkImport />}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '8px 16px',
        background: active ? 'var(--v-primary-soft)' : 'transparent',
        color: active ? 'var(--v-primary)' : 'var(--v-ink-soft)',
        border: 'none',
        borderRadius: 999,
        fontFamily: 'var(--v-font-head)',
        fontWeight: 900,
        fontSize: 12,
        letterSpacing: '0.04em',
        cursor: 'pointer',
        transition: 'background 150ms var(--v-ease), color 150ms var(--v-ease)',
      }}
    >
      {icon}
      {label}
    </button>
  );
}

export default function AddTabs() {
  // useSearchParams requires a Suspense boundary in Next 16. Wrap here so
  // the page.tsx stays a thin server-component shell.
  return (
    <Suspense fallback={null}>
      <AddTabsInner />
    </Suspense>
  );
}
