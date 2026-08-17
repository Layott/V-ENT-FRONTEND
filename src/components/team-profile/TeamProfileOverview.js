'use client'

import Image from 'next/image'
import Link from 'next/link'
import { LuGamepad2 } from 'react-icons/lu'
import { FaTwitter, FaInstagram, FaDiscord, FaTwitch, FaYoutube, FaFacebook } from 'react-icons/fa'
import styles from './team-profile.module.css'

const SOCIAL_ICONS = {
  twitter: FaTwitter,
  instagram: FaInstagram,
  discord: FaDiscord,
  twitch: FaTwitch,
  youtube: FaYoutube,
  facebook: FaFacebook,
}

const SOCIAL_LABELS = {
  twitter: 'Twitter',
  instagram: 'Instagram',
  discord: 'Discord',
  twitch: 'Twitch',
  youtube: 'YouTube',
  facebook: 'Facebook',
}

const TeamProfileOverview = ({ team }) => {
  const social = team.social_links || {}
  const owner = team.owner || {}
  const ownerAvatar = owner.profile_pic || owner.profile_picture || owner.avatar
  const stats = team.stats || {}

  return (
    <div className={styles.overviewGrid}>
      <div className={styles.overviewLeft}>
        <section className={styles.panel}>
          <h3 className={styles.panelTitle}>About</h3>
          <p className={styles.bioText}>{team.bio || team.description || 'No bio yet.'}</p>
        </section>

        <section className={styles.panel}>
          <h3 className={styles.panelTitle}>Core Game</h3>
          <div className={styles.coreGame}>
            <div className={styles.coreGameBadge}>
              <LuGamepad2 className={styles.coreGameIcon} />
            </div>
            <div>
              <p className={styles.coreGameName}>{team.core_game || team.game}</p>
              <p className={styles.coreGameSub}>Primary competition title</p>
            </div>
          </div>
        </section>

        <section className={styles.panel}>
          <h3 className={styles.panelTitle}>Social Links</h3>
          {Object.keys(social).filter((k) => social[k]).length === 0 ? (
            <p className={styles.bioText}>No links added yet.</p>
          ) : (
            <div className={styles.socialList}>
              {Object.entries(social).map(([key, url]) => {
                if (!url) return null
                const Icon = SOCIAL_ICONS[key] || FaTwitter
                return (
                  <a key={key} href={url} target="_blank" rel="noopener noreferrer" className={styles.socialItem}>
                    <Icon className={styles.socialIcon} />
                    <span>{SOCIAL_LABELS[key] || key}</span>
                  </a>
                )
              })}
            </div>
          )}
        </section>
      </div>

      <div className={styles.overviewRight}>
        <section className={styles.panel}>
          <h3 className={styles.panelTitle}>Owner</h3>
          <div className={styles.ownerRow}>
            <div className={styles.ownerAvatar}>
              {ownerAvatar ? (
                <Image src={ownerAvatar} alt="" width={48} height={48} />
              ) : (
                <div className={styles.ownerAvatarFallback} />
              )}
            </div>
            <div>
              <p className={styles.ownerName}>{owner.full_name || owner.name || owner.username}</p>
              <p className={styles.ownerUsername}>@{owner.username}</p>
            </div>
            <Link href={`/user-profile`} className={styles.ownerLink}>View profile</Link>
          </div>
        </section>

        {team.organizer && (
          <section className={styles.panel}>
            <h3 className={styles.panelTitle}>Organizer</h3>
            <p className={styles.organizerName}>{team.organizer.name || team.organizer.username}</p>
            <p className={styles.bioText} style={{ fontSize: 'var(--fs-p-size-mobile)' }}>Linked to V-ENT verified organizer.</p>
          </section>
        )}

        <section className={styles.panel}>
          <h3 className={styles.panelTitle}>Quick Stats</h3>
          <div className={styles.quickStats}>
            <div className={styles.quickStat}>
              <span className={styles.quickStatValue}>{Math.round((stats.win_rate || 0) * 100)}%</span>
              <span className={styles.quickStatLabel}>Win rate</span>
            </div>
            <div className={styles.quickStat}>
              <span className={styles.quickStatValue}>{stats.tournaments_won || 0}</span>
              <span className={styles.quickStatLabel}>Wins</span>
            </div>
            <div className={styles.quickStat}>
              <span className={styles.quickStatValue}>#{stats.rank || '-'}</span>
              <span className={styles.quickStatLabel}>Rank</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

export default TeamProfileOverview
