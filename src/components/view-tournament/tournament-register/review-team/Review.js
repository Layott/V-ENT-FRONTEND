// ./src/components/view-tournament/tournament-register/ReviewModal.js
import { useState } from 'react';
import Image from 'next/image';
import styles from './review.module.css';
import image from '@/images/signed_in_user_big.webp';


const ReviewModal = ({ isOpen, onClose, onBack, onProceed, tournament, selectedTeam, teamMembers }) => {
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

  const formatDate = (dateString) => {
    if (!dateString) return "1st Oct - 21st Oct 2024";
    
    const startDate = new Date(dateString);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 20); // Assuming 20 days duration
    
    const options = { day: 'numeric', month: 'short', year: 'numeric' };
    return `${startDate.toLocaleDateString('en-GB', options)} - ${endDate.toLocaleDateString('en-GB', options)}`;
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={handleClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div className={styles.headerLeft}>
            <button className={styles.backButton} onClick={handleBack}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M19 12H5m7-7l-7 7 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <h2 className={styles.modalTitle}>Review</h2>
          </div>
          <button className={styles.closeButton} onClick={handleClose}>
            ×
          </button>
        </div>
        
        <div className={styles.modalBody}>
          {/* Tournament Header */}
          <div className={styles.tournamentHeader}>
            <div className={styles.tournamentImage}>
              <Image 
                src={tournament?.tournament_banner || image} 
                alt={tournament?.tournament_title || "Counter strike battle - Unilag"}
                width={60}
                height={60}
              />
            </div>
            <h3 className={styles.tournamentTitle}>
              {tournament?.tournament_title || "Counter strike battle - Unilag"}
            </h3>
          </div>

          {/* Tournament Details */}
          <div className={styles.detailsSection}>
            <h4 className={styles.sectionTitle}>Tournament details</h4>
            
            <div className={styles.detailsList}>
              <div className={styles.detailItem}>
                <div className={styles.detailLeft}>
                  <svg className={styles.detailIcon} width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" stroke="currentColor" strokeWidth="2"/>
                    <line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" strokeWidth="2"/>
                    <line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" strokeWidth="2"/>
                    <line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                  <span className={styles.detailLabel}>Format</span>
                </div>
                <span className={styles.detailValue}>Single Elimination</span>
              </div>

              <div className={styles.detailItem}>
                <div className={styles.detailLeft}>
                  <svg className={styles.detailIcon} width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" stroke="currentColor" strokeWidth="2"/>
                    <line x1="8" y1="21" x2="16" y2="21" stroke="currentColor" strokeWidth="2"/>
                    <line x1="12" y1="17" x2="12" y2="21" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                  <span className={styles.detailLabel}>Game</span>
                </div>
                <span className={styles.detailValue}>
                  {tournament?.game || selectedTeam?.game || "Counter Strike"}
                </span>
              </div>

              <div className={styles.detailItem}>
                <div className={styles.detailLeft}>
                  <svg className={styles.detailIcon} width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                    <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                  <span className={styles.detailLabel}>Entry Fee</span>
                </div>
                <span className={styles.detailValue}>
                  {tournament?.entry_fee_price === 0 || tournament?.entry_fee_price === "0.00" ? (
                    <>
                      <svg className={styles.coinIcon} width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" stroke="currentColor" strokeWidth="2"/>
                        <point cx="12" cy="17" stroke="currentColor" strokeWidth="2"/>
                      </svg>
                      40 vent coins
                    </>
                  ) : (
                    `$${tournament?.entry_fee_price || "0.00"}`
                  )}
                </span>
              </div>

              <div className={styles.detailItem}>
                <div className={styles.detailLeft}>
                  <svg className={styles.detailIcon} width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" stroke="currentColor" strokeWidth="2"/>
                    <line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" strokeWidth="2"/>
                    <line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" strokeWidth="2"/>
                    <line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                  <span className={styles.detailLabel}>Date</span>
                </div>
                <span className={styles.detailValue}>
                  {formatDate(tournament?.start_date_and_time)}
                </span>
              </div>

              <div className={styles.detailItem}>
                <div className={styles.detailLeft}>
                  <svg className={styles.detailIcon} width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" stroke="currentColor" strokeWidth="2"/>
                    <circle cx="12" cy="10" r="3" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                  <span className={styles.detailLabel}>Location</span>
                </div>
                <span className={styles.detailValue}>
                  {tournament?.location || "Landmark Beach, Water Corporation Drive, Lagos, Nigeria."}
                </span>
              </div>
            </div>
          </div>

          {/* Registrants Section */}
          <div className={styles.registrantsSection}>
            <div className={styles.registrantsHeader}>
              <h4 className={styles.sectionTitle}>Registrants</h4>
              <button className={styles.editRosterButton}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" strokeWidth="2"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2"/>
                </svg>
                Edit Roster
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
                    <img
                      src={selectedTeam?.logo || selectedTeam?.image || image.src}
                      alt={selectedTeam?.name || "Team"}
                      width={40}
                      height={40}
                      style={{ objectFit: 'cover', borderRadius: '8px' }}
                    />
                  </div>
                  <div className={styles.teamDetails}>
                    <h5 className={styles.teamName}>{selectedTeam?.name || "Kill Streak Team"}</h5>
                    <div className={styles.teamMeta}>
                      <span className={styles.gameInfo}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                          <rect x="2" y="3" width="20" height="14" rx="2" ry="2" stroke="currentColor" strokeWidth="2"/>
                          <line x1="8" y1="21" x2="16" y2="21" stroke="currentColor" strokeWidth="2"/>
                          <line x1="12" y1="17" x2="12" y2="21" stroke="currentColor" strokeWidth="2"/>
                        </svg>
                        {selectedTeam?.game || "Counter Strike"}
                      </span>
                      <span className={styles.membersInfo}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2"/>
                          <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
                          <path d="M22 21v-2a4 4 0 0 0-3-3.87" stroke="currentColor" strokeWidth="2"/>
                          <path d="M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="2"/>
                        </svg>
                        {teamMembers?.length || 4} Members
                      </span>
                    </div>
                  </div>
                </div>
                <button className={styles.toggleButton} onClick={toggleTeamMembers}>
                  <svg 
                    width="20" 
                    height="20" 
                    viewBox="0 0 24 24" 
                    fill="none"
                    className={showTeamMembers ? styles.rotated : ''}
                  >
                    <polyline points="6,9 12,15 18,9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>

              {/* Team Members */}
              {showTeamMembers && (
                <div className={styles.teamMembersList}>
                  {(teamMembers || [
                    { id: 1, name: "Nathan Drake", username: "@frostbite", avatar: "/api/placeholder/32/32" },
                    { id: 2, name: "Nathan Drake", username: "@frostbite", avatar: "/api/placeholder/32/32" },
                    { id: 3, name: "Nathan Drake", username: "@frostbite", avatar: "/api/placeholder/32/32" },
                    { id: 4, name: "Nathan Drake", username: "@frostbite", avatar: "/api/placeholder/32/32" }
                  ]).map((member) => (
                    <div key={member.id} className={styles.memberItem}>
                      <div className={styles.memberAvatar}>
                        <Image 
                          src={member.avatar || image} 
                          alt={member.name}
                          width={32}
                          height={32}
                        />
                      </div>
                      <div className={styles.memberDetails}>
                        <span className={styles.memberName}>{member.name}</span>
                        <span className={styles.memberUsername}>{member.username}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Terms and Conditions */}
          <div className={styles.termsSection}>
            <label className={styles.termsCheckbox}>
              <input 
                type="checkbox" 
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
              />
              <span className={styles.checkmark}></span>
              <span className={styles.termsText}>
                I agree to the v-ent <a href="#" className={styles.termsLink}>terms and conditions</a> and rules of this tournament.
              </span>
            </label>
          </div>
        </div>

        <div className={styles.modalFooter}>
          <button className={styles.cancelButton} onClick={handleCancel}>
            Cancel
          </button>
          <button 
            className={`${styles.proceedButton} ${!agreedToTerms ? styles.disabled : ''}`}
            onClick={handleProceedToPayment}
            disabled={!agreedToTerms}
          >
            Proceed to payment →
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReviewModal;