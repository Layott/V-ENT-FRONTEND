'use client';

// B10 matchday: the day's fixtures, and the same card again at the wrap with
// the aggregates filled in.
//
// Ported from `CLAUDE/VIDEOS/RIVALRY/stream_client.py`, `matchday(day, scores)`,
// which is the pack the CEO approved for the CADE Rivalry Series. Every
// coordinate in the stylesheet beside this file is the number that function
// puts inside its own 1920x1080 frame, so the card lands where the designer
// put it. The engine deciding the fonts and the shell colours is `stream.py`,
// copied once into `rivalry.module.css`; the few extra colours this card uses
// are `CLIENT_CSS`, measured off the client's Standings.png rather than picked.
//
// ONE component, not four. Their own note on the original: "Layo asked for the
// fixtures per day and then for a version carrying the results, which is the
// same graphic at two points in the day. One function, one argument, so the two
// cannot drift." Here the argument is the payload, which is also what an
// operator with one hand on the mixer wants: two fields, not four sources.
//
// ## The day
//
// The feed sends `rivalry.days` as `[{date, number, fixtures}]`, which carries
// the organiser's own running order and their numbering, so it is read in
// preference to the `day` date on each fixture. A feed old enough to send only
// the dates still groups, off the fixtures, so the card keeps its day tag
// rather than losing it. With neither, the card says NOTHING about the day: a
// card showing Saturday's draw under a Friday tag is far worse on air than a
// card that stays quiet about which day it is.

import { useT } from '@/i18n/LanguageProvider';
import { appLocale } from '@/lib/appLocale';

import { Face, count, nationCode, optIn, rivalryOf, tagOf } from './lib';
import rv from './rivalry.module.css';
import styles from './matchday-card.module.css';

// How many rows fit. The list starts at 308px, a block is 106px and the gap is
// 20px, so a seventh row would run off the bottom of the frame. The pack's own
// days carry five, which is why the original never had to think about it.
const MAX_ROWS = 6;

/** Today, written the way the feed writes a fixture's day. */
function todayISO() {
  const now = new Date();
  const two = (n) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${two(now.getMonth() + 1)}-${two(now.getDate())}`;
}

/** Has this tie finished. */
const isDone = (fixture) => Boolean(
  fixture.decided || fixture.status === 'completed');

/** The days of the draw, each with its number and its fixtures in running order.
 *
 * `rivalry.days` is the honest source: it is the organiser's own grouping and
 * their numbering, and its fixture list is already in the order the desk is
 * reading. Grouping on the `day` date carried by each fixture is the fallback
 * for a feed that predates it, so an older backend keeps its day tag instead of
 * silently losing it.
 */
function daysOf(riv) {
  const all = riv?.fixtures || [];
  const byId = new Map(all.map((f) => [String(f.id), f]));

  const sent = riv?.days || [];
  if (sent.length) {
    return sent
      .map((day, i) => ({
        date: String(day.date || ''),
        number: Number(day.number) || i + 1,
        fixtures: (day.fixtures || [])
          .map((id) => byId.get(String(id)))
          .filter(Boolean),
      }))
      .filter((day) => day.fixtures.length);
  }

  const dates = [];
  for (const fixture of all) {
    const date = String(fixture.day || '').trim();
    if (date && !dates.includes(date)) dates.push(date);
  }
  return dates.sort().map((date, i) => ({
    date,
    number: i + 1,
    fixtures: all.filter((f) => String(f.day || '') === date),
  }));
}

/** Which day this card is about.
 *
 * The operator names one, or leaves it blank and gets whichever day the room
 * is on, which is what they want mid-show. A day that matches nothing resolves
 * to NOTHING, never to a neighbouring day: same rule as `pickFixture`, and for
 * a sharper reason here, since a whole card of the wrong five ties reads as
 * confidently correct.
 */
function pickDay(days, riv, asked, wants) {
  if (!days.length) return null;

  const said = String(asked || '').trim();
  if (said) {
    return days.find((d) => d.date === said)
      || days.find((d) => String(d.number) === said)
      || null;
  }

  // A results card is about a day that has FINISHED. Same rule as
  // `pickFixture(..., 'decided')`: asked for results, answer with the most
  // recent day that has them rather than with one still being played, which
  // would put a single scoreline above four rows still reading VS.
  if (wants === true) {
    const done = days.filter((d) => d.fixtures.every(isDone));
    if (done.length) return done[done.length - 1];
  }

  const liveId = riv?.now?.fixture_id;
  if (liveId) {
    const on = days.find(
      (d) => d.fixtures.some((f) => String(f.id) === String(liveId)));
    if (on) return on;
  }
  return days.find((d) => d.fixtures.some((f) => !isDone(f)))
    || days[days.length - 1];
}

/** A date written the way the pack writes one: FRIDAY 4 SEPTEMBER.
 *
 * Assembled from the parts rather than taken whole from `toLocaleDateString`,
 * whose English order is "Saturday, September 5". The words stay the reader's
 * and the order is the design's, with the literals a locale would slip in (the
 * comma in English, the "de" in Portuguese) dropped, which is what one line
 * across a broadcast frame has room for.
 */
function longDate(iso) {
  const when = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(when.getTime())) return '';
  const parts = new Intl.DateTimeFormat(appLocale(),
    { day: 'numeric', month: 'long', weekday: 'long' }).formatToParts(when);
  const pick = (type) => (parts.find((p) => p.type === type) || {}).value || '';
  return [pick('weekday'), pick('day'), pick('month')].filter(Boolean).join(' ');
}

/** The line under the headline: which day it is, and its date.
 *
 * The organiser's own name for the day when the day being drawn is today and
 * the run of show gives one. Their sheet says "Finals Day" where a count says
 * "Day 2", and the name on the wall is the one the room is using.
 */
function dayLine(day, data, tt) {
  const own = String(data?.run_of_show?.day_label || '').trim();
  const name = own && day.date === todayISO()
    ? own
    : tt('studio.rv.day', 'Day {n}').replace('{n}', String(day.number));

  // A space, two hard spaces and a space, which is exactly the separator the
  // original sets between the two halves. Not a rule, not a dot, and not a
  // single gap: at 0.24em of tracking the four advances are the space the
  // designer left there.
  const date = day.date ? longDate(day.date) : '';
  return date ? `${name}    ${date}` : name;
}

/** The origin code beside a block. Their `.cc`, holding a V-ENT side's tag.
 *
 * Two letters, which is what the pack writes: GH, NG, KN, SN. A V-ENT tag is
 * whatever the organiser typed, up to six, and drawing NGA where the approved
 * card draws NG is the difference the parity shot caught.
 */
function Code({ side, right }) {
  const code = String(tagOf(side) || '').toUpperCase().slice(0, 2);
  return (
    <span className={`${styles.cc} ${right ? styles.ccR : ''}`}>{code}</span>
  );
}

/** The badges inside a side's block: the organisations its players play for.
 *
 * The pack draws one or two marks per nation and they are the ORGS of that
 * nation's two players, not a national crest, which is why a nation whose two
 * seats sit for the same club draws a single mark. The V-ENT equivalent is each
 * leg player's `represents_logo`, found through the username the leg carries.
 *
 * The side's own logo is the fallback, and its name the fallback after that.
 * The country is already said by the code outside the block, so a name inside
 * says it twice and loses what the graphic is for; it is there only so a block
 * is never an empty white tile going out on air.
 */
function marksFor(fixture, side, away, data) {
  const rows = (data?.teams || []).flatMap((team) => team.players || []);
  const marks = [];
  for (const leg of fixture?.legs || []) {
    const who = String(
      (away ? leg.away_player_username : leg.home_player_username) || '',
    ).toLowerCase();
    if (!who) continue;
    const row = rows.find((p) => String(p.ign || '').toLowerCase() === who);
    const logo = row?.represents_logo;
    // One org holding both seats draws once, centred, exactly as the pack does.
    if (logo && !marks.includes(logo)) marks.push(logo);
  }
  if (marks.length) return marks.slice(0, 2);
  return side?.logo ? [side.logo] : [];
}

/** One notched block: the marks, and the green fill when that side won the tie. */
function Side({ marks, name, won, away }) {
  const shape = away ? styles.sideB : styles.sideA;
  const fill = won ? styles.won : '';
  return (
    <span className={`${styles.side} ${shape} ${fill}`}>
      {marks.length ? marks.map((src) => (
        <span className={styles.mini} key={src}>
          <Face src={src} className={styles.miniImg} />
        </span>
      )) : (
        <span className={styles.sname}>{name}</span>
      )}
    </span>
  );
}

export default function MatchdayCard({ payload, data }) {
  const tt = useT();
  const said = payload || {};
  const feed = data || {};

  const riv = rivalryOf(feed);
  const all = riv?.fixtures || [];
  const days = daysOf(riv);
  const asked = String(said.day || '').trim();
  // What the operator actually typed, read BEFORE the day is chosen: a results
  // card wants a day that has finished, a match ups card wants the day the room
  // is on. `null` means they left it blank and the card works it out.
  const wants = optIn(said.results, null);
  const day = pickDay(days, riv, asked, wants);
  const dated = days.length > 0;

  const onDay = day?.fixtures || [];

  // Blank means work it out, which the contract sets and the operator relies on:
  // the aggregates go up once the day's ties are decided, and not before.
  const pool = dated ? onDay : all;
  const results = optIn(said.results,
    pool.length > 0 && pool.every(isDone));

  const many = Math.min(Math.max(1, Number(said.rows) || MAX_ROWS), MAX_ROWS);

  let rows;
  if (dated) {
    rows = onDay.slice(0, many);
  } else {
    // No day anywhere on the feed. The card cannot say which day this is, so it
    // says nothing about the day and shows what the variant is actually for:
    // the ties still to play, or the ones already decided. Ordered by the
    // organiser's running order server side, so the last decided ties are the
    // most recent ones.
    const done = all.filter(isDone);
    rows = results ? done.slice(-many) : all.filter((f) => !isDone(f)).slice(0, many);
  }

  const heading = results
    ? tt('studio.rv.results', 'Results')
    : tt('studio.rv.matchUps', 'Today’s match ups');

  const marks = (
    <div className={styles.stack}>
      <img className={styles.cade} src="/images/rivalry/cade.png" alt="" />
      <img className={styles.rmk} src="/images/rivalry/rivalry-mark.png" alt="" />
    </div>
  );

  // Nothing to draw: no aggregate league, no fixtures on the day, or a day the
  // operator named that the feed cannot place. One designed plate rather than
  // three, because on air the reason is the desk's problem and the frame's job
  // is to look finished either way.
  if (!rows.length) {
    return (
      <div className={`${rv.rv} ${rv.frame} ${styles.matchday}`}>
        {marks}
        <div className={styles.title}>{heading}</div>
        <div className={styles.plate}>
          {tt('studio.rv.fixturesTBC', 'The fixtures are being confirmed.')}
        </div>
      </div>
    );
  }

  return (
    <div className={`${rv.rv} ${rv.frame} ${styles.matchday}`}>
      {marks}
      <div className={styles.title}>{heading}</div>
      {dated && day && (
        <div className={styles.daytag}>{dayLine(day, feed, tt)}</div>
      )}
      <div className={styles.fxlist}>
        {rows.map((fixture, i) => {
          const home = fixture.home || {};
          const away = fixture.away || {};
          const hg = count(home.aggregate);
          const ag = count(away.aggregate);
          // An aggregate nobody has played is not drawn as 0-0. A tie that is
          // still running carries a RUNNING total, which is not a result
          // either, so the row keeps saying VS until the tie is decided.
          const scored = results && isDone(fixture) && hg !== null && ag !== null;
          return (
            <div
              className={styles.fx}
              key={fixture.id ?? i}
              style={{ animationDelay: `${240 + i * 120}ms` }}
            >
              <Code side={home} />
              <Side
                marks={marksFor(fixture, home, false, feed)}
                name={home.name || ''}
                won={scored && hg > ag} />
              {scored ? (
                <span className={styles.sc}><i>{hg}</i><b>-</b><i>{ag}</i></span>
              ) : (
                <span className={styles.vs}>{tt('studio.rv.vs', 'VS')}</span>
              )}
              <Side
                marks={marksFor(fixture, away, true, feed)}
                name={away.name || ''}
                won={scored && ag > hg}
                away />
              <Code side={away} right />
            </div>
          );
        })}
      </div>
    </div>
  );
}
