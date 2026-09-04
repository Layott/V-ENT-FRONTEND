'use client';

// The operator's console: start a broadcast, copy the URLs, put graphics on air.
//
// CEO, 1 September 2026: "it'll be like a production studio for any organizer
// who can pay for it." And on 2 September, after the audit found it built for
// tournaments only: "i want the production studio built with a very strong
// background."
//
// One panel for both things V-ENT runs. `kind` is 'tournament' or 'event';
// the routes, the session, the URLs and the feed are the same shape, and the
// server says which graphics this broadcast may use. A second copy of this
// for events would have drifted from this one inside a week.
//
// ## What this screen is for
//
// Somebody is running a live broadcast. They are watching a match or a stage,
// not this page. So: every control is one press, the state on screen is the
// state on air, and nothing here asks a question that can wait.
//
// The URLs are the top of the panel because they are needed once, at setup,
// under time pressure, and hunting for them while a stream is starting is the
// worst minute of the day.

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useT } from '@/i18n/LanguageProvider';
import { apiMessage } from '@/lib/apiMessage';
import OverlayPreview from './OverlayPreview';
import StudioMedia from './StudioMedia';
import styles from './studio-panel.module.css';

const API = process.env.NEXT_PUBLIC_API_URL;

//: How often a preview plays its load-in again. Matches the uploaded overlays
//: deliberately: two panels on one screen replaying at different rates reads
//: as one of them being broken.
const PREVIEW_REPLAY_MS = 10000;

// What each element asks the operator for. Kept here rather than on the server
// because it is a property of the graphic, and the server should not be
// deciding what a form looks like. A kind with no fields draws itself from the
// feed: now-and-next reads the programme, doors reads the ticket count.
//
// Every key here is a literal. `tt(`studio.field.${kind}.${f.key}`)` would be
// invisible to `check-keys.mjs`, which is how a screen ends up permanently
// English in French while every checker reports clean.
const fieldsFor = (tt) => ({
  scorebar: [
    { key: 'home', label: tt('studio.f.home', 'Home team'), placeholder: 'Nigeria' },
    { key: 'away', label: tt('studio.f.away', 'Away team'), placeholder: 'Ghana' },
    { key: 'home_score', label: tt('studio.f.homeScore', 'Home score'), placeholder: '0', numeric: true },
    { key: 'away_score', label: tt('studio.f.awayScore', 'Away score'), placeholder: '0', numeric: true },
    { key: 'caption', label: tt('studio.f.caption', 'Caption'), placeholder: 'Aggregate, leg 2' },
    // The running aggregate beside the live score, and which of the two
    // match-ups this is. Both are left blank by default and worked out from
    // the fixture that is live, because during a fixture that is the answer
    // the operator wants and typing it again every twenty minutes is how a
    // wrong seat number ends up on air.
    { key: 'seat',
      label: tt('studio.f.seat', 'Which seat'),
      choices: [
        { value: '', label: tt('studio.opt.auto', 'Work it out') },
        { value: '1', label: tt('studio.opt.seat1', 'Seat 1') },
        { value: '2', label: tt('studio.opt.seat2', 'Seat 2') },
      ] },
    { key: 'show_aggregate',
      label: tt('studio.f.showAggregate', 'Show the aggregate'),
      choices: [
        { value: '', label: tt('studio.opt.auto', 'Work it out') },
        { value: 'yes', label: tt('studio.opt.yes', 'Yes') },
        { value: 'no', label: tt('studio.opt.no', 'No') },
      ] },
  ],
  standings: [
    // Which of the two live tables. An aggregate format keeps a nations table
    // and a players table at once and they are different shapes, so this is a
    // choice rather than a text box: an operator mid-broadcast should not be
    // able to mistype the name of a table.
    { key: 'table',
      label: tt('studio.f.whichTable', 'Which table'),
      choices: [
        { value: 'nations', label: tt('studio.opt.nations', 'Nations') },
        { value: 'players', label: tt('studio.opt.players', 'Players') },
      ] },
    { key: 'title', label: tt('studio.f.heading', 'Heading'), placeholder: 'Group standings' },
    { key: 'limit', label: tt('studio.f.rows', 'How many rows'), placeholder: '10', numeric: true },
  ],
  lower_third: [
    { key: 'title', label: tt('studio.f.name', 'Name'), placeholder: 'Temi Adeyemi' },
    { key: 'subtitle', label: tt('studio.f.underIt', 'Under it'), placeholder: 'Nigeria, seat 1' },
  ],
  player_card: [
    { key: 'player', label: tt('studio.f.player', 'Player'), placeholder: 'demo_zainab' },
  ],
  sponsors: [
    { key: 'title', label: tt('studio.f.heading', 'Heading'), placeholder: 'With thanks to' },
  ],
  programme: [
    { key: 'title', label: tt('studio.f.heading', 'Heading'), placeholder: 'Today' },
    { key: 'limit', label: tt('studio.f.rows', 'How many rows'), placeholder: '6', numeric: true },
  ],
  media: [
    { key: 'tag', label: tt('studio.f.mediaTag', 'Or a word to find it by'), placeholder: 'walkon' },
    { key: 'caption', label: tt('studio.f.caption', 'Words on top of it'), placeholder: 'Goal of the week' },
    { key: 'caption_from', label: tt('studio.f.captionFrom', 'Or a live value'), placeholder: 'team.name' },
    { key: 'caption_after_ms', label: tt('studio.f.captionAfter', 'Words appear after (ms)'), placeholder: '0', numeric: true },
  ],
  squad_depth: [
    { key: 'player', label: tt('studio.f.whosSquad', 'Whose squad'), placeholder: 'demo_zainab' },
  ],
  now_next: [],
  doors: [],
  ticker: [],
  bracket: [],
  explainer: [],
  // The Rivalry Series set. Every fixture field is optional on purpose: blank
  // means the fixture that is live, which is what somebody with one hand on
  // the mixer wants, and what the graphics work out for themselves.
  fixture_card: [
    { key: 'fixture_id', label: tt('studio.f.fixture', 'Which fixture'), placeholder: tt('studio.opt.auto', 'Work it out') },
    { key: 'title', label: tt('studio.f.heading', 'Heading'), placeholder: 'Matchday 3' },
  ],
  fixture_result: [
    { key: 'fixture_id', label: tt('studio.f.fixture', 'Which fixture'), placeholder: tt('studio.opt.auto', 'Work it out') },
  ],
  match_result: [
    { key: 'fixture_id', label: tt('studio.f.fixture', 'Which fixture'), placeholder: tt('studio.opt.auto', 'Work it out') },
    { key: 'seat',
      label: tt('studio.f.seat', 'Which seat'),
      choices: [
        { value: '', label: tt('studio.opt.auto', 'Work it out') },
        { value: '1', label: tt('studio.opt.seat1', 'Seat 1') },
        { value: '2', label: tt('studio.opt.seat2', 'Seat 2') },
      ] },
  ],
  head_to_head: [
    { key: 'left', label: tt('studio.f.leftPlayer', 'Player on the left'), placeholder: 'demo_zainab' },
    { key: 'right', label: tt('studio.f.rightPlayer', 'Player on the right'), placeholder: 'demo_kwame' },
  ],
  break_screen: [
    { key: 'title', label: tt('studio.f.title', 'Title'), placeholder: 'Be right back' },
    { key: 'subtitle', label: tt('studio.f.underIt', 'Under it'), placeholder: 'Group B starts shortly' },
    { key: 'until', label: tt('studio.f.until', 'Counting down to'), placeholder: '2026-09-04T18:30' },
  ],
  award: [
    { key: 'title', label: tt('studio.f.title', 'Title'), placeholder: 'Player of the day' },
    { key: 'name', label: tt('studio.f.awardName', 'Who won it'), placeholder: 'Temi Adeyemi' },
    { key: 'detail', label: tt('studio.f.awardDetail', 'Why they won it'), placeholder: '7 goals, 3 wins' },
    { key: 'picture', label: tt('studio.f.awardPicture', 'Picture address'), placeholder: 'https://' },
  ],
  intro: [
    { key: 'title', label: tt('studio.f.title', 'Title'), placeholder: 'Rivalry Series' },
    { key: 'subtitle', label: tt('studio.f.underIt', 'Under it'), placeholder: 'Day 1' },
  ],
  outro: [
    { key: 'title', label: tt('studio.f.title', 'Title'), placeholder: 'Thanks for watching' },
    { key: 'subtitle', label: tt('studio.f.underIt', 'Under it'), placeholder: 'Back tomorrow, 4pm' },
  ],
});

const labelsFor = (tt) => ({
  squad_depth: tt('studio.l.squadDepth', 'Squad depth'),
  scorebar: tt('studio.kind.scorebar', 'Score bar'),
  standings: tt('studio.kind.standings', 'Standings'),
  lower_third: tt('studio.kind.lowerThird', 'Lower third'),
  player_card: tt('studio.kind.playerCard', 'Player card'),
  bracket: tt('studio.kind.bracket', 'Bracket'),
  sponsors: tt('studio.kind.sponsors', 'Sponsor wall'),
  ticker: tt('studio.kind.ticker', 'Ticker'),
  intro: tt('studio.kind.intro', 'Intro'),
  outro: tt('studio.kind.outro', 'Outro'),
  now_next: tt('studio.kind.nowNext', 'Now and next'),
  programme: tt('studio.kind.programme', 'Programme'),
  doors: tt('studio.kind.doors', 'Doors'),
  media: tt('studio.kind.media', 'Clip or picture'),
  fixture_card: tt('studio.kind.fixtureCard', 'Fixture card'),
  fixture_result: tt('studio.kind.fixtureResult', 'Fixture result'),
  match_result: tt('studio.kind.matchResult', 'Match result'),
  head_to_head: tt('studio.kind.headToHead', 'Head to head'),
  break_screen: tt('studio.kind.breakScreen', 'Break screen'),
  award: tt('studio.kind.award', 'Award'),
  explainer: tt('studio.kind.explainer', 'Aggregate rule'),
});

// How a graphic arrives and leaves. The server owns the list; these are its
// words said in the reader's language.
const entryLabels = (tt) => ({
  rise: tt('studio.entry.rise', 'Rises in'),
  fade: tt('studio.entry.fade', 'Fades in'),
  slide_left: tt('studio.entry.slideLeft', 'Slides in from the left'),
  slide_right: tt('studio.entry.slideRight', 'Slides in from the right'),
  none: tt('studio.entry.none', 'Just appears'),
});

// Where on the frame a graphic sits. The LIST comes from the server's own
// catalogue; only the words are here, and a name with no word falls back to the
// name. A second list in the console is a position an operator can pick and the
// server then refuses.
//
// CEO, 4 September 2026: "SHould also be able to move the position of
// overlays... this mostly affect lower thirds."
/** A pixel nudge from a text box, kept a number the API will accept.
 *
 *  Empty means zero rather than nothing: an operator clearing the box is
 *  saying "no nudge", and sending '' would be refused as not a number.
 */
const numberFrom = (text) => {
  const cleaned = String(text).replace(/[^0-9-]/g, '').replace(/(?!^)-/g, '');
  if (cleaned === '' || cleaned === '-') return 0;
  return Math.max(-800, Math.min(800, Number(cleaned)));
};

const positionLabels = (tt) => ({
  as_designed: tt('studio.pos.asDesigned', 'Where the design puts it'),
  top_left: tt('studio.pos.topLeft', 'Top left'),
  top_centre: tt('studio.pos.topCentre', 'Top centre'),
  top_right: tt('studio.pos.topRight', 'Top right'),
  middle_left: tt('studio.pos.middleLeft', 'Middle left'),
  centre: tt('studio.pos.centre', 'Middle'),
  middle_right: tt('studio.pos.middleRight', 'Middle right'),
  bottom_left: tt('studio.pos.bottomLeft', 'Bottom left'),
  bottom_centre: tt('studio.pos.bottomCentre', 'Bottom centre'),
  bottom_right: tt('studio.pos.bottomRight', 'Bottom right'),
});

const exitLabels = (tt) => ({
  fade: tt('studio.exit.fade', 'Fades out'),
  drop: tt('studio.exit.drop', 'Drops away'),
  slide_left: tt('studio.exit.slideLeft', 'Slides out left'),
  slide_right: tt('studio.exit.slideRight', 'Slides out right'),
  none: tt('studio.exit.none', 'Just goes'),
});

// What each graphic draws from when it has no fields, so the operator knows
// why there is nothing to type.
const autoFor = (tt) => ({
  now_next: tt('studio.auto.nowNext', 'Reads the programme: what is on now, and what follows.'),
  doors: tt('studio.auto.doors', 'Reads the door: how many are in, how many the room holds.'),
  ticker: tt('studio.auto.ticker', 'Reads the table, or the programme.'),
  bracket: tt('studio.auto.bracket', 'Reads the matches in progress.'),
  explainer: tt('studio.auto.explainer', 'Explains how a fixture is decided. Reads how many matches make one.'),
});

export default function StudioPanel({ kind = 'tournament', ownerRef, tournamentRef }) {
  const tt = useT();
  const { data: session } = useSession();
  const token = session?.user?.sessionToken;
  // `tournamentRef` is the name the tournament console has always passed.
  const ref = ownerRef || tournamentRef;

  const [live, setLive] = useState(null);
  const [past, setPast] = useState([]);
  const [kinds, setKinds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState('');

  // The preview loop. Same rule as the uploaded overlays: the feed keeps the
  // numbers live by itself, but the load-in only happens on a load, and how a
  // graphic ARRIVES is most of what an operator is judging. CEO, 3 September:
  // "IT SHOULD SHOW HOW IT'LL LOAD ON THE LIVE."
  const [replay, setReplay] = useState(0);
  // Typed but not yet sent, per element. Held apart from what is on air so the
  // panel never shows a value the audience is not seeing.
  const [draft, setDraft] = useState({});

  const FIELDS = fieldsFor(tt);
  const LABELS = labelsFor(tt);
  const AUTO = autoFor(tt);
  const ENTRY = entryLabels(tt);
  const EXIT = exitLabels(tt);
  const PLACE = positionLabels(tt);

  // One refresh in flight at a time, and a pause after a refusal. The console
  // asks every five seconds for the whole broadcast; on a venue connection
  // that is where a stack builds, and a 429 answered by asking again at the
  // same rate is how the admin console once reported itself as "connection
  // lost" (29 August) and the overlay feed starved this address (3 September).
  const inFlight = useRef(false);
  const pausedUntil = useRef(0);
  const failures = useRef(0);

  const call = useCallback(async (path, options = {}) => {
    const res = await fetch(`${API}/${kind}/${ref}/studio${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      },
    });
    let body = {};
    try { body = await res.json(); } catch { body = {}; }
    return { ok: res.ok && body.status === 'success', body };
  }, [kind, ref, token]);

  // `quiet` is the five-second refresh while live. It must not touch the
  // loading state: doing so unmounted the whole panel every five seconds,
  // which flashed "Opening the studio..." on a desktop and threw a phone back
  // to the top of the page mid-scroll, every five seconds, for the whole
  // broadcast.
  const load = useCallback(async (quiet = false) => {
    if (!token || !ref) { setLoading(false); return; }
    if (quiet && (inFlight.current || Date.now() < pausedUntil.current)) return;
    if (!quiet) setLoading(true);
    inFlight.current = true;
    const { ok, body } = await call('/sessions/');
    inFlight.current = false;
    if (!ok && (body?.status === undefined || body?.code === 'THROTTLED')) {
      // Refused or unreachable: wait longer each time, up to a minute, and
      // keep the board that is on screen rather than blanking it mid-show.
      failures.current += 1;
      pausedUntil.current = Date.now() + Math.min(60000, 5000 * (2 ** failures.current));
    }
    if (ok) {
      failures.current = 0;
      const rows = body.data.sessions || [];
      setLive(rows.find((s) => s.is_live) || null);
      setPast(rows.filter((s) => !s.is_live).slice(0, 5));
      // The server says which graphics this kind of broadcast has, and in
      // what order. The panel keeps no list of its own to drift.
      setKinds((body.data.kinds || []).map((k) => k.kind));
      setError('');
    } else {
      setError(apiMessage(tt, body, 'api.couldNotLoad', 'Could not load the studio.'));
    }
    setLoading(false);
  }, [call, token, ref]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  // The loop, paused behind a background tab so eight frames are not reloading
  // for nobody.
  useEffect(() => {
    const id = setInterval(() => {
      if (!document.hidden) setReplay((n) => n + 1);
    }, PREVIEW_REPLAY_MS);
    return () => clearInterval(id);
  }, []);

  // And immediately when an element changes, so somebody who just edited the
  // wording sees it arrive rather than waiting out the rest of the cycle.
  // The element states themselves, not a version field: the session payload
  // does not carry one, and `live?.version` would have been undefined for ever
  // and this effect would have run exactly once. A dependency that is always
  // undefined is the quiet way an effect stops existing.
  const elementSignature = JSON.stringify(live?.elements ?? null);
  useEffect(() => {
    setReplay((n) => n + 1);
  }, [elementSignature]);

  // While a broadcast is live the panel refreshes itself, so a second operator
  // on another machine is not looking at a stale board.
  useEffect(() => {
    if (!live) return undefined;
    const timer = setInterval(() => load(true), 5000);
    return () => clearInterval(timer);
  }, [live, load]);

  const run = async (fn) => {
    setBusy(true);
    setError('');
    const { ok, body } = await fn();
    setBusy(false);
    if (ok) {
      const s = body.data.session;
      if (s) setLive(s.is_live ? s : null);
      if (!s?.is_live) load();
      return true;
    }
    setError(apiMessage(tt, body, 'api.failed', 'That did not work.'));
    return false;
  };

  const start = (name) => run(() => call('/sessions/', {
    method: 'POST', body: JSON.stringify({ name }),
  }));

  const end = () => run(() => call(`/sessions/${live.id}/`, {
    method: 'POST', body: JSON.stringify({ end: true }),
  }));

  const push = (elementKind, patch) => run(() => call(
    `/sessions/${live.id}/element/${elementKind}/`,
    { method: 'POST', body: JSON.stringify(patch) },
  ));

  // The broadcast's house style. Any one graphic may still differ.
  const setDefaults = (patch) => run(() => call(`/sessions/${live.id}/`, {
    method: 'POST',
    body: JSON.stringify({ defaults: { ...(live.defaults || {}), ...patch } }),
  }));

  // One press from the media library: point the clip graphic at this asset and
  // put it on air. A clip takes itself off when it ends, so the operator is
  // not left with a frozen last frame.
  const playAsset = (asset) => push('media', {
    active: true,
    payload: { asset_id: String(asset.id), tag: '' },
  });

  const copy = async (elementKind, url) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(elementKind);
      setTimeout(() => setCopied(''), 2000);
    } catch {
      // Blocked outside a secure context. The URL is on screen and selectable.
    }
  };

  if (loading) {
    return <p className={styles.muted}>{tt('studio.loading', 'Opening the studio...')}</p>;
  }

  const onAirKinds = live ? Object.keys(live.urls || {}) : kinds;
  const orderedKinds = kinds.length ? kinds.filter((k) => onAirKinds.includes(k)) : onAirKinds;

  return (
    <div className={styles.wrap}>
      <h2 className={styles.title}>{tt('studio.title', 'Production studio')}</h2>
      <p className={styles.sub}>
        {kind === 'event'
          ? tt('studio.subEvent', 'Graphics V-ENT draws from this event, as browser sources: what is on now, the programme, the door count, the sponsors. Paste a URL into OBS, vMix or anything else that takes one, then put each graphic on air from here. Everything is kept on the server, so restarting your streaming software mid-broadcast brings every graphic back exactly as it was.')
          : tt('studio.sub', 'Graphics V-ENT draws from this tournament, as browser sources. Paste a URL into OBS, vMix or anything else that takes one, then put each graphic on air from here. Everything is kept on the server, so restarting your streaming software mid-broadcast brings every graphic back exactly as it was.')}
      </p>

      {error && <p className={styles.error}>{error}</p>}

      {!live && (
        <div className={styles.startBox}>
          <p className={styles.startText}>
            {tt('studio.noneLive', 'No broadcast running. Starting one gives you a fresh set of URLs, which stop working when you end it.')}
          </p>
          <button type="button" className={styles.primary} disabled={busy}
                  onClick={() => start(new Date().toLocaleDateString())}>
            {tt('studio.start', 'Start a broadcast')}
          </button>
        </div>
      )}

      {live && (
        <>
          <div className={styles.liveBar}>
            <span className={styles.liveDot} />
            <span className={styles.liveName}>
              {live.name || tt('studio.broadcast', 'Broadcast')}
            </span>
            <span className={styles.liveMeta}>
              {tt('studio.since', 'since {t}').replace(
                '{t}', new Date(live.started_at).toLocaleTimeString())}
            </span>
            <button type="button" className={styles.ghost} disabled={busy} onClick={end}>
              {tt('studio.end', 'End broadcast')}
            </button>
          </div>

          <h3 className={styles.section}>{tt('studio.urls', 'Browser source URLs')}</h3>
          <p className={styles.hint}>
            {tt('studio.urlsHint', 'One per graphic. Add each as a browser source at 1920 by 1080 with a transparent background. They show nothing until you put that graphic on air below.')}
          </p>

          <div className={styles.elements}>
            {orderedKinds.map((elementKind) => {
              const el = live.elements?.[elementKind] || {};
              const fields = FIELDS[elementKind] || [];
              const values = { ...(el.payload || {}), ...(draft[elementKind] || {}) };
              const dirty = Boolean(draft[elementKind] && Object.keys(draft[elementKind]).length);

              return (
                <div key={elementKind} className={styles.element}>
                  <div className={styles.elHead}>
                    <span className={styles.elName}>
                      {LABELS[elementKind] || elementKind}
                    </span>
                    {el.active && (
                      <span className={styles.onAir}>{tt('studio.onAir', 'On air')}</span>
                    )}
                    <button type="button" className={styles.copyBtn}
                            onClick={() => copy(elementKind, live.urls[elementKind])}>
                      {copied === elementKind
                        ? tt('studio.copied', 'Copied')
                        : tt('studio.copyUrl', 'Copy URL')}
                    </button>
                    <button type="button"
                            className={el.active ? styles.offBtn : styles.onBtn}
                            disabled={busy}
                            onClick={() => push(elementKind, { active: !el.active })}>
                      {el.active
                        ? tt('studio.take', 'Take off')
                        : tt('studio.put', 'Put on air')}
                    </button>
                  </div>

                  <p className={styles.elUrl}>{live.urls[elementKind]}</p>

                  {/* What it looks like right now, at the size it will be on
                      air, over a checkerboard so transparency is visible
                      rather than assumed. CEO, 3 September: "the overlays in
                      the studio should always autoplays in small boxes ... so
                      we can see how they'll look inside the streaming
                      software when loaded in." `preview=1` draws it whether or
                      not it is on air; `every` keeps eight of these cheaper
                      than one on-air source. */}
                  <OverlayPreview url={live.urls[elementKind]}
                                  title={LABELS[elementKind] || elementKind}
                                  replay={replay} extraQuery="preview=1&every=4000" />

                  {fields.length === 0 && AUTO[elementKind] && (
                    <p className={styles.hint}>{AUTO[elementKind]}</p>
                  )}

                  {fields.length > 0 && (
                    <div className={styles.fields}>
                      {fields.map((f) => (
                        <label key={f.key} className={styles.field}>
                          <span className={styles.fieldLabel}>
                            {f.label}
                          </span>
                          {/* A field with a fixed set of answers is a choice,
                              not a text box. An operator mid-broadcast should
                              not be able to put "playerz" in a payload and
                              spend the next two minutes wondering why the
                              graphic will not change. */}
                          {f.choices ? (
                            <select className={styles.select}
                                    value={values[f.key] ?? ''}
                                    onChange={(e) => setDraft((d) => ({
                                      ...d,
                                      [elementKind]: { ...(d[elementKind] || {}), [f.key]: e.target.value },
                                    }))}>
                              {f.choices.map((c) => (
                                <option key={c.value} value={c.value}>{c.label}</option>
                              ))}
                            </select>
                          ) : (
                            <input className={styles.input}
                                   inputMode={f.numeric ? 'numeric' : undefined}
                                   placeholder={f.placeholder}
                                   value={values[f.key] ?? ''}
                                   onChange={(e) => setDraft((d) => ({
                                     ...d,
                                     [elementKind]: { ...(d[elementKind] || {}), [f.key]: e.target.value },
                                   }))} />
                          )}
                        </label>
                      ))}
                      <div className={styles.fieldActions}>
                        <button type="button" className={styles.primary}
                                disabled={busy || !dirty}
                                onClick={() => push(elementKind, { payload: draft[elementKind] })
                                  .then((ok) => ok && setDraft((d) => ({ ...d, [elementKind]: {} })))}>
                          {el.active
                            ? tt('studio.update', 'Update on air')
                            : tt('studio.save', 'Save')}
                        </button>
                        {dirty && (
                          <button type="button" className={styles.ghost}
                                  onClick={() => setDraft((d) => ({ ...d, [elementKind]: {} }))}>
                            {tt('ui.cancel.77df', 'Cancel')}
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* How this one arrives and leaves. Starts from the
                      broadcast's house style below, and overrides it. */}
                  <div className={styles.look}>
                    <label className={styles.lookField}>
                      <span className={styles.fieldLabel}>{tt('studio.entry', 'Arrives')}</span>
                      <select className={styles.select} value={el.presentation?.entry || 'rise'}
                              onChange={(e) => push(elementKind, {
                                payload: { options: { ...(el.payload?.options || {}), entry: e.target.value } },
                              })}>
                        {Object.entries(ENTRY).map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                    </label>
                    <label className={styles.lookField}>
                      <span className={styles.fieldLabel}>{tt('studio.exit', 'Leaves')}</span>
                      <select className={styles.select} value={el.presentation?.exit || 'fade'}
                              onChange={(e) => push(elementKind, {
                                payload: { options: { ...(el.payload?.options || {}), exit: e.target.value } },
                              })}>
                        {Object.entries(EXIT).map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                    </label>
                    <label className={styles.lookField}>
                      <span className={styles.fieldLabel}>{tt('studio.position', 'Sits')}</span>
                      <select className={styles.select}
                              value={el.presentation?.position || 'as_designed'}
                              onChange={(e) => push(elementKind, {
                                payload: { options: { ...(el.payload?.options || {}), position: e.target.value } },
                              })}>
                        {(live.presentation_options?.positions || []).map((value) => (
                          <option key={value} value={value}>{PLACE[value] || value}</option>
                        ))}
                      </select>
                    </label>
                    {/* Only once it has been moved. A nudge on a graphic
                        sitting where its design put it does nothing, and a
                        control that does nothing is worse than none. */}
                    {el.presentation?.position && el.presentation.position !== 'as_designed' && (
                      <label className={styles.lookField}>
                        <span className={styles.fieldLabel}>
                          {tt('studio.nudge', 'Nudge, in pixels')}
                        </span>
                        <span className={styles.nudge}>
                          <input className={styles.nudgeInput} inputMode="numeric"
                                 aria-label={tt('studio.nudgeX', 'Across')}
                                 value={el.presentation?.offset_x ?? 0}
                                 onChange={(e) => push(elementKind, {
                                   payload: { options: { ...(el.payload?.options || {}), offset_x: numberFrom(e.target.value) } },
                                 })} />
                          <input className={styles.nudgeInput} inputMode="numeric"
                                 aria-label={tt('studio.nudgeY', 'Down')}
                                 value={el.presentation?.offset_y ?? 0}
                                 onChange={(e) => push(elementKind, {
                                   payload: { options: { ...(el.payload?.options || {}), offset_y: numberFrom(e.target.value) } },
                                 })} />
                        </span>
                      </label>
                    )}
                    <label className={styles.lookCheck}>
                      <input type="checkbox" checked={Boolean(el.presentation?.hold)}
                             onChange={(e) => push(elementKind, {
                               payload: { options: { ...(el.payload?.options || {}), hold: e.target.checked } },
                             })} />
                      <span>{tt('studio.hold', 'Leave the surface on screen')}</span>
                    </label>
                  </div>
                </div>
              );
            })}
          </div>

          {/* The house style, set once for the whole broadcast. */}
          <div className={styles.defaults}>
            <h3 className={styles.section}>{tt('studio.house', 'How graphics behave by default')}</h3>
            <p className={styles.hint}>
              {tt('studio.houseHint', 'Every graphic starts from this. Change one above and it keeps its own.')}
            </p>
            <div className={styles.look}>
              <label className={styles.lookField}>
                <span className={styles.fieldLabel}>{tt('studio.entry', 'Arrives')}</span>
                <select className={styles.select} value={live.defaults?.entry || 'rise'}
                        onChange={(e) => setDefaults({ entry: e.target.value })}>
                  {Object.entries(ENTRY).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </label>
              <label className={styles.lookField}>
                <span className={styles.fieldLabel}>{tt('studio.exit', 'Leaves')}</span>
                <select className={styles.select} value={live.defaults?.exit || 'fade'}
                        onChange={(e) => setDefaults({ exit: e.target.value })}>
                  {Object.entries(EXIT).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </label>
              <label className={styles.lookField}>
                <span className={styles.fieldLabel}>{tt('studio.position', 'Sits')}</span>
                <select className={styles.select}
                        value={live.defaults?.position || 'as_designed'}
                        onChange={(e) => setDefaults({ position: e.target.value })}>
                  {(live.presentation_options?.positions || []).map((value) => (
                    <option key={value} value={value}>{PLACE[value] || value}</option>
                  ))}
                </select>
              </label>
              {live.defaults?.position && live.defaults.position !== 'as_designed' && (
                <label className={styles.lookField}>
                  <span className={styles.fieldLabel}>
                    {tt('studio.nudge', 'Nudge, in pixels')}
                  </span>
                  <span className={styles.nudge}>
                    <input className={styles.nudgeInput} inputMode="numeric"
                           aria-label={tt('studio.nudgeX', 'Across')}
                           value={live.defaults?.offset_x ?? 0}
                           onChange={(e) => setDefaults({ offset_x: numberFrom(e.target.value) })} />
                    <input className={styles.nudgeInput} inputMode="numeric"
                           aria-label={tt('studio.nudgeY', 'Down')}
                           value={live.defaults?.offset_y ?? 0}
                           onChange={(e) => setDefaults({ offset_y: numberFrom(e.target.value) })} />
                  </span>
                </label>
              )}
              <label className={styles.lookCheck}>
                <input type="checkbox" checked={Boolean(live.defaults?.hold)}
                       onChange={(e) => setDefaults({ hold: e.target.checked })} />
                <span>{tt('studio.hold', 'Leave the surface on screen')}</span>
              </label>
            </div>
          </div>
        </>
      )}

      {/* Clips and pictures live with the studio rather than with one
          broadcast, so this shows whether or not one is running. */}
      <StudioMedia kind={kind} ownerRef={ref} token={token}
                   live={Boolean(live)} onPlay={playAsset} />

      {past.length > 0 && (
        <>
          <h3 className={styles.section}>{tt('studio.past', 'Earlier broadcasts')}</h3>
          <div className={styles.pastRows}>
            {past.map((s) => (
              <div key={s.id} className={styles.pastRow}>
                <span className={styles.pastName}>
                  {s.name || tt('studio.broadcast', 'Broadcast')}
                </span>
                <span className={styles.muted}>
                  {new Date(s.started_at).toLocaleString()}
                </span>
                <span className={styles.muted}>
                  {tt('studio.urlsRetired', 'URLs retired')}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
