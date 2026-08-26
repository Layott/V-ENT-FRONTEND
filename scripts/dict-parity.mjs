// en, fr and pt must hold the same keys. A key present in English and missing
// elsewhere falls back to English silently, which is the failure that survives
// longest.
import { dictionaries as d } from '../src/i18n/dictionaries.js';

const counts = Object.fromEntries(Object.entries(d).map(([l, v]) => [l, Object.keys(v).length]));
const missing = Object.fromEntries(
  ['fr', 'pt'].map((l) => [l, Object.keys(d.en).filter((k) => !(k in d[l])).length]));

const equal = new Set(Object.values(counts)).size === 1;
const none = Object.values(missing).every((m) => m === 0);

console.log(`en=${counts.en} fr=${counts.fr} pt=${counts.pt}, missing fr=${missing.fr} pt=${missing.pt}`);
console.log(equal && none ? 'en=fr=pt and 0 missing' : 'PARITY BROKEN');
process.exit(equal && none ? 0 : 1);
