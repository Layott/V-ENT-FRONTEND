'use client';

import { useState } from 'react';
import useGameModes from '@/components/game-modes/useGameModes';
import useGames from '@/components/game-modes/useGames';
import { FaAsterisk } from "react-icons/fa6";
import { FiInfo } from "react-icons/fi";
import createTournamentStyles from '@/styles/create-tournament/create-tournament.module.css';
import styles from './create-tournament-title.module.css';
import { useT } from '@/i18n/LanguageProvider';
const CreateTournamentTitle = ({
  formData = {},
  updateFormData
}) => {
  const tt = useT();
  const [selectedGame, setSelectedGame] = useState(formData.game || '');
  const [selectedGameMode, setSelectedGameMode] = useState(formData.game_mode || '');
  const [description, setDescription] = useState(formData.tournament_description || '');
  // Both lists come from the server. This screen fed its GAME select from the
  // keys of a hardcoded mode map, so an event could only be attached to one of
  // four games however many the platform actually runs, and a game added in the
  // admin console never appeared here at all.
  const { games, loading: gamesLoading } = useGames();
  const chosenGameId = games.find(g => g.name === selectedGame)?.id ?? null;
  const { modes: availableModes, loading: modesLoading, failed: modesFailed } =
    useGameModes(chosenGameId, null);

  const handleGameChange = event => {
    const value = event.target.value;
    setSelectedGame(value);
    updateFormData('game', value);
    updateFormData('game_id', games.find(g => g.name === value)?.id ?? null);
    setSelectedGameMode('');
    updateFormData('game_mode', '');
  };
  const handleGameModeChange = event => {
    const value = event.target.value;
    setSelectedGameMode(value);
    updateFormData('game_mode', value);
  };
  const handleDescriptionChange = event => {
    const value = event.target.value;
    setDescription(value);
    clearTimeout(handleDescriptionChange.timeout);
    handleDescriptionChange.timeout = setTimeout(() => {
      updateFormData('tournament_description', value);
    }, 300);
  };
  return <div className={`${createTournamentStyles.createSubSectionContainer} ${styles.createSubSectionContainer}`}>
        <div className={styles.tournamentTitleContainer}>
          <label htmlFor="title" className={createTournamentStyles.labelWithAsterisk}>
            {tt("ui.tournament.title.9bc3", "Tournament Title")}
            <span className={createTournamentStyles.asteriskSpan}>
              <FaAsterisk className={createTournamentStyles.asteriskIcon} />
            </span>
          </label>
          <input type="text" className={createTournamentStyles.inputText} placeholder={tt("ui.enter.title.0f84", "Enter title")} value={formData.tournament_title || ''} onChange={e => updateFormData('tournament_title', e.target.value)} // Correct key
      />
        </div>
  
        {/* Game and Game Mode */}
        <div className={createTournamentStyles.twoInputContainer}>
          <div className={createTournamentStyles.inputGroup}>
            <label htmlFor="game" className={createTournamentStyles.labelWithAsterisk}>
              {tt("ui.game.e3e8", "Game")}
              <span className={createTournamentStyles.asteriskSpan}>
                <FaAsterisk className={createTournamentStyles.asteriskIcon} />
              </span>
            </label>
            <select value={selectedGame} onChange={handleGameChange} className={createTournamentStyles.inputWithDropdown} disabled={gamesLoading}>
              <option value="">
                {gamesLoading
                  ? tt("ui.loading.33ce", "Loading…")
                  : tt("ui.select.game.9212", "Select Game")}
              </option>
              {games.map(game => <option key={game.id ?? game.name} value={game.name}>
                  {game.name}
                </option>)}
            </select>
          </div>
  
          <div className={createTournamentStyles.inputGroup}>
            <label htmlFor="gameMode" className={createTournamentStyles.labelWithAsterisk}>
              {tt("ui.game.mode.9424", "Game Mode")}
              <span className={createTournamentStyles.asteriskSpan}>
                <FaAsterisk className={createTournamentStyles.asteriskIcon} />
              </span>
            </label>
            <select value={selectedGameMode} onChange={handleGameModeChange} className={createTournamentStyles.inputWithDropdown} disabled={!selectedGame || modesLoading}>
              <option value="">
                {modesLoading
                  ? tt("ui.loading.33ce", "Loading…")
                  : tt("ui.select.game.mode.8e83", "Select Game Mode")}
              </option>
              {availableModes.map(mode => <option key={mode.id} value={mode.name}>
                  {mode.name}{mode.team_size ? ` (${mode.team_size} a side)` : ''}
                </option>)}
            </select>
            {selectedGame && !modesLoading && availableModes.length === 0 && <input
        type="text"
        className={createTournamentStyles.inputText}
        value={selectedGameMode}
        placeholder={modesFailed
          ? tt("createTournament.modesFailed", "Could not load the modes. Type one.")
          : tt("createTournament.noModes", "No modes recorded for this game. Type one.")}
        onChange={handleGameModeChange}
      />}
          </div>
        </div>
  
        {/* Description */}
        <div className={styles.tournamentDescriptionContainer}>
          <label htmlFor="description" className={createTournamentStyles.labelWithAsterisk}>
            {tt("ui.tournament.description.8d7d", "Tournament Description")}
            <span className={createTournamentStyles.asteriskSpan}>
              <FaAsterisk className={createTournamentStyles.asteriskIcon} />
            </span>
          </label>
          <textarea value={description} onChange={handleDescriptionChange} className={createTournamentStyles.inputText} placeholder={tt("ui.enter.tournament.description.4a26", "Enter tournament description")} maxLength={1000}></textarea>
          <p className={styles.infoParagraph}>
            <span className={styles.infoSpan}>
              <FiInfo className={styles.infoIcon} />
            </span>
            {tt("ui.max.characters.e348", "Max of 1,000 characters.")}
          </p>

        </div>
      </div>;
};
export default CreateTournamentTitle;