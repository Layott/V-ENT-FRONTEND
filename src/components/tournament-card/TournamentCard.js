'use client';

// One tournament card, drawn the same wherever a tournament is listed: the
// /tournaments page and the home page (apple-design review, inbox 547: the home
// page showed pictures of a made-up 2024 tournament instead of real ones).

import Link from 'next/link';
import { LuTrophy, LuCalendar, LuUsers, LuRadio } from 'react-icons/lu';
import { entryFeeVc, tournamentStatus } from '@/components/tournament-lib/tournamentApi';
import styles from '@/app/tournaments/tournament.module.css';
import { useT, useTx } from '@/i18n/LanguageProvider';
import Tag from '@/components/tag/Tag';
import { slotsText } from '@/lib/slots';
import { mediaUrl } from '@/lib/mediaUrl';
import { prizeText } from '@/lib/prize';
import { formatLabel } from '@/lib/formatLabel';
import { formatDate, formatNumber } from '@/lib/datetime';

const LIVE_STATUSES = ['ongoing', 'live', 'in_progress', 'registration_closed'];
const STATUS_LABELS = {
  upcoming: 'Upcoming',
  registration_open: 'Registration Open',
  published: 'Upcoming',
  ongoing: 'Live',
  live: 'Live',
  in_progress: 'Live',
  completed: 'Completed'
};
const STATUS_BADGE_CLASS = {
  upcoming: 'status_upcoming',
  registration_open: 'status_upcoming',
  published: 'status_upcoming',
  ongoing: 'status_in_progress',
  live: 'status_in_progress',
  in_progress: 'status_in_progress',
  completed: 'status_completed'
};
const formatDateRange = (s, e) => `${formatDate(s)} - ${formatDate(e)}`;

const TournamentCard = ({
  t
}) => {
  const tx = useTx();
  const tt = useT();
  const status = tournamentStatus(t);
  const statusLabel = STATUS_LABELS[status] || (status && status !== 'unknown' ? status : 'Upcoming');
  const badgeClass = styles[STATUS_BADGE_CLASS[status]] || styles.status_upcoming;
  const isLive = LIVE_STATUSES.includes(status);
  const banner = mediaUrl(t?.banner_image || t?.banner) || '';
  const fee = entryFeeVc(t);
  const current = t?.current_participants ?? 0;
  return <Link href={`/tournaments/${t?.slug || t?.id || ''}`} className={styles.tCard}>
      <div className={styles.tCardBanner} style={banner ? {
      backgroundImage: `url(${banner})`
    } : undefined}>
        <span className={`${styles.statusBadge} ${badgeClass}`}>
          {isLive && <LuRadio className={styles.liveDot} />} {statusLabel}
        </span>
        {fee === 0 && <span className={styles.freeBadge}>{tt("ui.free.entry.2e48", "FREE ENTRY")}</span>}
      </div>
      <div className={styles.tCardBody}>
        <Tag on="card">{t?.game || tx("Unknown Game")}</Tag>
        <h2 className={styles.tCardTitle}>{t?.name || tx("Untitled Tournament")}</h2>
        <div className={styles.tCardMeta}>
          <div className={styles.metaRow}>
            <LuTrophy className={styles.metaIcon} />
            <span className={styles.metaPrize}>{prizeText(t)}</span>
          </div>
          <div className={styles.metaRow}>
            <LuCalendar className={styles.metaIcon} />
            <span>{formatDateRange(t?.start_date, t?.end_date)}</span>
          </div>
          <div className={styles.metaRow}>
            <LuUsers className={styles.metaIcon} />
            <span>{slotsText(tt, current, t?.max_participants, t?.participant_type === 'team' ? 'team' : 'player')}</span>
          </div>
        </div>
        <div className={styles.tCardFooter}>
          <span className={styles.formatTag}>{formatLabel(tt, t?.format)}</span>
          {fee > 0 ? <span className={styles.entryFee}>{formatNumber(fee)} {tt("ui.vc.entry.454e", "VC entry")}</span> : <span className={styles.entryFreeText}>{tt("ui.free.75f5", "Free")}</span>}
        </div>
      </div>
    </Link>;
};

export default TournamentCard;
