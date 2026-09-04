'use client';

// A production studio element, as a browser source.
//
// CEO, 1 September 2026: "each element can be copied and pasted into your
// streaming software as browser sources and it updates in realtime."
//
// ## The address
//
// Two shapes, both for ever:
//
//     /studio/<slug>/<graphic>/<token>    what the console gives out now
//     /studio/<token>/<graphic>           what it gave out before
//
// CEO, 3 September 2026: "can the urls for the overlays posses thenames of
// the overlays, depending on the project or event or tournament the studio is
// working with, so slugs for the urls also." An operator pastes eight of these
// into OBS and then reads them back in a list of browser sources, where
// `/studio/e8fE8euWe.../now_next` says nothing about which broadcast it is.
// The token stays in the address because the token is the credential; the slug
// is a label, and a wrong slug with a right token still resolves.
//
// One catch-all route rather than two, because Next cannot have `[token]` and
// `[slug]` as the same path segment, and because there is only one page here.
//
// ## The three rules this page is built around
//
// **It holds no state.** Everything on screen comes from the feed, every time.
// OBS can be restarted mid-show, the machine can be swapped, a second operator
// can open the same URL on another laptop, and the graphic comes back exactly
// as it was.
//
// **It is transparent.** The streaming software composites this onto video, so
// the page paints nothing of its own. Every surface belongs to an element.
//
// **It never shows a spinner, an error or a placeholder.** Anything this page
// draws is going out on air. A connection that drops keeps the last good frame
// and retries quietly.

import { useCallback, useEffect, useRef, useState } from 'react';
import { useT } from '@/i18n/LanguageProvider';
import styles from './studio.module.css';
import {
  place, clock, rivalryOf, tagOf, count, optIn,
  pickFixture, pickLeg, findPlayer, readFeed,
  secondsUntil, countdown, Face,
} from '@/components/studio/elements/lib';
// The CADE Rivalry Series pack, ported graphic by graphic from the finished
// broadcast set in CLAUDE/VIDEOS/RIVALRY/motion/stream/. A broadcast picks its
// look; these draw when it has picked this one. Same props, same feed, same
// empty states as the house versions: only the drawing differs.
import AnalystDesk from '@/components/studio/elements/AnalystDesk';
import DeskLowerThird from '@/components/studio/elements/DeskLowerThird';
import HeadToHeadCard from '@/components/studio/elements/HeadToHeadCard';
import IndividualTable from '@/components/studio/elements/IndividualTable';
import MatchdayCard from '@/components/studio/elements/MatchdayCard';
import NationsTable from '@/components/studio/elements/NationsTable';
import NowNextBar from '@/components/studio/elements/NowNextBar';
import PlayAreaFrame from '@/components/studio/elements/PlayAreaFrame';
import TextLayers from '@/components/studio/TextLayers';

// Fast enough that a score correction looks immediate to a viewer, slow enough
// that six hours on a venue hotspot is not a problem. The feed answers every
// element in one request, so this is the only timer in the whole studio.
const POLL_MS = 1200;
// A preview in the console is not on air. It may be slower, and eight of them
// must not cost more than one on-air source.
const PREVIEW_MS = 4000;

const API = process.env.NEXT_PUBLIC_API_URL;


// ---------------------------------------------------------------- elements
//
// Each takes `{payload, data}`: what the operator typed, and what the bracket
// or the programme says. The operator names the fixture; the numbers come from
// the tournament or the event, never from the operator, so a scorebar cannot
// disagree with the standings and a doors count cannot disagree with the door.

/** What an element draws when the thing it is about does not exist yet.
 *
 * A graphic goes on air before its data does more often than anybody plans
 * for: a fixture card cued while the bracket is still being filled in, a
 * result card taken up a second before the score is recorded. A blank frame
 * reads to the operator as a dead browser source, and they spend the next
 * minute reloading OBS instead of watching the match.
 *
 * So: one designed plate, a heading and one sentence an audience can read.
 * Never a spinner, never an error, never the word "loading".
 */
function EmptyPlate({ eyebrow, line }) {
  return (
    <div className={styles.empty}>
      <div className={styles.emptyK}>{eyebrow}</div>
      <div className={styles.emptyLine}>{line}</div>
    </div>
  );
}

function Scorebar({ payload, data }) {
  const tt = useT();
  const teams = data.teams || [];
  const find = (tag) => teams.find(
    (t) => t.tag === tag || t.name === tag) || null;

  // A name the operator typed that matches nothing is used AS the label, and
  // never replaced by a different team.
  //
  // Found on production, 3 September 2026: with `home: 'Nigeria'` and
  // `away: 'Ghana'` on a tournament with no Ghana in it, the away side fell
  // back to `teams[1]`, which was Nigeria, and the scorebar read
  // "Nigeria 2 - 1 Nigeria" on air with nothing to say it had substituted
  // anybody. A positional fallback is right when the operator has said
  // nothing; it is very wrong when they have said something, because a typo
  // then becomes a different team's name in front of an audience. An
  // exhibition against a side that is not registered is also perfectly
  // ordinary, and typing the name should just work.
  const side = (typed, fallback) => {
    const name = String(typed || '').trim();
    if (!name) return fallback;
    return find(name) || { name, logo: null };
  };

  // Which fixture the bar is about, when the tournament has fixtures at all.
  // Needed before the sides are worked out, because on an aggregate format the
  // right answer to "the operator typed nothing" is the two nations playing
  // RIGHT NOW, not the first two entrants in the list. Seen on the demo
  // broadcast, 4 September 2026: the bar read Senegal against Ghana while the
  // live fixture was Nigeria against Kenya, because the payload was left over
  // from an earlier test and the fallback had nothing to do with the match.
  const riv = rivalryOf(data);
  const fixture = riv ? pickFixture(riv, payload) : null;
  const leg = fixture ? pickLeg(fixture, riv, payload) : null;

  const home = side(payload.home, fixture?.home || teams[0] || null);
  let away = side(payload.away, fixture?.away || teams[1] || null);
  // And the two sides are never the same entrant, which is not a scoreline.
  if (home && away && home === away) {
    away = teams.find((t) => t !== home) || null;
  }
  if (!home || !away) return null;

  // The live match score is the operator's, because it moves faster than the
  // bracket, which only learns a leg when it is recorded.
  const hs = payload.home_score;
  const as = payload.away_score;

  // The fixture aggregate, which is the whole point of this bar at a Rivalry
  // event. A viewer joining at the second match sees Ghana winning 2-0 and has
  // no way to know Ghana are losing the tie 3-4 on total goals. That is the
  // single most important thing on screen and it is not in the match score.
  //
  // It comes from the feed rather than being added up here, so the bar cannot
  // disagree with the table the players are reading. And it is labelled with
  // the FIXTURE'S OWN tags rather than with the sides the operator typed: if
  // those two ever disagree, an unlabelled pair of numbers would be attributed
  // to the wrong country by every viewer, silently.
  const seat = Number(payload.seat) || Number(leg?.seat) || 0;

  // A missing aggregate and an aggregate of nothing are different answers, and
  // `Number(null)` is 0, so a fixture the server has not worked out yet would
  // otherwise go on air reading 0 - 0 as though it knew.
  const homeAgg = count(fixture?.home?.aggregate);
  const awayAgg = count(fixture?.away?.aggregate);
  const showAgg = optIn(payload.show_aggregate, true)
    && homeAgg !== null && awayAgg !== null;

  const seatLabel = seat
    ? tt('studio.rv.seat', 'Seat {n}').replace('{n}', String(seat))
    : '';

  return (
    <div className={styles.scorebar}>
      <div className={styles.sbSide}>
        {home.logo && <img className={styles.sbLogo} src={home.logo} alt="" />}
        <span className={styles.sbPlate}>
          <span className={styles.sbName}>{home.name}</span>
          {seatLabel && <span className={styles.sbSeat}>{seatLabel}</span>}
        </span>
      </div>
      <div className={styles.sbScore}>
        <span className={styles.sbNum}>{hs ?? 0}</span>
        <span className={styles.sbDash} />
        <span className={styles.sbNum}>{as ?? 0}</span>
      </div>
      <div className={`${styles.sbSide} ${styles.sbAway}`}>
        <span className={`${styles.sbPlate} ${styles.sbPlateAway}`}>
          <span className={styles.sbName}>{away.name}</span>
          {seatLabel && <span className={styles.sbSeat}>{seatLabel}</span>}
        </span>
        {away.logo && <img className={styles.sbLogo} src={away.logo} alt="" />}
      </div>
      {(showAgg || payload.caption) && (
        <div className={styles.sbBelow}>
          {showAgg && (
            <div className={styles.sbAgg}>
              <span className={styles.sbAggK}>
                {tt('studio.rv.aggregate', 'Aggregate')}
              </span>
              <span className={styles.sbAggSide}>{tagOf(fixture.home)}</span>
              <span className={`${styles.sbAggNum} ${homeAgg > awayAgg ? styles.sbAggLead : ''}`}>
                {homeAgg}
              </span>
              <span className={styles.sbDash} />
              <span className={`${styles.sbAggNum} ${awayAgg > homeAgg ? styles.sbAggLead : ''}`}>
                {awayAgg}
              </span>
              <span className={styles.sbAggSide}>{tagOf(fixture.away)}</span>
            </div>
          )}
          {payload.caption && (
            <div className={styles.sbCaption}>{payload.caption}</div>
          )}
        </div>
      )}
    </div>
  );
}

/** A goal difference, signed, so a table reads at a glance. */
const signed = (n) => `${Number(n) > 0 ? '+' : ''}${Number(n) || 0}`;

/**
 * The table. One graphic, two tables, and they are not the same shape.
 *
 * `payload.table` is 'nations' or 'players'. The aggregate format keeps both
 * live at once, because a player can win their own match while their nation
 * loses the fixture, and one leaderboard cannot carry both without lying about
 * one of them. Default 'nations', so a graphic already cued on air is exactly
 * what it was before this existed.
 *
 * A tournament that is not an aggregate league has neither table and keeps the
 * entrant standings this drew before, unchanged.
 */
function Standings({ payload, data }) {
  const tt = useT();
  const riv = rivalryOf(data);
  // The contract calls it `rows`; the console has always called it `limit`.
  // Both, because an operator retyping a working field under time pressure is
  // a bug report waiting to happen.
  const many = Number(payload.rows) || Number(payload.limit) || 10;
  const players = payload.table === 'players';

  const league = (players ? riv?.table_players : riv?.table_nations) || [];
  const rows = league.slice(0, many);

  const heading = payload.title
    || (players
      ? tt('studio.rv.playerTable', 'Player standings')
      : data.tournament?.title || tt('studio.rv.standings', 'Standings'));

  if (rows.length) {
    return (
      <div className={`${styles.standings} ${styles.stWide}`}>
        <div className={styles.stTitle}>{heading}</div>
        <div className={styles.stHead}>
          <span className={styles.stPos} />
          <span className={styles.stTeam}>
            {players ? tt('studio.rv.colPlayer', 'Player') : tt('studio.rv.colTeam', 'Team')}
          </span>
          <span className={styles.stNum}>{tt('studio.rv.colP', 'P')}</span>
          <span className={styles.stNum}>{tt('studio.rv.colW', 'W')}</span>
          <span className={styles.stNum}>{tt('studio.rv.colD', 'D')}</span>
          <span className={styles.stNum}>{tt('studio.rv.colL', 'L')}</span>
          <span className={styles.stNum}>{tt('studio.rv.colGF', 'GF')}</span>
          <span className={styles.stNum}>{tt('studio.rv.colGA', 'GA')}</span>
          <span className={styles.stNum}>{tt('studio.rv.colGD', 'GD')}</span>
          <span className={styles.stNum}>{tt('studio.rv.colPts', 'PTS')}</span>
        </div>
        {rows.map((r, i) => (
          <div key={`${r.name}-${r.seat ?? i}`} className={styles.stRow}>
            <span className={styles.stPos}>{r.place ?? i + 1}</span>
            <span className={styles.stTeam}>
              {r.logo && <img className={styles.stLogo} src={r.logo} alt="" />}
              <span className={styles.stWho}>
                <span className={styles.stWhoName}>{r.name}</span>
                {players && (r.nation || r.seat) && (
                  <span className={styles.stWhoSub}>
                    {[r.nation, r.seat
                      ? tt('studio.rv.seat', 'Seat {n}').replace('{n}', String(r.seat))
                      : ''].filter(Boolean).join(' · ')}
                  </span>
                )}
              </span>
            </span>
            <span className={styles.stNum}>{r.played}</span>
            <span className={styles.stNum}>{r.won}</span>
            <span className={styles.stNum}>{r.drawn}</span>
            <span className={styles.stNum}>{r.lost}</span>
            <span className={styles.stNum}>{r.goals_for}</span>
            <span className={styles.stNum}>{r.goals_against}</span>
            <span className={styles.stNum}>{signed(r.goal_difference)}</span>
            <span className={`${styles.stNum} ${styles.stPts}`}>{r.points}</span>
          </div>
        ))}
      </div>
    );
  }

  // A players table asked for on a tournament that keeps no player record is
  // not the nations table with a different heading. Say so instead.
  const teams = players ? [] : (data.teams || []).slice(0, many);
  if (!teams.length) {
    return (
      <EmptyPlate
        eyebrow={heading}
        line={tt('studio.rv.tableTBC', 'The table is being confirmed.')} />
    );
  }

  return (
    <div className={styles.standings}>
      <div className={styles.stTitle}>{heading}</div>
      <div className={styles.stHead}>
        <span className={styles.stPos} />
        <span className={styles.stTeam}>{tt('studio.rv.colTeam', 'Team')}</span>
        <span className={styles.stNum}>{tt('studio.rv.colP', 'P')}</span>
        <span className={styles.stNum}>{tt('studio.rv.colW', 'W')}</span>
        <span className={styles.stNum}>{tt('studio.rv.colL', 'L')}</span>
        <span className={styles.stNum}>{tt('studio.rv.colDiff', '+/-')}</span>
      </div>
      {teams.map((t) => (
        <div key={t.tag || t.name} className={styles.stRow}>
          <span className={styles.stPos}>{t.place}</span>
          <span className={styles.stTeam}>
            {t.logo && <img className={styles.stLogo} src={t.logo} alt="" />}
            {t.name}
          </span>
          <span className={styles.stNum}>{t.played}</span>
          <span className={styles.stNum}>{t.won}</span>
          <span className={styles.stNum}>{t.lost}</span>
          <span className={styles.stNum}>
            {signed(t.points_for - t.points_against)}
          </span>
        </div>
      ))}
    </div>
  );
}

function LowerThird({ payload }) {
  if (!payload.title) return null;
  return (
    <div className={styles.lower}>
      <div className={styles.lowerTitle}>{payload.title}</div>
      {payload.subtitle && (
        <div className={styles.lowerSub}>{payload.subtitle}</div>
      )}
    </div>
  );
}

function PlayerCard({ payload, data }) {
  // The feed sends `ign`, `id` and `img` for a player. This once read
  // `username`, `name` and `avatar`, none of which exist on that row, so the
  // match never found anybody and the card never drew.
  const teams = data.teams || [];
  const wanted = String(payload.player || '').trim().toLowerCase();
  let player = null;
  let team = null;
  for (const t of teams) {
    const hit = (t.players || []).find(
      (p) => String(p.ign || '').toLowerCase() === wanted
        || String(p.id || '') === wanted);
    if (hit) { player = hit; team = t; break; }
  }
  if (!player) return null;

  return (
    <div className={styles.card}>
      {player.img && (
        <img className={styles.cardFace} src={player.img} alt="" />
      )}
      <div className={styles.cardBody}>
        <div className={styles.cardName}>{player.ign}</div>
        {/* Who they are here, and who they actually play for when the side is
            a squad assembled for this tournament: "Nigeria, Lagos Lions". */}
        {team && (
          <div className={styles.cardTeam}>
            {team.name}
            {player.represents && player.represents !== team.name
              ? `, ${player.represents}` : ''}
          </div>
        )}
        {/* THEIR record, not their side's.

            CEO's rule for the Rivalry Series: a player can win their own match
            while their country loses the fixture, and both must be recorded.
            This card used to draw the side's record under the player's name,
            so on production it read "Layott 0W 1L" on the day Layott won 2-0
            and Nigeria lost the tie 2-3. That is precisely the thing the two
            tables exist to keep apart.

            A tournament that is not a league gives a player no record of their
            own, and then the side's is the only one there is. */}
        {player.record?.played > 0 ? (
          <div className={styles.cardStat}>
            {player.record.won}W {player.record.lost}L
            {' '}&middot;{' '}
            {player.record.goals_for}-{player.record.goals_against}
          </div>
        ) : team && (
          <div className={styles.cardStat}>
            {place(team.place)} &middot; {team.won}W {team.lost}L
          </div>
        )}
      </div>
    </div>
  );
}

function Ticker({ payload, data }) {
  const fromTable = (data.teams || []).map(
    (t) => `${place(t.place)}  ${t.name}  ${t.won}W ${t.lost}L`);
  const fromProgramme = (data.programme || []).map(
    (p) => `${clock(p.starts_at)}  ${p.title}${p.room ? `  ${p.room}` : ''}`);
  const items = payload.items || (data.kind === 'event' ? fromProgramme : fromTable);
  if (!items.length) return null;
  return (
    <div className={styles.ticker}>
      <div className={styles.tickerInner}>
        {items.map((line, i) => (
          <span key={i} className={styles.tickerItem}>{line}</span>
        ))}
      </div>
    </div>
  );
}

function Titlecard({ payload, data, variant }) {
  const title = payload.title || data.tournament?.title || data.event?.name;
  if (!title) return null;
  return (
    <div className={`${styles.title} ${styles['title_' + variant]}`}>
      <div className={styles.titleMain}>{title}</div>
      {payload.subtitle && (
        <div className={styles.titleSub}>{payload.subtitle}</div>
      )}
    </div>
  );
}

function Bracket({ data }) {
  const live = data.live || [];
  if (!live.length) return null;
  return (
    <div className={styles.bracket}>
      {live.map((m, i) => (
        <div key={i} className={styles.bracketRow}>
          <span className={styles.bracketRound}>R{m.round}</span>
          <span className={styles.bracketSide}>{m.home || '-'}</span>
          <span className={styles.bracketScore}>
            {m.score[0]} - {m.score[1]}
          </span>
          <span className={`${styles.bracketSide} ${styles.bracketAway}`}>
            {m.away || '-'}
          </span>
        </div>
      ))}
    </div>
  );
}

// The people who paid for the banners. Both kinds send `sponsors`.
function SponsorWall({ payload, data }) {
  const rows = (data.sponsors || []).filter((s) => s.name || s.logo);
  if (!rows.length) return null;
  return (
    <div className={styles.wall}>
      <div className={styles.wallK}>{payload.title || 'With thanks to'}</div>
      <div className={styles.wallList}>
        {rows.map((s, i) => (
          <div key={i} className={styles.wallOne}>
            {s.logo && <img className={styles.wallLogo} src={s.logo} alt="" />}
            <span className={styles.wallName}>{s.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}


function Media({ element, data }) {
  const asset = element?.asset;
  const payload = element?.payload || {};
  const look = element?.presentation || {};
  const videoRef = useRef(null);
  const [ended, setEnded] = useState(false);
  const [captionUp, setCaptionUp] = useState(false);
  const [broken, setBroken] = useState(false);

  // A new clip starts from the beginning, even if the same element was
  // showing a different one a moment ago.
  useEffect(() => {
    setEnded(false);
    setBroken(false);
    const node = videoRef.current;
    if (node) {
      try { node.currentTime = 0; node.play().catch(() => {}); } catch { /* it is muted */ }
    }
  }, [asset?.id, asset?.url]);

  // How long it stays.
  //
  // CEO, 3 September 2026: "what animation those videos will load in as an the
  // timing." A clip ends by itself; a PICTURE never does, so without this an
  // image put on air stays there until somebody remembers to take it off. That
  // is the state a picture is most often left in by accident.
  const holdFor = Number(look.duration_ms) || 0;
  useEffect(() => {
    setEnded(false);
    if (!holdFor) return undefined;
    const timer = setTimeout(() => setEnded(true), holdFor);
    return () => clearTimeout(timer);
  }, [holdFor, asset?.id]);

  // When the words arrive on top of it.
  //
  // CEO: "if an image is uploaded, there should be a way to set what data
  // should show on it and when."
  const captionAfter = Number(payload.caption_after_ms) || 0;
  useEffect(() => {
    setCaptionUp(!captionAfter);
    if (!captionAfter) return undefined;
    const timer = setTimeout(() => setCaptionUp(true), captionAfter);
    return () => clearTimeout(timer);
  }, [captionAfter, asset?.id]);

  if (!asset || !asset.url || ended) return null;

  // The words on the picture: something typed, or something read live out of
  // the feed, so a caption can be a score that keeps up with the match.
  const live = payload.caption_from ? readFeed(payload.caption_from, data) : '';
  const caption = [payload.caption, live].filter(Boolean).join(' ');

  const overlayText = caption && captionUp ? (
    <span className={styles.mediaCaption}>{caption}</span>
  ) : null;

  if (asset.kind === 'video' && !broken) {
    return (
      <div className={styles.media}>
        <video
          ref={videoRef}
          className={styles.mediaVideo}
          src={asset.url}
          // Muted, because a browser will not autoplay anything else, and the
          // sound on a broadcast belongs to the mixer rather than the page.
          muted
          autoPlay
          playsInline
          onEnded={() => setEnded(true)}
          onError={() => setBroken(true)}
        />
        {overlayText}
      </div>
    );
  }
  if (broken) return null;
  return (
    <div className={styles.media}>
      <img className={styles.mediaImage} src={asset.url} alt=""
           onError={() => setBroken(true)} />
      {overlayText}
    </div>
  );
}

/**
 * What is on, and what follows it. Nothing to type.
 *
 * Two sources, one graphic. An event has a programme of rooms and sessions; a
 * production day has a run of show, the minute by minute the crew works to.
 * They are the same document seen from two sides, so this reads the run sheet
 * where there is one and the event's programme where there is not, rather than
 * becoming a second element that drifts from this one inside a week.
 *
 * What it deliberately does NOT draw is `owner`. That column says which of the
 * crew a cue belongs to, "Graphics", "Casters", "Floor", and it is internal.
 * A viewer wants the match, not the rota.
 */
function NowNext({ data }) {
  const tt = useT();
  const ros = data.run_of_show || null;
  const ev = data.event || {};

  const now = ros?.now
    || (ev.now_on ? { activity: ev.now_on, match: ev.room } : null);
  const next = ros?.next
    || (ev.next_on ? { activity: ev.next_on, match: ev.next_room } : null);

  if (!now && !next) {
    return (
      <EmptyPlate
        eyebrow={tt('studio.rv.next', 'Next')}
        line={tt('studio.rv.runningOrderTBC', 'The running order is being confirmed.')} />
    );
  }

  const row = (cue, label, className) => (
    <div className={className}>
      <span className={styles.nnLabel}>{label}</span>
      {clock(cue.starts_at) && (
        <span className={styles.nnTime}>{clock(cue.starts_at)}</span>
      )}
      <span className={styles.nnTitle}>{cue.activity}</span>
      {cue.match && <span className={styles.nnRoom}>{cue.match}</span>}
    </div>
  );

  return (
    <div className={styles.nownext}>
      {now && row(now, tt('studio.rv.now', 'Now'), styles.nnNow)}
      {next && row(next, tt('studio.rv.next', 'Next'), styles.nnNext)}
    </div>
  );
}

// The running order. The operator picks how many rows; the feed says which.
function Programme({ payload, data }) {
  const rows = (data.programme || []).slice(0, Number(payload.limit) || 6);
  if (!rows.length) return null;
  return (
    <div className={styles.programme}>
      <div className={styles.pgTitle}>{payload.title || data.event?.name || 'Programme'}</div>
      {rows.map((p, i) => (
        <div key={i} className={styles.pgRow}>
          <span className={styles.pgTime}>{clock(p.starts_at)}</span>
          <span className={styles.pgName}>{p.title}</span>
          <span className={styles.pgRoom}>{p.room || ''}</span>
        </div>
      ))}
    </div>
  );
}

// How many are in, against how many the room holds. Read from the door.
function Doors({ data }) {
  const ev = data.event || {};
  const inside = Number(ev.attending || 0);
  const cap = Number(ev.capacity || 0);
  if (!inside && !cap) return null;
  return (
    <div className={styles.doors}>
      <span className={styles.doorsNum}>{inside.toLocaleString()}</span>
      <span className={styles.doorsLabel}>
        {cap ? `of ${cap.toLocaleString()} in` : 'in'}
      </span>
    </div>
  );
}

/**
 * The squad depth graphic: one player's EAFC lineup, on air.
 *
 * CEO, 3 September 2026: "what they picked and formation they selected was
 * shown inside the player squad depth overlay design, updated automatically
 * for each player."
 *
 * Automatic is the ask, and it is why nothing is fetched here: the feed this
 * page already polls carries the lineup and the formation's own coordinates,
 * so a lineup saved at 8pm is on screen within one poll with nobody pressing
 * anything.
 *
 * A card draws its Futbin art when it has it and a readable band when it does
 * not, because a broken image on a broadcast is the one outcome that must be
 * impossible.
 */
/** One card inside the squad depth graphic.
 *
 * Its own component because it needs its own state: the frame and the portrait
 * come from Futbin's CDN and fail SEPARATELY, and a card that has lost one of
 * them must still draw. Written flat first, which meant a failed image left the
 * browser's broken-glyph on a graphic that was on air. That is the one outcome
 * the fallback exists to prevent, and the picker's FutCard already prevented
 * it, so this was the same component twice with only one of them right.
 */
function SquadCard({ slot }) {
  const [frameBroken, setFrameBroken] = useState(false);
  const [faceBroken, setFaceBroken] = useState(false);

  const kind = String(slot?.item_type || '').toLowerCase();
  const band = styles[`sq_${kind}`] || styles.sq_gold;
  const showFrame = slot?.frame_url && !frameBroken;
  const showFace = slot?.image_url && !faceBroken;

  return (
    <div className={`${styles.sqCard} ${showFrame ? '' : band}`}>
      {showFrame && (
        <img className={styles.sqFrame} src={slot.frame_url} alt=""
             onError={() => setFrameBroken(true)} />
      )}
      {showFace && (
        <img className={styles.sqFace} src={slot.image_url} alt=""
             onError={() => setFaceBroken(true)} />
      )}
      <span className={styles.sqRating}>{slot?.rating}</span>
      <span className={styles.sqName}>{slot?.name}</span>
    </div>
  );
}

function SquadDepth({ element }) {
  const lineup = element?.lineup;
  const shape = element?.formation_slots || [];
  if (!lineup) return null;

  const bySlot = {};
  for (const slot of lineup.slots || []) bySlot[slot.slot_index] = slot;
  const bench = (lineup.slots || []).filter((s) => s.slot_index >= 11);

  const card = (slot, key) => <SquadCard key={key} slot={slot} />;

  return (
    <div className={styles.squad}>
      <div className={styles.sqHead}>
        <span className={styles.sqPlayer}>{lineup.player}</span>
        <span className={styles.sqFormation}>{lineup.formation}</span>
      </div>
      <div className={styles.sqPitch}>
        {shape.map((spot) => {
          const slot = bySlot[spot.index];
          if (!slot) return null;
          return (
            <div key={spot.index} className={styles.sqSpot}
                 style={{ left: `${spot.x}%`, bottom: `${spot.y}%` }}>
              {card(slot, spot.index)}
            </div>
          );
        })}
      </div>
      {bench.length > 0 && (
        <div className={styles.sqBench}>
          {bench.map((slot) => card(slot, slot.slot_index))}
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------- the Rivalry Series set
//
// Eight graphics for a format where the fixture is the unit and the match is
// half of it. Every one of them reads `data.rivalry`, draws a designed empty
// state when the fixture it is about does not exist yet, and does no
// arithmetic: the aggregates, the points and the tables are computed where the
// players read them, so a graphic cannot disagree with the standings page.


/** D3: the two nations of a fixture and both seat match-ups, before it starts. */
function FixtureCard({ payload, data }) {
  const tt = useT();
  const riv = rivalryOf(data);
  const fixture = pickFixture(riv, payload);

  if (!fixture) {
    return (
      <EmptyPlate
        eyebrow={tt('studio.rv.fixture', 'Fixture')}
        line={tt('studio.rv.fixtureTBC', 'The next fixture is being confirmed.')} />
    );
  }

  const legs = fixture.legs || [];
  const versus = tt('studio.rv.versus', 'v');

  return (
    <div className={styles.fx}>
      <div className={styles.fxK}>
        {payload.title || data.tournament?.title || tt('studio.rv.fixture', 'Fixture')}
      </div>
      <div className={styles.fxHeads}>
        <div className={styles.fxSide}>
          <Face src={fixture.home?.logo} className={styles.fxLogo} />
          <span className={styles.fxNation}>{fixture.home?.name || '-'}</span>
        </div>
        <span className={styles.fxV}>{versus}</span>
        <div className={`${styles.fxSide} ${styles.fxSideAway}`}>
          <span className={styles.fxNation}>{fixture.away?.name || '-'}</span>
          <Face src={fixture.away?.logo} className={styles.fxLogo} />
        </div>
      </div>
      <div className={styles.fxLegs}>
        {legs.length ? legs.map((leg) => (
          <div key={leg.seat} className={styles.fxLeg}>
            <span className={styles.fxSeat}>
              {tt('studio.rv.seat', 'Seat {n}').replace('{n}', String(leg.seat))}
            </span>
            <span className={styles.fxPlayer}>{leg.home_player || '-'}</span>
            <span className={styles.fxV}>{versus}</span>
            <span className={`${styles.fxPlayer} ${styles.fxPlayerAway}`}>
              {leg.away_player || '-'}
            </span>
          </div>
        )) : (
          <div className={styles.fxNote}>
            {tt('studio.rv.lineupsTBC', 'The line-ups are being confirmed.')}
          </div>
        )}
      </div>
    </div>
  );
}

/** A2: the aggregate end card. Both legs, the totals, the points awarded. */
function FixtureResult({ payload, data }) {
  const tt = useT();
  const riv = rivalryOf(data);
  const fixture = pickFixture(riv, payload, 'decided');

  if (!fixture) {
    return (
      <EmptyPlate
        eyebrow={tt('studio.rv.result', 'Result')}
        line={tt('studio.rv.resultTBC', 'The result is not in yet.')} />
    );
  }

  const home = fixture.home || {};
  const away = fixture.away || {};
  const legs = fixture.legs || [];
  const points = fixture.points || null;
  // A tie that is still being played says so. Calling an aggregate "full time"
  // while the second match is running is the one caption a viewer would act on
  // and be wrong about.
  const settled = Boolean(fixture.decided || fixture.status === 'completed');

  return (
    <div className={styles.fr}>
      <div className={styles.frK}>
        {settled
          ? tt('studio.rv.fixtureDecided', 'Fixture decided')
          : tt('studio.rv.aggregateSoFar', 'Aggregate so far')}
      </div>
      <div className={styles.frTop}>
        <div className={styles.frSide}>
          <Face src={home.logo} className={styles.frLogo} />
          <span className={styles.frNation}>{home.name || '-'}</span>
        </div>
        <div className={styles.frScore}>
          <span className={`${styles.frNum} ${home.aggregate > away.aggregate ? styles.frLead : ''}`}>
            {home.aggregate ?? 0}
          </span>
          <span className={styles.sbDash} />
          <span className={`${styles.frNum} ${away.aggregate > home.aggregate ? styles.frLead : ''}`}>
            {away.aggregate ?? 0}
          </span>
        </div>
        <div className={`${styles.frSide} ${styles.frSideAway}`}>
          <span className={styles.frNation}>{away.name || '-'}</span>
          <Face src={away.logo} className={styles.frLogo} />
        </div>
      </div>
      <div className={styles.frLegs}>
        {legs.map((leg) => (
          <div key={leg.seat} className={styles.frLeg}>
            <span className={styles.frSeat}>
              {tt('studio.rv.seat', 'Seat {n}').replace('{n}', String(leg.seat))}
            </span>
            <span className={styles.frPlayer}>{leg.home_player || '-'}</span>
            <span className={styles.frLegScore}>
              {leg.home_score ?? 0} - {leg.away_score ?? 0}
            </span>
            <span className={`${styles.frPlayer} ${styles.frPlayerAway}`}>
              {leg.away_player || '-'}
            </span>
          </div>
        ))}
      </div>
      {points && (
        <div className={styles.frPoints}>
          <span className={styles.frPointsN}>{points.home}</span>
          <span className={styles.frPointsK}>{tt('studio.rv.points', 'Points')}</span>
          <span className={`${styles.frPointsN} ${styles.frPointsAway}`}>{points.away}</span>
        </div>
      )}
    </div>
  );
}

/** B7: one match's result card. One seat, one scoreline. */
function MatchResult({ payload, data }) {
  const tt = useT();
  const riv = rivalryOf(data);
  const fixture = pickFixture(riv, payload);
  const leg = fixture ? pickLeg(fixture, riv, payload) : null;

  if (!leg) {
    return (
      <EmptyPlate
        eyebrow={tt('studio.rv.result', 'Result')}
        line={tt('studio.rv.resultTBC', 'The result is not in yet.')} />
    );
  }

  const eyebrow = [
    tt('studio.rv.seat', 'Seat {n}').replace('{n}', String(leg.seat)),
    leg.status === 'completed' ? tt('studio.rv.fullTime', 'Full time') : '',
  ].filter(Boolean).join(' · ');

  return (
    <div className={styles.mr}>
      <div className={styles.mrK}>{eyebrow}</div>
      <div className={styles.mrRow}>
        <div className={styles.mrSide}>
          <span className={styles.mrPlayer}>{leg.home_player || '-'}</span>
          <span className={styles.mrNation}>{fixture?.home?.name || ''}</span>
        </div>
        <div className={styles.mrScore}>
          <span className={`${styles.mrNum} ${leg.home_score > leg.away_score ? styles.mrLead : ''}`}>
            {leg.home_score ?? 0}
          </span>
          <span className={styles.sbDash} />
          <span className={`${styles.mrNum} ${leg.away_score > leg.home_score ? styles.mrLead : ''}`}>
            {leg.away_score ?? 0}
          </span>
        </div>
        <div className={`${styles.mrSide} ${styles.mrSideAway}`}>
          <span className={styles.mrPlayer}>{leg.away_player || '-'}</span>
          <span className={styles.mrNation}>{fixture?.away?.name || ''}</span>
        </div>
      </div>
    </div>
  );
}

/** B4: two players side by side with their records, for the caster. */
function HeadToHead({ payload, data }) {
  const tt = useT();
  const riv = rivalryOf(data);
  const fixture = riv ? pickFixture(riv, payload) : null;
  const leg = fixture ? pickLeg(fixture, riv, payload) : null;

  const left = findPlayer(payload.left || leg?.home_player, data);
  const right = findPlayer(payload.right || leg?.away_player, data);

  if (!left || !right) {
    return (
      <EmptyPlate
        eyebrow={tt('studio.rv.headToHead', 'Head to head')}
        line={tt('studio.rv.playersTBC', 'The players are being confirmed.')} />
    );
  }

  // Numbers only for somebody the tournament actually keeps a record for. A
  // guest drawn with four zeroes reads as a record of four defeats.
  const side = (p) => (
    <div className={styles.h2Side}>
      <Face src={p.img} className={styles.h2Face} />
      <span className={styles.h2Name}>{p.name}</span>
      {(p.nation || p.seat) && (
        <span className={styles.h2Under}>
          {[p.nation, p.seat
            ? tt('studio.rv.seat', 'Seat {n}').replace('{n}', String(p.seat))
            : ''].filter(Boolean).join(' · ')}
        </span>
      )}
      {Number.isFinite(Number(p.played)) && (
        <div className={styles.h2Stats}>
          <div className={styles.h2Stat}>
            <span className={styles.h2StatN}>{p.won ?? 0}</span>
            <span className={styles.h2StatK}>{tt('studio.rv.colW', 'W')}</span>
          </div>
          <div className={styles.h2Stat}>
            <span className={styles.h2StatN}>{p.drawn ?? 0}</span>
            <span className={styles.h2StatK}>{tt('studio.rv.colD', 'D')}</span>
          </div>
          <div className={styles.h2Stat}>
            <span className={styles.h2StatN}>{p.lost ?? 0}</span>
            <span className={styles.h2StatK}>{tt('studio.rv.colL', 'L')}</span>
          </div>
          <div className={styles.h2Stat}>
            <span className={styles.h2StatN}>{p.goals_for ?? 0}</span>
            <span className={styles.h2StatK}>{tt('studio.rv.colGF', 'GF')}</span>
          </div>
          <div className={styles.h2Stat}>
            <span className={styles.h2StatN}>{p.goals_against ?? 0}</span>
            <span className={styles.h2StatK}>{tt('studio.rv.colGA', 'GA')}</span>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className={styles.h2}>
      <div className={styles.h2K}>{tt('studio.rv.headToHead', 'Head to head')}</div>
      <div className={styles.h2Row}>
        {side(left)}
        <span className={styles.h2V}>{tt('studio.rv.versus', 'v')}</span>
        {side(right)}
      </div>
    </div>
  );
}


/** B2 and C4: be right back, ending soon, offline, with a live countdown. */
function BreakScreen({ payload }) {
  const tt = useT();
  const until = payload.until || '';
  const [left, setLeft] = useState(() => secondsUntil(until));

  // The one number in the whole studio that moves on its own, and it moves on
  // local state alone. Counting down by asking the feed would be a request a
  // second for the length of every break, against the organiser's own address,
  // which is exactly how an overlay came to ask the API 25 times a second.
  useEffect(() => {
    setLeft(secondsUntil(until));
    if (!until) return undefined;
    const timer = setInterval(() => {
      const secs = secondsUntil(until);
      setLeft(secs);
      if (secs === 0) clearInterval(timer);   // nothing left to count
    }, 1000);
    return () => clearInterval(timer);
  }, [until]);

  return (
    <div className={styles.brk}>
      <div className={styles.brkBody}>
        <div className={styles.brkTitle}>
          {payload.title || tt('studio.rv.brb', 'Be right back')}
        </div>
        {payload.subtitle && (
          <div className={styles.brkSub}>{payload.subtitle}</div>
        )}
        {left !== null && (
          <div className={styles.brkClock}>
            <span className={styles.brkClockK}>
              {left > 0
                ? tt('studio.rv.backIn', 'Back in')
                : tt('studio.rv.startingNow', 'Starting now')}
            </span>
            {left > 0 && (
              <span className={styles.brkClockNum}>{countdown(left)}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/** D8: player of the day, goal of the day, MVP. The operator names it. */
function Award({ payload }) {
  const tt = useT();
  const title = payload.title || tt('studio.rv.award', 'Award');

  if (!payload.name) {
    return (
      <EmptyPlate
        eyebrow={title}
        line={tt('studio.rv.winnerTBC', 'The winner is being confirmed.')} />
    );
  }

  return (
    <div className={styles.aw}>
      <div className={styles.awK}>{title}</div>
      <div className={styles.awBody}>
        <Face src={payload.picture} className={styles.awFace} />
        <div className={styles.awWho}>
          <div className={styles.awName}>{payload.name}</div>
          {payload.detail && <div className={styles.awDetail}>{payload.detail}</div>}
        </div>
      </div>
    </div>
  );
}

/** A5: the aggregate rule, in one screen.
 *
 * The most asked question in the chat at the last one of these was why a
 * country that had won both matches was behind. Three lines, no numbers this
 * page has not been sent: the points a win is worth belongs to the organiser's
 * ruleset and is not in the feed, so it is not claimed here.
 */
function Explainer({ data }) {
  const tt = useT();
  const seats = Number(rivalryOf(data)?.seats) || 2;

  const lines = [
    tt('studio.rv.rule1', 'Every fixture is {n} matches, one for each seat.')
      .replace('{n}', String(seats)),
    tt('studio.rv.rule2', 'The fixture is decided on total goals across all of them, never on matches won.'),
    tt('studio.rv.rule3', 'So a player can win their own match while their nation loses the fixture. Both are kept, in two tables.'),
  ];

  return (
    <div className={styles.ex}>
      <div className={styles.exTitle}>
        {tt('studio.rv.howItWorks', 'How a fixture is won')}
      </div>
      <ol className={styles.exList}>
        {lines.map((line, i) => (
          <li key={line} className={styles.exItem}>
            <span className={styles.exNum}>{i + 1}</span>
            <span className={styles.exText}>{line}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

const ELEMENTS = {
  scorebar: Scorebar,
  standings: Standings,
  lower_third: LowerThird,
  player_card: PlayerCard,
  bracket: Bracket,
  sponsors: SponsorWall,
  media: Media,
  squad_depth: SquadDepth,
  ticker: Ticker,
  intro: (p) => <Titlecard {...p} variant="intro" />,
  outro: (p) => <Titlecard {...p} variant="outro" />,
  now_next: NowNext,
  programme: Programme,
  doors: Doors,
  fixture_card: FixtureCard,
  fixture_result: FixtureResult,
  match_result: MatchResult,
  head_to_head: HeadToHead,
  break_screen: BreakScreen,
  award: Award,
  explainer: Explainer,
  // Four graphics off the CEO's stream elements sheet that the studio had no
  // kind for. They exist in the Rivalry look only for now: the drawing is the
  // client's pack and a V-ENT house version of each is still to be made, so
  // they are listed here as well rather than being dead under the house look.
  // An operator who switches one on gets a working graphic either way, which
  // is the thing that matters at a venue.
  desk_lower_third: DeskLowerThird,
  matchday: MatchdayCard,
  analyst_desk: AnalystDesk,
  play_area: PlayAreaFrame,
};

// The same kinds, drawn in the CADE Rivalry Series pack.
//
// A look, not a fork. Everything absent from this map falls through to the
// house drawing above, so adding a graphic to the pack is one line here and
// nothing else moves.
//
// `standings` is one kind and two tables, exactly as it is in the house look:
// a player can win their own match while their nation loses the fixture, which
// is the whole reason the format keeps two of them.
const RIVALRY = {
  standings: (props) => (props.payload?.table === 'players'
    ? <IndividualTable {...props} />
    : <NationsTable {...props} />),
  head_to_head: HeadToHeadCard,
  now_next: NowNextBar,
  desk_lower_third: DeskLowerThird,
  matchday: MatchdayCard,
  analyst_desk: AnalystDesk,
  play_area: PlayAreaFrame,
};

/** The component for this graphic in this broadcast's look.
 *
 * The house drawing is the fallback rather than an error: a look that has not
 * been drawn for a kind yet must still put something on screen, because the
 * alternative is a browser source that is black at the moment somebody cues it.
 */
function componentFor(kind, theme) {
  if (theme === 'rivalry' && RIVALRY[kind]) return RIVALRY[kind];
  return ELEMENTS[kind];
}

// ------------------------------------------------------------------- page

/** Which graphic, which broadcast, from either address shape. */
export function readAddress(parts) {
  const bits = (parts || []).filter(Boolean).map(String);
  if (bits.length >= 3) return { token: bits[2], kind: bits[1], slug: bits[0] };
  if (bits.length === 2) return { token: bits[0], kind: bits[1], slug: null };
  return { token: '', kind: '', slug: null };
}

export default function StudioElement({ params }) {
  const { token, kind } = readAddress(params?.parts);

  const [feed, setFeed] = useState(null);
  const [retired, setRetired] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const version = useRef('');
  // One request in flight at a time, and a pause after a refusal. An overlay
  // in OBS once asked the API twenty-five times a second (3 September 2026),
  // and every request counted against the organiser's own address.
  const inFlight = useRef(false);
  const pausedUntil = useRef(0);
  const failures = useRef(0);

  // A preview in the console draws from the current payload whether or not the
  // graphic is on air, and asks less often. Read once: a browser source never
  // changes its own address.
  const [mode] = useState(() => {
    if (typeof window === 'undefined') return { preview: false, every: POLL_MS };
    const q = new URLSearchParams(window.location.search);
    const asked = Number(q.get('every'));
    return {
      preview: q.get('preview') === '1',
      every: Number.isFinite(asked) && asked >= 1000 ? asked : POLL_MS,
    };
  });

  // Transparent, and nothing else on the page. Set on the document rather than
  // in CSS alone because the browser paints the canvas white before any
  // stylesheet applies, and a white flash on a scene change is visible on air.
  useEffect(() => {
    document.documentElement.style.background = 'transparent';
    document.body.style.background = 'transparent';
    document.body.style.margin = '0';
    document.body.style.overflow = 'hidden';
  }, []);

  const read = useCallback(async () => {
    if (inFlight.current || Date.now() < pausedUntil.current) return;
    inFlight.current = true;
    try {
      const res = await fetch(`${API}/studio/${encodeURIComponent(token)}/feed/`,
        { cache: 'no-store' });
      if (res.status === 429 || res.status >= 500) {
        failures.current += 1;
        pausedUntil.current = Date.now()
          + Math.min(60000, mode.every * (2 ** failures.current));
        return;
      }
      if (!res.ok) return;
      const body = await res.json();
      if (body?.status !== 'success') return;
      failures.current = 0;
      // Only redraw when something actually moved. An element sitting on air
      // for six hours should cost one comparison a second, not a re-render.
      if (body.data.version === version.current) return;
      version.current = body.data.version;
      setFeed(body.data);
      if (body.data.retired) setRetired(true);
    } catch {
      // Keep the last good frame. A graphic that flickers to an error
      // mid-match is worse than one that is a few seconds stale.
      failures.current += 1;
      pausedUntil.current = Date.now()
        + Math.min(60000, mode.every * (2 ** failures.current));
    } finally {
      inFlight.current = false;
    }
  }, [token, mode.every]);

  useEffect(() => {
    if (retired) return undefined;
    read();
    const timer = setInterval(read, mode.every);
    return () => clearInterval(timer);
  }, [read, retired, mode.every]);

  const element = feed?.elements?.[kind];
  const show = mode.preview ? Boolean(element) : Boolean(element?.active);
  const look = element?.presentation || {};

  // Taken off air: play the exit, then stop drawing. Without this the graphic
  // vanishes between two frames, which on a broadcast reads as a fault.
  useEffect(() => {
    if (show) { setLeaving(false); return undefined; }
    if (!feed || mode.preview) return undefined;
    setLeaving(true);
    const timer = setTimeout(() => setLeaving(false), 420);
    return () => clearTimeout(timer);
  }, [show, feed, mode.preview]);

  if (!feed || retired) return null;
  const Component = componentFor(kind, feed?.session?.theme);
  if (!Component) return null;

  // `hold` keeps the surface on screen and takes only the content away, for a
  // plate that should not flash on every change. CEO, 3 September: "if the bg
  // of that overlay should not leave or load in and just be present".
  if (!show && !leaving && !look.hold) return null;

  const entry = look.entry && look.entry !== 'none' ? styles[`in_${look.entry}`] : '';
  const exitClass = look.exit && look.exit !== 'none' ? styles[`out_${look.exit}`] : '';

  // Where on the frame this sits, and a nudge off that anchor.
  //
  // CEO, 4 September 2026: "SHould also be able to move the position of
  // overlays... this mostly affect lower thirds."
  //
  // `as_designed` adds NO class, so a graphic sits where its own CSS put it.
  // That is the default and it is the whole safety of this: any other default
  // would have moved every graphic already on air the day it shipped.
  const place = look.position && look.position !== 'as_designed'
    ? `${styles.positioned} ${styles[`at_${look.position}`] || ''}` : '';
  const nudge = (Number(look.offset_x) || Number(look.offset_y))
    ? {
      '--vent-dx': `${Number(look.offset_x) || 0}px`,
      '--vent-dy': `${Number(look.offset_y) || 0}px`,
    }
    : undefined;

  const stage = [
    styles.stage,
    place,
    show ? entry : (leaving ? exitClass : ''),
    !show && look.hold ? styles.held : '',
  ].filter(Boolean).join(' ');

  return (
    <main className={stage} style={nudge}>
      {(show || leaving) && (
        <Component payload={element.payload || {}} data={feed} element={element} />
      )}
      {/* Words the operator added on top of this graphic. Nothing is rendered
          when there are none, not even a container: a graphic with no layers
          is drawn exactly as it was. */}
      {(show || leaving) && (
        <TextLayers layers={element.layers} data={feed} />
      )}
    </main>
  );
}
