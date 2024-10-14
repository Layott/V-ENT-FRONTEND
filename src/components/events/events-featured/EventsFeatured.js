import Image from 'next/image'
import Link from 'next/link'
import { FiCalendar } from "react-icons/fi";
import { LuBuilding2 } from "react-icons/lu";
import { FaArrowRight } from "react-icons/fa";
import { eventsFeaturedList } from './eventsFeaturedList'
import menuContentStyles from '@/styles/menu/menu-content.module.css'

const EventsFeatured = () => {
  return (
    <div className={menuContentStyles.tournamentsFeaturedContainer}>
        <h3>Featured</h3>

        <div className={menuContentStyles.slidersContainer}>
            {eventsFeaturedList.map((tournamentFeatured, index) => (
            <div key={index} className={menuContentStyles.sliderContainer}>
    
                <div className={menuContentStyles.imageContainer}>
                    <Image
                        src={tournamentFeatured.image}
                        alt={tournamentFeatured.alt}
                    />
                </div>
                
                <div className={menuContentStyles.sliderDescriptionContainer}>
                    <div className={menuContentStyles.left}>
                        <p><span className={menuContentStyles.featuredName}>{tournamentFeatured.name}</span> - <span className={menuContentStyles.featuredLocation}>{tournamentFeatured.location}</span></p>
                        <div className={menuContentStyles.dateEventTypeContainer}>
                            <div className={menuContentStyles.dateContainer}>
                                <p className={menuContentStyles.dateParagraph}>
                                    <span className={menuContentStyles.dateIconSpan}><FiCalendar className={menuContentStyles.calendarIcon} /></span>
                                    <span className={menuContentStyles.dateSpan}>{tournamentFeatured.date}</span>
                                </p>
                            </div>
                    
                            <div className={menuContentStyles.eventTypeContainer}>
                                <p className={menuContentStyles.eventTypeParagraph}>
                                    <span className={menuContentStyles.eventTypeIconSpan}><LuBuilding2 className={menuContentStyles.buildingIcon} /> Event Type: </span>
                                    <span className={menuContentStyles.eventType}>{tournamentFeatured.eventType}</span>
                                </p>
                            </div>
                        </div>
                    </div>
                        
                    <div>
                        <Link href={tournamentFeatured.link} className={menuContentStyles.viewDetailsLink}>
                            <span className={menuContentStyles.viewDetails}>View Details</span>
                            <span><FaArrowRight className={menuContentStyles.rightArrowIcon} /></span>
                        </Link>
                    </div>

                </div>

            </div>
            ))}
            
        </div>

    </div>
  )
}

export default EventsFeatured