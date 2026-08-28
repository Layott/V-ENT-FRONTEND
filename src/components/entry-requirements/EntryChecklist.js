'use client';

// What the person entering still owes, shown BEFORE they pay anything.
//
// Telling somebody they are not eligible after they have filled in a form and
// pressed pay is how a registration flow loses people, and a refusal that says
// only "not eligible" sends them to support. So every row here names the one
// thing to do, and the ones they can answer here have the box to answer in.
//
// The server sends a code and its parameters rather than a finished sentence.
// Walking the French site with the first version showed the chrome translated
// and every line the server wrote still in English, which is what a sentence
// built in Python always does. The one exception is a refusal note: those are
// the organiser's own words and are shown as written.

import { useCallback, useEffect, useState } from 'react';
import { LuCheck, LuClock, LuTriangleAlert } from 'react-icons/lu';
import { apiMessage } from '@/lib/apiMessage';
import { useT } from '@/i18n/LanguageProvider';
import { kindLabel } from './kinds';
import styles from './entry-checklist.module.css';

const base = () => `${process.env.NEXT_PUBLIC_API_URL}/tournament`;

// What to do about it, in the reader's language. {placeholders} come from the
// row's params.
const REASONS = {
  country: ['req.why.country', 'This tournament is open to players in {countries}.'],
  min_age_no_dob: ['req.why.minAgeNoDob',
    'This tournament is {age}+, so it needs your date of birth on your profile first.'],
  min_age: ['req.why.minAge', 'This tournament is open to players aged {age} and over.'],
  verified_email: ['req.why.verifiedEmail', 'Verify your email address first.'],
  verified_identity: ['req.why.verifiedIdentity', 'This tournament needs a verified identity.'],
  profile_image: ['req.why.profileImage', 'Add a picture to your profile first.'],
  game_account: ['req.why.gameAccount', 'Connect your {game} account on your profile first.'],
  game_details: ['req.why.gameDetails', 'Add your in-game name for {game} on your profile first.'],
  team_logo: ['req.why.teamLogo', 'Your team needs a logo before it can enter.'],
  pending: ['req.why.pending', 'Waiting for the organiser to check this.'],
};

const fill = (text, params) => Object.entries(params || {}).reduce(
  (out, [key, value]) => out.split(`{${key}}`).join(String(value)), text);

export default function EntryChecklist({ tournamentId, token, onStatus }) {
  const tt = useT();

  const [rows, setRows] = useState(null);
  const [mayEnter, setMayEnter] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [drafts, setDrafts] = useState({});
  const [sending, setSending] = useState(null);

  const load = useCallback(async () => {
    if (!token) { setLoading(false); return; }
    setLoading(true);
    try {
      const res = await fetch(`${base()}/${tournamentId}/requirements/mine/`,
        { headers: { Authorization: `Bearer ${token}` } });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.status === 'success') {
        setRows(body.data.requirements || []);
        setMayEnter(Boolean(body.data.may_enter));
        if (onStatus) onStatus(body.data);
        return;
      }
      setError(apiMessage(tt, body, 'api.requirementsLoadFailed',
        'Could not load the entry requirements.'));
    } catch {
      setError(tt('api.NETWORK_UNREACHABLE',
        'Could not reach the server. Check the connection and try again.'));
    } finally {
      setLoading(false);
    }
  }, [tournamentId, token]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  const send = async row => {
    const value = drafts[row.kind];
    if (!value || (typeof value === 'string' && !value.trim())) return;
    setSending(row.kind);
    try {
      const res = await fetch(
        `${base()}/${tournamentId}/requirements/${row.id}/submit/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ value }),
        });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.status === 'success') {
        setDrafts(d => ({ ...d, [row.kind]: '' }));
        load();
        return;
      }
      setError(apiMessage(tt, body, 'api.submitFailed', 'Could not send that.'));
    } catch {
      setError(tt('api.NETWORK_UNREACHABLE',
        'Could not reach the server. Check the connection and try again.'));
    } finally {
      setSending(null);
    }
  };

  const labelOf = row => kindLabel(tt, row.kind, row.label);

  const reasonOf = row => {
    // A refusal is the organiser's own words, shown as written.
    if (row.code === 'refused') {
      return row.params?.note
        || tt('req.why.refused', 'This was not accepted. Send it again.');
    }
    if (row.code === 'todo' || !row.code) return labelOf(row);

    // A team entry checks every member, so the code arrives as
    // `member_game_account` and the sentence has to name whoever it was. A
    // captain with five players cannot act on "your team is not eligible".
    const forMember = row.code.startsWith('member_');
    const entry = REASONS[forMember ? row.code.slice(7) : row.code];
    if (!entry) return row.reason || labelOf(row);
    const sentence = fill(tt(entry[0], entry[1]), row.params);
    return forMember
      ? fill(tt('req.why.member', '{member}: {what}'),
        { member: row.params?.member || '', what: sentence })
      : sentence;
  };

  if (loading) return <p className={styles.state}>{tt('ui.loading.33ce', 'Loading…')}</p>;
  if (!rows || rows.length === 0) return null;

  return (
    <div className={styles.wrap}>
      <h3 className={styles.title}>
        {mayEnter
          ? tt('entry.allDone', 'You have everything this tournament asks for')
          : tt('entry.todo', 'Before you can enter')}
      </h3>

      <ul className={styles.list}>
        {rows.map(row => (
          <li key={row.kind} className={styles.row}>
            {/* Three states, three marks: done, waiting on the organiser, and
                yours to act on now. An automatic check that is not met is
                never "waiting" - nobody is reviewing it. */}
            <span className={row.met ? styles.markMet : styles.markTodo} aria-hidden="true">
              {row.met ? <LuCheck /> : row.waiting_on_review ? <LuClock /> : <LuTriangleAlert />}
            </span>

            <div className={styles.body}>
              <span className={row.met ? styles.labelMet : styles.label}>
                {row.met ? labelOf(row) : reasonOf(row)}
              </span>

              {!row.required && (
                <span className={styles.optional}>{tt('entry.optional', 'Optional')}</span>
              )}

              {row.config?.help && <span className={styles.help}>{row.config.help}</span>}

              {row.config?.url && (
                <a className={styles.link} href={row.config.url}
                   target="_blank" rel="noopener noreferrer">
                  {tt('entry.open', 'Open the download')}
                </a>
              )}

              {Array.isArray(row.config?.links) && row.config.links.map(url => (
                <a key={url} className={styles.link} href={url}
                   target="_blank" rel="noopener noreferrer">{url}</a>
              ))}

              {!row.met && row.needs_submission && (
                <div className={styles.sendRow}>
                  <input
                    className={styles.text}
                    value={drafts[row.kind] || ''}
                    onChange={e => setDrafts(d => ({ ...d, [row.kind]: e.target.value }))}
                    placeholder={row.config?.field_label
                      || tt('entry.yourAnswer', 'Your answer')}
                    aria-label={row.config?.field_label || labelOf(row)}
                  />
                  <button type="button" className={styles.send} disabled={sending === row.kind}
                          onClick={() => send(row)}>
                    {sending === row.kind
                      ? tt('ui.sending.4a1c', 'Sending…')
                      : tt('entry.send', 'Send')}
                  </button>
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>

      {error && <p className={styles.error}>{error}</p>}
    </div>
  );
}
