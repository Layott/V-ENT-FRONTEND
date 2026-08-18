import { useState } from 'react';
import { FaAsterisk } from "react-icons/fa6";
import { FiInfo } from "react-icons/fi";
import createTournamentStyles from '@/styles/create-tournament/create-tournament.module.css'
import styles from './create-tournament-title.module.css'

// Known game-mode options per game. Any game not in this map (e.g. one
// derived dynamically from existing tournaments) falls back to a generic
// mode so the dropdown is never a dead end.
const GAME_MODES = {
  'Free Fire': ['Battle Royale', 'Clash Squad'],
  'PUBG': ['Battle Royale', 'Multiplayer'],
  'PUBG Mobile': ['Battle Royale', 'Multiplayer'],
  'CODM': ['Battle Royale', 'Multiplayer'],
  'Call of Duty Mobile': ['Battle Royale', 'Multiplayer'],
  'EAFC': ['1 vs 1', '2 vs 2'],
};
const DEFAULT_GAME_MODES = ['Standard'];

const CreateTournamentTitle = ({ formData = {}, updateFormData, games = [], gamesLoading = false }) => {
    const [selectedGame, setSelectedGame] = useState(formData.game || '');
    const [selectedGameMode, setSelectedGameMode] = useState(formData.game_mode || '');
    const [description, setDescription] = useState(formData.tournament_description || '');

    const handleGameChange = (event) => {
      const value = event.target.value;
      setSelectedGame(value);
      updateFormData('game', value);
      const match = games.find((g) => g.name === value);
      updateFormData('game_id', match?.id ?? null);
      setSelectedGameMode('');
      updateFormData('game_mode', '');
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

    const availableModes = selectedGame ? (GAME_MODES[selectedGame] || DEFAULT_GAME_MODES) : [];

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
              id="game"
              value={selectedGame}
              onChange={handleGameChange}
              className={createTournamentStyles.inputWithDropdown}
              disabled={gamesLoading}
            >
              <option value="">{gamesLoading ? 'Loading games…' : 'Select Game'}</option>
              {games.map((game) => (
                <option key={game.id ?? game.name} value={game.name}>
                  {game.name}
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
              id="gameMode"
              value={selectedGameMode}
              onChange={handleGameModeChange}
              className={createTournamentStyles.inputWithDropdown}
              disabled={!selectedGame}
            >
              <option value="">Select Game Mode</option>
              {availableModes.map((mode) => (
                <option key={mode} value={mode}>
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
            id="description"
            value={description}
            onChange={handleDescriptionChange}
            className={createTournamentStyles.inputText}
            placeholder="Enter tournament description"
            maxLength={1000}
          ></textarea>
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
