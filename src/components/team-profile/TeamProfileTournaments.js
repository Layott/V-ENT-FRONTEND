'use client'

import Image from 'next/image'
import Link from 'next/link'
import styles from './team-profile.module.css'

const STATUS_CLASS = {
  upcoming: 'statusUpcoming',
  in_progress: 'statusLive',
  completed: 'statusCompleted',
}

const TeamProfileTournaments = ({ team }) => {
  const tournaments = team.tournaments || []

  const fmtDate = (d) => {
    if (!d) return '-'
    return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  if (tournaments.length === 0) {
    return (
      <section className={styles.panel}>
        <h3 className={styles.panelTitle}>Tournament History</h3>
        <p className={styles.stateText}>No tournament history yet.</p>
      </section>
    )
  }

  return (
    <section className={styles.panel}>
      <div className={styles.tableHeader}>
        <h3 className={styles.panelTitle}>Tournament History <span className={styles.countPill}>{tournaments.length}</span></h3>
      </div>

      {/* Desktop table */}
      <div className={styles.activityTable}>
        <div className={`${styles.activityHeader} ${styles.activityRow}`}>
          <div>Tournament</div>
          <div>Game</div>
          <div>Placement</div>
          <div>Prize</div>
          <div>Date</div>
          <div>Status</div>
        </div>

        {tournaments.map((t) => (
          <div key={t.id} className={`${styles.activityDataRow} ${styles.activityRow}`}>
            <div className={styles.activityNameCell}>
              <div className={styles.activityImg}>
                {t.banner ? (
                  <Image src={t.banner} alt="" width={48} height={32} style={{ objectFit: 'cover' }} />
                ) : (
                  <div className={styles.avatarFallback} />
                )}
              </div>
              <div>
                <p className={styles.memberName}>{t.name}</p>
                <Link href={`/tournaments/${t.slug || t.id}`} className={styles.activityLink}>View →</Link>
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
          </div>
        ))}
      </div>

      {/* Mobile cards */}
      <div className={styles.activityMobile}>
        {tournaments.map((t) => (
          <div key={t.id} className={styles.activityMobileCard}>
            <div className={styles.activityNameCell}>
              <div className={styles.activityImg}>
                {t.banner ? (
                  <Image src={t.banner} alt="" width={48} height={32} style={{ objectFit: 'cover' }} />
                ) : (
                  <div className={styles.avatarFallback} />
                )}
              </div>
              <div>
                <p className={styles.memberName}>{t.name}</p>
                <p className={styles.cellMuted}>{t.game}</p>
              </div>
            </div>
            <div className={styles.activityMobileGrid}>
              <div><span className={styles.cellMuted}>Placement</span><span>{t.placement || '-'}</span></div>
              <div><span className={styles.cellMuted}>Prize</span><span>{t.prize_won ? `${Number(t.prize_won).toLocaleString()} VC` : '-'}</span></div>
              <div><span className={styles.cellMuted}>Date</span><span>{fmtDate(t.date)}</span></div>
              <div>
                <span className={styles.cellMuted}>Status</span>
                <span className={`${styles.statusBadge} ${styles[STATUS_CLASS[t.status] || 'statusUpcoming']}`}>
                  {(t.status || '').replace('_', ' ')}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

export default TeamProfileTournaments
