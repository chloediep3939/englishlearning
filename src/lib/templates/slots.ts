// Slot parsing/substitution for PTE speaking templates.
// Pure logic, safe to import from client code — mirrors chunker.ts.
//
// A "frame" is the raw template text the user pastes: it contains [slot]
// tokens (e.g. [topic], [N1] … — any bracketed name, count NOT hard-coded)
// plus "/" (minor break) and "//" (sentence break) thought-group markers.
// Substitution always runs BEFORE parseManualBreaks: slot values are
// multi-word, so the "/" positions only stabilize once slots are filled.

/** Matches one [slot] token. Name = letter followed by letters/digits/space/_/- (≤31 chars). */
export const SLOT_RE = /\[([A-Za-z][A-Za-z0-9 _-]{0,30})\]/g;

/** Unique slot names in first-appearance order: ["topic", "N1", …]. */
export function extractSlots(frameText: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const m of frameText.matchAll(SLOT_RE)) {
    const name = m[1].trim();
    if (!seen.has(name)) {
      seen.add(name);
      out.push(name);
    }
  }
  return out;
}

/**
 * Replace every [name] with values[name] (trimmed). Slots without a
 * non-empty value are left as-is and reported in `missing` so callers can
 * validate before saving.
 */
export function fillTemplate(
  frameText: string,
  values: Record<string, string>,
): { text: string; missing: string[] } {
  const missing = new Set<string>();
  const text = frameText.replace(SLOT_RE, (whole, rawName: string) => {
    const name = rawName.trim();
    const v = values[name]?.trim();
    if (!v) {
      missing.add(name);
      return whole;
    }
    return v;
  });
  return { text, missing: [...missing] };
}

/**
 * Remove all [slot] tokens from the frame so the karaoke reader can speak
 * the frame itself. Keeps "/" markers; cleans the space/punctuation debris
 * substitution leaves behind (e.g. "mentioning  ." → "mentioning.").
 */
export function stripSlots(frameText: string): string {
  return frameText
    .replace(SLOT_RE, '')
    .replace(/[ \t]+([.,;:])/g, '$1')
    .replace(/[ \t]{2,}/g, ' ')
    .split('\n')
    .map((l) => l.trim())
    .join('\n')
    .trim();
}

export interface FrameToken {
  kind: 'word' | 'slot' | 'break';
  /** Verbatim text: the word (punctuation attached), slot name, or slash run. */
  text: string;
  slotName?: string;
  /** 1 = "/" minor break, 2 = "//" (or longer run) sentence break. */
  breakLevel?: 1 | 2;
  lineIdx: number;
}

/** Tokenize the raw frame line-by-line for the memorize trainer. */
export function parseFrame(frameText: string): FrameToken[] {
  const out: FrameToken[] = [];
  const lines = frameText.split('\n');
  const tokenRe = /\[([A-Za-z][A-Za-z0-9 _-]{0,30})\]|(\/+)|(\S+)/g;
  lines.forEach((line, lineIdx) => {
    if (!line.trim()) return;
    for (const m of line.matchAll(tokenRe)) {
      if (m[1] !== undefined) {
        out.push({ kind: 'slot', text: m[1].trim(), slotName: m[1].trim(), lineIdx });
      } else if (m[2] !== undefined) {
        out.push({ kind: 'break', text: m[2], breakLevel: m[2].length >= 2 ? 2 : 1, lineIdx });
      } else {
        out.push({ kind: 'word', text: m[3], lineIdx });
      }
    }
  });
  return out;
}

/**
 * Deterministic hide decision for the progressive-memorization mode
 * (no Math.random — CLAUDE.md §6.8: same words hidden on every render).
 * Knuth multiplicative hash spreads ordinals across 0–99; a word is hidden
 * when its score falls below the level, so hiding is MONOTONIC: everything
 * hidden at 25% stays hidden at 50/75/100 — "học thuộc dần".
 */
export function isWordHidden(wordOrdinal: number, levelPercent: number): boolean {
  if (levelPercent <= 0) return false;
  if (levelPercent >= 100) return true;
  const score = (((wordOrdinal + 1) * 2654435761) >>> 0) % 100;
  return score < levelPercent;
}
