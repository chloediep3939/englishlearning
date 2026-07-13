import { NextResponse } from 'next/server';
import { requireUserId, UnauthorizedError } from '@/lib/current-user';
import { getAIProvider } from '@/lib/ai';
import { AIError, AIQuotaError } from '@/lib/ai';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_SENTENCES = 80;
const MAX_SENTENCE_CHARS = 400;

interface AiChunkResult {
  i: number;
  chunks: string[];
  stress: string[];
}

function buildPrompt(sentences: string[]): string {
  const numbered = sentences.map((s, i) => `${i}: ${s}`).join('\n');
  return `You are a PTE Academic speaking coach. Split each English sentence below into "thought groups" (chunks) for Read Aloud practice, and list the stressed content words.

Rules:
- Chunks are typically 2–6 words: break at punctuation, before conjunctions, relative clauses, and long prepositional phrases.
- Reproduce the sentence words EXACTLY and in order — every word appears in exactly one chunk, no words added, removed, or changed.
- "stress" lists the content words a reader should emphasize (nouns, main verbs, adjectives, adverbs), lowercase.

Return ONLY a JSON array, no prose, one item per sentence:
[{"i": <sentence index>, "chunks": ["...", "..."], "stress": ["word", "..."]}]

Sentences:
${numbered}`;
}

/**
 * POST /api/reading/chunk-analyze
 *
 * Id-less (works for read-once too): takes raw sentences, returns AI thought
 * groups + stressed words. No caching — chunk practice is session-scoped.
 * Word-count validation happens client-side against the tokenizer
 * (alignChunksToBreaks); this route only shape-checks the AI output.
 */
export async function POST(req: Request) {
  try {
    await requireUserId();
    const body = (await req.json().catch(() => ({}))) as { sentences?: unknown };
    if (!Array.isArray(body.sentences) || body.sentences.length === 0) {
      return NextResponse.json({ error: 'sentences[] required.' }, { status: 400 });
    }
    if (body.sentences.length > MAX_SENTENCES) {
      return NextResponse.json({ error: `Too many sentences (max ${MAX_SENTENCES}).` }, { status: 400 });
    }
    const sentences = body.sentences.map((s) => String(s).slice(0, MAX_SENTENCE_CHARS));

    const ai = await getAIProvider();
    if (!ai.available) {
      return NextResponse.json({ error: 'AI not configured.' }, { status: 503 });
    }

    const raw = await ai.generateText(buildPrompt(sentences), {
      json: true,
      temperature: 0.2,
      max_tokens: 8000,
    });
    if (!raw) {
      return NextResponse.json({ error: 'Empty AI response.' }, { status: 502 });
    }

    // Same fence-stripping as flashcards/cloze — Gemini may wrap in ```json.
    const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
    let parsed: unknown;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      return NextResponse.json({ error: 'AI returned invalid JSON.' }, { status: 502 });
    }
    if (!Array.isArray(parsed)) {
      return NextResponse.json({ error: 'AI returned unexpected shape.' }, { status: 502 });
    }

    const results: AiChunkResult[] = [];
    for (const item of parsed) {
      if (typeof item !== 'object' || item === null) continue;
      const o = item as Record<string, unknown>;
      const i = Number(o.i);
      if (!Number.isInteger(i) || i < 0 || i >= sentences.length) continue;
      const chunks = Array.isArray(o.chunks) ? o.chunks.map(String) : null;
      if (!chunks || chunks.length === 0) continue;
      const stress = Array.isArray(o.stress) ? o.stress.map(String) : [];
      results.push({ i, chunks, stress });
    }

    return NextResponse.json({ results });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (err instanceof AIQuotaError) {
      return NextResponse.json({ error: 'AI quota exceeded — try again later.' }, { status: 429 });
    }
    if (err instanceof AIError) {
      return NextResponse.json({ error: 'AI request failed.' }, { status: 502 });
    }
    console.error('[reading/chunk-analyze POST] error:', err);
    return NextResponse.json({ error: 'Internal error.' }, { status: 500 });
  }
}
