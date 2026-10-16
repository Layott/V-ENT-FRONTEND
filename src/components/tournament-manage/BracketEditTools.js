'use client';

// Changing who is where inside a bracket that is already drawn (inbox 452).
//
// CEO, 13 October 2026: "note that the bracket system and formathas to be
// really fluid fr editing everything inside." The stage tools above this
// (StagesPanel) change a stage as a whole; these change the people in it:
//
//   * swap two entrants, in every match neither has played yet
//   * replace an entrant with somebody else entered in the tournament
//   * the record of every change made after the start, by whom and when
//
// Taking a result back off a match and changing how one match is played live
// in the match room, opened from the bracket below, because that is where an
// organiser is looking at the match. Every rule is the server's
// (bracket_edit.py); refusals come back as codes and are said here in the
// reader's language.

import { useCallback, useEffect, useState } from 'react';
import { apiMessage } from '@/lib/apiMessage';
import { formatDateTime } from '@/lib/datetime';
import { useT } from '@/i18n/LanguageProvider';
import { useAutoRefresh } from '@/lib/useLiveData';
import { plural } from '@/lib/plural';
import styles from './bracket-edit-tools.module.css';

const API = process.env.NEXT_PUBLIC_API_URL;

// The English behind each kind of change, which is also the fallback.
const KIND_WORDS = {
  adopt: 'Made the bracket the first stage',
  undraw: 'Undid a draw',
  unadvance: 'Opened a closed stage again',
  reformat: 'Changed a stage’s format and drew it again',
  swap: 'Swapped two entrants',
  replace: 'Replaced an entrant',
  reopen: 'Took a result off a match',
  rules: 'Changed how a match is played',
  plan: 'Changed the plan',
};

export default function BracketEditTools({ tournamentRef, token, showToast }) {
  const tt = useT();
  const [entrants, setEntrants] = useState([]);
  const [stages, setStages] = useState([]);
  const [edits, setEdits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState('');
  const [said, setSaid] = useState('');
  const [swap, setSwap] = useState({ a: '', b: '' });
  const [repl, setRepl] = useState({ out: '', in: '' });
  const [stageId, setStageId] = useState('');

  const auth = token ? { Authorization: `Bearer ${token}` } : {};

  const load = useCallback(async ({ quiet = false } = {}) => {
    if (!tournamentRef) { setLoading(false); return; }
    try {
      const [p, s, e] = await Promise.all([
        fetch(`${API}/tournament/get-tournament-participants/${tournamentRef}/`).then(r => r.json()),
        fetch(`${API}/tournament/${tournamentRef}/stages/`, { headers: auth }).then(r => r.json()),
        fetch(`${API}/tournament/${tournamentRef}/bracket/edits/`, { headers: auth }).then(r => r.json()),
      ]);
      if (p?.status !== 'success') throw new Error('participants');
      setEntrants((p.data.participants || []).filter(x => ['confirmed', 'pending'].includes(x.status)));
      const drawn = (s?.data?.stages || []).filter(x => x.drawn_at && x.status !== 'complete');
      setStages(drawn);
      setStageId(prev => (prev && drawn.some(x => String(x.id) === String(prev)) ? prev : (drawn[0] ? String(drawn[0].id) : '')));
      setEdits(e?.status === 'success' ? (e.data.edits || []) : []);
      setFailed(false);
    } catch {
      if (!quiet) setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [tournamentRef, token]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);
  useAutoRefresh(() => load({ quiet: true }));

  const nameOf = id => entrants.find(x => String(x.registration_id) === String(id))?.participant?.name || '';

  const send = async (path, payload, done) => {
    setBusy(true);
    setProblem('');
    setSaid('');
    try {
      const res = await fetch(`${API}/tournament/${tournamentRef}/${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...auth },
        body: JSON.stringify({ ...payload, ...(stageId ? { stage_id: Number(stageId) } : {}) }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.status === 'success') {
        const text = done(body.data || {});
        setSaid(text);
        if (showToast) showToast(text);
        load({ quiet: true });
        return true;
      }
      setProblem(apiMessage(tt, body, 'bracketEdit.failed', 'That change was not made.'));
    } catch {
      setProblem(tt('api.NETWORK_UNREACHABLE', 'Could not reach the server. Check the connection and try again.'));
    } finally {
      setBusy(false);
    }
    return false;
  };

  const doSwap = async () => {
    const ok = await send('bracket/swap/', { a: Number(swap.a), b: Number(swap.b) }, d =>
      plural(tt, d.matches_changed ?? 0,
        'bracketEdit.swappedOne', '{a} and {b} have swapped places in 1 match.',
        'bracketEdit.swapped', '{a} and {b} have swapped places in {n} matches.')
        .replace('{a}', nameOf(swap.a)).replace('{b}', nameOf(swap.b)));
    if (ok) setSwap({ a: '', b: '' });
  };

  const doReplace = async () => {
    const ok = await send('bracket/replace/', { out: Number(repl.out), in: Number(repl.in) }, d =>
      plural(tt, d.matches_changed ?? 0,
        'bracketEdit.replacedOne', '{in} takes {out}’s place in 1 match.',
        'bracketEdit.replaced', '{in} takes {out}’s place in {n} matches.')
        .replace('{in}', nameOf(repl.in)).replace('{out}', nameOf(repl.out)));
    if (ok) setRepl({ out: '', in: '' });
  };

  if (loading) return <section className={styles.panel}><p className={styles.muted}>{tt('ui.loading.33ce', 'Loading…')}</p></section>;
  if (failed) {
    return (
      <section className={styles.panel}>
        <p className={styles.problem} role="alert">{tt('bracketEdit.loadFailed', 'The bracket tools could not be loaded.')}</p>
        <button type="button" className={styles.quiet} onClick={() => { setLoading(true); load(); }}>
          {tt('ui.tryAgain', 'Try again')}
        </button>
      </section>
    );
  }

  const options = entrants.map(x => (
    <option key={x.registration_id} value={x.registration_id}>{x.participant?.name || '-'}</option>
  ));

  return (
    <section className={styles.panel}>
      <h3 className={styles.title}>{tt('bracketEdit.title', 'Change who is in the bracket')}</h3>
      <p className={styles.sub}>
        {tt('bracketEdit.sub', 'For matches nobody has played yet. Results already in stay as they were played. To take a result off a match, or change how one is played, open the match in the bracket below.')}
      </p>

      {problem && <p className={styles.problem} role="alert">{problem}</p>}
      {said && <p className={styles.said} role="status">{said}</p>}

      {stages.length > 1 && (
        <label className={styles.field}>
          <span className={styles.label}>{tt('bracketEdit.stage', 'In which stage')}</span>
          <select className={styles.select} value={stageId} disabled={busy}
                  onChange={e => setStageId(e.target.value)}>
            {stages.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </label>
      )}

      {entrants.length < 2 ? (
        <p className={styles.muted}>{tt('bracketEdit.tooFew', 'There are not enough entrants yet to move anybody.')}</p>
      ) : (
        <div className={styles.tools}>
          <div className={styles.tool}>
            <p className={styles.toolTitle}>{tt('bracketEdit.swapTitle', 'Swap two entrants')}</p>
            <label className={styles.field}>
              <span className={styles.label}>{tt('bracketEdit.swapA', 'This one')}</span>
              <select className={styles.select} value={swap.a} disabled={busy}
                      onChange={e => setSwap(prev => ({ ...prev, a: e.target.value }))}>
                <option value="">{tt('bracketEdit.pick', 'Choose an entrant')}</option>
                {options}
              </select>
            </label>
            <label className={styles.field}>
              <span className={styles.label}>{tt('bracketEdit.swapB', 'Trades places with')}</span>
              <select className={styles.select} value={swap.b} disabled={busy}
                      onChange={e => setSwap(prev => ({ ...prev, b: e.target.value }))}>
                <option value="">{tt('bracketEdit.pick', 'Choose an entrant')}</option>
                {options}
              </select>
            </label>
            <button type="button" className={styles.primary}
                    disabled={busy || !swap.a || !swap.b || swap.a === swap.b} onClick={doSwap}>
              {tt('bracketEdit.swapGo', 'Swap them')}
            </button>
          </div>

          <div className={styles.tool}>
            <p className={styles.toolTitle}>{tt('bracketEdit.replaceTitle', 'Replace an entrant')}</p>
            <label className={styles.field}>
              <span className={styles.label}>{tt('bracketEdit.replaceOut', 'Leaves the bracket')}</span>
              <select className={styles.select} value={repl.out} disabled={busy}
                      onChange={e => setRepl(prev => ({ ...prev, out: e.target.value }))}>
                <option value="">{tt('bracketEdit.pick', 'Choose an entrant')}</option>
                {options}
              </select>
            </label>
            <label className={styles.field}>
              <span className={styles.label}>{tt('bracketEdit.replaceIn', 'Takes their place')}</span>
              <select className={styles.select} value={repl.in} disabled={busy}
                      onChange={e => setRepl(prev => ({ ...prev, in: e.target.value }))}>
                <option value="">{tt('bracketEdit.pick', 'Choose an entrant')}</option>
                {options}
              </select>
            </label>
            <button type="button" className={styles.primary}
                    disabled={busy || !repl.out || !repl.in || repl.out === repl.in} onClick={doReplace}>
              {tt('bracketEdit.replaceGo', 'Replace')}
            </button>
          </div>
        </div>
      )}

      <p className={styles.toolTitle}>{tt('bracketEdit.historyTitle', 'Changes made after the start')}</p>
      {edits.length === 0 ? (
        <p className={styles.muted}>{tt('bracketEdit.historyNone', 'Nothing has been changed since the bracket was drawn.')}</p>
      ) : (
        <ul className={styles.history}>
          {edits.map(e => (
            <li key={e.id} className={styles.historyRow}>
              <span className={styles.historyWhat}>
                {tt(`bracketEdit.kind.${e.kind}`, KIND_WORDS[e.kind] || e.kind)}
                {e.stage?.label ? ` · ${e.stage.label}` : ''}
              </span>
              <span className={styles.muted}>
                {[e.by ? `@${e.by}` : null, formatDateTime(e.at)].filter(Boolean).join(' · ')}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
