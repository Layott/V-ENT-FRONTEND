import Image from 'next/image'
import Link from 'next/link'
import { FiCalendar } from "react-icons/fi";
import { LuBuilding2 } from "react-icons/lu";
import { FaArrowRight } from "react-icons/fa";
import menuContentStyles from '@/styles/menu/menu-content.module.css'

const EventsFeatured = ({ featuredEvents = [] }) => {
  const baseUrl = `${process.env.NEXT_PUBLIC_API_URL}`;

  // Function to get the correct image URL - same as tournament implementation
  const getImageUrl = (imagePath) => {
    if (!imagePath) return "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='180'%3E%3Crect width='100%25' height='100%25' fill='%23f3f4f6'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%23666'%3EEvent%3C/text%3E%3C/svg%3E";
    
    // If it's already a full URL, return as is
    if (imagePath.startsWith('http')) return imagePath;
    
    // If it starts with /media, prepend your backend URL
    if (imagePath.startsWith('/media')) {
      return `${baseUrl}${imagePath}`;
    }
    
    // If it's just a filename, construct the full path
    return `${baseUrl}/media/event_banners/${imagePath}`;
  };

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
    <div className={menuContentStyles.tournamentsFeaturedContainer}>
      <h3>Featured</h3>

      <div className={menuContentStyles.slidersContainer}>
        {featuredEvents.length > 0 ? (
          featuredEvents.map((event, index) => (
            <div key={event.event_id} className={menuContentStyles.sliderContainer}>
              <div className={`${menuContentStyles.imageContainer} ${menuContentStyles['eventFeatureContainerDisplay']}`}
>
                <Image
                  src={getEventImage(event)}
                  alt={event.name || "Featured Event"}
                  fill
                  style={{ objectFit: 'cover' }}
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