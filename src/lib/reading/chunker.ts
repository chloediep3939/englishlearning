// Thought-group (chunk) splitting for PTE-style read-aloud practice.
// Pure logic, safe to import from client code — mirrors tokenizer.ts.
//
// A sentence's chunking is represented as a sorted array of *word-token
// indices* where a new chunk begins ("break before this token"). The first
// word token is always an implicit chunk start and never appears in the array.

import type { FlatSentence, Token } from '@/lib/reading/tokenizer';

/** Words that usually open a new thought group (conjunctions, relatives,
 *  subordinators). Break *before* these when both sides are long enough. */
const BREAK_BEFORE = new Set([
  'and', 'but', 'or', 'so', 'yet', 'nor',
  'which', 'who', 'whom', 'whose', 'that',
  'because', 'although', 'though', 'while', 'whereas',
  'when', 'where', 'if', 'unless', 'since', 'after', 'before', 'until', 'as',
]);

/** Punctuation that ends a thought group when trailing a word. */
const BREAK_AFTER_PUNCT = /[,;:—–]$|^[—–]$/;

/** Indices of word tokens in a token list, in order. */
export function wordTokenIndices(tokens: Token[]): number[] {
  const out: number[] = [];
  tokens.forEach((t, i) => {
    if (t.isWord) out.push(i);
  });
  return out;
}

/**
 * Rule-based chunking. Heuristics (~80% of PTE coaching guidance):
 *  - break after , ; : and dashes
 *  - break before conjunctions / relative pronouns / subordinators
 *  - never produce tiny fragments (min 2 words after a punctuation break,
 *    min 3 words on both sides for a conjunction break)
 */
export function chunkSentence(tokens: Token[]): number[] {
  const words = wordTokenIndices(tokens);
  if (words.length < 5) return []; // short sentences read as one group

  const breaks: number[] = [];
  let sinceBreak = 1; // word count in the current chunk (starts at first word)

  for (let w = 1; w < words.length; w++) {
    const ti = words[w];
    const remaining = words.length - w;
    const prev = tokens[words[w - 1]].text;
    const cur = tokens[ti].text.toLowerCase().replace(/[^a-z']/g, '');

    const punctBreak = BREAK_AFTER_PUNCT.test(prev) && sinceBreak >= 2 && remaining >= 2;
    const conjBreak = BREAK_BEFORE.has(cur) && sinceBreak >= 3 && remaining >= 3;

    if (punctBreak || conjBreak) {
      breaks.push(ti);
      sinceBreak = 1;
    } else {
      sinceBreak++;
    }
  }
  return breaks;
}

export interface ChunkRange {
  /** Token index of the first word of the chunk. */
  startTok: number;
  /** Exclusive token bound (next chunk's start token, or tokens.length). */
  endTokEx: number;
  /** Chunk substring of the sentence (trimmed), for TTS. */
  text: string;
}

/** Derive concrete chunk ranges + texts from a break list. */
export function chunkRanges(s: FlatSentence, breaks: number[]): ChunkRange[] {
  const words = wordTokenIndices(s.tokens);
  if (words.length === 0) return [];
  const starts = [words[0], ...breaks.filter((b) => b !== words[0]).sort((a, b) => a - b)];
  return starts.map((startTok, i) => {
    const nextStart = starts[i + 1];
    const endTokEx = nextStart ?? s.tokens.length;
    const startChar = s.tokens[startTok].start;
    const endChar = nextStart !== undefined ? s.tokens[nextStart].start : s.text.length;
    return { startTok, endTokEx, text: s.text.slice(startChar, endChar).trim() };
  });
}

/**
 * Parse a pasted passage that already contains "/" chunk markers. Strips the
 * slashes to get clean reading content, and records which *global* word index
 * (0-based across the whole passage) starts each new chunk. Any run of "/" is
 * one break; slashes attached to words ("word/") are handled.
 */
export function parseManualBreaks(raw: string): { content: string; breakWordIndices: number[] } {
  const breakWordIndices: number[] = [];
  // Space out every slash so attached ones become standalone tokens.
  const parts = raw.replace(/\//g, ' / ').split(/\s+/).filter(Boolean);
  let wordCount = 0;
  let pending = false;
  for (const p of parts) {
    if (p === '/') {
      pending = true;
      continue;
    }
    if (pending) {
      breakWordIndices.push(wordCount);
      pending = false;
    }
    wordCount++;
  }
  // Clean content: drop slashes, collapse intra-line spaces, keep paragraph
  // breaks (blank lines) so splitPassage still sees paragraphs.
  const content = raw
    .replace(/\/+/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .split('\n')
    .map((l) => l.trim())
    .join('\n')
    .trim();
  return { content, breakWordIndices };
}

/**
 * Map a list of global word indices (chunk starts) to a per-sentence break
 * map keyed by sentence gi → word-token indices. Skips indices that land on
 * the first word of a sentence (implicit chunk start).
 */
export function globalBreaksToMap(
  sentences: FlatSentence[],
  globalBreakIdx: number[],
): Record<number, number[]> {
  const wordPositions: { gi: number; tokIdx: number }[] = [];
  for (const s of sentences) {
    s.tokens.forEach((t, ti) => {
      if (t.isWord) wordPositions.push({ gi: s.gi, tokIdx: ti });
    });
  }
  const map: Record<number, number[]> = {};
  for (const gwi of globalBreakIdx) {
    const pos = wordPositions[gwi];
    if (!pos) continue;
    const firstTok = sentences[pos.gi].tokens.findIndex((t) => t.isWord);
    if (pos.tokIdx === firstTok) continue; // implicit start, skip
    (map[pos.gi] ??= []).push(pos.tokIdx);
  }
  for (const gi of Object.keys(map)) {
    const n = Number(gi);
    map[n] = [...new Set(map[n])].sort((a, b) => a - b);
  }
  return map;
}

/**
 * Align AI-returned chunk strings back to token break indices. The AI must
 * reproduce the sentence's words verbatim in order; we only trust word
 * *counts* per chunk. Returns null when the counts don't add up (caller keeps
 * the rule-based / manual breaks for that sentence).
 */
export function alignChunksToBreaks(s: FlatSentence, chunks: string[]): number[] | null {
  const words = wordTokenIndices(s.tokens);
  const counts = chunks.map((c) => c.split(/\s+/).filter(Boolean).length);
  const total = counts.reduce((a, b) => a + b, 0);
  if (total !== words.length || counts.some((c) => c === 0)) return null;
  const breaks: number[] = [];
  let acc = 0;
  for (let i = 0; i < counts.length - 1; i++) {
    acc += counts[i];
    breaks.push(words[acc]);
  }
  return breaks;
}
