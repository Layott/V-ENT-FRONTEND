/**
 * The words for a blueprint's schedule (P7), one place for every screen.
 *
 * A blueprint makes the next edition of a tournament on a schedule. The
 * server says when (`every`, `first_start`, `next_start`, `lead_days`) and why
 * it stopped (`paused_reason`, a code); this turns that into a sentence in the
 * reader's language. `when` formats an instant and is passed in by the caller
 * (formatWithZone from src/lib/datetime.js, which names the zone), so the
 * words can be tested without a browser.
 */

const EVERY_WORDS = {
  day: ['blueprint.every.day', 'Every day'],
  week: ['blueprint.every.week', 'Every week'],
  fortnight: ['blueprint.every.fortnight', 'Every two weeks'],
  month: ['blueprint.every.month', 'Every month'],
};

/** How often, in the words a chip shows. */
export function everyWord(tt, every) {
  if (every === 'none') return tt('blueprint.every.none', 'Only when I press');
  const [key, fallback] = EVERY_WORDS[every] || EVERY_WORDS.week;
  return tt(key, fallback);
}

/** The choices, in the order the chips are drawn. */
export const EVERY_CHOICES = ['week', 'fortnight', 'month', 'day', 'none'];

/** "Every week, from 24 Oct 2026, 18:00 WAT", or why it is not running. */
export function scheduleSentence(tt, row, when) {
  if (!row) return '';
  if (row.ends_after && row.made >= row.ends_after) {
    return tt('blueprint.finished', 'Finished: it made all {n} editions').replace('{n}', row.ends_after);
  }
  if (row.every === 'none' || !row.first_start) {
    return tt('blueprint.byHand', 'Only when you press Make one now');
  }
  const [key, fallback] = EVERY_WORDS[row.every] || EVERY_WORDS.week;
  return tt('blueprint.everyFrom', '{every}, from {when}')
    .replace('{every}', tt(key, fallback))
    .replace('{when}', when(row.first_start));
}

/** "Next: #12 on 24 Oct 2026, 18:00 WAT, made 7 days before it starts". */
export function nextEditionLine(tt, row, when) {
  if (!row || !row.next_start) return tt('blueprint.nothingScheduled', 'Nothing scheduled');
  const lead = Number(row.lead_days) || 0;
  const ahead = lead === 0
    ? tt('blueprint.madeOnTheDay', 'made on the day')
    : lead === 1
      ? tt('blueprint.madeDayBefore', 'made 1 day before it starts')
      : tt('blueprint.madeDaysBefore', 'made {n} days before it starts').replace('{n}', lead);
  return tt('blueprint.nextLine', 'Next: #{number} on {when}, {ahead}')
    .replace('{number}', row.next_number)
    .replace('{when}', when(row.next_start))
    .replace('{ahead}', ahead);
}

/** Why a blueprint is not running, or '' when it is. */
export function pausedWords(tt, row) {
  if (!row || row.active) return '';
  if (row.paused_reason === 'BLUEPRINT_SOURCE_GONE') {
    return tt('blueprint.pausedSourceGone',
      'Paused: the tournament it copies was deleted or is no longer yours. Point it at another tournament you run.');
  }
  return tt('blueprint.paused', 'Paused');
}
