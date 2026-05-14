/**
 * Highlight `target` (case-insensitive, word-boundary-loose) inside `text`.
 * Returns an HTML string safe to inject via dangerouslySetInnerHTML — the
 * non-matched parts are HTML-escaped first so a card's example/collocation
 * can't smuggle in script tags.
 *
 * The `\\w*` suffix on the regex catches inflected forms ("running" when
 * target is "run", "studies" when target is "study").
 */
export function highlightTarget(text: string, target: string): string {
  const safeTarget = target.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (!safeTarget) return escapeHtml(text);
  const re = new RegExp(`(${safeTarget}\\w*)`, 'gi');
  return escapeHtml(text).replace(
    re,
    '<span style="background: var(--v-primary-soft); color: var(--v-primary); padding: 0 6px; border-radius: 5px;">$1</span>'
  );
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
