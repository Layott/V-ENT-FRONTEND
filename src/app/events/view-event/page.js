'use client'

import { useState } from 'react';
import Sidebar from '@/components/sidebar/Sidebar';
import Header from '@/components/header/Header';
import MobileHeader from '@/components/mobile-header/MobileHeader';
import EventDetailsBanner from '@/components/view-event/event-details-banner/EventDetailsBanner';
import EventDetailsOverview from '@/components/view-event/event-details-overview/EventDetailsOverview';
import EventDetailsTournaments from '@/components/view-event/event-details-tournament/EventDetailsTournaments';
import EventDetailsBracket from '@/components/view-event/event-details-bracket/EventDetailsBracket';
import EventDetailsParticipants from '@/components/view-event/event-details-participants/EventDetailsParticipants';
import EventDetailsPrize from '@/components/view-event/event-details-prize/EventDetailsPrize';
import styles from './view-event.module.css'

const ViewEvent = () => {
  const [activeTab, setActiveTab] = useState('overview')

  return (
    <div className={styles.pageContainer}>
      <Header />
      <MobileHeader />
      
      <main className={styles.mainContainer}>
        <Sidebar />
      
        <div className={styles.rightPaneContainer}>
          <EventDetailsBanner />

          <div className={styles.buttonContainer}>
            <button
              className={`${styles.tabBTN} ${activeTab === 'overview' ? styles.activeTab : ''}`}
              onClick={() => setActiveTab('overview')}
            >
              Overview
            </button>

            <button
              className={`${styles.tabBTN} ${activeTab === 'tournaments' ? styles.activeTab : ''}`}
              onClick={() => setActiveTab('tournaments')}
            >
              Tournaments
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
                <EventDetailsOverview />
              </div>            
            )}

            {activeTab === 'tournaments' && (
              <div className={styles.rulesContainer}>
                <EventDetailsTournaments />
              </div>
            )}

            {activeTab === 'bracket' && (
              <div className={styles.bracketContainer}>
                <EventDetailsBracket />
              </div>
            )}

            {activeTab === 'participants' && (
              <div className={styles.participantsContainer}>
                <EventDetailsParticipants />
              </div>
            )}

            {activeTab === 'prize' && (
              <div className={styles.prizeContainer}>
                <EventDetailsPrize />
              </div>
            )}       
          </div>
      
        </div>
      </main>
    </div>
  )
}

export default ViewEvent