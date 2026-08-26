import { useEffect, useState } from 'react';
import styles from '../tournament-register/tournament-register.module.css';
import ChooseTeamModal from '../tournament-register/team/Team';
import EditTeamRosterModal from './edit-team/EditTeam';
import ReviewModal from './review-team/Review';
import PaymentModal from './payment/Payment';
import SuccessModal from './success/Success';
import { useT } from '@/i18n/LanguageProvider';
import { useTx } from '@/i18n/LanguageProvider';
const TournamentRegistrationModal = ({
  isOpen,
  onClose,
  onNext,
  tournament,
  resumeReference = null
}) => {
  const tx = useTx();
  const tt = useT();
  const [selectedOption, setSelectedOption] = useState(null);
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [showEditRosterModal, setShowEditRosterModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [teamMembers, setTeamMembers] = useState([]);
  const [registrationData, setRegistrationData] = useState(null);

  // Returning from a Paystack wallet top-up mid-registration (see
  // payment/Payment.js `handleTopUp`) lands back on this same page with a
  // `?reference=` query param. Resume straight at the Payment step instead of
  // making the user pick Mode → Team → Roster → Review again. The in-flight
  // selection was stashed in sessionStorage by Payment.js right before the
  // redirect to Paystack.
  useEffect(() => {
    if (!isOpen || !resumeReference || !tournament?.id) return;
    let draft = null;
    try {
      const raw = window.sessionStorage.getItem(`ventRegDraft:${tournament.id}`);
      if (raw) draft = JSON.parse(raw);
    } catch {
      draft = null;
    }
    const type = draft?.type === 'team' ? 'team' : 'individual';
    setSelectedOption(type);
    setSelectedTeam(draft?.team || null);
    setTeamMembers(draft?.members || []);
    setRegistrationData({
      type,
      team: draft?.team || null,
      members: draft?.members || []
    });
    setShowTeamModal(false);
    setShowEditRosterModal(false);
    setShowReviewModal(false);
    setShowSuccessModal(false);
    setShowPaymentModal(true);
    // Only re-run this when the modal (re)opens with a resume reference -
    // not on every keystroke of unrelated state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, resumeReference, tournament?.id]);
  const handleOptionSelect = option => {
    setSelectedOption(option);
  };

  // `tournament_access` decides who may enter: solo players, teams, or either.
  // Both cards were shown on every tournament regardless, so a solo-only
  // tournament invited people to register a team and only failed at the API
  // several steps later.
  const access = tournament?.tournament_access || tournament?.participant_type || 'team_and_individual';
  const allowsIndividual = access !== 'team';
  const allowsTeam = access !== 'individual';

  // With one mode available there is nothing to choose. Pick it, so the first
  // screen the entrant sees is the one that does something.
  useEffect(() => {
    if (!isOpen) return;
    if (allowsIndividual && !allowsTeam) setSelectedOption('individual');else if (allowsTeam && !allowsIndividual) setSelectedOption('team');
  }, [isOpen, allowsIndividual, allowsTeam]);
  const handleNext = () => {
    if (selectedOption === 'individual') {
      setRegistrationData({
        type: 'individual'
      });
      setShowPaymentModal(true);
    } else if (selectedOption === 'team') {
      setShowTeamModal(true);
    }
  };
  const handleCancel = () => {
    resetAllState();
    if (onClose) {
      onClose();
    }
  };
  const resetAllState = () => {
    setSelectedOption(null);
    setShowTeamModal(false);
    setShowEditRosterModal(false);
    setShowReviewModal(false);
    setShowPaymentModal(false);
    setShowSuccessModal(false); // Add this
    setSelectedTeam(null);
    setTeamMembers([]);
    setRegistrationData(null);
  };
  const handleTeamModalBack = () => {
    setShowTeamModal(false);
    setSelectedTeam(null);
  };
  const handleTeamModalClose = () => {
    resetAllState();
    if (onClose) {
      onClose();
    }
  };
  const handleTeamProceed = team => {
    setSelectedTeam(team);
    setShowTeamModal(false);
    setShowEditRosterModal(true);
  };
  const handleEditRosterBack = () => {
    setShowEditRosterModal(false);
    setShowTeamModal(true);
  };
  const handleEditRosterClose = () => {
    resetAllState();
    if (onClose) {
      onClose();
    }
  };
  const handleEditRosterProceed = (team, members, action) => {
    setSelectedTeam(team);
    setTeamMembers(members);
    setShowEditRosterModal(false);
    setShowReviewModal(true);
  };

  // Review Modal Handlers
  const handleReviewBack = () => {
    setShowReviewModal(false);
    setShowEditRosterModal(true);
  };
  const handleReviewClose = () => {
    resetAllState();
    if (onClose) {
      onClose();
    }
  };
  const handleReviewProceed = reviewData => {
    setRegistrationData({
      type: 'team',
      team: selectedTeam,
      members: teamMembers,
      ...reviewData
    });
    setShowReviewModal(false);
    setShowPaymentModal(true);
  };
  const handlePaymentBack = () => {
    setShowPaymentModal(false);
    if (registrationData?.type === 'team') {
      setShowReviewModal(true);
    } else {
      setRegistrationData(null);
    }
  };
  const handlePaymentClose = () => {
    resetAllState();
    if (onClose) {
      onClose();
    }
  };
  const handlePaymentComplete = paymentData => {
    setShowPaymentModal(false);
    setRegistrationData(prev => ({
      ...prev,
      ...paymentData
    }));
    setShowSuccessModal(true);
  };
  const handleSuccessClose = () => {
    resetAllState();
    if (onClose) {
      onClose();
    }
    if (onNext) {
      onNext('completed', registrationData);
    }
  };
  if (!isOpen) return null;
  return <>
      
      {!showTeamModal && !showEditRosterModal && !showReviewModal && !showPaymentModal && !showSuccessModal && <div className={styles.modalOverlay} onClick={handleCancel}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>{tt("ui.register.tournament.0b66", "Register For Tournament")}</h2>
              <button className={styles.closeButton} onClick={handleCancel}>
                ×
              </button>
            </div>

            <div className={styles.modalBody}>
              <p className={styles.subtitle}>
                {allowsIndividual && allowsTeam ? tx("Choose how you want to enter this tournament") : `This tournament is ${allowsTeam ? 'team' : 'solo'} entry only`}
              </p>

              <div className={styles.optionsContainer}>
                {allowsIndividual && <button className={`${styles.optionCard} ${selectedOption === 'individual' ? styles.selected : ''}`} onClick={() => handleOptionSelect('individual')}>
                  <div className={styles.iconContainer}>
                    <div className={styles.userIcon}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" fill="currentColor" />
                      </svg>
                    </div>
                  </div>
                  <h3 className={styles.optionTitle}>{tt("ui.as.individual.039c", "As an individual")}</h3>
                  <p className={styles.optionDescription}>{tt("ui.register.play.solo.0ec3", "Register and play solo")}</p>
                </button>}

                {allowsTeam && <button className={`${styles.optionCard} ${selectedOption === 'team' ? styles.selected : ''}`} onClick={() => handleOptionSelect('team')}>
                  <div className={styles.iconContainer}>
                    <div className={styles.teamIcon}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M16 4c0-1.11.89-2 2-2s2 .89 2 2-.89 2-2 2-2-.89-2-2zm4 18v-6h2.5l-2.54-7.63A1.5 1.5 0 0 0 18.54 7H17c-.8 0-1.54.37-2.01.95L14 9l.95 1.48c.46-.78 1.3-1.34 2.28-1.45L18.5 16H16v6h4zM12.5 11.5c.83 0 1.5-.67 1.5-1.5s-.67-1.5-1.5-1.5S11 9.17 11 10s.67 1.5 1.5 1.5zm1.5 1h-4c-.83 0-1.5.67-1.5 1.5v6h2v7h3v-7h2v-6c0-.83-.67-1.5-1.5-1.5zM5.5 6c1.11 0 2-.89 2-2s-.89-2-2-2-2 .89-2 2 .89 2 2 2zm1.5 1h-4C2.17 7 1.5 7.67 1.5 8.5v6h2v7h3v-7h2v-6C8.5 7.67 7.83 7 7 7z" fill="currentColor" />
                      </svg>
                    </div>
                  </div>
                  <h3 className={styles.optionTitle}>{tt("ui.as.team.44c5", "As a team")}</h3>
                  <p className={styles.optionDescription}>{tt("ui.register.play.team.255f", "Register and play with your team")}</p>
                </button>}
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button className={styles.cancelButton} onClick={handleCancel}>
                {tt("ui.cancel.77df", "Cancel")}
              </button>
              <button className={`${styles.nextButton} ${!selectedOption ? styles.disabled : ''}`} onClick={handleNext} disabled={!selectedOption}>
                {tt("ui.next.2f04", "Next →")}
              </button>
            </div>
          </div>
        </div>}

      {/* Choose Team Modal */}
      <ChooseTeamModal isOpen={showTeamModal} onClose={handleTeamModalClose} onBack={handleTeamModalBack} onProceed={handleTeamProceed} />

      {/* Edit Team Roster Modal */}
      <EditTeamRosterModal isOpen={showEditRosterModal} onClose={handleEditRosterClose} onBack={handleEditRosterBack} onProceed={handleEditRosterProceed} selectedTeam={selectedTeam} />

      {/* Review Modal */}
      <ReviewModal isOpen={showReviewModal} onClose={handleReviewClose} onBack={handleReviewBack} onProceed={handleReviewProceed} tournament={tournament} selectedTeam={selectedTeam} teamMembers={teamMembers} />

      {/* Payment Modal */}
      <PaymentModal isOpen={showPaymentModal} onClose={handlePaymentClose} onBack={handlePaymentBack} onComplete={handlePaymentComplete} tournament={tournament} selectedTeam={selectedTeam} teamMembers={teamMembers} registrationData={registrationData} resumeReference={resumeReference} />

      {/* Success Modal */}
      <SuccessModal isOpen={showSuccessModal} onClose={handleSuccessClose} tournament={tournament} registrationData={registrationData} />
    </>;
};
export default TournamentRegistrationModal;