import Link from 'next/link';
import { useState } from 'react';
// import { FaRegSave } from 'react-icons/fa'
import { FiCamera, FiEdit3 } from 'react-icons/fi'
import { IoLocationOutline } from 'react-icons/io5';
import Image from 'next/image'
import profileImageBig from "@/images/signed_in_user_big.webp" 
import styles from './user-profile-bio.module.css'

const UserProfileBio = ({full_name, username, profile_picture, description, country}) => {
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
                <div className={styles.profileDetailsContainer}>
                    <div className={styles.profileDetails}>
                        <h1 className={styles.profileFullName}>{full_name}</h1>
                        <p className={styles.profileUsernameHandle}>@{username}</p>
                        <p className={styles.userLocation}><IoLocationOutline />
                            {/* <span className={styles.userLocationState}>Lagos</span>,
                            &nbsp; */}
                            <span className={styles.userLocationCountry}>{country}</span>
                        </p>
                    </div>

                    <div className={styles.profileEditButtonContainer}>
                        <Link
                            href={'/edit-user-profile'}
                            onClick={toggleEditMode}
                            className={styles.editButtonLink}
                        >
                            <FiEdit3 className={styles.editIcon} />
                            Edit Profile

                        </Link>
                    </div>


                    {/* <div className={styles.profileEditButtonContainer}>
                        <Link
                            href={'/edit-user-profile'}
                            onClick={toggleEditMode}
                            className={styles.editButtonLink}
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
                        </Link>
                    </div> */}


                </div>

            </div>



        </div>

        <div className={styles.profileDescription}>
            <p className={styles.bioParagraph}>
                {description}
            </p>
        </div>

    </div>
  )
}

export default UserProfileBio