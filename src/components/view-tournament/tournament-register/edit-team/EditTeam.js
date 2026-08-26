// ./src/components/view-tournament/tournament-register/EditTeamRosterModal.js
import { mediaUrl } from '@/lib/mediaUrl';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import styles from './edit-team.module.css';
import image from '@/images/signed_in_user_big.webp';
import { useT } from '@/i18n/LanguageProvider';
import { useTx } from '@/i18n/LanguageProvider';
const EditTeamRosterModal = ({
  isOpen,
  onClose,
  onBack,
  onProceed,
  selectedTeam
}) => {
  const tx = useTx();
  const tt = useT();
  const [teamMembers, setTeamMembers] = useState([]);
  const [removedMembers, setRemovedMembers] = useState([]);
  const [showNotification, setShowNotification] = useState(true);

  // Mock team members data - replace with your actual API call
  useEffect(() => {
    if (isOpen && selectedTeam) {
      // Simulate API call to fetch team members
      const mockMembers = [{
        id: 1,
        name: "Nathan Drake",
        username: "@frostbite",
        avatar: image,
        isCurrentUser: true
      }, {
        id: 2,
        name: "Nathan Drake",
        username: "@frostbite",
        avatar: image,
        isCurrentUser: false
      }, {
        id: 3,
        name: "Nathan Drake",
        username: "@frostbite",
        avatar: image,
        isCurrentUser: false
      }, {
        id: 4,
        name: "Nathan Drake",
        username: "@frostbite",
        avatar: image,
        isCurrentUser: false
      }];
      setTeamMembers(mockMembers);
      setRemovedMembers([{
        id: 5,
        name: "Nathan Drake",
        username: "@frostbite",
        avatar: image
      }, {
        id: 6,
        name: "Nathan Drake",
        username: "@frostbite",
        avatar: image
      }]);
    }
  }, [isOpen, selectedTeam]);
  const handleRemoveMember = memberId => {
    const memberToRemove = teamMembers.find(member => member.id === memberId);
    if (memberToRemove && !memberToRemove.isCurrentUser) {
      setTeamMembers(prev => prev.filter(member => member.id !== memberId));
      setRemovedMembers(prev => [...prev, memberToRemove]);
    }
  };
  const handleRestoreMember = memberId => {
    const memberToRestore = removedMembers.find(member => member.id === memberId);
    if (memberToRestore) {
      setRemovedMembers(prev => prev.filter(member => member.id !== memberId));
      setTeamMembers(prev => [...prev, memberToRestore]);
    }
  };
  const handleBack = () => {
    if (onBack) {
      onBack();
    }
  };
  const handleClose = () => {
    if (onClose) {
      onClose();
    }
  };
  const handleSkip = () => {
    if (onProceed) {
      onProceed(selectedTeam, teamMembers, 'skip');
    }
  };
  const handleSaveAndProceed = () => {
    if (onProceed) {
      onProceed(selectedTeam, teamMembers, 'save');
    }
  };
  const handleCloseNotification = () => {
    setShowNotification(false);
  };
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
            <h2 className={styles.modalTitle}>{tt("ui.edit.team.roster.a6cb", "Edit Team Roster")}</h2>
          </div>
          <button className={styles.closeButton} onClick={handleClose}>
            ×
          </button>
        </div>

        {showNotification && <div className={styles.notification}>
            <div className={styles.notificationContent}>
              <svg className={styles.infoIcon} width="20" height="20" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                <line x1="12" y1="16" x2="12" y2="12" stroke="currentColor" strokeWidth="2" />
                <line x1="12" y1="8" x2="12.01" y2="8" stroke="currentColor" strokeWidth="2" />
              </svg>
              <span>{tt("ui.edit.will.only.applied.119a", "This edit will only be applied to this tournament.")}</span>
            </div>
            <button className={styles.closeNotification} onClick={handleCloseNotification}>
              ×
            </button>
          </div>}
        
        <div className={styles.modalBody}>
          <div className={styles.teamHeader}>
            <div className={styles.teamInfo}>
              <div className={styles.teamAvatar}>
                <Image src={mediaUrl(image)} alt={selectedTeam?.name || "Team"} width={60} height={60} />
              </div>
              <div className={styles.teamDetails}>
                <h3 className={styles.teamName}>{selectedTeam?.name || tx("Kill Streak Team")}</h3>
                <div className={styles.teamMeta}>
                  <span className={styles.gameInfo}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" stroke="currentColor" strokeWidth="2" />
                      <line x1="8" y1="21" x2="16" y2="21" stroke="currentColor" strokeWidth="2" />
                      <line x1="12" y1="17" x2="12" y2="21" stroke="currentColor" strokeWidth="2" />
                    </svg>
                    {selectedTeam?.game || tx("Counter Strike")}
                  </span>
                  <span className={styles.membersInfo}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" />
                      <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2" />
                      <path d="M22 21v-2a4 4 0 0 0-3-3.87" stroke="currentColor" strokeWidth="2" />
                      <path d="M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="2" />
                    </svg>
                    {teamMembers.length} {tt("ui.members.1cb4", "Members")}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.membersSection}>
            <div className={styles.sectionHeader}>
              <svg className={styles.sectionIcon} width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" />
                <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" stroke="currentColor" strokeWidth="2" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="2" />
              </svg>
              <h4 className={styles.sectionTitle}>{tt("ui.team.members.8bd7", "Team members")}</h4>
            </div>

            <div className={styles.membersContainer}>
              {teamMembers.map(member => <div key={member.id} className={styles.memberCard}>
                  <div className={styles.memberInfo}>
                    <div className={styles.memberAvatar}>
                      <Image src={mediaUrl(member.avatar)} alt={member.name} width={40} height={40} />
                    </div>
                    <div className={styles.memberDetails}>
                      <span className={styles.memberName}>
                        {member.name} {member.isCurrentUser && "(You)"}
                      </span>
                      <span className={styles.memberUsername}>{member.username}</span>
                    </div>
                  </div>
                  {!member.isCurrentUser && <button className={styles.removeButton} onClick={() => handleRemoveMember(member.id)}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2" />
                        <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2" />
                      </svg>
                      {tt("ui.remove.e963", "Remove")}
                    </button>}
                </div>)}
            </div>
          </div>

          {removedMembers.length > 0 && <div className={styles.membersSection}>
              <div className={styles.sectionHeader}>
                <svg className={styles.sectionIcon} width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" />
                  <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2" />
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87" stroke="currentColor" strokeWidth="2" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="2" />
                </svg>
                <h4 className={styles.sectionTitle}>{tt("ui.removed.members.7ac3", "Removed members")}</h4>
              </div>

              <div className={styles.membersContainer}>
                {removedMembers.map(member => <div key={member.id} className={styles.memberCard}>
                    <div className={styles.memberInfo}>
                      <div className={styles.memberAvatar}>
                        <Image src={mediaUrl(member.avatar)} alt={member.name} width={40} height={40} />
                      </div>
                      <div className={styles.memberDetails}>
                        <span className={styles.memberName}>{member.name}</span>
                        <span className={styles.memberUsername}>{member.username}</span>
                      </div>
                    </div>
                    <button className={styles.restoreButton} onClick={() => handleRestoreMember(member.id)}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <line x1="12" y1="5" x2="12" y2="19" stroke="currentColor" strokeWidth="2" />
                        <line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" strokeWidth="2" />
                      </svg>
                      {tt("ui.restore.3cbe", "Restore")}
                    </button>
                  </div>)}
              </div>
            </div>}
        </div>

        <div className={styles.modalFooter}>
          <button className={styles.skipButton} onClick={handleSkip}>
            {tt("ui.skip.step.9278", "Skip this step")}
          </button>
          <button className={styles.saveButton} onClick={handleSaveAndProceed}>
            {tt("ui.save.proceed.435a", "Save and proceed →")}
          </button>
        </div>
      </div>
    </div>;
};
export default EditTeamRosterModal;