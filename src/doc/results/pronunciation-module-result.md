# Result: Module "Phát âm" (Pronunciation) — 44 âm IPA

Date: 2026-09-17

## Scope

A new "Phát âm" learning area at `/pronunciation`: an overview of the 44 English (RP)
sounds grouped by type, a per-sound detail page (BBC video + mouth-shape clip + ~15–22
example words with slow 0.5× TTS + Vietnamese tips/contrast + read-and-score by Web Speech
+ record-and-compare A/B + embedded YouGlish), a minimal-pair listening lesson, and per-user
"đã học xong" + best-match-score progress. Reuses the existing Web Speech machinery and links
to the existing `/pronounce` flashcard drill rather than rebuilding it.

## Files changed

**New — static catalog / data (`src/lib/pronunciation/`)**
- `catalog-meta.ts` — types (`Sound`, `SoundSeed`, `ExampleWord`, `SoundGroup`) + light constants
  (`GROUP_META`, `GROUP_ORDER`, `PLAYLIST_URL`, `mouthClipFor`). Separated from bulk data so client
  components import types/meta without bundling all word lists.
- `catalog.ts` — assembles the 44 sounds from `data/*`, exposes `getSound` / `getGroups` /
  `allSounds` / `soundCount`; re-exports the meta.
- `data/vowels-short.ts`, `vowels-long.ts`, `diphthongs.ts`, `consonants-voiceless.ts`,
  `consonants-voiced.ts` — the sound entries (IPA, group, example words w/ IPA + VN, tips, contrast).
- `minimal-pairs.ts` — 12 curated minimal-pair sets for the listening drill.

**New — DB / API**
- `migrations/0021_pronunciation_progress.sql` — `pronunciation_progress` table (per user × sound;
  `completed`, `best_score`, `attempts`); lazy upsert, `UNIQUE(user_id, sound_slug)`.
- `src/lib/db.ts` — added `pronunciationProgressDb` (`getAll` / `getBySlug` / `markCompleted` /
  `recordScore`) + `PronunciationProgressRow`, mirroring `sentenceDrillsDb` upsert style.
- `src/app/api/pronunciation/progress/route.ts` — `GET` progress, `POST` complete/uncomplete/score;
  validates slug against the static catalog, clamps score 0–100.

**New — scoring / types**
- `src/lib/pronounce/match.ts` — added `similarity()` + `scoreReading()` (honest 0–100 match score).
- `src/types/youglish.d.ts` — ambient types for the YouGlish widget global.

**New — pages / components**
- `src/app/pronunciation/page.tsx` — server overview (44 sounds by group, completion + score badges).
- `src/app/pronunciation/[slug]/page.tsx` — server detail loader (`notFound()` for unknown slug).
- `src/app/pronunciation/minimal-pairs/page.tsx` — server shell for the minimal-pair lesson.
- `src/components/pronunciation/` — `SoundDetailClient`, `SectionCard`, `SoundVideoPanel`,
  `TipsPanel`, `ExampleWordList`, `ReadScorePanel`, `ABPlayback`, `YouglishWidget`,
  `MinimalPairClient`, `MinimalPairSession`.

**Edited**
- `src/components/Sidebar.tsx` — added `AudioLines` icon import + `/pronunciation` "Phát âm" nav entry
  (distinct from the existing `/pronounce` "Luyện đọc").

## Key decisions

- **Static catalog, not a D1 seed.** Read-only reference data lives in the repo; only per-user
  progress goes to D1. Split into `catalog-meta.ts` (types/consts) + `data/*` so the browser bundle
  for the detail page doesn't ship all 44 sounds' word lists.
- **Web Speech scoring is labeled honestly** as "Điểm khớp" (recognition match), NOT native-accent
  accuracy, with a permanent sub-note. Formula: `100 * (0.7*bestSim + 0.3*conf)`, `conf` falls back
  to similarity when the browser reports 0.
- **Mic used sequentially, never simultaneously.** Scoring (SpeechRecognition) and record-to-replay
  (MediaRecorder) are separate buttons/panels so they never contend for the mic.
- **A/B recording is never persisted** — in-memory blob URL only, revoked on re-record/unmount.
- **Reused** `PronounceSession`'s proven SR init/handlers, `tts.ts`, `FeedbackSection`, `Mascot`,
  and the `sentence_drills`/upsert DB idiom. Linked to `/pronounce` instead of rebuilding it.
- **Embeds**: YouTube via lazy `youtube-nocookie` iframe (click-to-load); YouGlish via the official
  `YG.Widget` script with `.fetch(word,'english')`, keeping the "Powered by YouGlish" branding.
  No CSP is set in `next.config.ts`, so neither embed is blocked.

## Deviations from prompt

- **Example words ≈ 15–22 per sound, not a strict 25.** Prioritised correct RP IPA + real Vietnamese
  glosses over hitting exactly 25 (§6.2 no-faking). The structure supports growing any sound to 25.
- **`youtubeId` is empty for all 44 sounds** — I did not fabricate per-sound BBC video ids
  (that would risk wrong links). The detail page falls back to a "Mở playlist BBC" link. Fill real
  ids into the catalog later to embed each sound's exact video.
- **Mouth-shape MP4s are not yet in the repo.** The 44 clips from your Google Drive still need to be
  downloaded into `public/pronunciation/mouth/<slug>.mp4`. Until then the panel shows a "chưa có video
  khẩu hình" placeholder (handled gracefully via `<video onError>`). Slug list to name them by is the
  `slug` field of each catalog entry.

## Verification

- ✅ `npx tsc --noEmit` — clean for all new/changed files. (3 pre-existing errors remain in
  `.next/types` for a deleted `refresh-ipa` route — stale build cache, unrelated to this work.)
- ✅ Migration SQL applied to the LOCAL D1 (`pronunciation_progress` table confirmed present). Note:
  the worktree's local migration tracker is stuck on `0018` (pre-existing "duplicate column
  recognition_only"), so `wrangler d1 migrations apply` can't advance; I created the table directly
  with `d1 execute --file` for local testing. On a clean environment `migrations apply` will handle
  0021 normally.
- ⚠️ NOT yet browser-tested end-to-end (dev server not started). Needs a manual pass: overview grid,
  detail sections, mic scoring (Chrome), A/B record, minimal-pair drill, YouGlish load.
- ⚠️ YouGlish widget requires network and may enforce referrer/quota limits; behavior on `localhost`
  is unverified.
- ⚠️ Web Speech scoring works only on Chromium/Safari; Firefox shows the unsupported banner (by design).

## Follow-ups / known issues

- Download the 44 mouth-shape MP4s into `public/pronunciation/mouth/` (ASCII slug names).
- Fill real per-sound BBC `youtubeId`s into the catalog to embed exact videos.
- Optionally expand example words toward 25 per sound; have a native/teacher review the IPA + the
  authored Vietnamese tips/contrast notes.
- Consider (v2): weak-sound detection, streaks/badges, per-word best score, word-stress lessons.
