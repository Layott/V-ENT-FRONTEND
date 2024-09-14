import EditProfileImageAvatar from './edit-profile-image-avatar/EditProfileImageAvatar'
import EditProfileBanner from './edit-profile-banner/EditProfileBanner'
import styles from './edit-profile-details.module.css'

const EditProfileDetails = () => {
  return (
    <div className={styles.editProfileDetailsContainer}>
      <h3>Profile Picture & Banner</h3>
      <div className={styles.profilePictureBannerContainer}>
        <EditProfileImageAvatar />
        <EditProfileBanner />


      </div>
    </div>
  )
}

export default EditProfileDetails