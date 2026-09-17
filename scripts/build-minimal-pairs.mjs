#!/usr/bin/env node
// Build the phonetics dataset for the roadmap "T8" tool (minimal pairs +
// word stress). Covers checklist items nghe-01, nghe-02, nghe-05, noi-04.
//
// Usage:
//   node scripts/build-minimal-pairs.mjs
//     → writes content/phonetics/minimal-pairs.json
//              content/phonetics/word-stress.json
//
//   node scripts/build-minimal-pairs.mjs --mine ɪ_iː
//     → does NOT write anything; prints extra candidate pairs mined from the
//       whole dictionary for that contrast, shortest first. This is the tool
//       used to grow the curated seed lists below. Almost all raw candidates
//       are surnames / place names (cmudict is ~40% proper nouns and carries
//       no capitalisation), which is why the seeds are curated by hand rather
//       than mined automatically.
//
// -------------------------------------------------------------------------
// WHY CURATED SEEDS + MACHINE VALIDATION
// -------------------------------------------------------------------------
// Mining `public/cmu-ipa.json` for "words whose phoneme strings differ at
// exactly one index" yields thousands of hits per contrast, but the hits are
// dominated by proper nouns (bibeau/bibbo, aalen/ehlen, kuehner/cooner...).
// A B1→B2 learner tested on those is being tested on vocabulary, not on
// hearing. So the pairs below are hand-written from standard ESL minimal-pair
// material, and the SCRIPT's job is to verify each one against the shipped
// dictionary: both words must exist, their phoneme sequences must be the same
// length, and they must differ at exactly one index, by exactly the two
// phonemes of the contrast. Anything that fails is dropped and reported on
// stderr — no pair reaches the output file unverified.
//
// -------------------------------------------------------------------------
// PHONEME SEGMENTATION HEURISTIC (and where it is wrong)
// -------------------------------------------------------------------------
// `public/cmu-ipa.json` stores one IPA string per word, e.g. "ship" →
// "/ˈʃɪp/". It was produced by scripts/build-cmu-ipa.mjs from the CMU
// Pronouncing Dictionary, so its symbol inventory is closed and known:
//
//   vowels      ɑ æ ʌ ɔ aʊ aɪ ɛ ɜr ər eɪ ɪ iː oʊ ɔɪ ʊ uː ə
//   consonants  b tʃ d ð f ɡ h dʒ k l m n ŋ p r s ʃ t θ v w j z ʒ
//   stress      ˈ (primary) ˌ (secondary), placed BEFORE the syllable
//
// Tokenising is therefore a longest-match scan over that fixed inventory
// rather than real phonology. Known weak spots:
//
//  1. "ər" is ambiguous. It is one phoneme when it came from ARPABET ER0
//     ("around" → /ərˈaʊnd/, "camera" → /ˈkæmərə/), but it is two phonemes
//     (schwa + consonant /r/) when a reduced syllable is followed by an
//     r-onset syllable that carries no stress mark. Longest-match always
//     reads it as one vowel. This does NOT change syllable counts (either
//     reading contributes exactly one vowel nucleus) but it does change
//     phoneme indices, so it can hide or invent an /r/ for the /r/–/l/
//     contrast. The curated seeds sidestep this: every /r/–/l/ pair uses an
//     /r/ in a clear onset or cluster position.
//  2. The dictionary itself is inconsistent for the LOT/THOUGHT (/ɒ/–/ɔː/)
//     contrast — the underlying cmudict entries mix AA and AO for the same
//     lexical set. "caught" and "cot" are both /ˈkɑt/ there, i.e. already
//     merged, while "naught" vs "not" is still /ɔ/ vs /ɑ/. The validator
//     silently drops the merged ones, which is why that group is the
//     smallest. See the run report.
//  3. Syllabification in the source file uses a plain max-onset rule and is
//     visibly wrong for some words ("computer" → /kəˈmpjuːtər/, the /m/
//     belongs to the first syllable). We therefore never use the source's
//     syllable BOUNDARIES. Syllable count = number of vowel nuclei, and
//     stress index = index of the vowel nucleus that the ˈ mark precedes.
//     Both are unaffected by a misplaced consonant.
//  4. Only the canonical cmudict pronunciation is present (alternates were
//     dropped upstream), so words with a genuine stress choice
//     ("controversy", "research" as noun vs verb) get a single arbitrary
//     answer. Words like that are kept out of the stress seed list by hand.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DICT_PATH = join(ROOT, 'public', 'cmu-ipa.json');
const OUT_DIR = join(ROOT, 'content', 'phonetics');

const MAX_PAIRS_PER_CONTRAST = 60;
const MAX_STRESS_ENTRIES = 400;

// ---------------------------------------------------------------------------
// Tokeniser
// ---------------------------------------------------------------------------

// Longest-match first. Every multi-character symbol the upstream converter can
// emit; single characters fall through to the else branch.
const MULTI = ['aʊ', 'aɪ', 'eɪ', 'oʊ', 'ɔɪ', 'iː', 'uː', 'ɜr', 'ər', 'tʃ', 'dʒ'];

const VOWELS = new Set([
  'ɑ', 'æ', 'ʌ', 'ɔ', 'aʊ', 'aɪ', 'ɛ', 'ɜr', 'ər', 'eɪ',
  'ɪ', 'iː', 'oʊ', 'ɔɪ', 'ʊ', 'uː', 'ə',
]);

const CONSONANTS = new Set([
  'b', 'tʃ', 'd', 'ð', 'f', 'ɡ', 'h', 'dʒ', 'k', 'l', 'm', 'n', 'ŋ',
  'p', 'r', 's', 'ʃ', 't', 'θ', 'v', 'w', 'j', 'z', 'ʒ',
]);

/**
 * Split an IPA string from cmu-ipa.json into phoneme tokens plus the stress
 * value of each vowel nucleus (0 none, 1 primary, 2 secondary).
 * Returns null if an unknown character is encountered — better to drop the
 * word than to guess.
 */
function tokenize(ipa) {
  const s = ipa.replace(/^\//, '').replace(/\/$/, '');
  const tokens = [];
  const stress = []; // one entry per vowel nucleus
  let pending = 0;

  for (let i = 0; i < s.length; ) {
    const c = s[i];
    if (c === 'ˈ') { pending = 1; i += 1; continue; }
    if (c === 'ˌ') { pending = 2; i += 1; continue; }

    let tok = MULTI.find((m) => s.startsWith(m, i)) ?? c;
    if (!VOWELS.has(tok) && !CONSONANTS.has(tok)) return null;

    if (VOWELS.has(tok)) {
      // The stress mark sits at the start of the syllable, so the next vowel
      // we meet is its nucleus.
      stress.push(pending);
      pending = 0;
    }
    tokens.push(tok);
    i += tok.length;
  }

  if (tokens.length === 0 || stress.length === 0) return null;
  return { tokens, stress };
}

// ---------------------------------------------------------------------------
// Contrast groups
// ---------------------------------------------------------------------------
//
// `id` / `label` use the symbols the learner's checklist uses (British-ish RP
// notation). `symbols` are the symbols that actually occur in cmu-ipa.json,
// which is General American:
//   /e/  in the checklist  = ɛ  in the data
//   /ɒ/  in the checklist  = ɑ  in the data (GenAm LOT)
//   /ɔː/ in the checklist  = ɔ  in the data (GenAm THOUGHT)
// Everything else is spelled the same in both.

const CONTRASTS = [
  {
    id: 'ɪ_iː', label: '/ɪ/ – /iː/', kind: 'vowel', symbols: ['ɪ', 'iː'],
    example: 'ship – sheep',
    seed: [
      ['ship', 'sheep'], ['bit', 'beat'], ['sit', 'seat'], ['fit', 'feet'],
      ['fill', 'feel'], ['hill', 'heel'], ['still', 'steel'], ['list', 'least'],
      ['itch', 'each'], ['chip', 'cheap'], ['dip', 'deep'], ['slip', 'sleep'],
      ['lip', 'leap'], ['grin', 'green'], ['bin', 'bean'], ['tin', 'teen'],
      ['hit', 'heat'], ['knit', 'neat'], ['pitch', 'peach'], ['rich', 'reach'],
      ['bid', 'bead'], ['hid', 'heed'], ['is', 'ease'], ['it', 'eat'],
      ['ill', 'eel'], ['fist', 'feast'], ['pick', 'peak'], ['lick', 'leak'],
      ['sick', 'seek'], ['pill', 'peel'], ['mill', 'meal'], ['chick', 'cheek'],
      ['din', 'dean'], ['will', 'wheel'], ['bitten', 'beaten'], ['dim', 'deem'],
      ['sin', 'scene'], ['slit', 'sleet'], ['whip', 'weep'],
      // Kept so the run report shows it: the dictionary gives "live" the
      // adjective reading /ˈlaɪv/, so this classic pair cannot be verified.
      ['live', 'leave'],
    ],
  },
  {
    id: 'æ_e', label: '/æ/ – /e/', kind: 'vowel', symbols: ['æ', 'ɛ'],
    example: 'bad – bed',
    seed: [
      ['bad', 'bed'], ['bat', 'bet'], ['sad', 'said'], ['man', 'men'],
      ['pan', 'pen'], ['had', 'head'], ['mat', 'met'], ['sat', 'set'],
      ['land', 'lend'], ['band', 'bend'], ['sand', 'send'], ['gas', 'guess'],
      ['dad', 'dead'], ['tan', 'ten'], ['pat', 'pet'], ['bag', 'beg'],
      ['flash', 'flesh'], ['jam', 'gem'], ['lag', 'leg'], ['mass', 'mess'],
      ['past', 'pest'], ['rack', 'wreck'], ['track', 'trek'], ['pack', 'peck'],
      ['bland', 'blend'], ['batter', 'better'], ['latter', 'letter'],
      ['cattle', 'kettle'], ['vat', 'vet'], ['than', 'then'], ['sax', 'sex'],
      ['shall', 'shell'], ['paddle', 'peddle'], ['salary', 'celery'],
      ['ham', 'hem'],
      // Kept for the report: this dictionary has the marry–merry merger.
      ['marry', 'merry'],
    ],
  },
  {
    id: 'æ_ʌ', label: '/æ/ – /ʌ/', kind: 'vowel', symbols: ['æ', 'ʌ'],
    example: 'cat – cut',
    seed: [
      ['cat', 'cut'], ['bat', 'but'], ['hat', 'hut'], ['cap', 'cup'],
      ['bag', 'bug'], ['ran', 'run'], ['ankle', 'uncle'], ['match', 'much'],
      ['mad', 'mud'], ['bad', 'bud'], ['ban', 'bun'], ['fan', 'fun'],
      ['sank', 'sunk'], ['rang', 'rung'], ['sang', 'sung'], ['drank', 'drunk'],
      ['stack', 'stuck'], ['track', 'truck'], ['lack', 'luck'], ['back', 'buck'],
      ['hang', 'hung'], ['ham', 'hum'], ['pat', 'putt'], ['rat', 'rut'],
      ['cab', 'cub'], ['crash', 'crush'], ['brash', 'brush'],
      ['flash', 'flush'], ['slash', 'slush'], ['pan', 'pun'], ['lamp', 'lump'],
      ['damp', 'dump'], ['stamp', 'stump'], ['tan', 'ton'], ['swam', 'swum'],
      ['sack', 'suck'], ['dabble', 'double'], ['badge', 'budge'],
      ['batter', 'butter'], ['mash', 'mush'],
    ],
  },
  {
    id: 'e_ʌ', label: '/e/ – /ʌ/', kind: 'vowel', symbols: ['ɛ', 'ʌ'],
    example: 'bed – bud',
    seed: [
      ['bed', 'bud'], ['beg', 'bug'], ['ten', 'ton'], ['net', 'nut'],
      ['bet', 'but'], ['get', 'gut'], ['met', 'mutt'], ['pet', 'putt'],
      ['hem', 'hum'], ['best', 'bust'], ['rest', 'rust'], ['dead', 'dud'],
      ['check', 'chuck'], ['deck', 'duck'], ['peck', 'puck'], ['trek', 'truck'],
      ['hell', 'hull'], ['bench', 'bunch'], ['fend', 'fund'], ['den', 'done'],
      ['pen', 'pun'], ['wren', 'run'], ['jet', 'jut'], ['bled', 'blood'],
      ['fled', 'flood'], ['sped', 'spud'],
    ],
  },
  {
    id: 'ɒ_ɔː', label: '/ɒ/ – /ɔː/', kind: 'vowel', symbols: ['ɑ', 'ɔ'],
    example: 'cot – caught',
    // WEAKEST GROUP. The source cmudict mixes AA and AO for the LOT/THOUGHT
    // lexical set, so several textbook pairs come back as homophones. The
    // merged ones are left in the seed list on purpose so every run reports
    // them. General American speakers merge this contrast anyway.
    note: 'Smallest group. The source dictionary is inconsistent for GenAm LOT vs THOUGHT, so classic pairs such as cot/caught and chock/chalk come back as homophones and are dropped. Treat this group as lower-confidence than the others.',
    seed: [
      ['don', 'dawn'], ['hock', 'hawk'], ['stock', 'stalk'], ['tot', 'taught'],
      ['not', 'naught'], ['knotty', 'naughty'], ['odd', 'awed'],
      ['nod', 'gnawed'], ['pod', 'pawed'], ['collar', 'caller'],
      ['wok', 'walk'], ['pond', 'pawned'],
      // Kept for the report — all four collapse in this dictionary.
      ['cot', 'caught'], ['chock', 'chalk'], ['sot', 'sought'],
      ['lager', 'logger'],
    ],
  },
  {
    id: 'ʊ_uː', label: '/ʊ/ – /uː/', kind: 'vowel', symbols: ['ʊ', 'uː'],
    example: 'full – fool',
    // English simply has few /ʊ/ words, and /ʊ/ is rare outside a handful of
    // -ook / -ould / -ull shapes. Mining the whole dictionary adds nothing
    // usable (the candidates are surnames: kuehl, buller, bushey...).
    note: 'English has few /ʊ/ words, so this group cannot reach 20 real pairs. Mining the full dictionary yields only surnames. Reuse pairs across rounds rather than padding.',
    seed: [
      ['full', 'fool'], ['pull', 'pool'], ['look', 'luke'], ['cook', 'kook'],
      ['nook', 'nuke'], ['could', 'cooed'], ['would', 'wooed'],
      ['should', 'shooed'], ['stood', 'stewed'], ['hood', "who'd"],
      ['soot', 'suit'], ['wood', 'wooed'], ['pulling', 'pooling'],
    ],
  },
  {
    id: 'θ_s', label: '/θ/ – /s/', kind: 'consonant', symbols: ['θ', 's'],
    example: 'think – sink',
    seed: [
      ['think', 'sink'], ['thick', 'sick'], ['thin', 'sin'], ['thing', 'sing'],
      ['thumb', 'sum'], ['theme', 'seem'], ['thought', 'sought'],
      ['path', 'pass'], ['bath', 'bass'], ['math', 'mass'],
      ['mouth', 'mouse'], ['tenth', 'tense'], ['worth', 'worse'],
      ['faith', 'face'], ['truth', 'truce'], ['myth', 'miss'],
      ['moth', 'moss'], ['fourth', 'force'], ['youth', 'use'],
      ['growth', 'gross'], ['thank', 'sank'], ['thigh', 'sigh'],
      ['thaw', 'saw'], ['thong', 'song'], ['thinking', 'sinking'],
      ['thumbs', 'sums'], ['thinks', 'sinks'],
    ],
  },
  {
    id: 'ð_d', label: '/ð/ – /d/', kind: 'consonant', symbols: ['ð', 'd'],
    example: 'they – day',
    // /ð/ occurs in a closed class of function words plus a small set of
    // verbs. Most remaining candidates are surnames (rothe, lowther, bither).
    note: 'Under 20. /ð/ is confined to a closed set of function words plus a few verbs, and several of the remaining textbook pairs (writhe/ride, scythe/side) are mis-transcribed in the source dictionary and are dropped.',
    seed: [
      ['they', 'day'], ['then', 'den'], ['there', 'dare'], ['those', 'doze'],
      ['though', 'dough'], ['thy', 'die'], ['breathe', 'breed'],
      ['bathe', 'bade'], ['lather', 'ladder'], ['father', 'fodder'],
      ['loathe', 'load'], ['lathe', 'laid'], ['seethe', 'seed'],
      ['soothe', 'sued'], ['worthy', 'wordy'], ['tithe', 'tide'],
      ['heather', 'header'],
      // Kept for the report: cmudict transcribes both of these with /ɪ/ and
      // (for scythe) /θ/, which is wrong. The validator catches it.
      ['writhe', 'ride'], ['scythe', 'side'],
    ],
  },
  {
    id: 'v_w', label: '/v/ – /w/', kind: 'consonant', symbols: ['v', 'w'],
    example: 'vest – west',
    note: 'Just under 20. Word-initial /v/–/w/ pairs are a short, well-known list; the rest of the dictionary offers only surnames (vaal/wahl, vang/wang).',
    seed: [
      ['vest', 'west'], ['vet', 'wet'], ['vine', 'wine'], ['vine', 'whine'],
      ['veil', 'whale'], ['vary', 'wary'], ['verse', 'worse'], ['vow', 'wow'],
      ['veal', 'wheel'], ['vent', 'went'], ['viper', 'wiper'],
      ['vile', 'while'], ['vain', 'wane'], ['very', 'wary'],
      ['visor', 'wiser'], ['vowed', 'wowed'], ['vicar', 'wicker'],
    ],
  },
  {
    id: 'ʃ_s', label: '/ʃ/ – /s/', kind: 'consonant', symbols: ['ʃ', 's'],
    example: 'she – see',
    seed: [
      ['she', 'see'], ['ship', 'sip'], ['shy', 'sigh'], ['sheet', 'seat'],
      ['sheep', 'seep'], ['shell', 'sell'], ['shore', 'sore'],
      ['shine', 'sign'], ['shoe', 'sue'], ['show', 'sew'], ['shock', 'sock'],
      ['shave', 'save'], ['shame', 'same'], ['shed', 'said'],
      ['shack', 'sack'], ['shift', 'sift'], ['shun', 'sun'], ['mesh', 'mess'],
      ['lash', 'lass'], ['gash', 'gas'], ['mash', 'mass'], ['bash', 'bass'],
      ['leash', 'lease'], ['plush', 'plus'], ['shoot', 'suit'],
      ['short', 'sort'], ['shin', 'sin'], ['shingle', 'single'],
      ['shake', 'sake'], ['shale', 'sale'], ['shorts', 'sorts'],
    ],
  },
  {
    id: 'tʃ_dʒ', label: '/tʃ/ – /dʒ/', kind: 'consonant', symbols: ['tʃ', 'dʒ'],
    example: 'cheap – jeep',
    note: 'Just under 20. Most remaining candidates are given names (Jane, Jerry, Jill, Madge) or transliterated surnames, which would test spelling knowledge rather than hearing.',
    seed: [
      ['chin', 'gin'], ['cheap', 'jeep'], ['choke', 'joke'], ['chest', 'jest'],
      ['chunk', 'junk'], ['cheer', 'jeer'], ['char', 'jar'], ['chug', 'jug'],
      ['batch', 'badge'], ['rich', 'ridge'], ['lunch', 'lunge'],
      ['search', 'surge'], ['perch', 'purge'], ['larch', 'large'],
      ['etch', 'edge'], ['riches', 'ridges'], ['cinch', 'singe'],
      ['chump', 'jump'], ['chock', 'jock'],
    ],
  },
  {
    id: 'r_l', label: '/r/ – /l/', kind: 'consonant', symbols: ['r', 'l'],
    example: 'right – light',
    seed: [
      ['right', 'light'], ['road', 'load'], ['rock', 'lock'], ['red', 'led'],
      ['rice', 'lice'], ['rip', 'lip'], ['race', 'lace'], ['rate', 'late'],
      ['rain', 'lane'], ['row', 'low'], ['rush', 'lush'], ['ram', 'lamb'],
      ['rack', 'lack'], ['rap', 'lap'], ['rag', 'lag'], ['rid', 'lid'],
      ['rift', 'lift'], ['room', 'loom'], ['root', 'loot'], ['rust', 'lust'],
      ['wrong', 'long'], ['reef', 'leaf'], ['reap', 'leap'], ['ride', 'lied'],
      ['rye', 'lie'], ['rest', 'lest'], ['rung', 'lung'], ['rob', 'lob'],
      ['rot', 'lot'], ['raid', 'laid'], ['rake', 'lake'], ['ramp', 'lamp'],
      ['rash', 'lash'], ['pray', 'play'], ['crowd', 'cloud'],
      ['crash', 'clash'], ['grass', 'glass'], ['brush', 'blush'],
      ['crown', 'clown'], ['fry', 'fly'], ['free', 'flee'], ['frame', 'flame'],
      ['grow', 'glow'], ['bread', 'bled'], ['crime', 'climb'],
      ['fresh', 'flesh'], ['fright', 'flight'], ['broom', 'bloom'],
      ['brand', 'bland'], ['brew', 'blue'], ['cram', 'clam'],
      ['berry', 'belly'], ['grammar', 'glamour'], ['pirate', 'pilot'],
      // Kept for the report: these two are real minimal pairs, but the
      // tokeniser reads the /ər/ of "arrive" / "correct" as one ER vowel and
      // so sees a length mismatch. See weak spot 1 at the top of this file.
      ['arrive', 'alive'], ['correct', 'collect'],
    ],
  },
];

// ---------------------------------------------------------------------------
// Word-stress seed list
// ---------------------------------------------------------------------------
// Common B1/B2 vocabulary only. The script keeps whatever has >= 3 syllables
// and exactly one primary stress mark, so 2-syllable entries that slipped in
// are dropped automatically and reported.

const STRESS_SEED = `
ability absolute academy accident accompany according accountant accurate
achievement acknowledge activity actually addition adequate adjective
adventure advertise afternoon afterwards agency agenda agreement agriculture
alcohol allergy alligator allowance alphabet alternative ambulance amendment
analysis ancestor animal anniversary announcement anybody anyone anything
anywhere apartment apologize apparent appearance appetite applicant
application appointment appreciate approval architect argument arrangement
arrival article artificial assignment assistant associate assumption
atmosphere attention attitude attractive audience authority automatic
available average aviation awareness bachelor background bacteria balcony
banana bankruptcy barbecue basically battery beautiful beginner beginning
behavior benefit bicycle biology boundary buffalo bulletin businessman
butterfly cabinet calculate calendar camera candidate capacity capital
carefully carpenter category celebrate cemetery century ceremony certainly
challenging champion character charity chemical chemistry chocolate
cinema circumstance citizen civilian classify climate colony comedy
comfortable commander commercial committee communicate community companion
company comparison competent complicated compliment component composer
computer concentrate condition conference confidence confusion connection
consequence conservative consistent construction consultant consumer
container continent continue contribute convenient conversation cooperate
corporate cosmetic countryside courageous creativity criminal criteria
critical criticize cucumber cultural curious currency curriculum customer
cylinder dangerous database decimal decision decorate dedicate defendant
deficit definite delegate delicate delicious deliver democracy demonstrate
department dependent deposit description designer desperate destination
determine develop development diagram dialogue diameter dictionary difference
different difficult digital dinosaur diploma direction directly director
disagree disappear disaster discipline discover discussion dismissal
distribute diversity division document domestic dominant donation dramatic
ecology economic economy edition educate education effective efficient
election electric electricity elegant elephant elevator eliminate embassy
emergency emotion emphasis employee employer employment encourage energy
engagement engineer enormous entertain enthusiasm envelope environment
episode equipment equivalent essential establish estimate evaluate
eventually evidence evolution examine example excellent exception excited
exciting executive exercise exhibit existence expansion expensive experience
experiment expertise explanation explosion expression extensive extremely
facility factory familiar family fantastic fascinate favorite festival finally
financial flexible following foreigner forever forgotten formula fortunate
foundation frequency frequently frustration functional fundamental furniture
furthermore gallery gasoline generally generate generation generous genuine
geography gigantic glorious goalkeeper government governor graduate
grandfather grandmother gratitude gravity grocery guarantee habitat hamburger
happily happiness harmony headquarters helicopter heritage hesitate hilarious
historic history holiday honesty horizon horrible hospital however humidity
hurricane hydrogen identical identify identity illegal illustrate imagine
imitate immediate immigrant impatient implement importance important
impossible impressive improvement incident including increasing incredible
independent indicate individual industry inevitable infection inflation
influence informal information ingredient initial initiative injury innocent
inspector instructor instrument insurance intelligent intention interested
interesting interfere interior internal international interpret interview
introduce invasion investigate investment invitation involvement isolate
itinerary jealousy journalist justify kangaroo kilogram kindergarten
laboratory lavender leadership legislate liberal liberty library lieutenant
limitation listener literature located location logical luxury machinery
magazine magnificent maintenance majority management manager manufacture
marathon material mathematics maximum mayonnaise measurement mechanic medical
medicine medium melody memory messenger metaphor microphone microscope
military million mineral minimum minister minority miracle miserable
missionary mistaken misunderstand moderate modify molecule monitor monopoly
monument motivate motorcycle multiply municipal museum musical mysterious
mystery narrative national natural necessary negative negotiate neighborhood
newspaper nightmare nobody nominate normally noticeable novelist nowadays
nuclear numerous nutrition obedient objective obligation obstacle obvious
occasion occupy occurrence october offering official operate operation
opinion opponent opportunity opposite optimistic orchestra ordinary organize
organism original ornament orphanage otherwise outstanding overcome overnight
overseas oxygen paragraph parallel parliament participate particular
passenger passionate pedestrian penalty percentage performance period
permanent permission personal personnel petroleum pharmacy phenomenon
philosophy photograph photographer physical physician pianist pioneer
planetary poetry policy political politician politics pollution popular
population portable positive possible potato potential poverty powerful
practical precision preference pregnancy prejudice preparation president
prevention previous primary principal principle priority prisoner privacy
probably procedure production professor profitable progressive prohibit
promotion property proposal prosperous protection protective provider
psychology publisher punishment pyramid qualify quality quantity quarterly
quietly radio radical rapidly reaction readily reality reasonable reception
recipe recognize recommend recover recycle reduction referee reference
reflection refugee regional register regular regulate relation relative
relevant reliable religion religious reluctant remainder remember reminder
removal renewal repeated replacement reporter representative reputation
requirement reservation resident resistance resolution respectful responsible
restaurant restriction retirement revenue revision revolution ridiculous
romantic sacrifice salary satellite satisfy saxophone scenario scholarship
scientist seasonal secondary secretary security selection semester senator
sensible sensitive sentiment separate serious settlement seventeen seventy
several signature significant similar simplify sincerely situation skeleton
society software solution somebody souvenir specialist specific spectacular
spiritual stationery statistics strategy strawberry structural studio
submarine submission subsequent substitute suburban successful sufficient
suggestion suitable summary superior supervise supplier supporter surgery
surprising surrender surrounding survivor suspicious sympathy symphony
syllable talented technical technology telephone telescope television
temperature temporary tendency terrible terrific territory terrorist
testimony theory therapy thermometer threatening tobacco together tolerate
tomato tomorrow tradition traditional tragedy transaction transportation
tremendous triangle tropical typical ultimate umbrella unable unaware
uncertain uncomfortable unconscious underline understand underwater
unemployed unexpected unfortunate unhappy uniform universal universe
university unlikely unusual usual usually utility vacation valuable variety
various vegetable vehicle vertical veteran victory violence violent violin
visible visitor vitamin vocabulary volcano volunteer warranty whatever
whenever wherever wilderness wonderful yesterday
`.trim().split(/\s+/);

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/**
 * Verify one candidate pair against the dictionary.
 * Returns { ok: true, entry } or { ok: false, reason }.
 */
function validatePair(dict, contrast, wordA, wordB) {
  const [symA, symB] = contrast.symbols;
  const ipaA = dict[wordA];
  const ipaB = dict[wordB];
  if (!ipaA) return { ok: false, reason: `"${wordA}" not in dictionary` };
  if (!ipaB) return { ok: false, reason: `"${wordB}" not in dictionary` };
  if (wordA === wordB) return { ok: false, reason: 'same word' };

  const tA = tokenize(ipaA);
  const tB = tokenize(ipaB);
  if (!tA) return { ok: false, reason: `unparseable IPA for "${wordA}": ${ipaA}` };
  if (!tB) return { ok: false, reason: `unparseable IPA for "${wordB}": ${ipaB}` };

  if (tA.tokens.length !== tB.tokens.length) {
    return { ok: false, reason: `length differs (${ipaA} vs ${ipaB})` };
  }

  const diffs = [];
  for (let i = 0; i < tA.tokens.length; i++) {
    if (tA.tokens[i] !== tB.tokens[i]) diffs.push(i);
  }
  if (diffs.length === 0) {
    return { ok: false, reason: `homophones in this dictionary (both ${ipaA})` };
  }
  if (diffs.length > 1) {
    return { ok: false, reason: `differs at ${diffs.length} phonemes (${ipaA} vs ${ipaB})` };
  }

  const i = diffs[0];
  const got = [tA.tokens[i], tB.tokens[i]];
  const want = [symA, symB];
  const matchesForward = got[0] === want[0] && got[1] === want[1];
  const matchesReverse = got[0] === want[1] && got[1] === want[0];
  if (!matchesForward && !matchesReverse) {
    return {
      ok: false,
      reason: `differs by /${got[0]}/–/${got[1]}/, not /${symA}/–/${symB}/ (${ipaA} vs ${ipaB})`,
    };
  }

  // Normalise so `a` always carries the first symbol of the contrast.
  const a = matchesForward ? wordA : wordB;
  const b = matchesForward ? wordB : wordA;
  return {
    ok: true,
    entry: { a, b, ipa_a: dict[a], ipa_b: dict[b] },
  };
}

/**
 * Derive a stress entry. Syllable count = vowel nuclei. Stress index = the
 * 0-based index of the nucleus the primary mark precedes.
 */
function stressEntry(dict, word) {
  const ipa = dict[word];
  if (!ipa) return { ok: false, reason: 'not in dictionary' };
  const t = tokenize(ipa);
  if (!t) return { ok: false, reason: `unparseable IPA: ${ipa}` };

  const syllables = t.stress.length;
  if (syllables < 3) return { ok: false, reason: `only ${syllables} syllable(s): ${ipa}` };

  const primary = t.stress.map((s, i) => (s === 1 ? i : -1)).filter((i) => i >= 0);
  if (primary.length !== 1) {
    return { ok: false, reason: `${primary.length} primary stress marks: ${ipa}` };
  }

  return {
    ok: true,
    entry: { word, ipa, syllables, stress_index: primary[0] },
  };
}

// ---------------------------------------------------------------------------
// --mine: raw candidate generator (curation aid, writes nothing)
// ---------------------------------------------------------------------------

function mine(dict, contrastId) {
  const contrast = CONTRASTS.find((c) => c.id === contrastId);
  if (!contrast) {
    console.error(`unknown contrast "${contrastId}". Known: ${CONTRASTS.map((c) => c.id).join(', ')}`);
    process.exit(1);
  }
  const [symA, symB] = contrast.symbols;

  const bySeq = new Map();
  const parsed = new Map();
  for (const [word, ipa] of Object.entries(dict)) {
    if (!/^[a-z]+$/.test(word)) continue;
    const t = tokenize(ipa);
    if (!t) continue;
    parsed.set(word, t);
    const key = t.tokens.join(' ');
    if (!bySeq.has(key)) bySeq.set(key, []);
    bySeq.get(key).push(word);
  }

  const seen = new Set(contrast.seed.flat());
  const out = [];
  for (const [word, t] of parsed) {
    const idx = t.tokens.map((x, i) => (x === symA ? i : -1)).filter((i) => i >= 0);
    if (idx.length !== 1) continue; // ambiguous swap position — skip
    const alt = t.tokens.slice();
    alt[idx[0]] = symB;
    for (const other of bySeq.get(alt.join(' ')) ?? []) {
      if (other === word || seen.has(word) || seen.has(other)) continue;
      if (parsed.get(other).tokens.filter((x) => x === symB).length !== 1) continue;
      out.push([word, other, t.tokens.length]);
    }
  }

  out.sort((p, q) => p[2] - q[2] || p[0].localeCompare(q[0]));
  console.log(`# ${contrast.id} (${contrast.label}) — ${out.length} un-seeded candidates, shortest first`);
  console.log('# NOTE: cmudict carries no capitalisation; most of these are proper nouns.');
  for (const [a, b, n] of out.slice(0, 300)) console.log(`${n}\t${a}\t${b}`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const raw = await readFile(DICT_PATH, 'utf-8');
const dict = JSON.parse(raw);

const mineIdx = process.argv.indexOf('--mine');
if (mineIdx !== -1) {
  mine(dict, process.argv[mineIdx + 1]);
  process.exit(0);
}

const groups = [];
const rejected = [];
const seenPair = new Set();

for (const contrast of CONTRASTS) {
  const pairs = [];
  for (const [wa, wb] of contrast.seed) {
    const res = validatePair(dict, contrast, wa, wb);
    if (!res.ok) {
      rejected.push(`${contrast.id}  ${wa}/${wb}: ${res.reason}`);
      continue;
    }
    const key = `${contrast.id}|${res.entry.a}|${res.entry.b}`;
    if (seenPair.has(key)) {
      rejected.push(`${contrast.id}  ${wa}/${wb}: duplicate`);
      continue;
    }
    seenPair.add(key);
    pairs.push(res.entry);
    if (pairs.length >= MAX_PAIRS_PER_CONTRAST) break;
  }
  const group = {
    contrast: contrast.id,
    label: contrast.label,
    kind: contrast.kind,
    example: contrast.example,
    ipa_symbols: contrast.symbols,
    pairs,
  };
  // Carry the caveat into the data file so whoever builds the T8 UI sees it
  // without having to read this script.
  if (contrast.note) group.note = contrast.note;
  groups.push(group);
}

const validStress = [];
const stressRejected = [];
const seenWord = new Set();
for (const word of STRESS_SEED) {
  if (seenWord.has(word)) continue;
  seenWord.add(word);
  const res = stressEntry(dict, word);
  if (!res.ok) { stressRejected.push(`${word}: ${res.reason}`); continue; }
  validStress.push(res.entry);
}

// The seed list is alphabetical and longer than the cap, so plain truncation
// would ship only words starting a–i. Take an even stride through the
// validated list instead: deterministic, and the whole alphabet survives.
let stress = validStress;
if (validStress.length > MAX_STRESS_ENTRIES) {
  const step = validStress.length / MAX_STRESS_ENTRIES;
  stress = Array.from(
    { length: MAX_STRESS_ENTRIES },
    (_, i) => validStress[Math.floor(i * step)],
  );
}

await mkdir(OUT_DIR, { recursive: true });
await writeFile(
  join(OUT_DIR, 'minimal-pairs.json'),
  `${JSON.stringify(groups, null, 2)}\n`,
);
await writeFile(
  join(OUT_DIR, 'word-stress.json'),
  `${JSON.stringify(stress, null, 2)}\n`,
);

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

console.log('minimal-pairs.json');
for (const g of groups) {
  const flag = g.pairs.length < 20 ? '  ** under target of 20 **' : '';
  console.log(`  ${g.contrast.padEnd(8)} ${String(g.pairs.length).padStart(3)} pairs${flag}`);
}
console.log(`  total ${groups.reduce((n, g) => n + g.pairs.length, 0)} pairs`);
console.log('');
console.log(`word-stress.json: ${stress.length} entries (from ${validStress.length} validated candidates)`);
const bySyl = {};
for (const e of stress) bySyl[e.syllables] = (bySyl[e.syllables] ?? 0) + 1;
console.log(`  by syllable count: ${Object.entries(bySyl).map(([k, v]) => `${k}→${v}`).join('  ')}`);
const byIdx = {};
for (const e of stress) byIdx[e.stress_index] = (byIdx[e.stress_index] ?? 0) + 1;
console.log(`  by stress index:   ${Object.entries(byIdx).map(([k, v]) => `${k}→${v}`).join('  ')}`);

if (rejected.length) {
  console.log(`\nRejected ${rejected.length} candidate pair(s):`);
  for (const r of rejected) console.log(`  ${r}`);
}
if (stressRejected.length) {
  console.log(`\nRejected ${stressRejected.length} stress candidate(s):`);
  for (const r of stressRejected) console.log(`  ${r}`);
}
