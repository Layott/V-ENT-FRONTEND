'use client';

// The organiser's blueprints, on My Tournaments (P7).
//
// Design section 16, P7: "blueprints and recurring tournaments". Each card is
// one blueprint: the tournament it copies, how often it runs, the next edition
// and when it is made, the editions it has made, and what can be done with it
// (make one now, make one for a date, pause or resume, change it, delete it).
// The rules live on the server (vent_tournament/blueprints.py); this shows
// them and asks.

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useT } from '@/i18n/LanguageProvider';
import { apiMessage } from '@/lib/apiMessage';
import { useAutoRefresh } from '@/lib/useLiveData';
import { formatWithZone, localInputToISO } from '@/lib/datetime';
import { nextEditionLine, pausedWords, scheduleSentence } from '@/lib/blueprintSchedule';
import DateField from '@/components/date-field/DateField';
import BlueprintForm from './BlueprintForm';
import styles from './blueprints.module.css';

const API = process.env.NEXT_PUBLIC_API_URL;

function Editions({ token, blueprintToken, tt }) {
  const [rows, setRows] = useState(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let gone = false;
    (async () => {
      try {
        const res = await fetch(`${API}/tournament/blueprints/${encodeURIComponent(blueprintToken)}/`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const body = await res.json().catch(() => ({}));
        if (!gone) {
          if (res.ok && body.status === 'success') setRows(body.data.editions || []);
          else setFailed(true);
        }
      } catch {
        if (!gone) setFailed(true);
      }
    })();
    return () => { gone = true; };
  }, [token, blueprintToken]);
  if (failed) return <p className={styles.problem}>{tt('blueprint.editionsFailed', 'Could not load the editions it made.')}</p>;
  if (rows === null) return <p className={styles.muted}>{tt('blueprint.editionsLoading', 'Loading the editions...')}</p>;
  if (!rows.length) return <p className={styles.muted}>{tt('blueprint.noEditions', 'It has not made an edition yet.')}</p>;
  return (
    <ul className={styles.editions}>
      {rows.map((t) => (
        <li key={t.slug} className={styles.edition}>
          <Link href={`/tournaments/${t.slug}/manage`} className={styles.editionLink}>{t.title}</Link>
          <span className={styles.muted}>{formatWithZone(t.starts_at)}</span>
          <span className={styles.tag}>
            {t.is_draft ? tt('blueprint.editionDraft', 'Draft') : tt('blueprint.editionPublished', 'Published')}
          </span>
        </li>
      ))}
    </ul>
  );
}

function BlueprintCard({ row, token, sources, onChanged, onMade, tt }) {
  const [mode, setMode] = useState(null); // null | 'edit' | 'date' | 'delete' | 'editions'
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const [problem, setProblem] = useState('');
  const [when, setWhen] = useState('');
  const base = `${API}/tournament/blueprints/${encodeURIComponent(row.token)}/`;
  const makeUrl = `${API}/tournament/blueprints/${encodeURIComponent(row.token)}/make/`;

  const send = async (url, method, body, done) => {
    setBusy(true);
    setNote('');
    setProblem('');
    try {
      const res = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      const answer = await res.json().catch(() => ({}));
      if (!res.ok || answer.status !== 'success') {
        setProblem(apiMessage(tt, answer, 'blueprint.failed', 'That did not work.'));
        return null;
      }
      setNote(done(answer.data));
      onChanged();
      return answer.data;
    } catch {
      setProblem(tt('api.networkProblem', 'The network is not answering. Try again.'));
      return null;
    } finally {
      setBusy(false);
    }
  };

  const madeWords = (data) => tt('blueprint.made', 'Made {title}.').replace('{title}', data.tournament.title);
  const paused = pausedWords(tt, row);
  const finished = Boolean(row.ends_after && row.made >= row.ends_after);

  return (
    <article className={styles.card}>
      <div className={styles.cardHead}>
        <div className={styles.cardText}>
          <h3 className={styles.cardTitle}>{row.name}</h3>
          <p className={styles.line}>
            {row.tournament
              ? <>
                  {tt('blueprint.copies', 'Copies')}{' '}
                  <Link href={`/tournaments/${row.tournament.slug}/manage`} className={styles.editionLink}>
                    {row.tournament.title}
                  </Link>
                </>
              : tt('blueprint.copiesNothing', 'The tournament it copied is gone.')}
          </p>
          <p className={styles.line}>{scheduleSentence(tt, row, formatWithZone)}</p>
          {row.active && !finished && <p className={styles.line}>{nextEditionLine(tt, row, formatWithZone)}</p>}
          {paused && <p className={styles.paused}>{paused}</p>}
          <p className={styles.muted}>
            {row.publish
              ? tt('blueprint.publishesEach', 'Each edition is published as it is made.')
              : tt('blueprint.draftsEach', 'Each edition waits as a draft for you to publish.')}
          </p>
        </div>
      </div>

      {note && <p className={styles.note} role="status">{note}</p>}
      {problem && <p className={styles.problem} role="alert">{problem}</p>}

      <div className={styles.actions}>
        {row.active && row.next_start && !finished && (
          <button type="button" className={styles.primary} disabled={busy}
                  onClick={async () => { if (await send(makeUrl, 'POST', {}, madeWords)) onMade?.(); }}>
            {tt('blueprint.makeNext', 'Make the next one now')}
          </button>
        )}
        {!finished && (
          <button type="button" className={styles.ghost} disabled={busy} aria-pressed={mode === 'date'}
                  onClick={() => setMode(mode === 'date' ? null : 'date')}>
            {tt('blueprint.makeForDate', 'Make one for a date')}
          </button>
        )}
        <button type="button" className={styles.ghost} disabled={busy}
                onClick={() => send(base, 'PATCH', { active: !row.active },
                  (data) => (data.blueprint.active
                    ? tt('blueprint.resumed', 'Running again.')
                    : tt('blueprint.pausedNow', 'Paused. Nothing is made until you resume it.')))}>
          {row.active ? tt('blueprint.pause', 'Pause') : tt('blueprint.resume', 'Resume')}
        </button>
        <button type="button" className={styles.ghost} disabled={busy} aria-pressed={mode === 'edit'}
                onClick={() => setMode(mode === 'edit' ? null : 'edit')}>
          {tt('blueprint.change', 'Change')}
        </button>
        <button type="button" className={styles.ghost} disabled={busy} aria-pressed={mode === 'editions'}
                onClick={() => setMode(mode === 'editions' ? null : 'editions')}>
          {tt('blueprint.editions', 'Editions made ({n})').replace('{n}', row.made)}
        </button>
        <button type="button" className={styles.ghost} disabled={busy} aria-pressed={mode === 'delete'}
                onClick={() => setMode(mode === 'delete' ? null : 'delete')}>
          {tt('blueprint.delete', 'Delete')}
        </button>
      </div>

      {mode === 'date' && (
        <div className={styles.sheet}>
          <p className={styles.label}>{tt('blueprint.oneOffWhen', 'When this edition starts')}</p>
          <DateField withTime value={when} disabled={busy} onChange={(e) => setWhen(e.target.value)} />
          <p className={styles.help}>{tt('blueprint.oneOffHelp', 'A one-off: the schedule carries on as it is.')}</p>
          <div className={styles.actions}>
            <button type="button" className={styles.primary} disabled={busy || !when}
                    onClick={async () => {
                      const data = await send(makeUrl, 'POST', { starts_at: localInputToISO(when) }, madeWords);
                      if (data) onMade?.();
                      if (data) { setMode(null); setWhen(''); }
                    }}>
              {tt('blueprint.makeIt', 'Make it')}
            </button>
          </div>
        </div>
      )}

      {mode === 'edit' && (
        <div className={styles.sheet}>
          <BlueprintForm initial={row} sources={sources?.length ? sources : null} busy={busy}
                         submitLabel={tt('blueprint.saveChanges', 'Save the changes')}
                         onCancel={() => setMode(null)}
                         onSubmit={async (body) => {
                           const data = await send(base, 'PATCH', body, () => tt('blueprint.saved', 'Saved.'));
                           if (data) setMode(null);
                         }} />
        </div>
      )}

      {mode === 'editions' && <div className={styles.sheet}><Editions token={token} blueprintToken={row.token} tt={tt} /></div>}

      {mode === 'delete' && (
        <div className={styles.sheet}>
          <p className={styles.line}>
            {tt('blueprint.deleteAsk', 'Delete this blueprint? The tournaments it made stay exactly as they are.')}
          </p>
          <div className={styles.actions}>
            <button type="button" className={styles.danger} disabled={busy}
                    onClick={() => send(base, 'DELETE', null, () => tt('blueprint.deleted', 'Deleted.'))}>
              {tt('blueprint.deleteYes', 'Delete it')}
            </button>
            <button type="button" className={styles.ghost} disabled={busy} onClick={() => setMode(null)}>
              {tt('blueprint.form.cancel', 'Cancel')}
            </button>
          </div>
        </div>
      )}
    </article>
  );
}

/**
 * @param token    the session token
 * @param sources  [{slug, title}] the tournaments this organiser runs, to copy from
 */
export default function BlueprintsPanel({ token, sources = [], onEditionMade }) {
  const tt = useT();
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');
  const [making, setMaking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');

  const load = useCallback(async ({ quiet = false } = {}) => {
    if (!token) return;
    try {
      const res = await fetch(`${API}/tournament/blueprints/`, { headers: { Authorization: `Bearer ${token}` } });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.status === 'success') {
        setRows(body.data.blueprints || []);
        if (!quiet) setError('');
      } else if (!quiet) {
        setError(apiMessage(tt, body, 'blueprint.loadFailed', 'Could not load your blueprints.'));
      }
    } catch {
      if (!quiet) setError(tt('api.networkProblem', 'The network is not answering. Try again.'));
    }
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);
  useAutoRefresh(() => load({ quiet: true }));

  const create = async (body) => {
    setBusy(true);
    setError('');
    setNote('');
    try {
      const res = await fetch(`${API}/tournament/blueprints/`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const answer = await res.json().catch(() => ({}));
      if (res.ok && answer.status === 'success') {
        setMaking(false);
        setNote(tt('blueprint.createdNote', 'Saved. {name} makes its editions from now on.')
          .replace('{name}', answer.data.blueprint.name));
        load({ quiet: true });
      } else {
        setError(apiMessage(tt, answer, 'blueprint.createFailed', 'That blueprint was not saved.'));
      }
    } catch {
      setError(tt('api.networkProblem', 'The network is not answering. Try again.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className={styles.panel} aria-labelledby="blueprints-title">
      <div className={styles.panelHead}>
        <div>
          <h2 id="blueprints-title" className={styles.panelTitle}>{tt('blueprint.title', 'Blueprints')}</h2>
          <p className={styles.help}>
            {tt('blueprint.sub', 'A blueprint makes the next edition of a tournament you run, on a schedule or when you press. Each edition copies how the tournament is set up today, never who entered or what happened in it.')}
          </p>
        </div>
        {sources.length > 0 && !making && (
          <button type="button" className={styles.primary} onClick={() => setMaking(true)}>
            {tt('blueprint.new', 'New blueprint')}
          </button>
        )}
      </div>

      {note && <p className={styles.note} role="status">{note}</p>}
      {error && <p className={styles.problem} role="alert">{error}</p>}

      {making && (
        <div className={styles.sheet}>
          <BlueprintForm sources={sources} busy={busy}
                         initial={{ name: '' }}
                         submitLabel={tt('blueprint.createIt', 'Save the blueprint')}
                         onCancel={() => setMaking(false)} onSubmit={create} />
        </div>
      )}

      {rows === null && !error && <p className={styles.muted}>{tt('blueprint.loading', 'Loading your blueprints...')}</p>}
      {rows && rows.length === 0 && !making && (
        <p className={styles.empty}>
          {sources.length
            ? tt('blueprint.empty', 'No blueprints yet. Press New blueprint, or open a tournament you run and press Run it again.')
            : tt('blueprint.emptyNoSource', 'No blueprints yet. Create a tournament first; a blueprint makes the next edition of one you run.')}
        </p>
      )}
      {rows && rows.length > 0 && (
        <div className={styles.cards}>
          {rows.map((row) => (
            <BlueprintCard key={row.token} row={row} token={token} sources={sources} tt={tt}
                           onMade={onEditionMade}
                           onChanged={() => load({ quiet: true })} />
          ))}
        </div>
      )}
    </section>
  );
}
