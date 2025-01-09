'use client'

import { useState } from 'react';
import Sidebar from '@/components/sidebar/Sidebar';
import Header from '@/components/header/Header';
import TournamentDetailsBanner from '@/components/view-tournament/tournament-details-banner/TournamentDetailsBanner';
import TournamentDetailsOverview from '@/components/view-tournament/tournament-details-overview/TournamentDetailsOverview';
import TournamentDetailsRules from '@/components/view-tournament/tournament-details-rules/TournamentDetailsRules';
import TournamentDetailsBracket from '@/components/view-tournament/tournament-details-bracket/TournamentDetailsBracket';
import TournamentDetailsParticipants from '@/components/view-tournament/tournament-details-participants/TournamentDetailsParticipants';
import TournamentDetailsPrize from '@/components/view-tournament/tournament-details-prize/TournamentDetailsPrize';
import styles from './view-tournament.module.css'

const ViewTournament = () => {
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
              className={`${styles.tabBTN} ${activeTab === 'rules' ? styles.activeTab : ''}`}
              onClick={() => setActiveTab('rules')}
            >
              Rules
            </button>

            <button
              className={`${styles.tabBTN} ${activeTab === 'bracket' ? styles.activeTab : ''}`}
              onClick={() => setActiveTab('bracket')}
            >
              Bracket
            </button>

            <button
              className={`${styles.tabBTN} ${activeTab === 'participants' ? styles.activeTab : ''}`}
              onClick={() => setActiveTab('participants')}
            >
              Participants
            </button>

            <button
              className={`${styles.tabBTN} ${activeTab === 'prize' ? styles.activeTab : ''}`}
              onClick={() => setActiveTab('prize')}
            >
              Prize
            </button>
          </div>

          <div className={styles.tournamentDetailsDashboard}>
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