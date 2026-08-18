import { NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { requireUserId, UnauthorizedError } from '@/lib/current-user';
import { wordGlossaryDb } from '@/lib/reading/db';
import { cleanWord } from '@/lib/reading/tokenizer';
import { lemmaCandidates } from '@/lib/reading/lemma';
import { dictionaryLookup, getMsCredentials } from '@/lib/reading/ai/ms-translator';
import { lookupEnVi } from '@/lib/reading/envi-dict';
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

    // 1. Vietnamese meaning FIRST — this is what the learner is waiting on.
    //    Chain: bundled offline dictionary (instant, no quota —
    //    public/envi-dict.json) → MS Dictionary → MyMemory. Infra failures
    //    are tracked separately from genuine misses so an 'error' stays
    //    retryable, never a frozen miss.
    const candidates = [word, ...lemmaCandidates(word)];
    let dict: { vn: string; pos: string } | null = null;
    let hadError = false;
    let offlineHit = false;

    for (const cand of candidates) {
      const hit = await lookupEnVi(cand);
      if (hit) {
        dict = { vn: hit.vn, pos: hit.pos ?? '' };
        offlineHit = true;
        break;
      }
    }

    if (!dict) {
      const creds = await getMsCredentials();
      hadError = !creds; // missing credentials = infra failure, not a miss
      if (creds) {
        for (const cand of candidates) {
          const r = await dictionaryLookup(cand, creds);
          if (r.status === 'hit') {
            dict = { vn: r.vn, pos: r.pos };
            break;
          }
          if (r.status === 'error') hadError = true;
        }
      }
    }

    let vn = dict?.vn ?? null;
    const pos = dict?.pos ? dict.pos : null;

    // MyMemory last resort. It sometimes echoes the input verbatim for
    // unknown words — treat that as a miss.
    let mmHit = false;
    if (!vn) {
      const mm = await translateEnToVi(word);
      const t = mm?.trim() ?? '';
      if (t && t.toLowerCase() !== word.toLowerCase()) {
        vn = t;
        mmHit = true;
      }
    }

    // 2. IPA + mp3 URL: reuse cached values when present. A fresh Oxford
    //    scrape costs 1-3s+, so it runs AFTER the response (waitUntil) and
    //    upserts the row for the next tap — the popup gets its meaning
    //    immediately, the IPA/audio fill in on later visits.
    const ipa: string | null = cached?.ipa ?? null;
    const audioSrc: string | null = cached?.audio_src ?? null;
    const oxHit = !!(ipa || audioSrc);

    // source tag. 'err' variants mark "meaning unresolved for infra reasons"
    // — combined with the vn-null fall-through above they self-heal on a
    // later tap. 'miss' = translators answered and genuinely found nothing.
    const meaningTag = (withOx: boolean): string => {
      if (offlineHit) return withOx ? 'oxford+dict' : 'dict+nox';
      if (dict) return withOx ? 'oxford+ms' : 'ms+nox';
      if (mmHit) return withOx ? 'oxford+mm' : 'mm+nox';
      if (hadError) return withOx ? 'oxford+err' : 'err';
      return withOx ? 'oxford' : 'miss';
    };

    await wordGlossaryDb.upsert(word, { vn, pos, ipa, audioSrc, source: meaningTag(oxHit) });

    if (!oxHit) {
      const oxfordTask = (async () => {
        try {
          for (const cand of candidates) {
            const ox = await fetchOxfordPronunciationMeta(lookupUrl('Oxford', cand));
            if (ox.ipaUs || ox.mp3SourceUrl) {
              await wordGlossaryDb.upsert(word, {
                vn,
                pos,
                ipa: ox.ipaUs,
                audioSrc: ox.mp3SourceUrl,
                source: meaningTag(true),
              });
              return;
            }
          }
        } catch (err) {
          console.error('[words/lookup bg oxford] error:', err);
        }
      })();
      try {
        const cf = await getCloudflareContext({ async: true });
        cf.ctx.waitUntil(oxfordTask);
      } catch {
        oxfordTask.catch(() => {});
      }
    }

    return NextResponse.json({
      word,
      vn,
      pos,
      ipa,
      audioUrl: audioUrlFor(word, audioSrc),
      source: meaningTag(oxHit),
    });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[words/lookup POST] error:', err);
    return NextResponse.json({ error: 'Internal error.' }, { status: 500 });
  }
}
