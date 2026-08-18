import { NextResponse } from 'next/server';
import { requireUserId, UnauthorizedError } from '@/lib/current-user';
import { wordGlossaryDb } from '@/lib/reading/db';
import { cleanWord } from '@/lib/reading/tokenizer';
import { lemmaCandidates } from '@/lib/reading/lemma';
import { dictionaryLookup, getMsCredentials } from '@/lib/reading/ai/ms-translator';
import { translateEnToVi } from '@/lib/flashcards/translate';
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

    // Cache hit — return as-is ONLY when it actually carries a meaning.
    // Rows with vn === null fall through and retry (they may be old quota /
    // missing-credential misses that were frozen forever); their cached
    // IPA/audio is reused below so Oxford isn't re-scraped. Legacy rows that
    // never hit Oxford (ipa null + source 'ms') also fall through once.
    const cached = await wordGlossaryDb.getOne(word);
    if (
      cached &&
      cached.vn !== null &&
      !(cached.ipa === null && cached.source === 'ms')
    ) {
      return NextResponse.json({
        word,
        vn: cached.vn,
        pos: cached.pos,
        ipa: cached.ipa,
        audioUrl: audioUrlFor(word, cached.audio_src),
        source: cached.source ?? 'cache',
      });
    }

    // 1–2. Oxford for IPA + mp3 URL: cached values first (a vn-null retry
    // shouldn't re-scrape), else the word, then the lemma candidates.
    let ipa: string | null = cached?.ipa ?? null;
    let audioSrc: string | null = cached?.audio_src ?? null;
    let headword = word;
    let oxHit = !!(ipa || audioSrc);

    if (!oxHit) {
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
    }

    // 3. Vietnamese meaning from MS Dictionary on the resolved headword, then
    //    the remaining lemma candidates. Track infra failures separately from
    //    genuine misses — an 'error' must stay retryable, never a frozen miss.
    const creds = await getMsCredentials();
    let dict: { vn: string; pos: string } | null = null;
    let hadError = !creds; // missing credentials = infra failure, not a miss
    if (creds) {
      const tried = new Set<string>();
      for (const cand of [headword, word, ...lemmaCandidates(word)]) {
        if (tried.has(cand)) continue;
        tried.add(cand);
        const r = await dictionaryLookup(cand, creds);
        if (r.status === 'hit') {
          dict = { vn: r.vn, pos: r.pos };
          break;
        }
        if (r.status === 'error') hadError = true;
      }
    }

    let vn = dict?.vn ?? null;
    const pos = dict?.pos ? dict.pos : null;

    // 4. MyMemory fallback when MS produced nothing (dead key, quota, or a
    // word outside its dictionary). MyMemory sometimes echoes the input
    // verbatim for unknown words — treat that as a miss.
    let mmHit = false;
    if (!vn) {
      const mm = await translateEnToVi(headword);
      const t = mm?.trim() ?? '';
      if (t && t.toLowerCase() !== headword.toLowerCase() && t.toLowerCase() !== word.toLowerCase()) {
        vn = t;
        mmHit = true;
      }
    }

    // source tag. 'err' variants mark "meaning unresolved for infra reasons"
    // — combined with the vn-null fall-through above they self-heal on a
    // later tap. 'miss' = translators answered and genuinely found nothing.
    let source: string;
    if (dict) source = oxHit ? 'oxford+ms' : 'ms+nox';
    else if (mmHit) source = oxHit ? 'oxford+mm' : 'mm+nox';
    else if (hadError) source = oxHit ? 'oxford+err' : 'err';
    else source = oxHit ? 'oxford' : 'miss';

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
