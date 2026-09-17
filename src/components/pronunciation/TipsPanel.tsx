import type { Sound } from '@/lib/pronunciation/catalog-meta';
import { FeedbackSection } from '@/components/common/FeedbackSection';

export default function TipsPanel({ sound }: { sound: Sound }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <FeedbackSection title="Cách đọc" color="var(--v-primary)">
        <p style={{ margin: 0, color: 'var(--v-ink-soft)', fontSize: 'var(--v-text-md)', lineHeight: 1.6 }}>
          {sound.tipsVi}
        </p>
      </FeedbackSection>
      <FeedbackSection title="So với tiếng Việt" color="var(--v-orange)">
        <p style={{ margin: 0, color: 'var(--v-ink-soft)', fontSize: 'var(--v-text-md)', lineHeight: 1.6 }}>
          {sound.contrastVi}
        </p>
      </FeedbackSection>
    </div>
  );
}
