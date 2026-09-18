'use client';

// Cancelling an event, and everybody who paid gets it back.
//
// CEO, 18 September 2026: "if an event is cancelled then refunds must
// happen." The delete control has pointed at "cancel the event first, which
// refunds the holders" since it was written, and the organiser had no cancel
// control at all. This is it: a reason (everybody holding a ticket is told
// why), a second press, and the summary of what came back.

import { useState } from 'react';
import { LuCircleOff } from 'react-icons/lu';
import { apiMessage } from '@/lib/apiMessage';
import { useT } from '@/i18n/LanguageProvider';
import { plural } from '@/lib/plural';
import styles from '@/components/delete-control/delete-control.module.css';

const API = process.env.NEXT_PUBLIC_API_URL;

export default function CancelControl({
  reference,        // the event's slug
  name,
  token,
  onCancelled,      // (data) after the server says yes
  className = '',
}) {
  const tt = useT();
  const [asking, setAsking] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState('');
  const [done, setDone] = useState(null);

  const send = async () => {
    setBusy(true);
    setProblem('');
    try {
      const res = await fetch(`${API}/event/${reference}/cancel/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json',
                   Authorization: `Bearer ${token || ''}` },
        body: JSON.stringify({ reason: reason.trim() }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.status === 'success') {
        setDone(body.data?.refunds || {});
        if (onCancelled) onCancelled(body.data);
        return;
      }
      setProblem(apiMessage(tt, body, 'cancelEvent.failed', 'That could not be cancelled.'));
    } catch {
      setProblem(tt('api.NETWORK_UNREACHABLE',
        'Could not reach the server. Check the connection and try again.'));
    } finally {
      setBusy(false);
    }
  };

  const stop = () => { setAsking(false); setProblem(''); setReason(''); };

  if (done) {
    const failed = (done.failed || []).length;
    return (
      <div className={styles.ask} role="status">
        <p className={styles.question}>
          {tt('cancelEvent.done', '{name} is cancelled.').replace('{name}', name || '')}
        </p>
        <p className={styles.reassure}>
          {plural(tt, done.refunded || 0,
            'cancelEvent.refundedOne', '{n} paid ticket refunded: {vc} VC back to wallets, card payments through Paystack.',
            'cancelEvent.refunded', '{n} paid tickets refunded: {vc} VC back to wallets, card payments through Paystack.')
            .replace('{vc}', String(done.coins || 0))}
          {failed > 0 && ' ' + plural(tt, failed,
            'cancelEvent.failedOne', '{n} card refund was refused by the gateway; V-ENT will retry it.',
            'cancelEvent.failed', '{n} card refunds were refused by the gateway; V-ENT will retry them.')}
        </p>
      </div>
    );
  }

  if (!asking) {
    return (
      <button type="button" className={`${className} ${styles.trigger}`}
              onClick={() => setAsking(true)}>
        <LuCircleOff aria-hidden="true" /> {tt('cancelEvent.cancel', 'Cancel the event')}
      </button>
    );
  }

  return (
    <div className={styles.ask}>
      <p className={styles.question}>
        {tt('cancelEvent.ask', 'Cancel {name} and refund everybody?').replace('{name}', name || '')}
      </p>
      <p className={styles.reassure}>
        {tt('cancelEvent.reassure', 'It stops selling and leaves the listing; its page keeps answering with the notice. Every paid ticket is refunded: coins to the wallet that paid, card payments through Paystack. Everybody holding a ticket is told, with your reason.')}
      </p>
      <label className={styles.reassure}>
        {tt('cancelEvent.why', 'Why is it being cancelled?')}
        <input type="text" className={styles.input} value={reason} maxLength={500}
               onChange={e => setReason(e.target.value)}
               placeholder={tt('cancelEvent.whyPlaceholder', 'The venue fell through')} />
      </label>
      {problem && <p className={styles.problem} role="alert">{problem}</p>}
      <div className={styles.actions}>
        {!problem && (
          <button type="button" className={styles.danger} disabled={busy || !reason.trim()}
                  onClick={send}>
            {busy ? tt('cancelEvent.cancelling', 'Cancelling and refunding...')
                  : tt('cancelEvent.yes', 'Yes, cancel it and refund everybody')}
          </button>
        )}
        <button type="button" className={styles.quiet} disabled={busy} onClick={stop}>
          {problem ? tt('ui.close.bbfa', 'Close') : tt('cancelEvent.keep', 'Keep it')}
        </button>
      </div>
    </div>
  );
}
