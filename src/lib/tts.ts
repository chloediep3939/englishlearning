// Client-side TTS helper that honors the user's `voice_preference` setting.
// Pure browser code — no server-only imports — so client components can pull
// it without breaking the Cloudflare context boundary.

export interface TtsOptions {
  voice_preference?: string;
  lang?: string;
  rate?: number;
}

const VOICE_PREF_KEY = 'voice_preference';

/**
 * Returns the user's stored voice preference, falling back to 'auto' when
 * unavailable (SSR, localStorage disabled, or never set). Callers should
 * treat any value other than the literal 'auto' as the SpeechSynthesisVoice
 * .name to prefer.
 */
export function getStoredVoicePreference(): string {
  if (typeof window === 'undefined') return 'auto';
  try {
    return window.localStorage.getItem(VOICE_PREF_KEY) ?? 'auto';
  } catch {
    return 'auto';
  }
}

/**
 * Persist the preference locally so non-React TTS callers (e.g. AudioButton)
 * can read it without re-fetching /api/settings. The Settings page calls this
 * any time the user changes the voice; the source of truth is still the DB.
 */
export function setStoredVoicePreference(pref: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(VOICE_PREF_KEY, pref);
  } catch {
    /* ignore */
  }
}

/**
 * Speak `text` with the user's preferred voice. Falls back to the browser
 * default when the preferred voice isn't available (e.g. on a different
 * device). Cancels any in-flight utterance first to keep playback snappy
 * when the user clicks multiple cards quickly.
 *
 * Safe to call in environments without speechSynthesis (returns silently).
 */
export function speak(text: string, opts: TtsOptions = {}): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  const synth = window.speechSynthesis;

  const doSpeak = () => {
    try {
      synth.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = opts.lang ?? 'en-US';
      if (opts.rate !== undefined) u.rate = opts.rate;
      const voices = synth.getVoices();
      let voice: SpeechSynthesisVoice | undefined;
      if (opts.voice_preference && opts.voice_preference !== 'auto') {
        voice = voices.find((v) => v.name === opts.voice_preference);
      }
      // Fallback: prefer an en-US voice over the browser default so we don't
      // get en-GB on Macs when the caller didn't pick one explicitly.
      if (!voice && (opts.lang ?? 'en-US').startsWith('en')) {
        voice =
          voices.find((v) => v.lang === 'en-US') ??
          voices.find((v) => v.lang.toLowerCase().startsWith('en-us')) ??
          voices.find((v) => v.lang.toLowerCase().startsWith('en'));
      }
      if (voice) u.voice = voice;
      synth.speak(u);
    } catch {
      /* ignore — TTS is best-effort */
    }
  };

  if (synth.getVoices().length === 0) {
    synth.addEventListener('voiceschanged', doSpeak, { once: true });
    synth.getVoices(); // kick browsers that need it
  } else {
    doSpeak();
  }
}

export interface SpeakWordOptions extends TtsOptions {
  /** Recorded pronunciation file (from dictionary lookup). Preferred over
   *  speechSynthesis for single words. Ignored for multi-word entries. */
  audioUrl?: string | null;
}

/**
 * Play pronunciation for a vocabulary entry. Prefers a real recorded
 * audio file (from dictionary lookup) for SINGLE words; falls back to
 * `speak()` for multi-word entries, missing files, or playback failure.
 *
 * Why the multi-word guard: phrasal verbs / collocations like
 * "come in", "give up", "look forward to" have no per-phrase recording.
 * The dictionary API may return audio for just the first word ("come"),
 * which would play wrong. Anything with internal whitespace skips
 * `audio_url` entirely so speechSynthesis can say the full phrase.
 *
 * Hyphenated single words ("well-known") have no internal whitespace
 * and are treated as single words.
 */
export async function speakWord(
  word: string,
  opts: SpeakWordOptions = {},
): Promise<void> {
  const url = isSingleWord(word) ? normalizeAudioUrl(opts.audioUrl) : null;

  if (url) {
    try {
      await playAudioUrl(url, opts.rate);
      return;
    } catch {
      // network error / 404 / decode failure → fall through to TTS
    }
  }

  speak(word, {
    rate: opts.rate,
    lang: opts.lang,
    voice_preference: opts.voice_preference,
  });
}

function isSingleWord(word: string): boolean {
  return !/\s/.test(word.trim());
}

function normalizeAudioUrl(raw?: string | null): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  // Free Dictionary API sometimes returns protocol-relative URLs.
  if (trimmed.startsWith('//')) return 'https:' + trimmed;
  return trimmed;
}

function playAudioUrl(url: string, rate?: number): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('no window'));
      return;
    }
    const audio = new Audio(url);
    // Recorded audio at >1.5x sounds chipmunky and <0.5x sounds garbled;
    // synthesized voices handle the extremes better than re-pitched mp3s,
    // so clamp here even though `speak()` allows a wider range.
    if (rate && rate > 0) audio.playbackRate = Math.min(1.5, Math.max(0.5, rate));
    audio.onended = () => resolve();
    audio.onerror = () => reject(new Error('audio playback failed'));
    audio.play().catch(reject);
  });
}
