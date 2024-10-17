import React from 'react'
import profileStyles from "@/styles/profile/profile-page.module.css"
import styles from './edit-user-profile-details.module.css'

const EditUserProfileDetails = () => {
  return (
    <div className={styles.editProfileDetailsContainer}>
        <h3>Profile Details</h3>
        <div className={styles.profileDetailsContainer}>
            <div className={styles.inputGroup}>
                <label htmlFor="username">Username</label>
                <input type="text" placeholder='@frostbite' />
            </div>

            <div className={styles.inputGroup}>
                <label htmlFor="profileName">Profile Name</label>
                <input type="text" placeholder='Nathan Drake' />
            </div>

            <div className={styles.inputGroup}>
                <label htmlFor="profileName">Bio</label>
                <textarea name="" id=""></textarea>
                <p className={profileStyles.instructionText}>Maximum of 140 characters</p>
            </div>

            <div className={styles.inputGroup}>
                <label htmlFor="profileName">Country</label>
                <input type="text" placeholder='Lagos, Nigeria' />
            </div>
        </div>
    </div>
  )
}

export default EditUserProfileDetails