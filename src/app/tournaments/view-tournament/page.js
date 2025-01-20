'use client'

import { useState } from 'react';
import Sidebar from '@/components/sidebar/Sidebar';
import Header from '@/components/header/Header';
import MobileHeader from '@/components/mobile-header/MobileHeader';
import TournamentDetailsBanner from '@/components/view-tournament/tournament-details-banner/TournamentDetailsBanner';
import TournamentDetailsOverview from '@/components/view-tournament/tournament-details-overview/TournamentDetailsOverview';
import TournamentDetailsRules from '@/components/view-tournament/tournament-details-rules/TournamentDetailsRules';
import TournamentDetailsBracket from '@/components/view-tournament/tournament-details-bracket/TournamentDetailsBracket';
import TournamentDetailsParticipants from '@/components/view-tournament/tournament-details-participants/TournamentDetailsParticipants';
import TournamentDetailsPrize from '@/components/view-tournament/tournament-details-prize/TournamentDetailsPrize';
import tabStyles from '@/styles/modules/tabs/tabs.module.css';
import styles from './view-tournament.module.css'

const ViewTournament = () => {
  const [activeTab, setActiveTab] = useState('overview')

  return (
    <div className={styles.pageContainer}>
      <Header />
      <MobileHeader />
      
      <main className={styles.mainContainer}>
        <Sidebar />
      
        <div className={styles.rightPaneContainer}>
          <TournamentDetailsBanner />

          <div className={tabStyles.buttonContainer}>
            <button
              className={`${tabStyles.tabBTN} ${activeTab === 'overview' ? tabStyles.activeTab : ''}`}
              onClick={() => setActiveTab('overview')}
            >
              Overview
            </button>

            <button
              className={`${tabStyles.tabBTN} ${activeTab === 'rules' ? tabStyles.activeTab : ''}`}
              onClick={() => setActiveTab('rules')}
            >
              Rules
            </button>

            <button
              className={`${tabStyles.tabBTN} ${activeTab === 'bracket' ? tabStyles.activeTab : ''}`}
              onClick={() => setActiveTab('bracket')}
            >
              Bracket
            </button>

            <button
              className={`${tabStyles.tabBTN} ${activeTab === 'participants' ? tabStyles.activeTab : ''}`}
              onClick={() => setActiveTab('participants')}
            >
              Participants
            </button>

            <button
              className={`${tabStyles.tabBTN} ${activeTab === 'prize' ? tabStyles.activeTab : ''}`}
              onClick={() => setActiveTab('prize')}
            >
              Prize
            </button>
          </div>

          <div className={tabStyles.detailsDashboard}>
            {activeTab === 'overview' && (
              <div className={styles.overviewContainer}>
                <TournamentDetailsOverview />
              </div>            
            )}

            {activeTab === 'rules' && (
              <div className={styles.rulesContainer}>
                <TournamentDetailsRules />
              </div>
            )}

            {activeTab === 'bracket' && (
              <div className={styles.bracketContainer}>
                <TournamentDetailsBracket />
              </div>
            )}

            {activeTab === 'participants' && (
              <div className={styles.participantsContainer}>
                <TournamentDetailsParticipants />
              </div>
            )}

            {activeTab === 'prize' && (
              <div className={styles.prizeContainer}>
                <TournamentDetailsPrize />
              </div>
            )}       
          </div>
      
        </div>
      </main>
    </div>
  )
}

export default ViewTournament