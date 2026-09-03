'use client';

// Sides assembled for one tournament, and entrants put in directly.
//
// CEO, 3 September 2026: "each player for team nigeria in the rivalry series is
// registered to a different team, but both nigerian players will be working
// together as a team for nigeria... so we can invite players from different
// orgs and then they play as a team on the site, while still representing their
// individual teams or orgs on the site." And: "there should also be a way for
// admins to simply just add teams to the event."
//
// Both live here because an organiser does both in the same sitting, filling a
// bracket from a list they already have.
//
// Each member row says who they represent, because that is the fact the squad
// exists to preserve. Tolu is in Nigeria AND plays for Lagos Lions, and losing
// either half is what the old model did.

import { useCallback, useEffect, useState } from 'react';
import { useT } from '@/i18n/LanguageProvider';
import { apiMessage } from '@/lib/apiMessage';
import styles from './squads-panel.module.css';

const API = process.env.NEXT_PUBLIC_API_URL;

export default function SquadsPanel({ tournamentRef, token, showToast, onChanged }) {
  const tt = useT();

  const [squads, setSquads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const [newSquad, setNewSquad] = useState({ name: '', tag: '' });
  const [adding, setAdding] = useState({});          // squad id -> username
  const [entrant, setEntrant] = useState({ kind: 'team', who: '' });

  const base = `${API}/tournament/${tournamentRef}/squads/`;
  const auth = { Authorization: `Bearer ${token}` };

  const load = useCallback(async () => {
    if (!token || !tournamentRef) { setLoading(false); return; }
    try {
      const res = await fetch(base, { headers: auth });
      const body = await res.json().catch(() => ({}));
      if (body?.status === 'success') { setSquads(body.data?.squads || []); setError(''); }
      else setError(apiMessage(tt, body, 'squad.loadFailed', 'Could not load the squads.'));
    } catch (err) {
      setError(apiMessage(tt, err, 'squad.loadFailed', 'Could not load the squads.'));
    } finally {
      setLoading(false);
    }
  }, [base, token, tournamentRef]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  const call = async (url, options, fallbackKey, fallback) => {
    setBusy(true);
    setError('');
    try {
      const res = await fetch(url, { ...options, headers: { ...auth, ...(options.headers || {}) } });
      const body = await res.json().catch(() => ({}));
      if (body?.status !== 'success') {
        setError(apiMessage(tt, body, fallbackKey, fallback));
        return null;
      }
      await load();
      onChanged?.();
      return body;
    } catch (err) {
      setError(apiMessage(tt, err, fallbackKey, fallback));
      return null;
    } finally {
      setBusy(false);
    }
  };

  const json = (data) => ({
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  const create = async () => {
    const name = newSquad.name.trim();
    if (!name) return;
    const body = await call(base, json({ name, tag: newSquad.tag.trim() }),
      'squad.createFailed', 'That squad was not created.');
    if (body) { setNewSquad({ name: '', tag: '' }); showToast?.(tt('squad.created', 'Squad created.')); }
  };

  const addMember = async (squadId, anyway = false) => {
    const username = (adding[squadId] || '').trim();
    if (!username) return;
    const body = await call(`${base}${squadId}/members/`,
      json({ username, ...(anyway ? { anyway: true } : {}) }),
      'squad.addFailed', 'That player was not added.');
    if (body) setAdding((a) => ({ ...a, [squadId]: '' }));
  };

  const removeMember = (squadId, username) => call(
    `${base}${squadId}/members/${encodeURIComponent(username)}/`, { method: 'DELETE' },
    'squad.removeFailed', 'That player was not removed.');

  const removeSquad = (squadId) => call(`${base}${squadId}/`, { method: 'DELETE' },
    'squad.deleteFailed', 'That squad was not removed.');

  const enter = (squadId) => call(`${base}${squadId}/enter/`, { method: 'POST' },
    'squad.enterFailed', 'That squad was not entered.');

  const addEntrant = async () => {
    const who = entrant.who.trim();
    if (!who) return;
    const body = await call(`${API}/tournament/${tournamentRef}/entrants/`,
      json(entrant.kind === 'team' ? { team: who } : { username: who }),
      'entrant.failed', 'That entrant was not added.');
    if (body) {
      setEntrant((e) => ({ ...e, who: '' }));
      showToast?.(body.message);
    }
  };

  return (
    <div className={styles.panel}>
      {/* ------------------------------------------------ straight in ---- */}
      <h3 className={styles.title}>{tt('entrant.title', 'Put somebody in')}</h3>
      <p className={styles.hint}>
        {tt('entrant.hint', 'An invitation asks and waits. This puts a team or a player straight into the tournament, already confirmed. Use it when you have already had the conversation. Nobody is charged an entry fee, because nobody was asked to pay one.')}
      </p>

      <div className={styles.kindRow}>
        <button type="button" aria-pressed={entrant.kind === 'team'}
                className={`${styles.kindChip} ${entrant.kind === 'team' ? styles.kindChipOn : ''}`}
                onClick={() => setEntrant((e) => ({ ...e, kind: 'team' }))}>
          {tt('entrant.aTeam', 'A team')}
        </button>
        <button type="button" aria-pressed={entrant.kind === 'player'}
                className={`${styles.kindChip} ${entrant.kind === 'player' ? styles.kindChipOn : ''}`}
                onClick={() => setEntrant((e) => ({ ...e, kind: 'player' }))}>
          {tt('entrant.aPlayer', 'A player')}
        </button>
      </div>

      <div className={styles.addRow}>
        <input className={styles.input} value={entrant.who} disabled={busy}
               placeholder={entrant.kind === 'team'
                 ? tt('invite.teamName', 'Team name')
                 : tt('invite.username', 'Username')}
               aria-label={entrant.kind === 'team'
                 ? tt('invite.teamName', 'Team name')
                 : tt('invite.username', 'Username')}
               onChange={(e) => setEntrant((s) => ({ ...s, who: e.target.value }))} />
        <button type="button" className={styles.primary} disabled={busy || !entrant.who.trim()}
                onClick={addEntrant}>
          {tt('entrant.add', 'Put them in')}
        </button>
      </div>

      {/* ----------------------------------------------------- squads ---- */}
      <h3 className={styles.title}>{tt('squad.title', 'Mixed squads')}</h3>
      <p className={styles.hint}>
        {tt('squad.hint', 'A side made of players from different clubs, for this tournament only. Team Nigeria can be two players who play for two different clubs: they enter as Nigeria here, and each of them still shows the club they actually play for.')}
      </p>

      {error && <p className={styles.error} role="alert">{error}</p>}
      {loading && <p className={styles.muted}>{tt('squad.loading', 'Loading...')}</p>}

      {!loading && squads.length === 0 && (
        <p className={styles.muted}>{tt('squad.none', 'No squads yet.')}</p>
      )}

      {squads.map((squad) => (
        <div key={squad.id} className={styles.squad}>
          <div className={styles.squadHead}>
            <span className={styles.squadName}>{squad.name}</span>
            {squad.tag && <span className={styles.tag}>{squad.tag}</span>}
            {squad.entered
              ? <span className={styles.in}>{tt('squad.entered', 'In the tournament')}</span>
              : (
                <button type="button" className={styles.primary} disabled={busy}
                        onClick={() => enter(squad.id)}>
                  {tt('squad.enter', 'Enter this squad')}
                </button>
              )}
            <button type="button" className={styles.ghost} disabled={busy}
                    onClick={() => removeSquad(squad.id)}>
              {tt('squad.remove', 'Remove')}
            </button>
          </div>

          {squad.members.length === 0 && (
            <p className={styles.muted}>{tt('squad.empty', 'Nobody in it yet.')}</p>
          )}

          {squad.members.map((m) => (
            <div key={m.username} className={styles.member}>
              <span className={styles.memberName}>
                @{m.username}
                {m.is_captain && ` · ${tt('squad.captain', 'captain')}`}
              </span>
              {/* The fact the whole feature exists to keep. */}
              <span className={styles.represents}>
                {m.represents
                  ? tt('squad.plays', 'plays for {club}').replace('{club}', m.represents)
                  : tt('squad.noClub', 'no club')}
              </span>
              <button type="button" className={styles.ghost} disabled={busy}
                      onClick={() => removeMember(squad.id, m.username)}>
                {tt('squad.take', 'Take out')}
              </button>
            </div>
          ))}

          <div className={styles.addRow}>
            <input className={styles.input} value={adding[squad.id] || ''} disabled={busy}
                   placeholder={tt('squad.addPlaceholder', 'Username, from any club')}
                   aria-label={tt('squad.addPlaceholder', 'Username, from any club')}
                   onChange={(e) => setAdding((a) => ({ ...a, [squad.id]: e.target.value }))} />
            <button type="button" className={styles.secondary} disabled={busy}
                    onClick={() => addMember(squad.id)}>
              {tt('squad.add', 'Add to squad')}
            </button>
          </div>
        </div>
      ))}

      <div className={styles.addRow}>
        <input className={styles.input} value={newSquad.name} disabled={busy}
               placeholder={tt('squad.namePlaceholder', 'Squad name, for example Nigeria')}
               aria-label={tt('squad.namePlaceholder', 'Squad name, for example Nigeria')}
               onChange={(e) => setNewSquad((s) => ({ ...s, name: e.target.value }))} />
        <input className={styles.inputShort} value={newSquad.tag} disabled={busy}
               maxLength={8} placeholder={tt('squad.tagPlaceholder', 'NGA')}
               aria-label={tt('squad.tag', 'Short tag for broadcast')}
               onChange={(e) => setNewSquad((s) => ({ ...s, tag: e.target.value }))} />
        <button type="button" className={styles.primary}
                disabled={busy || !newSquad.name.trim()} onClick={create}>
          {tt('squad.create', 'Make a squad')}
        </button>
      </div>
    </div>
  );
}
