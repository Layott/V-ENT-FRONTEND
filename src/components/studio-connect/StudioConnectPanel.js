'use client';

import { useCallback, useEffect, useState } from 'react';
import { useT } from '@/i18n/LanguageProvider';
import { apiMessage } from '@/lib/apiMessage';
import { formatDateTime } from '@/lib/datetime';
import { useViewer } from '@/lib/gating';
import { useAutoRefresh } from '@/lib/useLiveData';
import styles from './studio-connect.module.css';

// The Game integration tab of the tournament console (design section 14,
// item 3).
//
// An organiser picks a game that runs this tournament's title. From then on,
// when a match is ready, V-ENT asks the game to open a lobby, the room code
// appears in the match room the players already use, and the game's result is
// recorded on the match through the same rules as a result typed by hand. The
// organiser can still correct any result by hand, and every game that needs a
// person is listed here with the reason.

const API = process.env.NEXT_PUBLIC_API_URL;

function settingFields(schema) {
  const props = schema?.properties && typeof schema.properties === 'object' ? schema.properties : {};
  const required = new Set(Array.isArray(schema?.required) ? schema.required : []);
  return Object.entries(props).map(([name, spec]) => ({ name, spec: spec || {}, required: required.has(name) }));
}

function stateLabel(tt, state) {
  const labels = {
    creating: tt('partners.studioConnect.state.creating', 'Lobby asked for'),
    created: tt('partners.studioConnect.state.created', 'Lobby open'),
    starting: tt('partners.studioConnect.state.starting', 'Starting'),
    started: tt('partners.studioConnect.state.started', 'Being played'),
    finished: tt('partners.studioConnect.state.finished', 'Finished'),
    cancelling: tt('partners.studioConnect.state.cancelling', 'Being cancelled'),
    cancelled: tt('partners.studioConnect.state.cancelled', 'Cancelled'),
  };
  return labels[state] || labels.creating;
}

function outcomeLabel(tt, row) {
  if (row.outcome === 'applied') return tt('partners.studioConnect.outcome.applied', 'Recorded on the match');
  if (row.outcome === 'superseded') return tt('partners.studioConnect.outcome.superseded', 'The match was settled another way');
  if (row.outcome === 'needs_organiser') {
    return apiMessage(tt, { code: row.error_code }, 'partners.studioConnect.outcome.needs', 'This needs you: record the result by hand.');
  }
  return '';
}

export default function StudioConnectPanel({ tournamentRef, showToast }) {
  const tt = useT();
  const viewer = useViewer();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [picked, setPicked] = useState('');
  const [values, setValues] = useState({});
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState('');
  const [confirmOff, setConfirmOff] = useState(false);

  const say = message => (showToast ? showToast(message) : setProblem(message));

  const load = useCallback(async ({ quiet = false } = {}) => {
    if (!viewer.token || !tournamentRef) return;
    if (!quiet) setLoading(true);
    try {
      const res = await fetch(`${API}/partners/studios/tournament/${encodeURIComponent(tournamentRef)}/`, {
        headers: { Authorization: `Bearer ${viewer.token}` },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(apiMessage(tt, body, 'partners.studioConnect.loadFailed', 'The game integration did not load.'));
        return;
      }
      setData(body.data);
      setError('');
    } catch (err) {
      setError(apiMessage(tt, err, 'partners.studioConnect.loadFailed', 'The game integration did not load.'));
    } finally {
      setLoading(false);
    }
  }, [viewer.token, tournamentRef, tt]);

  useAutoRefresh(() => load({ quiet: true }));
  useEffect(() => {
    if (viewer.loading) return;
    if (!viewer.signedIn) {
      setLoading(false);
      return;
    }
    load();
  }, [viewer.loading, viewer.signedIn, load]);

  const send = async (path, body, okKey, okText) => {
    setBusy(true);
    setProblem('');
    try {
      const res = await fetch(`${API}/partners/studios/tournament/${encodeURIComponent(tournamentRef)}/${path}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${viewer.token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body || {}),
      });
      const answer = await res.json().catch(() => ({}));
      if (!res.ok) {
        setProblem(apiMessage(tt, answer, 'partners.studioConnect.failed', 'That was not saved.'));
        return;
      }
      setData(answer.data);
      setPicked('');
      setValues({});
      setConfirmOff(false);
      say(tt(okKey, okText));
    } catch (err) {
      setProblem(apiMessage(tt, err, 'partners.studioConnect.failed', 'That was not saved.'));
    } finally {
      setBusy(false);
    }
  };

  const connect = () => {
    const game = (data?.available || []).find(g => g.slug === picked);
    const settings = {};
    settingFields(game?.settings_schema).forEach(({ name, spec }) => {
      const raw = values[name];
      if (raw === undefined || raw === '') return;
      if (spec.type === 'integer' || spec.type === 'number') settings[name] = Number(raw);
      else if (spec.type === 'boolean') settings[name] = Boolean(raw);
      else settings[name] = raw;
    });
    send('connect/', { game: picked, settings }, 'partners.studioConnect.connected', 'Connected. Ready matches will open lobbies in the game.');
  };

  if (!viewer.signedIn) return null;

  const link = data?.link;
  const available = data?.available || [];
  const chosen = available.find(g => g.slug === picked);

  return (
    <section className={styles.wrap} aria-labelledby="studio-connect-title">
      <h2 id="studio-connect-title" className={styles.title}>{tt('partners.studioConnect.title', 'Game integration')}</h2>
      <p className={styles.muted}>
        {tt('partners.studioConnect.body', 'Run this tournament\'s matches inside a game. When a match is ready, V-ENT asks the game to open a lobby, the room code appears in the match room, and the game\'s result is recorded on the match. You can still correct any result by hand.')}
      </p>

      {loading && <p className={styles.muted}>{tt('ui.loading.b04b', 'Loading...')}</p>}
      {!loading && error && (
        <div className={styles.errorRow} role="alert">
          <p className={styles.error}>{error}</p>
          <button type="button" className={styles.ghost} onClick={() => load()}>{tt('common.tryAgain', 'Try again')}</button>
        </div>
      )}

      {!loading && !error && data && (
        <>
          {link && link.active ? (
            <div className={styles.card}>
              <div className={styles.rowBetween}>
                <div>
                  <p className={styles.name}>{link.game.name}</p>
                  <p className={styles.muted}>{link.game.studio}</p>
                </div>
                <span className={`${styles.chip} ${link.game.environment === 'live' ? styles.chipLive : ''}`}>
                  {link.game.environment === 'live'
                    ? tt('partners.studioConnect.live', 'Live game')
                    : tt('partners.studioConnect.sandbox', 'Sandbox game: your own tests only')}
                </span>
              </div>
              {Object.keys(link.settings || {}).length > 0 && (
                <dl className={styles.meta}>
                  {Object.entries(link.settings).map(([name, value]) => (
                    <div key={name}>
                      <dt>{link.game.settings_schema?.properties?.[name]?.title || name}</dt>
                      <dd>{String(value)}</dd>
                    </div>
                  ))}
                </dl>
              )}
              <div className={styles.actions}>
                {confirmOff ? (
                  <>
                    <span className={styles.muted}>{tt('partners.studioConnect.offAsk', 'Open lobbies are cancelled and new matches stop opening them. Go ahead?')}</span>
                    <button type="button" className={styles.danger} disabled={busy}
                            onClick={() => send('disconnect/', {}, 'partners.studioConnect.disconnected', 'Disconnected.')}>
                      {tt('partners.studioConnect.offYes', 'Yes, disconnect')}
                    </button>
                    <button type="button" className={styles.ghost} disabled={busy} onClick={() => setConfirmOff(false)}>
                      {tt('partners.studioConnect.cancel', 'Cancel')}
                    </button>
                  </>
                ) : (
                  <button type="button" className={styles.ghost} disabled={busy} onClick={() => setConfirmOff(true)}>
                    {tt('partners.studioConnect.off', 'Disconnect')}
                  </button>
                )}
              </div>
            </div>
          ) : available.length === 0 ? (
            <p className={styles.muted}>{tt('partners.studioConnect.none', 'No game on V-ENT runs this tournament\'s game yet.')}</p>
          ) : (
            <div className={styles.card}>
              <p className={styles.label}>{tt('partners.studioConnect.pick', 'Choose the game that runs the matches')}</p>
              <div className={styles.options} role="radiogroup">
                {available.map(game => (
                  <button key={game.slug} type="button" role="radio" aria-checked={picked === game.slug}
                          className={`${styles.option} ${picked === game.slug ? styles.optionOn : ''}`}
                          onClick={() => { setPicked(game.slug); setValues({}); }}>
                    <span className={styles.name}>{game.name}</span>
                    <span className={styles.muted}>
                      {game.studio}{' · '}
                      {game.environment === 'live'
                        ? tt('partners.studioConnect.live', 'Live game')
                        : tt('partners.studioConnect.sandbox', 'Sandbox game: your own tests only')}
                    </span>
                  </button>
                ))}
              </div>
              {chosen && settingFields(chosen.settings_schema).map(({ name, spec, required }) => (
                <label key={name} className={styles.field}>
                  <span className={styles.label}>
                    {spec.title || name}
                    {required ? ` (${tt('partners.studioConnect.required', 'required')})` : ''}
                  </span>
                  {Array.isArray(spec.enum) ? (
                    <select className={styles.input} value={values[name] ?? ''}
                            onChange={e => setValues({ ...values, [name]: e.target.value })}>
                      <option value="">{tt('partners.studioConnect.choose', 'Choose')}</option>
                      {spec.enum.map(option => <option key={String(option)} value={String(option)}>{String(option)}</option>)}
                    </select>
                  ) : spec.type === 'boolean' ? (
                    <input type="checkbox" checked={Boolean(values[name])}
                           onChange={e => setValues({ ...values, [name]: e.target.checked })} />
                  ) : (
                    <input className={styles.input} value={values[name] ?? ''}
                           inputMode={spec.type === 'integer' || spec.type === 'number' ? 'numeric' : 'text'}
                           onChange={e => setValues({ ...values, [name]: e.target.value })} />
                  )}
                  {spec.description && <span className={styles.hint}>{spec.description}</span>}
                </label>
              ))}
              <div className={styles.actions}>
                <button type="button" className={styles.primary} disabled={busy || !picked} onClick={connect}>
                  {tt('partners.studioConnect.connect', 'Connect')}
                </button>
              </div>
            </div>
          )}

          {problem && <p className={styles.problem} role="alert">{problem}</p>}

          <h3 className={styles.subTitle}>{tt('partners.studioConnect.sessions', 'Games played through the integration')}</h3>
          {(data.sessions || []).length === 0 ? (
            <p className={styles.muted}>{tt('partners.studioConnect.noSessions', 'None yet. A lobby opens when a match has both sides and is due.')}</p>
          ) : (
            <ul className={styles.list}>
              {data.sessions.map(row => (
                <li key={row.ref} className={styles.row}>
                  <div className={styles.rowHead}>
                    <span className={styles.name}>
                      {tt('partners.studioConnect.matchLabel', 'Round {round}, match {number}, game {game}')
                        .replace('{round}', String(row.match?.round ?? ''))
                        .replace('{number}', String(row.match?.number ?? ''))
                        .replace('{game}', String(row.game_number))}
                      {row.attempt > 1 ? ` (${tt('partners.studioConnect.attempt', 'try {n}').replace('{n}', String(row.attempt))})` : ''}
                    </span>
                    <span className={`${styles.chip} ${row.outcome === 'needs_organiser' ? styles.chipAlert : ''}`}>
                      {stateLabel(tt, row.state)}
                    </span>
                  </div>
                  {row.scores && (
                    <p className={styles.muted}>{`${row.scores.p1} - ${row.scores.p2}`}</p>
                  )}
                  {outcomeLabel(tt, row) && (
                    <p className={row.outcome === 'needs_organiser' ? styles.alert : styles.muted}>{outcomeLabel(tt, row)}</p>
                  )}
                  <p className={styles.time}>{formatDateTime(row.updated_at)}</p>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}
