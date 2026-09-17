import { NextResponse } from 'next/server';
import { requireUserId, UnauthorizedError } from '@/lib/current-user';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ⚠️ SPIKE (S0.3 + S0.4) — trang/route thử nghiệm, BỎ ĐI ĐƯỢC.
// Chuyển thẳng audio ghi từ trình duyệt sang Azure Pronunciation Assessment
// (REST short-audio) để soi:
//   S0.3 — Azure có nhận định dạng MediaRecorder xuất ra (webm/opus, mp4/aac)
//          hay phải convert sang WAV 16kHz PCM ở client trước?
//   S0.4 — REST có trả UnexpectedBreak / MissingBreak / Monotone + prosody?
//
// Cần env (bạn tự thêm vào .dev.vars — mình KHÔNG đụng file đó):
//   AZURE_SPEECH_KEY (hoặc AZURE_SPEECH), AZURE_SPEECH_REGION
//
// Client gửi: POST body = raw audio bytes; Content-Type = mime của bản ghi;
// query ?text=<referenceText>&lang=en-US
export async function POST(req: Request) {
  try {
    await requireUserId();

    // Chấp nhận cả AZURE_SPEECH_KEY lẫn AZURE_SPEECH (tùy tên bạn đặt).
    const key = process.env.AZURE_SPEECH_KEY ?? process.env.AZURE_SPEECH;
    const region = process.env.AZURE_SPEECH_REGION;
    if (!key || !region) {
      return NextResponse.json(
        { error: 'Chưa cấu hình AZURE_SPEECH_KEY (hoặc AZURE_SPEECH) / AZURE_SPEECH_REGION trong .dev.vars.' },
        { status: 501 }
      );
    }

    const url = new URL(req.url);
    const referenceText = url.searchParams.get('text') ?? '';
    const language = url.searchParams.get('lang') ?? 'en-US';
    const audioContentType = req.headers.get('content-type') ?? 'audio/webm; codecs=opus';

    const audio = await req.arrayBuffer();
    if (audio.byteLength === 0) {
      return NextResponse.json({ error: 'Body audio rỗng.' }, { status: 400 });
    }

    // Cấu hình chấm — bật prosody để trả lời S0.4. Phoneme granularity + IPA.
    const paConfig = {
      ReferenceText: referenceText,
      GradingSystem: 'HundredMark',
      Granularity: 'Phoneme',
      PhonemeAlphabet: 'IPA',
      EnableMiscue: true,
      EnableProsodyAssessment: true,
    };
    const paHeader = Buffer.from(JSON.stringify(paConfig), 'utf-8').toString('base64');

    const endpoint =
      `https://${region}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1` +
      `?language=${encodeURIComponent(language)}&format=detailed`;

    const azureRes = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': key,
        'Pronunciation-Assessment': paHeader,
        'Content-Type': audioContentType,
        Accept: 'application/json',
      },
      body: audio,
    });

    const raw = await azureRes.text();
    let parsed: unknown = null;
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = null;
    }

    // Trả nguyên trạng để soi ở client — đây là spike, không phải endpoint thật.
    return NextResponse.json({
      sent: { audioContentType, audioBytes: audio.byteLength, referenceText, language },
      azure: {
        status: azureRes.status,
        ok: azureRes.ok,
        body: parsed ?? raw.slice(0, 4000),
      },
    });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[shadowing/spike-assess POST] error:', err);
    return NextResponse.json({ error: 'Internal error.' }, { status: 500 });
  }
}
