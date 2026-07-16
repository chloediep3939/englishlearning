# SRS study/review flow overhaul (2026-07-16)

User-reported symptoms: (a) enter /study briefly, quit, re-enter → "already
studied today"; (b) cards "never" show up in /review; (c) scoring felt janky
vs Anki; (d) session autoplay used robotic TTS even when an Oxford recording
existed.

## Root causes found

1. **First-rating-wins**: the first rating per card per session mutated SRS
   immediately → one exposure flipped `new → learning`, and /study only pulls
   `status='new'` → quitting mid-session "consumed" cards. Also a LẠI right
   after a TỐT was log-only — demonstrated forgetting was ignored.
2. **Timestamp scheduling**: `next_review_at = now + N days` to the minute
   (UTC). An evening rating made a "1 day" card due the NEXT evening —
   invisible in morning sessions → "never due".
3. **Ease hell**: LẠI subtracted ease −0.2 even on brand-new cards (Anki
   never touches ease during learning).
4. **Full lapse reset**: LẠI zeroed the interval of mature cards.
5. **`failedThisSession` was dead** — threaded end-to-end but never read in
   `calculateNextReview`; UI interval hints promised behavior that didn't
   exist.
6. **"ÔN 0" confusion**: deck stage legend counts `status='review'`, not
   due-now cards.
7. **Autoplay TEMP hack**: session reveal autoplay had a hardcoded
   TTS-only short-circuit (legacy `audio_url` was unreliable), predating the
   Oxford R2 pipeline.

## Fixes

### `src/lib/flashcards/srs.ts`
- **Day-granular scheduling**: q>0 → `next_review_at = 00:00 UTC` of the
  target date (≈ 7:00 sáng VN). "1 ngày" = due tomorrow morning. q=0 stays
  `now + 1 minute` (same-session relearn).
- **Lapse keeps 25%** (`LAPSE_KEEP_RATIO`): graduated cards (reps ≥ 2 before
  rating) lapse to `max(1, round(interval × 0.25))` + ease −0.2. Non-graduated
  cards reset to 0 with **no ease penalty**.
- **Ease moves only for graduated cards** (Khó −0.15 / Dễ +0.15; the old
  −0.25-at-reps-1 special is gone).
- **Lapse carry-over**: graduating/early steps use `max(step, interval)` so
  the kept 25% isn't clobbered back to 1–4 days.
- **`failedThisSession` is real now**: a graduating Dễ after an in-session
  lapse caps at 1 day instead of 4.

### Rating protocol (`FlashcardSession.tsx` + `/api/cards/[id]/rate`)
- New flag `apply_srs` (legacy `is_first_rating_this_session` still honored).
- Session sends `apply_srs: true` for **every LẠI** (lapse always counts) and
  for the **gate-passing final rating** (q=5, or 2 corrects clean / 3 after a
  fail). Intermediate ratings are log-only.
- Consequence: quitting mid-session leaves unfinished cards untouched — new
  cards stay `new` and reappear in /study; due cards stay due. A lapsed card
  gets two applied updates in one session (lapse, then relearn-graduate) —
  intentional, mirrors Anki's relearning steps.
- Direct/API callers without flags still apply immediately (default true) —
  e.g. `/api/sentence/timeout` unchanged.

### Session autoplay (`FlashcardSession.tsx`)
Removed the TTS-only TEMP short-circuit. Reveal autoplay now plays the stored
Oxford US mp3 (`/api/audio/[cardId]?v=updated_at`) when
`audio_us_status === 'ok'` and the entry is a single word; phrases and
missing/failed audio fall back to browser TTS (per-play error fallback too).
Cleanup pauses the in-flight `Audio` element on advance/unmount.

### Deck detail (`DeckDetailClient.tsx`)
Added a "⏰ N từ đến hạn ôn hôm nay" chip under the stage bar (client-side
count matching `getDueForReview`'s predicate — string-compare against UTC
"YYYY-MM-DD HH:MM:SS"). The stage legend's "ÔN" remains a lifecycle count.

## Not changed
- Session gate thresholds (2 clean / 3 after fail, q=5 instant) — unchanged.
- Fuzz ±15% (≥4 days), mastered gate (interval ≥ 60 & reps ≥ 4) — unchanged.
- No schema/migration. Existing cards heal as they get re-rated; previously
  "consumed" one-touch cards are already `learning` and will surface in
  /review on their (now day-granular) due date.

## Verified / not verified
- `tsc --noEmit` clean. Behavior not exercised end-to-end in a browser at the
  time of writing; needs a manual pass: study a few cards → quit mid-session →
  re-enter (cards should reappear), and a next-morning /review check.
