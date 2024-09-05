'use client'

import { useState } from 'react';
import Sidebar from '@/components/user-profile/user-profile-sidebar/UserProfileSidebar';
import UserProfileHeader from '@/components/user-profile/user-profile-header/UserProfileHeader';
import profileImageBig from './../../../public/images/signed-in-user-big.jpeg'
import styles from './user-profile.module.css'

const UserProfile = () => {
  return (
    <div className={styles.pageContainer}>

      <UserProfileHeader />

      <main className={styles.mainContainer}>

        <Sidebar />

        <div className={styles.rightPaneContainer}>

        </div>

      </main>


    </div>
  )
}

export default UserProfile