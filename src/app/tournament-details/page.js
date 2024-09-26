'use client'

import { useState } from 'react';
import Sidebar from '@/components/sidebar/Sidebar';
import Header from '@/components/header/Header';
import TournamentDetailsBanner from '@/components/tournament-details/tournament-details-banner/TournamentDetailsBanner';
import TournamentDetailsOverview from '@/components/tournament-details/tournament-details-overview/TournamentDetailsOverview';
import TournamentDetailsRules from '@/components/tournament-details/tournament-details-rules/TournamentDetailsRules';
import TournamentDetailsBracket from '@/components/tournament-details/tournament-details-bracket/TournamentDetailsBracket';
import TournamentDetailsParticipants from '@/components/tournament-details/tournament-details-participants/TournamentDetailsParticipants';
import TournamentDetailsPrize from '@/components/tournament-details/tournament-details-prize/TournamentDetailsPrize';

import styles from './tournament-details.module.css'

const TournamentDetails = () => {
  const [activeTab, setActiveTab] = useState('rules')

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

export default TournamentDetails