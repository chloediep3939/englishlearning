import { NextResponse } from 'next/server';
import { requireUserId, UnauthorizedError } from '@/lib/current-user';
import { wordGlossaryDb } from '@/lib/reading/db';
import { cleanWord } from '@/lib/reading/tokenizer';
import { lemmaCandidates } from '@/lib/reading/lemma';
import { dictionaryLookup, getMsCredentials } from '@/lib/reading/ai/ms-translator';
import { fetchOxfordPronunciationMeta } from '@/lib/oxford/pronunciation';
import { lookupUrl } from '@/components/common/LookupPills';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/words/lookup  — Body: { word: string }
 *
 * Flow (per the read-along plan):
 *   1. Oxford Learner's Dictionaries for the exact word → US IPA + mp3 URL.
 *   2. On a miss, wink-lemmatizer base forms (verb/noun/adjective) → retry Oxford.
 *   3. Vietnamese meaning + POS from MS Dictionary Lookup on the resolved headword.
 * Pronunciation audio is NOT downloaded here — only the Oxford mp3 CDN URL is
 * stored (audio_src); the bytes are streamed lazily by /api/words/audio/<word>.
 *
 * `source` tags: 'oxford+ms' | 'oxford' | 'ms' (MS hit, Oxford not yet tried/legacy)
 * | 'ms+nox' (MS hit, Oxford confirmed miss) | 'miss'.
 */
function audioUrlFor(word: string, audioSrc: string | null): string | null {
  return audioSrc ? `/api/words/audio/${encodeURIComponent(word)}` : null;
}

export async function POST(req: Request) {
  try {
    await requireUserId();
    const body = (await req.json().catch(() => ({}))) as { word?: unknown };
    const word = cleanWord(typeof body.word === 'string' ? body.word : '');
    if (!word || word.length > 60) {
      return NextResponse.json({ error: 'Từ không hợp lệ.' }, { status: 400 });
    }

    // Cache hit — return as-is, EXCEPT legacy rows that never hit Oxford
    // (ipa null + source 'ms'): fall through once to self-heal, then re-tag so
    // they never re-scrape.
    const cached = await wordGlossaryDb.getOne(word);
    if (cached && !(cached.ipa === null && cached.source === 'ms')) {
      return NextResponse.json({
        word,
        vn: cached.vn,
        pos: cached.pos,
        ipa: cached.ipa,
        audioUrl: audioUrlFor(word, cached.audio_src),
        source: cached.source ?? 'cache',
      });
    }

    // 1–2. Oxford for IPA + mp3 URL: the word, then up to 3 lemma candidates.
    let ipa: string | null = null;
    let audioSrc: string | null = null;
    let headword = word;
    let oxHit = false;

    const ox = await fetchOxfordPronunciationMeta(lookupUrl('Oxford', word));
    if (ox.ipaUs || ox.mp3SourceUrl) {
      ipa = ox.ipaUs;
      audioSrc = ox.mp3SourceUrl;
      oxHit = true;
    } else {
      for (const cand of lemmaCandidates(word)) {
        const ox2 = await fetchOxfordPronunciationMeta(lookupUrl('Oxford', cand));
        if (ox2.ipaUs || ox2.mp3SourceUrl) {
          ipa = ox2.ipaUs;
          audioSrc = ox2.mp3SourceUrl;
          headword = cand;
          oxHit = true;
          break;
        }
      }
    }

    // 3. Vietnamese meaning from MS Dictionary on the resolved headword, then
    //    the remaining lemma candidates.
    const creds = await getMsCredentials();
    let dict: { vn: string; pos: string } | null = null;
    if (creds) {
      dict = await dictionaryLookup(headword, creds);
      if (!dict) {
        const tried = new Set([headword]);
        for (const cand of [word, ...lemmaCandidates(word)]) {
          if (tried.has(cand)) continue;
          tried.add(cand);
          dict = await dictionaryLookup(cand, creds);
          if (dict) break;
        }
      }
    }

    const vn = dict?.vn ?? null;
    const pos = dict?.pos ? dict.pos : null;

    // source tag (drives the legacy self-heal predicate above).
    let source: string;
    if (oxHit) source = dict ? 'oxford+ms' : 'oxford';
    else if (dict) source = 'ms+nox';
    else source = 'miss';

    await wordGlossaryDb.upsert(word, { vn, pos, ipa, audioSrc, source });

    return NextResponse.json({ word, vn, pos, ipa, audioUrl: audioUrlFor(word, audioSrc), source });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[words/lookup POST] error:', err);
    return NextResponse.json({ error: 'Internal error.' }, { status: 500 });
  }
}
