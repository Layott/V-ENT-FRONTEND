import { useState } from 'react';
import createTournamentStyles from '@/styles/create-tournament/create-tournament.module.css'

const TournamentFormat = ({formData={}, updateFormData}) => {
  const [selectedOption, setSelectedOption] = useState(formData.bracket_type || null);

  const handleOptionClick = (option) => {
    setSelectedOption(option);
    updateFormData( 'bracket_type', option);
  }

  return (
    <div className={createTournamentStyles.createSubSectionContainer}>
      <div className={createTournamentStyles.innerCreateSubSectionContainer}>
        <h3 className={createTournamentStyles.tournamentTypeH3}>Tournament Format (Bracket System)</h3>

        <div className={createTournamentStyles.twoBoxesInRowContainer}>
            <div
                className={`${createTournamentStyles.halfBoxContainer} ${
                    selectedOption === 'single-elimination' ? createTournamentStyles.activeBox : ''
                }`}
                onClick={() => handleOptionClick('single-elimination')}
            >
                <div
                className={`${createTournamentStyles.option} ${selectedOption === 'single-elimination' ? createTournamentStyles.selected : ''}`}
                onClick={() => handleOptionClick('single-elimination')}
                ></div>
                <div className={createTournamentStyles.boxTextContainer}>
                <h4>Single Elimination</h4>
                <p>Participants are eliminated after one loss, and only the winners advance until a champion is crowned.</p>
                </div>
            </div>
          
            <div
                className={`${createTournamentStyles.halfBoxContainer} ${
                    selectedOption === 'swiss-system' ? createTournamentStyles.activeBox : ''
                }`}
                onClick={() => handleOptionClick('swiss-system')}
            >
                <div
                className={`${createTournamentStyles.option} ${selectedOption === 'swiss-system' ? createTournamentStyles.selected : ''}`}
                onClick={() => handleOptionClick('swiss-system')}
                ></div>
                <div className={createTournamentStyles.boxTextContainer}>
                <h4>Swiss System</h4>
                <p>Participants compete in a set number of rounds, paired against opponents with similar records.</p>
                </div>
            </div>

            <div
                className={`${createTournamentStyles.halfBoxContainer} ${
                    selectedOption === 'double-elimination' ? createTournamentStyles.activeBox : ''
            }`}
                onClick={() => handleOptionClick('double-elimination')}
            >
                <div
                    className={`${createTournamentStyles.option} ${selectedOption === 'double-elimination' ? createTournamentStyles.selected : ''}`}
                    onClick={() => handleOptionClick('double-elimination')}
                ></div>
                <div className={createTournamentStyles.boxTextContainer}>
                    <h4>Double Elimination</h4>
                    <p>Participants must lose twice to be eliminated.</p>
                </div>
            </div>
          
            <div
                className={`${createTournamentStyles.halfBoxContainer} ${
                    selectedOption === 'round-robin' ? createTournamentStyles.activeBox : ''
            }`}
                onClick={() => handleOptionClick('round-robin')}
            >
                <div
                    className={`${createTournamentStyles.option} ${selectedOption === 'round-robin' ? createTournamentStyles.selected : ''}`}
                    onClick={() => handleOptionClick('round-robin')}
                ></div>
                <div className={createTournamentStyles.boxTextContainer}>
                    <h4>Round Robin</h4>
                    <p>Participants play against all others, and the team with the most wins is the winner.</p>
                </div>
            </div>
            
            <div
                className={`${createTournamentStyles.halfBoxContainer} ${
                    selectedOption === 'battle-royale' ? createTournamentStyles.activeBox : ''
            }`}
                onClick={() => handleOptionClick('battle-royale')}
            >
                <div
                    className={`${createTournamentStyles.option} ${selectedOption === 'battle-royale' ? createTournamentStyles.selected : ''}`}
                    onClick={() => handleOptionClick('battle-royale')}
                ></div>
                <div className={createTournamentStyles.boxTextContainer}>
                    <h4>Battle Royale</h4>
                    <p>Many players or teams compete in multiple rounds, earning points based on eliminations and placement.</p>
                </div>
            </div>

        </div>

        
      </div>

    </div>
  )
}

export default TournamentFormat;