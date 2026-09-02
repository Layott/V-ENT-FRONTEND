'use client';

// A production studio element, as a browser source.
//
// CEO, 1 September 2026: "each element can be copied and pasted into your
// streaming software as browser sources and it updates in realtime."
//
// ## The three rules this page is built around
//
// **It holds no state.** Everything on screen comes from the feed, every time.
// That is what makes a broadcast survivable: OBS can be restarted mid-show, the
// machine can be swapped, a second operator can open the same URL on another
// laptop, and the graphic comes back exactly as it was. A page that remembered
// anything would lose the broadcast with the tab, at the moment nobody has time
// to rebuild it.
//
// **It is transparent.** The streaming software composites this onto video, so
// the page paints nothing of its own. Not a dark background, not white:
// nothing. Every surface belongs to an element.
//
// **It never shows a spinner, an error or a placeholder.** Anything this page
// draws is going out on air. A connection that drops keeps the last good frame
// on screen and retries quietly, because a graphic that flickers to "Loading"
// mid-match is worse than a graphic that is a few seconds stale.
//
// The feed says what the broadcast is of (`kind`): a tournament sends teams,
// live matches and sponsors; an event sends what is on now, the programme, the
// door count and sponsors. Each element reads the part it needs and returns
// null for the rest, and the same page serves both.

import { useCallback, useEffect, useRef, useState } from 'react';
import styles from './studio.module.css';

// Fast enough that a score correction looks immediate to a viewer, slow enough
// that six hours on a venue hotspot is not a problem. The feed answers every
// element in one request, so this is the only timer in the whole studio.
const POLL_MS = 1200;

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

  const home = find(payload.home) || teams[0] || null;
  const away = find(payload.away) || teams[1] || null;
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
  // match never found anybody and the card never drew. An element that
  // returns null looks exactly like an element that is switched off.
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
        {team && <div className={styles.cardTeam}>{team.name}</div>}
        {team && (
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

const ELEMENTS = {
  scorebar: Scorebar,
  standings: Standings,
  lower_third: LowerThird,
  player_card: PlayerCard,
  bracket: Bracket,
  sponsors: SponsorWall,
  ticker: Ticker,
  intro: (p) => <Titlecard {...p} variant="intro" />,
  outro: (p) => <Titlecard {...p} variant="outro" />,
  now_next: NowNext,
  programme: Programme,
  doors: Doors,
};

// ------------------------------------------------------------------- page

export default function StudioElement({ params }) {
  const token = String(params?.token || '');
  const kind = String(params?.kind || '');

  const [feed, setFeed] = useState(null);
  const [retired, setRetired] = useState(false);
  const version = useRef('');

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
    try {
      const res = await fetch(`${API}/studio/${encodeURIComponent(token)}/feed/`,
        { cache: 'no-store' });
      if (!res.ok) return;
      const body = await res.json();
      if (body?.status !== 'success') return;
      // Only redraw when something actually moved. An element sitting on air
      // for six hours should cost one comparison a second, not a re-render.
      if (body.data.version === version.current) return;
      version.current = body.data.version;
      setFeed(body.data);
      // The broadcast is over. Everything is already inactive in this payload,
      // so the graphic clears on this render, and then there is nothing left
      // to ask about.
      if (body.data.retired) setRetired(true);
    } catch {
      // Keep the last good frame. A graphic that flickers to an error
      // mid-match is worse than one that is a few seconds stale, and the next
      // poll is a second away.
    }
  }, [token]);

  useEffect(() => {
    if (retired) return undefined;
    read();
    const timer = setInterval(read, POLL_MS);
    return () => clearInterval(timer);
  }, [read, retired]);

  if (!feed || retired) return null;

  const element = feed.elements?.[kind];
  if (!element?.active) return null;

  const Component = ELEMENTS[kind];
  if (!Component) return null;

  return (
    <main className={styles.stage}>
      <Component payload={element.payload || {}} data={feed} />
    </main>
  );
}
