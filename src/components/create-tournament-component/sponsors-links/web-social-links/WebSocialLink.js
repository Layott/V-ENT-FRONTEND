import { useState } from 'react';
import { FaTrash } from "react-icons/fa";
import createTournamentStyles from '@/styles/create-tournament/create-tournament.module.css';
import styles from './web-social-link.module.css';

const DEFAULT_LINK_FIELDS = [
  { label: 'Facebook', key: 'facebook_link', placeholder: 'https://facebook.com/tournamentpage' },
  { label: 'X (Twitter)', key: 'twitter_link', placeholder: 'https://twitter.com/tournamentpage' },
  { label: 'Instagram', key: 'instagram_link', placeholder: 'https://instagram.com/tournamentpage' },
  { label: 'YouTube', key: 'youtube_link', placeholder: 'https://youtube.com/tournamentpage' },
  { label: 'Twitch', key: 'twitch_link', placeholder: 'https://twitch.tv/tournamentpage' },
  { label: 'Kick', key: 'kick_link', placeholder: 'https://kick.com/tournamentpage' },
  { label: 'TikTok', key: 'tiktok_link', placeholder: 'https://tiktok.com/tournamentpage' },
  { label: 'Bigo Live', key: 'bigolive_link', placeholder: 'https://bigolive.com/tournamentpage' },
];

const WebSocialLink = ({ formData, updateFormData }) => {
  const [fields, setFields] = useState(() => (
    DEFAULT_LINK_FIELDS.map((field) => ({ ...field, value: formData?.webSocialLinks?.[field.key] || '' }))
  ));
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newLabel, setNewLabel] = useState('');

  const syncWithFormData = (updatedFields) => {
    setFields(updatedFields);
    const updatedData = {};
    updatedFields.forEach(({ key, value }) => {
      updatedData[key] = value;
    });
    updateFormData('webSocialLinks', updatedData);
  };

  const handleAddField = () => {
    setIsModalOpen(true);
  };

  const handleModalOkay = () => {
    if (newLabel.trim()) {
      const formattedKey = `${newLabel.trim().toLowerCase().replace(/\s+/g, '_')}_link`;
      const updatedFields = [
        ...fields,
        { label: newLabel, key: formattedKey, placeholder: 'https://examples.com/', value: '' },
      ];
      syncWithFormData(updatedFields);
    }
    setIsModalOpen(false);
    setNewLabel('');
  };

  const handleModalCancel = () => {
    setIsModalOpen(false);
    setNewLabel('');
  };

  const handleDeleteField = (index) => {
    const updatedFields = fields.filter((_, i) => i !== index);
    syncWithFormData(updatedFields);
  };

  const handleFieldChange = (index, value) => {
    const updatedFields = [...fields];
    updatedFields[index].value = value;
    syncWithFormData(updatedFields);
  };

  return (
    <div className={createTournamentStyles.createSubSectionContainer}>
      <div className={createTournamentStyles.innerCreateSubSectionContainer}>
        <h3 className={createTournamentStyles.tournamentTypeH3}>Web and Social Links</h3>

        <div className={styles.outerInputContainer}>
          {fields.map(({ label, placeholder, value }, index) => (
            <div key={index} className={styles.inputGroup}>
              <label htmlFor={`field-${index}`}>{label}</label>
              <input
                id={`field-${index}`}
                type="text"
                placeholder={placeholder}
                value={value}
                onChange={(e) => handleFieldChange(index, e.target.value)}
                className={`${createTournamentStyles.inputText} ${styles.inputText}`}
              />
              <button
                className={styles.deleteBTN}
                onClick={() => handleDeleteField(index)}
              >
                <FaTrash className={styles.deleteIcon} />
              </button>
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
              id={newLabel}
              type="text"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="Enter Field Name"
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
