import Image from 'next/image'
import Link from 'next/link'
import { FiCalendar } from "react-icons/fi";
import { GrTrophy } from "react-icons/gr";
import { FaArrowRight } from "react-icons/fa";
import menuContentStyles from '@/styles/menu/menu-content.module.css'


const TournamentsFeatured = ({ data }) => {
    console.log("Featured tournaments data:", data);
  // Function to format date from API format to your display format
  const formatTournamentDate = (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`;
  };

  return (
    <div className={menuContentStyles.tournamentsFeaturedContainer}>
        <h3>Featured</h3>

        <div className={menuContentStyles.slidersContainer}>
            {data && data.length > 0 ? (
              data.map((tournament, index) => (
                <div key={index} className={menuContentStyles.sliderContainer}>
                    <div className={menuContentStyles.imageContainer}>
                        <Image
                            src={tournament.tournament_banner || '/default-tournament-banner.jpg'} // Fallback image
                            alt={tournament.tournament_title}
                            width={300}
                            height={180}
                        />
                    </div>
                    
                    <div className={menuContentStyles.sliderDescriptionContainer}>
                        <div className={menuContentStyles.left}>
                            <p>
                              <span className={menuContentStyles.featuredName}>{tournament.tournament_title}</span> - 
                              <span className={menuContentStyles.featuredLocation}>{tournament.tournament_location || 'Online'}</span>
                            </p>
                            <div className={menuContentStyles.datePrizeContainer}>
                                <div className={menuContentStyles.dateContainer}>
                                    <p className={menuContentStyles.dateParagraph}>
                                        <span className={menuContentStyles.dateIconSpan}>
                                          <FiCalendar className={menuContentStyles.calendarIcon} />
                                        </span>
                                        <span className={menuContentStyles.dateSpan}>
                                          {formatTournamentDate(tournament.start_date_and_time, tournament.end_date_and_time)}
                                        </span>
                                    </p>
                                </div>
                        
                                <div className={menuContentStyles.prizeContainer}>
                                    <p className={menuContentStyles.prizeParagraph}>
                                        <span className={menuContentStyles.prizeIconSpan}>
                                          <GrTrophy className={menuContentStyles.prizeIcon} /> N
                                        </span>
                                        <span className={menuContentStyles.prize}>
                                          {tournament.prize_distributions && tournament.prize_distributions.length > 0 
                                            ? `$${tournament.prize_distributions[0].prize}` 
                                            : 'TBD'}
                                        </span>
                                    </p>
                                </div>
                            </div>
                        </div>
                            
                        <div>
                            <Link href={`/tournaments/view-tournament?id=${tournament.tournament_id}`} className={menuContentStyles.viewDetailsLink}>
                                <span className={menuContentStyles.viewDetails}>View Details</span>
                                <span><FaArrowRight className={menuContentStyles.rightArrowIcon} /></span>
                            </Link>
                        </div>
                    </div>
                </div>
              ))
            ) : (
              <p>No featured tournaments available</p>
            )}
        </div>
    </div>
  )
}

export default TournamentsFeatured;