'use client';

import { appLocale } from '@/lib/appLocale';
import { mediaUrl } from '@/lib/mediaUrl';
import Image from 'next/image';
import Link from 'next/link';
import styles from './team-profile.module.css';
import { useT } from '@/i18n/LanguageProvider';
const STATUS_CLASS = {
  upcoming: 'statusUpcoming',
  in_progress: 'statusLive',
  completed: 'statusCompleted'
};
const TeamProfileTournaments = ({
  team
}) => {
  const tt = useT();
  const tournaments = team.tournaments || [];
  const fmtDate = d => {
    if (!d) return '-';
    return new Date(d).toLocaleDateString(appLocale(), {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };
  if (tournaments.length === 0) {
    return <section className={styles.panel}>
        <h3 className={styles.panelTitle}>{tt("ui.tournament.history.5f75", "Tournament History")}</h3>
        <p className={styles.stateText}>{tt("ui.no.tournament.history.yet.6b50", "No tournament history yet.")}</p>
      </section>;
  }
  return <section className={styles.panel}>
      <div className={styles.tableHeader}>
        <h3 className={styles.panelTitle}>{tt("ui.tournament.history.5f75", "Tournament History")} <span className={styles.countPill}>{tournaments.length}</span></h3>
      </div>

      {/* Desktop table */}
      <div className={styles.activityTable}>
        <div className={`${styles.activityHeader} ${styles.activityRow}`}>
          <div>{tt("ui.tournament.a2c1", "Tournament")}</div>
          <div>{tt("ui.game.e3e8", "Game")}</div>
          <div>{tt("ui.placement.ab89", "Placement")}</div>
          <div>{tt("ui.prize.d597", "Prize")}</div>
          <div>{tt("ui.date.eb9a", "Date")}</div>
          <div>{tt("ui.status.bae7", "Status")}</div>
        </div>

        {tournaments.map(t => <div key={t.id} className={`${styles.activityDataRow} ${styles.activityRow}`}>
            <div className={styles.activityNameCell}>
              <div className={styles.activityImg}>
                {t.banner ? <Image src={mediaUrl(t.banner)} alt="" aria-hidden="true" width={48} height={32} style={{
              objectFit: 'cover'
            }} /> : <div className={styles.avatarFallback} />}
              </div>
              <div>
                <p className={styles.memberName}>{t.name}</p>
                <Link href={`/tournaments/${t.slug || t.id}`} className={styles.activityLink}>{tt("ui.view.cf3d", "View →")}</Link>
              </div>
            </div>
            <div className={styles.cellMuted}>{t.game}</div>
            <div className={styles.placement}>{t.placement || '-'}</div>
            <div className={styles.prizeCell}>
              {t.prize_won ? `${Number(t.prize_won).toLocaleString()} VC` : '-'}
            </div>
            <div className={styles.cellMuted}>{fmtDate(t.date)}</div>
            <div>
              <span className={`${styles.statusBadge} ${styles[STATUS_CLASS[t.status] || 'statusUpcoming']}`}>
                {(t.status || '').replace('_', ' ')}
              </span>
            </div>
          </div>)}
      </div>

      {/* Mobile cards */}
      <div className={styles.activityMobile}>
        {tournaments.map(t => <div key={t.id} className={styles.activityMobileCard}>
            <div className={styles.activityNameCell}>
              <div className={styles.activityImg}>
                {t.banner ? <Image src={mediaUrl(t.banner)} alt="" aria-hidden="true" width={48} height={32} style={{
              objectFit: 'cover'
            }} /> : <div className={styles.avatarFallback} />}
              </div>
              <div>
                <p className={styles.memberName}>{t.name}</p>
                <p className={styles.cellMuted}>{t.game}</p>
              </div>
            </div>
            <div className={styles.activityMobileGrid}>
              <div><span className={styles.cellMuted}>{tt("ui.placement.ab89", "Placement")}</span><span>{t.placement || '-'}</span></div>
              <div><span className={styles.cellMuted}>{tt("ui.prize.d597", "Prize")}</span><span>{t.prize_won ? `${Number(t.prize_won).toLocaleString()} VC` : '-'}</span></div>
              <div><span className={styles.cellMuted}>{tt("ui.date.eb9a", "Date")}</span><span>{fmtDate(t.date)}</span></div>
              <div>
                <span className={styles.cellMuted}>{tt("ui.status.bae7", "Status")}</span>
                <span className={`${styles.statusBadge} ${styles[STATUS_CLASS[t.status] || 'statusUpcoming']}`}>
                  {(t.status || '').replace('_', ' ')}
                </span>
              </div>
            </div>
          </div>)}
      </div>
    </section>;
};
export default TeamProfileTournaments;