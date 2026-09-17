import { NextResponse } from 'next/server';
import { requireUserId, UnauthorizedError } from '@/lib/current-user';
import { synthesizeEdgeTts } from '@/lib/edge-tts/synthesize';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_CHARS = 800;

// Giọng được phép chọn. Mặc định Aria (Mỹ). Anh/Úc dùng cho bài nghe-14.
const ALLOWED_VOICES = new Set(['en-US-AriaNeural', 'en-GB-SoniaNeural', 'en-AU-NatashaNeural']);

/** Base64-encode an ArrayBuffer without blowing the call stack on big files
 *  (String.fromCharCode(...bytes) overflows for >~100KB). */
function toBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let bin = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(bin);
}

/**
 * POST /api/reading/tts — synthesize one sentence with Edge TTS (Aria) for
 * the karaoke reader. Returns the mp3 (base64) plus word-boundary timings so
 * the client can keep per-word highlighting while playing the file.
 *
 * 503 on any synthesis failure — the client treats it as "use browser TTS
 * for this sentence" (the reader's original engine), never an error the
 * learner sees. No caching: sentences are cheap (~1-3s of audio) and the
 * client memoizes per session.
 */
export async function POST(req: Request) {
  try {
    await requireUserId();
    const body = (await req.json().catch(() => ({}))) as { text?: unknown; voice?: unknown };
    const text = typeof body.text === 'string' ? body.text.trim() : '';
    if (!text) {
      return NextResponse.json({ error: 'text required.' }, { status: 400 });
    }
    if (text.length > MAX_CHARS) {
      return NextResponse.json({ error: `Text too long (max ${MAX_CHARS}).` }, { status: 400 });
    }

    let voice: string | undefined;
    if (body.voice !== undefined) {
      if (typeof body.voice !== 'string' || !ALLOWED_VOICES.has(body.voice)) {
        return NextResponse.json({ error: 'Voice not allowed.' }, { status: 400 });
      }
      voice = body.voice;
    }

    const result = await synthesizeEdgeTts(text, { voice });
    if (!result) {
      console.warn('[reading/tts] Edge TTS synthesis failed — client falls back to browser TTS');
      return NextResponse.json({ error: 'Synthesis unavailable.' }, { status: 503 });
    }

    return NextResponse.json({
      audio: toBase64(result.mp3),
      boundaries: result.boundaries.map((b) => ({ t: b.offsetSec, w: b.text })),
    });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[reading/tts POST] error:', err);
    return NextResponse.json({ error: 'Internal error.' }, { status: 500 });
  }
}
