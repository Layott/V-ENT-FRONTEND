import Image from 'next/image'
import Link from 'next/link';
import { FiCalendar } from "react-icons/fi";
import { PiMoneyWavy } from "react-icons/pi";
import { RiCopperCoinFill } from "react-icons/ri";
import { GoDotFill } from "react-icons/go";
import newTournamentStyles from './../../tournaments/new-tournaments/new-tournaments.module.css'
import menuContentStyles from '@/styles/menu/menu-content.module.css'
// Import your default event image - make sure this path is correct

const UpcomingEvents = ({ upcomingEvents = [] }) => {
  // Format date for display
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  // Get event image with proper error handling
  const getEventImage = (event) => {
    // Define base URL for absolute path resolution
    const baseUrl = "https://vermillionent.pythonanywhere.com";
    
    // Convert relative URLs to absolute URLs
    const getAbsoluteUrl = (url) => {
      if (!url) return null;
      return url.startsWith("http")
        ? url
        : `${baseUrl}${url.startsWith("/") ? "" : "/"}${url}`;
    };
    
    // Use absolute URL for banner if it exists and isn't "null"
    if (event.banner && event.banner !== "null") {
      return getAbsoluteUrl(event.banner);
    }
    
    // For default image, use a statically imported image (best practice)
    // or an absolute URL within your domain
    return "https://via.placeholder.com/400x200?text=Event";
  };

  return (
    <div className={newTournamentStyles.newTournamentsContainer}>
      <h3>Upcoming Events</h3>
      
      <div className={newTournamentStyles.cardsContainer}>
        {upcomingEvents.length > 0 ? (
          upcomingEvents.map((event) => (
            <div key={event.event_id} className={newTournamentStyles.cardContainer}>
              <div className={newTournamentStyles.imageContainer}>
                <Image
                  src={getEventImage(event)}
                  alt={event.name || "Event"}
                  width={400}
                  height={200}
                  style={{ width: 'auto', height: 'auto' }}
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
                  <Link href={`/events/view-event/${event.event_id}`} className={newTournamentStyles.viewDetailsBTN}>View Details</Link>
                  <Link href={`/events/register-event/${event.event_id}`} className={newTournamentStyles.registerBTN}>Register</Link>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className={newTournamentStyles.noEventsMessage}>No upcoming events available at the moment.</div>
        )}
      </div>
    </div>
  )
}

export default UpcomingEvents;