'use client'

import Sidebar from '@/components/profile/profile-sidebar/ProfileSidebar';
import UserProfileHeader from '@/components/profile/profile-header/ProfileHeader';
import UserProfileBanner from '@/components/profile/profile-banner/Banner';
import UserProfileBio from '@/components/profile/profile-bio/ProfileBio';
import UserProfileDashboardLeft from "@/components/profile/dashboard-left/UserProfileDashboardLeft";
import UserProfileDashboardRight from "@/components/profile/dashboard-right/UserProfileDashboardRight";
import styles from './profile.module.css'

const UserProfile = () => {

  return (
    <div className={styles.pageContainer}>
      
      <UserProfileHeader />
      
      <main className={styles.mainContainer}>

        <Sidebar />
      
        <div className={styles.rightPaneContainer}>

          <UserProfileBanner />
          <UserProfileBio />

          <div className={styles.profileDashboard}>
       
            <UserProfileDashboardLeft />
            <UserProfileDashboardRight />
       
          </div>
      
        </div>
      
      </main>

    </div>
  )
}

export default UserProfile