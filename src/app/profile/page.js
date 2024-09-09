'use client'

import Sidebar from '@/components/profile/profile-sidebar/ProfileSidebar';
import ProfileHeader from '@/components/profile/profile-header/ProfileHeader';
import ProfileBanner from '@/components/profile/profile-banner/Banner';
import ProfileBio from '@/components/profile/profile-bio/ProfileBio';
import ProfileDashboardLeft from "@/components/profile/dashboard-left/ProfileDashboardLeft";
import ProfileDashboardRight from "@/components/profile/dashboard-right/ProfileDashboardRight";
import Gallery from "@/components/profile/gallery/Gallery"
import styles from './profile.module.css'

const Profile = () => {

  return (
    <div className={styles.pageContainer}>
      
      <ProfileHeader />
      
      <main className={styles.mainContainer}>

        <Sidebar />
      
        <div className={styles.rightPaneContainer}>

          <ProfileBanner />
          <ProfileBio />

          <div className={styles.profileDashboard}>

            <div className={styles.overviewContainer}>
              <ProfileDashboardLeft />
              <ProfileDashboardRight />
            </div>

            <div className={styles.galleryContainer}>
              <Gallery />
            </div>
       
          </div>
      
        </div>
      
      </main>

    </div>
  )
}

export default Profile