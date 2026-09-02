import { VscTypeHierarchySub } from "react-icons/vsc";
import { GrGamepad, GrTrophy } from "react-icons/gr";
import { PiMoneyWavy } from "react-icons/pi";
import { FiCalendar } from "react-icons/fi";
import { IoLocationOutline } from "react-icons/io5";
import { AiOutlineTeam } from "react-icons/ai";
import { IoMdInformationCircleOutline } from "react-icons/io";
import { IoMdArrowForward } from "react-icons/io";
import tournamentStyles from '@/styles/tournament/tournament.module.css'
import overviewLtStyles from '@/view-/tournament-left/overview-lt.module.css'
import overviewRtStyles from '@/view-/overview-right/overview-rt.module.css'
import { appLocale } from '@/lib/appLocale';
import { formatLabel } from '@/lib/formatLabel';
import { useT } from '@/i18n/LanguageProvider';

const TournamentDetailsOverviewRight = ({ tournament }) => {
  const tt = useT();
  if (!tournament) {
    return <div>Loading tournament details...</div>;
  }

  // Helper function to format date range
  const formatDateRange = (startDate, endDate) => {
    if (!startDate || !endDate) return 'Date TBD';
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    const startFormatted = start.toLocaleDateString(appLocale(), { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
    });
    const endFormatted = end.toLocaleDateString(appLocale(), { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
    });
    
    return `${startFormatted} - ${endFormatted}`;
  };

  // Helper function to format entry fee
  const formatEntryFee = (entryFee, entryFeePrice) => {
    if (entryFee === 'Paid' && entryFeePrice) {
      return `$${entryFeePrice}`;
    }
    return entryFee === 'Free' ? 'No fee required' : 'TBD';
  };

  return (
    <div className={overviewLtStyles.overviewRight}>
      <div className={overviewRtStyles.rightBox}>
        <div className={overviewRtStyles.paragraphDiv}>
          <p className={overviewRtStyles.paragraphTitle}>
            <VscTypeHierarchySub className={overviewRtStyles.icons} /> Format
          </p>
          <p className={overviewRtStyles.paragraphValue}>
            {formatLabel(tt, tournament.bracket_type)}
          </p>
        </div>

        <div className={overviewRtStyles.paragraphDiv}>
          <p className={overviewRtStyles.paragraphTitle}>
            <GrGamepad className={overviewRtStyles.icons} /> Game
          </p>
          <p className={overviewRtStyles.paragraphValue}>
            {tournament.game_name || 'Free Fire'}
          </p>
        </div>

        <div className={overviewRtStyles.paragraphDiv}>
          <p className={overviewRtStyles.paragraphTitle}>
            <PiMoneyWavy className={overviewRtStyles.icons} /> Entry Fee
          </p>
          <p className={overviewRtStyles.paragraphValue}>
            {formatEntryFee(tournament.entry_fee, tournament.entry_fee_price)}
          </p>
        </div>

        <div className={overviewRtStyles.paragraphDiv}>
          <p className={overviewRtStyles.paragraphTitle}>
            <FiCalendar className={overviewRtStyles.icons} /> Date
          </p>
          <p className={overviewRtStyles.paragraphValue}>
            {formatDateRange(tournament.start_date_and_time, tournament.end_date_and_time)}
          </p>
        </div>

        <div className={overviewRtStyles.paragraphDiv}>
          <p className={overviewRtStyles.paragraphTitle}>
            <IoLocationOutline className={overviewRtStyles.icons} /> Location
          </p>
          <p className={overviewRtStyles.paragraphValue}>
            {tournament.tournament_location || 'Online'}
          </p>
        </div>
      </div>

      {/* Prize Distribution */}
      {tournament.prize_distributions && tournament.prize_distributions.length > 0 && (
        <div className={overviewRtStyles.rightBox}>
          <div className={overviewRtStyles.rightBoxHeaderContainer}>
            <h3 className={`${overviewRtStyles.headerH3} ${tournamentStyles.headerH3}`}>
              <GrTrophy className={overviewRtStyles.priceIcon} /> Prize
            </h3>
            <button className={overviewRtStyles.viewFullDistributionBTN}>
              View full distribution <IoMdArrowForward className={overviewRtStyles.forwardArrowIcon} />
            </button>
          </div>

          {/* Winner */}
          {tournament.prize_distributions.find(p => p.position === 1) && (
            <div className={overviewRtStyles.winnerContainer}>
              <p className={overviewRtStyles.winnerText}>Winner</p>
              <p>${tournament.prize_distributions.find(p => p.position === 1).prize}</p>
            </div>
          )}

          {/* Second and Third Place */}
          <div className={overviewRtStyles.secondThirdContainer}>
            {tournament.prize_distributions.find(p => p.position === 2) && (
              <div className={overviewRtStyles.secondPlaceContainer}>
                <p className={overviewRtStyles.secondPlaceText}>Second</p>
                <p>${tournament.prize_distributions.find(p => p.position === 2).prize}</p>
              </div>
            )}
            
            {tournament.prize_distributions.find(p => p.position === 3) && (
              <div className={overviewRtStyles.thirdPlaceContainer}>
                <p className={overviewRtStyles.thirdPlaceText}>Third</p>
                <p>${tournament.prize_distributions.find(p => p.position === 3).prize}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Participants */}
      <div className={overviewRtStyles.rightBox}>
        <div className={overviewRtStyles.rightBoxHeaderContainer}>
          <h3 className={`${overviewRtStyles.headerH3} ${tournamentStyles.headerH3}`}>
            <AiOutlineTeam className={overviewRtStyles.participantsIcon} /> Participants
          </h3>
          <button className={overviewRtStyles.viewAllBTN}>
            View All <IoMdArrowForward className={overviewRtStyles.forwardArrowIcon} />
          </button>
        </div>
        
        <p className={overviewRtStyles.participantsParagraph}>
          {tournament.tournament_access === 'team' ? 'Teams' : 'Individuals'} can register for this tournament.
        </p>
        
        <div className={overviewRtStyles.requirementContainer}>
          <div className={overviewRtStyles.minRequiredContainer}>
            <p className={overviewRtStyles.minRequiredText}>Minimum Required</p>
            <p className={overviewRtStyles.minRequiredValue}>
              {tournament.min_number_of_teams || 'N/A'}
            </p>
          </div>

          <div className={overviewRtStyles.maxRequiredContainer}>
            <p className={overviewRtStyles.maxRequiredText}>Maximum Allowed</p>
            <p className={overviewRtStyles.maxRequiredValue}>
              {tournament.max_number_of_teams || 'N/A'}
            </p>
          </div>
          
          <div className={overviewRtStyles.registeredContainer}>
            <p className={overviewRtStyles.registeredText}>Registered</p>
            <p className={overviewRtStyles.minRequiredValue}>
              {tournament.registered_teams ? tournament.registered_teams.length : 0}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TournamentDetailsOverviewRight