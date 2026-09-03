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
import styles from './studio.module.css';

// Fast enough that a score correction looks immediate to a viewer, slow enough
// that six hours on a venue hotspot is not a problem. The feed answers every
// element in one request, so this is the only timer in the whole studio.
const POLL_MS = 1200;
// A preview in the console is not on air. It may be slower, and eight of them
// must not cost more than one on-air source.
const PREVIEW_MS = 4000;

const API = process.env.NEXT_PUBLIC_API_URL;

/** Ordinal for a standings place: 1st, 2nd, 3rd. */
const place = (n) => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

/** A clock reading for a programme row. */
const clock = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

// ---------------------------------------------------------------- elements
//
// Each takes `{payload, data}`: what the operator typed, and what the bracket
// or the programme says. The operator names the fixture; the numbers come from
// the tournament or the event, never from the operator, so a scorebar cannot
// disagree with the standings and a doors count cannot disagree with the door.

function Scorebar({ payload, data }) {
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

  const home = side(payload.home, teams[0] || null);
  let away = side(payload.away, teams[1] || null);
  // And the two sides are never the same entrant, which is not a scoreline.
  if (home && away && home === away) {
    away = teams.find((t) => t !== home) || null;
  }
  if (!home || !away) return null;

  // The aggregate is the operator's, because it is the running score of a tie
  // in progress and the bracket only learns it when the leg is recorded.
  const hs = payload.home_score;
  const as = payload.away_score;

  return (
    <div className={styles.scorebar}>
      <div className={styles.sbSide}>
        {home.logo && <img className={styles.sbLogo} src={home.logo} alt="" />}
        <span className={styles.sbName}>{home.name}</span>
      </div>
      <div className={styles.sbScore}>
        <span className={styles.sbNum}>{hs ?? 0}</span>
        <span className={styles.sbDash} />
        <span className={styles.sbNum}>{as ?? 0}</span>
      </div>
      <div className={`${styles.sbSide} ${styles.sbAway}`}>
        <span className={styles.sbName}>{away.name}</span>
        {away.logo && <img className={styles.sbLogo} src={away.logo} alt="" />}
      </div>
      {payload.caption && (
        <div className={styles.sbCaption}>{payload.caption}</div>
      )}
    </div>
  );
}

function Standings({ payload, data }) {
  const teams = (data.teams || []).slice(0, Number(payload.limit) || 10);
  if (!teams.length) return null;

  return (
    <div className={styles.standings}>
      <div className={styles.stTitle}>
        {payload.title || data.tournament?.title || 'Standings'}
      </div>
      <div className={styles.stHead}>
        <span className={styles.stPos} />
        <span className={styles.stTeam}>Team</span>
        <span className={styles.stNum}>P</span>
        <span className={styles.stNum}>W</span>
        <span className={styles.stNum}>L</span>
        <span className={styles.stNum}>+/-</span>
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
            {t.points_for - t.points_against > 0 ? '+' : ''}
            {t.points_for - t.points_against}
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

// A clip or a picture the organiser uploaded, called on by name or by tag.
//
// CEO, 3 September: "player brolls ... uploaded to a place in the studio and
// then can be called on whenever ... then when those things are needed, can be
// triggered into a live overlay."
//
// The feed resolves which asset this is, so the page never looks anything up:
// a browser source gets one request, and a second round trip to turn a tag
// into a URL is a second chance to fail with a clip half on screen.
/** One value out of the feed, by its dotted name. The runtime's rule, in React.
 *
 * `team.name`, `tournament.title`, `asset.hero`. Used by the media graphic so
 * an organiser can put live data on top of a picture they uploaded, rather than
 * having to bake the text into the image and upload it again every time the
 * number changes.
 */
function readFeed(path, data) {
  const parts = String(path || '').trim().split('.');
  if (!parts[0]) return '';
  let root = data;
  if (parts[0] === 'tournament') { root = data.tournament; parts.shift(); }
  else if (parts[0] === 'event') { root = data.event; parts.shift(); }
  else if (parts[0] === 'team') { root = (data.teams || [])[0]; parts.shift(); }
  else if (parts[0] === 'asset') { root = data.asset; parts.shift(); }
  let value = root;
  for (const part of parts) {
    if (value === null || value === undefined) return '';
    value = value[part];
  }
  return value === null || value === undefined ? '' : String(value);
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

// What is on, and what follows it, read from the programme. Nothing to type.
function NowNext({ data }) {
  const ev = data.event || {};
  if (!ev.now_on && !ev.next_on) return null;
  return (
    <div className={styles.nownext}>
      {ev.now_on && (
        <div className={styles.nnNow}>
          <span className={styles.nnLabel}>Now</span>
          <span className={styles.nnTitle}>{ev.now_on}</span>
          {ev.room && <span className={styles.nnRoom}>{ev.room}</span>}
        </div>
      )}
      {ev.next_on && (
        <div className={styles.nnNext}>
          <span className={styles.nnLabel}>Next</span>
          <span className={styles.nnTitle}>{ev.next_on}</span>
          {ev.next_room && <span className={styles.nnRoom}>{ev.next_room}</span>}
        </div>
      )}
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
};

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
  const Component = ELEMENTS[kind];
  if (!Component) return null;

  // `hold` keeps the surface on screen and takes only the content away, for a
  // plate that should not flash on every change. CEO, 3 September: "if the bg
  // of that overlay should not leave or load in and just be present".
  if (!show && !leaving && !look.hold) return null;

  const entry = look.entry && look.entry !== 'none' ? styles[`in_${look.entry}`] : '';
  const exitClass = look.exit && look.exit !== 'none' ? styles[`out_${look.exit}`] : '';
  const stage = [
    styles.stage,
    show ? entry : (leaving ? exitClass : ''),
    !show && look.hold ? styles.held : '',
  ].filter(Boolean).join(' ');

  return (
    <main className={stage}>
      {(show || leaving) && (
        <Component payload={element.payload || {}} data={feed} element={element} />
      )}
    </main>
  );
}
