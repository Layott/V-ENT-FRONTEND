import { useState } from 'react';
import { FaRegSave } from 'react-icons/fa'
import { FiCamera, FiEdit3 } from 'react-icons/fi'
import { IoLocationOutline } from 'react-icons/io5';
import Image from 'next/image'
import profileImageBig from "@/images/signed_in_user_big.jpeg" 
import styles from './user-profile-bio.module.css'

const UserProfileBio = () => {
    const [isEditing, setIsEditing] = useState(false)

    const handleProfileImageUploader = () => {
      // 
    }
  
    const toggleEditMode = () => {
      setIsEditing(!isEditing)
    }
  
  return (
    <div className={styles.profileBioContainer}>
        <div className={styles.profileBioHeader}>
            <div className={styles.profileBioInfo}>
                <div className={styles.profileImageContainer}>
                    <Image
                        src={profileImageBig}
                        alt='Bigger Profile Image'
                    />

                    <div className={styles.profileImageUpload}>
                        <label htmlFor="profileImageUpload" className={styles.profileImageUploadLabel}>
                            <FiCamera className={styles.uploadIcon} />
                        </label>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleProfileImageUploader}
                            id="profileImageUpload"
                            className={styles.uploadInput}
                        />
                    </div>

                </div>
                <div className={styles.profileDetails}>
                    <h1 className={styles.profileFullName}>Nathan Drake</h1>
                    <p className={styles.profileUsernameHandle}>@frostbite</p>
                    <p className={styles.userLocation}><IoLocationOutline />
                        <span className={styles.userLocationState}>Lagos</span>,
                        &nbsp;
                        <span className={styles.userLocationCountry}>Nigeria</span>
                    </p>
                </div>
            </div>
            <div className={styles.profileEditButton}>
                <button
                    onClick={toggleEditMode}
                    className={styles.editButton}
                >
                    {isEditing ? (
                        <>
                        <FaRegSave className={styles.saveIcon} /> 
                        Save Profile
                        </>
                    ) : (
                        <>
                        <FiEdit3 className={styles.editIcon} />
                        Edit Profile
                        </>   
                    )}
                </button>
            </div>
        </div>

        <div className={styles.profileDescription}>
            <p className={styles.bioParagraph}>
                Passionate gamer with a sharp eye for detail, always on the lookout for the next big win. Whether it&#39;s dominating in-game or leveling up your project with killer design, I&#39;m here to make it happen. Let&#39;s team up and create something epic!
            </p>
        </div>

    </div>
  )
}

export default UserProfileBio