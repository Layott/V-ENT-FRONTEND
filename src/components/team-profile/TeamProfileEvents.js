'use client';

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
const TeamProfileEvents = ({
  team
}) => {
  const tt = useT();
  const events = team.events || [];
  const fmtDate = d => {
    if (!d) return '-';
    return new Date(d).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };
  if (events.length === 0) {
    return <section className={styles.panel}>
        <h3 className={styles.panelTitle}>{tt("ui.event.history.79cd", "Event History")}</h3>
        <p className={styles.stateText}>{tt("ui.no.events.attended.yet.fcc6", "No events attended yet.")}</p>
      </section>;
  }
  return <section className={styles.panel}>
      <div className={styles.tableHeader}>
        <h3 className={styles.panelTitle}>{tt("ui.event.history.79cd", "Event History")} <span className={styles.countPill}>{events.length}</span></h3>
      </div>

      <div className={styles.activityTable}>
        <div className={`${styles.activityHeader} ${styles.activityRowEvents}`}>
          <div>{tt("ui.event.ad89", "Event")}</div>
          <div>{tt("ui.type.3deb", "Type")}</div>
          <div>{tt("ui.location.d219", "Location")}</div>
          <div>{tt("ui.role.c3f1", "Role")}</div>
          <div>{tt("ui.date.eb9a", "Date")}</div>
          <div>{tt("ui.status.bae7", "Status")}</div>
        </div>

        {events.map(e => <div key={e.id} className={`${styles.activityDataRow} ${styles.activityRowEvents}`}>
            <div className={styles.activityNameCell}>
              <div className={styles.activityImg}>
                {e.banner ? <Image src={mediaUrl(e.banner)} alt="" aria-hidden="true" width={48} height={32} style={{
              objectFit: 'cover'
            }} /> : <div className={styles.avatarFallback} />}
              </div>
              <div>
                <p className={styles.memberName}>{e.name}</p>
                <Link href={`/events/${e.slug || e.id}`} className={styles.activityLink}>{tt("ui.view.cf3d", "View →")}</Link>
              </div>
            </div>
            <div className={styles.cellMuted} style={{
          textTransform: 'capitalize'
        }}>{e.type}</div>
            <div className={styles.cellMuted}>{e.location}</div>
            <div className={styles.placement}>{e.role}</div>
            <div className={styles.cellMuted}>{fmtDate(e.date)}</div>
            <div>
              <span className={`${styles.statusBadge} ${styles[STATUS_CLASS[e.status] || 'statusUpcoming']}`}>
                {(e.status || '').replace('_', ' ')}
              </span>
            </div>
          </div>)}
      </div>

      <div className={styles.activityMobile}>
        {events.map(e => <div key={e.id} className={styles.activityMobileCard}>
            <div className={styles.activityNameCell}>
              <div className={styles.activityImg}>
                {e.banner ? <Image src={mediaUrl(e.banner)} alt="" aria-hidden="true" width={48} height={32} style={{
              objectFit: 'cover'
            }} /> : <div className={styles.avatarFallback} />}
              </div>
              <div>
                <p className={styles.memberName}>{e.name}</p>
                <p className={styles.cellMuted}>{e.location}</p>
              </div>
            </div>
            <div className={styles.activityMobileGrid}>
              <div><span className={styles.cellMuted}>{tt("ui.type.3deb", "Type")}</span><span style={{
              textTransform: 'capitalize'
            }}>{e.type}</span></div>
              <div><span className={styles.cellMuted}>{tt("ui.role.c3f1", "Role")}</span><span>{e.role}</span></div>
              <div><span className={styles.cellMuted}>{tt("ui.date.eb9a", "Date")}</span><span>{fmtDate(e.date)}</span></div>
              <div>
                <span className={styles.cellMuted}>{tt("ui.status.bae7", "Status")}</span>
                <span className={`${styles.statusBadge} ${styles[STATUS_CLASS[e.status] || 'statusUpcoming']}`}>
                  {(e.status || '').replace('_', ' ')}
                </span>
              </div>
            </div>
          </div>)}
      </div>
    </section>;
};
export default TeamProfileEvents;