'use client';

// D2. The individual table, drawn to the client's own broadcast pack.
//
// CEO, 4 September 2026: "the design you were doing did not match the original
// design." The original is `individual_table()` in
// `CLAUDE/VIDEOS/RIVALRY/stream.py`, rendered as
// `motion/stream/D2 individual table.html` and approved before the event. This
// file is that graphic with the live feed behind it, so every number moves and
// nothing about the look is reinvented.
//
// What the pack decided, and why it is copied rather than judged:
//
//   no ground      The approved file has no background layer and its frame
//                  carries no `opaque` class: `render()` was called with a
//                  ground, and the pack's own `GROUND_IN_FILE` switch stripped
//                  it. Layo, 4 September: "Let all the overlays be made
//                  transparent they can load up on any bg we want to use." A
//                  first pass here painted their chevron paper full bleed,
//                  which on air would have covered the whole video feed and
//                  also swallowed the dark CADE wordmark.
//   the header     the series mark left, the CADE lockup right, at the tops
//                  `ink_top()` worked out in the pack so the coloured centre
//                  of mass of each lands on the same axis
//   the headline   Astronum in their vertical green gradient, flat, no bloom
//   the figures    Barlow Condensed. Rule 2 on the account: every number a
//                  viewer reads is Barlow Condensed, because their display
//                  face has no usable digits
//   the names      Monument Extended, which is what their overlay PSD sets
//                  player names in
//
// The nations table is a different object and is not this file. A player can
// win their own match while their nation loses the fixture, which is the whole
// reason the format keeps two tables.

import { useT } from '@/i18n/LanguageProvider';
import { rivalryOf, count, nationCode, Face } from './lib';
import rv from './rivalry.module.css';
import s from './individual-table.module.css';

/** A goal difference, signed, the way their board writes it: +6, 0, -7.
 *
 * A difference nobody has worked out yet is drawn as nothing, never as zero.
 * Zero is a real standing in this table (Kappa sits on it in the approved
 * render) and a placeholder that looks exactly like it is a claim this page
 * cannot support.
 */
const gd = (value) => {
  const n = count(value);
  if (n === null) return '';
  return n > 0 ? `+${n}` : String(n);
};

/** The card everything on this graphic sits inside.
 *
 * The series mark and the CADE lockup are the furniture both of their full
 * screen cards carry, so the table and the plate it falls back to are the same
 * object with different middles. Nothing paints behind them: the operator lays
 * whatever ground they want under the browser source.
 */
function Card({ children }) {
  return (
    <div className={`${rv.rv} ${rv.frame} ${s.d2}`}>
      <img className={`${rv.rmark} ${s.rmark}`}
           src="/images/rivalry/rivalry-mark.png" alt="" />
      <img className={`${rv.cade} ${s.cade}`}
           src="/images/rivalry/cade.png" alt="" />
      {children}
    </div>
  );
}

export default function IndividualTable({ payload = {}, data, element }) {
  const tt = useT();
  const riv = rivalryOf(data);

  // The contract calls it `rows`; the console has always called it `limit`.
  // Both, because an operator retyping a working field under time pressure is
  // a bug report waiting to happen. Ten is what the pack was drawn against and
  // what their own note asks for.
  const many = Number(payload.rows) || Number(payload.limit) || 10;
  const rows = (riv?.table_players || []).slice(0, many);

  // The operator's own heading when they typed one, and the pack's own title
  // otherwise. Their board says INDIVIDUAL TABLE, which is a different object
  // from the nations standings and says so on the frame.
  const heading = payload.title
    || tt('studio.rv.individualTable', 'Individual table');

  // The org badge column exists only when a row actually carries a badge. An
  // empty white tile is worse than no column.
  //
  // Every row of their approved board has one, and no row of ours can: the
  // rows built by `table_players` in `vent_tournament/views_overlay_feed.py`
  // carry no `logo`, so the org a player represents is not in the feed at all.
  // That is a gap on the feed rather than something to guess at here, and a
  // badge built from a name would be a face nobody can prove.
  const marks = rows.some((r) => r.logo);

  // A tournament that keeps no player record, or one whose table has not been
  // worked out yet. One designed plate on the pack's own panel, never a
  // spinner and never the word loading: anything this page draws is on air.
  //
  // The big headline comes off in this state deliberately. The plate's eyebrow
  // already carries the heading, and the same words twice on one frame reads
  // as a fault rather than as a graphic waiting.
  if (!rows.length) {
    return (
      <Card>
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
    <Card>
      <div className={`${rv.headline} ${rv.riseIn} ${s.title}`}>{heading}</div>

      <div className={s.head}>
        {/* Their board labels the place column with a hash. It is a glyph
            rather than a word, the same in all three languages, so it carries
            no dictionary key. */}
        <div className={s.pos}>#</div>
        {marks && <div className={s.orgmark} />}
        <div className={s.who}>{tt('studio.rv.colPlayer', 'Player')}</div>
        <div className={s.figs}>
          <span>{tt('studio.rv.colW', 'W')}</span>
          <span>{tt('studio.rv.colD', 'D')}</span>
          <span>{tt('studio.rv.colL', 'L')}</span>
          <span>{tt('studio.rv.colGD', 'GD')}</span>
        </div>
        <div className={s.pts}>{tt('studio.rv.colPts', 'PTS')}</div>
      </div>

      <div className={s.table}>
        {rows.map((r, i) => (
          <div key={`${r.name}-${r.seat ?? i}`}
               className={`${s.row} ${rv.wipeIn}`}
               // The pack's stagger: the first row lands at 240ms and each one
               // after it 70ms later, so the table builds top down instead of
               // arriving as a block.
               style={{ animationDelay: `${240 + i * 70}ms` }}>
            <div className={s.pos}>{r.place ?? i + 1}</div>
            {/* The org is its mark, not its name. Layo, 4 September. The cell
                holds its width for a row with no badge in a table where other
                rows have one, so the names still line up. */}
            {marks && (
              <div className={s.orgmark}>
                {r.logo && (
                  <span className={s.tile}>
                    <Face className={s.mark} src={r.logo} />
                  </span>
                )}
              </div>
            )}
            <div className={s.who}>
              <span className={s.pname}>{r.name}</span>
              {r.nation && <span className={s.pc}>{nationCode(r.nation)}</span>}
            </div>
            <div className={s.figs}>
              <span>{r.won}</span>
              <span>{r.drawn}</span>
              <span>{r.lost}</span>
              <span>{gd(r.goal_difference)}</span>
            </div>
            <div className={s.pts}>{r.points}</div>
          </div>
        ))}
      </div>
    </Card>
  );
}

// `element` is part of the shared element signature the studio page calls
// every graphic with. This one needs nothing from it: the table is the same
// table whichever session cued it.
