'use client';

import InfoTip from '@/components/info-tip/InfoTip';
import Image from 'next/image';
import { useState } from 'react';
import { FiCamera } from 'react-icons/fi';
import createTournamentStyles from '@/styles/create-tournament/create-tournament.module.css';
import styles from './create-tournament-logo.module.css';
import { useT } from '@/i18n/LanguageProvider';
const CreateTournamentLogo = ({
  updateFormData,
  updateFileData
}) => {
  const tt = useT();
  const [logoPreview, setLogoPreview] = useState(null);
  const [bannerPreview, setBannerPreview] = useState(null);
  const handleLogoUploader = event => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setLogoPreview(reader.result); // Preview the uploaded logo

        // Save the data URL to localStorage for preview purposes
        updateFormData('tournament_logo', reader.result);

        // Save the actual File object for FormData submission
        updateFileData('tournament_logo', file);
      };
      reader.readAsDataURL(file);
    }
  };
  const handleBannerUploader = event => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setBannerPreview(reader.result); // Preview the uploaded banner

        // Save the data URL to localStorage for preview purposes
        updateFormData('tournament_banner', reader.result);

        // Save the actual File object for FormData submission
        updateFileData('tournament_banner', file);
      };
      reader.readAsDataURL(file);
    }
  };
  return <div className={createTournamentStyles.createSubSectionContainer}>
      <div className={createTournamentStyles.innerCreateSubSectionContainer}>
        <h3 className={createTournamentStyles.tournamentTypeH3}>{tt("ui.logo.banner.716b", "Logo & Banner")}</h3>

        <div className={styles.outerLogoContainer}>
          <div className={styles.logoContainer}>
            {logoPreview && <Image src={logoPreview} // Use the data URL directly
          width={100} height={100} alt={tt("ui.logo.preview.c1c1", "Logo Preview")} />}
          </div>

          <div className={styles.logoTextAndBTNContainer}>
            <div className={styles.logoUploader}>
              <label htmlFor="logoUpload" className={styles.logoUploadLabel}>
                <FiCamera className={styles.uploadIcon} /> {tt("ui.upload.logo.8a04", "Upload Logo")}
              </label>
              <InfoTip id="teamLogo" />
              <input type="file" accept="image/*" onChange={handleLogoUploader} id="logoUpload" className={styles.uploadInput} />
            </div>
            <p>{tt("ui.recommend.image.x.px.db2a", "We recommend an image that is 256 x 256 px")}</p>
          </div>
        </div>

        <div className={styles.profileBanner}>
          <div className={styles.bannerUploader}>
            <label htmlFor="bannerUpload" className={styles.bannerUploadLabel}>
              <FiCamera className={styles.uploadIcon} /> {tt("ui.upload.banner.aad3", "Upload Banner")}
            </label>
            <InfoTip id="teamBanner" />
            <input type="file" accept="image/*" onChange={handleBannerUploader} id="bannerUpload" className={styles.uploadInput} />
          </div>
          {bannerPreview && <Image src={bannerPreview} // Use the data URL directly
        width={500} height={250} alt={tt("ui.banner.preview.ae8f", "Banner Preview")} />}
        </div>
      </div>
    </div>;
};
export default CreateTournamentLogo;