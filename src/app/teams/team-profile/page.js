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
import TeamProfileMembers from '@/components/team-profile/team-profile-members/TeamProfileMembers';
import tabStyles from '@/styles/modules/tabs/tabs.module.css';
import styles from './team-profile.module.css'

const TeamProfile = () => {
  const [activeTab, setActiveTab] = useState('members')

  return (
    <div className={styles.pageContainer}>
      <Header />
      <MobileHeader />
      
      <main className={styles.mainContainer}>
        <Sidebar />
      
        <div className={styles.rightPaneContainer}>
          <TeamProfileBanner />
          <TeamProfileBio />

          <div className={tabStyles.buttonContainer}>
            <button
              className={`${tabStyles.tabBTN} ${activeTab === 'overview' ? tabStyles.activeTab : ''}`}
              onClick={() => setActiveTab('overview')}
            >
              Overview
            </button>

            <button
              className={`${tabStyles.tabBTN} ${activeTab === 'members' ? tabStyles.activeTab : ''}`}
              onClick={() => setActiveTab('members')}
            >
              Members
            </button>

            <button
              className={`${tabStyles.tabBTN} ${activeTab === 'members-old' ? tabStyles.activeTab : ''}`}
              onClick={() => setActiveTab('members-old')}
            >
              Members Old
            </button>

            <button
              className={`${tabStyles.tabBTN} ${activeTab === 'activity' ? tabStyles.activeTab : ''}`}
              onClick={() => setActiveTab('activity')}
            >
              Activity
            </button>

            <button
              className={`${tabStyles.tabBTN} ${activeTab === 'stats' ? tabStyles.activeTab : ''}`}
              onClick={() => setActiveTab('stats')}
            >
              Stats
            </button>
          </div>

          <div className={tabStyles.detailsDashboard}>
            {activeTab === 'overview' && (
              <div className={styles.overviewContainer}>
                <TeamProfileOverviewLeft />
                <TeamProfileOverviewRight />
              </div>            
            )}

            {activeTab === 'members' && (
              <div className={styles.membersContainer}>
                <TeamProfileMembers />
              </div>
            )}

            {activeTab === 'members-old' && (
              <div className={styles.membersContainer}>
                <TeamProfileActivity />
              </div>
            )}

            {activeTab === 'activity' && (
              <div className={styles.activityContainer}>
                <TeamProfileActivity />
              </div>
            )}

            {activeTab === 'stats' && (
              <div className={styles.statsContainer}>
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