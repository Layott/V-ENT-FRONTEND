// Every timezone is offered, and every date-format value means something.
//
// CEO, 7 September 2026: "hopefully all time zones are represented".
//
// They were not. `LanguagePanel` held ELEVEN hand-typed zones - Lagos, Accra,
// Nairobi, Johannesburg, Cairo, London, New York, Los Angeles, Tokyo,
// Singapore, UTC - so a reader in Abidjan, Kinshasa, Casablanca, Dhaka, Sao
// Paulo or Auckland could not say where they were. On a platform whose whole
// point is that everybody sees their own clock, that is the setting failing at
// the first step, and it is invisible unless you happen to live somewhere the
// list forgot.
//
// The second rule here caught a worse one in the same panel. The date-format
// options carried the values 'DMY', 'MDY', 'YMD' and 'long', while the table
// that reads them, `DATE_ORDER` in src/lib/datetime.js, is keyed on
// 'DD/MM/YYYY', 'MM/DD/YYYY' and 'YYYY-MM-DD'. Every lookup missed. The
// setting saved fine, returned fine, and changed no date anywhere - which is
// precisely the class of fault the panel was reported for in the first place,
// still present after it was reported.
//
// That is why this checks the LINK and not the list: a hand-typed set of
// option values that nothing on the other side matches is a control that lies.
//
//   node scripts/check-timezone-picker.mjs
//   node scripts/check-timezone-picker.mjs --self-test

import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(process.cwd());
const PANEL = 'src/components/settings-panels/LanguagePanel.js';
const DATETIME = 'src/lib/datetime.js';

const read = (rel) => {
  try {
    return fs.readFileSync(path.join(ROOT, rel), 'utf8');
  } catch {
    return '';
  }
};

/** The values a `const NAME = [{ v: 'x', ... }]` list offers. */
export function optionValues(src, name) {
  const at = src.indexOf(`const ${name}`);
  if (at === -1) return null;
  const end = src.indexOf('];', at);
  if (end === -1) return null;
  return [...src.slice(at, end).matchAll(/\bv:\s*'([^']*)'/g)].map((m) => m[1]);
}

/** The keys of a `const NAME = { 'x': ..., }` table. */
export function tableKeys(src, name) {
  const at = src.indexOf(`const ${name}`);
  if (at === -1) return null;
  const end = src.indexOf('};', at);
  if (end === -1) return null;
  return [...src.slice(at, end).matchAll(/'([^']+)':\s*\{/g)].map((m) => m[1]);
}

export function findings(panel, datetime) {
  const out = [];

  // 1. The zone list comes from the platform, not from somebody's memory.
  const hardCoded = /const TIMEZONES\s*=\s*\[/.test(panel);
  const fromPlatform = /timezoneGroups|supportedValuesOf/.test(panel);
  if (hardCoded || !fromPlatform) {
    out.push({
      rule: 'shortlist',
      detail: 'the timezone picker must offer every zone, through '
        + 'timezoneGroups() in src/lib/timezones.js, not a hand-typed array. '
        + 'Somebody in Abidjan has to be able to say where they are.',
    });
  }

  // 2. Every date-format value the panel offers is one datetime.js knows.
  const offered = optionValues(panel, 'DATE_FORMATS');
  const known = tableKeys(datetime, 'DATE_ORDER');
  if (offered && known) {
    for (const v of offered) {
      // '' is the real default: follow the reader's language.
      if (v === '' || known.includes(v)) continue;
      out.push({
        rule: 'dead date format',
        detail: `the panel offers date format '${v}', which DATE_ORDER in `
          + 'src/lib/datetime.js has no entry for. Choosing it saves a value '
          + 'and changes no date on the site.',
      });
    }
  }

  return out;
}

const SELF_TEST = [
  {
    why: 'the shortlist that shipped, eleven hand-typed zones',
    flag: true,
    panel: "const TIMEZONES = ['Africa/Lagos', 'Africa/Accra', 'UTC'];\n"
      + "const DATE_FORMATS = [{ v: '', label: 'x' }];",
    datetime: "const DATE_ORDER = {\n  'DD/MM/YYYY': { locale: 'en-GB' },\n};",
  },
  {
    why: 'the date-format values that matched nothing, the real second fault',
    flag: true,
    panel: "const groups = timezoneGroups({});\n"
      + "const DATE_FORMATS = [{ v: 'DMY', label: 'x' }];",
    datetime: "const DATE_ORDER = {\n  'DD/MM/YYYY': { locale: 'en-GB' },\n};",
  },
  {
    why: 'no zone source at all',
    flag: true,
    panel: "const DATE_FORMATS = [{ v: '', label: 'x' }];",
    datetime: "const DATE_ORDER = {\n  'DD/MM/YYYY': { locale: 'en-GB' },\n};",
  },
  {
    why: 'the fixed panel: every zone, and values that resolve',
    flag: false,
    panel: "const groups = timezoneGroups({ pinned: [] });\n"
      + "const DATE_FORMATS = [{ v: '', label: 'a' }, { v: 'DD/MM/YYYY', label: 'b' }];",
    datetime: "const DATE_ORDER = {\n  'DD/MM/YYYY': { locale: 'en-GB' },\n"
      + "  'MM/DD/YYYY': { locale: 'en-US' },\n};",
  },
  {
    why: 'the empty default on its own is not a dead value',
    flag: false,
    panel: "const groups = timezoneGroups({});\n"
      + "const DATE_FORMATS = [{ v: '', label: 'follow my language' }];",
    datetime: "const DATE_ORDER = {\n  'DD/MM/YYYY': { locale: 'en-GB' },\n};",
  },
];

if (process.argv.includes('--self-test')) {
  let bad = 0;
  for (const c of SELF_TEST) {
    const got = findings(c.panel, c.datetime).length > 0;
    if (got !== c.flag) {
      bad += 1;
      console.log(`FAIL  expected ${c.flag ? 'a finding' : 'no finding'}: ${c.why}`);
    }
  }
  if (bad) {
    console.log(`${bad} of ${SELF_TEST.length} case(s) wrong`);
    process.exit(1);
  }
  console.log(`${SELF_TEST.length} cases, both directions: self-test passed`);
  process.exit(0);
}

const hits = findings(read(PANEL), read(DATETIME));
for (const h of hits) {
  console.log(`${PANEL}  ${h.rule}`);
  console.log(`  ${h.detail}`);
  console.log('');
}
console.log(`${hits.length} timezone or date-format fault(s)`);
process.exit(hits.length ? 1 : 0);
