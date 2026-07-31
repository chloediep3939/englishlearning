'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import FlashcardSession from './FlashcardSession';
import SessionPicker from './SessionPicker';
import { reviewConfig, studyConfig } from './configs';
import type { SessionAudioSettings, SessionMode } from './types';
import type { Flashcard } from '@/lib/types';

interface Props {
  mode: SessionMode;
  /** Candidate cards fetched server-side (new-for-today for study,
   *  due-for-review for review). The picker default-selects all of
   *  these and lets the user trim. */
  initialCards: Flashcard[];
  /** Reveal-autoplay settings, resolved server-side from FlashcardSettings. */
  audio: SessionAudioSettings;
  /** Pre-check the first N candidates instead of all. Used by /study to
   *  honor the user's `daily_new_limit` as a soft default while still
   *  letting them pick more via "Chọn hết". Omit for /review (default =
   *  all). */
  defaultPick?: number;
}

type Stage = 'picking' | 'studying';

/**
 * Two-stage flow wrapper for /study and /review. The page is still a
 * server component (it owns the data fetch); this client wrapper owns
 * the in-page transition picker → session → (Học thêm phiên nữa)
 * back to picker. No route change between stages.
 *
 * Re-fetch on "another session": after the user clicks "Học thêm phiên
 * nữa", we call router.refresh() so the server component re-runs and
 * re-passes `initialCards` with the latest SRS state (Tốt/Dễ'd cards
 * have their next_review_at pushed into the future, so they fall out of
 * the due-now query). The local `candidates` mirror is refreshed by the
 * effect below.
 */
export default function SessionFlow({ mode, initialCards, audio, defaultPick }: Props) {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>('picking');
  const [selected, setSelected] = useState<Flashcard[]>([]);
  const [candidates, setCandidates] = useState<Flashcard[]>(initialCards);

  // Sync candidates when the parent passes a fresh list (after refresh).
  useEffect(() => {
    setCandidates(initialCards);
  }, [initialCards]);

  const config = mode === 'study' ? studyConfig : reviewConfig;

  const handleStart = useCallback((picked: Flashcard[]) => {
    setSelected(picked);
    setStage('studying');
  }, []);

  const handleAnotherSession = useCallback(() => {
    // Re-fetch candidates from the server. router.refresh returns
    // synchronously; the new server-component render will replace
    // `initialCards` via the effect above. We optimistically flip
    // back to picking immediately — the picker will show the stale
    // candidates list until the refresh completes.
    router.refresh();
    setStage('picking');
    setSelected([]);
  }, [router]);

  if (stage === 'picking') {
    return (
      <SessionPicker
        mode={mode}
        candidates={candidates}
        onStart={handleStart}
        defaultPick={defaultPick}
      />
    );
  }
  return (
    <FlashcardSession cards={selected} config={config} audio={audio} onAnotherSession={handleAnotherSession} />
  );
}
