'use client';

// Who is in a division (P5d). Approved mockup docs/mockups/circuit-divisions.html,
// "Setting it up". Shown on a division's own organiser screen and on its
// league's. The first season starts from the people put in here; after that,
// ending a season fills every division.

import { useCallback, useEffect, useState } from 'react';
import { useT } from '@/i18n/LanguageProvider';
import { apiMessage } from '@/lib/apiMessage';
import { useAutoRefresh } from '@/lib/useLiveData';
import { cameWords } from './CircuitRanking';
import { API, request } from './circuitWords';
import styles from './circuits.module.css';

export default function MembersPanel({ circuit, token, onChanged, title }) {
  const tt = useT();
  const [members, setMembers] = useState(null);
  const [who, setWho] = useState('');
  const [removing, setRemoving] = useState(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const [problem, setProblem] = useState('');
  const base = `${API}/circuits/${encodeURIComponent(circuit.slug)}/members/`;

  const load = useCallback(async () => {
    const got = await request(`${API}/circuits/${encodeURIComponent(circuit.slug)}/members/`, { token });
    if (got.ok) setMembers(got.answer.data.members || []);
    else setProblem(apiMessage(tt, got.answer, 'league.membersFailed', 'Who is in this division could not be loaded.'));
  }, [circuit.slug, token]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);
  // A season end or the league screen can change who is in it meanwhile.
  useAutoRefresh(() => load());

  const send = async (method, url, body, done) => {
    setBusy(true);
    setNote('');
    setProblem('');
    const got = await request(url, { method, token, body });
    setBusy(false);
    if (got.ok) {
      setMembers(got.answer.data.members || []);
      setNote(done(got.answer.data));
      if (onChanged) onChanged();
      return true;
    }
    setProblem(got.status === 0
      ? tt('api.networkProblem', 'The network is not answering. Try again.')
      : apiMessage(tt, got.answer, 'league.memberFailed', 'That was not saved.'));
    return false;
  };

  const add = async (e) => {
    e.preventDefault();
    if (await send('POST', base, { entrant: who.trim() }, () => tt('league.memberAdded', 'Added.'))) setWho('');
  };

  return (
    <div className={styles.panel}>
      <h2 className={styles.sectionTitle}>
        {title || tt('league.whoIsIn', 'Who is in {division}').replace('{division}', circuit.name)}
      </h2>
      <p className={styles.muted}>
        {tt('league.membersHelp', 'The first season starts from the people you put here. After that, ending a season fills every division for you.')}
      </p>
      <form className={styles.row2} onSubmit={add}>
        <label className={styles.field}>
          <span className={styles.label}>
            {circuit.entrant === 'team'
              ? tt('circuit.form.teamAddress', 'Team (its address, like lagos-titans)')
              : tt('circuit.form.playerHandle', 'Player (@username)')}
          </span>
          <input id={`member-add-${circuit.slug}`} className={styles.input} value={who} maxLength={160} disabled={busy}
                 onChange={(e) => setWho(e.target.value)} />
        </label>
        <div className={styles.field}>
          <span className={styles.label} aria-hidden="true">&nbsp;</span>
          <button type="submit" className={styles.primary} disabled={busy || !who.trim()}>
            {tt('league.addMember', 'Add')}
          </button>
        </div>
      </form>
      {note && <p className={styles.note} role="status">{note}</p>}
      {problem && <p className={styles.problem} role="alert">{problem}</p>}
      {members === null && <div className={styles.skeleton} aria-busy="true" />}
      {members && members.length === 0 && (
        <p className={styles.muted}>{tt('league.nobodyIn', 'Nobody is in this division yet.')}</p>
      )}
      {members && members.length > 0 && (
        <div className={styles.list}>
          {members.map((m) => (
            <div key={m.id} className={styles.member}>
              <span className={styles.memberName}>
                {m.entrant.name}{' '}
                <span>{[m.entrant.handle ? `@${m.entrant.handle}` : '', cameWords(tt, m.came)].filter(Boolean).join(', ')}</span>
              </span>
              {removing !== m.id ? (
                <button type="button" className={styles.ghost} disabled={busy} onClick={() => setRemoving(m.id)}>
                  {tt('league.removeMember', 'Take out')}
                </button>
              ) : (
                <>
                  <button type="button" className={styles.danger} disabled={busy}
                          onClick={() => {
                            setRemoving(null);
                            send('DELETE', `${API}/circuits/${encodeURIComponent(circuit.slug)}/members/${m.id}/`, null,
                              () => tt('league.memberRemoved', 'Taken out.'));
                          }}>
                    {tt('league.removeMemberAsk', 'Take {name} out?').replace('{name}', m.entrant.name)}
                  </button>
                  <button type="button" className={styles.ghost} disabled={busy} onClick={() => setRemoving(null)}>
                    {tt('circuit.keepIt', 'Keep it')}
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      )}
      <div className={styles.actions}>
        <button type="button" className={styles.ghost} disabled={busy}
                onClick={() => send('POST', base, { everyone: true },
                  (data) => tt('league.everyoneAdded', '{n} added.').replace('{n}', data.added ?? 0))}>
          {tt('league.addEveryone', 'Put in everybody its tournaments rank')}
        </button>
      </div>
    </div>
  );
}
