import { uploadHint } from '@/lib/uploadSpecs';
import { mediaUrl } from '@/lib/mediaUrl';
import { useState, useRef } from 'react';
import Image from 'next/image';
import { FaAsterisk } from "react-icons/fa6";
import { BiUpload } from "react-icons/bi";
import { FaTrash } from "react-icons/fa";
import createTournamentStyles from '@/styles/create-tournament/create-tournament.module.css';
import styles from './sponsors.module.css';
import { useT } from '@/i18n/LanguageProvider';
const Sponsors = ({
  formData,
  updateFormData
}) => {
  const tt = useT();
  const [fields, setFields] = useState([{
    name: '',
    username: '',
    logo: null
  }]);
  const fileInputs = useRef([]);
  const handleAddField = () => {
    setFields([...fields, {
      name: '',
      username: '',
      logo: null
    }]);
  };
  const handleDeleteField = index => {
    const updatedFields = fields.filter((_, i) => i !== index);
    setFields(updatedFields);
    updateFormData('sponsors', updatedFields); // Update parent formData
  };
  const handleFieldChange = (index, key, value) => {
    const updatedFields = [...fields];
    updatedFields[index][key] = value;
    setFields(updatedFields);
    updateFormData('sponsors', updatedFields); // Update parent formData
  };
  const handleLogoUpload = (index, event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = e => {
        const updatedFields = [...fields];
        updatedFields[index].logo = e.target.result; // Preview URL
        setFields(updatedFields);
        updateFormData('sponsors', updatedFields); // Update parent formData
      };
      reader.readAsDataURL(file);
    }
    event.target.value = '';
  };
  const handleResetLogo = (index, event) => {
    event.stopPropagation();
    const updatedFields = [...fields];
    updatedFields[index].logo = null;
    setFields(updatedFields);
    updateFormData('sponsors', updatedFields); // Update parent formData
  };
  const triggerFileInput = index => {
    fileInputs.current[index].click();
  };
  return <div className={createTournamentStyles.createSubSectionContainer}>
      <div className={createTournamentStyles.innerCreateSubSectionContainer}>
        <h3 className={createTournamentStyles.tournamentTypeH3}>{tt("ui.sponsors.82ce", "Sponsors")}</h3>
        {fields.map((field, index) => <div key={index} className={styles.threeBoxesContainer}>
            <div className={`${createTournamentStyles.twoBoxesInRowContainer} ${styles.twoBoxesInRowContainer}`}>
              <div className={createTournamentStyles.inputGroup}>
                <label htmlFor={`sponsorName-${index}`} className={createTournamentStyles.labelWithAsterisk}>
                  {tt("ui.sponsor.name.32b9", "Sponsor Name")}
                  <span className={createTournamentStyles.asteriskSpan}>
                    <FaAsterisk className={createTournamentStyles.asteriskIcon} />
                  </span>
                </label>
                <input id={`sponsorName-${index}`} type="text" placeholder={tt("ui.enter.sponsor.name.2574", "Enter sponsor name")} className={createTournamentStyles.inputText} value={field.name} onChange={e => handleFieldChange(index, 'name', e.target.value)} />
              </div>
              <div className={createTournamentStyles.inputGroup}>
                <label htmlFor={`sponsorUsername-${index}`} className={createTournamentStyles.labelWithAsterisk}>
                  {tt("ui.username.84c2", "Username")}
                </label>
                <input id={`sponsorUsername-${index}`} type="text" placeholder={tt("ui.enter.sponsor.username.ad02", "Enter sponsor username")} className={createTournamentStyles.inputText} value={field.username} onChange={e => handleFieldChange(index, 'username', e.target.value)} />
              </div>
            </div>
            <div className={styles.uploaderAndDeleteFieldBTNContainer}>
              <div className={styles.logoUploadContainer}>
                <div className={styles.logoUploadBox} onClick={() => triggerFileInput(index)}>
                  {field.logo ? <div className={styles.logoPreview}>
                      <Image src={mediaUrl(field.logo)} alt={tt("ui.uploaded.logo.a606", "Uploaded Logo")} className={styles.logoImage} width={60} height={40} />
                      <div className={styles.resetAndRemoveContainer}>
                        <button className={styles.removeImageContainer} onClick={e => handleResetLogo(index, e)}>
                          {tt("ui.cancel.77df", "Cancel")}
                        </button>
                      </div>
                    </div> : <div className={styles.logoUploadPlaceholder}>
                      <span>
                        <BiUpload className={styles.uploadIcon} />
                        {tt("ui.upload.logo.8a04", "Upload Logo")}
                      </span>
                    </div>}
                  <input id={`logoUpload-${index}`} type="file" accept="image/*" onChange={e => handleLogoUpload(index, e)} className={styles.hiddenInput} />
                  <p className={styles.uploadHintLine}>{uploadHint(tt, 'sponsorLogo')}</p>
                </div>
              </div>
              <button className={styles.deleteFieldBTN} onClick={() => handleDeleteField(index)}>
                <FaTrash className={styles.deleteFieldIcon} />
              </button>
            </div>
          </div>)}
        <button type="button" className={styles.addButton} onClick={handleAddField}>
          {tt("ui.add.another.sponsor.1c63", "Add Another Sponsor")}
        </button>
      </div>
    </div>;
};
export default Sponsors;