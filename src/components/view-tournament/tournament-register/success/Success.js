// SuccessModal.js
import styles from './success.module.css';
import { entryFeeVc } from '@/components/tournament-lib/tournamentApi';

const SuccessModal = ({ isOpen, onClose, tournament, registrationData }) => {
  const handleClose = () => {
    if (onClose) {
      onClose();
    }
  };

  if (!isOpen) return null;

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
          <h2 className={styles.successTitle}>Registration Successful!</h2>
          <p className={styles.successMessage}>
            You have successfully registered for <strong>{tournament?.tournament_title || tournament?.name || 'the tournament'}</strong>
          </p>

          {/* Registration Details */}
          <div className={styles.detailsCard}>
            <h3 className={styles.detailsTitle}>Registration Details</h3>

            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Tournament:</span>
              <span className={styles.detailValue}>{tournament?.tournament_title || tournament?.name || 'Untitled tournament'}</span>
            </div>
            
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Registration Type:</span>
              <span className={styles.detailValue}>
                {registrationData?.type === 'team' ? 'Team Registration' : 'Individual Registration'}
              </span>
            </div>

            {registrationData?.type === 'team' && registrationData?.team && (
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Team:</span>
                <span className={styles.detailValue}>{registrationData.team.name}</span>
              </div>
            )}

            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Entry Fee:</span>
              <span className={styles.detailValue}>
                {registrationData?.paymentMethod === 'event_ticket'
                  ? `${entryFeeVc(tournament).toLocaleString()} VC, covered`
                  : entryFeeVc(tournament) > 0
                    ? `${entryFeeVc(tournament).toLocaleString()} VC`
                    : 'FREE'}
              </span>
            </div>

            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Payment Method:</span>
              <span className={styles.detailValue}>
                {registrationData?.paymentMethod === 'event_ticket'
                  ? `${registrationData?.eventName || 'Event'} ticket`
                  : registrationData?.paymentMethod === 'free'
                    ? 'Free Entry'
                    : 'Wallet (VENT COINS)'}
              </span>
            </div>
          </div>

          {/* Next Steps */}
          <div className={styles.nextSteps}>
            <h4 className={styles.nextStepsTitle}>What&apos;s Next?</h4>
            <ul className={styles.nextStepsList}>
              <li>A confirmation with your slot details is on its way to your email</li>
              <li>Check in opens 30 minutes before your first match</li>
              <li>
                Tournament starts on {(() => {
                  const raw = tournament?.start_date_and_time || tournament?.start_date;
                  const d = raw ? new Date(raw) : null;
                  return d && !Number.isNaN(d.getTime()) ? d.toLocaleDateString() : 'TBD';
                })()}
              </li>
            </ul>
          </div>
        </div>

        <div className={styles.modalFooter}>
          <button className={styles.closeButton} onClick={handleClose}>
            Done
          </button>
          <button className={styles.viewTournamentButton} onClick={() => {
            // Navigate to tournament details
            window.location.href = tournament?.id
              ? `/tournaments/view-tournament?id=${tournament.id}`
              : '/tournaments';
          }}>
            View Tournament
          </button>
        </div>
      </div>
    </div>
  );
};

export default SuccessModal;