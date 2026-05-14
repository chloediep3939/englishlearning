'use client';

export type StepNumber = 1 | 2 | 3 | 7 | 8;

interface Props {
  current: StepNumber;
  onChange: (step: StepNumber) => void;
}

const TABS: Array<{ n: StepNumber; label: string }> = [
  { n: 1, label: '1. Bài' },
  { n: 2, label: '2. Độ khó' },
  { n: 3, label: '3. Đọc' },
  { n: 7, label: '7. Dịch' },
  { n: 8, label: '8. Viết lại' },
];

export default function PassageWizardTabs({ current, onChange }: Props) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 2,
        borderBottom: '1px solid var(--v-border)',
        overflowX: 'auto',
      }}
    >
      {TABS.map((tab) => {
        const active = tab.n === current;
        return (
          <button
            key={tab.n}
            type="button"
            onClick={() => onChange(tab.n)}
            style={{
              padding: '10px 16px',
              marginBottom: -1,
              borderTop: 'none',
              borderLeft: 'none',
              borderRight: 'none',
              borderBottom: active ? '2px solid var(--v-primary)' : '2px solid transparent',
              background: 'transparent',
              color: active ? 'var(--v-primary)' : 'var(--v-muted)',
              fontFamily: 'var(--v-font-body)',
              fontWeight: active ? 800 : 700,
              fontSize: 'var(--v-text-sm)',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
