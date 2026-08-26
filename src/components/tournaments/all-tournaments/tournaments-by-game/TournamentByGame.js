import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { AiOutlineTeam } from "react-icons/ai";
import { LuGamepad2 } from "react-icons/lu";
import { FiCalendar } from "react-icons/fi";
import { GrTrophy } from "react-icons/gr";
import { PiMoneyWavy } from "react-icons/pi";
import { RiCopperCoinFill } from "react-icons/ri";
import { LuArrowRight } from "react-icons/lu";
import { LuArrowLeft } from "react-icons/lu";
import menuContentStyles from '@/styles/menu/menu-content.module.css';
import newTournamentsStyles from './../../new-tournaments/new-tournaments.module.css';
import allTournamentsStyles from './../all-tournaments.module.css';

const TournamentsByGame = ({ data }) => {
  const [tournaments, setTournaments] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedGames, setExpandedGames] = useState({});

  useEffect(() => {
    // If data is passed as props, use it
    if (data && Object.keys(data).length > 0) {
      setTournaments(data);
      setLoading(false);
      return;
    }

    // Otherwise, fetch data
    const fetchTournaments = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/tournament/get-all-tournaments/`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch tournaments');
        }
        
        const responseData = await response.json();
        
        if (responseData.status === 'success' && responseData.data && responseData.data.by_game) {
          setTournaments(responseData.data.by_game);
        } else {
          throw new Error('Invalid data structure');
        }
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    fetchTournaments();
  }, [data]);

  const handleToggle = (game) => {
    setExpandedGames(prev => ({
      ...prev,
      [game]: !prev[game]
    }));
  };

  // Function to get the correct image URL (same as featured tournaments)
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

  // Helper function to format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  if (loading) return <div className={allTournamentsStyles.loading}>Loading tournaments...</div>;
  if (error) return <div className={allTournamentsStyles.error}>Error: {error}</div>;
  if (!tournaments || Object.keys(tournaments).length === 0) {
    return <div className={allTournamentsStyles.noTournaments}>No tournaments available</div>;
  }

  return (
    <div className={allTournamentsStyles.allTournamentsSlidersContainer}>
      {Object.keys(tournaments).map((game) => (
        <div key={game} className={allTournamentsStyles.fifaTournamentsContainer}>
          <div className={allTournamentsStyles.header}>
            <h3>{game} Tournaments</h3>
            {!expandedGames[game] && tournaments[game].length > 3 && (
              <button
                className={allTournamentsStyles.seeMoreBTN}
                onClick={() => handleToggle(game)}
              >
                See more<LuArrowRight />
              </button>
            )}
          </div>

          <div className={allTournamentsStyles.cardsContainer}>
            {tournaments[game]
              .slice(0, expandedGames[game] ? tournaments[game].length : 3)
              .map((tournament, index) => (
                <div key={index} className={allTournamentsStyles.cardContainer}>
                  <div className={allTournamentsStyles.imageContainer}>
                    <Image
                      src={getImageUrl(tournament.tournament_banner)}
                      alt={`${tournament.tournament_title} banner`}
                      width={400}
                      height={200}
                    />
                  </div>
                  
                  <div className={menuContentStyles.descriptionContainer}>
                    <div className={menuContentStyles.descriptionNameLocationParagraph}>
                      <p>
                        <span className={menuContentStyles.descriptionNameSpan}>
                          {tournament.tournament_title}
                        </span> 
                        {tournament.tournament_location && (
                          <>
                            {" - "}
                            <span className={menuContentStyles.descriptionLocationSpan}>
                              {tournament.tournament_location}
                            </span>
                          </>
                        )}
                      </p>
                    </div>
                    
                    <div className={menuContentStyles.eventOrParticipantTypeContainer}>
                      <p className={menuContentStyles.participantTypeParagraph}>
                        <span className={menuContentStyles.participantIconSpan}>
                          <AiOutlineTeam className={menuContentStyles.teamsIcon} />
                        </span>
                        <span className={menuContentStyles.participantTypeSpan}>
                          {tournament.tournament_access}
                        </span>
                      </p>
                      <span className={menuContentStyles.playerSpan}># {tournament.player_size}</span>
                    </div>
                    
                    <div className={menuContentStyles.nameDateContainer}>
                      <p className={menuContentStyles.nameParagraphHalf}>
                        <span className={menuContentStyles.padIconSpan}>
                          <LuGamepad2 className={menuContentStyles.padIcon} />
                        </span>
                        <span className={menuContentStyles.nameSpan}>{game}</span>
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
                      <p className={menuContentStyles.nameParagraphHalf}>
                        <span className={menuContentStyles.prizeIconSpan}>
                          <GrTrophy className={menuContentStyles.prizeIcon} />
                        </span>
                        <span className={menuContentStyles.prizeSpan}>
                          Prize: {tournament.prize_distributions && tournament.prize_distributions.length > 0 
                            ? `N ${tournament.prize_distributions[0].prize}` 
                            : 'N/A'}
                        </span>
                      </p>
                      <p className={menuContentStyles.feeParagraphHalf}>
                        <span className={menuContentStyles.feeIconSpan}>
                          <PiMoneyWavy className={menuContentStyles.feeIcon} />
                        </span>
                        <span className={menuContentStyles.feeSpan}>
                          Fee: <span><RiCopperCoinFill className={menuContentStyles.coinIcon} /></span> 
                          {tournament.entry_fee_price}
                        </span>
                      </p>
                    </div>
                    
                    <div className={`${newTournamentsStyles.buttonContainer} ${allTournamentsStyles.buttonContainer}`}>
                      <Link href={`/tournaments/${tournament.slug || tournament.tournament_id}`} className={newTournamentsStyles.viewDetailsBTN}>
                        View Details
                      </Link>
                      <Link href={`/tournaments/${tournament.tournament_id}/register`} className={newTournamentsStyles.registerBTN}>
                        Register
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
              
            {expandedGames[game] && (
              <button
                className={`${allTournamentsStyles.seeMoreBTN} ${allTournamentsStyles.seeLessBTN}`}
                onClick={() => handleToggle(game)}
              >
                <LuArrowLeft />See less
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default TournamentsByGame;