# article-simplify-1-backend (2026-05-14)

# Article reading — Part 1/3: Strip AI from backend

## Goal

Remove ALL automatic AI calls from the article submit/save flow. Article submission becomes plain CRUD save: validate text, store, return ID. CEFR, summary, vocab suggestions, themes → all gone from the auto-flow. (Grammar analysis comes back as on-demand in Part 3.)

## Doc workflow

- Save to `src/doc/prompts/article-simplify-1-backend.md`.
- Append "Part 1" to `src/doc/results/article-simplify-result.md`.

## Pre-reading

Grep to find:
- Article submit/save endpoint: `grep -rn "article\|passage\|reading" src/app/api/`
- Article DB table schema: `grep -rn "CREATE TABLE.*article\|CREATE TABLE.*passage" migrations/`
- Wherever the article AI grading prompt is constructed.

Likely paths (verify):
- `src/app/api/article/grade/route.ts` or `src/app/api/article/save/route.ts` or similar
- `src/lib/article/*.ts`

## Changes

### Endpoint

In the article submit route handler:

1. **Remove** all AI calls. Strip the imports, the prompt construction, the parsing, error handling for AI.
2. **Keep**: validate input (`title`, `content`), check user auth via `requireUserId()`, save row to DB, return saved record.
3. **Stop populating** these columns (don't drop them — CLAUDE.md §9 forbids dropping columns without explicit user confirmation). Just leave them NULL going forward:
   - `cefr` / `cefr_level`
   - `summary`
   - `vocab_suggestions` / `suggested_vocab`
   - `themes` / `topics`
   - Any other AI-generated metadata column

Verify exact column names by reading the article table migration. The list above is illustrative.

### Response shape

The endpoint now returns:

```ts
{
  id: number,
  title: string,
  content: string,
  created_at: string,
}
```

Drop fields that came from AI in the response. Frontend (Part 2) won't expect them anymore.

### Naming

If the existing endpoint is `/api/article/grade` (implying AI grading) — keep the path for now to avoid breaking the frontend. Rename can be a separate refactor. Note in result file that this name is misleading post-strip.

## Out of scope

- Dropping unused columns (defer; possibly never — cheap to keep).
- Frontend changes (Part 2 + 3).
- Grammar analysis endpoint (Part 3).
- Reading the existing articles' AI-populated fields — they stay populated for old rows, just null for new ones.

## Constraints

- `requireUserId()` for auth.
- D1 async + `.bind()`.
- `runtime = 'nodejs'`.
- No new packages.
- TypeScript strict.

## Verification

- Submit a new article via the existing flow → row appears in DB with `content` filled, AI columns NULL, no AI call in logs.
- `grep getAIProvider src/app/api/article/` → returns nothing for the submit endpoint (other article endpoints may still use AI — that's Part 3's concern).
- Old articles (with AI fields populated) still readable.
- `npm run build` passes.

## Next

Part 2: TTS karaoke UI (`article-simplify-2-tts.md`).
Part 3: Grammar button + on-demand AI endpoint (`article-simplify-3-grammar.md`).
