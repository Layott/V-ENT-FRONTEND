'use client'

import Image from 'next/image'
import Link from 'next/link'
import styles from './team-profile.module.css'

const STATUS_CLASS = {
  upcoming: 'statusUpcoming',
  in_progress: 'statusLive',
  completed: 'statusCompleted',
}

const TeamProfileEvents = ({ team }) => {
  const events = team.events || []

  const fmtDate = (d) => {
    if (!d) return '-'
    return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  if (events.length === 0) {
    return (
      <section className={styles.panel}>
        <h3 className={styles.panelTitle}>Event History</h3>
        <p className={styles.stateText}>No events attended yet.</p>
      </section>
    )
  }

  return (
    <section className={styles.panel}>
      <div className={styles.tableHeader}>
        <h3 className={styles.panelTitle}>Event History <span className={styles.countPill}>{events.length}</span></h3>
      </div>

      <div className={styles.activityTable}>
        <div className={`${styles.activityHeader} ${styles.activityRowEvents}`}>
          <div>Event</div>
          <div>Type</div>
          <div>Location</div>
          <div>Role</div>
          <div>Date</div>
          <div>Status</div>
        </div>

        {events.map((e) => (
          <div key={e.id} className={`${styles.activityDataRow} ${styles.activityRowEvents}`}>
            <div className={styles.activityNameCell}>
              <div className={styles.activityImg}>
                {e.banner ? (
                  <Image src={e.banner} alt="" width={48} height={32} style={{ objectFit: 'cover' }} />
                ) : (
                  <div className={styles.avatarFallback} />
                )}
              </div>
              <div>
                <p className={styles.memberName}>{e.name}</p>
                <Link href={`/events/${e.slug || e.id}`} className={styles.activityLink}>View →</Link>
              </div>
            </div>
            <div className={styles.cellMuted} style={{ textTransform: 'capitalize' }}>{e.type}</div>
            <div className={styles.cellMuted}>{e.location}</div>
            <div className={styles.placement}>{e.role}</div>
            <div className={styles.cellMuted}>{fmtDate(e.date)}</div>
            <div>
              <span className={`${styles.statusBadge} ${styles[STATUS_CLASS[e.status] || 'statusUpcoming']}`}>
                {(e.status || '').replace('_', ' ')}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className={styles.activityMobile}>
        {events.map((e) => (
          <div key={e.id} className={styles.activityMobileCard}>
            <div className={styles.activityNameCell}>
              <div className={styles.activityImg}>
                {e.banner ? (
                  <Image src={e.banner} alt="" width={48} height={32} style={{ objectFit: 'cover' }} />
                ) : (
                  <div className={styles.avatarFallback} />
                )}
              </div>
              <div>
                <p className={styles.memberName}>{e.name}</p>
                <p className={styles.cellMuted}>{e.location}</p>
              </div>
            </div>
            <div className={styles.activityMobileGrid}>
              <div><span className={styles.cellMuted}>Type</span><span style={{ textTransform: 'capitalize' }}>{e.type}</span></div>
              <div><span className={styles.cellMuted}>Role</span><span>{e.role}</span></div>
              <div><span className={styles.cellMuted}>Date</span><span>{fmtDate(e.date)}</span></div>
              <div>
                <span className={styles.cellMuted}>Status</span>
                <span className={`${styles.statusBadge} ${styles[STATUS_CLASS[e.status] || 'statusUpcoming']}`}>
                  {(e.status || '').replace('_', ' ')}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

export default TeamProfileEvents
