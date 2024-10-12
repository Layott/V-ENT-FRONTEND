import Image from 'next/image'
import Link from 'next/link'
import { FiCalendar } from "react-icons/fi";
import { LuBuilding2 } from "react-icons/lu";
import { FaArrowRight } from "react-icons/fa";
import { eventsFeaturedList } from './eventsFeaturedList'
import menuContentStyles from '@/styles/menu/menu-content.module.css'
import styles from './events-featured.module.css'

const EventsFeatured = () => {
  return (
    <div className={styles.tournamentsFeaturedContainer}>
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
                
                <div className={styles.sliderDescriptionContainer}>
                    <div className={styles.left}>
                        <p><span className={styles.featuredName}>{tournamentFeatured.name}</span> - <span className={styles.featuredLocation}>{tournamentFeatured.location}</span></p>
                        <div className={styles.dateEventTypeContainer}>
                            <div className={styles.dateContainer}>
                                <p className={styles.dateParagraph}>
                                    <span className={styles.dateLogoSpan}><FiCalendar className={menuContentStyles.calendarIcon} /></span>
                                    <span className={menuContentStyles.date}>{tournamentFeatured.date}</span>
                                </p>
                            </div>
                    
                            <div className={styles.eventTypeContainer}>
                                <p className={styles.eventTypeParagraph}>
                                    <span className={menuContentStyles.eventTypeIconSpan}><LuBuilding2 className={menuContentStyles.buildingIcon} /> Event Type: </span>
                                    <span className={menuContentStyles.eventType}>{tournamentFeatured.eventType}</span>
                                </p>
                            </div>
                        </div>
                    </div>
                        
                    <div className={styles.right}>
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