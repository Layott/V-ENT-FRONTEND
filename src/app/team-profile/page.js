'use client'

import { useState } from 'react';
import Sidebar from '@/components/sidebar/Sidebar';
import Header from '@/components/header/Header';
import ProfileBanner from '@/components/user-profile/user-profile-banner/UserProfileBanner';
import ProfileBio from '@/components/user-profile/user-profile-bio/UserProfileBio';
import OverviewLeft from "@/components/user-profile/user-profile-overview-left/UserProfileOverviewLeft";
import OverviewRight from "@/components/user-profile/user-profile-overview-right/UserProfileOverviewRight";
import Gallery from "@/components/user-profile/user-profile-gallery/UserProfileGallery"
import Activity from "@/components/user-profile/user-profile-activity/UserProfileActivity"
import styles from './user-profile.module.css'

const TeamProfile = () => {
  const [activeTab, setActiveTab] = useState('overview')

  return (
    <div className={styles.pageContainer}>
      <Header />
      
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
                <OverviewLeft />
                <OverviewRight />
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

export default TeamProfile