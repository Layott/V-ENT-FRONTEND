// Is each translation actually in its own language block.
//
// dict-parity counts keys and finds none missing. It cannot see that the
// Portuguese value is French, because it is a present, non-empty string with
// the right key.
//
// On 3 September 2026 a patch script searched forward from the French anchor
// for each key. The new keys had been inserted just ABOVE that anchor, so every
// search ran past them and found the next copy of the key, which was the
// Portuguese one. Thirty-two Portuguese entries were quietly overwritten with
// French. Every checker stayed green.
//
// The tell is cheap: two languages carrying byte-identical text that English
// does not share. Real translations collide only on things that are the same
// word everywhere, and those are short, so a length floor keeps the noise out.
//
//   node scripts/check-language-blocks.mjs
//   node scripts/check-language-blocks.mjs --self-test

//: Below this many characters, two languages sharing a string is ordinary:
//: "OK", "NGA", "Email", a name, a number. Above it, it is a copy.
const MIN_LENGTH = 12;

//: Keys that hold an example rather than a sentence.
const EXAMPLE_KEY = /(^|\.)e\.g(\.|$)/;

export function findingsIn(dicts) {
  const { en = {}, fr = {}, pt = {} } = dicts;
  const out = [];
  for (const key of Object.keys(en)) {
    const a = fr[key];
    const b = pt[key];
    if (typeof a !== 'string' || typeof b !== 'string') continue;
    if (a !== b) continue;
    if (a.length < MIN_LENGTH) continue;
    // An example placeholder is mostly proper nouns: "ex. YouTube, Instagram",
    // "ex. Crimson Wolves". Those read the same in French and Portuguese
    // because they are names, not sentences. All five hits in the codebase
    // when this checker was written were of exactly this shape, and a checker
    // that reports five things nobody should act on is a checker people stop
    // reading.
    if (EXAMPLE_KEY.test(key)) continue;
    // Identical to English as well means simply untranslated, which is a
    // different and much louder problem that other checks already cover.
    if (a === en[key]) continue;
    out.push({ key, shared: a });
  }
  return out;
}

/* ------------------------------------------------------------------ self-test */

if (process.argv.includes('--self-test')) {
  const cases = [
    ['french copied into portuguese', {
      en: { a: 'That squad was not created.' },
      fr: { a: "Cette équipe n'a pas été créée." },
      pt: { a: "Cette équipe n'a pas été créée." },
    }, 1],
    ['three real translations', {
      en: { a: 'That squad was not created.' },
      fr: { a: "Cette équipe n'a pas été créée." },
      pt: { a: 'Essa equipa não foi criada.' },
    }, 0],
    ['a short string that is the same everywhere', {
      en: { a: 'NGA' }, fr: { a: 'NGA' }, pt: { a: 'NGA' },
    }, 0],
    ['an example placeholder that is proper nouns', {
      en: { 'ui.e.g.youtube.instagram.cd25': 'e.g. YouTube, Instagram' },
      fr: { 'ui.e.g.youtube.instagram.cd25': 'ex. YouTube, Instagram' },
      pt: { 'ui.e.g.youtube.instagram.cd25': 'ex. YouTube, Instagram' },
    }, 0],
    ['a real key that merely mentions examples is still checked', {
      en: { 'squad.hint': 'A side made of players from different clubs.' },
      fr: { 'squad.hint': "Une équipe composée de joueurs de clubs différents." },
      pt: { 'squad.hint': "Une équipe composée de joueurs de clubs différents." },
    }, 1],
    ['untranslated in all three, which is a different check', {
      en: { a: 'That squad was not created.' },
      fr: { a: 'That squad was not created.' },
      pt: { a: 'That squad was not created.' },
    }, 0],
  ];
  let bad = 0;
  for (const [what, dicts, expected] of cases) {
    const got = findingsIn(dicts).length;
    if (got !== expected) { console.error(`SELF-TEST ${what}: expected ${expected}, got ${got}`); bad += 1; }
    else console.log(`ok: ${what} -> ${got}`);
  }
  if (bad) process.exit(1);
  console.log('self-test: catches a copied block and does not cry wolf');
  process.exit(0);
}

/* ---------------------------------------------------------------- the sweep */

// A static import, like dict-parity: a dynamic import of a Windows path needs
// a file:// URL and fails with ERR_UNSUPPORTED_ESM_URL_SCHEME without one.
const { dictionaries } = await import('../src/i18n/dictionaries.js');
const findings = findingsIn(dictionaries);

if (findings.length) {
  console.error(`${findings.length} key(s) where French and Portuguese are the same text:\n`);
  for (const f of findings.slice(0, 40)) {
    console.error(`  ${f.key}\n    ${f.shared.slice(0, 90)}`);
  }
  console.error('\nOne of those blocks was written over with the other language.');
  process.exit(1);
}
console.log('0 keys where two languages share a translation');
