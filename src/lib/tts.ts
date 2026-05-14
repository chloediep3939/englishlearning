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
