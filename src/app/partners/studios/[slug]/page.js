'use client';

import { use, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Header from '@/components/header/Header';
import MobileHeader from '@/components/mobile-header/MobileHeader';
import Sidebar from '@/components/sidebar/Sidebar';
import BottomMenu from '@/components/bottom-menu/BottomMenu';
import BackLink from '@/components/back-link/BackLink';
import ErrorState from '@/components/error-state/ErrorState';
import { useT } from '@/i18n/LanguageProvider';
import { apiMessage } from '@/lib/apiMessage';
import { formatDateTime } from '@/lib/datetime';
import { signInHref, useViewer } from '@/lib/gating';
import { useAutoRefresh } from '@/lib/useLiveData';
import {
  liveFieldLabel, resultProblemLabel, studioEventLabel, studioStatus, studioStatusLabel,
} from '@/components/studio-portal/studioLabels';
import DeliveryLog from '@/components/studio-portal/DeliveryLog';
import UsagePanel from '@/components/studio-portal/UsagePanel';
import styles from '../studios.module.css';

// `/partners/studios/<game>` - one game's settings (design section 14, item 1).
//
// Each panel saves only its own fields, so changing the scoring expression can
// never resend a webhook address somebody else just edited. JSON is checked in
// the browser before it is sent, and the server checks it again and answers
// with a code this page translates. "Try it" scores a pasted result without
// saving anything, which is how a studio finds out its expression is wrong
// before a final rather than during one.

const API = process.env.NEXT_PUBLIC_API_URL;

const SAMPLE = JSON.stringify({
  lineups: [
    { side: 1, score: 13, won: true },
    { side: 2, score: 7, won: false },
  ],
  competitors: [
    { account_id: 'player-one', side: 1, kills: 9 },
    { account_id: 'player-two', side: 2, kills: 4 },
  ],
  general: {},
}, null, 2);

const asText = value => (value && Object.keys(value).length ? JSON.stringify(value, null, 2) : '');

export default function StudioGamePage(props) {
  const params = use(props.params);
  const slug = decodeURIComponent(params.slug);
  const tt = useT();
  const router = useRouter();
  const viewer = useViewer();

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [missing, setMissing] = useState(false);
  const [game, setGame] = useState(null);
  const [events, setEvents] = useState([]);
  const [keywords, setKeywords] = useState([]);
  const [testerLimit, setTesterLimit] = useState(20);
  const [titles, setTitles] = useState([]);

  const [connection, setConnection] = useState(null);
  const [results, setResults] = useState(null);
  const [subscribed, setSubscribed] = useState([]);
  const [busy, setBusy] = useState('');
  const [problems, setProblems] = useState({});
  const [toast, setToast] = useState('');
  const [newSecret, setNewSecret] = useState('');
  const [confirmRotate, setConfirmRotate] = useState(false);
  const [sample, setSample] = useState(SAMPLE);
  const [sampleSettings, setSampleSettings] = useState('');
  const [trial, setTrial] = useState(null);

  const say = message => {
    setToast(message);
    window.setTimeout(() => setToast(''), 4000);
  };

  // Put a freshly answered game into every panel's draft.
  const adopt = useCallback(row => {
    setGame(row);
    setConnection({
      name: row.name,
      game_id: row.game?.id ? String(row.game.id) : '',
      session_webhook_url: row.session_webhook_url || '',
      events_webhook_url: row.events_webhook_url || '',
      testers: (row.testers || []).join('\n'),
    });
    setResults({
      result_schema: asText(row.result_schema),
      scoring_expression: row.scoring_expression || '',
      settings_schema: asText(row.settings_schema),
    });
    setSubscribed(row.subscribed_events || []);
  }, []);

  const load = useCallback(async ({ quiet = false } = {}) => {
    if (!viewer.token) return;
    if (!quiet) setLoading(true);
    try {
      const res = await fetch(`${API}/partners/studios/${encodeURIComponent(slug)}/`, {
        headers: { Authorization: `Bearer ${viewer.token}` },
      });
      const body = await res.json().catch(() => ({}));
      if (body?.status === 'moved' && body.data?.url) {
        router.replace(body.data.url);
        return;
      }
      if (res.status === 404) {
        setMissing(true);
        setLoadError(null);
        return;
      }
      if (!res.ok) {
        setLoadError(apiMessage(tt, body, 'partners.studios.loadOneFailed', 'This game did not load.'));
        return;
      }
      setMissing(false);
      setLoadError(null);
      setEvents(body.data.events || []);
      setKeywords(body.data.schema_keywords || []);
      setTesterLimit(body.data.limits?.testers || 20);
      // A quiet refresh keeps somebody's half-typed changes: it only updates
      // the status shown at the top.
      if (quiet) setGame(body.data.game);
      else adopt(body.data.game);
    } catch (err) {
      setLoadError(apiMessage(tt, err, 'partners.studios.loadOneFailed', 'This game did not load.'));
    } finally {
      setLoading(false);
    }
  }, [viewer.token, slug, tt, router, adopt]);

  useAutoRefresh(() => load({ quiet: true }));
  useEffect(() => {
    if (viewer.loading) return;
    if (!viewer.signedIn) {
      setLoading(false);
      return;
    }
    load();
  }, [viewer.loading, viewer.signedIn, load]);

  useEffect(() => {
    let alive = true;
    fetch(`${API}/auth/games/`)
      .then(res => (res.ok ? res.json() : null))
      .then(body => { if (alive && body?.data) setTitles(body.data); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  const send = async (path, payload, panel, okText, failKey, failText) => {
    setBusy(panel);
    setProblems(current => ({ ...current, [panel]: '' }));
    try {
      const res = await fetch(`${API}/partners/studios/${encodeURIComponent(game.slug)}/${path}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${viewer.token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload || {}),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setProblems(current => ({ ...current, [panel]: apiMessage(tt, body, failKey, failText) }));
        return null;
      }
      if (okText) say(okText);
      return body.data;
    } catch (err) {
      setProblems(current => ({ ...current, [panel]: apiMessage(tt, err, failKey, failText) }));
      return null;
    } finally {
      setBusy('');
    }
  };

  const readJson = (text, label, panel) => {
    if (!text.trim()) return {};
    try {
      return JSON.parse(text);
    } catch {
      setProblems(current => ({
        ...current,
        [panel]: tt('partners.studios.badJson', '{field} is not valid JSON.').replace('{field}', label),
      }));
      return undefined;
    }
  };

  const saveConnection = async () => {
    const answer = await send('update/', {
      name: connection.name,
      game_id: connection.game_id ? Number(connection.game_id) : null,
      session_webhook_url: connection.session_webhook_url,
      events_webhook_url: connection.events_webhook_url,
      testers: connection.testers.split(/[\s,]+/).map(s => s.trim()).filter(Boolean),
    }, 'connection', tt('partners.studios.saved', 'Saved.'), 'partners.studios.saveFailed', 'That was not saved.');
    if (answer?.game) {
      adopt(answer.game);
      if (answer.game.slug !== slug) router.replace(`/partners/studios/${answer.game.slug}`);
    }
  };

  const saveResults = async () => {
    const schema = readJson(results.result_schema, tt('partners.studios.schema', 'Result schema'), 'results');
    if (schema === undefined) return;
    const settingsSchema = readJson(results.settings_schema, tt('partners.studios.settingsSchema', 'Game settings schema'), 'results');
    if (settingsSchema === undefined) return;
    const answer = await send('update/', {
      result_schema: schema,
      scoring_expression: results.scoring_expression,
      settings_schema: settingsSchema,
    }, 'results', tt('partners.studios.saved', 'Saved.'), 'partners.studios.saveFailed', 'That was not saved.');
    if (answer?.game) adopt(answer.game);
  };

  const saveEvents = async () => {
    const answer = await send('update/', { subscribed_events: subscribed }, 'events',
      tt('partners.studios.saved', 'Saved.'), 'partners.studios.saveFailed', 'That was not saved.');
    if (answer?.game) adopt(answer.game);
  };

  const rotate = async () => {
    const answer = await send('rotate-secret/', {}, 'secret', tt('partners.studios.rotated', 'New secret made.'),
      'partners.studios.rotateFailed', 'The secret was not rotated.');
    setConfirmRotate(false);
    if (answer) {
      setNewSecret(answer.signing_secret);
      setGame(answer.game);
    }
  };

  const tryIt = async () => {
    setTrial(null);
    const result = readJson(sample, tt('partners.studios.sample', 'Sample result'), 'try');
    if (result === undefined) return;
    const settings = readJson(sampleSettings, tt('partners.studios.sampleSettings', 'Settings for this sample'), 'try');
    if (settings === undefined) return;
    const schema = readJson(results.result_schema, tt('partners.studios.schema', 'Result schema'), 'try');
    if (schema === undefined) return;
    const answer = await send('try-scoring/', {
      result, settings, result_schema: schema, scoring_expression: results.scoring_expression,
    }, 'try', '', 'partners.studios.tryFailed', 'That could not be scored.');
    if (answer) setTrial(answer);
  };

  const askLive = async () => {
    setBusy('live');
    setProblems(current => ({ ...current, live: '' }));
    try {
      const res = await fetch(`${API}/partners/studios/${encodeURIComponent(game.slug)}/request-live/`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${viewer.token}`, 'Content-Type': 'application/json' },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        const fields = body?.data?.missing || [];
        const text = fields.length
          ? tt('partners.studios.liveMissing', 'Fill these in first: {fields}.')
            .replace('{fields}', fields.map(f => liveFieldLabel(tt, f)).join(', '))
          : apiMessage(tt, body, 'partners.studios.liveFailed', 'That was not sent.');
        setProblems(current => ({ ...current, live: text }));
        return;
      }
      setGame(body.data.game);
      say(tt('partners.studios.liveAsked', 'Sent for review.'));
    } catch (err) {
      setProblems(current => ({ ...current, live: apiMessage(tt, err, 'partners.studios.liveFailed', 'That was not sent.') }));
    } finally {
      setBusy('');
    }
  };

  const toggleEvent = kind => setSubscribed(current => (
    current.includes(kind) ? current.filter(k => k !== kind) : [...current, kind]));

  const state = studioStatus(game);
  const problemList = rows => (
    <ul className={styles.problems}>
      {rows.map(row => (
        <li key={`${row.path}-${row.code}`} className={styles.problem}>
          <code>{row.path}</code> {resultProblemLabel(tt, row.code)}
        </li>
      ))}
    </ul>
  );

  return (
    <div className={styles.page}>
      <Header />
      <MobileHeader />
      <main className={styles.main}>
        <Sidebar />
        <section className={styles.content}>
          <BackLink href="/partners/studios">{tt('partners.studios.backToGames', 'Your games')}</BackLink>

          {/* One h1, whatever the state: who is reading decides what it says. */}
          {!viewer.loading && !(viewer.signedIn && loading) && (
            <h1 className={styles.pageTitle}>
              {!viewer.signedIn
                ? tt('partners.studios.signInTitle', 'Sign in to connect a game')
                : missing || !game
                  ? tt('partners.studios.notFoundTitle', 'No such game')
                  : game.name}
            </h1>
          )}

          {(viewer.loading || (viewer.signedIn && loading)) && (
            <p className={styles.muted}>{tt('ui.loading.b04b', 'Loading...')}</p>
          )}

          {!viewer.loading && !viewer.signedIn && (
            <div className={styles.panel}>
              <p className={styles.muted}>
                {tt('partners.studios.signInBody', 'A game belongs to a partner account, and a partner account belongs to a V-ENT account.')}
              </p>
              <div className={styles.actions}>
                <Link href={signInHref(`/partners/studios/${slug}`)} className={styles.primaryBtn}>
                  {tt('partners.studios.signIn', 'Sign in')}
                </Link>
              </div>
            </div>
          )}

          {viewer.signedIn && !loading && loadError && <ErrorState message={loadError} onRetry={() => load()} />}

          {viewer.signedIn && !loading && !loadError && missing && (
            <div className={styles.panel}>
              <p className={styles.muted}>{tt('partners.studios.notFound', 'There is no game at this address, or it belongs to another studio.')}</p>
            </div>
          )}

          {viewer.signedIn && !loading && !loadError && !missing && game && connection && results && (
            <>
              <header className={styles.pageHead}>
                <div className={styles.rowBetween}>
                  <span className={`${styles.chip} ${styles[`chip_${state}`] || ''}`}>{studioStatusLabel(tt, state)}</span>
                </div>
                <p className={styles.pageSub}>{game.game?.title || tt('partners.studios.noVentGame', 'No V-ENT game chosen')}</p>
              </header>

              {/* ------------------------------------------------ connection */}
              <div className={styles.panel}>
                <h2 className={styles.panelTitle}>{tt('partners.studios.connection', 'Connection')}</h2>
                <div className={styles.formGrid}>
                  <label className={styles.field}>
                    <span className={styles.label}>{tt('partners.studios.name', 'Name')}</span>
                    <input className={styles.input} value={connection.name} maxLength={120}
                           onChange={e => setConnection({ ...connection, name: e.target.value })} />
                  </label>
                  <label className={styles.field}>
                    <span className={styles.label}>{tt('partners.studios.ventGame', 'The V-ENT game it serves')}</span>
                    <select className={styles.select} value={connection.game_id}
                            onChange={e => setConnection({ ...connection, game_id: e.target.value })}>
                      <option value="">{tt('partners.studios.chooseGame', 'Choose a game')}</option>
                      {titles.map(title => <option key={title.id} value={title.id}>{title.name}</option>)}
                    </select>
                  </label>
                </div>
                <label className={styles.field}>
                  <span className={styles.label}>{tt('partners.studios.sessionUrl', 'Game session address')}</span>
                  <input className={styles.input} value={connection.session_webhook_url} inputMode="url"
                         onChange={e => setConnection({ ...connection, session_webhook_url: e.target.value })} />
                  <span className={styles.hint}>{tt('partners.studios.sessionUrlHint', 'We call this to create and cancel lobbies. It must be https.')}</span>
                </label>
                <label className={styles.field}>
                  <span className={styles.label}>{tt('partners.studios.eventsUrl', 'Events address')}</span>
                  <input className={styles.input} value={connection.events_webhook_url} inputMode="url"
                         onChange={e => setConnection({ ...connection, events_webhook_url: e.target.value })} />
                  <span className={styles.hint}>{tt('partners.studios.eventsUrlHint', 'We send events here. Leave it empty to use the game session address.')}</span>
                </label>
                <label className={styles.field}>
                  <span className={styles.label}>{tt('partners.studios.testers', 'Testers')}</span>
                  <textarea className={styles.textarea} rows={3} value={connection.testers}
                            onChange={e => setConnection({ ...connection, testers: e.target.value })} />
                  <span className={styles.hint}>
                    {tt('partners.studios.testersHint', 'Usernames of V-ENT accounts that may play your sandbox game, one per line. Up to {limit}.').replace('{limit}', String(testerLimit))}
                  </span>
                </label>
                {problems.connection && <p className={styles.problem} role="alert">{problems.connection}</p>}
                <div className={styles.actions}>
                  <button type="button" className={styles.primaryBtn} onClick={saveConnection}
                          disabled={busy !== '' || !connection.name.trim()}>
                    {busy === 'connection' ? tt('partners.studios.saving', 'Saving...') : tt('partners.studios.save', 'Save')}
                  </button>
                </div>
              </div>

              {/* ---------------------------------------------------- secret */}
              <div className={styles.panel}>
                <h2 className={styles.panelTitle}>{tt('partners.studios.secretTitle', 'Signing secret')}</h2>
                <p className={styles.muted}>
                  {tt('partners.studios.secretBody', 'Every request between V-ENT and your servers is signed with this secret. The one we hold ends in {hint}.').replace('{hint}', game.secret_hint || '----')}
                </p>
                {game.previous_valid_until && (
                  <p className={styles.muted}>
                    {tt('partners.studios.secretOverlap', 'The previous secret keeps working until {time}.').replace('{time}', formatDateTime(game.previous_valid_until))}
                  </p>
                )}
                {newSecret && (
                  <div className={styles.secretBox} role="status">
                    <p className={styles.secretLabel}>{tt('partners.studios.newSecretLabel', 'Your new signing secret. Copy it now: it is not shown again.')}</p>
                    <code className={styles.code}>{newSecret}</code>
                  </div>
                )}
                {problems.secret && <p className={styles.problem} role="alert">{problems.secret}</p>}
                <div className={styles.actions}>
                  {confirmRotate ? (
                    <>
                      <span className={styles.muted}>{tt('partners.studios.rotateAsk', 'A new secret now; the old one keeps working for 24 hours. Go ahead?')}</span>
                      <button type="button" className={styles.dangerBtn} onClick={rotate} disabled={busy !== ''}>
                        {tt('partners.studios.rotateYes', 'Yes, rotate it')}
                      </button>
                      <button type="button" className={styles.ghostBtn} onClick={() => setConfirmRotate(false)} disabled={busy !== ''}>
                        {tt('partners.studios.cancel', 'Cancel')}
                      </button>
                    </>
                  ) : (
                    <button type="button" className={styles.ghostBtn} onClick={() => setConfirmRotate(true)} disabled={busy !== ''}>
                      {tt('partners.studios.rotate', 'Rotate the secret')}
                    </button>
                  )}
                </div>
              </div>

              {/* --------------------------------------------------- results */}
              <div className={styles.panel}>
                <h2 className={styles.panelTitle}>{tt('partners.studios.resultsTitle', 'Results and scoring')}</h2>
                <p className={styles.muted}>
                  {tt('partners.studios.resultsBody', 'Your game posts each finished game session as raw results. V-ENT checks them against your schema, then scores each side with your expression.')}
                </p>
                <label className={`${styles.field} ${styles.spaced}`}>
                  <span className={styles.label}>{tt('partners.studios.expression', 'Scoring expression')}</span>
                  <input className={`${styles.input} ${styles.mono}`} value={results.scoring_expression} maxLength={500}
                         onChange={e => setResults({ ...results, scoring_expression: e.target.value })} />
                  <span className={styles.hint}>
                    {tt('partners.studios.expressionHint', 'Worked out for each side. Names you can use: team, opponent, competitors, global, settings. Example: team.roundsWon + competitors.sum(it.kills)')}
                  </span>
                </label>
                <label className={styles.field}>
                  <span className={styles.label}>{tt('partners.studios.schema', 'Result schema')}</span>
                  <textarea className={`${styles.textarea} ${styles.mono}`} rows={8} value={results.result_schema}
                            onChange={e => setResults({ ...results, result_schema: e.target.value })} />
                  <span className={styles.hint}>
                    {tt('partners.studios.schemaHint', 'JSON Schema. Keywords V-ENT checks: {keywords}. Any other keyword is refused.').replace('{keywords}', keywords.join(', '))}
                  </span>
                </label>
                <label className={styles.field}>
                  <span className={styles.label}>{tt('partners.studios.settingsSchema', 'Game settings schema')}</span>
                  <textarea className={`${styles.textarea} ${styles.mono}`} rows={5} value={results.settings_schema}
                            onChange={e => setResults({ ...results, settings_schema: e.target.value })} />
                  <span className={styles.hint}>
                    {tt('partners.studios.settingsSchemaHint', 'What an organiser chooses for your game, such as the map or the mode. Optional.')}
                  </span>
                </label>
                {problems.results && <p className={styles.problem} role="alert">{problems.results}</p>}
                <div className={styles.actions}>
                  <button type="button" className={styles.primaryBtn} onClick={saveResults} disabled={busy !== ''}>
                    {busy === 'results' ? tt('partners.studios.saving', 'Saving...') : tt('partners.studios.save', 'Save')}
                  </button>
                </div>

                <h3 className={styles.subTitle}>{tt('partners.studios.tryTitle', 'Try it')}</h3>
                <p className={styles.muted}>
                  {tt('partners.studios.tryBody', 'Paste a result your game would send and see the score each side gets, with the expression and schema above, saved or not.')}
                </p>
                <label className={`${styles.field} ${styles.spaced}`}>
                  <span className={styles.label}>{tt('partners.studios.sample', 'Sample result')}</span>
                  <textarea className={`${styles.textarea} ${styles.mono}`} rows={10} value={sample}
                            onChange={e => setSample(e.target.value)} />
                </label>
                <label className={styles.field}>
                  <span className={styles.label}>{tt('partners.studios.sampleSettings', 'Settings for this sample')}</span>
                  <textarea className={`${styles.textarea} ${styles.mono}`} rows={2} value={sampleSettings}
                            placeholder='{"mode": "Classic"}'
                            onChange={e => setSampleSettings(e.target.value)} />
                </label>
                {problems.try && <p className={styles.problem} role="alert">{problems.try}</p>}
                <div className={styles.actions}>
                  <button type="button" className={styles.ghostBtn} onClick={tryIt} disabled={busy !== ''}>
                    {tt('partners.studios.tryRun', 'Score this')}
                  </button>
                </div>
                {trial && trial.envelope_errors?.length > 0 && (
                  <>
                    <p className={`${styles.muted} ${styles.spaced}`}>{tt('partners.studios.envelopeProblems', 'This is not a V-ENT result:')}</p>
                    {problemList(trial.envelope_errors)}
                  </>
                )}
                {trial && trial.schema_errors?.length > 0 && (
                  <>
                    <p className={`${styles.muted} ${styles.spaced}`}>{tt('partners.studios.schemaProblems', 'It breaks your schema:')}</p>
                    {problemList(trial.schema_errors)}
                  </>
                )}
                {trial?.scores && (
                  <div className={styles.scoreRow} role="status">
                    <div className={styles.score}>
                      <span className={styles.scoreLabel}>{tt('partners.studios.side1', 'Side 1')}</span>
                      <span className={styles.scoreValue}>{trial.scores[0]}</span>
                    </div>
                    <div className={styles.score}>
                      <span className={styles.scoreLabel}>{tt('partners.studios.side2', 'Side 2')}</span>
                      <span className={styles.scoreValue}>{trial.scores[1]}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* ---------------------------------------------------- events */}
              <div className={styles.panel}>
                <h2 className={styles.panelTitle}>{tt('partners.studios.eventsTitle', 'Events')}</h2>
                <p className={styles.muted}>
                  {tt('partners.studios.eventsBody', 'What we send to your events address. Tick none to receive every event.')}
                </p>
                <div className={`${styles.checkGrid} ${styles.spaced}`}>
                  {events.map(kind => (
                    <label key={kind} className={styles.checkRow}>
                      <input type="checkbox" checked={subscribed.includes(kind)} onChange={() => toggleEvent(kind)} />
                      <span>{studioEventLabel(tt, kind)}</span>
                    </label>
                  ))}
                </div>
                {problems.events && <p className={styles.problem} role="alert">{problems.events}</p>}
                <div className={styles.actions}>
                  <button type="button" className={styles.primaryBtn} onClick={saveEvents} disabled={busy !== ''}>
                    {busy === 'events' ? tt('partners.studios.saving', 'Saving...') : tt('partners.studios.save', 'Save')}
                  </button>
                </div>
              </div>

              {/* ---------------------------------------------- delivery log */}
              <div className={styles.panel}>
                <h2 className={styles.panelTitle}>{tt('partners.studios.log.title', 'Delivery log')}</h2>
                <p className={styles.muted}>
                  {tt('partners.studios.log.body', 'Every request we sent your servers, signed with your secret, and what they answered. A failed delivery is tried again for about two days.')}
                </p>
                <DeliveryLog slug={game.slug} token={viewer.token} />
              </div>

              {/* ----------------------------------------------------- usage */}
              <div className={styles.panel}>
                <h2 className={styles.panelTitle}>{tt('partners.studios.usage.title', 'Usage')}</h2>
                <p className={styles.muted}>
                  {tt('partners.studios.usage.body', 'Linked players who played and game sessions played, by month, counted from your first game session. Nothing is charged for it today.')}
                </p>
                <UsagePanel slug={game.slug} />
              </div>

              {/* ------------------------------------------------------ live */}
              <div className={styles.panel}>
                <h2 className={styles.panelTitle}>{tt('partners.studios.liveTitle', 'Going live')}</h2>
                <p className={styles.muted}>
                  {tt('partners.studios.liveBody', 'A live game runs matches in any tournament of its V-ENT game whose organiser connects it. A V-ENT admin reviews it first.')}
                </p>
                {state === 'live' && <p className={`${styles.muted} ${styles.spaced}`}>{tt('partners.studios.liveNow', 'This game is live.')}</p>}
                {state === 'requested' && <p className={`${styles.muted} ${styles.spaced}`}>{tt('partners.studios.liveWaiting', 'Waiting for a V-ENT admin to review it.')}</p>}
                {game.review_note && (
                  <p className={`${styles.muted} ${styles.spaced}`}>
                    {tt('partners.studios.reviewNote', 'Note from the reviewer: {note}').replace('{note}', game.review_note)}
                  </p>
                )}
                {problems.live && <p className={styles.problem} role="alert">{problems.live}</p>}
                {(state === 'sandbox' || state === 'rejected') && (
                  <div className={styles.actions}>
                    <button type="button" className={styles.primaryBtn} onClick={askLive} disabled={busy !== ''}>
                      {tt('partners.studios.liveAsk', 'Ask to go live')}
                    </button>
                  </div>
                )}
              </div>
            </>
          )}

          {toast && <div className={styles.toast}>{toast}</div>}
        </section>
      </main>
      <BottomMenu />
    </div>
  );
}
