import EditProfileImageAvatar from './edit-profile-image-avatar/EditProfileImageAvatar'
import EditProfileBanner from './edit-user-profile-banner/EditUserProfileBanner'
import EditProfileDetails from './edit-user-profile-details/EditUserProfileDetails'
import EditInterests from './edit-user-profile-interests/EditUserProfileInterests'
import styles from './edit-user-profile-info.module.css'

const EditUserProfileInfo = () => {
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

export default EditUserProfileInfo