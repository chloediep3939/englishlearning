import { NextResponse } from 'next/server';
import { requireUserId, UnauthorizedError } from '@/lib/current-user';
import { wordGlossaryDb } from '@/lib/reading/db';
import { cleanWord } from '@/lib/reading/tokenizer';
import { lemmaCandidates } from '@/lib/reading/lemma';
import { lookupEnVi } from '@/lib/reading/envi-dict';
import type { GlossaryEntry } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_WORDS = 400;

/**
 * POST /api/words/glossary
 * Body: { words: string[] }
 *
 * Warm-up for the read-along page: returns cached glossary entries AND
 * resolves every uncached / meaning-less word against the bundled offline
 * EN-VI dictionary (word + lemma candidates — pure in-memory lookups, no
 * network) so tapping a word needs no follow-up API call. Newly resolved
 * meanings are cached back in bulk. `missing` = words the offline
 * dictionary doesn't know either (proper nouns, rare terms) — the client
 * still resolves those on tap via /api/words/lookup (MS/MyMemory/Oxford).
 */
export async function POST(req: Request) {
  try {
    await requireUserId();
    const body = (await req.json().catch(() => ({}))) as { words?: unknown };
    const raw = Array.isArray(body.words) ? body.words : [];

    const cleaned = Array.from(
      new Set(
        raw
          .filter((w): w is string => typeof w === 'string')
          .map(cleanWord)
          .filter((w) => w.length >= 2),
      ),
    ).slice(0, MAX_WORDS);

    if (cleaned.length === 0) {
      return NextResponse.json({ entries: {}, missing: [] });
    }

    const entries: Record<string, GlossaryEntry> = await wordGlossaryDb.getMany(cleaned);

    // Offline-dictionary sweep over everything that still has no meaning
    // (never cached, or cached as a null-vn miss from the dead-translator
    // era). Preserves any cached IPA/audio on the row.
    const upserts: Array<{
      word: string;
      vn: string | null;
      pos: string | null;
      ipa: string | null;
      source: string;
      audioSrc: string | null;
    }> = [];
    for (const w of cleaned) {
      const existing = entries[w];
      if (existing && existing.vn != null) continue;
      let hit: { vn: string; pos: string | null } | null = null;
      for (const cand of [w, ...lemmaCandidates(w)]) {
        hit = await lookupEnVi(cand);
        if (hit) break;
      }
      if (!hit) continue;
      entries[w] = {
        vn: hit.vn,
        pos: hit.pos,
        ipa: existing?.ipa ?? null,
        audioUrl: existing?.audioUrl ?? null,
      };
      upserts.push({
        word: w,
        vn: hit.vn,
        pos: hit.pos,
        ipa: existing?.ipa ?? null,
        source: existing?.ipa ? 'oxford+dict' : 'dict+nox',
        // audioUrl is the serving path, not the Oxford source URL — an
        // upsert must not clobber a stored audio_src, so re-read it below
        // only when the row already had audio.
        audioSrc: null,
      });
    }

    // Rows with existing audio: fetch their audio_src so the batched upsert
    // doesn't wipe it (upsert overwrites all columns).
    for (const u of upserts) {
      const entry = entries[u.word];
      if (entry?.audioUrl) {
        const row = await wordGlossaryDb.getOne(u.word);
        u.audioSrc = row?.audio_src ?? null;
      }
    }
    await wordGlossaryDb.upsertMany(upserts);

    const missing = cleaned.filter((w) => !(w in entries) || entries[w].vn == null);

    return NextResponse.json({ entries, missing });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[words/glossary POST] error:', err);
    return NextResponse.json({ error: 'Internal error.' }, { status: 500 });
  }
}
