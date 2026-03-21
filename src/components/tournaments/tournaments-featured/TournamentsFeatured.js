import Image from 'next/image'
import Link from 'next/link'
import { FiCalendar } from "react-icons/fi";
import { GrTrophy } from "react-icons/gr";
import { FaArrowRight } from "react-icons/fa";
import menuContentStyles from '@/styles/menu/menu-content.module.css'


const TournamentsFeatured = ({ data }) => {
  // Function to get the correct image URL
  const getImageUrl = (imagePath) => {
    if (!imagePath) return "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='180'%3E%3Crect width='100%25' height='100%25' fill='%23f3f4f6'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%23666'%3ETournament%3C/text%3E%3C/svg%3E";
    
    // If it's already a full URL, return as is
    if (imagePath.startsWith('http')) return imagePath;
    
    // If it starts with /media, prepend your backend URL
    if (imagePath.startsWith('/media')) {
      return `${process.env.NEXT_PUBLIC_API_URL}${imagePath}`;
    }
    
    // If it's just a filename, construct the full path
    return `${process.env.NEXT_PUBLIC_API_URL}/media/tournament_banners/${imagePath}`;
  };

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
                            src={getImageUrl(tournament.tournament_banner)}
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