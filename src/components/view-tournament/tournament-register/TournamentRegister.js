import { useEffect, useState } from 'react';
import styles from '../tournament-register/tournament-register.module.css';
import ChooseTeamModal from '../tournament-register/team/Team';
import { useSession } from 'next-auth/react';
import { ventFetch, tokenFrom } from '@/components/tournament-lib/tournamentApi';
import ReviewModal from './review-team/Review';
import PaymentModal from './payment/Payment';
import SuccessModal from './success/Success';
import TicketStep from './ticket/TicketStep';
import { useT } from '@/i18n/LanguageProvider';
import { useTx } from '@/i18n/LanguageProvider';
import { apiMessage } from '@/lib/apiMessage';
import { formatDateTime } from '@/lib/datetime';
import { discardDraft, readDraft, saveDraft, stepText } from '@/lib/registrationDraft';
import { peekResume } from '@/components/pay/PayShortfall';
const TournamentRegistrationModal = ({
  isOpen,
  onClose,
  onNext,
  tournament,
  resumeReference = null,
  // Opened from a "Pick up where you left off" card: go straight to the step
  // the registration was saved at (inbox 436).
  autoResume = false
}) => {
  const tx = useTx();
  const tt = useT();
  const { data: session } = useSession();
  const token = tokenFrom(session);
  const [selectedOption, setSelectedOption] = useState(null);
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [teamMembers, setTeamMembers] = useState([]);
  const [registrationData, setRegistrationData] = useState(null);
  // The registration as the server keeps it (inbox 436): `draft` is where this
  // person is up to, `entry` whether the event ticket is the entry and whether
  // they hold it. Saved at every step, so a closed tab or a card page loses
  // nothing.
  const [draftInfo, setDraftInfo] = useState(null);
  const [showResume, setShowResume] = useState(false);
  const [showTicket, setShowTicket] = useState(false);
  const [resumeProblem, setResumeProblem] = useState('');
  const ref = tournament?.slug || tournament?.id;
  // Back from a card page the ticket step sent them to: the ticket step again,
  // with the type they had chosen, never the entry (which would refuse them
  // for want of the ticket). Read once, before the ticket step's own card
  // panel takes the note and confirms the payment.
  const [ticketTrip] = useState(() => {
    if (!resumeReference) return null;
    const back = peekResume();
    return back?.door === 'tournament-ticket' && back?.tournament === tournament?.slug ? back : null;
  });
  const remember = body => saveDraft(ref, token, body).then(saved => {
    if (saved) setDraftInfo(prev => ({ ...(prev || {}), ...saved }));
  });
  const needsTicket = (info = draftInfo) => Boolean(info?.entry?.needs_ticket && !info?.entry?.holds_ticket);
  // After the team (or straight after choosing solo): the ticket first when the
  // event ticket is the entry and they have none, else the entry itself.
  // `also` rides in the same save: two saves sent at once can land in either
  // order, and on a phone the step was lost that way (13 October 2026).
  const goOn = (info = draftInfo, also = {}) => {
    if (needsTicket(info)) {
      setShowTicket(true);
      remember({ ...also, step: 'ticket' });
    } else {
      setShowPaymentModal(true);
      remember({ ...also, step: 'payment' });
    }
  };
  const loadRoster = async team => {
    try {
      const teamRef = team?.slug || team?.id;
      const data = await ventFetch(`/team/${teamRef}/roster/`, { token });
      return (data?.members || []).map(row => ({
        ...row.user,
        id: row.user?.id ?? row.id,
        name: row.user?.full_name || row.user?.username || '',
        role: row.role
      }));
    } catch {
      // The review says how many members the card said; the server decides
      // eligibility at registration either way.
      return [];
    }
  };
  // Back to the step the registration was saved at.
  const continueDraft = async info => {
    const d = info?.draft;
    setShowResume(false);
    if (!d) return;
    const mode = d.mode || null;
    setSelectedOption(mode);
    if (!mode || d.step === 'mode') return;
    if (mode === 'team') {
      if (!d.team || d.step === 'team') {
        setShowTeamModal(true);
        return;
      }
      const team = { id: d.team.id, slug: d.team.slug, name: d.team.name, logo: d.team.logo, game: d.team.game };
      const members = await loadRoster(team);
      setSelectedTeam(team);
      setTeamMembers(members);
      if (d.step === 'review') {
        setShowReviewModal(true);
        return;
      }
      setRegistrationData({ type: 'team', team, members });
    } else {
      setRegistrationData({ type: 'individual' });
    }
    if (needsTicket(info)) setShowTicket(true);
    else setShowPaymentModal(true);
  };
  useEffect(() => {
    if (!isOpen || !token || !ref) return undefined;
    let gone = false;
    readDraft(ref, token).then(info => {
      if (gone) return;
      setDraftInfo(info);
      if (ticketTrip) {
        // The step they paid from. Without a saved step to go back to, the
        // entry step confirms the card payment, so the coins always land.
        if (['ticket', 'payment'].includes(info?.draft?.step)) continueDraft(info);
        else resumeAtPayment();
        return;
      }
      // Back from a card page mid-entry: the Payment step takes it from there.
      if (!info?.draft || resumeReference) return;
      if (autoResume) continueDraft(info);
      else setShowResume(true);
    }).catch(() => {
      // Nothing saved can be read: the registration starts at the start, and
      // a card payment is still confirmed by the entry step.
      if (!gone && ticketTrip) resumeAtPayment();
    });
    return () => { gone = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, token, ref]);
  const startAgain = async () => {
    setResumeProblem('');
    try {
      await discardDraft(ref, token);
      setDraftInfo(prev => ({ ...(prev || {}), draft: null }));
      setShowResume(false);
    } catch (err) {
      setResumeProblem(apiMessage(tt, err, 'regDraft.discardFailed', 'That did not go through. Try again.'));
    }
  };

  // Returning from a Paystack wallet top-up mid-registration (see
  // payment/Payment.js `handleTopUp`) lands back on this same page with a
  // `?reference=` query param. Resume straight at the Payment step instead of
  // making the user pick Mode → Team → Roster → Review again. The in-flight
  // selection was stashed in sessionStorage by Payment.js right before the
  // redirect to Paystack.
  const resumeAtPayment = () => {
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
    setShowReviewModal(false);
    setShowSuccessModal(false);
    setShowPaymentModal(true);
  };
  useEffect(() => {
    // A trip from the ticket step waits for the saved registration instead.
    if (!isOpen || !resumeReference || !tournament?.id || ticketTrip) return;
    resumeAtPayment();
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
      goOn(draftInfo, { mode: 'individual', team_id: null });
    } else if (selectedOption === 'team') {
      remember({ mode: 'team', step: 'team' });
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
    setShowReviewModal(false);
    setShowPaymentModal(false);
    setShowSuccessModal(false); // Add this
    setShowTicket(false);
    setShowResume(false);
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
  // The team's real members, for the review step.
  //
  // There used to be an "Edit Team Roster" step between choosing the team
  // and reviewing: four copies of "Nathan Drake @frostbite" from a mock
  // array, with Remove and Restore buttons whose result was posted as
  // `roster` and read by nothing on the server. Walked on 17 September
  // 2026 and found drawing four strangers over a two-person team. Entering
  // a tournament commits the team as it is, so the review shows the team
  // as it is, from the same roster endpoint the team page reads.
  const handleTeamProceed = async team => {
    setSelectedTeam(team);
    setShowTeamModal(false);
    remember({ mode: 'team', team_id: team?.id ?? null, step: 'review' });
    const members = await loadRoster(team);
    setTeamMembers(members);
    setShowReviewModal(true);
  };

  // Review Modal Handlers
  const handleReviewBack = () => {
    setShowReviewModal(false);
    setShowTeamModal(true);
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
    goOn();
  };
  // The ticket step (inbox 436).
  const handleTicketBought = () => {
    const holding = { ...(draftInfo || {}), entry: { ...(draftInfo?.entry || {}), holds_ticket: true } };
    setDraftInfo(holding);
    setShowTicket(false);
    setShowPaymentModal(true);
    remember({ step: 'payment' });
  };
  const handleTicketBack = () => {
    setShowTicket(false);
    if (registrationData?.type === 'team') setShowReviewModal(true);
    else setRegistrationData(null);
  };
  const handleTicketLater = () => {
    // Saved at this step already; the cards on the tournament page, the
    // event's Tournaments tab and My tournaments bring them back here.
    resetAllState();
    if (onClose) onClose();
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
      
      {!showTeamModal && !showReviewModal && !showPaymentModal && !showSuccessModal && !showTicket && <div className={styles.modalOverlay} onClick={handleCancel}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>{tt("ui.register.tournament.0b66", "Register For Tournament")}</h2>
              <button className={styles.closeButton} onClick={handleCancel}>
                ×
              </button>
            </div>

            {showResume && draftInfo?.draft ? <div className={styles.modalBody}>
              <div className={styles.resume}>
                <span className={styles.resumeKicker}>{tt('regDraft.kicker', 'Pick up where you left off')}</span>
                <p className={styles.resumeTitle}>
                  {tt('regDraft.titleHere', 'You were registering {who} for this tournament')
                    .replace('{who}', draftInfo.draft.mode === 'team' && draftInfo.draft.team?.name
                      ? draftInfo.draft.team.name : tt('regDraft.solo', 'yourself, as a solo player'))}
                </p>
                <p className={styles.resumeText}>
                  {tt('regDraft.whereShort', 'Next: {step}. Saved {saved}.')
                    .replace('{step}', stepText(tt, draftInfo.draft.step))
                    .replace('{saved}', formatDateTime(draftInfo.draft.saved_at))}
                </p>
                {resumeProblem && <p className={styles.resumeProblem} role="alert">{resumeProblem}</p>}
              </div>
            </div> : <div className={styles.modalBody}>
              <p className={styles.subtitle}>
                {allowsIndividual && allowsTeam ? tx("Choose how you want to enter this tournament") : (allowsTeam ? tt('register.teamOnly', 'This tournament takes teams only') : tt('register.soloOnly', 'This tournament takes solo players only'))}
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
            </div>}

            {showResume && draftInfo?.draft ? <div className={styles.modalFooter}>
              <button className={styles.cancelButton} onClick={startAgain}>
                {tt('regDraft.startAgain', 'Start again')}
              </button>
              <button className={styles.nextButton} onClick={() => continueDraft(draftInfo)}>
                {tt('regDraft.continue', 'Continue')}
              </button>
            </div> : <div className={styles.modalFooter}>
              <button className={styles.cancelButton} onClick={handleCancel}>
                {tt("ui.cancel.77df", "Cancel")}
              </button>
              <button className={`${styles.nextButton} ${!selectedOption ? styles.disabled : ''}`} onClick={handleNext} disabled={!selectedOption}>
                {tt("ui.next.2f04", "Next →")}
              </button>
            </div>}
          </div>
        </div>}

      {/* Choose Team Modal */}
      <ChooseTeamModal isOpen={showTeamModal} onClose={handleTeamModalClose} onBack={handleTeamModalBack} onProceed={handleTeamProceed} />

      {/* Review Modal */}
      <ReviewModal isOpen={showReviewModal} onClose={handleReviewClose} onBack={handleReviewBack} onProceed={handleReviewProceed} tournament={tournament} selectedTeam={selectedTeam} teamMembers={teamMembers} />

      {/* The event ticket, when it is the entry and they have none (inbox 436) */}
      {showTicket && <TicketStep tournament={tournament} entry={draftInfo?.entry} savedAt={draftInfo?.draft?.saved_at}
                                 token={token} trip={ticketTrip} onBought={handleTicketBought}
                                 onBack={handleTicketBack} onLater={handleTicketLater} />}

      {/* Payment Modal */}
      <PaymentModal isOpen={showPaymentModal} onClose={handlePaymentClose} onBack={handlePaymentBack} onComplete={handlePaymentComplete} tournament={tournament} selectedTeam={selectedTeam} teamMembers={teamMembers} registrationData={registrationData} resumeReference={resumeReference} />

      {/* Success Modal */}
      <SuccessModal isOpen={showSuccessModal} onClose={handleSuccessClose} tournament={tournament} registrationData={registrationData} />
    </>;
};
export default TournamentRegistrationModal;