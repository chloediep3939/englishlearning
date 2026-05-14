import { NextResponse } from 'next/server';
import { requireUserId, UnauthorizedError } from '@/lib/current-user';
import { flashcardsDb } from '@/lib/db';
import { getAIProvider } from '@/lib/ai';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface SuggestBody {
  pool_word_ids?: unknown;
}

/**
 * Story-suggest endpoint for the compose flow. Given a vocabulary pool the
 * learner has just picked, returns a short English story (~150 words) that
 * uses every word naturally — the learner uses it as a starting point and
 * paraphrases/edits before submitting for evaluation.
 *
 * Read-only: doesn't persist anything. The generated text is opaque on the
 * server side; once it lands on the client, the user owns it (overwrites,
 * edits, deletes freely).
 */
export async function POST(req: Request) {
  try {
    const userId = await requireUserId();
    const body = (await req.json().catch(() => ({}))) as SuggestBody;

    if (!Array.isArray(body.pool_word_ids) || body.pool_word_ids.length === 0) {
      return NextResponse.json({ error: 'Pool rỗng.' }, { status: 400 });
    }
    const ids = (body.pool_word_ids as unknown[])
      .map((x) => Number(x))
      .filter((n) => Number.isInteger(n) && n > 0);
    if (ids.length === 0) {
      return NextResponse.json({ error: 'Pool rỗng.' }, { status: 400 });
    }
    // Defensive cap — story prompt with 100+ words gets unwieldy.
    const cappedIds = ids.slice(0, 50);

    const cards = await flashcardsDb.getByIds(userId, cappedIds);
    if (cards.length === 0) {
      return NextResponse.json({ error: 'Không tìm thấy thẻ nào.' }, { status: 400 });
    }

    const ai = await getAIProvider();
    if (!ai.available) {
      return NextResponse.json(
        { error: 'AI chưa được cấu hình. Liên hệ admin để bật tính năng này.' },
        { status: 503 },
      );
    }

    const prompt = buildStoryPrompt(cards.map((c) => ({
      english: c.english,
      vietnamese: c.vietnamese,
    })));

    let story: string | null;
    try {
      story = await ai.generateText(prompt, {
        temperature: 0.8,
        max_tokens: 600,
      });
    } catch (err) {
      console.error('[compose suggest] AI failure:', err);
      return NextResponse.json(
        { error: 'AI tạm thời không phản hồi. Thử lại nhé.' },
        { status: 502 },
      );
    }

    if (!story || story.trim().length === 0) {
      return NextResponse.json(
        { error: 'AI không tạo được câu chuyện. Thử lại nhé.' },
        { status: 502 },
      );
    }

    // Strip any markdown fences / "Story:" preambles the model occasionally
    // adds despite the prompt — keep just the prose.
    const cleaned = story
      .trim()
      .replace(/^```(?:\w+)?\s*/i, '')
      .replace(/\s*```$/i, '')
      .replace(/^(story|here is.*?|the story.*?):?\s*\n+/i, '')
      .trim();

    return NextResponse.json({ story: cleaned });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[compose suggest] error:', err);
    return NextResponse.json({ error: 'Internal error.' }, { status: 500 });
  }
}

function buildStoryPrompt(pool: Array<{ english: string; vietnamese: string }>): string {
  const list = pool.map((w, i) => `${i + 1}. ${w.english} (${w.vietnamese})`).join('\n');
  return `You are helping a Vietnamese English learner who is about to write a short composition. They have selected this vocabulary pool to practice:

${list}

Write a short, coherent English story (120–180 words) that uses EVERY word from the pool at least once. Constraints:

- Use natural, intermediate-level English. Aim for B1–B2 difficulty.
- Each pool word should appear in a sentence that demonstrates its meaning, not just shoehorned in.
- Inflections (plurals, tenses) are fine and encouraged where natural.
- One paragraph or two short paragraphs — no headings, no bullet lists.
- Plain text only. No markdown, no quotation marks around the story, no preamble like "Here is a story:". Just the story itself.

Tone: engaging but simple. Topic: pick whatever context makes the words flow together naturally (workplace, travel, family, a small dilemma, a personal story — your call).`;
}
