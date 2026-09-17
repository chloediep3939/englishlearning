// Minimal type shim for the YouGlish embeddable widget.
// Loaded from https://youglish.com/public/emb/widget.js — no npm package /
// types exist (see CLAUDE.md §3.1). The script defines a global `YG` object
// and calls `window.onYouglishAPIReady` once it is ready.
//
// Docs: https://youglish.com/api/doc/widget  and  /api/doc/js-api

interface YouglishWidgetOptions {
  width?: number;
  components?: number;
  events?: {
    onFetchDone?: (event: { totalResult: number }) => void;
    onVideoChange?: (event: unknown) => void;
    onCaptionConsumed?: (event: unknown) => void;
    onError?: (event: unknown) => void;
  };
}

interface YouglishWidgetInstance {
  /** Search the given query (word or phrase) in the given language. */
  fetch(query: string, language: string): void;
  /** Move to the next / previous matching clip. */
  next(): void;
  previous(): void;
  pause(): void;
}

interface YouglishGlobal {
  Widget: new (
    container: HTMLElement | string,
    options?: YouglishWidgetOptions,
  ) => YouglishWidgetInstance;
}

interface Window {
  YG?: YouglishGlobal;
  onYouglishAPIReady?: () => void;
}
