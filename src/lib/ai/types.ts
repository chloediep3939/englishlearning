import type { CompositionAiFeedback } from '@/lib/types';

/**
 * Generic AI provider failure (non-2xx response, network error, timeout).
 * Routes map this to HTTP 502.
 */
export class AIError extends Error {
  readonly status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = 'AIError';
    this.status = status;
  }
}

/**
 * Provider returned 429 (quota / rate limit). Routes map this to HTTP 429 so
 * the client UI can show a "try again later" message distinct from generic
 * AI failures. `retryAfterSeconds` is taken from the `Retry-After` response
 * header when present.
 */
export class AIQuotaError extends AIError {
  readonly retryAfterSeconds?: number;
  constructor(retryAfterSeconds?: number) {
    super('AI quota exceeded', 429);
    this.name = 'AIQuotaError';
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

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
