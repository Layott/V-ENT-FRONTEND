'use client'

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Sidebar from '@/components/sidebar/Sidebar';
import Header from '@/components/header/Header';
import MobileHeader from '@/components/mobile-header/MobileHeader';
import BottomMenu from '@/components/bottom-menu/BottomMenu';
import EventDetailsBanner from '@/components/view-event/event-details-banner/EventDetailsBanner';
import EventDetailsOverview from '@/components/view-event/event-details-overview/EventDetailsOverview';
import EventDetailsTournaments from '@/components/view-event/event-details-tournament/EventDetailsTournaments';
import EventDetailsBracket from '@/components/view-event/event-details-bracket/EventDetailsBracket';
import EventDetailsParticipants from '@/components/view-event/event-details-participants/EventDetailsParticipants';
import EventDetailsPrize from '@/components/view-event/event-details-prize/EventDetailsPrize';
import tabStyles from '@/styles/modules/tabs/tabs.module.css';
import styles from './view-event.module.css'

// Separate component for the main content to handle search params
const ViewEventContent = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mounted, setMounted] = useState(false);
  
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const { data: session } = useSession();

  // Handle client-side mounting
  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchEvent = useCallback(async () => {
    if (!id) {
      setError('Event ID not found');
      setLoading(false);
      return;
    }

    console.log('Event ID from URL:', id);
    
    try {
      // First, try the direct event endpoint (following tournament pattern)
      const directEndpoint = `https://vermillionent.pythonanywhere.com/event/view-event/${id}`;
      console.log('Trying direct endpoint:', directEndpoint);
      
      const response = await fetch(directEndpoint, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.user?.sessionToken && {
            'Authorization': `Bearer ${session.user.sessionToken}`
          })
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Direct endpoint response:', data);
        
        // Check if the API response has the expected structure (similar to tournament)
        if (data.status === 'success' && data.data) {
          console.log('Found event via direct endpoint:', data.data);
          setEvent(data.data);
          // Cache the event data
          localStorage.setItem(`event_${id}`, JSON.stringify(data.data));
          setLoading(false);
          return;
        } else if (data.event_id || data.id) {
          // Handle case where event data is directly in response
          console.log('Found event data directly in response:', data);
          setEvent(data);
          // Cache the event data
          localStorage.setItem(`event_${id}`, JSON.stringify(data));
          setLoading(false);
          return;
        }
      }

      // Fallback: Try the get-all-events endpoint (your original working approach)
      console.log('Direct endpoint failed, trying get-all-events endpoint...');
      
      const allEventsEndpoint = `https://vermillionent.pythonanywhere.com/event/get-all-events/`;
      const allEventsResponse = await fetch(allEventsEndpoint, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.user?.sessionToken && {
            'Authorization': `Bearer ${session.user.sessionToken}`
          })
        }
      });

      if (allEventsResponse.ok) {
        const allEventsData = await allEventsResponse.json();
        console.log('Get-all-events response:', allEventsData);
        
        // Find the specific event in the response
        const eventData = findEventInResponse(allEventsData, id);
        
        if (eventData) {
          console.log('Found event in get-all-events:', eventData);
          setEvent(eventData);
          // Cache the event data
          localStorage.setItem(`event_${id}`, JSON.stringify(eventData));
          setLoading(false);
          return;
        }
      }

      throw new Error(`Event with ID "${id}" not found. Please check if the event exists.`);
      
    } catch (err) {
      console.error('Error fetching event:', err);
      setError(err.message);
      setLoading(false);
    }
  }, [id, session]);

  // FIXED: Helper function to find event in get-all-events response
  const findEventInResponse = useCallback((data, eventId) => {
    console.log('Looking for event ID:', eventId);
    console.log('Response structure:', data);
    
    // Handle the structure from your working EventsComponent
    if (data.data) {
      // Check featured events
      if (data.data.featured && Array.isArray(data.data.featured)) {
        const found = data.data.featured.find(event => 
          String(event.event_id) === String(eventId) || 
          String(event.id) === String(eventId)
        );
        if (found) {
          console.log('Found in featured events:', found);
          return found;
        }
      }
      
      // Check upcoming events
      if (data.data.upcoming && Array.isArray(data.data.upcoming)) {
        const found = data.data.upcoming.find(event => 
          String(event.event_id) === String(eventId) || 
          String(event.id) === String(eventId)
        );
        if (found) {
          console.log('Found in upcoming events:', found);
          return found;
        }
      }
      
      // FIXED: Check by_game events (this was missing)
      if (data.data.by_game && typeof data.data.by_game === 'object') {
        // Loop through all game categories (Free Fire, FIFA, PUBG, etc.)
        for (const gameName in data.data.by_game) {
          const gameEvents = data.data.by_game[gameName];
          if (Array.isArray(gameEvents)) {
            const found = gameEvents.find(event => 
              String(event.event_id) === String(eventId) || 
              String(event.id) === String(eventId)
            );
            if (found) {
              console.log(`Found in ${gameName} events:`, found);
              return found;
            }
          }
        }
      }
      
      // Check if there's an 'all' events array
      if (data.data.all && Array.isArray(data.data.all)) {
        const found = data.data.all.find(event => 
          String(event.event_id) === String(eventId) || 
          String(event.id) === String(eventId)
        );
        if (found) {
          console.log('Found in all events:', found);
          return found;
        }
      }
      
      // If data.data is directly an array
      if (Array.isArray(data.data)) {
        const found = data.data.find(event => 
          String(event.event_id) === String(eventId) || 
          String(event.id) === String(eventId)
        );
        if (found) {
          console.log('Found in data array:', found);
          return found;
        }
      }
    }
    
    // If the response is directly an array
    if (Array.isArray(data)) {
      const found = data.find(event => 
        String(event.event_id) === String(eventId) || 
        String(event.id) === String(eventId)
      );
      if (found) {
        console.log('Found in root array:', found);
        return found;
      }
    }
    
    return null;
  }, []);

  useEffect(() => {
    if (mounted && id) {
      // First, try to load from localStorage
      try {
        const cachedEvent = localStorage.getItem(`event_${id}`);
        if (cachedEvent) {
          const parsedEvent = JSON.parse(cachedEvent);
          console.log('Loaded event from cache:', parsedEvent);
          setEvent(parsedEvent);
          setLoading(false);
          return;
        }
      } catch (error) {
        console.error('Error loading cached event:', error);
      }
      
      // If no cached data, fetch from API
      fetchEvent();
    }
  }, [mounted, id, fetchEvent]);

  // Save activeTab to localStorage
  useEffect(() => {
    if (mounted && id) {
      localStorage.setItem(`event_${id}_activeTab`, activeTab);
    }
  }, [activeTab, id, mounted]);

  // Restore activeTab from localStorage
  useEffect(() => {
    if (mounted && id) {
      try {
        const savedTab = localStorage.getItem(`event_${id}_activeTab`);
        if (savedTab) {
          setActiveTab(savedTab);
        }
      } catch (error) {
        console.error('Error loading saved tab:', error);
      }
    }
  }, [mounted, id]);

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
        <p>Loading event details...</p>
      </div>
    );
  }

  if (error) {
    return renderPageLayout(
      <div className={styles.errorContainer}>
        <h3>Error Loading Event</h3>
        <p style={{ color: 'red', marginBottom: '1rem' }}>{error}</p>
        

        <div style={{ marginTop: '1rem' }}>
          <button 
            onClick={fetchEvent} 
            style={{ 
              marginRight: '1rem',
              padding: '0.5rem 1rem',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Retry
          </button>
          <button 
            onClick={() => window.history.back()}
            style={{ 
              padding: '0.5rem 1rem',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!event) {
    return renderPageLayout(
      <div className={styles.errorContainer}>
        <h3>Event Not Found</h3>
        <p>The requested event could not be found.</p>
        <button onClick={() => window.history.back()}>Go Back</button>
      </div>
    );
  }

  // Debug: Log event data before rendering
  console.log('Rendering event:', event);

  return (
    <div className={styles.pageContainer}>
      <Header />
      <MobileHeader />
      
      <main className={styles.mainContainer}>
        <Sidebar />
      
        <div className={styles.rightPaneContainer}>
          <EventDetailsBanner event={event} />

          <div className={tabStyles.buttonContainer}>
            <button
              className={`${tabStyles.tabBTN} ${activeTab === 'overview' ? tabStyles.activeTab : ''}`}
              onClick={() => setActiveTab('overview')}
            >
              Overview
            </button>

            <button
              className={`${tabStyles.tabBTN} ${activeTab === 'tournaments' ? tabStyles.activeTab : ''}`}
              onClick={() => setActiveTab('tournaments')}
            >
              Tournaments
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
                <EventDetailsOverview event={event} />
              </div>            
            )}

            {activeTab === 'tournaments' && (
              <div className={styles.tournamentsContainer}>
                <EventDetailsTournaments event={event} />
              </div>
            )}

            {activeTab === 'bracket' && (
              <div className={styles.bracketContainer}>
                <EventDetailsBracket event={event} />
              </div>
            )}

            {activeTab === 'participants' && (
              <div className={styles.participantsContainer}>
                <EventDetailsParticipants event={event} />
              </div>
            )}

            {activeTab === 'prize' && (
              <div className={styles.prizeContainer}>
                <EventDetailsPrize event={event} />
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
const ViewEvent = () => {
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
      <ViewEventContent />
    </Suspense>
  );
}

export default ViewEvent;