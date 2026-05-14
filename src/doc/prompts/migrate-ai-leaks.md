# Migrate AI leaks — final cleanup

_Date pasted: 2026-05-14_

## Goal

Remove AI calls from places where dedicated APIs (translation, dictionary) work better. After this + the cloze-pool + distractor migrations, AI is reserved strictly for: cloze pool generation, sentence/paragraph grading, on-demand grammar analysis.

## Doc workflow (CLAUDE.md §8)

- Save this prompt to `src/doc/prompts/migrate-ai-leaks.md`.
- Write result to `src/doc/results/migrate-ai-leaks-result.md`.

## Phase A — Discovery

Before any code change, do this and report findings:

1. **Read `src/lib/flashcards/translate.ts`** in full. What API does `translateEnToVi()` call? (Gemini? Google Translate? MS Translator? Something else?)
2. **Read `src/lib/flashcards/dictionary.ts`** in full. What does `lookupWord()` return? Does it include IPA? Pronunciation audio URL? What's the source API?
3. **Read `/api/cards/generate/route.ts`** in full. List EXACTLY which fields the AI prompt asks for (`ipa`, `meaning_vi`, `examples`, `collocations`, `image_prompt`, etc.).
4. **Grep** for any other usage of `getAIProvider` in `src/lib/flashcards/` and `src/app/api/` not already covered by prior migrations (cloze, distractor, article-grammar, compose, grading).

Print a short discovery report at the start of your reply before doing any edits. Wait for nothing — proceed with the migration tasks below based on findings.

## Phase B — Migration tasks

Each task is conditional on Phase A findings. Skip tasks that are already non-AI.

### B1. Translation (if `translateEnToVi` uses AI)

Goal: replace AI translation with a dedicated translation API.

**Recommended target**: Microsoft Translator free tier (2M characters/month, much more than this app needs).

Setup:
- Requires `AZURE_TRANSLATOR_KEY` + `AZURE_TRANSLATOR_REGION` env vars.
- ⚠️ **STOP AND ASK USER** before adding new env vars (CLAUDE.md §9 rule). Tell user: "Migrate `translateEnToVi` requires `AZURE_TRANSLATOR_KEY` + `AZURE_TRANSLATOR_REGION`. OK to proceed?"

If user approves:

```ts
// src/lib/flashcards/translate.ts
export async function translateEnToVi(text: string): Promise<string> {
  const key = process.env.AZURE_TRANSLATOR_KEY;
  const region = process.env.AZURE_TRANSLATOR_REGION;
  if (!key || !region) throw new Error('Azure Translator not configured');

  const url = `https://api.cognitive.microsofttranslator.com/translate?api-version=3.0&from=en&to=vi`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': key,
      'Ocp-Apim-Subscription-Region': region,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify([{ Text: text }]),
  });

  if (!res.ok) throw new Error(`Translator HTTP ${res.status}`);
  const data = await res.json() as Array<{ translations: Array<{ text: string }> }>;
  return data[0]?.translations[0]?.text ?? '';
}
```

If user declines or wants different provider:
- **Fallback option**: keep AI BUT trim the prompt to only ask for translation, nothing else. Reduces tokens.
- Note in result file: translation still using AI by user choice.

### B2. IPA (if cards/generate AI prompt asks for IPA)

Goal: get IPA from dictionary instead of AI.

Check `lookupWord()` discovery result:
- **If it already returns IPA** → use it directly in `cards/generate`. Stop asking AI for IPA. Saves tokens.
- **If it does NOT return IPA** → two options:
  - (a) **Extend `lookupWord()`** to include IPA from its existing dictionary source if available.
  - (b) **Add Free Dictionary API** as a separate util. No API key needed. Endpoint: `https://api.dictionaryapi.dev/api/v2/entries/en/<word>`. Response has `.phonetic` and `.phonetics[].text` fields with IPA.

  Pick (a) if `lookupWord()`'s source already has IPA in response but isn't exposing it. Pick (b) if its source doesn't have IPA.

If picking (b), create `src/lib/flashcards/ipa.ts`:

```ts
export async function fetchIpa(word: string): Promise<string | null> {
  try {
    const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word.toLowerCase())}`);
    if (!res.ok) return null;
    const data = await res.json() as Array<{ phonetic?: string; phonetics?: Array<{ text?: string }> }>;
    const entry = data[0];
    if (!entry) return null;
    if (entry.phonetic) return entry.phonetic;
    const fromArr = entry.phonetics?.find((p) => p.text)?.text;
    return fromArr ?? null;
  } catch {
    return null;
  }
}
```

Use in `cards/generate` parallel with translation/lookup, before AI call.

### B3. Refactor `/api/cards/generate` AI prompt

After B1 + B2, the AI prompt in `cards/generate` should drop fields now sourced elsewhere. Strip:

- `ipa` — from B2 (`lookupWord` or `fetchIpa`)
- `meaning_vi` — from B1 (`translateEnToVi`)
- `examples` — already removed by cloze-pool-3 (comes from pool)
- `collocations` — from Datamuse (`getCollocations`)
- `image_prompt` — from Pexels (already non-AI)

Whatever remains genuinely needs AI: probably nothing, or just a contextual meaning explanation if the project includes one.

**If after stripping, the AI prompt would be empty** → skip the AI call entirely. The card generation becomes:

```ts
const [ipa, meaningVi, collocations, imageUrl] = await Promise.all([
  fetchIpa(headword),              // or lookupWord-based
  translateEnToVi(headword),       // dedicated API
  getCollocations(headword),       // Datamuse
  fetchPexelsImage(headword),      // Pexels
]);
// then: save card with these fields
```

Parallel fetch is faster than sequential AI prompt anyway.

**If there's still 1 AI-only field needed** (e.g. detailed Vietnamese explanation with nuance, beyond word-for-word translation), keep a minimal AI call asking ONLY for that field. Should be much shorter than current prompt.

⚠️ Don't drop any DB columns. Just stop populating ones that are no longer relevant (per CLAUDE.md §9).

## Phase C — Verify catch-all

After B1-B3, grep one more time:

```bash
grep -rn "getAIProvider\|generateText" src/lib/flashcards/ src/app/api/cards/
```

Expected results:
- `src/lib/flashcards/cloze.ts` — used by `ensureClozePool` (kept)
- Nothing else in `src/app/api/cards/`

If anything else shows up, report it. May be a missed AI call.

## Constraints

- ⚠️ Adding env vars requires user confirmation (CLAUDE.md §9.3).
- D1 async + `.bind()`.
- No new npm packages (Microsoft Translator is plain `fetch`, no SDK needed).
- Preserve existing column shapes — only stop writing certain fields, don't drop them.
- Each `fetch` to external API: handle network errors gracefully (don't 500 the whole card creation if MS Translator is down — fallback to whatever degraded state).

## Verification

- Add a new word → check the new card in DB:
  - `ipa` column populated (from dictionary, not empty, not AI hallucination)
  - `meaning_vi` populated (from translation API)
  - `collocations` populated (from Datamuse)
  - `examples` field empty (now coming from cloze pool via separate endpoint)
- Check logs: NO Gemini call for card creation (unless minimal residual AI for nuance explanation).
- After cloze pool background gen completes: example sentences appear on card detail.
- `npm run build` passes.

## Out of scope

- UI changes (card detail display layer is unchanged).
- Backfilling old cards' IPA/meaning from new sources.
- Cache layer for translation calls (MS Translator free is 2M chars/month — way more than needed; cache later if scaling).
- Alternative translation providers beyond MS Translator (Google Translate, DeepL) — user's call if MS is rejected.
- Replacing `lookupWord()`'s underlying dictionary source.
