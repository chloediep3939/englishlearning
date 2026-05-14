import type { CompositionAiFeedback } from '@/lib/types';

export interface AIGenerateOptions {
  max_tokens?: number;
  temperature?: number;
  json?: boolean;
}

export interface CompositionPoolWord {
  english: string;
  vietnamese: string;
}

export interface AIProvider {
  readonly available: boolean;
  readonly name: string;
  generateText(prompt: string, options?: AIGenerateOptions): Promise<string | null>;
  /**
   * Grade a learner composition against a fixed vocabulary pool.
   * Throws on transient AI / parse failure so the route can return 502.
   * When the provider is unavailable, returns a zero-score fallback payload
   * (route handlers should pre-check `available` and return 503 instead).
   */
  evaluateComposition(
    pool: CompositionPoolWord[],
    content: string,
  ): Promise<CompositionAiFeedback>;
}
