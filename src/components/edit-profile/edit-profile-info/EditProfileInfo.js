import EditProfileImageAvatar from './edit-profile-image-avatar/EditProfileImageAvatar'
import EditProfileBanner from './edit-profile-banner/EditProfileBanner'
import EditProfileDetails from './edit-profile-details/EditProfileDetails'
import EditInterests from './edit-interests/EditInterests'
import styles from './edit-profile-info.module.css'

const EditProfileInfo = () => {
  return (
    <div className={styles.editProfileInfoContainer}>
      <div className={styles.editProfilePictureBannerContainer}>
        <h3>Profile Picture & Banner</h3>
        <div className={styles.profilePictureBannerContainer}>
          <EditProfileImageAvatar />
          <EditProfileBanner />
        </div>
      </div>
      <EditProfileDetails />
      <EditInterests />
    </div>
  )
}

export default EditProfileInfo