'use client';

import { useMemo } from 'react';
import ReadAlong from '@/components/reading/ReadAlong';
import { parseManualBreaks } from '@/lib/reading/chunker';

interface Props {
  /** Shown as the reader title (template title or fill topic). */
  title: string;
  /** Text to read: stripSlots(frame) or a fill's filled_text — keeps "/" markers. */
  text: string;
  initialRate: number;
  initialAuto: boolean;
  /** Gap between chunks in chunk-practice auto-read (`chunk_pause_ms` setting). */
  chunkPauseMs?: number;
  onBack: () => void;
}

/** Karaoke mode for templates — exactly the read-once wiring: ephemeral
 *  passage (id 0), chunk breaks seeded from the "/" markers in the text. */
export default function TemplateKaraoke({ title, text, initialRate, initialAuto, chunkPauseMs, onBack }: Props) {
  const parsed = useMemo(() => parseManualBreaks(text), [text]);
  const wordCount = parsed.content.trim().match(/\S+/g)?.length ?? 0;

  return (
    <ReadAlong
      passage={{
        id: 0,
        title,
        content: parsed.content,
        word_count: wordCount,
        level_estimate: null,
      }}
      initialRate={initialRate}
      initialAuto={initialAuto}
      initialDeckId={null}
      decks={[]}
      ephemeral
      backHref="/templates"
      onBack={onBack}
      seedBreaks={parsed.breakWordIndices}
      chunkPauseMs={chunkPauseMs}
    />
  );
}
