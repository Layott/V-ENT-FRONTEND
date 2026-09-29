'use client';

// SuccessModal.js
import { useT } from '@/i18n/LanguageProvider';
import styles from './success.module.css';
import { entryFeeVc } from '@/components/tournament-lib/tournamentApi';
import { formatNumber, formatWithZone } from '@/lib/datetime';

const SuccessModal = ({ isOpen, onClose, tournament, registrationData }) => {
  const tt = useT();
  const handleClose = () => {
    if (onClose) {
      onClose();
    }
  };

  if (!isOpen) return null;
  const title = tournament?.tournament_title || tournament?.name || tt('register.theTournament', 'the tournament');
  const fee = entryFeeVc(tournament);
  const checkIn = tournament?.check_in || null;
  const starts = tournament?.start_date_and_time || tournament?.start_date || null;

  return (
    <div className={styles.modalOverlay} onClick={handleClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalBody}>
          {/* Success Icon */}
          <div className={styles.successIcon}>
            <svg width="80" height="80" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="#D4AF37" strokeWidth="2" fill="#D4AF37"/>
              <path d="M9 12l2 2 4-4" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>

          {/* Success Message */}
          <h2 className={styles.successTitle}>{tt('register.success', 'You are registered')}</h2>
          <p className={styles.successMessage}>
            {tt("register.successFor", "You have successfully registered for")} <strong>{title}</strong>
          </p>

          {/* Registration Details */}
          <div className={styles.detailsCard}>
            <h3 className={styles.detailsTitle}>{tt('register.details', 'Your registration')}</h3>

            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>{tt('register.tournamentLabel', 'Tournament')}</span>
              <span className={styles.detailValue}>{title}</span>
            </div>

            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>{tt('register.typeLabel', 'Registration type')}</span>
              <span className={styles.detailValue}>
                {registrationData?.type === 'team'
                  ? tt('register.typeTeam', 'Team registration')
                  : tt('register.typeSolo', 'Individual registration')}
              </span>
            </div>

            {registrationData?.type === 'team' && registrationData?.team && (
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>{tt('register.teamLabel', 'Team')}</span>
                <span className={styles.detailValue}>{registrationData.team.name}</span>
              </div>
            )}

            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>{tt('register.feeLabel', 'Entry fee')}</span>
              <span className={styles.detailValue}>
                {registrationData?.paymentMethod === 'event_ticket'
                  ? tt('register.coveredByTicketVc', '{n} VC, covered by your ticket').replace('{n}', formatNumber(fee))
                  : fee > 0
                    ? (registrationData?.feeOnTop > 0
                      ? tt('register.paidWithFee', '{total} VC ({entry} VC entry + {fee} VC service fee)')
                          .replace('{total}', formatNumber(registrationData.amount))
                          .replace('{entry}', formatNumber(fee))
                          .replace('{fee}', formatNumber(registrationData.feeOnTop))
                      : tt('register.paidVc', '{n} VC').replace('{n}', formatNumber(fee)))
                    : tt('register.free', 'Free')}
              </span>
            </div>

            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>{tt('register.methodLabel', 'Paid with')}</span>
              <span className={styles.detailValue}>
                {registrationData?.paymentMethod === 'event_ticket'
                  ? (registrationData?.eventName
                    ? tt('register.methodTicket', 'Your {event} ticket').replace('{event}', registrationData.eventName)
                    : tt('register.methodTicketUnnamed', 'Your event ticket'))
                  : registrationData?.paymentMethod === 'free'
                    ? tt('register.methodFree', 'Free entry')
                    : tt('register.methodWallet', 'Wallet (VENT COINS)')}
              </span>
            </div>
          </div>

          {/* Next Steps */}
          <div className={styles.nextSteps}>
            <h4 className={styles.nextStepsTitle}>{tt('register.whatNext', 'What happens next')}</h4>
            <ul className={styles.nextStepsList}>
              <li>{tt('register.emailOnWay', 'A confirmation with your slot details is on its way to your email')}</li>
              {/* The real window, from the organiser's own setting. This said
                  "30 minutes before your first match" whatever the organiser
                  chose (found 29 September 2026). */}
              {checkIn?.opens_at && <li>
                {tt('register.checkInFrom', 'Check in from {time}. Check-in closes when the tournament starts.')
                  .replace('{time}', formatWithZone(checkIn.opens_at))}
              </li>}
              {checkIn?.forfeit_without_check_in && fee > 0 && registrationData?.paymentMethod !== 'event_ticket' && <li>
                {checkIn.refund_no_shows
                  ? tt('register.noShowRefunded', 'Check in before it starts. If you do not, you are taken out and this fee goes back to your wallet.')
                  : tt('register.noShowKept', 'Check in before it starts. If you do not, you are taken out and this fee is not refunded.')}
              </li>}
              <li>
                {starts
                  ? tt('register.startsOn', 'The tournament starts on {date}').replace('{date}', formatWithZone(starts))
                  : tt('register.startsTbd', 'The start time is still to be announced')}
              </li>
            </ul>
          </div>
        </div>

        <div className={styles.modalFooter}>
          <button className={styles.closeButton} onClick={handleClose}>
            {tt("register.done", "Done")}
          </button>
          <button className={styles.viewTournamentButton} onClick={() => {
            // Navigate to tournament details
            window.location.href = tournament?.id
              ? `/tournaments/${tournament.slug || tournament.id}`
              : '/tournaments';
          }}>
            {tt("register.viewTournament", "View Tournament")}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SuccessModal;