'use client';

// Deleting a tournament or an event, from the list of what you run.
//
// CEO, 8 September 2026, on a screenshot of My Tournaments: "there should be a
// way for peopl to delete events, of course it is a soft delete thata dmins
// should be able to restore or still check".
//
// One component for both, because an organiser deleting an event and an
// organiser deleting a tournament is the same job with different nouns, and
// building it on one side and forgetting the other is this repo's most
// repeated fault. `tools/check-parity.py` holds a row for the pair.
//
// The two refusals the server can send are the whole design:
//
//   PAID_ENTRANTS     somebody paid. Not a confirmation, a refusal, with the
//                     thing they should do instead named.
//   CONFIRM_REQUIRED  people are in it. Asks again and says how many, because
//                     "delete" and "delete along with 34 people" are different
//                     decisions and only one of them was read.

import { useState } from 'react';
import { LuTrash2 } from 'react-icons/lu';
import { apiMessage } from '@/lib/apiMessage';
import { useT } from '@/i18n/LanguageProvider';
import styles from './delete-control.module.css';

const API = process.env.NEXT_PUBLIC_API_URL;

export default function DeleteControl({
  kind,             // 'tournament' | 'event'
  reference,        // slug, or an id for a row that has no slug yet
  name,
  token,
  onDeleted,
  className = '',
}) {
  const tt = useT();
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState('');
  const [holders, setHolders] = useState(0);

  const send = async (confirm) => {
    setBusy(true);
    setProblem('');
    try {
      const res = await fetch(`${API}/${kind}/${reference}/delete/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json',
                   Authorization: `Bearer ${token || ''}` },
        body: JSON.stringify(confirm ? { confirm: true } : {}),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.status === 'success') {
        setAsking(false);
        if (onDeleted) onDeleted(body.data);
        return;
      }
      if (body.code === 'CONFIRM_REQUIRED') {
        setHolders(Number(body.data?.unpaid) || 0);
        setProblem('');
        return;
      }
      if (body.code === 'PAID_ENTRANTS') {
        setProblem(kind === 'event'
          ? tt('del.paidTickets', 'Tickets have been paid for. Cancel the event first, which refunds the holders, and then it can be deleted.')
          : tt('del.paidEntrants', 'People have paid to enter. Cancel the tournament first, which refunds them, and then it can be deleted.'));
        return;
      }
      setProblem(apiMessage(tt, body, 'del.failed', 'That could not be deleted.'));
    } catch {
      setProblem(tt('api.NETWORK_UNREACHABLE',
        'Could not reach the server. Check the connection and try again.'));
    } finally {
      setBusy(false);
    }
  };

  const stop = () => { setAsking(false); setProblem(''); setHolders(0); };

  if (!asking) {
    return (
      <button type="button" className={`${className} ${styles.trigger}`}
              onClick={() => setAsking(true)}>
        <LuTrash2 aria-hidden="true" /> {tt('del.delete', 'Delete')}
      </button>
    );
  }

  return (
    <div className={styles.ask}>
      <p className={styles.question}>
        {holders > 0
          ? tt('del.askWithPeople', 'Delete {name} and the {n} registrations in it?')
            .replace('{name}', name || '').replace('{n}', holders)
          : tt('del.ask', 'Delete {name}?').replace('{name}', name || '')}
      </p>
      <p className={styles.reassure}>
        {tt('del.reassure', 'It leaves every listing and its own address stops working. Nothing is destroyed: an admin can still see it and put it back.')}
      </p>
      {problem && <p className={styles.problem} role="alert">{problem}</p>}
      <div className={styles.actions}>
        {!problem && (
          <button type="button" className={styles.danger} disabled={busy}
                  onClick={() => send(holders > 0)}>
            {busy
              ? tt('del.deleting', 'Deleting...')
              : (holders > 0
                ? tt('del.yesWithPeople', 'Yes, delete it and them')
                : tt('del.yes', 'Yes, delete it'))}
          </button>
        )}
        <button type="button" className={styles.quiet} disabled={busy} onClick={stop}>
          {problem ? tt('ui.close.bbfa', 'Close') : tt('ui.cancel.0f8e', 'Cancel')}
        </button>
      </div>
    </div>
  );
}
