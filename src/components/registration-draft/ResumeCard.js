'use client';

// "Pick up where you left off" (inbox 436), as the approved mockup drew it.
//
// Shown wherever somebody comes back in: the tournament page, the event's
// Tournaments tab and My tournaments. Continue opens the registration at the
// step it was saved at; Start again throws the draft away.

import { useState } from 'react';
import Link from 'next/link';
import { useT } from '@/i18n/LanguageProvider';
import { apiMessage } from '@/lib/apiMessage';
import { formatDate, formatDateTime } from '@/lib/datetime';
import { discardDraft, stepText } from '@/lib/registrationDraft';
import styles from './resume-card.module.css';

/**
 * @param draft      a draft from the server (tournament, mode, team, step, saved_at, expires_at)
 * @param token      the session token, for Start again
 * @param onGone     called once the draft has been thrown away
 * @param showTitle  name the tournament (on a page that lists several)
 */
export default function ResumeCard({ draft, token, onGone, showTitle = true }) {
  const tt = useT();
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState('');
  if (!draft?.tournament?.slug) return null;
  const slug = draft.tournament.slug;
  const who = draft.mode === 'team' && draft.team?.name
    ? draft.team.name
    : tt('regDraft.solo', 'yourself, as a solo player');

  const startAgain = async () => {
    setBusy(true);
    setProblem('');
    try {
      await discardDraft(slug, token);
      onGone?.(slug);
    } catch (err) {
      setProblem(apiMessage(tt, err, 'regDraft.discardFailed', 'That did not go through. Try again.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className={styles.card} aria-label={tt('regDraft.kicker', 'Pick up where you left off')}>
      <span className={styles.kicker}>{tt('regDraft.kicker', 'Pick up where you left off')}</span>
      <p className={styles.title}>
        {showTitle
          ? tt('regDraft.title', 'You were registering {who} for {tournament}')
            .replace('{who}', who).replace('{tournament}', draft.tournament.title)
          : tt('regDraft.titleHere', 'You were registering {who} for this tournament').replace('{who}', who)}
      </p>
      <p className={styles.muted}>
        {tt('regDraft.where', 'Next: {step}. Saved {saved}; kept until {until}.')
          .replace('{step}', stepText(tt, draft.step))
          .replace('{saved}', formatDateTime(draft.saved_at))
          .replace('{until}', formatDate(draft.expires_at))}
      </p>
      {problem && <p className={styles.problem} role="alert">{problem}</p>}
      <div className={styles.row}>
        <Link href={`/tournaments/${encodeURIComponent(slug)}/register?resume=1`} className={styles.goldBtn}>
          {tt('regDraft.continue', 'Continue')}
        </Link>
        <button type="button" className={styles.quiet} disabled={busy} onClick={startAgain}>
          {tt('regDraft.startAgain', 'Start again')}
        </button>
      </div>
    </section>
  );
}
