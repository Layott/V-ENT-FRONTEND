'use client';

// What to do next, on the tournament page (P4a, design section 12).
//
// One list for whoever is looking: the check-in button, the match a person is
// due in, a place they may decline, and the register button for a stranger.
// The server works out each row and its deadline (next_actions.for_viewer), so
// the buttons and the countdowns cannot disagree with each other.
//
// A signed-out visitor is shown the register row inside NeedsAccount, never a
// live button. Nothing is decided until the viewer has resolved (useViewer).
// The strip renders nothing when there is nothing to do.

import { useState } from 'react';
import Link from 'next/link';
import MatchRoom from '@/components/view-tournament/match-room/MatchRoom';
import NeedsAccount from '@/components/needs-account/NeedsAccount';
import { useT } from '@/i18n/LanguageProvider';
import { apiMessage } from '@/lib/apiMessage';
import { formatWithZone } from '@/lib/datetime';
import { useViewer } from '@/lib/gating';
import { nextActionText } from '@/lib/nextActions';
import useLiveData from '@/lib/useLiveData';
import { ventFetch, API } from '@/components/tournament-lib/tournamentApi';
import styles from './next-actions.module.css';

export default function NextActions({ tournamentRef, token, slug, onOpenTab }) {
  const tt = useT();
  const viewer = useViewer();
  const [openMatchId, setOpenMatchId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');

  // Waits for the viewer to resolve, so a signed-in member is never shown the
  // stranger's list first and then their own.
  const { data: actions, refresh } = useLiveData(
    async ({ signal }) => {
      const body = await ventFetch(API.TOURNAMENT.NEXT_ACTIONS(tournamentRef), { token, signal });
      return body?.actions || [];
    },
    [tournamentRef, token],
    { enabled: !viewer.loading },
  );

  // Nothing to say, or not yet known: the strip does not appear at all.
  if (!actions || actions.length === 0) return null;

  const checkIn = async () => {
    setBusy(true);
    setNotice('');
    try {
      await ventFetch(API.TOURNAMENT.CHECK_IN(tournamentRef), { method: 'POST', token });
      refresh();
    } catch (error) {
      setNotice(apiMessage(tt, error, 'next.checkInFailed', 'Could not check you in.'));
    } finally {
      setBusy(false);
    }
  };

  const registerHref = `/tournaments/${slug || tournamentRef}/register`;

  const actionButton = (action) => {
    const opensLater = Boolean(action.opens_at);
    switch (action.action) {
      case 'register':
        if (opensLater) {
          return <button type="button" className={styles.btn} disabled>
            {tt('next.button.register', 'Register')}
          </button>;
        }
        return <NeedsAccount action={tt('next.registerAction', 'enter this tournament')}>
          <Link href={registerHref} className={styles.btn}>
            {tt('next.button.register', 'Register')}
          </Link>
        </NeedsAccount>;
      case 'check_in':
        return <button type="button" className={styles.btn} onClick={checkIn}
                       disabled={busy || opensLater}>
          {busy ? tt('next.button.checkingIn', 'Checking in...') : tt('next.button.checkIn', 'Check in')}
        </button>;
      case 'decline_place':
        return <button type="button" className={styles.btnGhost} onClick={() => onOpenTab?.('bracket')}>
          {tt('next.button.bracket', 'Open bracket')}
        </button>;
      case 'check_in_match':
      case 'confirm_score':
      case 'report':
      case 'play':
        if (!action.match) return null;
        return <button type="button" className={styles.btn}
                       onClick={() => setOpenMatchId(action.match.id)}>
          {tt('next.button.openMatch', 'Open match')}
        </button>;
      default:
        return null;
    }
  };

  return <section className={styles.strip} aria-label={tt('next.title', 'What to do next')}>
    <p className={styles.label}>{tt('next.title', 'What to do next')}</p>

    <ul className={styles.list}>
      {actions.map((action) => {
        const key = `${action.action}-${action.registration_id ?? ''}-${action.match?.id ?? ''}`;
        const button = actionButton(action);
        return <li key={key} className={styles.row}>
          <div className={styles.body}>
            <p className={styles.text}>{nextActionText(tt, action)}</p>
            {action.opens_at && <p className={styles.meta}>
              {tt('next.opensAt', 'Opens {when}.').replace('{when}', formatWithZone(action.opens_at))}
            </p>}
          </div>
          {button && <div className={styles.action}>{button}</div>}
        </li>;
      })}
    </ul>

    {notice && <p className={styles.error}>{notice}</p>}

    {openMatchId && <MatchRoom matchId={openMatchId} tournamentRef={tournamentRef} token={token}
                               onClose={() => setOpenMatchId(null)}
                               onChanged={() => refresh()} />}
  </section>;
}
