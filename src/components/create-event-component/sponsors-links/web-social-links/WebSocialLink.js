import { useState } from 'react';
import { FaTrash } from "react-icons/fa";
import createTournamentStyles from '@/styles/create-tournament/create-tournament.module.css';
import styles from './web-social-link.module.css';
import { useT } from '@/i18n/LanguageProvider';
const WebSocialLink = ({
  formData,
  updateFormData
}) => {
  const tt = useT();
  const [fields, setFields] = useState([{
    label: 'Facebook',
    key: 'facebook_link',
    placeholder: 'https://facebook.com/tournamentpage',
    value: ''
  }, {
    label: 'X (Twitter)',
    key: 'twitter_link',
    placeholder: 'https://twitter.com/tournamentpage',
    value: ''
  }, {
    label: 'Instagram',
    key: 'instagram_link',
    placeholder: 'https://instagram.com/tournamentpage',
    value: ''
  }, {
    label: 'YouTube',
    key: 'youtube_link',
    placeholder: 'https://youtube.com/tournamentpage',
    value: ''
  }, {
    label: 'Twitch',
    key: 'twitch_link',
    placeholder: 'https://twitch.tv/tournamentpage',
    value: ''
  }, {
    label: 'Kick',
    key: 'kick_link',
    placeholder: 'https://kick.com/tournamentpage',
    value: ''
  }, {
    label: 'TikTok',
    key: 'tiktok_link',
    placeholder: 'https://tiktok.com/tournamentpage',
    value: ''
  }, {
    label: 'Bigo Live',
    key: 'bigolive_link',
    placeholder: 'https://bigolive.com/tournamentpage',
    value: ''
  }]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const syncWithFormData = updatedFields => {
    setFields(updatedFields);
    const updatedData = {};
    updatedFields.forEach(({
      key,
      value
    }) => {
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
      const updatedFields = [...fields, {
        label: newLabel,
        key: formattedKey,
        placeholder: 'https://examples.com/',
        value: ''
      }];
      syncWithFormData(updatedFields);
    }
    setIsModalOpen(false);
    setNewLabel('');
  };
  const handleModalCancel = () => {
    setIsModalOpen(false);
    setNewLabel('');
  };
  const handleDeleteField = index => {
    const updatedFields = fields.filter((_, i) => i !== index);
    syncWithFormData(updatedFields);
  };
  const handleFieldChange = (index, value) => {
    const updatedFields = [...fields];
    updatedFields[index].value = value;
    syncWithFormData(updatedFields);
  };
  return <div className={createTournamentStyles.createSubSectionContainer}>
      <div className={createTournamentStyles.innerCreateSubSectionContainer}>
        <h3 className={createTournamentStyles.tournamentTypeH3}>{tt("ui.web.social.links.d9e8", "Web and Social Links")}</h3>

        <div className={styles.outerInputContainer}>
          {fields.map(({
          label,
          placeholder,
          value
        }, index) => <div key={index} className={styles.inputGroup}>
              <label htmlFor={`field-${index}`}>{label}</label>
              <input id={`field-${index}`} type="text" placeholder={placeholder} value={value} onChange={e => handleFieldChange(index, e.target.value)} className={`${createTournamentStyles.inputText} ${styles.inputText}`} />
              <button className={styles.deleteBTN} onClick={() => handleDeleteField(index)}>
                <FaTrash className={styles.deleteIcon} />
              </button>
            </div>)}
        </div>

        <button type="button" className={styles.addButton} onClick={handleAddField}>
          {tt("ui.add.another.field.233f", "Add Another Field")}
        </button>
      </div>

      {isModalOpen && <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h3>{tt("ui.enter.name.field.236a", "Enter Name for the Field")}</h3>
            <input id={newLabel} type="text" value={newLabel} onChange={e => setNewLabel(e.target.value)} placeholder={tt("ui.enter.field.name.44bc", "Enter Field Name")} className={`${styles.modalInput} ${createTournamentStyles.inputText}`} />
            <div className={styles.modalBTNContainer}>
              <button onClick={handleModalOkay} className={styles.okayBTN}>{tt("ui.okay.d544", "Okay")}</button>
              <button onClick={handleModalCancel} className={styles.cancelBTN}>{tt("ui.cancel.77df", "Cancel")}</button>
            </div>
          </div>
        </div>}
    </div>;
};
export default WebSocialLink;