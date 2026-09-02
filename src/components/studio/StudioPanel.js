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

import { useCallback, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useT } from '@/i18n/LanguageProvider';
import { apiMessage } from '@/lib/apiMessage';
import styles from './studio-panel.module.css';

const API = process.env.NEXT_PUBLIC_API_URL;

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
  ],
  standings: [
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
  now_next: [],
  doors: [],
  ticker: [],
  bracket: [],
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
});

// What each graphic draws from when it has no fields, so the operator knows
// why there is nothing to type.
const autoFor = (tt) => ({
  now_next: tt('studio.auto.nowNext', 'Reads the programme: what is on now, and what follows.'),
  doors: tt('studio.auto.doors', 'Reads the door: how many are in, how many the room holds.'),
  ticker: tt('studio.auto.ticker', 'Reads the table, or the programme.'),
  bracket: tt('studio.auto.bracket', 'Reads the matches in progress.'),
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
  // Typed but not yet sent, per element. Held apart from what is on air so the
  // panel never shows a value the audience is not seeing.
  const [draft, setDraft] = useState({});

  const FIELDS = fieldsFor(tt);
  const LABELS = labelsFor(tt);
  const AUTO = autoFor(tt);

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

  const load = useCallback(async () => {
    if (!token || !ref) { setLoading(false); return; }
    setLoading(true);
    const { ok, body } = await call('/sessions/');
    if (ok) {
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

  // While a broadcast is live the panel refreshes itself, so a second operator
  // on another machine is not looking at a stale board.
  useEffect(() => {
    if (!live) return undefined;
    const timer = setInterval(load, 5000);
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
                          <input className={styles.input}
                                 inputMode={f.numeric ? 'numeric' : undefined}
                                 placeholder={f.placeholder}
                                 value={values[f.key] ?? ''}
                                 onChange={(e) => setDraft((d) => ({
                                   ...d,
                                   [elementKind]: { ...(d[elementKind] || {}), [f.key]: e.target.value },
                                 }))} />
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
                </div>
              );
            })}
          </div>
        </>
      )}

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
