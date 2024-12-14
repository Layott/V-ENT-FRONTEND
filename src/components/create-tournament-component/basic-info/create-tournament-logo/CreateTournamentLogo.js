import Image from 'next/image'
import { FiCamera } from 'react-icons/fi'
import createTournamentStyles from '@/styles/create-tournament/create-tournament.module.css'
import styles from './create-tournament-logo.module.css'

const CreateTournamentLogo = () => {
  return (
    <div className={createTournamentStyles.createSubSectionContainer}>
      <div className={createTournamentStyles.innerCreateSubSectionContainer}>
          <h3 className={createTournamentStyles.tournamentTypeH3}>Logo & Banner</h3>

          <div className={styles.outerLogoContainer}>
            <div className={styles.logoContainer}>
              
            </div>

            <div className={styles.logoTextAndBTNContainer}>
              <div className={styles.logoUploader}>
                  <label htmlFor="logoUpload" className={styles.logoUploadLabel}>
                      <FiCamera className={styles.uploadIcon} /> Upload Logo
                  </label>
                  <input
                      type="file"
                      accept="image/*"
                      // onChange={handleLogoUploader}
                      id="bannerUpload"
                      className={styles.uploadInput}
                  />
              </div>
              <p>We recommend an image that is 256 x 256 px</p>
            </div>
          </div>

          <div className={styles.profileBanner}>
            <div className={styles.bannerUploader}>
                <label htmlFor="bannerUpload" className={styles.bannerUploadLabel}>
                    <FiCamera className={styles.uploadIcon} /> Upload banner
                </label>
                <input
                    type="file"
                    accept="image/*"
                    // onChange={handleBannerUploader}
                    id="bannerUpload"
                    className={styles.uploadInput}
                />
            </div>
            <Image
                // src={banner || profileBannerImage}
                width={500}
                height={500}
                alt='Profile Banner Image'
            />
          </div>

          <div className={styles.bannerContainer}>

          </div>

      </div>
    </div>
  )
}

export default CreateTournamentLogo