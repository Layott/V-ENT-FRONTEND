// ./src/components/view-tournament/tournament-details-banner/ChooseTeamModal.js
import { useState, useEffect } from 'react';
import Image from 'next/image';
import styles from './team.module.css';
import image from '@/images/signed_in_user_big.webp';


const ChooseTeamModal = ({ isOpen, onClose, onProceed, onBack }) => {
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [teams, setTeams] = useState([]);

  // Mock teams data - replace with your actual API call
  useEffect(() => {
    if (isOpen) {
      // Simulate API call to fetch user's teams
      const mockTeams = [
        {
          id: 1,
          name: "Kill Streak Team",
          game: "Call of Duty",
          members: 8,
          image: image, // Replace with actual team image
          selected: true
        },
        {
          id: 2,
          name: "Rapid Zone",
          game: "Fifa",
          members: 4,
          image: image, // Replace with actual team image
          selected: false
        },
        {
          id: 3,
          name: "Opticons",
          game: "Counter Strike",
          members: 4,
          image: image, // Replace with actual team image
          selected: false
        },
        {
          id: 4,
          name: "Blast RPG",
          game: "Tekken",
          members: 6,
          image: image, // Replace with actual team image
          selected: false
        }
      ];
      setTeams(mockTeams);
      setSelectedTeam(mockTeams.find(team => team.selected) || null);
    }
  }, [isOpen]);

  const handleTeamSelect = (team) => {
    setSelectedTeam(team);
  };

  const handleProceed = () => {
    if (selectedTeam && onProceed) {
      onProceed(selectedTeam);
    }
  };

  const handleBack = () => {
    setSelectedTeam(null);
    setSearchTerm('');
    if (onBack) {
      onBack();
    }
  };

  const handleClose = () => {
    setSelectedTeam(null);
    setSearchTerm('');
    if (onClose) {
      onClose();
    }
  };

  const filteredTeams = teams.filter(team =>
    team.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    team.game.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
            <h2 className={styles.modalTitle}>Choose Your Team</h2>
          </div>
          <button className={styles.closeButton} onClick={handleClose}>
            ×
          </button>
        </div>
        
        <div className={styles.modalBody}>
          <p className={styles.subtitle}>You can only use one team at a time.</p>
          
          <div className={styles.teamsHeader}>
            <span className={styles.teamsCount}>{teams.length} teams</span>
            <button className={styles.newTeamButton}>
              <span className={styles.plusIcon}>+</span> New Team
            </button>
          </div>

          <div className={styles.searchContainer}>
            <div className={styles.searchInputWrapper}>
              <svg className={styles.searchIcon} width="20" height="20" viewBox="0 0 24 24" fill="none">
                <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2"/>
                <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2"/>
              </svg>
              <input
                type="text"
                placeholder="Search teams"
                className={styles.searchInput}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className={styles.teamsContainer}>
            {filteredTeams.map((team) => (
              <button
                key={team.id}
                className={`${styles.teamCard} ${selectedTeam?.id === team.id ? styles.selected : ''}`}
                onClick={() => handleTeamSelect(team)}
              >
                <div className={styles.teamInfo}>
                  <div className={styles.teamImage}>
                    <Image 
                      src={team.image} 
                      alt={team.name}
                      width={60}
                      height={60}
                    />
                  </div>
                  <div className={styles.teamDetails}>
                    <h3 className={styles.teamName}>{team.name}</h3>
                    <div className={styles.teamMeta}>
                      <span className={styles.gameInfo}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                          <rect x="2" y="3" width="20" height="14" rx="2" ry="2" stroke="currentColor" strokeWidth="2"/>
                          <line x1="8" y1="21" x2="16" y2="21" stroke="currentColor" strokeWidth="2"/>
                          <line x1="12" y1="17" x2="12" y2="21" stroke="currentColor" strokeWidth="2"/>
                        </svg>
                        {team.game}
                      </span>
                      <span className={styles.membersInfo}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2"/>
                          <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
                          <path d="M22 21v-2a4 4 0 0 0-3-3.87" stroke="currentColor" strokeWidth="2"/>
                          <path d="M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="2"/>
                        </svg>
                        {team.members} Members
                      </span>
                    </div>
                  </div>
                </div>
                {selectedTeam?.id === team.id && (
                  <div className={styles.checkmark}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.modalFooter}>
          <button className={styles.cancelButton} onClick={handleClose}>
            Cancel
          </button>
          <button 
            className={`${styles.proceedButton} ${!selectedTeam ? styles.disabled : ''}`}
            onClick={handleProceed}
            disabled={!selectedTeam}
          >
            Proceed →
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChooseTeamModal;