/**
 * Generate plausible misspellings via algorithmic transformations.
 * No AI needed — instant, free.
 */
export function generateMisspellings(word: string, count: number = 3): string[] {
  const w = word.toLowerCase().trim();
  if (w.length < 4) return [];

  const candidates = new Set<string>();
  const consonants = new Set('bcdfghjklmnpqrstvwxz');

  // 1. Transposition
  for (let i = 0; i < w.length - 1; i++) {
    if (w[i] === w[i + 1]) continue;
    const swapped = w.slice(0, i) + w[i + 1] + w[i] + w.slice(i + 2);
    candidates.add(swapped);
  }

  // 2. Doubling a consonant
  for (let i = 0; i < w.length - 1; i++) {
    if (consonants.has(w[i])) {
      const doubled = w.slice(0, i + 1) + w[i] + w.slice(i + 1);
      candidates.add(doubled);
    }
  }

  // 3. Removing a non-edge letter
  for (let i = 1; i < w.length - 1; i++) {
    const removed = w.slice(0, i) + w.slice(i + 1);
    if (removed.length >= 3) candidates.add(removed);
  }

  // 4. Common substitutions
  const confusions: Record<string, string[]> = {
    a: ['e'], e: ['a', 'i'], i: ['e', 'y'],
    o: ['u'], u: ['o'], y: ['i'],
    c: ['k'], k: ['c'], s: ['z'], z: ['s'],
  };
  for (let i = 0; i < w.length; i++) {
    const subs = confusions[w[i]] ?? [];
    for (const sub of subs) {
      candidates.add(w.slice(0, i) + sub + w.slice(i + 1));
    }
  }

  candidates.delete(w);
  const arr = Array.from(candidates);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, count);
}
