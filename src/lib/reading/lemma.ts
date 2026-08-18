// Base-form candidates for inflected English words — rule-based + a table of
// common irregulars. No dependency: wink-lemmatizer broke the OpenNext/Workers
// build (the reason this file was stubbed to identity for a while, which made
// `lemmaCandidates` always return [] and silently killed the headword retry in
// /api/words/lookup and the Oxford audio fallback).
//
// Candidates are GUESSES — callers try each against a dictionary, so a wrong
// guess ("bias" → "bia") just misses and costs one lookup. Order: irregular
// table first (exact), then suffix rules.

const IRREGULARS: Record<string, string> = {
  // be / have / do
  am: 'be', is: 'be', are: 'be', was: 'be', were: 'be', been: 'be', being: 'be',
  has: 'have', had: 'have', having: 'have',
  does: 'do', did: 'do', done: 'do',
  // very common verbs
  went: 'go', gone: 'go', goes: 'go',
  ran: 'run', took: 'take', taken: 'take', gave: 'give', given: 'give',
  made: 'make', said: 'say', saw: 'see', seen: 'see', came: 'come',
  knew: 'know', known: 'know', thought: 'think', bought: 'buy',
  brought: 'bring', felt: 'feel', kept: 'keep', left: 'leave', lost: 'lose',
  met: 'meet', paid: 'pay', sold: 'sell', told: 'tell', stood: 'stand',
  understood: 'understand', wrote: 'write', written: 'write', spoke: 'speak',
  spoken: 'speak', broke: 'break', broken: 'break', chose: 'choose',
  chosen: 'choose', drove: 'drive', driven: 'drive', ate: 'eat', eaten: 'eat',
  fell: 'fall', fallen: 'fall', flew: 'fly', flown: 'fly', grew: 'grow',
  grown: 'grow', held: 'hold', heard: 'hear', led: 'lead', rose: 'rise',
  risen: 'rise', sat: 'sit', sent: 'send', built: 'build', spent: 'spend',
  won: 'win', wore: 'wear', worn: 'wear', threw: 'throw', thrown: 'throw',
  got: 'get', gotten: 'get', found: 'find', began: 'begin', begun: 'begin',
  became: 'become', showed: 'show', shown: 'show', meant: 'mean',
  // nouns
  men: 'man', women: 'woman', children: 'child', mice: 'mouse', feet: 'foot',
  teeth: 'tooth', people: 'person', lives: 'life', leaves: 'leaf',
  // adjectives
  better: 'good', best: 'good', worse: 'bad', worst: 'bad',
};

const DOUBLE_CONSONANT = /([bcdfghjklmnpqrstvwxz])\1$/;

/**
 * Distinct base-form candidates for a cleaned word (lowercase, a–z +
 * apostrophe). Excludes the input itself and anything shorter than 2 chars.
 * Capped to 4 to bound the Oxford / MS Dictionary retry fan-out.
 */
export function lemmaCandidates(word: string): string[] {
  const w = word.toLowerCase();
  if (w.length < 3) return [];
  const out: string[] = [];
  const add = (x: string) => {
    if (x.length >= 2 && x !== w && !out.includes(x)) out.push(x);
  };

  const irregular = IRREGULARS[w];
  if (irregular) add(irregular);

  // Plural / 3rd person: -ies → -y, -es → ∅ / -e kept, -s → ∅.
  if (w.length >= 5 && w.endsWith('ies')) add(w.slice(0, -3) + 'y');
  if (w.endsWith('es')) {
    add(w.slice(0, -2)); // boxes → box, watches → watch
    add(w.slice(0, -1)); // phrases → phrase
  } else if (w.endsWith('s') && !w.endsWith('ss')) {
    add(w.slice(0, -1)); // remains → remain
  }

  // Past: -ied → -y, -ed → ∅ / +e / de-double.
  if (w.length >= 5 && w.endsWith('ied')) add(w.slice(0, -3) + 'y');
  if (w.length >= 4 && w.endsWith('ed')) {
    const stem = w.slice(0, -2);
    add(stem); // walked → walk
    add(stem + 'e'); // hoped → hope
    if (DOUBLE_CONSONANT.test(stem)) add(stem.slice(0, -1)); // stopped → stop
  }

  // Progressive: -ing → ∅ / +e / de-double.
  if (w.length >= 5 && w.endsWith('ing')) {
    const stem = w.slice(0, -3);
    add(stem); // walking → walk
    add(stem + 'e'); // making → make
    if (DOUBLE_CONSONANT.test(stem)) add(stem.slice(0, -1)); // running → run
  }

  // Comparative / superlative: -er / -est.
  if (w.length >= 5 && w.endsWith('est')) {
    const stem = w.slice(0, -3);
    add(stem); // smallest → small
    add(stem + 'e'); // largest → large
    if (DOUBLE_CONSONANT.test(stem)) add(stem.slice(0, -1)); // biggest → big
  } else if (w.length >= 4 && w.endsWith('er')) {
    const stem = w.slice(0, -2);
    add(stem); // smaller → small
    add(stem + 'e'); // larger → large
    if (DOUBLE_CONSONANT.test(stem)) add(stem.slice(0, -1)); // bigger → big
  }

  return out.slice(0, 4);
}
