'use client'

import { useState } from 'react';
import Sidebar from '@/components/sidebar/Sidebar';
import Header from '@/components/header/Header';
import TournamentDetailsBanner from '@/components/tournament-details/tournament-details-banner/TournamentDetailsBanner';

import OverviewLeft from "@/components/profile/overview-left/OverviewLeft";
import OverviewRight from "@/components/profile/overview-right/OverviewRight";
import Gallery from "@/components/profile/gallery/Gallery"
import Activity from "@/components/profile/activity/Activity"
import styles from './tournament-details.module.css'

const TournamentDetails = () => {
  const [activeTab, setActiveTab] = useState('overview')

  return (
    <div className={styles.pageContainer}>
      <Header />
      
      <main className={styles.mainContainer}>
        <Sidebar />
      
        <div className={styles.rightPaneContainer}>
          <TournamentDetailsBanner />

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

export default TournamentDetails