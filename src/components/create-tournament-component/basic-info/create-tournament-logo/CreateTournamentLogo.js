import Image from 'next/image'
import { useState } from 'react';
import { FiCamera } from 'react-icons/fi'
import createTournamentStyles from '@/styles/create-tournament/create-tournament.module.css'
import styles from './create-tournament-logo.module.css'

const CreateTournamentLogo = ({ formData, updateFormData }) => {
  const [logoPreview, setLogoPreview] = useState(null);
  const [bannerPreview, setBannerPreview] = useState(null);

  const handleLogoUploader = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setLogoPreview(reader.result); // Preview the uploaded logo
      };
      reader.readAsDataURL(file);

      // Update formData
      updateFormData({ ...formData, logo: file });
    }
  };

  const handleBannerUploader = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setBannerPreview(reader.result); // Preview the uploaded banner
      };
      reader.readAsDataURL(file);

      // Update formData
      updateFormData({ ...formData, banner: file });
    }
  };

  return (
    <div className={createTournamentStyles.createSubSectionContainer}>
      <div className={createTournamentStyles.innerCreateSubSectionContainer}>
        <h3 className={createTournamentStyles.tournamentTypeH3}>Logo & Banner</h3>

        <div className={styles.outerLogoContainer}>
          <div className={styles.logoContainer}>
            {logoPreview && (
              <Image
                src={logoPreview}
                width={100}
                height={100}  v
                alt="Logo Preview"
              />
            )}
          </div>

          <div className={styles.logoTextAndBTNContainer}>
            <div className={styles.logoUploader}>
              <label htmlFor="logoUpload" className={styles.logoUploadLabel}>
                <FiCamera className={styles.uploadIcon} /> Upload Logo
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoUploader}
                id="logoUpload"
                className={styles.uploadInput}
              />
            </div>
            <p>We recommend an image that is 256 x 256 px</p>
          </div>
        </div>

        <div className={styles.profileBanner}>
          <div className={styles.bannerUploader}>
            <label htmlFor="bannerUpload" className={styles.bannerUploadLabel}>
              <FiCamera className={styles.uploadIcon} /> Upload Banner
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleBannerUploader}
              id="bannerUpload"
              className={styles.uploadInput}
            />
          </div>
          {bannerPreview && (
            <Image
              src={bannerPreview}
              width={500}
              height={250}
              alt="Banner Preview"
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default CreateTournamentLogo;
