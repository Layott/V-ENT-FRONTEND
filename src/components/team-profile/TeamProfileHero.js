'use client';

import { mediaUrl, teamLogo } from '@/lib/mediaUrl';
import Image from 'next/image';
import Link from 'next/link';
import { LuGamepad2, LuMapPin, LuUsers } from 'react-icons/lu';
import { HiOutlineTrophy } from 'react-icons/hi2';
import { FiEdit3 } from 'react-icons/fi';
import styles from './team-profile.module.css';
import { useT } from '@/i18n/LanguageProvider';
import { useTx } from '@/i18n/LanguageProvider';
const TeamProfileHero = ({
  team,
  isOwner,
  requestState,
  onRequestJoin,
  onLeave,
  onShare
}) => {
  const tx = useTx();
  const tt = useT();
  const isMember = team.viewer_is_member ?? false;
  const pendingRequest = (team.viewer_request_status ?? requestState) === 'pending';
  const banner = team.banner || team.banner_url || team.team_banner;
  const logo = teamLogo(team);
  const open = team.is_accepting_members ?? team.open_to_join ?? false;
  const stats = team.stats || {};
  return <section className={styles.heroCard}>
      <div className={styles.heroBanner}>
        {banner ? <Image src={mediaUrl(banner)} alt={team.name} fill style={{
        objectFit: 'cover'
      }} sizes="100vw" /> : <div className={styles.heroBannerFallback} />}
        <div className={styles.heroOverlay} />
      </div>

      <div className={styles.heroContent}>
        <div className={styles.heroLogoWrap}>
          {logo ? <Image src={mediaUrl(logo)} alt="" aria-hidden="true" width={88} height={88} className={styles.heroLogo} /> : <div className={`${styles.heroLogo} ${styles.heroLogoFallback}`} />}
        </div>

        <div className={styles.heroText}>
          <div className={styles.heroNameRow}>
            <h1 className={styles.heroName}>{team.name}</h1>
            {team.tag && <span className={styles.heroTag}>{team.tag}</span>}
            {open && <span className={styles.heroOpenBadge}>{tt("ui.open.join.f8e3", "Open to join")}</span>}
          </div>

          <div className={styles.heroMeta}>
            <span className={styles.heroMetaItem}><LuGamepad2 className={styles.heroMetaIcon} /> {team.core_game || team.game}</span>
            <span className={styles.heroMetaItem}><LuMapPin className={styles.heroMetaIcon} /> {team.region || 'Nigeria'}</span>
            <span className={styles.heroMetaItem}><LuUsers className={styles.heroMetaIcon} /> {team.member_count} / {team.max_members || 10} {tt("ui.members.f13e", "members")}</span>
            <span className={styles.heroMetaItem}><HiOutlineTrophy className={styles.heroMetaIcon} /> {tt("ui.rank.71c5", "Rank #")}{stats.rank ?? '-'}</span>
          </div>
        </div>

        <div className={styles.heroActions}>
          {/* What is offered depends on what this team is to the person looking
              at it. Before the server sent that, the page guessed: a stranger
              was offered "Leave team", and an open team showed both buttons at
              once. */}
          {isOwner ? <>
              <Link href={`/edit-team-profile/${team.slug || team.id}`} className={`${styles.heroBtn} ${styles.heroBtnPrimary}`}>
                <FiEdit3 className={styles.heroBtnIcon} /> {tt("ui.manage.bf58", "Manage")}
              </Link>
              <button type="button" className={`${styles.heroBtn} ${styles.heroBtnGhost}`} onClick={onShare}>
                {tt("ui.share.09ca", "Share")}
              </button>
            </> : isMember ? <>
              <button type="button" className={`${styles.heroBtn} ${styles.heroBtnGhost}`} onClick={onShare}>
                {tt("ui.share.09ca", "Share")}
              </button>
              <button type="button" className={`${styles.heroBtn} ${styles.heroBtnGhost}`} onClick={onLeave}>
                {tt("ui.leave.team.b445", "Leave team")}
              </button>
            </> : <>
              <button type="button" className={`${styles.heroBtn} ${styles.heroBtnGhost}`} onClick={onShare}>
                {tt("ui.share.09ca", "Share")}
              </button>
              {pendingRequest ? <button type="button" className={`${styles.heroBtn} ${styles.heroBtnPrimary}`} disabled>
                  {tt("ui.request.sent.1689", "Request sent")}
                </button> : open ? <button type="button" className={`${styles.heroBtn} ${styles.heroBtnPrimary}`} onClick={onRequestJoin} disabled={requestState === 'loading'}>
                  {requestState === 'loading' ? tx("Sending...") : tx("Request to join")}
                </button> : <span className={styles.heroClosedNote}>{tt("ui.not.accepting.members.98ed", "Not accepting members")}</span>}
            </>}
        </div>
      </div>
    </section>;
};
export default TeamProfileHero;