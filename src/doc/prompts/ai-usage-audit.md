# Prompt — AI usage audit

Date: 2026-05-14

---

# AI usage audit — <YYYY-MM-DD>

## Summary

- Total AI callers found: N
- Tier 1 (essential): N
- Tier 2 (downgradable): N
- Tier 3 (should not use AI): N

## AI callers — full inventory

### 1. /api/cards/generate
- **File**: src/app/api/cards/generate/route.ts
- **What AI does**: <e.g. "Generates JSON with fields: ipa, meaning_vi, examples (array of 3), collocations, image_prompt">
- **Prompt size**: ~X tokens (estimate from prompt template length)
- **Output size**: ~Y tokens (estimate from typical response)
- **Frequency**: 1 call per word added
- **Reduction opportunity**: <e.g. "IPA from dictionary; examples from cloze pool; collocations from Datamuse — could shrink to 0 AI calls if translation also non-AI">

[... repeat for each caller ...]

## Already non-AI (confirmation)

- `getCollocations()`: ✅ Datamuse API (https://api.datamuse.com/words?rel=...)
- `generateMisspellings()`: ✅ Algorithmic
- ...

## Should NOT be using AI (migration targets)

| Caller | Currently using | Should use | Priority |
|---|---|---|---|
| <example> `translateEnToVi()` | Gemini | MS Translator free tier | High |
| <example> Card IPA generation in /api/cards/generate | Gemini | lookupWord() dictionary | High |
| ... | | | |

## Already optimal

- `getCollocations()` — uses Datamuse, keep as-is
- `generateMisspellings()` — algorithmic, keep as-is
- ...

## Notes / surprises

<Anything unexpected found during grep — e.g. AI used in a place not listed above, dead code, deprecated paths>
