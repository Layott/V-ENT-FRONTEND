'use client';

// A3. The nations table, drawn to the client's own broadcast pack.
//
// CEO, 4 September 2026: "the design you were doing did not match the original
// design." The original is `standings()` in
// `CLAUDE/VIDEOS/RIVALRY/stream_client.py`, rendered as
// `motion/stream/A3 standings.html` and approved before the event. That layout
// was not invented either: it was rebuilt to `DATA/STREAM/Standings.png`, a
// finished board Game Evo had already made, after exactly this mistake was
// made once in that project. This file is their graphic with the live feed
// behind it, so every number moves and nothing about the look is reinvented.
//
// Their row is five blocks in a line and each one is a different object: a
// skewed rank tab, a white tile carrying the side's mark, the dark block with
// the code and the players, the gold figures, and a points tab skewed the same
// way as the rank. Reading it as five blocks rather than as a table row is what
// makes the notches fall in the right places.
//
// What the pack decided, and why it is copied rather than judged:
//
//   the ground     none. `standings()` names one, but the approved file that
//                  shipped carries no `<img class="bg">` and no `opaque` on
//                  its frame, so the ground did not survive into it. An
//                  overlay is transparent where the game shows through, and a
//                  full bleed paper here would cover the whole video feed
//   the header     CADE above the series mark, stacked in the top left corner.
//                  This card does not use the two opposite corners the
//                  individual table carries
//   the headline   Astronum in a three stop green ramp, flat, no bloom
//   the figures    Barlow Condensed. Rule 2 on the account: every number a
//                  viewer reads is Barlow Condensed, because their display
//                  face has no usable digits
//   the names      Monument Extended, which is what their overlay PSD sets
//                  player names in
//
// The individual table is a different object and is not this file. A player can
// win their own match while their nation loses the fixture, which is the whole
// reason the format keeps two tables, and the two are read side by side on air.

import { useT } from '@/i18n/LanguageProvider';
import { rivalryOf, count, tagOf, Face } from './lib';
import rv from './rivalry.module.css';
import s from './nations-table.module.css';

// The pack's table starts at 398px and its row is 92 high with 12 between, so
// six is what their own geometry leaves above the bottom of the frame, and five
// once the sponsor strip is under it. A row drawn past that is half off the
// bottom of a browser source, which on air is worse than a row that is not
// there. Their board was drawn for five.
const fitsAbove = (sponsored) => (sponsored ? 5 : 6);

/** A number the feed sent, drawn as it stands, or nothing at all.
 *
 * Never `?? 0`. A figure nobody has worked out yet and a figure of zero look
 * identical once a fallback has been applied, and one of them is a claim this
 * page cannot support.
 */
const fig = (value) => {
  const n = count(value);
  return n === null ? '' : String(n);
};

/** A goal difference, signed, the way their board writes it: +9, 0, -11. */
const gd = (value) => {
  const n = count(value);
  if (n === null) return '';
  return n > 0 ? `+${n}` : String(n);
};

/** The players a side put on the board, for the names block of their row.
 *
 * The league table carries the record and the entrant list carries the squad,
 * so neither is complete on its own. Matched on the tag first because that is
 * what is short, stable and unique inside one tournament, and on the name
 * second. Nobody is invented: a side whose squad the feed has not sent draws
 * its own name instead, and a side with neither draws nothing.
 */
function squadOf(row, data) {
  const wantTag = String(row.tag || '').trim().toLowerCase();
  const wantName = String(row.name || '').trim().toLowerCase();
  const team = (data?.teams || []).find((t) => {
    if (wantTag && String(t.tag || '').toLowerCase() === wantTag) return true;
    return Boolean(wantName) && String(t.name || '').toLowerCase() === wantName;
  });
  return (team?.players || [])
    .map((p) => p.ign)
    .filter(Boolean)
    .slice(0, 2);
}

/** One league row as the pack's five blocks. */
function fromLeague(row, i, data) {
  const squad = squadOf(row, data);
  return {
    key: `${row.name}-${row.place ?? i}`,
    place: row.place ?? i + 1,
    logo: row.logo,
    code: tagOf(row),
    // The code is the subject of that slot, so the full name only earns the
    // line under it when the code is something else.
    lines: squad.length ? squad : (row.tag ? [row.name] : []),
    figs: [fig(row.won), fig(row.drawn), fig(row.lost), gd(row.goal_difference)],
    points: fig(row.points),
  };
}

/** One entrant as the same five blocks, for a tournament that is not a league.
 *
 * An entrant has no points and no draws recorded against it, so the columns are
 * the ones the studio's own standings drew before this graphic existed: played,
 * won, lost and the difference. The points tab is left off rather than drawn
 * empty, because an empty green tab on air reads as a graphic that failed.
 */
function fromEntrant(team, i) {
  const pf = count(team.points_for);
  const pa = count(team.points_against);
  return {
    key: team.tag || team.name || String(i),
    place: team.place ?? i + 1,
    logo: team.logo,
    code: tagOf(team),
    lines: team.tag ? [team.name] : [],
    figs: [
      fig(team.played), fig(team.won), fig(team.lost),
      pf === null || pa === null ? '' : gd(pf - pa),
    ],
    points: null,
  };
}

/** The card everything on this graphic sits inside.
 *
 * Transparent. The approved file carries no ground and no opaque frame, and an
 * overlay is transparent where the game shows through: a full bleed paper here
 * would cover the whole video feed.
 *
 * The stacked marks and the sponsor strip are the furniture their board
 * carries, so the table and the plate it falls back to are the same object with
 * different middles.
 */
function Card({ sponsors, kicker, children }) {
  return (
    <div className={`${rv.rv} ${rv.frame} ${s.a3}`}>
      <img className={s.cade} src="/images/rivalry/cade.png" alt="" />
      <img className={s.rmk} src="/images/rivalry/rivalry-mark.png" alt="" />
      {children}
      {sponsors.length > 0 && (
        <div className={s.spon}>
          <div className={s.sponK}>{kicker}</div>
          <div className={s.sponsors}>
            {sponsors.map((sp) => (
              <Face key={sp.name || sp.logo} className={s.sp} src={sp.logo} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function NationsTable({ payload = {}, data, element }) {
  const tt = useT();
  const riv = rivalryOf(data);

  // The people who paid for the banners, drawn as marks the way their strip
  // does. A sponsor the organiser added without a logo is not drawn: their bar
  // is a wall of marks and a name set in type beside them reads as a mark that
  // failed to load.
  const sponsors = (data?.sponsors || []).filter((sp) => sp.logo);
  const fits = fitsAbove(sponsors.length > 0);

  // The contract calls it `rows`; the console has always called it `limit`.
  // Both, because an operator retyping a working field under time pressure is a
  // bug report waiting to happen. Held to what the pack's geometry holds.
  const asked = Number(payload.rows) || Number(payload.limit) || fits;
  const many = Math.min(asked, fits);

  // A tournament that is not an aggregate league has no nations table and keeps
  // the entrant standings this drew before, unchanged.
  const league = riv?.table_nations || [];
  const entrants = league.length ? [] : (data?.teams || []);
  const hasPoints = league.length > 0;

  const rows = league.length
    ? league.slice(0, many).map((r, i) => fromLeague(r, i, data))
    : entrants.slice(0, many).map(fromEntrant);

  // Their headline is the word STANDINGS, not the name of the competition: the
  // audience already knows which broadcast they are watching, and a tournament
  // title set at 152px runs the width of the frame and straight through the
  // series mark. The operator's own heading still wins when they type one.
  const heading = payload.title || tt('studio.rv.standings', 'Standings');

  // Twenty characters is what the pack's 152px holds inside the 1260 its own
  // sponsor padding leaves. A longer heading steps down rather than running
  // under the mark in the corner.
  const titleClass = `${s.title} ${heading.length > 20 ? s.titleLong : ''}`;

  // The mark column is theirs and it is a white tile. Drawn only where there is
  // a badge to put on it, and dropped altogether when no side has one: a column
  // of empty white boxes reads as a graphic whose images failed.
  const anyLogo = rows.some((r) => r.logo);

  const kicker = tt('ui.sponsors.82ce', 'Sponsors');

  const cols = hasPoints
    ? [tt('studio.rv.colW', 'W'), tt('studio.rv.colD', 'D'),
      tt('studio.rv.colL', 'L'), tt('studio.rv.colGD', 'GD')]
    : [tt('studio.rv.colP', 'P'), tt('studio.rv.colW', 'W'),
      tt('studio.rv.colL', 'L'), tt('studio.rv.colDiff', '+/-')];

  // A table cued before the numbers exist, which happens more often than
  // anybody plans for. One designed plate on the pack's own row colour, never a
  // spinner and never the word loading: anything this page draws is on air.
  //
  // The big headline comes off in this state deliberately. The plate's eyebrow
  // already carries the heading, and the same words twice on one frame reads as
  // a fault rather than as a graphic waiting.
  if (!rows.length) {
    return (
      <Card sponsors={sponsors} kicker={kicker}>
        <div className={s.plate}>
          <div className={s.plateBox}>
            <div className={s.plateK}>{heading}</div>
            <div className={s.plateLine}>
              {tt('studio.rv.tableTBC', 'The table is being confirmed.')}
            </div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card sponsors={sponsors} kicker={kicker}>
      <div className={titleClass}>{heading}</div>

      <div className={s.head}>
        {/* The rank column carries a "#" on their board. Left empty here rather
            than filled with a glyph that has no key in the dictionaries and
            reads differently in French. */}
        <span className={s.rank} />
        {anyLogo && (
          <span className={s.tile}>{tt('studio.rv.colTeam', 'Team')}</span>
        )}
        <span className={s.body}>
          <b className={s.cc} />
          <span className={s.names}>{tt('studio.rv.colPlayer', 'Player')}</span>
        </span>
        <span className={s.figs}>
          {cols.map((c) => <span key={c}>{c}</span>)}
        </span>
        {hasPoints && (
          <span className={s.pts}>
            <span>{tt('studio.rv.colPts', 'PTS')}</span>
          </span>
        )}
      </div>

      <div className={s.table}>
        {rows.map((r, i) => (
          <div key={r.key}
               className={s.row}
               // The pack's stagger: the first row lands at 260ms and each one
               // after it 110ms later, so the table builds top down instead of
               // arriving as a block.
               style={{ animationDelay: `${260 + i * 110}ms` }}>
            <span className={s.rank}><span>{r.place}</span></span>
            {/* The side is its mark, not its name. A side with no badge in a
                table where others have one keeps the cell and fills it with the
                row's own colour, so the bar stays continuous instead of showing
                a white gap where a picture should be. */}
            {anyLogo && (
              <span className={`${s.tile} ${r.logo ? '' : s.tileBare}`}>
                {r.logo && (
                  <span className={s.mark}>
                    <Face className={s.markImg} src={r.logo} />
                  </span>
                )}
              </span>
            )}
            <span className={s.body}>
              <b className={`${s.cc} ${r.code.length > 3 ? s.ccLong : ''}`}>
                {r.code}
              </b>
              <span className={s.names}>
                {r.lines.map((n) => <span key={n}>{n}</span>)}
              </span>
            </span>
            <span className={s.figs}>
              {r.figs.map((v, j) => <span key={cols[j]}>{v}</span>)}
            </span>
            {hasPoints && (
              <span className={s.pts}><span>{r.points}</span></span>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}

// `element` is part of the shared element signature the studio page calls every
// graphic with. This one needs nothing from it: the table is the same table
// whichever session cued it.
