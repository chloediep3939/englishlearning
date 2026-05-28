# oxford-audio.md — US pronunciation MP3 + US IPA from Oxford

> Saved verbatim 2026-05-28.

> **Apply order: LAST (#6).** Touches a migration + `wrangler` (R2 binding) + the read-aloud button, so it builds on top of everything else (esp. `study-review-loop` which finalizes the session UI where the play button lives).

---

## Goal

For each card, fetch its Oxford Learner's Dictionaries page, pull the **US pronunciation MP3** + **US IPA**, store the MP3 in **R2** and the US IPA on the card (overwriting the existing IPA). The read-aloud button plays the stored MP3 when available; falls back to TTS (with a warning) when not.

---

## Locked decisions

| Topic | Decision |
| --- | --- |
| Storage | **R2.** MP3 bytes live in R2; DB stores the R2 key. Served via an app route. |
| Input URL | Reuse the **existing Oxford URL** the card already has (the one the "open Oxford" button uses). Fetch with redirect-follow — don't care about the `_1`/`_2` suffix, Oxford redirects. |
| US IPA | 2nd `.phon` inside `.webtop` (1st = UK, 2nd = US). **Overwrite** the card's existing IPA field. |
| US MP3 | 2nd `data-src-mp3` inside `.webtop` (1st = UK, 2nd = US). Download it. |
| Parse robustness | Prefer the **American container** (`.phons_n_am` / `.pron-us`) over positional "2nd"; positional-2nd as fallback. (See gotcha #2.) |
| Trigger 1 | On card creation in `/api/cards/generate` — **best-effort, non-blocking** (card must succeed even if Oxford is down). |
| Trigger 2 | Per-deck **"Cập nhật phát âm"** button → re-fetch + overwrite for the deck's cards, client-orchestrated **5-parallel + progress UI** (same pattern as bulk import). |
| UI | **Replace** the current TTS read button: MP3 if available, else TTS. |
| Fail handling | Page error / no US MP3 → fall back to TTS **+ show a warning** to the user that the Oxford MP3 fetch failed. Needs a status flag so the UI can distinguish "failed" from "not attempted yet". |

---

## Step 1 — R2 setup

1. Create the bucket: `npx wrangler r2 bucket create english-learning-audio`
2. Add the binding to `wrangler` config (jsonc/toml — match the existing format):
   - binding name `AUDIO_BUCKET`, bucket `english-learning-audio`.
3. Add `AUDIO_BUCKET: R2Bucket` to the Cloudflare env type (run `wrangler types` if that's how the project regenerates `cloudflare-env.d.ts`, else add manually to wherever `D1Database` is typed).

---

## Step 2 — Scraper lib `src/lib/oxford/pronunciation.ts`

Export:

```ts
export interface OxfordPronunciation {
  ipaUs: string | null;      // e.g. "/ˈpɜːrtʃəs/"
  mp3: ArrayBuffer | null;   // downloaded US mp3 bytes
  mp3SourceUrl: string | null;
}
export async function fetchOxfordPronunciation(oxfordUrl: string): Promise<OxfordPronunciation>;
```

Implementation:

- `fetch(oxfordUrl, { redirect: 'follow', headers: { 'User-Agent': '<a real browser UA string>', 'Accept-Language': 'en-US,en' } })`. **The UA matters** (gotcha #1).
- If `!res.ok` → return all-null (caller treats as failed).
- Parse the response **scoped to the single `.webtop`** using `HTMLRewriter` (native to Workers, no dep). Collect:
  - **US IPA** — primary selector `.webtop .phons_n_am .phon` (American phonetics block). Fallback: the **2nd** `.webtop .phon` encountered. Accumulate text across chunks (HTMLRewriter delivers text in pieces — buffer per element, finalize on the element's end).
  - **US MP3 URL** — primary `.webtop .pron-us[data-src-mp3]` (or `.webtop .phons_n_am [data-src-mp3]`); read the `data-src-mp3` attribute. Fallback: the **2nd** `data-src-mp3` under `.webtop`.
- After parsing, if an MP3 URL was found, `fetch` it (same UA) and read `arrayBuffer()`.
- **Verify against a real page during implementation**: run it against `https://www.oxfordlearnersdictionaries.com/definition/english/purchase` and confirm `ipaUs` ≈ `/ˈpɜːrtʃəs/` and the mp3 URL ends in `...us_pron/.../purchase__us_1.mp3`. Don't ship the parser without this check — the exact class names are the riskiest assumption.

(If HTMLRewriter text-accumulation gets ugly for the IPA, a focused regex over `res.text()` on the `.webtop` block is acceptable as long as it targets the American block, not blind "2nd match".)

---

## Step 3 — Schema migration

Add to the cards/flashcards table (use the real table name):

- `audio_us_key TEXT` — R2 object key; `NULL` when no audio.
- `audio_us_status TEXT` — `'ok' | 'failed'`; `NULL` = not attempted yet. (UI: `failed` → TTS + warning; `NULL` → TTS, no warning; key present + `ok` → play MP3.)
- IPA: **reuse the existing IPA column** (whatever it's named — `ipa` / `phonetic`). No new IPA column. Overwrite it.

⚠️ **D1 INSERT column trap (M4a precedent):** after adding `audio_us_key` / `audio_us_status` to the TS type, also add them to the **INSERT column list** in the card save path, or values get silently dropped.

---

## Step 4 — Serving route `GET /api/audio/[cardId]`

- Look up the card → get `audio_us_key`. If none → 404.
- `AUDIO_BUCKET.get(key)` → return bytes with:
  - `Content-Type: audio/mpeg`
  - `Cache-Control: public, max-age=31536000, immutable`
- **Cache-busting on re-fetch (gotcha #3):** since the key is reused on overwrite, the frontend must append a version query, e.g. `/api/audio/{cardId}?v={updatedAt}`. The route ignores `v`; it only busts the browser/CDN cache so users don't hear the stale clip after "Cập nhật phát âm".
- R2 key convention: `audio/cards/${cardId}.mp3`.

---

## Step 5 — Wire into `/api/cards/generate` (best-effort)

After the card is saved (don't change the existing AI+save flow), still inside the request:

1. Resolve the card's Oxford URL (reuse existing logic).
2. `try`: `const p = await fetchOxfordPronunciation(url)` **with a timeout** (AbortController ~5s) so a slow Oxford can't hang/fail card creation.
3. If `p.mp3` → `AUDIO_BUCKET.put('audio/cards/'+id+'.mp3', p.mp3)`, set `audio_us_key`, `audio_us_status='ok'`.
4. If `p.ipaUs` → overwrite the IPA column (independent of mp3 success).
5. On any error / no mp3 → `audio_us_status='failed'`, leave key null. **Never throw out of card creation.**

Access `AUDIO_BUCKET` via `getCloudflareContext()`.

Note: bulk import calls this endpoint, so bulk-added cards get audio for free — but each call is now ~1–3s slower. Acceptable (bulk already has parallel + progress). Leave audio on; no skip toggle unless you want one later.

---

## Step 6 — Per-deck "Cập nhật phát âm" button

Follow the **bulk-import client-orchestration pattern** (no new bulk endpoint):

- New endpoint `POST /api/cards/[id]/refresh-audio` → re-runs steps 2–5 above for one card (overwrite), returns `{ ok: boolean, ipa: string | null, failed: boolean, word: string }`.
- In the deck (bộ từ) view, add button **"Cập nhật phát âm"** → gather the deck's card ids → call the endpoint **5 in parallel** with a progress UI (`X/Y`, success/fail counts) → completion summary that **lists the words that failed**.
- Overwrite always (re-fetch even if a card already has audio — that's the point of the button).

---

## Step 7 — Read-aloud button (replace TTS)

Find the existing read-aloud / TTS button(s) (card face, study, review, detail — wherever it lives; centralize if there's a shared component):

- `audio_us_status === 'ok'` && has key → play `/api/audio/{cardId}?v={updatedAt}` via `Audio()`/`<audio>`.
- else → existing TTS.
- `audio_us_status === 'failed'` → TTS **+ a small warning indicator** (icon/tooltip, VN: e.g. "Phát âm Oxford lỗi — đang dùng giọng máy"). `NULL` status → TTS silently.

---

## Gotchas (ranked by likelihood)

1. **Oxford may block the Worker fetch** (403 / bot page) even though a normal browser works. Set a realistic `User-Agent`. **Test one word via the Worker runtime first** (`npm run preview` / `wrangler dev`) before building the rest — if it's blocked, the whole feature changes.
2. **"2nd" can be wrong.** Words with a single pronunciation may have only one `.phon` / one `data-src-mp3`. Target the **American container** first, positional-2nd as fallback; if neither US-specific nor a 2nd exists → `failed`.
3. **Stale audio after re-fetch** — same R2 key + `immutable` cache = old clip. Use the `?v={updatedAt}` cache-bust (Step 4).
4. **R2 binding isn't present under plain `next dev`** — test audio via `npm run preview` (opennext) or `wrangler dev`, not bare Next dev.
5. **D1 INSERT trap** (Step 3) — add new columns to the INSERT list.
6. **Subrequest/CPU** — per card it's just 1 page fetch + 1 mp3 fetch + 1 R2 put; fine. Keep the deck-refresh concurrency at 5.

---

## Acceptance / smoke test

- [ ] `tsc` clean.
- [ ] Worker-runtime fetch of one Oxford word returns US IPA + a US mp3 URL (verified against `purchase`).
- [ ] New card via `/add` (Một từ) → IPA shows US value, read button plays the Oxford mp3.
- [ ] Card where Oxford has no US mp3 → `audio_us_status='failed'`, read button uses TTS + shows warning.
- [ ] Oxford unreachable (simulate) → card still creates fine, status `failed`.
- [ ] Deck "Cập nhật phát âm" → progress UI runs 5-parallel, summary lists failures, re-fetch overwrites (and audio actually updates, no stale cache).
- [ ] Bulk import (Nhiều từ) → added cards also get audio populated.

## Report back

`tsc` status / files touched / any deviation (esp. whether Oxford blocked the Worker fetch and what UA worked / actual class names used in the parser).
