# Demo account + Feedback popup
<!-- Saved 2026-05-14 -->

2 features bundled:
1. **Demo account:** "Trải nghiệm" button trên login → tạo tài khoản demo có data seed sẵn (decks + cards + passages)
2. **Feedback popup:** icon trên header, click → modal gửi góp ý

Conventions: inline `style={{}}` + `var(--v-*)`, NO Tailwind. `lucide-react`. Bún voice. `export default function`, kebab-case files. D1 async. Server vs client boundary strict.

---

## 1. DB migration (`migrations/0008_demo_feedback.sql`)

```sql
-- Demo flag on users
ALTER TABLE users ADD COLUMN is_demo INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN demo_expires_at INTEGER;  -- unix seconds, nullable

CREATE INDEX idx_users_demo_expires ON users(demo_expires_at) WHERE is_demo = 1;

-- Feedback table
CREATE TABLE feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,                              -- nullable (in case anonymous later)
  email TEXT,                                   -- snapshot of user email or user-supplied
  rating INTEGER,                               -- 1-5, nullable
  content TEXT NOT NULL,
  page_url TEXT,                                -- where they were when submitting
  user_agent TEXT,
  is_demo_user INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_feedback_created ON feedback(created_at DESC);
```

Apply local + remote.

---

## 2. Seed data

### File: `src/lib/demo/seed-data.ts`

Static export — pre-baked AI-generated content (no live Gemini call on demo creation, too slow). Format:

```ts
export interface DemoCardSeed {
  english: string;
  vn_meaning: string;
  ipa: string;
  audio_url?: string | null;
  examples: Array<{ en: string; vn: string }>;
  collocations: string[];
  image_url?: string | null;
  image_alt?: string | null;
}

export interface DemoDeckSeed {
  name: string;
  description: string;
  icon?: string;   // emoji or lucide name
  cards: DemoCardSeed[];
}

export const DEMO_DECKS: DemoDeckSeed[] = [
  {
    name: 'Đời sống',
    description: 'Từ vựng A2-B1 cho cuộc sống hàng ngày',
    icon: '🌱',
    cards: [/* 20 cards */]
  },
  {
    name: 'Học thuật',
    description: 'Từ vựng B2 cho bài viết học thuật',
    icon: '📚',
    cards: [/* 20 cards */]
  },
  {
    name: 'Công việc',
    description: 'Từ vựng B1-B2 cho môi trường công sở',
    icon: '💼',
    cards: [/* 20 cards */]
  },
];

export const DEMO_PASSAGES: Array<{
  title: string;
  source_text: string;
  cefr_level: string;
  // ... whatever columns the passages table has
}> = [
  { /* short B1 passage about morning routines, ~80 words */ },
  { /* short B2 passage on a topical issue, ~120 words */ },
];
```

### Word lists to seed (suggestions — tweak as fit)

- **Đời sống (20):** routine, schedule, habit, weekend, breakfast, traffic, hobby, neighbor, weather, exercise, sleepy, anxious, grateful, lonely, cheerful, organize, prepare, complain, enjoy, relax
- **Học thuật (20):** comprehensive, ambiguous, paradigm, hypothesis, analyze, methodology, significant, contradict, evaluate, demonstrate, fluctuate, correlate, implication, perspective, presumption, abstract, concrete, derive, illustrate, undermine
- **Công việc (20):** meeting, deadline, deliverable, agenda, stakeholder, client, proposal, budget, negotiate, collaborate, prioritize, escalate, delegate, mentor, feedback, performance, productive, professional, network, promotion

### Seed generation script: `scripts/generate-demo-seed.ts`

One-time dev script. Reads word lists, calls `generateCardData(english, false)` for each (with image), writes results to `src/lib/demo/seed-data.ts`. Run locally with API key set:

```bash
npx tsx scripts/generate-demo-seed.ts
```

Script outline:
1. For each deck's word list → for each word → `generateCardData(word, false)` → push to deck's `cards`
2. Generate 2 sample passages (or write them manually if too complex)
3. Format as TS module + write to `src/lib/demo/seed-data.ts`
4. Run `prettier` not needed (no prettier in this repo) — just output valid TS

Commit the generated `seed-data.ts` to repo. Demo creation reads from it.

**Note:** This script must run ONCE before demo feature works. Document this in `scripts/README.md` or top of the script file.

---

## 3. Demo account creation endpoint

### `POST /api/auth/demo` (new)

No body. Server-side flow:

1. Generate unique email: `demo-${nanoid(10)}@bun.local` (use `nanoid` or `crypto.randomUUID().slice(0,10)`).
2. Generate `expires_at = now + 24*60*60` (24h from now, unix seconds).
3. Insert user:
   ```sql
   INSERT INTO users (email, name, picture_url, is_admin, is_demo, demo_expires_at, created_at)
   VALUES (?, 'Người trải nghiệm', NULL, 0, 1, ?, ?)
   ```
   Capture `userId`.
4. Seed data:
   - For each deck in `DEMO_DECKS`:
     - Insert deck row → get `deck_id`
     - For each card in deck.cards:
       - Insert into `flashcards` with all fields including `collocations_json` (stringify), `examples_json`, etc.
       - Some cards: pre-set review history. Easy approach: ~30% of cards get 1-2 fake `flashcard_reviews` rows dated yesterday/today with quality 4-5. Result: a few cards are "Learning"/"Review" status so dashboard isn't all-new.
   - Insert `DEMO_PASSAGES` into `passages` table with this `userId`.
5. Insert default `user_settings` rows (same defaults a real user gets).
6. Set HMAC auth cookie (use existing `createAuthToken(userId)` helper).
7. Return `{ ok: true, redirect: '/' }`.

Wrap entire seeding in a transaction or sequential batch — if any insert fails, delete the half-created user. (D1 has `db.batch([...])` for atomic multi-statement.)

### Helper: `seedDemoUser(userId: number)`

Extract the seed logic into `src/lib/demo/seed-user.ts` for testability:

```ts
export async function seedDemoUser(userId: number): Promise<void> {
  const db = await getDb();
  // ... batch inserts
}
```

---

## 4. Login page changes

### `src/app/login/page.tsx`

Existing: Google OAuth button.

Add below it:
1. Divider line with text "hoặc" in middle (small, `--v-muted`).
2. **Secondary button:** `Trải nghiệm ngay` (icon `Sparkles`, bg `--v-surface`, border `--v-border`, ink `--v-ink`).
3. Sub-text below button (small, `--v-ink-soft`):
   `Tài khoản dùng thử có sẵn 3 bộ từ + 60 từ + 2 bài đọc mẫu. Tự xoá sau 24h.`

Click handler: `POST /api/auth/demo` → on success, `router.push('/')`. Show loading spinner on button during request. On error, toast.

---

## 5. Demo banner (in app shell)

In root sidebar layout, read `currentUser` (already done for nav). If `currentUser.is_demo === true`:

Show persistent banner at top of main content area (above page content):
- Bg `--v-orange-soft`, border-bottom `--v-orange`
- Left: icon `Sparkles` + text `Bạn đang dùng tài khoản trải nghiệm. Data sẽ tự xoá sau {timeLeft}.`
  - `timeLeft` computed from `demo_expires_at`: "23 giờ", "khoảng 5 giờ", "khoảng 30 phút" etc.
- Right: button `Đăng ký bằng Google` (small, bg `--v-primary`) → links to existing Google OAuth flow.
- Optional small `X` to dismiss for this session (localStorage flag, expires on close tab).

Banner visible on every page when `is_demo`. Doesn't appear for real users.

---

## 6. Feedback popup

### Icon button (in app shell header)

Add a button next to the clock/flame pills. Icon `MessageCircleHeart` or `MessageSquare` (lucide). Bg `--v-surface`, border `--v-border`. On click → opens feedback modal.

### Feedback modal

Centered modal (overlay bg rgba(0,0,0,0.4)). Card ~480px wide.

Content:
1. **Header:** Bún `happy` pose (small, 48px) + title `Góp ý cho Bún` + close `X`
2. **Rating (optional):** "Bạn thấy app thế nào?" + 3 emoji buttons (😞 / 😐 / 😍). Selected one is highlighted (`--v-primary-soft` bg). Maps to rating: 1 / 3 / 5.
3. **Textarea:** placeholder `Tính năng gì hay? Chỗ nào khó dùng? Bug? Ý tưởng?`. Min 10 chars, max 2000.
4. **Email field:** prefilled with user.email if logged in (non-demo). For demo users, allow override. Optional.
5. **Submit button:** `Gửi cho Bún` (bg `--v-primary`). Disabled if textarea < 10 chars.
6. **Privacy line (small):** `Mình sẽ đọc tất cả góp ý 🌱`.

### `POST /api/feedback`

Body: `{ rating?: 1-5, content: string, email?: string }`.

Server:
- `userId` from `requireUserId()` (allow demo users too).
- Insert into `feedback` table with `page_url` from `Referer` header, `user_agent` from headers, `is_demo_user` from user's flag.
- Return `{ ok: true }`.

On success in client: close modal, toast `Cảm ơn bạn 🌱 Bún đã nhận được góp ý`.

---

## 7. Cleanup (TODO, optional v1)

Demo users accumulate. Options:

**Option A (recommended v1):** Add Cron Trigger in `wrangler.toml`:
```toml
[triggers]
crons = ["0 3 * * *"]  # daily 3am UTC
```

Add a fetch handler that:
- On scheduled invocation, runs `DELETE FROM users WHERE is_demo = 1 AND demo_expires_at < unixepoch()`.
- ON DELETE CASCADE on related tables should clean up flashcards, decks, etc. (verify schema has cascade — if not, do manual deletes in transaction.)

**Option B (defer):** Note as TODO, don't add cleanup yet. Demo accounts accumulate slowly; manual cleanup in production via SQL until it matters.

Pick whichever is faster. Document choice in commit message.

---

## 8. Files touched

- `migrations/0008_demo_feedback.sql` (new)
- `src/lib/demo/seed-data.ts` (new — generated by script)
- `src/lib/demo/seed-user.ts` (new — seeding logic)
- `scripts/generate-demo-seed.ts` (new — one-time dev script)
- `src/app/api/auth/demo/route.ts` (new)
- `src/app/api/feedback/route.ts` (new)
- `src/app/login/page.tsx` (modify — add demo button + divider)
- `src/components/app-shell/sidebar-layout.tsx` (modify — add demo banner)
- `src/components/header/feedback-button.tsx` (new)
- `src/components/header/feedback-modal.tsx` (new)
- `src/lib/db/feedback.ts` (new wrapper)
- `src/lib/db/users.ts` (modify — add `is_demo` + `demo_expires_at` to type, hydrate)
- `wrangler.toml` (modify if Option A cleanup)

---

## 9. Acceptance

- `tsc` clean.
- Login page shows `Trải nghiệm ngay` button below Google OAuth + divider.
- Click `Trải nghiệm` → ~1s → land on `/` dashboard with 3 decks visible, 60 cards, 2 passages, some review history.
- Demo banner visible on every page, shows time remaining, has working `Đăng ký bằng Google` link.
- Feedback button in header → modal opens → submit works → row appears in `feedback` table.
- Real (non-demo) user: no banner, feedback still works.
- Run `scripts/generate-demo-seed.ts` works + writes valid TS file.

Report: files changed, deviations, seed script status (ran or stubbed?), cleanup option chosen, `tsc` output, any TODOs.
