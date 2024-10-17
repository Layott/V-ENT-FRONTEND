import { HiPlus } from "react-icons/hi";
import editUserProfileDetailsStyles from './../edit-user-profile-info/edit-user-profile-details/edit-user-profile-details.module.css'
import styles from './edit-user-profile-links.module.css'

const EditUserProfileLinks = () => {
  return (
    <div className={styles.editLinksContainer}>
      <h3>Web and Social Links</h3>

      <div className={editUserProfileDetailsStyles.profileDetailsContainer}>
        <div className={editUserProfileDetailsStyles.inputGroup}>
          <label htmlFor="facebook">Facebook</label>
          <input type="text" placeholder='https://www.facebook.com' />
        </div>

        <div className={editUserProfileDetailsStyles.inputGroup}>
          <label htmlFor="twitter">X (Twitter)</label>
          <input type="text" placeholder='https://www.x.com' />
        </div>

        <div className={editUserProfileDetailsStyles.inputGroup}>
          <label htmlFor="instagram">Instagram</label>
          <input type="text" placeholder='https://www.instagram.com' />
        </div>

        <div className={editUserProfileDetailsStyles.inputGroup}>
          <label htmlFor="youtube">YouTube</label>
          <input type="text" placeholder='https://www.youtube.com' />
        </div>

        <div className={styles.titleLinkContainer}>
          <div className={`${editUserProfileDetailsStyles.inputGroup} ${styles.addInputGroup}`}>
            <label htmlFor="name">Title</label>
            <input type="text" placeholder='e.g. YouTube, Instagram' />
          </div>

          <div className={`${editUserProfileDetailsStyles.inputGroup} ${styles.addInputGroup}`}>
            <label htmlFor="name">Link</label>
            <input type="text" placeholder='https://www.youtube.com' />
          </div>
        </div>

        <button className={styles.addAnotherLink}><HiPlus className={styles.addLinkIcon} />Add another link</button>
      </div>

    </div>
  )
}

export default EditUserProfileLinks