// ./src/components/view-tournament/tournament-register/ReviewModal.js
import { mediaUrl } from '@/lib/mediaUrl';
import { useEffect, useState } from 'react';
import { formatDateRange, formatNumber } from '@/lib/datetime';
import { entryFeeVc } from '@/components/tournament-lib/tournamentApi';
import { formatLabel } from '@/lib/formatLabel';
import Image from 'next/image';
import styles from './review.module.css';
import image from '@/images/signed_in_user_big.webp';
import { useT } from '@/i18n/LanguageProvider';
import UserChip from '@/components/user-chip/UserChip';
import Avatar from '@/components/avatar/Avatar';
const ReviewModal = ({
  isOpen,
  onClose,
  onBack,
  onProceed,
  tournament,
  selectedTeam,
  teamMembers
}) => {
  const tt = useT();
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [showTeamMembers, setShowTeamMembers] = useState(true);
  const handleBack = () => {
    if (onBack) {
      onBack();
    }
  };
  const handleClose = () => {
    setAgreedToTerms(false);
    if (onClose) {
      onClose();
    }
  };
  const handleCancel = () => {
    setAgreedToTerms(false);
    if (onClose) {
      onClose();
    }
  };
  const handleProceedToPayment = () => {
    if (agreedToTerms && onProceed) {
      onProceed({
        tournament,
        selectedTeam,
        teamMembers,
        agreedToTerms
      });
    }
  };
  const toggleTeamMembers = () => {
    setShowTeamMembers(!showTeamMembers);
  };
  // What entering costs, from the same quote the payment step charges.
  //
  // This step used to draw a dollar sign and a hard-coded coin placeholder
  // from before the wallet existed, while the payment step one press later
  // drew the real number. Two screens, one fact: both read
  // `/tournament/<ref>/entry-quote/`, and neither computes a fee itself.
  const listedFee = entryFeeVc(tournament);
  const coveredByTicket = Boolean(tournament?.entry_covered_by_ticket) && listedFee > 0;
  const [quote, setQuote] = useState(null);
  useEffect(() => {
    if (!isOpen || listedFee <= 0 || coveredByTicket) return undefined;
    let cancelled = false;
    const ref = tournament?.slug || tournament?.id;
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/tournament/${ref}/entry-quote/`)
      .then(res => res.json().then(body => ({ ok: res.ok, body })))
      .then(({ ok, body }) => {
        if (!cancelled && ok && body.status === 'success') setQuote(body.data);
      })
      .catch(() => {
        // The listed entry stands until the quote arrives; the payment
        // step asks again and refuses nothing on this screen's account.
      });
    return () => { cancelled = true; };
  }, [isOpen, listedFee, coveredByTicket, tournament?.slug, tournament?.id]);
  const feeOnTop = quote && quote.buyer_pays_fee ? Number(quote.buyer_fee_vc || 0) : 0;
  const charge = coveredByTicket ? 0
    : quote && quote.total_vc != null ? Number(quote.total_vc) : listedFee;
  if (!isOpen) return null;
  return <div className={styles.modalOverlay} onClick={handleClose}>
      <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div className={styles.headerLeft}>
            <button className={styles.backButton} onClick={handleBack}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M19 12H5m7-7l-7 7 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <h2 className={styles.modalTitle}>{tt("ui.review.e29a", "Review")}</h2>
          </div>
          <button className={styles.closeButton} onClick={handleClose}>
            ×
          </button>
        </div>
        
        <div className={styles.modalBody}>
          {/* Tournament Header */}
          <div className={styles.tournamentHeader}>
            <div className={styles.tournamentImage}>
              <Image src={mediaUrl(tournament?.tournament_banner || image)} alt={tournament?.tournament_title || ''} width={60} height={60} />
            </div>
            <h3 className={styles.tournamentTitle}>
              {tournament?.tournament_title || tournament?.name || ''}
            </h3>
          </div>

          {/* Tournament Details */}
          <div className={styles.detailsSection}>
            <h4 className={styles.sectionTitle}>{tt("ui.tournament.details.22a0", "Tournament details")}</h4>
            
            <div className={styles.detailsList}>
              <div className={styles.detailItem}>
                <div className={styles.detailLeft}>
                  <svg className={styles.detailIcon} width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" stroke="currentColor" strokeWidth="2" />
                    <line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" strokeWidth="2" />
                    <line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" strokeWidth="2" />
                    <line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" strokeWidth="2" />
                  </svg>
                  <span className={styles.detailLabel}>{tt("ui.format.041a", "Format")}</span>
                </div>
                <span className={styles.detailValue}>{formatLabel(tt, tournament?.bracket_type)}</span>
              </div>

              <div className={styles.detailItem}>
                <div className={styles.detailLeft}>
                  <svg className={styles.detailIcon} width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" stroke="currentColor" strokeWidth="2" />
                    <line x1="8" y1="21" x2="16" y2="21" stroke="currentColor" strokeWidth="2" />
                    <line x1="12" y1="17" x2="12" y2="21" stroke="currentColor" strokeWidth="2" />
                  </svg>
                  <span className={styles.detailLabel}>{tt("ui.game.e3e8", "Game")}</span>
                </div>
                <span className={styles.detailValue}>
                  {tournament?.game || selectedTeam?.game || '-'}
                </span>
              </div>

              <div className={styles.detailItem}>
                <div className={styles.detailLeft}>
                  <svg className={styles.detailIcon} width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                    <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2" />
                  </svg>
                  <span className={styles.detailLabel}>{tt("ui.entry.fee.a428", "Entry Fee")}</span>
                </div>
                <span className={styles.detailValue}>
                  {charge > 0
                    ? `${formatNumber(charge)} VC`
                    : coveredByTicket
                      ? tt('register.coveredByTicket', 'Covered by your ticket')
                      : tt('register.free', 'Free')}
                  {feeOnTop > 0 && <span className={styles.feeLine}>
                    {tt('register.feeOnTop', 'Entry {entry} VC + service fee ({pct}% + {flat} naira) {fee} VC')
                      .replace('{entry}', formatNumber(Number(quote.entry_vc)))
                      .replace('{pct}', String(quote.fee_pct))
                      .replace('{flat}', formatNumber(Number(quote.fee_flat_ngn)))
                      .replace('{fee}', formatNumber(feeOnTop))}
                  </span>}
                  {/* What missing check-in costs, said before the money moves
                      rather than after (CEO decision D-1, and the organiser's
                      own choice since 29 September 2026). */}
                  {charge > 0 && tournament?.check_in?.forfeit_without_check_in && <span className={styles.feeLine}>
                    {tournament.check_in.refund_no_shows
                      ? tt('register.noShowRefunded', 'Check in before it starts. If you do not, you are taken out and this fee goes back to your wallet.')
                      : tt('register.noShowKept', 'Check in before it starts. If you do not, you are taken out and this fee is not refunded.')}
                  </span>}
                </span>
              </div>

              <div className={styles.detailItem}>
                <div className={styles.detailLeft}>
                  <svg className={styles.detailIcon} width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" stroke="currentColor" strokeWidth="2" />
                    <line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" strokeWidth="2" />
                    <line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" strokeWidth="2" />
                    <line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" strokeWidth="2" />
                  </svg>
                  <span className={styles.detailLabel}>{tt("ui.date.eb9a", "Date")}</span>
                </div>
                <span className={styles.detailValue}>
                  {formatDateRange(tournament?.start_date_and_time, tournament?.end_date_and_time)}
                </span>
              </div>

              <div className={styles.detailItem}>
                <div className={styles.detailLeft}>
                  <svg className={styles.detailIcon} width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" stroke="currentColor" strokeWidth="2" />
                    <circle cx="12" cy="10" r="3" stroke="currentColor" strokeWidth="2" />
                  </svg>
                  <span className={styles.detailLabel}>{tt("ui.location.d219", "Location")}</span>
                </div>
                <span className={styles.detailValue}>
                  {tournament?.tournament_location || tournament?.location || tt('review.type.online', 'Online')}
                </span>
              </div>
            </div>
          </div>

          {/* Registrants Section */}
          <div className={styles.registrantsSection}>
            <div className={styles.registrantsHeader}>
              <h4 className={styles.sectionTitle}>{tt("ui.registrants.ffde", "Registrants")}</h4>
              {/* Entering commits the team as it is; the only change on offer
                  is a different team. */}
              <button type="button" className={styles.editRosterButton} onClick={onBack}>
                {tt('register.changeTeam', 'Change team')}
              </button>
            </div>

            {/* Team Info */}
            <div className={styles.teamCard}>
              <div className={styles.teamHeader}>
                <div className={styles.teamInfo}>
                  <div className={styles.teamAvatar}>
                    {/* Plain img so remote backend/CDN team logos render without
                        next/image domain config; falls back to the bundled avatar. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={mediaUrl(selectedTeam?.logo || selectedTeam?.image || image.src)} alt={selectedTeam?.name || "Team"} width={40} height={40} style={{
                    objectFit: 'cover',
                    borderRadius: '8px'
                  }} />
                  </div>
                  <div className={styles.teamDetails}>
                    <h5 className={styles.teamName}>{selectedTeam?.name || ''}</h5>
                    <div className={styles.teamMeta}>
                      <span className={styles.gameInfo}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                          <rect x="2" y="3" width="20" height="14" rx="2" ry="2" stroke="currentColor" strokeWidth="2" />
                          <line x1="8" y1="21" x2="16" y2="21" stroke="currentColor" strokeWidth="2" />
                          <line x1="12" y1="17" x2="12" y2="21" stroke="currentColor" strokeWidth="2" />
                        </svg>
                        {selectedTeam?.game || tournament?.game || '-'}
                      </span>
                      <span className={styles.membersInfo}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" />
                          <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2" />
                          <path d="M22 21v-2a4 4 0 0 0-3-3.87" stroke="currentColor" strokeWidth="2" />
                          <path d="M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="2" />
                        </svg>
                        {teamMembers?.length || selectedTeam?.members || 0} {tt("ui.members.1cb4", "Members")}
                      </span>
                    </div>
                  </div>
                </div>
                <button className={styles.toggleButton} onClick={toggleTeamMembers}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className={showTeamMembers ? styles.rotated : ''}>
                    <polyline points="6,9 12,15 18,9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>

              {/* Team Members */}
              {showTeamMembers && <div className={styles.teamMembersList}>
                  {(teamMembers || []).map(member => <div key={member.id} className={styles.memberItem}>
                      <div className={styles.memberAvatar}>
                        <Avatar src={mediaUrl(member.avatar)} name={member.username || member.name} size={32} />
                      </div>
                      <div className={styles.memberDetails}>
                        <UserChip user={{ ...member, full_name: member.name }}
                                  size={0} secondary link={false}
                                  nameClassName={styles.memberName}
                                  handleClassName={styles.memberUsername} />
                      </div>
                    </div>)}
                </div>}
            </div>
          </div>

          {/* Terms and Conditions */}
          <div className={styles.termsSection}>
            <label className={styles.termsCheckbox}>
              <input type="checkbox" checked={agreedToTerms} onChange={e => setAgreedToTerms(e.target.checked)} />
              <span className={styles.checkmark}></span>
              <span className={styles.termsText}>
                {tt("ui.i.agree.v.ent.65bd", "I agree to the v-ent")} <a href="/terms" target="_blank" rel="noopener noreferrer" className={styles.termsLink}>{tt("ui.terms.conditions.9b45", "terms and conditions")}</a> {tt("ui.rules.this.tournament.649a", "and rules of this tournament.")}
              </span>
            </label>
          </div>
        </div>

        <div className={styles.modalFooter}>
          <button className={styles.cancelButton} onClick={handleCancel}>
            {tt("ui.cancel.77df", "Cancel")}
          </button>
          <button className={`${styles.proceedButton} ${!agreedToTerms ? styles.disabled : ''}`} onClick={handleProceedToPayment} disabled={!agreedToTerms}>
            {tt("ui.proceed.payment.d679", "Proceed to payment →")}
          </button>
        </div>
      </div>
    </div>;
};
export default ReviewModal;