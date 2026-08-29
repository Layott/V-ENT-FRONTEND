'use client';

import { mediaUrl } from '@/lib/mediaUrl';
import Image from 'next/image';
import Link from 'next/link';
import { LuGamepad2 } from 'react-icons/lu';
import { FaTwitter, FaInstagram, FaDiscord, FaTwitch, FaYoutube, FaFacebook } from 'react-icons/fa';
import styles from './team-profile.module.css';
import { useT } from '@/i18n/LanguageProvider';
import { useTx } from '@/i18n/LanguageProvider';
import UserChip from '@/components/user-chip/UserChip';
const SOCIAL_ICONS = {
  twitter: FaTwitter,
  instagram: FaInstagram,
  discord: FaDiscord,
  twitch: FaTwitch,
  youtube: FaYoutube,
  facebook: FaFacebook
};
const SOCIAL_LABELS = {
  twitter: 'Twitter',
  instagram: 'Instagram',
  discord: 'Discord',
  twitch: 'Twitch',
  youtube: 'YouTube',
  facebook: 'Facebook'
};
const TeamProfileOverview = ({
  team
}) => {
  const tx = useTx();
  const tt = useT();
  const social = team.social_links || {};
  const owner = team.owner || {};
  const ownerAvatar = owner.profile_pic || owner.profile_picture || owner.avatar;
  const stats = team.stats || {};
  return <div className={styles.overviewGrid}>
      <div className={styles.overviewLeft}>
        <section className={styles.panel}>
          <h3 className={styles.panelTitle}>{tt("ui.about.6b21", "About")}</h3>
          <p className={styles.bioText}>{team.bio || team.description || tx("This team has not written a description yet.")}</p>
        </section>

        <section className={styles.panel}>
          <h3 className={styles.panelTitle}>{tt("ui.core.game.5f4e", "Core Game")}</h3>
          <div className={styles.coreGame}>
            <div className={styles.coreGameBadge}>
              <LuGamepad2 className={styles.coreGameIcon} />
            </div>
            <div>
              <p className={styles.coreGameName}>{team.core_game || team.game}</p>
              <p className={styles.coreGameSub}>{tt("ui.primary.competition.title.6bca", "Primary competition title")}</p>
            </div>
          </div>
        </section>

        <section className={styles.panel}>
          <h3 className={styles.panelTitle}>{tt("ui.social.links.339c", "Social Links")}</h3>
          {Object.keys(social).filter(k => social[k]).length === 0 ? <p className={styles.bioText}>{tt("ui.no.links.added.yet.2906", "No links added yet.")}</p> : <div className={styles.socialList}>
              {Object.entries(social).map(([key, url]) => {
            if (!url) return null;
            const Icon = SOCIAL_ICONS[key] || FaTwitter;
            return <a key={key} href={url} target="_blank" rel="noopener noreferrer" className={styles.socialItem}>
                    <Icon className={styles.socialIcon} />
                    <span>{SOCIAL_LABELS[key] || key}</span>
                  </a>;
          })}
            </div>}
        </section>
      </div>

      <div className={styles.overviewRight}>
        <section className={styles.panel}>
          <h3 className={styles.panelTitle}>{tt("ui.owner.89ff", "Owner")}</h3>
          <div className={styles.ownerRow}>
            <div className={styles.ownerAvatar}>
              {ownerAvatar ? <Image src={mediaUrl(ownerAvatar)} alt="" aria-hidden="true" width={48} height={48} /> : <div className={styles.ownerAvatarFallback} />}
            </div>
            <div>
              {/* The owner is a person: their name carries their badge
                  and opens their profile. */}
              <UserChip user={owner} size={0} secondary
                        nameClassName={styles.ownerName}
                        handleClassName={styles.ownerUsername} />
            </div>
            <Link href={`/user-profile`} className={styles.ownerLink}>{tt("ui.view.profile.b987", "View profile")}</Link>
          </div>
        </section>

        {team.organizer && <section className={styles.panel}>
            <h3 className={styles.panelTitle}>{tt("ui.organizer.debd", "Organizer")}</h3>
            <p className={styles.organizerName}>{team.organizer.name || team.organizer.username}</p>
            <p className={styles.bioText} style={{
          fontSize: 'var(--fs-p-size-mobile)'
        }}>{tt("ui.linked.v.ent.verified.56c1", "Linked to V-ENT verified organizer.")}</p>
          </section>}

        <section className={styles.panel}>
          <h3 className={styles.panelTitle}>{tt("ui.quick.stats.f7cb", "Quick Stats")}</h3>
          <div className={styles.quickStats}>
            <div className={styles.quickStat}>
              <span className={styles.quickStatValue}>{Math.round((stats.win_rate || 0) * 100)}%</span>
              <span className={styles.quickStatLabel}>{tt("ui.win.rate.79bc", "Win rate")}</span>
            </div>
            <div className={styles.quickStat}>
              <span className={styles.quickStatValue}>{stats.tournaments_won || 0}</span>
              <span className={styles.quickStatLabel}>{tt("ui.wins.b6c0", "Wins")}</span>
            </div>
            <div className={styles.quickStat}>
              <span className={styles.quickStatValue}>#{stats.rank || '-'}</span>
              <span className={styles.quickStatLabel}>{tt("ui.rank.dd48", "Rank")}</span>
            </div>
          </div>
        </section>
      </div>
    </div>;
};
export default TeamProfileOverview;