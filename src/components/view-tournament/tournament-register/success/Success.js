// SuccessModal.js
import { useState, useEffect } from 'react';
import styles from './success.module.css';

const SuccessModal = ({ isOpen, onClose, tournament, registrationData }) => {
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShowConfetti(true);
      // Auto close after 5 seconds if desired
      // const timer = setTimeout(() => {
      //   onClose();
      // }, 5000);
      // return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleClose = () => {
    setShowConfetti(false);
    if (onClose) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={handleClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        {showConfetti && (
          <div className={styles.confetti}>
            {[...Array(20)].map((_, i) => (
              <div key={i} className={styles.confettiPiece} style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                backgroundColor: ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6'][Math.floor(Math.random() * 5)]
              }} />
            ))}
          </div>
        )}
        
        <div className={styles.modalBody}>
          {/* Success Icon */}
          <div className={styles.successIcon}>
            <svg width="80" height="80" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="#10b981" strokeWidth="2" fill="#10b981"/>
              <path d="M9 12l2 2 4-4" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>

          {/* Success Message */}
          <h2 className={styles.successTitle}>Registration Successful!</h2>
          <p className={styles.successMessage}>
            You have successfully registered for <strong>{tournament?.tournament_title || "the tournament"}</strong>
          </p>

          {/* Registration Details */}
          <div className={styles.detailsCard}>
            <h3 className={styles.detailsTitle}>Registration Details</h3>
            
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Tournament:</span>
              <span className={styles.detailValue}>{tournament?.tournament_title || "Counter strike battle - Unilag"}</span>
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
                {tournament?.entry_fee_price === 0 || tournament?.entry_fee_price === "0.00" 
                  ? "40 vent coins" 
                  : `$${tournament?.entry_fee_price}`
                }
              </span>
            </div>

            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Payment Method:</span>
              <span className={styles.detailValue}>
                {registrationData?.paymentMethod === 'wallet' ? 'Wallet' : 'Paystack'}
              </span>
            </div>
          </div>

          {/* Next Steps */}
          <div className={styles.nextSteps}>
            <h4 className={styles.nextStepsTitle}>What&apos;s Next?</h4>
            <ul className={styles.nextStepsList}>
              <li>Check your email for tournament confirmation</li>
              <li>Join the tournament Discord server for updates</li>
              <li>Tournament starts on {new Date(tournament?.start_date_and_time).toLocaleDateString() || "TBD"}</li>
            </ul>
          </div>
        </div>

        <div className={styles.modalFooter}>
          <button className={styles.closeButton} onClick={handleClose}>
            Done
          </button>
          <button className={styles.viewTournamentButton} onClick={() => {
            // Navigate to tournament details
            window.location.href = `/tournaments/${tournament?.id || 81}`;
          }}>
            View Tournament
          </button>
        </div>
      </div>
    </div>
  );
};

export default SuccessModal;