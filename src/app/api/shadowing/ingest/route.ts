import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/current-user';
import { getAudioBucket, shadowingLessonsDb, shadowingSentencesDb } from '@/lib/db';
import type { ShadowingWordMark } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST /api/shadowing/ingest  — ADMIN ONLY (script nhập VOA gọi qua đây).
// Nhận JSON metadata + danh sách câu (kèm mốc từ nếu có), tự fetch MP3 từ
// mp3_url (public) → upload R2 → ghi D1. Xác thực bằng cookie `auth` của admin.
//
// Body JSON:
// {
//   source: 'voa'|'youtube', source_url, mp3_url, title, program?, level (0..5),
//   duration_ms?,
//   sentences: [{ text, translation_vi?, start_ms?, end_ms?,
//                 words?: [{word,start_ms,end_ms}] }]
// }

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/120.0 Safari/537.36';

interface SentenceInput {
  text: string;
  translation_vi?: string | null;
  start_ms?: number | null;
  end_ms?: number | null;
  words?: ShadowingWordMark[] | null;
}

function wordCountOf(sentences: SentenceInput[]): number {
  return sentences.reduce(
    (n, s) => n + s.text.split(/\s+/).filter(Boolean).length,
    0
  );
}

// Lấy id số cuối trong URL bài VOA (/a/.../<id>.html) để làm audio_key ổn định.
function audioKeyFor(source: string, sourceUrl: string): string {
  const m = /(\d{4,})\.html/.exec(sourceUrl) ?? /(\d{4,})/.exec(sourceUrl);
  const id = m ? m[1] : String(Date.now());
  return `shadowing/${source}/${id}.mp3`;
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!user.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = (await req.json().catch(() => null)) as
      | (Record<string, unknown> & { sentences?: unknown })
      | null;
    if (!body) return NextResponse.json({ error: 'Body JSON không hợp lệ.' }, { status: 400 });

    const source = String(body.source ?? '');
    const sourceUrl = String(body.source_url ?? '');
    const mp3Url = String(body.mp3_url ?? '');
    const title = String(body.title ?? '').trim();
    const program = body.program == null ? null : String(body.program);
    const level = Number(body.level);
    const durationMs =
      body.duration_ms == null ? null : Math.max(0, Math.round(Number(body.duration_ms)));

    if (source !== 'voa' && source !== 'youtube') {
      return NextResponse.json({ error: 'source phải là voa|youtube.' }, { status: 400 });
    }
    if (!sourceUrl || !mp3Url || !title) {
      return NextResponse.json({ error: 'Thiếu source_url / mp3_url / title.' }, { status: 400 });
    }
    if (!Number.isInteger(level) || level < 0 || level > 5) {
      return NextResponse.json({ error: 'level phải 0..5.' }, { status: 400 });
    }
    const rawSentences = Array.isArray(body.sentences) ? (body.sentences as SentenceInput[]) : [];
    const sentences = rawSentences.filter((s) => s && typeof s.text === 'string' && s.text.trim());
    if (sentences.length === 0) {
      return NextResponse.json({ error: 'Không có câu nào.' }, { status: 400 });
    }

    // Idempotency: đã nhập bài này rồi thì bỏ qua.
    const existing = await shadowingLessonsDb.getBySourceUrl(sourceUrl);
    if (existing) {
      return NextResponse.json({ skipped: true, id: existing.id, reason: 'source_url đã tồn tại' });
    }

    // Fetch MP3 (public) rồi put R2. Cần binding AUDIO_BUCKET (chỉ có ở runtime
    // Workers — ingest luôn chạy nhắm vào worker đã deploy).
    let bucket;
    try {
      bucket = await getAudioBucket();
    } catch {
      return NextResponse.json(
        { error: 'R2 AUDIO_BUCKET không có (chạy ingest nhắm vào worker đã deploy, không phải next dev).' },
        { status: 501 }
      );
    }

    const audioKey = audioKeyFor(source, sourceUrl);
    const audioRes = await fetch(mp3Url, { headers: { 'User-Agent': UA, Accept: '*/*' } });
    if (!audioRes.ok) {
      return NextResponse.json(
        { error: `Tải MP3 lỗi: HTTP ${audioRes.status}` },
        { status: 502 }
      );
    }
    const audioBuf = await audioRes.arrayBuffer();
    if (audioBuf.byteLength === 0) {
      return NextResponse.json({ error: 'MP3 rỗng.' }, { status: 502 });
    }
    await bucket.put(audioKey, audioBuf, { httpMetadata: { contentType: 'audio/mpeg' } });

    const wc = wordCountOf(sentences);
    const wpm =
      durationMs && durationMs > 0 ? Math.round(wc / (durationMs / 60000)) : null;

    const lessonId = await shadowingLessonsDb.create({
      source,
      source_url: sourceUrl,
      title,
      program,
      level,
      audio_key: audioKey,
      duration_ms: durationMs,
      word_count: wc,
      wpm,
    });

    await shadowingSentencesDb.createMany(
      lessonId,
      sentences.map((s) => ({
        text: s.text.trim(),
        translation_vi: s.translation_vi ?? null,
        start_ms: s.start_ms ?? null,
        end_ms: s.end_ms ?? null,
        words: s.words ?? null,
        marks: null,
      }))
    );

    return NextResponse.json({
      id: lessonId,
      audio_key: audioKey,
      audio_bytes: audioBuf.byteLength,
      sentences: sentences.length,
      word_count: wc,
      wpm,
    });
  } catch (err) {
    console.error('[shadowing/ingest POST] error:', err);
    return NextResponse.json({ error: 'Internal error.' }, { status: 500 });
  }
}
