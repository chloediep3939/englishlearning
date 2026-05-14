import { getCloudflareContext } from '@opennextjs/cloudflare';
import { makeGeminiProvider } from './gemini';
import type { AIProvider } from './types';

declare global {
  interface CloudflareEnv {
    AI_PROVIDER?: string;
  }
}

const noopProvider: AIProvider = {
  name: 'noop',
  available: false,
  async generateText() { return null; },
  async evaluateComposition(pool) {
    const word_usage: Record<string, boolean> = {};
    for (const w of pool) word_usage[w.english] = false;
    return {
      coherence_score: 0,
      word_usage,
      issues: [],
      suggested_additions: [],
      passed: false,
    };
  },
};

/**
 * Returns the configured AI provider. Reads env via Cloudflare context
 * (NOT process.env) because OpenNext exposes `.dev.vars` / Worker secrets
 * through the context only.
 */
export async function getAIProvider(): Promise<AIProvider> {
  const { env } = await getCloudflareContext({ async: true });
  const which = (env.AI_PROVIDER ?? 'gemini').toLowerCase();
  if (which === 'gemini' || which === '') {
    return makeGeminiProvider(env.GEMINI_API_KEY);
  }
  return noopProvider;
}

export type { AIProvider } from './types';
export { AIError, AIQuotaError } from './types';
