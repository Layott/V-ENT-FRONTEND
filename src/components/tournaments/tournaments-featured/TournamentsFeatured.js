import Image from 'next/image'
import Link from 'next/link'
import { FiCalendar } from "react-icons/fi";
import { GrTrophy } from "react-icons/gr";
import { FaArrowRight } from "react-icons/fa";
import { tournamentsFeaturedList } from './tournamentsFeaturedList'
import menuContentStyles from '@/styles/menu/menu-content.module.css'

const TournamentsFeatured = () => {
  return (
    <div className={menuContentStyles.tournamentsFeaturedContainer}>
        <h3>Featured</h3>

        <div className={menuContentStyles.slidersContainer}>
            {tournamentsFeaturedList.map((tournamentFeatured, index) => (
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
                        <div className={menuContentStyles.datePrizeContainer}>
                            <div className={menuContentStyles.dateContainer}>
                                <p className={menuContentStyles.dateParagraph}>
                                    <span className={menuContentStyles.dateIconSpan}><FiCalendar className={menuContentStyles.calendarIcon} /></span>
                                    <span className={menuContentStyles.dateSpan}>{tournamentFeatured.date}</span>
                                </p>
                            </div>
                    
                            <div className={menuContentStyles.prizeContainer}>
                                <p className={menuContentStyles.prizeParagraph}>
                                    <span className={menuContentStyles.prizeIconSpan}><GrTrophy className={menuContentStyles.trophyIcon} /> N</span>
                                    <span className={menuContentStyles.prize}>{tournamentFeatured.prize}</span>
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

export default TournamentsFeatured