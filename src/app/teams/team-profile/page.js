'use client'

import { useState } from 'react';
import Sidebar from '@/components/sidebar/Sidebar';
import Header from '@/components/header/Header';
import MobileHeader from '@/components/mobile-header/MobileHeader';
import TeamProfileBanner from '@/components/team-profile/team-profile-banner/TeamProfileBanner';
import TeamProfileBio from '@/components/team-profile/team-profile-bio/TeamProfileBio';
import TeamProfileOverviewLeft from '@/components/team-profile/team-profile-overview-left/TeamProfileOverviewLeft';
import TeamProfileOverviewRight from '@/components/team-profile/team-profile-overview-right/TeamProfileOverviewRight';
import TeamProfileGallery from '@/components/team-profile/team-profile-gallery/TeamProfileGallery';
import TeamProfileActivity from '@/components/team-profile/team-profile-activity/TeamProfileActivity';

import styles from './user-profile.module.css'

const TeamProfile = () => {
  const [activeTab, setActiveTab] = useState('overview')

  return (
    <div className={styles.pageContainer}>
      <Header />
      <MobileHeader />
      
      <main className={styles.mainContainer}>
        <Sidebar />
      
        <div className={styles.rightPaneContainer}>
          <TeamProfileBanner />
          <TeamProfileBio />

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
                <TeamProfileOverviewLeft />
                <TeamProfileOverviewRight />
              </div>            
            )}

            {activeTab === 'activity' && (
              <div className={styles.activityContainer}>
                <TeamProfileActivity />
              </div>
            )}

            {activeTab === 'gallery' && (
              <div className={styles.galleryContainer}>
                <TeamProfileGallery />
              </div>
            )}       
          </div>
      
        </div>
      </main>
    </div>
  )
}

export default TeamProfile