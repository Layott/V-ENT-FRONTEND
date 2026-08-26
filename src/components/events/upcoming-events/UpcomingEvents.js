import { imagePlaceholder, mediaIn, mediaUrl } from '@/lib/mediaUrl';
import Image from 'next/image'
import Link from 'next/link';
import { FiCalendar } from "react-icons/fi";
import { PiMoneyWavy } from "react-icons/pi";
import { RiCopperCoinFill } from "react-icons/ri";
import { GoDotFill } from "react-icons/go";
import newTournamentStyles from './../../tournaments/new-tournaments/new-tournaments.module.css'
import menuContentStyles from '@/styles/menu/menu-content.module.css'

const UpcomingEvents = ({ upcomingEvents = [] }) => {
  const baseUrl = `${process.env.NEXT_PUBLIC_API_URL}`;

  // Function to get the correct image URL - same as tournament implementation
  const getImageUrl = (imagePath) =>
    imagePath ? mediaIn(imagePath, '/media/event_banners') : imagePlaceholder('Event');

  // Format date for display
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  // Get event image with proper error handling - using same pattern as tournament
  const getEventImage = (event) => {
    // Use the banner field from API response with proper fallback
    return getImageUrl(event.banner);
  };

  return (
    <div className={newTournamentStyles.newTournamentsContainer}>
      <h3>Upcoming Events</h3>
      
      <div className={newTournamentStyles.cardsContainer}>
        {upcomingEvents.length > 0 ? (
          upcomingEvents.map((event) => {
            // Normalize the event ID - same as featured events
            const eventId = event.event_id || event.id;
            
            // Debug logging to track the event data being rendered
            console.log('UpcomingEvents - Rendering event:', {
              id: eventId,
              name: event.name,
              type: typeof eventId,
              fullEvent: event
            });

            return (
              <div key={eventId} className={newTournamentStyles.cardContainer}>
                <div className={`${newTournamentStyles.imageContainer} ${newTournamentStyles['newTournamentsContainer-display']}`}>
                  <Image
                    src={mediaUrl(getEventImage(event))}
                    alt={event.name || "Event"}
                    fill
                    style={{ objectFit: 'cover' }}
                    // Add fallback image using onError
                    onError={(e) => {
                      // Use a placeholder service that is guaranteed to work
                      e.target.src = "https://via.placeholder.com/400x200?text=Event";
                    }}
                    unoptimized={true} // Add this for external images
                  />
                </div>
        
                <div className={menuContentStyles.descriptionContainer}>
                  <div className={menuContentStyles.descriptionNameOrLocation}>
                    <p><span className={menuContentStyles.descriptionNameSpan}>{event.name}</span></p>
                  </div>
        
                  <div className={menuContentStyles.detailsContainer}>
                    <div className={menuContentStyles.eventOrParticipantTypeContainer}>
                      <p className={menuContentStyles.eventTypeParagraph}>
                        <span className={menuContentStyles.eventTypeSpan}>{event.event_type}</span>
                      </p>
                      {event.location && (
                        <>
                          <span className={menuContentStyles.dotSpan}>
                            <GoDotFill className={menuContentStyles.dotIcon} />
                          </span>
                          <span className={menuContentStyles.locationSpan}>{event.location}</span>
                        </>
                      )}
                    </div>
            
                    <p className={menuContentStyles.dateParagraph}>
                      <span className={menuContentStyles.calendarIconSpan}>
                        <FiCalendar className={menuContentStyles.calendarIcon} />
                      </span>
                      <span className={menuContentStyles.dateSpan}>{formatDate(event.event_date)}</span>
                    </p>
                      
                    <p className={menuContentStyles.feeParagraph}>
                      <span className={menuContentStyles.feeIconSpan}>
                        <PiMoneyWavy className={menuContentStyles.feeIcon} />
                      </span>
                      <span className={menuContentStyles.feeSpan}>
                        Fee: <span><RiCopperCoinFill className={menuContentStyles.coinIcon} /></span> {event.entry_fee}
                      </span>
                    </p>
                  </div>
                  
                  <div className={newTournamentStyles.buttonContainer}>
                    <Link 
                      href={`/events/${encodeURIComponent(eventId)}`} 
                      className={newTournamentStyles.viewDetailsBTN}
                      onClick={() => {
                        console.log('🔗 Navigating to event with ID:', eventId);
                        console.log('🔗 Full event data being passed:', event);
                        
                        // Store event data for debugging and consistency
                        if (typeof window !== 'undefined') {
                          sessionStorage.setItem('lastClickedEvent', JSON.stringify(event));
                          sessionStorage.setItem('lastClickedEventId', String(eventId));
                        }
                      }}
                    >
                      View Details
                    </Link>
                    <Link href={`/events/${eventId}?tab=tickets`} className={newTournamentStyles.registerBTN}>Register</Link>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className={newTournamentStyles.noEventsMessage}>No upcoming events available at the moment.</div>
        )}
      </div>
    </div>
  )
}

export default UpcomingEvents;