# Authoring a preset deck content file

Preset decks ("Thư viện bộ từ") are split by `scripts/build-preset-decks.mjs`
into `manifest.json`. Each deck's card content lives in
`content/preset-decks/<deck code>.json` and is seeded into D1 by
`scripts/gen-preset-decks-seed.mjs`. The file is in the same shape as Bún's
deck import format (`public/deck-sample.json`), so it can also be imported
directly.

## File shape

```json
{
  "version": 1,
  "deck": {
    "name": "<manifest deck name>",
    "description": "<level description from manifest>",
    "color": "#3da9fc",
    "icon": "BookOpen",
    "subtitle": "<deck code>"
  },
  "cards": [
    {
      "english": "analyse",
      "vietnamese": "phân tích",
      "part_of_speech": "verb",
      "examples": [
        { "en": "...", "vi": "..." },
        { "en": "...", "vi": "..." },
        { "en": "...", "vi": "..." }
      ],
      "collocations": ["analyse data", "carefully analyse"],
      "notes": null
    }
  ]
}
```

- `color` / `icon`: NGSL decks → `#3da9fc` / `BookOpen`; AWL decks → `#a974ff` / `GraduationCap`.
- Exactly the manifest's words, **in manifest order**, `english` spelled exactly
  as in the manifest (keep British spellings like `analyse`, `labour`).
- Do **not** write `ipa`, `audio_src` or images — `scripts/enrich-preset-decks.mjs` fills them (Oxford + Pexels) after the content passes review.

## Content rules

**vietnamese** — short and natural, the way a Vietnamese learner's dictionary
would gloss it. 1–3 core senses separated by `; `, most frequent first. For very
polysemous words (get, make, take, run…) pick the 2–3 senses a learner meets
most. No POS labels or explanations inside this field.

**part_of_speech** — the word's most frequent use, full lowercase name:
`noun`, `verb`, `adjective`, `adverb`, `preposition`, `conjunction`,
`determiner`, `pronoun`, `exclamation`. If the word is equally common as two
parts of speech (change, work, process), pick the one the Vietnamese gloss and
the examples use.

**examples** — exactly 3.
- Each sentence must contain the headword (an inflected form is fine:
  analysed, children, took) used in the sense given in `vietnamese`. If the
  gloss lists several senses, spread the examples across them.
- 7–16 words. One sentence each, starts with a capital, ends with punctuation.
- Natural, idiomatic English a native speaker would actually say or write — not
  textbook-stiff, not dictionary-definition style ("X means…"). NGSL decks:
  everyday life, work, study, family, travel. AWL decks: academic, workplace,
  news, science, economics — the contexts where these words really occur.
- Other vocabulary in the sentence should be easier than the headword, so the
  sentence is usable as a translation drill ("Học câu" shows the `vi` and the
  learner types the English).
- Vary subjects, tenses and sentence types across the three; not all starting
  "The …". No real people's names, brands, politics, religion or anything
  upsetting.
- Grammar and article use must be flawless. Use American spelling in sentences
  EXCEPT keep the headword's own spelling when it is British (the card is
  `analyse`, so write `analyse`/`analysed`).

**vi (example translation)** — natural Vietnamese, faithful in meaning, not
word-for-word. It is the prompt of a translation drill, so it must map back to
roughly the same English sentence: don't drop or add information.

**collocations** — 2–4 strings, real high-frequency combinations you would
find in the Oxford Collocations Dictionary or a corpus (verb + noun, adjective
+ noun, noun + preposition, adverb + verb…). Each must contain the headword.
At least one should also appear in an example. Never invent rare or awkward
pairings — fewer good ones beat four weak ones.

**notes** — `null` unless genuinely useful; Vietnamese, one short line. Good
uses: irregular forms (`take – took – taken`), required preposition
(`consist of`), British vs American spelling (`Anh: analyse · Mỹ: analyze`),
uncountable noun (`không đếm được`), a common confusion
(`affect (v) ≠ effect (n)`).

## Self-check before finishing

Re-read every card: headword present in all 3 examples, sense matches the gloss,
grammar correct, sentence sounds natural, `vi` faithful and natural, each
collocation is real. Then validate:

```bash
node scripts/check-preset-deck.mjs <deck code>
```
