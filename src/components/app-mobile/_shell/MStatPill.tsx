'use client';

import Icon from '@/components/landing/shared/Icon';

// Small inline pill for showing stats in mobile headers (streak / gems /
// hearts). README §3 "Shared chrome → MStatPill".

interface Props {
  icon: string;
  value: string | number;
  color: string;
  fill?: string;
}

export default function MStatPill({ icon, value, color, fill }: Props) {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '5px 10px 5px 7px',
        background: '#fff',
        border: '1px solid var(--v-border)',
        borderRadius: 999,
        boxShadow: 'var(--v-shadow-sm)',
        fontFamily: 'var(--v-font-head)',
        fontWeight: 900,
        fontSize: 12,
        color: 'var(--v-ink)',
      }}
    >
      <Icon name={icon} size={14} fill={fill ?? color} stroke={color} strokeWidth={2.2} />
      <span>{value}</span>
    </div>
  );
}
