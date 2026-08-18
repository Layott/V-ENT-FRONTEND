import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { GoDotFill } from "react-icons/go";
import styles from './event-details-prize.module.css'

// Helper function for ordinal suffixes
const getOrdinalSuffix = (num) => {
  const j = num % 10,
        k = num % 100;
  if (j == 1 && k != 11) {
    return num + "st";
  }
  if (j == 2 && k != 12) {
    return num + "nd";
  }
  if (j == 3 && k != 13) {
    return num + "rd";
  }
  return num + "th";
};

// Helper function to extract prize information from event object
const extractPrizeFromEvent = (eventData) => {
  const prizes = [];
  
  // Check various possible prize fields in event data
  if (eventData.prize_pool || eventData.prizePool) {
    const totalPrize = eventData.prize_pool || eventData.prizePool;
    
    // If there's prize distribution data
    if (eventData.prize_distribution || eventData.prizeDistribution) {
      const distribution = eventData.prize_distribution || eventData.prizeDistribution;
      
      if (Array.isArray(distribution)) {
        return distribution.map((prize, index) => ({
          position: prize.position || `${index + 1}${getOrdinalSuffix(index + 1)}`,
          prize: prize.amount || prize.prize || '',
          bonus: prize.bonus || prize.bonuses || 'None'
        }));
      }
    }
    
    // Default prize structure if no specific distribution
    prizes.push({
      position: '1st',
      prize: totalPrize,
      bonus: eventData.bonus || 'None'
    });
  }
  
  // Check if event has individual prize fields
  if (eventData.first_prize || eventData.second_prize || eventData.third_prize) {
    if (eventData.first_prize) {
      prizes.push({
        position: '1st',
        prize: eventData.first_prize,
        bonus: eventData.first_bonus || 'None'
      });
    }
    if (eventData.second_prize) {
      prizes.push({
        position: '2nd',
        prize: eventData.second_prize,
        bonus: eventData.second_bonus || 'None'
      });
    }
    if (eventData.third_prize) {
      prizes.push({
        position: '3rd',
        prize: eventData.third_prize,
        bonus: eventData.third_bonus || 'None'
      });
    }
  }
  
  return prizes;
};

const EventDetailsPrize = ({ event }) => {
  const [prizeData, setPrizeData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { data: session } = useSession();

  useEffect(() => {
    const fetchPrizeData = async () => {
      if (!event?.event_id && !event?.id) {
        setError('Event ID not found');
        setLoading(false);
        return;
      }

      const eventId = event.event_id || event.id;

      try {
        // Try to fetch prize data from the backend
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/event/prizes/${eventId}`, {
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
          
          // Handle different response structures
          if (data.status === 'success' && data.data) {
            setPrizeData(Array.isArray(data.data) ? data.data : []);
          } else if (Array.isArray(data)) {
            setPrizeData(data);
          } else if (data.prizes && Array.isArray(data.prizes)) {
            setPrizeData(data.prizes);
          } else {
            // If no specific prize endpoint, check if prize info is in the event object
            const eventPrizes = extractPrizeFromEvent(event);
            setPrizeData(eventPrizes);
          }
        } else {
          // Fallback: extract prize information from event object
          const eventPrizes = extractPrizeFromEvent(event);
          setPrizeData(eventPrizes);
        }
      } catch (err) {
        console.error('Error fetching prize data:', err);
        // Fallback: extract prize information from event object
        const eventPrizes = extractPrizeFromEvent(event);
        setPrizeData(eventPrizes);
      } finally {
        setLoading(false);
      }
    };

    fetchPrizeData();
  }, [event, session]);

  // Format date helper
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    } catch (error) {
      return dateString;
    }
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <p>Loading prize information...</p>
      </div>
    );
  }

  return (
    <div>
      <div>
        <h3>Price Distribution</h3>
        
        {prizeData.length > 0 ? (
          <>
            {/* Desktop Table */}
            <div className={styles.desktopTable}>
              <table>
                <thead>
                  <tr>
                    <th>Position</th>
                    <th>Prize</th>
                    <th>Bonuses</th>
                  </tr>
                </thead>
                <tbody>
                  {prizeData.map((prizeItem, index) => (
                    <tr key={index}>
                      <td>{prizeItem.position}</td>
                      <td>{prizeItem.prize}</td>
                      <td>{prizeItem.bonus}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className={styles.mobileCards}>
              {prizeData.map((prizeItem, index) => (
                <div key={index} className={styles.mobileCard}>
                  <div className={styles.cardRow}>
                    <div className={styles.cardLabel}>Position</div>
                    <div className={styles.cardValue}>{prizeItem.position}</div>
                  </div>
                  <div className={styles.cardRow}>
                    <div className={styles.cardLabel}>Prize</div>
                    <div className={styles.cardValue}>{prizeItem.prize}</div>
                  </div>
                  <div className={styles.cardRow}>
                    <div className={styles.cardLabel}>Bonuses</div>
                    <div className={styles.cardValue}>{prizeItem.bonus}</div>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className={styles.noPrizeData}>
            <p>No prize information available for this event.</p>
          </div>
        )}

        {/* Event Metadata */}
        <div className={styles.eventMetadata}>
          <div className={styles.metadataItem}>
            <GoDotFill />
            <span>Created: {formatDate(event.created_at || event.createdAt)}</span>
          </div>
          <div className={styles.metadataItem}>
            <GoDotFill />
            <span>Last Updated: {formatDate(event.updated_at || event.updatedAt)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventDetailsPrize;