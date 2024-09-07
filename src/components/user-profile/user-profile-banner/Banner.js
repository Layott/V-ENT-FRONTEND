import profileBannerImage from "@/images/profile_image_bg.jpeg"
import { FiCamera } from 'react-icons/fi';
import Image from 'next/image';
import styles from './banner.module.css'

const UserProfileBanner = () => {
    const handleBannerUploader = (event) => {
        const file = event.target.files[0]
        if (file) {
        console.log(`Banner uploaded: ${file.name}`)
        // File upload logic
        }
    }

      
  return (
    <div className={styles.profileBanner}>
        <div className={styles.bannerUploader}>
            <label htmlFor="bannerUpload" className={styles.bannerUploadLabel}>
                <FiCamera className={styles.uploadIcon} /> Upload banner
            </label>
            <input
                type="file"
                accept="image/*"
                onChange={handleBannerUploader}
                id="bannerUpload"
                className={styles.uploadInput}
            />
        </div>
        <Image
            src={profileBannerImage}
            alt='Profile Banner Image'
        />
  </div>

  )
}

export default UserProfileBanner