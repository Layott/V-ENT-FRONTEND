'use client';

import { uploadHint } from '@/lib/uploadSpecs';
import { mediaUrl } from '@/lib/mediaUrl';
import InfoTip from '@/components/info-tip/InfoTip';
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
  const [fields, setFields] = useState(() => Array.isArray(formData?.sponsors) && formData.sponsors.length > 0 ? formData.sponsors : [{
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
  // The File itself, kept alongside the preview.
  //
  // Sponsor logos have never saved. The backend has always read
  // request.FILES.getlist('sponsor_logos') and matched them by index; the wizard
  // read the file into a base64 data URL, put that in formData, and never
  // appended a single file to the request. So the name and the type went up and
  // the picture was silently dropped every time.
  //
  // The data URL also went into localStorage with the draft, which is how an
  // image big enough to matter blew the storage quota and lost the whole draft.
  const handleLogoUpload = (index, event) => {
    const file = event.target.files[0];
    event.target.value = '';
    if (!file) return;

    const preview = URL.createObjectURL(file);
    const updatedFields = [...fields];
    if (updatedFields[index].logoPreview) {
      URL.revokeObjectURL(updatedFields[index].logoPreview);
    }
    updatedFields[index] = {
      ...updatedFields[index],
      logo: preview,
      logoFile: file,
    };
    setFields(updatedFields);
    updateFormData('sponsors', updatedFields);
  };
  const handleResetLogo = (index, event) => {
    event.stopPropagation();
    const updatedFields = [...fields];
    // An object URL that is never revoked leaks every time somebody changes
    // their mind about a logo.
    if (updatedFields[index].logo && updatedFields[index].logoFile) {
      URL.revokeObjectURL(updatedFields[index].logo);
    }
    updatedFields[index] = { ...updatedFields[index], logo: null, logoFile: null };
    setFields(updatedFields);
    updateFormData('sponsors', updatedFields);
  };
  // The input is hidden and the visible box forwards the click to it, so the
  // ref is the only thing connecting the two. Without `ref` on the input,
  // fileInputs.current[index] is undefined and this throws, which is why the
  // Upload Logo box did nothing at all: no picker, no error on screen, just a
  // TypeError in a console nobody has open.
  const triggerFileInput = index => {
    const input = fileInputs.current[index];
    if (input) input.click();
  };
  return <div className={createTournamentStyles.createSubSectionContainer}>
      <div className={createTournamentStyles.innerCreateSubSectionContainer}>
        <h3 className={createTournamentStyles.tournamentTypeH3}>{tt("ui.sponsors.82ce", "Sponsors")}</h3>
        {fields.map((field, index) => <div key={index} className={styles.threeBoxesContainer}>
            <div className={`${createTournamentStyles.twoBoxesInRowContainer} ${styles.twoBoxesInRowContainer}`}>
              <div className={createTournamentStyles.inputGroup}>
                <label htmlFor={`sponsorName-${index}`} className={createTournamentStyles.labelWithAsterisk}>
                  <span className="fieldLabelRow">{tt("ui.sponsor.name.32b9", "Sponsor Name")}
                  <span className={createTournamentStyles.asteriskSpan}>
                    <FaAsterisk className={createTournamentStyles.asteriskIcon} />
                  </span> <InfoTip id="sponsorName" /></span>
                </label>
                <input id={`sponsorName-${index}`} type="text" placeholder={tt("ui.enter.sponsor.name.2574", "Enter sponsor name")} className={createTournamentStyles.inputText} value={field.name} onChange={e => handleFieldChange(index, 'name', e.target.value)} />
              </div>
              <div className={createTournamentStyles.inputGroup}>
                <label htmlFor={`sponsorUsername-${index}`} className={createTournamentStyles.labelWithAsterisk}>
                  <span className="fieldLabelRow">{tt("ui.username.84c2", "Username")} <InfoTip id="sponsorUsername" /></span>
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
                  <input id={`logoUpload-${index}`} type="file" accept="image/*"
                         ref={el => { fileInputs.current[index] = el; }}
                         onChange={e => handleLogoUpload(index, e)}
                         className={styles.hiddenInput} />
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