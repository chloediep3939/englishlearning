/**
 * SHA-256 of a passage's content, used as the cache key for
 * cross-user grammar-analysis sharing (M5). Normalization (trim +
 * lowercase) ensures incidental whitespace and case differences don't
 * defeat the cache. `crypto.subtle` is available in the Cloudflare
 * Workers runtime and the browser, so this helper is safe to call from
 * either a route handler or a client component.
 */
export async function hashContent(content: string): Promise<string> {
  const normalized = content.trim().toLowerCase();
  const data = new TextEncoder().encode(normalized);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
