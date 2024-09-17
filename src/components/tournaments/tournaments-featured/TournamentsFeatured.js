import Image from 'next/image'
import Link from 'next/link'
import { FiCalendar } from "react-icons/fi";
import { GrTrophy } from "react-icons/gr";
import { FaArrowRight } from "react-icons/fa";
import tekkenWorldTour from "@/images/tekken_world_tour.jpg"
import pubgElite from "@/images/pubg.webp"
import mortalKombat from "@/images/mortal_kombat.webp"
import unnamed from "@/images/unnamed.jpg"
import styles from './tournaments-featured.module.css'

const TournamentsFeatured = () => {
  return (
    <div className={styles.tournamentsFeaturedContainer}>
        <h3>Featured</h3>

        <div className={styles.slidersContainer}>
            <div className={styles.sliderContainer}>
                <div className={styles.imageContainer}>
                    <Image
                        src={tekkenWorldTour}
                        alt='Tekken World Tour'
                    />
                </div>
                <div className={styles.sliderDescriptionContainer}>
                    <div className={styles.left}>
                        <p><span className={styles.featuredName}>Tekken World Tour</span> - <span className={styles.featuredLocation}>Lagos</span></p>
                        <div className={styles.datePriceContainer}>
                            <div className={styles.dateContainer}>
                                <p className={styles.dateParagraph}>
                                    <span className={styles.dateLogoSpan}><FiCalendar className={styles.calendarLogo} /></span>
                                    <span className={styles.date}>Oct. 1st - Oct. 21st 2024</span>
                                </p>
                            </div>
                            <div className={styles.priceContainer}>
                                <p className={styles.priceParagraph}>
                                    <span className={styles.priceLogoSpan}><GrTrophy className={styles.trophyLogo} /></span>
                                    <span className={styles.price}>N300,000</span>
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className={styles.right}>
                        <Link href={'#'} className={styles.viewDetailsLink}>
                            <span>View Details</span>
                            <span><FaArrowRight className={styles.rightArrowIcon} /></span>
                        </Link>
                    </div>
                </div>
            </div>

            <div className={styles.sliderContainer}>
                <div className={styles.imageContainer}>
                    <Image
                        src={pubgElite}
                        alt='PUBG Elite Showdown'
                    />
                </div>
                <div className={styles.sliderDescriptionContainer}>
                    <div className={styles.left}>
                        <p><span className={styles.featuredName}>PUBG Elite Showdown</span> - <span className={styles.featuredLocation}>Abuja</span></p>
                        <div className={styles.datePriceContainer}>
                            <div className={styles.dateContainer}>
                                <p className={styles.dateParagraph}>
                                    <span className={styles.dateLogoSpan}><FiCalendar className={styles.calendarLogo} /></span>
                                    <span className={styles.date}>Oct. 1st - Oct. 21st 2024</span>
                                </p>
                            </div>
                            <div className={styles.priceContainer}>
                                <p className={styles.priceParagraph}>
                                    <span className={styles.priceLogoSpan}><GrTrophy className={styles.trophyLogo} /></span>
                                    <span className={styles.price}>N200,000</span>
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className={styles.right}>
                        <Link href={'#'} className={styles.viewDetailsLink}>
                            <span>View Details</span>
                            <span><FaArrowRight className={styles.rightArrowIcon} /></span>
                        </Link>
                    </div>
                </div>
            </div>

            <div className={styles.sliderContainer}>
                <div className={styles.imageContainer}>
                    <Image
                        src={mortalKombat}
                        alt='Mortal Kombat'
                    />
                </div>
                <div className={styles.sliderDescriptionContainer}>
                    <div className={styles.left}>
                        <p><span className={styles.featuredName}>Mortal Kombat Battle</span> - <span className={styles.featuredLocation}>Port Harcourt</span></p>
                        <div className={styles.datePriceContainer}>
                            <div className={styles.dateContainer}>
                                <p className={styles.dateParagraph}>
                                    <span className={styles.dateLogoSpan}><FiCalendar className={styles.calendarLogo} /></span>
                                    <span className={styles.date}>Oct. 1st - Oct. 21st 2024</span>
                                </p>
                            </div>
                            <div className={styles.priceContainer}>
                                <p className={styles.priceParagraph}>
                                    <span className={styles.priceLogoSpan}><GrTrophy className={styles.trophyLogo} /></span>
                                    <span className={styles.price}>N300,000</span>
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className={styles.right}>
                        <Link href={'#'} className={styles.viewDetailsLink}>
                            <span>View Details</span>
                            <span><FaArrowRight className={styles.rightArrowIcon} /></span>
                        </Link>
                    </div>
                </div>
            </div>

            <div className={styles.sliderContainer}>
                <div className={styles.imageContainer}>
                    <Image
                        src={unnamed}
                        alt='Unnamed'
                    />
                </div>
                <div className={styles.sliderDescriptionContainer}>
                    <div className={styles.left}>
                        <p><span className={styles.featuredName}>Unnamed</span> - <span className={styles.featuredLocation}>New York</span></p>
                        <div className={styles.datePriceContainer}>
                            <div className={styles.dateContainer}>
                                <p className={styles.dateParagraph}>
                                    <span className={styles.dateLogoSpan}><FiCalendar className={styles.calendarLogo} /></span>
                                    <span className={styles.date}>Oct. 1st - Oct. 21st 2024</span>
                                </p>
                            </div>
                            <div className={styles.priceContainer}>
                                <p className={styles.priceParagraph}>
                                    <span className={styles.priceLogoSpan}><GrTrophy className={styles.trophyLogo} /></span>
                                    <span className={styles.price}>N300,000</span>
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className={styles.right}>
                        <Link href={'#'} className={styles.viewDetailsLink}>
                            <span>View Details</span>
                            <span><FaArrowRight className={styles.rightArrowIcon} /></span>
                        </Link>
                    </div>
                </div>
            </div>


        </div>


    </div>
  )
}

export default TournamentsFeatured