# Project overview re-scan

Date: 2026-05-18

## Goal

The project has changed substantially (AI usage overhaul, cloze pool, article simplification, demo account, landing page, lemmatize migration, audio fixes, etc.). Produce ONE comprehensive, up-to-date `src/doc/PROJECT_OVERVIEW.md` that lets a fresh AI session or a new developer understand the whole project without reading the entire codebase.

**Critical: derive everything from the ACTUAL current code, not from memory or old handoff docs.** The codebase is the source of truth. Old session-handoff text may be stale.

## Doc workflow (CLAUDE.md §8)

- Save this prompt to `src/doc/prompts/project-overview.md`.
- The deliverable IS the overview doc itself (`src/doc/PROJECT_OVERVIEW.md`) — no separate result file needed. Just confirm in chat when done.

## Sources to read (comprehensively)

1. **`CLAUDE.md`** + **`AGENTS.md`** — conventions, stack, rules.
2. **`package.json`** — dependencies + versions, scripts.
3. **`migrations/*.sql`** — every migration, in order. This gives the full DB schema.
4. **`src/app/`** — every route (pages + API). Build the route map.
5. **`src/lib/`** — key modules (db, auth, ai, flashcards/*, tts, demo, article, common).
6. **`src/components/`** — top-level structure (don't list every file; note the major feature folders).
7. **`src/doc/results/*.md`** — all result files. These record what each migration/feature did and any deviations. Use them to compile the "what's done" history accurately.
8. **`src/doc/prompts/*.md`** — list what prompts exist (indicates features built or planned).
9. **`wrangler.jsonc` / `wrangler.toml`** — bindings, cron triggers, runtime config.

## Output: `src/doc/PROJECT_OVERVIEW.md`

Write in **English** (CLAUDE.md §7 — doc files are English). Structure:

### 1. What this is
App purpose (Vietnamese-facing English learning / flashcard SRS app, marketing name "Bún", mascot). 2-3 sentences.

### 2. Stack
Table: framework, adapter, React, language, styling, DB, auth, AI provider, icons, fonts — with installed versions from `package.json`. Note: no test framework / ESLint / Prettier.

### 3. Architecture
- Routing (App Router, dynamic params, route handler conventions)
- Auth flow (Google OAuth → HMAC cookie, middleware gating, demo accounts)
- Data flow (server components read DB directly, client mutates via API)
- Server/client boundary rules
- Cloudflare specifics (D1 async, `getCloudflareContext`, `waitUntil` background work)

### 4. Feature inventory
For EACH feature, one short paragraph: what it does + current state. Cover (verify each exists by reading routes/components):
- Flashcards + SRS algorithm
- Decks
- Add word — single ("Một từ") + bulk import ("Nhiều từ")
- Study session
- Review session
- Speed quiz
- Cloze quiz
- Compose / sentence writing (story suggest + grading)
- Article reading (karaoke TTS + grammar analysis)
- Dashboard
- Settings
- Demo account
- Feedback
- Landing page
- Anything else found in the route map.

### 5. AI usage map
**This is important — the project went through a deliberate AI-minimization pass.** Document precisely:
- **What still uses AI** (Gemini): cloze pool generation, sentence/paragraph grading, compose story generation, on-demand grammar analysis. Confirm by grepping `getAIProvider` / `generateText`.
- **What was deliberately moved OFF AI**: translation (MyMemory API), IPA + audio (Free Dictionary API), collocations (Datamuse), distractors (algorithmic — user vocab + static fallback), lemmatization (irregular-verb map + regex), CEFR (removed entirely).
- **Caching strategy**: cloze pool shared globally per word; grammar analysis cached by content hash.
Present as a table: task → provider → notes.

### 6. Database schema
List every table from the migrations with its key columns and purpose. Note shared-vs-user-scoped tables (e.g. `flashcard_cloze_pool` is global; most others are `user_id`-scoped). Note the migration count / latest number.

### 7. Key module map
Table: "I need to X" → "use Y from Z". Compile from `CLAUDE.md` §2 but update against current reality (some helpers may have changed — verify). Include the AI feature modules, tts, demo, article helpers.

### 8. Conventions
Brief — point to `CLAUDE.md` as authoritative, don't duplicate it. Just note the few highest-impact rules (D1 async, inline styles + CSS vars, server/client boundary, file size <500 lines, doc workflow §8).

### 9. Doc workflow
Explain `src/doc/prompts/` + `src/doc/results/` + `src/doc/` feature docs (per CLAUDE.md §8). So future sessions know where the history lives.

### 10. Pending / known issues
Scan `src/doc/results/*.md` "Follow-ups" sections + any `TODO`/`FIXME` in code. List open items. Also list any prompt in `src/doc/prompts/` that has no matching result file (= written but possibly not applied).

## Constraints

- READ ONLY except creating the two doc files. No code changes.
- English for the overview doc.
- Be accurate over comprehensive — if unsure whether a feature exists, grep and verify; don't guess. Mark anything genuinely uncertain with `⚠️`.
- Keep it scannable — tables and short paragraphs, not walls of text. Target something a person reads in 10 minutes.
- Don't reproduce large code blocks — describe, link to file paths.

## When done

Confirm in chat: `src/doc/PROJECT_OVERVIEW.md` created, N lines, covering X features and Y tables. Note anything that surprised you during the scan (dead code, undocumented features, inconsistencies).
