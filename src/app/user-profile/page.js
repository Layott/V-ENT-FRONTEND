'use client'

import { useState } from 'react';
import Image from 'next/image';
import { FiCamera, FiEdit3 } from 'react-icons/fi';
import { FaRegSave } from "react-icons/fa";
import { IoLocationOutline } from "react-icons/io5";
import Sidebar from '@/components/user-profile/user-profile-sidebar/UserProfileSidebar';
import UserProfileHeader from '@/components/user-profile/user-profile-header/UserProfileHeader';
import profileImageBig from './../../../public/images/signed-in-user-big.jpeg'
import profileBannerImage from './../../../public/images/profile-image-bg.jpeg'
import styles from './user-profile.module.css'

const UserProfile = () => {
  const [isEditing, setIsEditing] = useState(false)
  const handleBannerUploader = (event) => {
    const file = event.target.files[0]
    if (file) {
      console.log(`Banner uploaded: ${file.name}`)
      // File upload logic
    }
  }

  const handleProfileImageUploader = () => {
    // 
  }

  const toggleEditMode = () => {
    setIsEditing(!isEditing)
  }

  return (
    <div className={styles.pageContainer}>

      <UserProfileHeader />

      <main className={styles.mainContainer}>

        <Sidebar />

        <div className={styles.rightPaneContainer}>
          <div className={styles.profileBanner}>
            <div className={styles.bannerUploader}>
              <label htmlFor="bannerUpload" className={styles.bannerUploadLabel}>
                <FiCamera className={styles.uploadIcon} /> Upload banner
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleBannerUploader}
                id="bannerUpload"
                className={styles.uploadInput}
              />
            </div>
            <Image
              src={profileBannerImage}
              alt='Profile Banner Image'
            />
          </div>

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
                Passionate gamer with a sharp eye for detail, always on the lookout for the next big win. Whether it's dominating in-game or leveling up your project with killer design, I'm here to make it happen. Let's team up and create something epic!
              </p>

            </div>

            
          </div>

        </div>

      </main>


    </div>
  )
}

export default UserProfile