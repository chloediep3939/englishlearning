// wink-lemmatizer ships no TypeScript types. Rule + dictionary based English
// lemmatizer (pure JS, no native deps — Workers-safe). Each function returns
// the lemma for that part of speech, or the input unchanged if unrecognized.
declare module 'wink-lemmatizer' {
  export function noun(word: string): string;
  export function verb(word: string): string;
  export function adjective(word: string): string;
}
