import { mediaUrl } from '@/lib/mediaUrl';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { FiCamera } from 'react-icons/fi';
import defaultBanner from "@/images/profile_image_bg.webp";
import profileStyles from "@/styles/profile/profile-page.module.css";
import bioStyles from "./../../../user-profile/user-profile-bio/user-profile-bio.module.css";
import styles from './edit-profile-banner.module.css';
import { useT } from '@/i18n/LanguageProvider';
const EditUserProfileBanner = ({
  onChange
}) => {
  const tt = useT();
  const [uploadedBannerImage, setUploadedBannerImage] = useState(null);
  const [bannerImage, setBannerImage] = useState(null);
  useEffect(() => {
    try {
      const storedData = localStorage.getItem('userProfile');
      if (storedData) {
        const parsedData = JSON.parse(storedData);
        setBannerImage(parsedData?.banner || null);
      }
    } catch (error) {
      console.error("Failed to load profile picture from localStorage:", error);
    }
  }, []);
  const handleBannerUploader = event => {
    const file = event.target.files[0];
    if (file) {
      // Update state and pass the file to the parent component
      const imageUrl = URL.createObjectURL(file);
      setUploadedBannerImage(imageUrl);
      onChange(file); // Pass the file to the parent component
    }
  };
  return <div className={styles.editProfileBannerContainer}>
      <div className={styles.editProfileBannerImageContainer}>
        <Image src={mediaUrl(uploadedBannerImage || bannerImage || defaultBanner)} // Fallback to default banner
      alt={tt("ui.banner.edited.1be7", "Banner to be Edited")} className={styles.bannerImage} width={1256} height={256} // Ensure dimensions are correct
      />

        <div className={`${bioStyles.bannerUploader} ${styles.bannerUploader}`}>
          <label htmlFor="bannerUpload" className={`${bioStyles.bannerUploadLabel} ${styles.bannerUploadLabel}`}>
            <FiCamera className={bioStyles.uploadIcon} /> {tt("ui.change.banner.0ad3", "Change banner")}
          </label>
          <input type="file" accept="image/*" onChange={handleBannerUploader} // Use handleBannerUploader
        id="bannerUpload" className={bioStyles.uploadInput} />
        </div>
      </div>
      <p className={profileStyles.instructionText}>
        {tt("ui.recommend.image.x.px.78c6", "We recommend an image that is 1256 x 256 px")}
      </p>
    </div>;
};
export default EditUserProfileBanner;