import { useState, useRef } from 'react';
import Image from 'next/image';
import { FaAsterisk } from "react-icons/fa6";
import { BiUpload } from "react-icons/bi";
import { FaTrash } from "react-icons/fa";
import createTournamentStyles from '@/styles/create-tournament/create-tournament.module.css';
import styles from './sponsors.module.css';


const Sponsors = ({ formData, updateFormData }) => {
  const [fields, setFields] = useState(() => (
    Array.isArray(formData?.sponsors) && formData.sponsors.length > 0
      ? formData.sponsors
      : [{ name: '', username: '', logo: null }]
  ));
  const fileInputs = useRef([]);

  const handleAddField = () => {
    setFields([...fields, { name: '', username: '', logo: null }]);
  };

  const handleDeleteField = (index) => {
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
      reader.onload = (e) => {
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

  const triggerFileInput = (index) => {
    fileInputs.current[index].click();
  }

  return (
    <div className={createTournamentStyles.createSubSectionContainer}>
      <div className={createTournamentStyles.innerCreateSubSectionContainer}>
        <h3 className={createTournamentStyles.tournamentTypeH3}>Sponsors</h3>
        {fields.map((field, index) => (
          <div key={index} className={styles.threeBoxesContainer}>
            <div className={`${createTournamentStyles.twoBoxesInRowContainer} ${styles.twoBoxesInRowContainer}`}>
              <div className={createTournamentStyles.inputGroup}>
                <label htmlFor={`sponsorName-${index}`} className={createTournamentStyles.labelWithAsterisk}>
                  Sponsor Name
                  <span className={createTournamentStyles.asteriskSpan}>
                    <FaAsterisk className={createTournamentStyles.asteriskIcon} />
                  </span>
                </label>
                <input
                  id={`sponsorName-${index}`}
                  type="text"
                  placeholder="Enter sponsor name"
                  className={createTournamentStyles.inputText}
                  value={field.name}
                  onChange={(e) => handleFieldChange(index, 'name', e.target.value)}
                />
              </div>
              <div className={createTournamentStyles.inputGroup}>
                <label htmlFor={`sponsorUsername-${index}`} className={createTournamentStyles.labelWithAsterisk}>
                  Username
                </label>
                <input
                  id={`sponsorUsername-${index}`}
                  type="text"
                  placeholder="Enter sponsor username"
                  className={createTournamentStyles.inputText}
                  value={field.username}
                  onChange={(e) => handleFieldChange(index, 'username', e.target.value)}
                />
              </div>
            </div>
            <div className={styles.uploaderAndDeleteFieldBTNContainer}>
              <div className={styles.logoUploadContainer}>
                <div
                  className={styles.logoUploadBox}
                  onClick={() => triggerFileInput(index)}
                >
                  {field.logo ? (
                    <div className={styles.logoPreview}>
                      <Image
                        src={field.logo}
                        alt="Uploaded Logo"
                        className={styles.logoImage}
                        width={60}
                        height={40}
                      />
                      <div className={styles.resetAndRemoveContainer}>
                        <button
                          className={styles.removeImageContainer}
                          onClick={(e) => handleResetLogo(index, e)}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className={styles.logoUploadPlaceholder}>
                      <span>
                        <BiUpload className={styles.uploadIcon} />
                        Upload Logo
                      </span>
                    </div>
                  )}
                  <input
                    id={`logoUpload-${index}`}
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleLogoUpload(index, e)}
                    className={styles.hiddenInput}
                  />
                </div>
              </div>
              <button
                className={styles.deleteFieldBTN}
                onClick={() => handleDeleteField(index)}
              >
                <FaTrash className={styles.deleteFieldIcon} />
              </button>
            </div>
          </div>
        ))}
        <button
          type="button"
          className={styles.addButton}
          onClick={handleAddField}
        >
          Add Another Sponsor
        </button>
      </div>
    </div>
  );
};

export default Sponsors;
