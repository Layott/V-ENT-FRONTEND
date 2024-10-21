import Image from 'next/image';
import { FiCamera } from 'react-icons/fi';
import teamProfileBanner from '@/images/team_profile_banner.webp'
import styles from './team-profile-banner.module.css'

const TeamProfileBanner = () => {
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
            src={teamProfileBanner}
            alt='Profile Banner Image'
        />
  </div>

  )
}

export default TeamProfileBanner