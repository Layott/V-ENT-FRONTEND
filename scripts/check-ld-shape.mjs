#!/usr/bin/env node
// The structured data is built from the payload the API actually sends.
//
// On 18 September 2026 every event page's JSON-LD carried the registration-open
// instant as its startDate, no endDate and no offers, and a paid event with no
// description was described as "Free to attend." The builders in src/lib/seo.js
// read `event_date`, `start_datetime`, `end_datetime` and `ticket_tiers`; the
// API sends `start_date`, `end_date` and `ticket_types`. Nothing could see it:
// check-seo confirms a page HAS structured data, not that the numbers in it
// are the record's.
//
// This builds the metadata and the JSON-LD from a fixture captured from the
// real API (scripts/fixtures/*-payload.json) and checks the dates, the offers
// and the description against the record itself. Recapture the fixtures when
// the payload changes shape:
//
//   curl -s $API/event/view-event/<slug>/ | jq .data.event > scripts/fixtures/event-payload.json
//
//   node scripts/check-ld-shape.mjs
//   node scripts/check-ld-shape.mjs --self-test
//
// seo.js imports next/headers, which only exists inside a Next request, so a
// resolve hook swaps it for a stub before the module loads.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { register } from 'node:module';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const FIXTURES = path.join(HERE, 'fixtures');

// A tiny loader that answers `next/headers` with a stub whose headers() throws,
// which is exactly what seo.js expects outside a request.
const hook = `
  export async function resolve(specifier, context, next) {
    if (specifier === 'next/headers') return { url: 'stub:next-headers', shortCircuit: true };
    return next(specifier, context);
  }
  export async function load(url, context, next) {
    if (url === 'stub:next-headers') {
      return { format: 'module', shortCircuit: true,
               source: 'export function headers() { throw new Error("outside a request"); }' };
    }
    return next(url, context);
  }
`;
register('data:text/javascript,' + encodeURIComponent(hook), pathToFileURL(ROOT + '/'));

const seo = await import(pathToFileURL(path.join(ROOT, 'src', 'lib', 'seo.js')).href);

function readFixture(name) {
  return JSON.parse(fs.readFileSync(path.join(FIXTURES, name), 'utf8'));
}

function checkEvent(e, problems, label = 'event', build = seo.eventLd) {
  const ld = build(e, `/events/${e.slug}`);
  const meta = seo.eventMetadata(e, e.slug);
  if (!ld) { problems.push(`${label}: no JSON-LD built`); return; }
  if (ld.startDate !== e.start_date) {
    problems.push(`${label}: startDate is ${ld.startDate}, the record starts ${e.start_date}`);
  }
  if (e.end_date && ld.endDate !== e.end_date) {
    problems.push(`${label}: endDate is ${ld.endDate}, the record ends ${e.end_date}`);
  }
  const tiers = e.ticket_types || [];
  const offers = Array.isArray(ld.offers) ? ld.offers : (ld.offers ? [ld.offers] : []);
  if (tiers.length && offers.length !== tiers.length) {
    problems.push(`${label}: ${offers.length} offer(s) for ${tiers.length} ticket type(s)`);
  }
  for (const tier of tiers) {
    const offer = offers.find((o) => o.name === tier.name);
    if (offer && Number(offer.price) !== Number(tier.price)) {
      problems.push(`${label}: ${tier.name} priced ${offer.price} in the JSON-LD, ${tier.price} on the record`);
    }
  }
  const description = meta?.description || '';
  const cheapest = tiers.length ? Math.min(...tiers.map((t) => Number(t.price || 0))) : 0;
  if (!e.desc && !e.description && cheapest > 0 && /free to attend/i.test(description)) {
    problems.push(`${label}: a paid event is described as free`);
  }
}

function checkTournament(t, problems, label = 'tournament') {
  const ld = seo.tournamentLd(t, `/tournaments/${t.slug}`);
  if (!ld) { problems.push(`${label}: no JSON-LD built`); return; }
  if (ld.startDate !== t.start_date_and_time) {
    problems.push(`${label}: startDate is ${ld.startDate}, the record starts ${t.start_date_and_time}`);
  }
  if (t.end_date_and_time && ld.endDate !== t.end_date_and_time) {
    problems.push(`${label}: endDate is ${ld.endDate}, the record ends ${t.end_date_and_time}`);
  }
  const fee = t.entry_fee === 'Paid' ? Number(t.entry_fee_price || 0) : 0;
  if (Number(ld.offers?.price) !== fee) {
    problems.push(`${label}: offer price ${ld.offers?.price}, entry fee ${fee}`);
  }
}

function selfTest() {
  const e = readFixture('event-payload.json');
  const t = readFixture('tournament-payload.json');
  const cases = [];

  // Must pass on the real shape.
  let problems = [];
  checkEvent(e, problems); checkTournament(t, problems);
  cases.push(['real payloads build correctly', problems.length === 0, problems.join('; ')]);

  // Must catch the fault as it shipped: a builder reading names the API does
  // not send fell back to reg_start_date, saw no end and no tiers.
  const shippedBuilder = (rec, p) => ({
    '@type': 'Event', name: rec.name, url: p,
    startDate: rec.start_datetime || rec.event_date || rec.reg_start_date,
  });
  problems = [];
  checkEvent(e, problems, 'event', shippedBuilder);
  cases.push(['the builder as it shipped is caught (start, end, offers)', problems.length >= 3, problems.join('; ')]);

  // Must catch a price that drifts from the record.
  const drifted = { ...e, ticket_types: e.ticket_types.map((x, i) => (i === 0 ? { ...x, price: '1.00' } : x)) };
  const built = seo.eventLd(drifted, '/events/x');
  problems = [];
  // Compare the drifted build against the ORIGINAL record's prices.
  const offers = built.offers || [];
  const first = offers.find((o) => o.name === e.ticket_types[0].name);
  if (Number(first.price) !== Number(e.ticket_types[0].price)) problems.push('drift seen');
  cases.push(['a drifted price is visible', problems.length === 1, '']);

  // A tournament whose builder ignored the fee.
  problems = [];
  checkTournament({ ...t, entry_fee: 'Paid', entry_fee_price: '30.00' }, problems);
  cases.push(['a paid tournament carries its fee', problems.length === 0, problems.join('; ')]);

  let failed = 0;
  for (const [name, ok, detail] of cases) {
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${ok ? '' : `: ${detail}`}`);
    if (!ok) failed += 1;
  }
  console.log(`${cases.length - failed} of ${cases.length} self-test cases pass`);
  process.exit(failed ? 1 : 0);
}

if (process.argv.includes('--self-test')) {
  selfTest();
} else {
  const problems = [];
  checkEvent(readFixture('event-payload.json'), problems);
  checkTournament(readFixture('tournament-payload.json'), problems);
  if (problems.length) {
    console.error(`${problems.length} structured-data problem(s):`);
    for (const p of problems) console.error(`  ${p}`);
    process.exit(1);
  }
  console.log('structured data reads the real payload: 0 problems');
}
