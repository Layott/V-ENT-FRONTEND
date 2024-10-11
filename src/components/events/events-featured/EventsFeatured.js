import Image from 'next/image'
import Link from 'next/link'
import { FiCalendar } from "react-icons/fi";
import { LuBuilding2 } from "react-icons/lu";
import { FaArrowRight } from "react-icons/fa";
import { eventsFeaturedList } from './eventsFeaturedList'
import styles from './events-featured.module.css'

const EventsFeatured = () => {
  return (
    <div className={styles.tournamentsFeaturedContainer}>
        <h3>Featured</h3>

        <div className={styles.slidersContainer}>
            {eventsFeaturedList.map((tournamentFeatured, index) => (
            <div key={index} className={styles.sliderContainer}>
    
                <div className={styles.imageContainer}>
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
                                    <span className={styles.dateLogoSpan}><FiCalendar className={styles.calendarIcon} /></span>
                                    <span className={styles.date}>{tournamentFeatured.date}</span>
                                </p>
                            </div>
                    
                            <div className={styles.eventTypeContainer}>
                                <p className={styles.eventTypeParagraph}>
                                    <span className={styles.eventTypeIconSpan}><LuBuilding2 className={styles.buildingIcon} /> Event Type: </span>
                                    <span className={styles.eventType}>{tournamentFeatured.eventType}</span>
                                </p>
                            </div>
                        </div>
                    </div>
                        
                    <div className={styles.right}>
                        <Link href={tournamentFeatured.link} className={styles.viewDetailsLink}>
                            <span>View Details</span>
                            <span><FaArrowRight className={styles.rightArrowIcon} /></span>
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