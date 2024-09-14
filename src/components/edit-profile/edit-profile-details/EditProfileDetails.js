import ProfileImageAvatar from './ProfileImageAvatar'
import styles from './edit-profile-details.module.css'

const EditProfileDetails = () => {
  return (
    <div className={styles.editProfileDetailsContainer}>
      <div className={styles.profilePictureBannerContainer}>
        <h3>Profile Picture & Banner</h3>

        <ProfileImageAvatar />

      </div>
    </div>
  )
}

export default EditProfileDetails