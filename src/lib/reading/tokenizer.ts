// Read-Along tokenizer — pure logic, safe to import from client code.
// Ported from the design prototype (design/design_handoff_readalong, RA_clean /
// RA_tokenize) with paragraph→sentence splitting added for production passages.

export interface Token {
  text: string;
  start: number;
  end: number;
  isWord: boolean;
}

export interface FlatSentence {
  pIdx: number; // paragraph index
  sIdx: number; // sentence index within paragraph
  gi: number;   // global flat index across the whole passage
  text: string;
  tokens: Token[];
}

/** Clean a word for glossary lookup: lowercase, keep only a–z and apostrophe. */
export function cleanWord(s: string): string {
  return s.toLowerCase().replace(/[^a-z']/g, '');
}

/**
 * Tokenize a sentence into word + whitespace chunks, keeping char offsets.
 * Offsets matter: the TTS `onboundary` event reports a `charIndex` into the
 * sentence string, mapped back to a token to know which word to highlight.
 */
export function tokenize(sentence: string): Token[] {
  const tokens: Token[] = [];
  const re = /(\s+|[^\s]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(sentence))) {
    const text = m[0];
    tokens.push({
      text,
      start: m.index,
      end: m.index + text.length,
      isWord: /\S/.test(text),
    });
  }
  return tokens;
}

/**
 * Split passage text into paragraphs → sentences, then flatten.
 * Sentence splitting is regex-based (period/question/exclamation). Edge cases
 * (abbreviations like "Dr.", "U.S.") may split imperfectly — accepted for now
 * per the prompt; can be upgraded to an NLP segmenter later.
 */
export function splitPassage(content: string): {
  paragraphs: string[][];
  flat: FlatSentence[];
} {
  const rawParas = content.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  // Single-newline-only content (one block) still yields one paragraph.
  const paras = rawParas.length > 0 ? rawParas : (content.trim() ? [content.trim()] : []);
  const paragraphs: string[][] = paras.map((p) => {
    const matched = p.match(/[^.!?]*[.!?]+[\s]*/g);
    const sents = matched ? matched.map((s) => s.trim()).filter(Boolean) : [];
    // Trailing text with no terminal punctuation is still a sentence.
    if (sents.length === 0) return [p.trim()];
    const consumed = sents.join(' ').length;
    if (consumed < p.replace(/\s+/g, ' ').trim().length) {
      const tail = p.slice(p.lastIndexOf(sents[sents.length - 1]) + sents[sents.length - 1].length).trim();
      if (tail) sents.push(tail);
    }
    return sents;
  });

  const flat: FlatSentence[] = [];
  paragraphs.forEach((para, pIdx) => {
    para.forEach((text, sIdx) => {
      flat.push({ pIdx, sIdx, gi: flat.length, text, tokens: tokenize(text) });
    });
  });

  return { paragraphs, flat };
}

/**
 * Extract distinct cleaned content words from a flat sentence list, skipping
 * stop words. Used to decide which words to pre-fetch from the glossary API.
 */
export function contentWords(flat: FlatSentence[], stopWords: ReadonlySet<string>): string[] {
  const seen = new Set<string>();
  for (const s of flat) {
    for (const t of s.tokens) {
      if (!t.isWord) continue;
      const c = cleanWord(t.text);
      if (c.length < 2 || stopWords.has(c)) continue;
      seen.add(c);
    }
  }
  return [...seen];
}
