'use client';

// B4, head to head, drawn to the client's own finished artwork.
//
// `DATA/STREAM/Head_2_head.png` is a design Game Evo had already made and
// signed off. The pack built a new layout for this graphic first, the client
// pointed at the file they already had, and it was rebuilt to theirs: lesson
// R29 in that project, and the same fault the CEO reported here on 4 September,
// "the design you were doing did not match the original design."
//
// So nothing below is invented. Every number is read off the pack's own rebuild
// of that artwork, `RIVALRY/stream_client.py::head2head()`: two portraits
// bleeding off the outside edges, the two marks stacked at the top, the title
// on 282, stat rows 812 wide from 452 with the value on each side and the label
// between them, and a name plate in each bottom corner. The colours are the
// ones measured off their PNG in that file's `CLIENT_CSS`.
//
// **Nothing paints behind it.** The shipped `B4 head 2 head.html` carries no
// ground and no `opaque` class: the two cut-outs stand on transparency and the
// operator lays whatever they want under the browser source. A full bleed paper
// here would cover the entire video feed, which is the opposite of what an
// overlay is for.
//
// One thing is ours rather than theirs, because the platform cannot know what
// their file knew: their portraits are a set of ten cut-outs measured to one eye
// line and drawn at 1200x1800, while a studio picture here is whatever the
// organiser uploaded. So the slot carries it bottom first and NEVER draws it
// above its own resolution. `width:auto` under a ceiling is that rule in CSS,
// and it is the same rule `portrait()` enforces in the pack by refusing
// outright. Most tournaments have no player pictures at all, so nothing is
// drawn and the card reads on the rows and the plates alone.
//
// A record the league does not keep is drawn as NOTHING. Their mock reads 0
// down both columns because it was a mock with no tournament behind it; four
// zeroes on air is a claim about a player that this page cannot support.

import { useT } from '@/i18n/LanguageProvider';
import { Face, findPlayer, nationCode, pickFixture, pickLeg, rivalryOf } from './lib';
import rv from './rivalry.module.css';
import css from './head-to-head-card.module.css';

// Their four rows, in their order and in their words. WIN % is worked out here
// rather than sent, because the feed keeps a record and not a percentage.
const ROWS = [
  { field: 'won', key: 'studio.rv.statWins', fallback: 'Wins' },
  { field: 'drawn', key: 'studio.rv.statDraws', fallback: 'Draws' },
  { field: 'lost', key: 'studio.rv.statLosses', fallback: 'Losses' },
  { field: 'winPct', key: 'studio.rv.statWinPct', fallback: 'Win %' },
];

/** A nation as their board writes it: NG, GH, KN, SN, CIV.
 *
 * The feed sends whatever the tournament was set up with, which on the demo is
 * the country spelled out, and SENEGAL beside a name is not the design. Only
 * the five the series is played between are mapped, because a code is a claim
 * and the pack is the only thing entitled to make it. KN and SN rather than the
 * ISO KE and SE, and CIV rather than CI: these are `stream_more.py::CODE`, not
 * the standard. Anything unmapped is cut to three letters, which shortens what
 * the feed said instead of asserting something it did not.
 *
 * The same map is in `IndividualTable.js` for the same reason. It belongs in
 * `lib.js` once one of us is allowed to put it there.
 */
/** Does the league keep a record for this player.
 *
 * The gate the first pass used, kept as it was. A guest with no record drawn
 * with four zeroes reads as a record of four defeats.
 */
const hasRecord = (p) => Number.isFinite(Number(p?.played));

/** One figure off a player's record, or nothing when there is no record.
 *
 * The percentage is wins over played, rounded, and drawn as a bare number
 * because the label already carries the sign. Nobody who has played nothing has
 * a win percentage, so that draws nothing rather than 0, which would read as a
 * player who has never won.
 */
const figure = (p, field) => {
  if (!hasRecord(p)) return '';
  if (field !== 'winPct') return String(p[field] ?? 0);
  const played = Number(p.played);
  const won = Number(p.won);
  if (!played || !Number.isFinite(won)) return '';
  return String(Math.round((won / played) * 100));
};

/** The side a player sat for, as the feed describes it.
 *
 * `findPlayer` answers with the nation's NAME, which is all a table row knows.
 * The tag and the badge live on the side, so they are read back off the teams
 * the feed sent, and off the fixture when the operator has typed somebody the
 * tournament does not list.
 */
function sideOf(player, fallback, data) {
  const wanted = String(player?.nation || '').trim().toLowerCase();
  const found = wanted && (data?.teams || []).find(
    (t) => String(t.name || '').toLowerCase() === wanted);
  return found || fallback || null;
}

/** The mark on a player's name plate.
 *
 * Layo, 4 September, pointing at the white tab on their artwork: this part is
 * for the team logo. Here that is the club the player represents, which is the
 * same thing their org marks were, and the nation's badge when they represent
 * no club. `findPlayer` does not carry either, so the player rows are read for
 * this one field rather than rebuilt into a second description of a person.
 */
function badgeOf(name, side, data) {
  const wanted = String(name || '').trim().toLowerCase();
  for (const team of data?.teams || []) {
    const hit = (team.players || []).find(
      (p) => String(p.ign || '').toLowerCase() === wanted);
    if (hit) return hit.represents_logo || team.logo || null;
  }
  return side?.logo || null;
}

/** The two marks, stacked and centred, the way their full screen cards carry
 *  them: the CADE lockup above the series mark. */
function Marks() {
  return (
    <div className={css.marks}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className={css.cade} src="/images/rivalry/cade.png" alt="" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className={css.mark} src="/images/rivalry/rivalry-mark.png" alt="" />
    </div>
  );
}

export default function HeadToHeadCard({ payload, data }) {
  const tt = useT();
  const riv = rivalryOf(data);
  const fixture = riv ? pickFixture(riv, payload) : null;
  const leg = fixture ? pickLeg(fixture, riv, payload) : null;

  const left = findPlayer(payload.left || leg?.home_player, data);
  const right = findPlayer(payload.right || leg?.away_player, data);

  // Their headline, which is HEAD 2 HEAD rather than the words spelled out.
  // Its own key: the graphic is titled this whatever the player table's column
  // heading says, and the "2" is part of the series' own title treatment.
  const heading = tt('studio.rv.head2head', 'Head 2 head');

  // Nobody named and nobody live. Their own furniture with one sentence in the
  // row the figures would have taken, so an operator can see the source is
  // alive. Never a spinner, never the word loading.
  if (!left || !right) {
    return (
      <div className={`${rv.rv} ${rv.frame} ${css.h2h}`}>
        <Marks />
        <div className={css.title}>{heading}</div>
        <div className={css.tbc}>
          <span className={css.tbcFill}>
            {tt('studio.rv.playersTBC', 'The players are being confirmed.')}
          </span>
        </div>
      </div>
    );
  }

  const sideL = sideOf(left, fixture?.home, data);
  const sideR = sideOf(right, fixture?.away, data);
  // One side with a record and one without still earns the rows: the side that
  // has one is drawn, the side that has not is left empty.
  const anyRecord = hasRecord(left) || hasRecord(right);

  const portrait = (p, which) => (
    <div className={`${css.fig} ${which === 'l' ? css.figL : css.figR}`}>
      <Face src={p.img} className={css.figImg} />
    </div>
  );

  // Their plate is the org tile hard against the name band, the name, and the
  // origin code. No seat: it is not on their artwork, and Layo took the seat
  // markers off the whole package on 4 September.
  //
  // The tile IS the picture rather than a box around one, so a logo that fails
  // to load takes the tile with it. A `Face` inside a filled span would leave a
  // white rectangle on air with nothing in it.
  const plate = (p, side, which) => {
    const badge = badgeOf(p.name, side, data);
    const code = nationCode(p.nation || side?.name);
    return (
      <div className={`${css.plate} ${which === 'l' ? css.plateL : css.plateR}`}>
        {badge && <Face src={badge} className={css.pw} />}
        <span className={css.pg}>
          <span className={css.pgName}>{p.name}</span>
          {code && <span className={css.pgNote}>{code}</span>}
        </span>
      </div>
    );
  };

  return (
    <div className={`${rv.rv} ${rv.frame} ${css.h2h}`}>
      {portrait(left, 'l')}
      {portrait(right, 'r')}
      <Marks />
      <div className={css.title}>{heading}</div>
      {anyRecord && (
        <div className={css.rows}>
          {ROWS.map((r) => (
            <div className={css.row} key={r.field}>
              <span className={`${css.val} ${css.valL}`}>
                <span className={css.valFill}>{figure(left, r.field)}</span>
              </span>
              <span className={css.key}>
                <span className={css.keyFill}>{tt(r.key, r.fallback)}</span>
              </span>
              <span className={`${css.val} ${css.valR}`}>
                <span className={css.valFill}>{figure(right, r.field)}</span>
              </span>
            </div>
          ))}
        </div>
      )}
      {plate(left, sideL, 'l')}
      {plate(right, sideR, 'r')}
    </div>
  );
}
