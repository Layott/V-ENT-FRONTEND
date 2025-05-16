import Image from 'next/image'
import Link from 'next/link'
import { FiCalendar } from "react-icons/fi";
import { LuBuilding2 } from "react-icons/lu";
import { FaArrowRight } from "react-icons/fa";
import menuContentStyles from '@/styles/menu/menu-content.module.css'

const EventsFeatured = ({ featuredEvents = [] }) => {
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
    
    // For default image, use a placeholder service that's guaranteed to work
    return "https://via.placeholder.com/400x200?text=Featured+Event";
  };

  return (
    <div className={menuContentStyles.tournamentsFeaturedContainer}>
      <h3>Featured</h3>

      <div className={menuContentStyles.slidersContainer}>
        {featuredEvents.length > 0 ? (
          featuredEvents.map((event, index) => (
            <div key={event.event_id} className={menuContentStyles.sliderContainer}>
              <div className={menuContentStyles.imageContainer}>
                <Image
                  src={getEventImage(event)}
                  alt={event.name || "Featured Event"}
                  width={400}
                  height={200}
                  style={{ width: 'auto', height: 'auto' }}
                  priority={index === 0} // Add priority to the first image (potential LCP)
                  // Add fallback image using onError
                  onError={(e) => {
                    e.target.src = "https://via.placeholder.com/400x200?text=Featured+Event";
                  }}
                  unoptimized={true} // Add this for external images
                />
              </div>
              
              <div className={menuContentStyles.sliderDescriptionContainer}>
                <div className={menuContentStyles.left}>
                  <p>
                    <span className={menuContentStyles.featuredName}>{event.name}</span> 
                    {event.location && (
                      <>
                        - <span className={menuContentStyles.featuredLocation}>{event.location}</span>
                      </>
                    )}
                  </p>
                  <div className={menuContentStyles.dateEventTypeContainer}>
                    <div className={menuContentStyles.dateContainer}>
                      <p className={menuContentStyles.dateParagraph}>
                        <span className={menuContentStyles.dateIconSpan}>
                          <FiCalendar className={menuContentStyles.calendarIcon} />
                        </span>
                        <span className={menuContentStyles.dateSpan}>{formatDate(event.event_date)}</span>
                      </p>
                    </div>
                
                    <div className={menuContentStyles.eventTypeContainer}>
                      <p className={menuContentStyles.eventTypeParagraph}>
                        <span className={menuContentStyles.eventTypeIconSpan}>
                          <LuBuilding2 className={menuContentStyles.buildingIcon} /> Event Type: 
                        </span>
                        <span className={menuContentStyles.eventType}>{event.event_type}</span>
                      </p>
                    </div>
                  </div>
                </div>
                    
                <div>
                  <Link href={`/events/view-event/${event.event_id}`} className={menuContentStyles.viewDetailsLink}>
                    <span className={menuContentStyles.viewDetails}>View Details</span>
                    <span><FaArrowRight className={menuContentStyles.rightArrowIcon} /></span>
                  </Link>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className={menuContentStyles.noEventsMessage}>No featured events available at the moment.</div>
        )}
      </div>
    </div>
  )
}

export default EventsFeatured;