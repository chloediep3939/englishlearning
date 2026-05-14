# Single-import preview-then-save flow

The `/add` "Một từ" tab uses an explicit preview-then-save flow instead of
the previous auto-on-blur generate. The user types the English word,
clicks **Xem trước**, sees every AI-generated field as an editable input,
adjusts anything they want, then clicks **Lưu từ này** to persist.

## State machine

```
idle ── click "Xem trước" ──► generating ──► previewing ── click "Lưu" ──► saving ──► (success → idle)
                                                  │
                                                  ├── click "Tạo lại" ── regenerates (loses inline edits) ──► generating
                                                  └── click "Sửa lại" ── unlocks left form, keeps preview edits
```

| Phase | Left form | Right preview | Primary button |
|---|---|---|---|
| `idle` | editable | empty state | **Xem trước** |
| `generating` | locked | mascot + "Bún đang tra cứu..." | spinner on **Xem trước** |
| `previewing` | en/vi locked; deck/notes editable | editable fields | **Lưu từ này** |
| `saving` | locked | dimmed (`pointerEvents: none`) | spinner on **Lưu từ này** |

"Sửa lại" toggles `formLocked` back to false during `previewing`, so the
user can fix the English/VN inputs without discarding their inline preview
edits. Clicking "Tạo lại" re-hits `/api/cards/preview` and overwrites the
edit state with fresh AI output.

## Files

| Path | Role |
| --- | --- |
| `src/components/add/single-import.tsx` | Full rewrite. Hosts the state machine, the editable preview, and all buttons. |
| `src/app/api/cards/preview/route.ts` | **New.** `POST /api/cards/preview` — calls `generateCardData` and returns the result. Never persists. `vn_meaning` body field lets the caller override the AI translation. |
| `src/app/api/cards/route.ts` | `POST /api/cards` now uses `normalizeCollocations()` to accept both the rich Datamuse shape (`{phrase, word, position}`) and the stripped-down preview shape (`{phrase}` or plain string). |
| `src/app/api/cards/[id]/route.ts` | `PUT` mirrors the same `normalizeCollocations()`. |
| `src/lib/types.ts` | `FlashcardCollocation.word` and `.position` are now optional — user-added collocations from the preview UI don't have them. |

## Editable preview fields

All fields in the right column are real inputs, not display-only:

- **IPA** — mono text input pre-filled from dictionary. User can rewrite.
- **Nghĩa tiếng Việt** — pre-filled from AI translation (or user override
  if they typed one on the left).
- **Ảnh** — Pexels thumbnail with `Đổi ảnh` (re-rolls `/api/images/pexels?skip=N`)
  and `Bỏ ảnh` (clears the field). If the image was already cleared, the
  thumbnail collapses to a placeholder with a `Thêm ảnh` button that fetches
  fresh.
- **Ví dụ** — array of `{en, vi}` rows. Each row has 2 inputs + delete (`X`).
  "Thêm ví dụ" appends a blank row. No hard cap on count; the UI starts
  with the 3 the AI returned. Empty `en` rows are dropped on save.
- **Collocations** — array of strings. Each row is a single input + delete.
  "Thêm collocation" appends. Empty strings dropped on save.

The save path serializes the edit state and POSTs to `/api/cards`. The
endpoint validates `english` and `vietnamese` lengths but trusts the rest
(IPA/examples/collocations) — the user is the source of truth at this
point, the AI was just a starting suggestion.

## Why a new `/api/cards/preview` endpoint

`/api/cards/generate` is now overloaded with the bulk-import "generate +
save in one shot" mode (when `deck_id` is present). Making single-import
also call `/api/cards/generate` would mean the same endpoint serves two
incompatible contracts depending on body shape — easy to get wrong. The
preview endpoint is unambiguously read-only: it can never write to the DB,
no matter what body the client sends. Bulk import keeps using
`/api/cards/generate`.

## Collocations bug — what was actually broken

The user reported that collocations "don't appear in preview/saved cards."
Tracing each layer:

1. **AI source.** `getCollocations()` in `src/lib/flashcards/datamuse.ts`
   hits Datamuse `lc=`/`rc=`. **Not Gemini.** Datamuse silently returns
   `[]` for many less-common words and has no fallback. (Spec assumed
   Gemini; the existing code uses Datamuse. Documenting for clarity.)
2. **Parser → DB.** Datamuse → `FlashcardCollocation[]` → `JSON.stringify`
   in `flashcardsDb.create` → `collocations TEXT` column → `safeParse` in
   `hydrateCard`. **This path was already correct.**
3. **INSERT statement.** The `collocations` column IS in the `INSERT` and
   bound at the right position. Not the M4a "missing-from-INSERT" footgun.
4. **`POST /api/cards` filter.** Was rejecting collocations whose `word`
   was missing: `c.phrase === 'string' && typeof c.word === 'string'`.
   **First real bug.** User-typed collocations (which have no word/position
   from Datamuse) would silently disappear on save. Fixed by
   `normalizeCollocations()` — only `phrase` is required.
5. **Preview UI.** The old single-import preview component **didn't render
   collocations at all** — they were in the data, the user just never saw
   them before saving. **Second real bug.** Fixed by the rewrite: the new
   `EditablePreview` shows collocations as editable inputs with delete/add
   controls.
6. **Card detail / WordCard / CardDetailModal.** Already render
   `card.collocations[].phrase`. No change needed.

So the root cause was a combination: (a) collocations were invisible in
the single-import preview, so the user couldn't tell whether they were
generated or not, and (b) the POST filter would have dropped any
user-added ones anyway. Both fixed.

What I did **not** verify (because it requires running the app):

- Whether Datamuse `lc`/`rc` actually returns useful collocations from a
  Cloudflare Workers `fetch()` context. If it returns `[]` for the words
  the user tested, the preview will show "Chưa có collocation — bạn có
  thể tự thêm nha." and rely on manual entry. If Datamuse is reliably
  broken in this environment, a Gemini fallback in
  `src/lib/flashcards/generate.ts` would be the right next step.

## Locked-form semantics

During `previewing` the left-column English + Vietnamese inputs are
disabled (you've already generated based on them; mutating them would
make the preview stale). The deck picker and notes textarea **stay
editable** — those don't affect the AI output, so locking them would just
be annoying.

"Sửa lại" turns `formLocked` off entirely, letting the user fix a typo in
English without losing their inline preview edits. The next click on
"Lưu từ này" still saves the current preview state; the left-column
English/VN are picked up as the canonical word/meaning for the save.

## Gotchas

- **Two endpoints with overlapping contracts.** `/api/cards/preview`
  (generate only) and `/api/cards/generate` (generate + optional save).
  If you're adding a new feature that needs "generate without saving",
  use `/api/cards/preview`. If you need "generate and save in one call"
  (bulk import semantics), use `/api/cards/generate` with `deck_id`.
- **`normalizeCollocations()` is duplicated** in
  `src/app/api/cards/route.ts` and `src/app/api/cards/[id]/route.ts`.
  Pulling it into `@/lib/flashcards/collocations` (or similar) is the
  cleanup. Not done now to keep this change surgical.
- **`vn_meaning` triggers a wasted translation call.** `/api/cards/preview`
  passes the English through `translateEnToVi()` even when the user
  already supplied a VN. Cheap (Gemini Flash) but unnecessary. If
  translation quota matters, add a `skip_translate` param to
  `generateCardData`.
- **No image refresh endpoint** — `Đổi ảnh` calls existing
  `/api/images/pexels?q=...&skip=N`, which is unchanged.
