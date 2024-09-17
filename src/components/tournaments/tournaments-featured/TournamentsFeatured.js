import Image from 'next/image'
import Link from 'next/link'
import { FiCalendar } from "react-icons/fi";
import { GrTrophy } from "react-icons/gr";
import { FaArrowRight } from "react-icons/fa";
import { tournamentsFeaturedList } from './tournamentsFeaturedList'
import styles from './tournaments-featured.module.css'

const TournamentsFeatured = () => {
  return (
    <div className={styles.tournamentsFeaturedContainer}>
        <h3>Featured</h3>

        <div className={styles.slidersContainer}>
            {tournamentsFeaturedList.map((tournamentFeatured, index) => (
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
                        <div className={styles.datePriceContainer}>
                            <div className={styles.dateContainer}>
                                <p className={styles.dateParagraph}>
                                    <span className={styles.dateLogoSpan}><FiCalendar className={styles.calendarLogo} /></span>
                                    <span className={styles.date}>{tournamentFeatured.date}</span>
                                </p>
                            </div>
                    
                            <div className={styles.priceContainer}>
                                <p className={styles.priceParagraph}>
                                    <span className={styles.priceLogoSpan}><GrTrophy className={styles.trophyLogo} /></span>
                                    <span className={styles.price}>{tournamentFeatured.price}</span>
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

export default TournamentsFeatured