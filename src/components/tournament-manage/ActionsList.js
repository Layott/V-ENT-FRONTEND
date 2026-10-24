'use client';

// Needs you, at the top of the console (P4a, design section 12).
//
// Everything the people running this tournament have to settle: disputes, a
// match nobody is moving, a tie that a line cuts through, places a qualifier
// declined, pulls waiting for a preview, check-in that has ended. Each row
// names the tab that settles it, and the server only sends the kinds this
// viewer's permissions reach, so a helper who records results never sees the
// draw.

import Link from 'next/link';
import { useT } from '@/i18n/LanguageProvider';
import { formatWithZone } from '@/lib/datetime';
import { todoText, TAB_FOR_KIND } from '@/lib/nextActions';
import useLiveData from '@/lib/useLiveData';
import { ventFetch, API } from '@/components/tournament-lib/tournamentApi';
import styles from './actions-list.module.css';

export default function ActionsList({ tournamentRef, token, slug, onOpenTab }) {
  const tt = useT();
  const { data: items, loading, error, refresh } = useLiveData(
    async ({ signal }) => {
      const body = await ventFetch(API.TOURNAMENT.ACTIONS_LIST(tournamentRef), { token, signal });
      return body?.items || [];
    },
    [tournamentRef, token],
  );

  let body;
  if (items === null && loading) {
    body = <p className={styles.muted}>{tt('todo.loading', 'Loading...')}</p>;
  } else if (items === null) {
    body = <div className={styles.errorRow}>
      <p className={styles.error}>{error || tt('todo.loadFailed', 'The list could not be loaded.')}</p>
      <button type="button" className={styles.btnGhost} onClick={refresh}>
        {tt('ui.retry.9f5c', 'Retry')}
      </button>
    </div>;
  } else if (items.length === 0) {
    body = <p className={styles.muted}>{tt('todo.empty', 'Nothing needs you right now.')}</p>;
  } else {
    body = <ul className={styles.list}>
      {items.map((item, index) => {
        const tab = TAB_FOR_KIND[item.kind];
        return <li key={`${index}-${item.kind}`} className={styles.row}>
          <div className={styles.body}>
            <p className={styles.text}>{todoText(tt, item)}</p>
            {item.since && <p className={styles.meta}>
              {tt('todo.since', 'Since {when}.').replace('{when}', formatWithZone(item.since))}
            </p>}
          </div>
          <div className={styles.action}>
            {item.kind === 'close_check_in'
              ? <Link href={`/tournaments/${slug || tournamentRef}`} className={styles.btn}>
                {tt('todo.openTournament', 'Open the tournament')}
              </Link>
              : tab && <button type="button" className={styles.btn} onClick={() => onOpenTab?.(tab)}>
                {tt('todo.open', 'Open')}
              </button>}
          </div>
        </li>;
      })}
    </ul>;
  }

  return <section className={styles.panel} aria-label={tt('todo.title', 'Needs you')}>
    <p className={styles.label}>{tt('todo.title', 'Needs you')}</p>
    {body}
  </section>;
}
