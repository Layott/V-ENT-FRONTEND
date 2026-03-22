'use client'

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
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
import BottomMenu from '@/components/bottom-menu/BottomMenu';
import tabStyles from '@/styles/modules/tabs/tabs.module.css';
import styles from './team-profile.module.css'

const TeamProfileContent = () => {
  const [activeTab, setActiveTab] = useState('members')
  const searchParams = useSearchParams();
  const teamId = searchParams.get('id');

  return (
    <div className={styles.pageContainer}>
      <Header />
      <MobileHeader />

      <main className={styles.mainContainer}>
        <Sidebar />

        <div className={styles.rightPaneContainer}>
          <TeamProfileBanner teamId={teamId} />
          <TeamProfileBio teamId={teamId} />

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
                <TeamProfileOverviewLeft teamId={teamId} />
                <TeamProfileOverviewRight teamId={teamId} />
              </div>
            )}

            {activeTab === 'members' && (
              <div className={styles.membersContainer}>
                <TeamProfileMembers teamId={teamId} />
              </div>
            )}

            {activeTab === 'activity' && (
              <div className={styles.activityContainer}>
                <TeamProfileActivity teamId={teamId} />
              </div>
            )}

            {activeTab === 'stats' && (
              <div className={styles.statsContainer}>
                <TeamProfileGallery teamId={teamId} />
              </div>
            )}
          </div>

        </div>

      </main>

      <BottomMenu />

    </div>
  )
}

const TeamProfile = () => {
  return (
    <Suspense fallback={<p>Loading...</p>}>
      <TeamProfileContent />
    </Suspense>
  );
}

export default TeamProfile
