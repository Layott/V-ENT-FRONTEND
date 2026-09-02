'use client';

// The operator's console: start a broadcast, copy the URLs, put graphics on air.
//
// CEO, 1 September 2026: "it'll be like a production studio for any organizer
// who can pay for it."
//
// This replaces a panel that had been telling organisers "broadcast tooling is
// still being built" while showing them four dead cards.
//
// ## What this screen is for
//
// Somebody is running a live broadcast. They are watching a match, not this
// page. So: every control is one press, the state on screen is the state on
// air, and nothing here asks a question that can wait.
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
// deciding what a form looks like.
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
  ticker: tt('studio.kind.ticker', 'Ticker'),
  intro: tt('studio.kind.intro', 'Intro'),
  outro: tt('studio.kind.outro', 'Outro'),
});

export default function StudioPanel({ tournamentRef }) {
  const tt = useT();
  const { data: session } = useSession();
  const token = session?.user?.sessionToken;

  const [live, setLive] = useState(null);
  const [past, setPast] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState('');
  // Typed but not yet sent, per element. Held apart from what is on air so the
  // panel never shows a value the audience is not seeing.
  const [draft, setDraft] = useState({});

  const FIELDS = fieldsFor(tt);
  const LABELS = labelsFor(tt);

  const call = useCallback(async (path, options = {}) => {
    const res = await fetch(`${API}/tournament/${tournamentRef}/studio${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      },
    });
    let body = {};
    try { body = await res.json(); } catch { body = {}; }
    return { ok: res.ok && body.status === 'success', body };
  }, [tournamentRef, token]);

  const load = useCallback(async () => {
    if (!token || !tournamentRef) { setLoading(false); return; }
    setLoading(true);
    const { ok, body } = await call('/sessions/');
    if (ok) {
      const rows = body.data.sessions || [];
      setLive(rows.find((s) => s.is_live) || null);
      setPast(rows.filter((s) => !s.is_live).slice(0, 5));
      setError('');
    } else {
      setError(apiMessage(tt, body, 'api.couldNotLoad', 'Could not load the studio.'));
    }
    setLoading(false);
  }, [call, token, tournamentRef]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const push = (kind, patch) => run(() => call(
    `/sessions/${live.id}/element/${kind}/`,
    { method: 'POST', body: JSON.stringify(patch) },
  ));

  const copy = async (kind, url) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(kind);
      setTimeout(() => setCopied(''), 2000);
    } catch {
      // Blocked outside a secure context. The URL is on screen and selectable.
    }
  };

  if (loading) {
    return <p className={styles.muted}>{tt('studio.loading', 'Opening the studio...')}</p>;
  }

  return (
    <div className={styles.wrap}>
      <h2 className={styles.title}>{tt('studio.title', 'Production studio')}</h2>
      <p className={styles.sub}>
        {tt('studio.sub', 'Graphics V-ENT draws from this tournament, as browser sources. Paste a URL into OBS, vMix or anything else that takes one, then put each graphic on air from here. Everything is kept on the server, so restarting your streaming software mid-broadcast brings every graphic back exactly as it was.')}
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
            {Object.keys(LABELS).map((kind) => {
              const el = live.elements?.[kind] || {};
              const fields = FIELDS[kind] || [];
              const values = { ...(el.payload || {}), ...(draft[kind] || {}) };
              const dirty = Boolean(draft[kind] && Object.keys(draft[kind]).length);

              return (
                <div key={kind} className={styles.element}>
                  <div className={styles.elHead}>
                    <span className={styles.elName}>
                      {LABELS[kind]}
                    </span>
                    {el.active && (
                      <span className={styles.onAir}>{tt('studio.onAir', 'On air')}</span>
                    )}
                    <button type="button" className={styles.copyBtn}
                            onClick={() => copy(kind, live.urls[kind])}>
                      {copied === kind
                        ? tt('studio.copied', 'Copied')
                        : tt('studio.copyUrl', 'Copy URL')}
                    </button>
                    <button type="button"
                            className={el.active ? styles.offBtn : styles.onBtn}
                            disabled={busy}
                            onClick={() => push(kind, { active: !el.active })}>
                      {el.active
                        ? tt('studio.take', 'Take off')
                        : tt('studio.put', 'Put on air')}
                    </button>
                  </div>

                  <p className={styles.elUrl}>{live.urls[kind]}</p>

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
                                   [kind]: { ...(d[kind] || {}), [f.key]: e.target.value },
                                 }))} />
                        </label>
                      ))}
                      <div className={styles.fieldActions}>
                        <button type="button" className={styles.primary}
                                disabled={busy || !dirty}
                                onClick={() => push(kind, { payload: draft[kind] })
                                  .then((ok) => ok && setDraft((d) => ({ ...d, [kind]: {} })))}>
                          {el.active
                            ? tt('studio.update', 'Update on air')
                            : tt('studio.save', 'Save')}
                        </button>
                        {dirty && (
                          <button type="button" className={styles.ghost}
                                  onClick={() => setDraft((d) => ({ ...d, [kind]: {} }))}>
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
