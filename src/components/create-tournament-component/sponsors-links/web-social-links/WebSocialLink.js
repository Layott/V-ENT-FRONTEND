import { useState } from 'react';
import createTournamentStyles from '@/styles/create-tournament/create-tournament.module.css';
import styles from './web-social-link.module.css';

const WebSocialLink = () => {
  const [fields, setFields] = useState([
    { label: 'Facebook', placeholder: 'https://www.facebook.com/' },
    { label: 'X (Twitter)', placeholder: 'https://www.x.com/' },
    { label: 'Instagram', placeholder: 'https://www.instagram.com/' },
    { label: 'TikTok', placeholder: 'https://www.tiktok.com/' },
    { label: 'YouTube', placeholder: 'https://www.youtube.com/' },
    { label: 'Bigo Live', placeholder: 'https://www.bigo.tv/' },
    { label: 'Twitch', placeholder: 'https://www.twitch.tv/' },
    { label: 'Kick', placeholder: 'https://www.kick.com/' },
  ]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newLabel, setNewLabel] = useState('');

  const handleAddField = () => {
    setIsModalOpen(true);
  }

  const handleModalOkay = () => {
    if (newLabel.trim()) {
      setFields([
        ...fields,
        { label: newLabel, placeholder: 'https://examples.com/' },
      ]);
    }
    setIsModalOpen(false);
    setNewLabel('');
  }

  const handleModalCancel = () => {
    setIsModalOpen(false);
    setNewLabel('');
  }

  return (
    <div className={createTournamentStyles.createSubSectionContainer}>
      <div className={createTournamentStyles.innerCreateSubSectionContainer}>
        <h3 className={createTournamentStyles.tournamentTypeH3}>Web and Social Links</h3>

        <div className={styles.outerInputContainer}>
          {fields.map(({ label, placeholder }, index) => (
            <div key={index} className={styles.inputGroup}>
              <label htmlFor={`field-${index}`}>{label}</label>
              <input
                id={`field-${index}`}
                type="text"
                placeholder={placeholder}
                className={`${createTournamentStyles.inputText} ${styles.inputText}`}
              />
            </div>
          ))}
        </div>

        <button 
          type="button" 
          className={styles.addButton} 
          onClick={handleAddField}
        >
          Add Another Field
        </button>
      </div>
      
      {isModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h3>Enter Name for the Field</h3>
            <input
              type="text"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder='Enter Field Name'
              className={`${styles.modalInput} ${createTournamentStyles.inputText}`}
            />
            <div className={styles.modalBTNContainer}>
              <button onClick={handleModalOkay} className={styles.okayBTN}>Okay</button>
              <button onClick={handleModalCancel} className={styles.cancelBTN}>Cancel</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default WebSocialLink;
