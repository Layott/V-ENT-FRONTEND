'use client'

import Sidebar from '@/components/user-profile/user-profile-sidebar/UserProfileSidebar';
import UserProfileHeader from '@/components/user-profile/user-profile-header/UserProfileHeader';
import UserProfileBanner from '@/components/user-profile/user-profile-banner/Banner';
import UserProfileBio from '@/components/user-profile/user-profile-bio/UserProfileBio';
import styles from './user-profile.module.css'

const UserProfile = () => {

  return (
    <div className={styles.pageContainer}>
      <UserProfileHeader />
      <main className={styles.mainContainer}>
        <Sidebar />
        <div className={styles.rightPaneContainer}>
          <UserProfileBanner />
          <UserProfileBio />          
        </div>
      </main>

    </div>
  )
}

export default UserProfile