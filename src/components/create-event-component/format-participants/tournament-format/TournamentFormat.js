import { useState } from 'react';
import createTournamentStyles from '@/styles/create-tournament/create-tournament.module.css';
import { useT } from '@/i18n/LanguageProvider';
const TournamentFormat = ({
  formData = {},
  updateFormData
}) => {
  const tt = useT();
  const [selectedOption, setSelectedOption] = useState(formData.bracket_type || null);
  const handleOptionClick = option => {
    setSelectedOption(option);
    updateFormData('bracket_type', option);
  };
  return <div className={createTournamentStyles.createSubSectionContainer}>
      <div className={createTournamentStyles.innerCreateSubSectionContainer}>
        <h3 className={createTournamentStyles.tournamentTypeH3}>{tt("ui.tournament.format.bracket.system.dbf4", "Tournament Format (Bracket System)")}</h3>

        <div className={createTournamentStyles.twoBoxesInRowContainer}>
            <div className={`${createTournamentStyles.halfBoxContainer} ${selectedOption === 'single-elimination' ? createTournamentStyles.activeBox : ''}`}>
                <div className={`${createTournamentStyles.option} ${selectedOption === 'single-elimination' ? createTournamentStyles.selected : ''}`} onClick={() => handleOptionClick('single-elimination')}></div>
                <div className={createTournamentStyles.boxTextContainer}>
                <h4>{tt("ui.single.elimination.7001", "Single Elimination")}</h4>
                <p>{tt("ui.participants.eliminated.after.one.d1bb", "Participants are eliminated after one loss, and only the winners advance until a champion is crowned.")}</p>
                </div>
            </div>
          
            <div className={`${createTournamentStyles.halfBoxContainer} ${selectedOption === 'swiss-system' ? createTournamentStyles.activeBox : ''}`}>
                <div className={`${createTournamentStyles.option} ${selectedOption === 'swiss-system' ? createTournamentStyles.selected : ''}`} onClick={() => handleOptionClick('swiss-system')}></div>
                <div className={createTournamentStyles.boxTextContainer}>
                <h4>{tt("ui.swiss.system.f479", "Swiss System")}</h4>
                <p>{tt("ui.participants.compete.set.number.7eef", "Participants compete in a set number of rounds, paired against opponents with similar records.")}</p>
                </div>
            </div>

            <div className={`${createTournamentStyles.halfBoxContainer} ${selectedOption === 'double-elimination' ? createTournamentStyles.activeBox : ''}`}>
                <div className={`${createTournamentStyles.option} ${selectedOption === 'double-elimination' ? createTournamentStyles.selected : ''}`} onClick={() => handleOptionClick('double-elimination')}></div>
                <div className={createTournamentStyles.boxTextContainer}>
                    <h4>{tt("ui.double.elimination.261d", "Double Elimination")}</h4>
                    <p>{tt("ui.participants.must.lose.twice.a411", "Participants must lose twice to be eliminated.")}</p>
                </div>
            </div>
          
            <div className={`${createTournamentStyles.halfBoxContainer} ${selectedOption === 'round-robin' ? createTournamentStyles.activeBox : ''}`}>
                <div className={`${createTournamentStyles.option} ${selectedOption === 'round-robin' ? createTournamentStyles.selected : ''}`} onClick={() => handleOptionClick('round-robin')}></div>
                <div className={createTournamentStyles.boxTextContainer}>
                    <h4>{tt("ui.round.robin.b15b", "Round Robin")}</h4>
                    <p>{tt("ui.participants.play.against.all.f6db", "Participants play against all others, and the team with the most wins is the winner.")}</p>
                </div>
            </div>
            
            <div className={`${createTournamentStyles.halfBoxContainer} ${selectedOption === 'battle-royale' ? createTournamentStyles.activeBox : ''}`}>
                <div className={`${createTournamentStyles.option} ${selectedOption === 'battle-royale' ? createTournamentStyles.selected : ''}`} onClick={() => handleOptionClick('battle-royale')}></div>
                <div className={createTournamentStyles.boxTextContainer}>
                    <h4>{tt("ui.battle.royale.853c", "Battle Royale")}</h4>
                    <p>{tt("ui.many.players.teams.compete.89b8", "Many players or teams compete in multiple rounds, earning points based on eliminations and placement.")}</p>
                </div>
            </div>

        </div>

        
      </div>

    </div>;
};
export default TournamentFormat;