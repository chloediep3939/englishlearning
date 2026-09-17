# Shadowing — Result (slice 1: S1 data foundation)

> This result covers only the **first buildable slice** of the multi-phase
> Shadowing plan (`src/doc/prompts/shadowing-deployment-plan.md`): the D1 schema,
> shared TypeScript types, and the read/write DB wrappers needed by S1 (kho bài).
> UI, ingest script, Azure scoring, sessions/attempts wrappers, and settings keys
> are intentionally **not** in this slice — see "Follow-ups".

## Scope

Lay down the data layer for Shadowing so every later phase (S1 list page, S2 core
screen, S3 sessions) builds on a stable schema. No user-facing behavior yet.

## Files changed

- `src/doc/prompts/shadowing-deployment-plan.md` — saved the pasted plan verbatim
  (CLAUDE.md §8 audit trail), with a date header.
- `migrations/0056_shadowing.sql` — **new migration**, 4 tables:
  `shadowing_lessons`, `shadowing_sentences` (shared content, not user-scoped),
  `shadowing_sessions`, `shadowing_attempts` (user-scoped, FK → `users`). Indexes
  on level, lesson_id, and the user/session/sentence lookups.
- `src/lib/types.ts` — appended `ShadowingSource`, `ShadowingWordMark`,
  `ShadowingLesson`, `ShadowingSentence`, `ShadowingSession`, `ShadowingAttempt`.
- `src/lib/db.ts` — imported the new types; added `hydrateShadowingLesson` /
  `hydrateShadowingSentence` (JSON parse of `words_json`/`marks_json`) and two
  wrappers: `shadowingLessonsDb` (`list`, `getById`, `create`) and
  `shadowingSentencesDb` (`listByLesson`, `createMany`).

## Key decisions

- **lessons/sentences are NOT user-scoped** — they are a shared corpus, mirroring
  preset decks and the pronunciation catalog. Only sessions/attempts carry
  `user_id`. This matches plan §0 (single shared library, per-user progress).
- **R2 reused, no wrangler change** — `AUDIO_BUCKET` already exists; lessons store
  only `audio_key`. `getAudioBucket()` in `db.ts` is the existing accessor.
- **`marks_json` typed loosely** as `Record<string, unknown> | null` rather than a
  guessed shape — the reading-map format is S4's job; avoided speculative typing.
- **`words_json` on attempts** left as `Record<string, unknown> | null` — Azure's
  per-word/phoneme shape is defined by the S2 assess lib, not yet built.
- **INSERT column lists written out explicitly** and matched 1:1 to the schema,
  per the plan's D1 warning about silently dropped values (M4a precedent).

## Deviations from prompt

- Created all 4 tables in one migration (the plan presents them together in §3),
  even though sessions/attempts are only consumed in S2/S3. The tables are cheap
  and cohesive; their wrappers still land with their phase.
- Did **not** add the 5 settings keys from §3 yet — they have no consumer until
  S2/S3, and adding unused keys to the shared `FlashcardSettings` would be
  speculative (CLAUDE.md §2.1). Deferred to the phase that reads them.

## Verification

- `npx tsc --noEmit` — **clean** (no type errors).
- Migration **NOT applied** — needs your go-ahead. Apply locally with:
  `npx wrangler d1 migrations apply english-learning-db --local`
- **Not tested:** no route/page exercises these wrappers yet; the DB wrappers have
  not been run against a live D1. No data ingested.

## Follow-ups / known issues

Decisions I need from you before continuing:

1. **Ingest script (S1 core)** needs npm packages (RSS parse + audio) and an STT
   service for **word-level timestamps** — both are CLAUDE.md §10-forbidden without
   your OK. Which STT for the timestamps (Azure batch? Whisper local?)?
2. **Azure Pronunciation Assessment** (S2/S4) is not integrated anywhere yet.
   Needs `AZURE_SPEECH_KEY` / `AZURE_SPEECH_REGION` in `.dev.vars` (you add these).
3. **Nav placement** — plan says group "KỸ NĂNG", which doesn't exist (current
   groups: Học / Luyện tập / Khác). Add `/shadowing` to "Luyện tập", or create the
   new "KỸ NĂNG" group?
4. **S0 spike** (browser mic + Azure feasibility) needs your machine + a mic +
   Azure key — I can scaffold throwaway test pages but can't run them for you.

Next reviewable unit once you confirm: `GET /api/shadowing/lessons` +
`GET /api/shadowing/lessons/:id` + the `/shadowing` list page (empty state until
ingest runs).

---

# Slice 2 — S0 spike + nav + lessons read path

User decisions received: add `/shadowing` to the **Học** nav group; do **S0**;
user handles ingest npm/STT (#1) and the Azure key in `.dev.vars` (#2) themselves.

## Files changed (slice 2)

- `src/components/Sidebar.tsx` — imported `Repeat2`; added `/shadowing` ("Nhại
  theo", blue) to the **Học** group, after "Phát âm".
- `src/app/shadowing/page.tsx` — server component list page. Reads
  `shadowingLessonsDb.list()` directly (no fetch, per §4.3), groups by level,
  shows a sleep-mascot empty state until ingest runs. Lesson cards are
  non-interactive for now (S2 adds the practice screen at `/shadowing/[id]`).
- `src/app/api/shadowing/lessons/route.ts` — `GET` list, optional `?level=0..5`.
- `src/app/api/shadowing/lessons/[id]/route.ts` — `GET` lesson + sentences.
- `src/app/shadowing-spike/page.tsx` — **throwaway** client spike (S0.1/S0.2):
  runs `SpeechRecognition` + `MediaRecorder` concurrently, shows live STT word
  count + blob type/size; "Gửi Azure chấm" posts the recording to the spike
  route (S0.3/S0.4). Not in nav; open manually at `/shadowing-spike`.
- `src/app/api/shadowing/spike-assess/route.ts` — **throwaway** Azure proxy;
  reads `AZURE_SPEECH_KEY`/`AZURE_SPEECH_REGION` from env (I did NOT touch
  `.dev.vars`), forwards the audio to Azure Pronunciation Assessment REST with
  prosody enabled, dumps the raw response. Returns 501 if env is unset.
- `scripts/shadowing-spike-voa.mjs` — **throwaway**, dependency-free VOA probe
  (S0.5). Takes an RSS URL as arg (no hardcoded feed — §9 unverified).
- `src/doc/shadowing-spike-notes.md` — S0 notes skeleton (5 questions + how to
  run + a cleanup checklist for the throwaway files).

## Key decisions (slice 2)

- **Nav**: placed under "Học" as requested (not the plan's "KỸ NĂNG" group).
- **Spike is real but disposable**: the Azure spike route/page and VOA probe are
  functional so you can actually answer S0.3–S0.5, but flagged throwaway with a
  cleanup list. They are NOT the S2 production assess module.
- **No npm, no `.dev.vars`, no wrangler edits** — decisions #1/#2 are yours. The
  Azure spike only *reads* env; the VOA probe uses Node's built-in `fetch`.
- **SpeechRecognition typed locally** (not in TS DOM lib) via minimal interfaces
  + `unknown` cast — no `any`, no `@ts-ignore`.

## Verification (slice 2)

- `npx tsc --noEmit` — **clean**.
- **NOT smoke-tested in the browser**: I did not start the dev server (CLAUDE.md
  §10.11 forbids auto-running `npm run dev`). Please run `npm run dev` and open
  `/shadowing` (empty state) and `/shadowing-spike` to exercise S0.
- Spike routes not run: Azure needs your key; the VOA probe needs a real RSS URL.

## Follow-ups (slice 2)

- Still blocked on your #1 (ingest npm/STT) and #2 (Azure key) before S1 ingest
  and S2 scoring can be built for real.
- After S0 is answered, delete the three throwaway files listed in the notes.

---

# HANDOFF — trạng thái hiện tại (2026-09-18)

Bản này để **session khác chạy tiếp**. Tóm gọn đã làm gì, còn gì.

## Đã DEPLOY lên production (worker `english-learning`)
- URL: `https://english-learning.chloediep3939.workers.dev`
- Nhánh: `claude/shadowing-deployment-plan-82fb19` (CHƯA merge main).
- Migration `0056_shadowing.sql` **đã apply lên D1 production** (4 bảng + index).
- Secret prod: `AZURE_SPEECH` đã set; `AZURE_SPEECH_REGION` (kiểm lại có set chưa).

## Đã code xong (compile sạch, tsc clean)
- **Schema/데이터**: migration 0056; types `Shadowing*` trong `src/lib/types.ts`;
  wrappers `shadowingLessonsDb` (`list/getById/getBySourceUrl/create`) +
  `shadowingSentencesDb` (`listByLesson/createMany`) trong `src/lib/db.ts`.
- **API**: `GET /api/shadowing/lessons`, `GET /api/shadowing/lessons/[id]`,
  `POST /api/shadowing/ingest` (admin-only, tự fetch MP3→R2, ghi D1).
- **UI**: trang `/shadowing` (list + empty state); nav "Nhại theo" trong nhóm **Học**.
- **Ingest**: `scripts/ingest-voa.mjs` — parse VOA (mục lục→bài→mp3+transcript),
  Azure batch STT lấy mốc từng từ, gán mốc câu/từ (greedy + nội suy), POST route.
- **S0 spike (throwaway)**: `/shadowing-spike` + `/api/shadowing/spike-assess` +
  `scripts/shadowing-spike-voa.mjs` + `src/doc/shadowing-spike-notes.md`.

## CÒN LẠI (việc của session sau)
1. **Chạy ingest để có dữ liệu** — driver chưa chạy lần nào, `/shadowing` vẫn TRỐNG.
   Lệnh (chạy trong worktree, cần cookie `auth` admin từ trình duyệt):
   ```bash
   AUTH_COOKIE="<auth cookie>" INGEST_LIMIT=1 node scripts/ingest-voa.mjs "https://learningenglish.voanews.com/p/5644.html:1"
   ```
   Azure batch ~vài phút/bài. Chạy 1 bài trước, kiểm dữ liệu (mốc câu/từ) rồi mới
   tăng `INGEST_LIMIT` + thêm chương trình (5644 L1, 6765 L2, 5610/5611 Intermediate).
2. **⚠️ Chưa verify thực tế**: alignment ASR↔transcript (`alignSentences` trong
   script) và bóc transcript (`extractTranscript`) mới chỉ chạy tĩnh — **cần soi
   output bài thật, gần như chắc phải tinh chỉnh** (per-program transcript khác nhau:
   Let's Learn English là hội thoại, Intermediate là văn xuôi).
3. **S2 — màn nhại từng câu** (nghe→ghi âm→tô chữ→chấm Azure→nhận xét): CHƯA làm.
   Chấm phát âm chỉ cần TEXT câu tham chiếu (không cần mốc), nên làm được ngay sau
   khi có dữ liệu. Route chấm dự kiến `POST /api/shadowing/score` (chưa có).
4. **Translation**: script để `translation_vi` null trừ khi có `TRANSLATOR_KEY`.
5. **Settings keys** (`shadowing_*`) trong kế hoạch §3: CHƯA thêm (hoãn tới khi S3 dùng).
6. **BBC Learning English**: user muốn thêm cho học cá nhân (không public). Parser
   BBC CHƯA làm — chỉ có VOA.
7. **Dọn**: xoá 3 file spike S0 khi xong phase S0.

## Lưu ý môi trường
- Worktree này ban đầu thiếu `node_modules` → đã `npm ci` (655 packages). Nếu
  session sau ở worktree khác, nhớ `npm ci` trước khi build/deploy.
- Deploy: `npm run deploy` (ghi đè production worker; dự án chỉ 1 worker, không có
  env preview).
