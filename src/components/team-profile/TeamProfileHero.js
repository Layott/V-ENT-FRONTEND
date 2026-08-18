'use client'

import Image from 'next/image'
import Link from 'next/link'
import { LuGamepad2, LuMapPin, LuUsers } from 'react-icons/lu'
import { HiOutlineTrophy } from 'react-icons/hi2'
import { FiEdit3 } from 'react-icons/fi'
import styles from './team-profile.module.css'

const TeamProfileHero = ({ team, isOwner, requestState, onRequestJoin, onLeave }) => {
  const banner = team.banner || team.banner_url || team.team_banner
  const logo = team.logo || team.logo_url || team.team_logo
  const open = team.is_accepting_members ?? team.open_to_join ?? false

  const stats = team.stats || {}

  return (
    <section className={styles.heroCard}>
      <div className={styles.heroBanner}>
        {banner ? (
          <Image src={banner} alt={team.name} fill style={{ objectFit: 'cover' }} sizes="100vw" />
        ) : (
          <div className={styles.heroBannerFallback} />
        )}
        <div className={styles.heroOverlay} />
      </div>

      <div className={styles.heroContent}>
        <div className={styles.heroLogoWrap}>
          {logo ? (
            <Image src={logo} alt="" width={88} height={88} className={styles.heroLogo} />
          ) : (
            <div className={`${styles.heroLogo} ${styles.heroLogoFallback}`} />
          )}
        </div>

        <div className={styles.heroText}>
          <div className={styles.heroNameRow}>
            <h1 className={styles.heroName}>{team.name}</h1>
            {team.tag && <span className={styles.heroTag}>{team.tag}</span>}
            {open && <span className={styles.heroOpenBadge}>Open to join</span>}
          </div>

          <div className={styles.heroMeta}>
            <span className={styles.heroMetaItem}><LuGamepad2 className={styles.heroMetaIcon} /> {team.core_game || team.game}</span>
            <span className={styles.heroMetaItem}><LuMapPin className={styles.heroMetaIcon} /> {team.region || 'Nigeria'}</span>
            <span className={styles.heroMetaItem}><LuUsers className={styles.heroMetaIcon} /> {team.member_count} / {team.max_members || 10} members</span>
            <span className={styles.heroMetaItem}><HiOutlineTrophy className={styles.heroMetaIcon} /> Rank #{stats.rank ?? '-'}</span>
          </div>
        </div>

        <div className={styles.heroActions}>
          {isOwner ? (
            <>
              <Link href={`/edit-team-profile?id=${team.id}`} className={`${styles.heroBtn} ${styles.heroBtnPrimary}`}>
                <FiEdit3 className={styles.heroBtnIcon} /> Manage
              </Link>
              <Link href={`/teams/team-profile?id=${team.id}`} className={`${styles.heroBtn} ${styles.heroBtnGhost}`}>
                Share
              </Link>
            </>
          ) : open ? (
            <>
              <button
                type="button"
                className={`${styles.heroBtn} ${styles.heroBtnPrimary}`}
                onClick={onRequestJoin}
                disabled={requestState === 'pending' || requestState === 'loading'}
              >
                {requestState === 'pending' ? 'Pending request' : requestState === 'loading' ? 'Sending…' : 'Request to join'}
              </button>
              <button type="button" className={`${styles.heroBtn} ${styles.heroBtnGhost}`} onClick={onLeave}>
                Leave team
              </button>
            </>
          ) : (
            <button type="button" className={`${styles.heroBtn} ${styles.heroBtnGhost}`} onClick={onLeave}>
              Leave team
            </button>
          )}
        </div>
      </div>
    </section>
  )
}

export default TeamProfileHero
