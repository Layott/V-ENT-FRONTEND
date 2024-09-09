'use client'

import { useState } from 'react';
import Sidebar from '@/components/profile/profile-sidebar/ProfileSidebar';
import ProfileHeader from '@/components/profile/profile-header/ProfileHeader';
import ProfileBanner from '@/components/profile/profile-banner/Banner';
import ProfileBio from '@/components/profile/profile-bio/ProfileBio';
import ProfileDashboardLeft from "@/components/profile/dashboard-left/ProfileDashboardLeft";
import ProfileDashboardRight from "@/components/profile/dashboard-right/ProfileDashboardRight";
import Gallery from "@/components/profile/gallery/Gallery"
import Activity from "@/components/profile/activity/Activity"
import styles from './profile.module.css'

const Profile = () => {
  const [activeTab, setActiveTab] = useState('overview')

  return (
    <div className={styles.pageContainer}>
      <ProfileHeader />
      
      <main className={styles.mainContainer}>
        <Sidebar />
      
        <div className={styles.rightPaneContainer}>
          <ProfileBanner />
          <ProfileBio />

          <div className={styles.buttonContainer}>
            <button
              className={`${styles.tabBTN} ${activeTab === 'overview' ? styles.activeTab : ''}`}
              onClick={() => setActiveTab('overview')}
            >
              Overview
            </button>

            <button
              className={`${styles.tabBTN} ${activeTab === 'activity' ? styles.activeTab : ''}`}
              onClick={() => setActiveTab('activity')}
            >
              Activity
            </button>

            <button
              className={`${styles.tabBTN} ${activeTab === 'gallery' ? styles.activeTab : ''}`}
              onClick={() => setActiveTab('gallery')}
            >
              Gallery
            </button>
          </div>

          <div className={styles.profileDashboard}>
            {activeTab === 'overview' && (
              <div className={styles.overviewContainer}>
                <ProfileDashboardLeft />
                <ProfileDashboardRight />
              </div>            
            )}

            {activeTab === 'activity' && (
              <div className={styles.activityContainer}>
                <Activity />
              </div>
            )}

            {activeTab === 'gallery' && (
              <div className={styles.galleryContainer}>
                <Gallery />
              </div>
            )}       
          </div>
      
        </div>
      
      </main>

    </div>
  )
}

export default Profile