#!/usr/bin/env node
/**
 * A setting the organiser can change must be readable by the person it is for.
 *
 * Third occurrence of this class, so it gets a catcher per the standing rule.
 * On 8 September the ticket tier model carried three settings an organiser had
 * been able to set for months and no buyer screen read any of them:
 *
 *   group_min / group_price   the panel charged the list price for four while
 *                             the server charged the group rate. 80 against 64
 *   early_bird_*              the serializer even carried the comment "so the
 *                             buy screen can say 12 left at this price"
 *   access_code               the listing endpoint read ?code= and no screen
 *                             had anywhere to type one, so a hidden tier was
 *                             unbuyable by everybody
 *
 * The shape is always the same: built on the organiser side, forgotten on the
 * buyer side. Reading the backend cannot see it, because the backend is the
 * half that is right.
 *
 * What this checks: for each field below, at least one BUYER surface mentions
 * it. It is deliberately shallow - it proves a screen has heard of the field,
 * not that it renders it well. A checker that tried to prove the second would
 * be guessing, and a guessing checker gets ignored.
 *
 *   node scripts/check-offer-surface.mjs
 *   node scripts/check-offer-surface.mjs --self-test
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// fileURLToPath rather than url.pathname: on Windows the raw pathname is
// "/C:/Users/..." and every file read off it silently misses, which reads as
// "the surface does not exist" and passes the wrong verdict loudly.
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Every field an organiser sets that changes what a BUYER is charged, told or
 * allowed. `reads` are the strings that count as a screen having heard of it:
 * the serializer's own name, plus the name the page mapper renames it to.
 */
const FIELDS = [
  { field: 'group_min', reads: ['group_min', 'groupMin'],
    why: 'a group rate charged but never offered' },
  { field: 'group_price', reads: ['group_price', 'group_price_vc', 'groupPrice'],
    why: 'the cheaper price the organiser set for buying several' },
  { field: 'early_bird_quantity', reads: ['early_bird_quantity', 'earlyBirdQuantity'],
    why: 'how many are left before the price moves' },
  { field: 'early_bird_price', reads: ['early_bird_price', 'early_bird_price_vc', 'earlyBirdPrice'],
    why: 'what the price moves to' },
  { field: 'access_code', reads: ['is_hidden', 'access_code', 'unlockCode', 'codeApply'],
    why: 'a presale nobody can enter a code for is unbuyable' },
  { field: 'max_tickets_per_email', reads: ['max_tickets_per_email', 'maxPerEmail'],
    why: 'a limit that refuses somebody only after they have filled the form in' },
  { field: 'day', reads: ['day_label', 'ticketWhen', '.day'],
    why: 'which day the ticket admits you' },
];

/** The screens somebody buys a ticket from. Both of them, always. */
const BUYER_SURFACES = [
  'src/app/events/view-event/page.js',
  'src/components/guest-checkout/GuestCheckout.js',
];

function readSurfaces(files) {
  return files.map(rel => {
    const full = path.join(ROOT, rel);
    return { rel, text: fs.existsSync(full) ? fs.readFileSync(full, 'utf8') : '' };
  });
}

function audit(surfaces) {
  const missing = [];
  for (const entry of FIELDS) {
    const seen = surfaces.some(s => entry.reads.some(token => s.text.includes(token)));
    if (!seen) missing.push(entry);
  }
  return missing;
}

function selfTest() {
  let failures = 0;

  // It must PASS on the real repo as it stands today.
  const real = readSurfaces(BUYER_SURFACES);
  const realMissing = audit(real);
  if (realMissing.length !== 0) {
    console.log('self-test FAILED: the real buyer surfaces should be complete, missing '
      + realMissing.map(m => m.field).join(', '));
    failures += 1;
  } else {
    console.log('ok: the real buyer surfaces read every organiser setting');
  }

  // And it must CATCH the fault as it actually shipped: a panel that knows
  // nothing about the group rate.
  const withoutGroup = real.map(s => ({
    rel: s.rel,
    text: s.text.split('group_min').join('XXX').split('group_price').join('XXX')
      .split('groupMin').join('XXX').split('groupPrice').join('XXX'),
  }));
  const caught = audit(withoutGroup).map(m => m.field);
  if (!caught.includes('group_min') || !caught.includes('group_price')) {
    console.log('self-test FAILED: the group rate fault was not caught, got '
      + (caught.join(', ') || 'nothing'));
    failures += 1;
  } else {
    console.log('ok: catches the group rate that was charged and never offered');
  }

  // And the access code fault, which is the one that made a tier unbuyable.
  const withoutCode = real.map(s => ({
    rel: s.rel,
    text: s.text.split('is_hidden').join('XXX').split('access_code').join('XXX')
      .split('unlockCode').join('XXX').split('codeApply').join('XXX'),
  }));
  if (!audit(withoutCode).map(m => m.field).includes('access_code')) {
    console.log('self-test FAILED: the missing access code input was not caught');
    failures += 1;
  } else {
    console.log('ok: catches a presale with nowhere to type the code');
  }

  // A surface that does not exist must not read as complete.
  if (audit(readSurfaces(['src/app/events/does-not-exist.js'])).length !== FIELDS.length) {
    console.log('self-test FAILED: a missing file should report every field');
    failures += 1;
  } else {
    console.log('ok: a missing surface reports every field rather than passing');
  }

  console.log(failures === 0 ? '4 self-test case(s) pass' : `${failures} self-test case(s) FAILED`);
  return failures === 0 ? 0 : 1;
}

function main() {
  if (process.argv.includes('--self-test')) return selfTest();

  const surfaces = readSurfaces(BUYER_SURFACES);
  const gone = surfaces.filter(s => !s.text);
  for (const s of gone) {
    console.log(`missing buyer surface: ${s.rel}`);
  }

  const missing = audit(surfaces);
  for (const entry of missing) {
    console.log(`${entry.field} is set by the organiser and read by no buyer screen`);
    console.log(`  ${entry.why}`);
  }

  console.log(`${FIELDS.length} organiser setting(s) checked, `
    + `${missing.length + gone.length} with no buyer surface`);
  return (missing.length + gone.length) === 0 ? 0 : 1;
}

process.exit(main());
