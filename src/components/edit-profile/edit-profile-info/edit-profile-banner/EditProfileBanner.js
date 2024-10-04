import Image from 'next/image'
import { FiCamera } from 'react-icons/fi'
import bannerImage from "@/images/profile_image_bg.webp"
import profileStyles from "@/styles/profile/profile-page.module.css"
import bioStyles from "./../../../profile/profile-bio/profile-bio.module.css"
import styles from './edit-profile-banner.module.css'

const EditProfileBanner = () => {
    const handleBannerUploader = (event) => {
        const file = event.target.files[0]
        if (file) {
        console.log(`Banner uploaded: ${file.name}`)
        // File upload logic
        
        }
    }

  return (
    <div className={styles.editProfileBannerContainer}>
        <div className={styles.editProfileBannerImageContainer}>
            <Image
                src={bannerImage}
                alt='Banner to be Edited'
            />

            <div className={`${bioStyles.bannerUploader} ${styles.bannerUploader}`}>
                <label htmlFor="bannerUpload" className={`${bioStyles.bannerUploadLabel} ${styles.bannerUploadLabel}`}>
                    <FiCamera className={bioStyles.uploadIcon} /> Change banner
                </label>
                <input
                    type="file"
                    accept="image/*"
                    onChange={handleBannerUploader}
                    id="bannerUpload"
                    className={bioStyles.uploadInput}
                    
                />
            </div>

        </div>
        <p className={profileStyles.instructionText}>We recommend an image that is 1256 x 256 px</p>
    </div>
  )
}

export default EditProfileBanner