'use client'

import Image from 'next/image'
import Link from 'next/link';
import { AiOutlineTeam } from "react-icons/ai";
import { LuGamepad2 } from "react-icons/lu";
import { FiCalendar } from "react-icons/fi";
import { GrTrophy } from "react-icons/gr";
import { PiMoneyWavy } from "react-icons/pi";
import { RiCopperCoinFill } from "react-icons/ri";
import menuContentStyles from '@/styles/menu/menu-content.module.css'
import styles from './new-tournaments.module.css'

const NewTournaments = ({ data = [] }) => {
  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  // Function to get the correct image URL
  const getImageUrl = (imagePath) => {
    if (!imagePath) return "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='200'%3E%3Crect width='100%25' height='100%25' fill='%23f3f4f6'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%23666'%3ETournament%3C/text%3E%3C/svg%3E";
    
    // If it's already a full URL, return as is
    if (imagePath.startsWith('http')) return imagePath;
    
    // If it starts with /media, prepend your backend URL
    if (imagePath.startsWith('/media')) {
      return `${process.env.NEXT_PUBLIC_API_URL}${imagePath}`;
    }
    
    // If it's just a filename, construct the full path
    return `${process.env.NEXT_PUBLIC_API_URL}/media/tournament_banners/${imagePath}`;
  };

  return (
    <div className={styles.newTournamentsContainer}>
        <h3>New Tournaments</h3>
        
        <div className={styles.cardsContainer}>
            
            {data.length > 0 ? (
              data.map((tournament, index) => (
                <div key={index} className={styles.cardContainer}>
                    <div className={styles.imageContainer}>
                        <Image
                            src={getImageUrl(tournament.tournament_banner)}
                            alt={tournament.tournament_title}
                            width={300}
                            height={200}
                        />
                    </div>
            
                    <div className={menuContentStyles.descriptionContainer}>
                        <div className={menuContentStyles.descriptionNameOrLocation}>
                            <p>
                              <span className={menuContentStyles.descriptionNameSpan}>
                                {tournament.tournament_title}
                              </span> 
                              {tournament.tournament_location && (
                                <>
                                  - <span className={menuContentStyles.descriptionLocationSpan}>
                                      {tournament.tournament_location}
                                    </span>
                                </>
                              )}
                            </p>
                        </div>
            
                        <div className={menuContentStyles.detailsContainer}>
                            <div className={menuContentStyles.eventOrParticipantTypeContainer}>
                                <p className={menuContentStyles.participantTypeParagraph}>
                                    <span className={menuContentStyles.participantIconSpan}>
                                      <AiOutlineTeam className={menuContentStyles.teamsIcon} />
                                    </span>
                                    <span className={menuContentStyles.participantTypeSpan}>
                                      {tournament.tournament_access === "team" ? "Teams" : "Individual"}
                                    </span>
                                </p>
                                <span className={menuContentStyles.playerSpan}>
                                  # {tournament.player_size} Players
                                </span>
                            </div>
                
                            <div className={menuContentStyles.nameDateContainer}>
                                <p className={menuContentStyles.nameParagraphHalf}>
                                    <span className={menuContentStyles.padIconSpan}>
                                      <LuGamepad2 className={menuContentStyles.padIcon} />
                                    </span>
                                    <span className={menuContentStyles.nameSpan}>
                                      Free Fire
                                    </span>
                                </p>
                                <p className={menuContentStyles.dateParagraphHalf}>
                                    <span className={menuContentStyles.calendarIconSpan}>
                                      <FiCalendar className={menuContentStyles.calendarIcon} />
                                    </span>
                                    <span className={menuContentStyles.dateSpan}>
                                      {formatDate(tournament.start_date_and_time)}
                                    </span>
                                </p>
                            </div>
                                
                            <div className={menuContentStyles.prizeFeeContainer}>
                                <p className={menuContentStyles.prizeParagraphHalf}>
                                    <span className={menuContentStyles.prizeIconSpan}>
                                      <GrTrophy className={menuContentStyles.prizeIcon} />
                                    </span>
                                    <span className={menuContentStyles.prizeSpan}>
                                      Prize: ${tournament.prize_distributions && tournament.prize_distributions.length > 0 
                                        ? tournament.prize_distributions[0].prize : "0.00"}
                                    </span>
                                </p>
                                <p className={menuContentStyles.feeParagraphHalf}>
                                    <span className={menuContentStyles.feeIconSpan}>
                                      <PiMoneyWavy className={menuContentStyles.feeIcon} />
                                    </span>
                                    <span className={menuContentStyles.feeSpan}>
                                      Fee: <span><RiCopperCoinFill className={menuContentStyles.coinIcon} /></span> 
                                      {tournament.entry_fee_price || "0.00"}
                                    </span>
                                </p>
                            </div>
                        </div>
            
                        <div className={styles.buttonContainer}>
                            <Link href={`/tournaments/${tournament.slug || tournament.tournament_id}`} className={styles.viewDetailsBTN}>
                              View Details
                            </Link>
                            <Link href={`/tournaments/${tournament.tournament_id}/register`} className={styles.registerBTN}>
                              Register
                            </Link>
                        </div>
                    </div>
                </div>
              ))
            ) : (
              <div className={styles.noTournamentsMessage}>
                No new tournaments available
              </div>
            )}
        </div>
    </div>
  )
}

export default NewTournaments;