'use client'

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Sidebar from '@/components/sidebar/Sidebar';
import Header from '@/components/header/Header';
import MobileHeader from '@/components/mobile-header/MobileHeader';
import BottomMenu from '@/components/bottom-menu/BottomMenu';
import TournamentDetailsBanner from '@/components/view-tournament/tournament-details-banner/TournamentDetailsBanner';
import TournamentDetailsOverview from '@/components/view-tournament/tournament-details-overview/TournamentDetailsOverview';
import TournamentDetailsRules from '@/components/view-tournament/tournament-details-rules/TournamentDetailsRules';
import TournamentDetailsBracket from '@/components/view-tournament/tournament-details-bracket/TournamentDetailsBracket';
import TournamentDetailsParticipants from '@/components/view-tournament/tournament-details-participants/TournamentDetailsParticipants';
import TournamentDetailsPrize from '@/components/view-tournament/tournament-details-prize/TournamentDetailsPrize';
import tabStyles from '@/styles/modules/tabs/tabs.module.css';
import styles from './view-tournament.module.css'

// Separate component for the main content to handle search params
const ViewTournamentContent = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [tournament, setTournament] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mounted, setMounted] = useState(false);
  
  const searchParams = useSearchParams();
  const id = searchParams.get('id');

  // Handle client-side mounting
  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchTournament = useCallback(async () => {
    if (!id) {
      setError('Tournament ID not found');
      setLoading(false);
      return;
    }

    console.log('Tournament ID from URL:', id);
    
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/tournament/get-all-tournaments/`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch tournaments: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Full API Response:', data);
      
      // Find the specific tournament by ID from the by_game data
      let foundTournament = null;
      
      // Check if data has the expected structure
      if (data.status === 'success' && data.data && data.data.by_game) {
        console.log('Available tournament IDs:', 
          Object.values(data.data.by_game)
            .flat()
            .map(t => ({ id: t.tournament_id, title: t.tournament_title }))
        );
        
        // Search through all games
        Object.values(data.data.by_game).forEach(gameArray => {
          const tournament = gameArray.find(t => 
            t.tournament_id === parseInt(id) || t.tournament_id === id
          );
          if (tournament) {
            foundTournament = tournament;
          }
        });
      } else {
        console.error('Unexpected API response structure:', data);
        throw new Error('Invalid API response structure');
      }
      
      if (!foundTournament) {
        throw new Error(`Tournament with ID ${id} not found`);
      }
      
      console.log('Found tournament:', foundTournament);
      setTournament(foundTournament);
      setLoading(false);
    } catch (err) {
      console.error('Detailed error:', err);
      setError(err.message);
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (mounted && id) {
      fetchTournament();
    }
  }, [mounted, id, fetchTournament]);

  // Render loading state
  const renderPageLayout = (content) => (
    <div className={styles.pageContainer}>
      <Header />
      <MobileHeader />
      <main className={styles.mainContainer}>
        <Sidebar />
        <div className={styles.rightPaneContainer}>
          {content}
        </div>
      </main>
      <BottomMenu />
    </div>
  );

  // Show loading until component is mounted on client
  if (!mounted) {
    return renderPageLayout(
      <div className={styles.loadingContainer}>
        <p>Loading...</p>
      </div>
    );
  }

  if (loading) {
    return renderPageLayout(
      <div className={styles.loadingContainer}>
        <p>Loading tournament details...</p>
      </div>
    );
  }

  if (error) {
    return renderPageLayout(
      <div className={styles.errorContainer}>
        <p>Error: {error}</p>
        <button onClick={() => window.history.back()}>Go Back</button>
      </div>
    );
  }

  if (!tournament) {
    return renderPageLayout(
      <div className={styles.errorContainer}>
        <p>Tournament not found</p>
        <button onClick={() => window.history.back()}>Go Back</button>
      </div>
    );
  }

  return (
    <div className={styles.pageContainer}>
      <Header />
      <MobileHeader />
      
      <main className={styles.mainContainer}>
        <Sidebar />
      
        <div className={styles.rightPaneContainer}>
          <TournamentDetailsBanner tournament={tournament} />

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
                <TournamentDetailsOverview tournament={tournament} />
              </div>            
            )}

            {activeTab === 'rules' && (
              <div className={styles.rulesContainer}>
                <TournamentDetailsRules tournament={tournament} />
              </div>
            )}

            {activeTab === 'bracket' && (
              <div className={styles.bracketContainer}>
                <TournamentDetailsBracket tournament={tournament} />
              </div>
            )}

            {activeTab === 'participants' && (
              <div className={styles.participantsContainer}>
                <TournamentDetailsParticipants tournament={tournament} />
              </div>
            )}

            {activeTab === 'prize' && (
              <div className={styles.prizeContainer}>
                <TournamentDetailsPrize tournament={tournament} />
              </div>
            )}       
          </div>
        </div>
      </main>

      <BottomMenu />
    </div>
  )
}

// Main component wrapped with Suspense
const ViewTournament = () => {
  return (
    <Suspense fallback={
      <div className={styles.pageContainer}>
        <Header />
        <MobileHeader />
        <main className={styles.mainContainer}>
          <Sidebar />
          <div className={styles.rightPaneContainer}>
            <div className={styles.loadingContainer}>
              <p>Loading...</p>
            </div>
          </div>
        </main>
        <BottomMenu />
      </div>
    }>
      <ViewTournamentContent />
    </Suspense>
  );
}

export default ViewTournament;