import Image from 'next/image';
import { useState, useEffect } from 'react';
import { FiCamera } from 'react-icons/fi';
import createTournamentStyles from '@/styles/create-tournament/create-tournament.module.css';
import styles from './create-tournament-logo.module.css';
import { useT } from '@/i18n/LanguageProvider';
const CreateEventLogo = ({
  formData = {},
  setFormData,
  updateFileData,
  updateFormData
}) => {
  const tt = useT();
  const [logoPreview, setLogoPreview] = useState(null);
  const [bannerPreview, setBannerPreview] = useState(null);

  // Load previews from formData on mount
  useEffect(() => {
    if (formData?.tournament_logo) {
      setLogoPreview(formData.tournament_logo);
    }
    if (formData?.tournament_banner) {
      setBannerPreview(formData.tournament_banner);
    }
  }, [formData]);
  const handleLogoUploader = event => {
    const file = event.target.files[0];
    if (file) {
      console.log('Logo file selected:', file);
      console.log('Logo file details:', {
        name: file.name,
        size: file.size,
        type: file.type
      });

      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        alert('Logo must be a valid image file (JPEG, PNG, GIF, WebP)');
        return;
      }

      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        alert('Logo file size must be less than 5MB');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        setLogoPreview(reader.result); // Preview the uploaded logo

        // Save the data URL to formData for preview purposes
        if (updateFormData && typeof updateFormData === 'function') {
          updateFormData('tournament_logo', reader.result);
        } else if (setFormData && typeof setFormData === 'function') {
          setFormData(prev => ({
            ...prev,
            tournament_logo: reader.result
          }));
        } else {
          console.error('No update function provided for form data!');
        }

        // Save the actual File object for FormData submission
        if (updateFileData && typeof updateFileData === 'function') {
          console.log('Calling updateFileData for logo with file:', file);
          updateFileData('tournament_logo', file);
        } else {
          console.error('updateFileData function not provided!');
        }
      };
      reader.readAsDataURL(file);
    }
  };
  const handleBannerUploader = event => {
    const file = event.target.files[0];
    if (file) {
      console.log('Banner file selected:', file);
      console.log('Banner file details:', {
        name: file.name,
        size: file.size,
        type: file.type
      });

      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        alert('Banner must be a valid image file (JPEG, PNG, GIF, WebP)');
        return;
      }

      // Validate file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        alert('Banner file size must be less than 10MB');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        setBannerPreview(reader.result); // Preview the uploaded banner

        // Save the data URL to formData for preview purposes
        if (updateFormData && typeof updateFormData === 'function') {
          updateFormData('tournament_banner', reader.result);
        } else if (setFormData && typeof setFormData === 'function') {
          setFormData(prev => ({
            ...prev,
            tournament_banner: reader.result
          }));
        } else {
          console.error('No update function provided for form data!');
        }

        // Save the actual File object for FormData submission
        if (updateFileData && typeof updateFileData === 'function') {
          console.log('Calling updateFileData for banner with file:', file);
          updateFileData('tournament_banner', file);
        } else {
          console.error('updateFileData function not provided!');
        }
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
            <input type="file" accept="image/*" onChange={handleBannerUploader} id="bannerUpload" className={styles.uploadInput} />
          </div>
          {bannerPreview && <Image src={bannerPreview} // Use the data URL directly
        width={500} height={250} alt={tt("ui.banner.preview.ae8f", "Banner Preview")} />}
        </div>
      </div>
    </div>;
};
export default CreateEventLogo;