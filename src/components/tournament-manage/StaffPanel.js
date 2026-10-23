'use client';

// Who helps run this tournament, and with what (P7).
//
// CEO, 3 September 2026: "only those given the access to, should be able to"
// input results. That made the scorekeeper. Design section 16, P7: "granular
// roles (structure, report, place entrants, standings, caster)". So each
// helper here holds any of five parts of the tournament, pressed on and off as
// filled chips; the console then shows them only the tabs those parts open
// (src/lib/tournamentAccess.js) and every door asks the server the same thing.
//
// Only the organiser (or an admin) sees this panel: a helper never adds or
// changes another, whatever they hold.

import { useCallback, useEffect, useState } from 'react';
import UserChip from '@/components/user-chip/UserChip';
import UserPicker from '@/components/user-picker/UserPicker';
import { useT } from '@/i18n/LanguageProvider';
import { apiMessage } from '@/lib/apiMessage';
import { useAutoRefresh } from '@/lib/useLiveData';
import { PERMISSION_KEYS } from '@/lib/tournamentAccess';
import PendingInvites from '@/components/invitations/PendingInvites';
import styles from './staff-panel.module.css';

const API = process.env.NEXT_PUBLIC_API_URL;

/** The words for each permission, in the reader's language. */
export function permissionWords(tt) {
  return {
    structure: {
      label: tt('staff.perm.structure', 'Structure'),
      hint: tt('staff.permHint.structure', 'Stages, formats, match rules and battle royale lobbies'),
    },
    place: {
      label: tt('staff.perm.place', 'Place entrants'),
      hint: tt('staff.permHint.place', 'Drawing stages, sending people on, swapping and replacing, moving seats'),
    },
    report: {
      label: tt('staff.perm.report', 'Results'),
      hint: tt('staff.permHint.report', 'Scores, fixtures, match times and rooms'),
    },
    standings: {
      label: tt('staff.perm.standings', 'Standings'),
      hint: tt('staff.permHint.standings', 'How the table scores, adjustments, player stats and the MVP'),
    },
    caster: {
      label: tt('staff.perm.caster', 'Caster'),
      hint: tt('staff.permHint.caster', 'The studio, overlays and the run of show'),
    },
  };
}

function PermissionChips({ held, onToggle, disabled, words, label }) {
  return (
    <div className={styles.chips} role="group" aria-label={label}>
      {PERMISSION_KEYS.map((key) => {
        const on = held.includes(key);
        return (
          <button key={key} type="button" disabled={disabled} aria-pressed={on}
                  title={words[key].hint}
                  className={`${styles.chip} ${on ? styles.chipOn : ''}`}
                  onClick={() => onToggle(key)}>
            {words[key].label}
          </button>
        );
      })}
    </div>
  );
}

export default function StaffPanel({ tournamentRef, token }) {
  const tt = useT();
  const words = permissionWords(tt);
  const [rows, setRows] = useState([]);
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [username, setUsername] = useState('');
  // What somebody new is given. Results first, because it is what an
  // organiser most often hands over, and it is what a helper always was.
  const [picked, setPicked] = useState(['report']);

  const call = useCallback(async (path, options = {}) => {
    const res = await fetch(`${API}/tournament/${tournamentRef}/staff/${path}`, {
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

  const load = useCallback(async ({ quiet = false } = {}) => {
    if (!token || !tournamentRef) { setLoading(false); return; }
    try {
      const { ok, body } = await call('');
      if (ok) {
        setRows(body.data.staff || []);
        setInvites(body.data.invites || []);
        if (!quiet) setError('');
      } else if (!quiet) {
        setError(apiMessage(tt, body, 'staff.loadFailed', 'Could not load who helps run this tournament.'));
      }
    } catch {
      if (!quiet) setError(tt('api.networkProblem', 'The network is not answering. Try again.'));
    }
    setLoading(false);
  }, [call, token, tournamentRef]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);
  useAutoRefresh(() => load({ quiet: true }));

  const toggle = (list, key) => (list.includes(key)
    ? list.filter((k) => k !== key)
    : PERMISSION_KEYS.filter((k) => k === key || list.includes(k)));

  const add = async (e) => {
    e.preventDefault();
    const name = username.trim().replace(/^@/, '');
    if (!name || !picked.length) return;
    setBusy(true);
    setError('');
    setNote('');
    try {
      const { ok, body } = await call('', {
        method: 'POST', body: JSON.stringify({ username: name, permissions: picked }),
      });
      if (ok && body.data.awaiting_signup) {
        // No account with that address yet: emailed an invitation (inbox 455).
        setUsername('');
        setNote(tt('staff.invitedByEmail', 'Invitation sent to {email}. They join once they make an account and accept.')
          .replace('{email}', body.data.invited || name));
        load({ quiet: true });
      } else if (ok) {
        setRows(body.data.staff || []);
        setUsername('');
        setNote(body.data.added
          ? tt('staff.added', '{name} is helping now.').replace('{name}', name)
          : tt('staff.alreadyAdded', '{name} was already helping. Change what they run on their row.').replace('{name}', name));
      } else {
        setError(apiMessage(tt, body, 'staff.addFailed', 'That did not work.'));
      }
    } catch {
      setError(tt('api.networkProblem', 'The network is not answering. Try again.'));
    }
    setBusy(false);
  };

  const change = async (row, key) => {
    const held = row.permissions || [];
    const next = toggle(held, key);
    setError('');
    setNote('');
    if (!next.length) {
      // Said before anything is sent: a helper runs at least one part.
      setNote(tt('staff.lastOne', 'Somebody helping runs at least one part. To take everything away, remove them.'));
      return;
    }
    setBusy(true);
    try {
      const { ok, body } = await call(`${row.user_id ?? row.id}/`, {
        method: 'PATCH', body: JSON.stringify({ permissions: next }),
      });
      if (ok) {
        setRows(body.data.staff || []);
        setNote(tt('staff.changed', 'Saved. {name} sees the change the next time their console loads.')
          .replace('{name}', row.username));
      } else {
        setError(apiMessage(tt, body, 'staff.changeFailed', 'That change was not saved.'));
      }
    } catch {
      setError(tt('api.networkProblem', 'The network is not answering. Try again.'));
    }
    setBusy(false);
  };

  const remove = async (row) => {
    setBusy(true);
    setError('');
    setNote('');
    try {
      const { ok, body } = await call(`${row.user_id ?? row.id}/`, { method: 'DELETE' });
      if (ok) {
        setRows(body.data.staff || []);
        setNote(tt('staff.removed', '{name} no longer helps run this tournament.').replace('{name}', row.username));
      } else {
        setError(apiMessage(tt, body, 'staff.removeFailed', 'That did not work.'));
      }
    } catch {
      setError(tt('api.networkProblem', 'The network is not answering. Try again.'));
    }
    setBusy(false);
  };

  return (
    <section className={styles.panel}>
      <h3 className={styles.title}>{tt('staff.title', 'Who helps run this tournament')}</h3>
      <p className={styles.sub}>
        {tt('staff.sub', 'You can do everything. Anybody you add here opens this console and sees only the parts you give them. Nobody you add changes the tournament’s settings, its entries, its money, or who helps.')}
      </p>

      <dl className={styles.legend}>
        {PERMISSION_KEYS.map((key) => (
          <div key={key} className={styles.legendRow}>
            <dt className={styles.legendTerm}>{words[key].label}</dt>
            <dd className={styles.legendText}>{words[key].hint}</dd>
          </div>
        ))}
      </dl>

      {loading && <p className={styles.muted}>{tt('staff.loading', 'Loading who helps...')}</p>}
      {error && <p className={styles.error} role="alert">{error}</p>}
      {note && <p className={styles.note} role="status">{note}</p>}

      {!loading && (
        <div className={styles.rows}>
          {rows.length === 0 && (
            <p className={styles.muted}>{tt('staff.nobodyYet', 'Nobody yet. Only you run this tournament.')}</p>
          )}
          {rows.map((row) => (
            <div key={row.user_id ?? row.id} className={styles.row}>
              <div className={styles.rowHead}>
                <UserChip user={row} size={36} secondary
                          className={styles.rowMain}
                          nameClassName={styles.rowName}
                          handleClassName={styles.rowMeta} />
                <button type="button" className={styles.ghost} disabled={busy}
                        onClick={() => remove(row)}>
                  {tt('staff.remove', 'Remove')}
                </button>
              </div>
              <PermissionChips held={row.permissions || []} disabled={busy} words={words}
                               label={tt('staff.whatTheyRun', 'What {name} runs').replace('{name}', row.username)}
                               onToggle={(key) => change(row, key)} />
            </div>
          ))}
        </div>
      )}

      <PendingInvites invites={invites} token={token} onChanged={() => load({ quiet: true })} />

      <form className={styles.add} onSubmit={add}>
        <p className={styles.addTitle}>{tt('staff.addTitle', 'Add somebody')}</p>
        <div className={styles.addRow}>
          <UserPicker
            value={username}
            onChange={setUsername}
            token={token}
            allowEmail
            placeholder={tt('staff.usernameOrEmailPlaceholder', 'Their username, or an email address')}
          />
        </div>
        <PermissionChips held={picked} disabled={busy} words={words}
                         label={tt('staff.whatTheyWillRun', 'What they will run')}
                         onToggle={(key) => setPicked((list) => toggle(list, key))} />
        <button type="submit" className={styles.primary} disabled={busy || !username.trim() || !picked.length}>
          {tt('staff.add', 'Add them')}
        </button>
        {!picked.length && (
          <p className={styles.muted}>{tt('staff.pickOne', 'Pick at least one part for them to run.')}</p>
        )}
      </form>
    </section>
  );
}
