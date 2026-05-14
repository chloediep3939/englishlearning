# article-simplify-3-grammar (2026-05-14)

# Article reading — Part 3/3: Grammar button (on-demand AI)

## Prerequisite

Parts 1 & 2 done. Article saved without AI, TTS karaoke working.

## Goal

Add a "Tìm hiểu grammar patterns" button below the article. On click, fires an AI call that analyzes grammar patterns in the article, returns structured result. Cache by article content hash so the same article doesn't re-bill.

## Doc workflow

- Save to `src/doc/prompts/article-simplify-3-grammar.md`.
- Append "Part 3" to `src/doc/results/article-simplify-result.md`.

## Schema additions

Add columns to the article table (new migration):

```sql
ALTER TABLE <article_table_name> ADD COLUMN grammar_analysis TEXT;
ALTER TABLE <article_table_name> ADD COLUMN grammar_analyzed_at TEXT;
ALTER TABLE <article_table_name> ADD COLUMN content_hash TEXT;

CREATE INDEX idx_<article_table>_content_hash ON <article_table_name>(content_hash);
```

Verify exact table name (likely `articles`, `passages`, or `reading_passages`).

`grammar_analysis` = JSON-stringified analysis result. Format defined below.

`content_hash` = SHA-256 of article `content` (lowercase, trimmed). Used to find cache hits across articles with identical text.

Migration also: on existing rows, compute `content_hash` from `content` (one-time UPDATE). Do this in the migration SQL with a hash function — or as a separate post-migration script if D1 SQL doesn't support SHA-256.

⚠️ D1 doesn't have SHA-256 built-in. Two options:
- (a) Compute hash in TypeScript on next read of each article (lazy backfill).
- (b) Add a one-time admin endpoint to backfill all rows.

Recommend (a) for simplicity.

## Hash helper

`src/lib/article/hash.ts`:

```ts
export async function hashContent(content: string): Promise<string> {
  const normalized = content.trim().toLowerCase();
  const data = new TextEncoder().encode(normalized);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
```

`crypto.subtle` is available in Cloudflare Workers + browser. Safe to import from server route handler.

## New endpoint

`src/app/api/article/[id]/grammar/route.ts` (POST):

```ts
import { NextRequest, NextResponse } from 'next/server';
import { requireUserId } from '@/lib/current-user';
import { getDb } from '@/lib/db';
import { getAIProvider } from '@/lib/ai';
import { hashContent } from '@/lib/article/hash';

export const runtime = 'nodejs';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await requireUserId();
  const { id } = await params;
  const articleId = Number(id);

  const db = await getDb();
  const article = await db
    .prepare('SELECT * FROM <article_table> WHERE id = ? AND user_id = ?')
    .bind(articleId, userId)
    .first<{ id: number; content: string; grammar_analysis: string | null; content_hash: string | null }>();

  if (!article) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  // Cache check 1: this article already has analysis
  if (article.grammar_analysis) {
    return NextResponse.json({ analysis: JSON.parse(article.grammar_analysis), cached: true });
  }

  // Compute hash (lazy backfill if missing)
  const hash = article.content_hash ?? (await hashContent(article.content));
  if (!article.content_hash) {
    await db.prepare('UPDATE <article_table> SET content_hash = ? WHERE id = ?').bind(hash, articleId).run();
  }

  // Cache check 2: another article with same content already analyzed
  const cached = await db
    .prepare('SELECT grammar_analysis FROM <article_table> WHERE content_hash = ? AND grammar_analysis IS NOT NULL LIMIT 1')
    .bind(hash)
    .first<{ grammar_analysis: string }>();

  if (cached?.grammar_analysis) {
    // Copy cached analysis to this article
    await db
      .prepare('UPDATE <article_table> SET grammar_analysis = ?, grammar_analyzed_at = CURRENT_TIMESTAMP WHERE id = ?')
      .bind(cached.grammar_analysis, articleId)
      .run();
    return NextResponse.json({ analysis: JSON.parse(cached.grammar_analysis), cached: true });
  }

  // Cache miss → AI call
  const ai = await getAIProvider();
  const prompt = `Analyze the grammar patterns in this English text. Return ONLY a JSON object — no prose, no markdown fences:
{
  "patterns": [
    {
      "name": "Present perfect tense",
      "explanation_vi": "Diễn tả hành động bắt đầu trong quá khứ và còn liên quan đến hiện tại.",
      "examples": ["I have lived here for 5 years."]
    }
  ]
}

List 3-6 grammar patterns present in the text. Each with Vietnamese explanation + 1-2 example sentences extracted directly from the text.

Text:
${article.content}`;

  let analysisJson: string;
  try {
    const raw = await ai.generateText(prompt);
    const cleaned = raw.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
    JSON.parse(cleaned); // validate
    analysisJson = cleaned;
  } catch (err) {
    return NextResponse.json({ error: 'ai_error', message: 'AI lỗi, thử lại sau nha.' }, { status: 502 });
  }

  await db
    .prepare('UPDATE <article_table> SET grammar_analysis = ?, grammar_analyzed_at = CURRENT_TIMESTAMP WHERE id = ?')
    .bind(analysisJson, articleId)
    .run();

  return NextResponse.json({ analysis: JSON.parse(analysisJson), cached: false });
}
```

Replace `<article_table>` with actual table name.

## Frontend integration

In the article reader page (the one with `KaraokeReader` from Part 2):

```tsx
const [grammar, setGrammar] = useState<GrammarAnalysis | null>(null);
const [loading, setLoading] = useState(false);

async function fetchGrammar() {
  setLoading(true);
  try {
    const res = await fetch(`/api/article/${articleId}/grammar`, { method: 'POST' });
    const data = await res.json();
    if (res.ok) setGrammar(data.analysis);
    else alert(data.message ?? 'Lỗi rồi');
  } finally {
    setLoading(false);
  }
}

// Render below the article:
<button onClick={fetchGrammar} disabled={loading || grammar !== null}>
  {loading ? 'Đang phân tích...' : grammar ? 'Đã phân tích' : 'Tìm hiểu grammar patterns'}
</button>

{grammar && (
  <div>
    {grammar.patterns.map((p, i) => (
      <section key={i}>
        <h3>{p.name}</h3>
        <p>{p.explanation_vi}</p>
        <ul>{p.examples.map((ex, j) => <li key={j}>{ex}</li>)}</ul>
      </section>
    ))}
  </div>
)}
```

Style with inline + CSS vars per project convention.

If grammar was already analyzed (cached on first fetch), the button shows "Đã phân tích" and is disabled — UI loads it directly on page open instead.

## Edge cases

- AI quota error (429) → if `fix-gemini-429.md` was applied, response will be `{ error: 'ai_quota_exceeded' }`. Frontend should show that message specifically.
- Article too long for one AI call (>~10K tokens) → AI may truncate. Acceptable; document as limitation.
- User clicks button repeatedly while loading → disabled state prevents.

## Constraints

- `requireUserId()` for auth.
- D1 async + `.bind()`.
- `user_id` scoping on SELECT (multi-tenancy boundary).
- No new packages.
- `runtime = 'nodejs'`.
- Inline `style` + CSS vars on frontend.

## Verification

- Open an article, click "Tìm hiểu grammar patterns" → AI fires, response renders.
- Reload article → button shows "Đã phân tích", analysis renders immediately (from DB).
- Two users post the same article content → second user's click should be cache hit (no AI call). Check by adding a small log line on AI invocation.
- `npm run build` passes.

## Out of scope

- User editing the grammar analysis manually.
- Re-analysis on demand (force fresh AI call) — could add a "Regenerate" admin-only button later.
- Per-pattern highlighting in the article text (could be future: click a pattern → highlight its sentences in the article above).
- Other AI features mentioned in old article handoff (vocab suggestions, CEFR, summary) — explicitly out.
