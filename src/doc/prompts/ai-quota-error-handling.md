# 2026-05-14 — Bug fix — Handle Gemini 429 quota errors gracefully

## Symptom

When Gemini quota hits (free tier 15 RPM / 1500 RPD), endpoints like `/api/compose/suggest` bubble up the raw 429 from Gemini and return HTTP 502 to client with no useful info. User just sees a generic error or nothing.

Error log:
```
[gemini] HTTP 429 { "error": { "code": 429, "message": "You exceeded your current quota..." } }
POST /api/compose/suggest 502
```

## Goal

1. AI provider catches 429 specifically and throws a typed `AIQuotaError`.
2. All AI-calling route handlers convert that to **HTTP 429** with a friendly Vietnamese message.
3. Client UI shows the message instead of a generic failure.

## Step 1 — Add typed error to AI provider

In `src/lib/ai/` (likely `src/lib/ai/index.ts` or wherever `getAIProvider()` + the Gemini client live):

Add an exported error class:

```ts
export class AIQuotaError extends Error {
  constructor(public readonly retryAfterSeconds?: number) {
    super('AI quota exceeded');
    this.name = 'AIQuotaError';
  }
}

export class AIError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
    this.name = 'AIError';
  }
}
```

In the Gemini call (wherever `fetch` to Gemini happens), after receiving the response:

```ts
if (response.status === 429) {
  const retryAfter = response.headers.get('Retry-After');
  const seconds = retryAfter ? parseInt(retryAfter, 10) : undefined;
  throw new AIQuotaError(Number.isFinite(seconds) ? seconds : undefined);
}
if (!response.ok) {
  throw new AIError(`Gemini HTTP ${response.status}`, response.status);
}
```

⚠️ Don't break existing behavior. Other 5xx errors should still throw `AIError`. Only 429 maps to `AIQuotaError`.

## Step 2 — Shared helper for route handlers

Add `src/lib/ai/error-response.ts`:

```ts
import { NextResponse } from 'next/server';
import { AIQuotaError, AIError } from '.'; // adjust path to where you exported them

export function aiErrorResponse(err: unknown): NextResponse {
  if (err instanceof AIQuotaError) {
    const headers: Record<string, string> = {};
    if (err.retryAfterSeconds) {
      headers['Retry-After'] = String(err.retryAfterSeconds);
    }
    return NextResponse.json(
      {
        error: 'ai_quota_exceeded',
        message: 'AI đang quá tải nha. Thử lại sau vài phút giúp mình.',
      },
      { status: 429, headers }
    );
  }
  if (err instanceof AIError) {
    return NextResponse.json(
      {
        error: 'ai_error',
        message: 'AI lỗi rồi. Bạn thử lại nhé.',
      },
      { status: 502 }
    );
  }
  // Unknown — re-throw for the default 500 handler
  throw err;
}
```

## Step 3 — Use in every AI-calling route handler

Grep for usages of `getAIProvider()` and any direct AI imports across `src/app/api/**/route.ts`. For each handler:

```ts
import { aiErrorResponse } from '@/lib/ai/error-response';

export async function POST(req: NextRequest) {
  try {
    const userId = await requireUserId();
    // ... existing logic ...
    return NextResponse.json({ ... });
  } catch (err) {
    // Add this branch BEFORE any existing catch returns:
    if (err instanceof AIQuotaError || err instanceof AIError) {
      return aiErrorResponse(err);
    }
    // ... existing error handling stays ...
  }
}
```

Endpoints likely affected (grep to confirm):
- `/api/compose/suggest`
- `/api/compose/grade`
- `/api/paragraph/grade`
- `/api/article/grade`
- `/api/cards/generate`
- `/api/cards/preview` (if exists from add-preview-flow)
- Any cloze/distractor/sentence generators

## Step 4 — Client UI

Find where these endpoints are called on the client (search for fetch to those paths). At each call site, on response check status 429:

```ts
const res = await fetch('/api/compose/suggest', { method: 'POST', body: ... });
if (!res.ok) {
  const data = await res.json().catch(() => ({}));
  if (res.status === 429) {
    // Show toast / inline message
    toast.error(data.message ?? 'AI đang quá tải, thử lại sau nha');
  } else {
    toast.error(data.message ?? 'Có lỗi rồi, thử lại nhé');
  }
  return;
}
```

If the project uses `apiJson<T>()` helper (per CLAUDE.md §2), update it to surface 429 specifically:

```ts
// In apiJson — extend ApiError to expose status
export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}
```

Then call sites can check `err.status === 429`.

⚠️ Don't change `apiJson`'s default behavior. Just expose `.status` on the thrown error so call sites can specialize.

## Step 5 — Verify

- Manually trigger quota (or mock by temporarily forcing the 429 path):
  - Set a wrong key or simulate 429 in a local branch
- `tsc` clean
- Hit `/api/compose/suggest` while quota-blocked → expect HTTP 429 with `{ error: 'ai_quota_exceeded', message: 'AI đang quá tải...' }`
- Client shows the Vietnamese message instead of generic error

## Out of scope

- **No auto-retry / backoff.** Predictable error UX first. Retry can be a follow-up.
- **No fallback to a different model.** Same reason.
- **No quota warning before the call.** Could be a future enhancement (track usage server-side).
- **No changes to actual Gemini key / billing.** That's a user-side action (upgrade tier or wait for daily reset).

## Notes for user (not for Claude Code)

Free tier limits (Gemini 2.5 Flash, as of writing):
- 15 requests / minute
- 1500 requests / day (resets ~midnight Pacific)

Nếu muốn nhiều hơn → bật billing trên Google AI Studio, paid tier có quota cao hơn nhiều và tính theo token.
