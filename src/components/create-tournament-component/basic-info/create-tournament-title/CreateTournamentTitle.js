import { useState } from 'react';
import { FaAsterisk } from "react-icons/fa6";
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css'
import { FiInfo } from "react-icons/fi";
import modules from '@/components/react-quill/reactQuillModule';
import createTournamentStyles from '@/styles/create-tournament/create-tournament.module.css'
import styles from './create-tournament-title.module.css'

const CreateTournamentTitle = ({ formData= {}, updateFormData }) => {
    const [selectedGame, setSelectedGame] = useState(formData.game || '');
    const [selectedGameMode, setSelectedGameMode] = useState(formData.game_mode || '');
    const [description, setDescription] = useState(formData.tournament_description || '');
  
    const gameModes = {
      'FREEFIRE': ['Battle Royale', 'Clash Squad'],
      'PUBGM': ['Battle Royale', 'Multiplayer'],
      'CODM': ['Battle Royale', 'Multiplayer'],
      'EAFC': ['1 vs 1', '2 vs 2'],
    };
  
    const handleGameChange = (event) => {
      const value = event.target.value;
      setSelectedGame(value);
      updateFormData('game', value);
      setSelectedGameMode('');
    };
  
    const handleGameModeChange = (event) => {
      const value = event.target.value;
      setSelectedGameMode(value);
      updateFormData('game_mode', value);
    };
  
    const handleDescriptionChange = (event) => {
      const value = event.target.value;
      setDescription(value);
      clearTimeout(handleDescriptionChange.timeout);
      handleDescriptionChange.timeout = setTimeout(() => {
        updateFormData('tournament_description', value);
      }, 300);
    };
  
    return (
      <div className={`${createTournamentStyles.createSubSectionContainer} ${styles.createSubSectionContainer}`}>
        <div className={styles.tournamentTitleContainer}>
          <label htmlFor="title" className={createTournamentStyles.labelWithAsterisk}>
            Tournament Title
            <span className={createTournamentStyles.asteriskSpan}>
              <FaAsterisk className={createTournamentStyles.asteriskIcon} />
            </span>
          </label>
          <input
            type="text"
            className={createTournamentStyles.inputText}
            placeholder="Enter title"
            value={formData.tournament_title || ''}
            onChange={(e) => updateFormData('tournament_title', e.target.value)} // Correct key
          />
        </div>
  
        {/* Game and Game Mode */}
        <div className={createTournamentStyles.twoInputContainer}>
          <div className={createTournamentStyles.inputGroup}>
            <label htmlFor="game" className={createTournamentStyles.labelWithAsterisk}>
              Game
              <span className={createTournamentStyles.asteriskSpan}>
                <FaAsterisk className={createTournamentStyles.asteriskIcon} />
              </span>
            </label>
            <select
              value={selectedGame}
              onChange={handleGameChange}
              className={createTournamentStyles.inputWithDropdown}
            >
              <option value="">Select Game</option>
              {Object.keys(gameModes).map((game) => (
                <option key={game} value={game}>
                  {game}
                </option>
              ))}
            </select>
          </div>
  
          <div className={createTournamentStyles.inputGroup}>
            <label htmlFor="gameMode" className={createTournamentStyles.labelWithAsterisk}>
              Game Mode
              <span className={createTournamentStyles.asteriskSpan}>
                <FaAsterisk className={createTournamentStyles.asteriskIcon} />
              </span>
            </label>
            <select
              value={selectedGameMode}
              onChange={handleGameModeChange}
              className={createTournamentStyles.inputWithDropdown}
              disabled={!selectedGame}
            >
              <option value="">Select Game Mode</option>
              {selectedGame &&
                gameModes[selectedGame]?.map((mode, index) => (
                  <option key={index} value={mode}>
                    {mode}
                  </option>
                ))}
            </select>
          </div>
        </div>
  
        {/* Description */}
        <div className={styles.tournamentDescriptionContainer}>
          <label htmlFor="description" className={createTournamentStyles.labelWithAsterisk}>
            Tournament Description
            <span className={createTournamentStyles.asteriskSpan}>
              <FaAsterisk className={createTournamentStyles.asteriskIcon} />
            </span>
          </label>
          <textarea
            value={description}
            onChange={handleDescriptionChange}
            className={createTournamentStyles.inputText}
            placeholder="Enter tournament description"
            maxLength={1000}
          ></textarea>
        </div>

        {/* Description Using ReactQuill */}
        <div className={styles.tournamentDescriptionContainer}>
          <label htmlFor="description" className={createTournamentStyles.labelWithAsterisk}>
            Tournament Description
            <span className={createTournamentStyles.asteriskSpan}>
              <FaAsterisk className={createTournamentStyles.asteriskIcon} />
            </span>
          </label>
          <ReactQuill
              type={description}
              className={styles.richTextEditor}
              // onChange={handleDescriptionChange}
              modules={modules}
              theme='snow'
          />
          <p className={styles.infoParagraph}>
              <span className={styles.infoSpan}>
                  <FiInfo className={styles.infoIcon} />
              </span>
              Max of 1,000 characters.
          </p>
        </div>

      </div>
    );
  };
  
  export default CreateTournamentTitle;
  