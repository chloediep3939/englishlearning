/**
 * Convert an inflected English word to its base (lemma) form before saving
 * it as a flashcard headword. Multi-word inputs (phrases) are returned as-is
 * — the user adds "kick the bucket" verbatim, but "boxes" → "box",
 * "ran" → "run", "tries" → "try".
 *
 * Strategy: ask Gemini for the lemma (handles irregulars: ran→run, went→go,
 * was→be). If the AI provider is unavailable or returns junk, fall back to a
 * conservative regex stripper that only touches very obvious -s/-es/-ies/-ed
 * suffixes. The regex is intentionally narrow — it would rather leave a word
 * unchanged than misfire on "preferential" or "bias".
 */
import { getAIProvider } from '@/lib/ai';

export async function lemmatize(word: string): Promise<string> {
  const w = word.trim();
  if (!w) return w;
  // Phrase → leave alone. Hyphenated single words like "well-known" still
  // go through (no space).
  if (/\s/.test(w)) return w;
  // Strict ASCII letters / apostrophe / hyphen only — bail on anything weird.
  if (!/^[a-zA-Z][a-zA-Z'-]*$/.test(w)) return w;

  const lower = w.toLowerCase();

  // Try AI first.
  try {
    const ai = await getAIProvider();
    if (ai.available) {
      const prompt =
        `Return the base/lemma form of the English single word "${lower}".\n` +
        `Rules:\n` +
        `- If it is in past tense or past participle, return the base verb (ran -> run, walked -> walk, taken -> take).\n` +
        `- If it has a 3rd-person-singular or plural -s/-es/-ies suffix, return the singular/base (boxes -> box, tries -> try, goes -> go).\n` +
        `- If it is in -ing form, return the base verb (running -> run).\n` +
        `- If it is already in base form (preferential, happy, box), return it unchanged.\n` +
        `Output: a single lowercase word, no quotes, no punctuation, no explanation.`;
      const raw = await ai.generateText(prompt, { temperature: 0, max_tokens: 16 });
      const cleaned = cleanLemmaResponse(raw);
      if (cleaned) return cleaned;
    }
  } catch (err) {
    console.warn('[lemmatize] AI failed, using regex fallback:', err);
  }

  // Fallback: regex.
  return regexLemma(lower);
}

function cleanLemmaResponse(raw: string | null): string | null {
  if (!raw) return null;
  // Take first line, strip quotes/punctuation, allow only a-z and hyphen.
  const first = raw.trim().split(/\r?\n/, 1)[0] ?? '';
  const stripped = first
    .replace(/^["'`\s]+|["'`\s.,!?:;]+$/g, '')
    .trim()
    .toLowerCase();
  if (!stripped) return null;
  if (!/^[a-z][a-z'-]*$/.test(stripped)) return null;
  // Sanity cap — if the model went off the rails and emitted a paragraph,
  // bail. A real lemma is short.
  if (stripped.length > 40) return null;
  return stripped;
}

/**
 * Narrow rule-based fallback. Conservative on purpose — many endings like
 * `-al`, `-ial`, `-ous`, `-ic` look like suffixes but aren't inflections.
 * We only handle the very obvious cases the user explicitly called out
 * (past `-ed`, plural / 3rd-person `-s` / `-es` / `-ies`).
 */
function regexLemma(w: string): string {
  if (w.length < 4) return w;

  // -ies → -y (tries → try, flies → fly). Min length 5 to avoid "pies" → "py".
  if (w.length >= 5 && w.endsWith('ies')) {
    return w.slice(0, -3) + 'y';
  }

  // -es after sibilants (x, sh, ch, ss, zz) → strip -es.
  // boxes → box, dishes → dish, watches → watch, kisses → kiss.
  if (w.endsWith('es') && /(s|x|z|sh|ch)es$/.test(w)) {
    return w.slice(0, -2);
  }

  // Past tense -ied → -y (tried → try, studied → study).
  if (w.length >= 5 && w.endsWith('ied')) {
    return w.slice(0, -3) + 'y';
  }

  // -ed → strip. "walked" → "walk", "looked" → "look".
  // Skip if double-consonant before -ed → strip one consonant too
  // (stopped → stop). Conservative: only strip when result length >= 3.
  if (w.length >= 5 && w.endsWith('ed')) {
    const stem = w.slice(0, -2);
    // double consonant: stopped → stop, planned → plan
    const m = /([bcdfghjklmnpqrstvwxz])\1$/.exec(stem);
    if (m) return stem.slice(0, -1);
    return stem;
  }

  // Plural / 3rd-person -s. Avoid stripping words that already end -ss,
  // -us, -is (already non-plural / Latin endings like "bias", "thesis").
  // Also skip very short words ("is", "as", "us").
  if (w.length >= 4 && w.endsWith('s') && !/(ss|us|is)$/.test(w)) {
    return w.slice(0, -1);
  }

  return w;
}
