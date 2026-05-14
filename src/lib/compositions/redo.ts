import type { CompositionSource, Flashcard } from '@/lib/types';

/**
 * Shape stored in sessionStorage when the user clicks "Viết lại với pool này"
 * on the history detail page. The /compose page reads + clears this on mount
 * and jumps straight to the editor with the same pool. Kept in its own
 * client-safe module so neither the page nor the detail component has to
 * import across the app/ <-> components/ boundary.
 */
export interface ComposeRedoPayload {
  source: CompositionSource;
  source_deck_id: number | null;
  words: Flashcard[];
}

export const REDO_STORAGE_KEY = 'compose:redo';
