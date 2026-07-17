// Edge TTS — Microsoft Edge "Read Aloud" neural voices via the UNOFFICIAL
// WebSocket API (the same protocol the `edge-tts` reference implementation
// speaks). Free, no key — but Microsoft can rotate the DRM scheme at any
// time, so every failure resolves to `null` and callers must fall back
// (the reader falls back to browser speechSynthesis).
//
// Besides the mp3, synthesis reports WORD BOUNDARY metadata (audio offset of
// each spoken word) — that's what lets the karaoke reader keep per-word
// highlighting while playing a recorded file.
//
// Server-only. Transport is the Cloudflare Workers fetch-upgrade WebSocket
// (`resp.webSocket`), which allows the custom Origin/UA handshake headers the
// endpoint expects. Under plain `next dev` (Node) `resp.webSocket` is absent
// → returns null → the client keeps using browser TTS locally; the real
// behavior is exercised via `npm run preview` / deploy.
//
// All constants Microsoft may rotate live below for easy patching. The
// version/UA MUST track a current Edge release — stale versions get 403
// (verified 2026-07-16: 130.x → 403, 143.x → 101).

const TRUSTED_CLIENT_TOKEN = '6A5AA1D4EAFF4E9FB37E23D68491D6F4';
const SEC_MS_GEC_VERSION = '1-143.0.3650.75';
const EDGE_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) ' +
  'Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0';
const EDGE_ORIGIN = 'chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold';
const ENDPOINT =
  'https://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1';
const OUTPUT_FORMAT = 'audio-24khz-48kbitrate-mono-mp3';
const DEFAULT_VOICE = 'en-US-AriaNeural';
const SYNTH_TIMEOUT_MS = 10_000;

/** Minimal local shape of the Cloudflare-specific client WebSocket returned
 *  by a fetch upgrade. Kept local per repo rule: no @cloudflare/workers-types
 *  imports outside the db layer. */
interface CfWebSocket {
  accept(): void;
  send(data: string | ArrayBuffer): void;
  close(code?: number, reason?: string): void;
  addEventListener(type: 'message', handler: (ev: { data: unknown }) => void): void;
  addEventListener(type: 'close' | 'error', handler: () => void): void;
}

/** Sec-MS-GEC DRM token: SHA-256 of (Windows file-time ticks rounded down to
 *  5 minutes + trusted client token), hex uppercase. Time-dependent by
 *  design (documented per CLAUDE.md §6.8 — the token is only valid within
 *  the current 5-minute window). */
async function secMsGec(): Promise<string> {
  const WINDOWS_EPOCH_OFFSET_S = 11_644_473_600; // 1601-01-01 → 1970-01-01
  let seconds = Math.floor(Date.now() / 1000) + WINDOWS_EPOCH_OFFSET_S;
  seconds -= seconds % 300; // round down to the 5-minute boundary
  // Ticks = seconds × 10^7. That product overflows Number.MAX_SAFE_INTEGER,
  // and the tsconfig target predates BigInt literals — string-append the 7
  // zeros instead (exact, since `seconds` is an integer).
  const ticksStr = `${seconds}0000000`;
  const bytes = new TextEncoder().encode(`${ticksStr}${TRUSTED_CLIENT_TOKEN}`);
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(hash)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function concatChunks(chunks: Uint8Array[]): ArrayBuffer {
  const total = chunks.reduce((n, c) => n + c.byteLength, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.byteLength;
  }
  return out.buffer;
}

export interface EdgeWordBoundary {
  /** Offset of the word in the audio, in seconds. */
  offsetSec: number;
  /** The spoken word text as reported by the synthesizer. */
  text: string;
}

export interface EdgeSynthesisResult {
  mp3: ArrayBuffer;
  boundaries: EdgeWordBoundary[];
}

export interface EdgeTtsOptions {
  /** Neural voice name, e.g. 'en-US-AriaNeural' (default) / 'en-US-JennyNeural'. */
  voice?: string;
}

/** Shape of a `Path:audio.metadata` frame's JSON payload. */
interface MetadataPayload {
  Metadata?: Array<{
    Type?: string;
    Data?: {
      Offset?: number; // 100-ns ticks from audio start
      text?: { Text?: string };
    };
  }>;
}

/**
 * Synthesize `text` as one fluent mp3 utterance WITH word-boundary timings.
 * Returns null on ANY failure (endpoint change, non-workerd runtime, timeout,
 * empty audio). Never throws.
 */
export async function synthesizeEdgeTts(
  text: string,
  opts: EdgeTtsOptions = {},
): Promise<EdgeSynthesisResult | null> {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const voice = opts.voice ?? DEFAULT_VOICE;

  try {
    const qs = new URLSearchParams({
      TrustedClientToken: TRUSTED_CLIENT_TOKEN,
      'Sec-MS-GEC': await secMsGec(),
      'Sec-MS-GEC-Version': SEC_MS_GEC_VERSION,
      ConnectionId: crypto.randomUUID().replace(/-/g, ''),
    });
    const resp = await fetch(`${ENDPOINT}?${qs}`, {
      headers: {
        Upgrade: 'websocket',
        Origin: EDGE_ORIGIN,
        'User-Agent': EDGE_UA,
        'Accept-Language': 'en-US,en',
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
      },
    });
    const ws = (resp as unknown as { webSocket?: CfWebSocket | null }).webSocket;
    if (!ws) return null; // non-workerd runtime or handshake rejected

    return await new Promise<EdgeSynthesisResult | null>((resolve) => {
      const chunks: Uint8Array[] = [];
      const boundaries: EdgeWordBoundary[] = [];
      let settled = false;

      const finish = (result: EdgeSynthesisResult | null) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeoutId);
        try {
          ws.close(1000, 'done');
        } catch {
          /* already closed */
        }
        resolve(result);
      };
      const assemble = (): EdgeSynthesisResult | null =>
        chunks.length > 0 ? { mp3: concatChunks(chunks), boundaries } : null;
      const timeoutId = setTimeout(() => finish(null), SYNTH_TIMEOUT_MS);

      ws.addEventListener('message', (ev) => {
        const data = ev.data;
        if (typeof data === 'string') {
          if (data.includes('Path:audio.metadata')) {
            // Word boundary frame: headers \r\n\r\n JSON payload.
            const sep = data.indexOf('\r\n\r\n');
            if (sep >= 0) {
              try {
                const payload = JSON.parse(data.slice(sep + 4)) as MetadataPayload;
                for (const m of payload.Metadata ?? []) {
                  if (m.Type === 'WordBoundary' && m.Data) {
                    boundaries.push({
                      offsetSec: (m.Data.Offset ?? 0) / 10_000_000,
                      text: m.Data.text?.Text ?? '',
                    });
                  }
                }
              } catch {
                /* malformed metadata frame — highlighting degrades, audio fine */
              }
            }
          } else if (data.includes('Path:turn.end')) {
            finish(assemble());
          }
          return;
        }
        if (data instanceof ArrayBuffer) {
          // Binary frame: uint16-BE header length + ASCII headers + payload.
          if (data.byteLength < 2) return;
          const headerLen = new DataView(data).getUint16(0);
          if (data.byteLength < 2 + headerLen) return;
          const header = new TextDecoder().decode(data.slice(2, 2 + headerLen));
          if (header.includes('Path:audio')) {
            chunks.push(new Uint8Array(data.slice(2 + headerLen)));
          }
        }
      });
      ws.addEventListener('close', () => finish(assemble()));
      ws.addEventListener('error', () => finish(null));

      ws.accept();
      const ts = new Date().toISOString();
      ws.send(
        `X-Timestamp:${ts}\r\nContent-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n` +
          JSON.stringify({
            context: {
              synthesis: {
                audio: {
                  metadataoptions: {
                    sentenceBoundaryEnabled: 'false',
                    wordBoundaryEnabled: 'true',
                  },
                  outputFormat: OUTPUT_FORMAT,
                },
              },
            },
          }),
      );
      ws.send(
        `X-RequestId:${crypto.randomUUID().replace(/-/g, '')}\r\nContent-Type:application/ssml+xml\r\n` +
          `X-Timestamp:${ts}\r\nPath:ssml\r\n\r\n` +
          `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-US'>` +
          `<voice name='${voice}'><prosody pitch='+0Hz' rate='+0%' volume='+0%'>` +
          `${escapeXml(trimmed)}</prosody></voice></speak>`,
      );
    });
  } catch {
    return null; // network refusal, fetch throw in Node, anything — degrade
  }
}
