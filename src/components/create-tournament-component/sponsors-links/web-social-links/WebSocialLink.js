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

  const addField = () => {
    setFields([...fields, { label: 'New Field', placeholder: 'https://example.com/' }]);
  };

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
          onClick={addField}
        >
          Add Another Field
        </button>
      </div>
    </div>
  );
};

export default WebSocialLink;
