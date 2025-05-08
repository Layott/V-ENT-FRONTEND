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

const TournamentsByGame = () => {
  const [tournaments, setTournaments] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedGames, setExpandedGames] = useState({});

  useEffect(() => {
    const fetchTournaments = async () => {
      try {
        const response = await fetch('https://vermillionent.pythonanywhere.com/tournament/get-all-tournaments/');
        
        if (!response.ok) {
          throw new Error('Failed to fetch tournaments');
        }
        
        const data = await response.json();
        
        if (data.status === 'success' && data.data && data.data.by_game) {
          setTournaments(data.data.by_game);
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
  }, []);

  const handleToggle = (game) => {
    setExpandedGames(prev => ({
      ...prev,
      [game]: !prev[game]
    }));
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
                      src={tournament.tournament_banner || "/placeholder-tournament.jpg"}
                      alt={` banner`}
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
                          Prize: {tournament.prize_distributions.length > 0 
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
                      <Link href={`/tournaments/view-tournament?id=${tournament.tournament_id}`} className={newTournamentsStyles.viewDetailsBTN}>
                        View Details
                      </Link>
                      <Link href={`/tournaments/register-tournament?id=${tournament.tournament_id}`} className={newTournamentsStyles.registerBTN}>
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