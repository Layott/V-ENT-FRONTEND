'use client';

import InfoTip from '@/components/info-tip/InfoTip';
import { useState } from 'react';
import useGameModes from '@/components/game-modes/useGameModes';
import { FaAsterisk } from "react-icons/fa6";
import { FiInfo } from "react-icons/fi";
import createTournamentStyles from '@/styles/create-tournament/create-tournament.module.css';
import styles from './create-tournament-title.module.css';
import { useT } from '@/i18n/LanguageProvider';
import { useTx } from '@/i18n/LanguageProvider';

// The modes come from the server, keyed on the game's id. This used to be a
// fixed map keyed on the game's TITLE, which failed two ways: a game added in
// the admin console offered "Standard" as its only mode, and renaming a game
// silently lost its modes because the key no longer matched.
const CreateTournamentTitle = ({
  formData = {},
  updateFormData,
  games = [],
  gamesLoading = false
}) => {
  const tx = useTx();
  const tt = useT();
  const [selectedGame, setSelectedGame] = useState(formData.game || '');
  const [selectedGameMode, setSelectedGameMode] = useState(formData.game_mode || '');
  const [description, setDescription] = useState(formData.tournament_description || '');
  // The editions of the chosen game. Most titles have none, and then the second
  // select never appears.
  const chosenSeries = (games.find(g => g.name === selectedGame)?.series) || [];
  const handleGameChange = event => {
    const value = event.target.value;
    setSelectedGame(value);
    updateFormData('game', value);
    const match = games.find(g => g.name === value);
    updateFormData('game_id', match?.id ?? null);
    setSelectedGameMode('');
    updateFormData('game_mode', '');
    // The edition belongs to the game that was chosen before, so it cannot
    // survive the game changing underneath it.
    updateFormData('series_id', '');
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
  const chosenGameId = games.find(g => g.name === selectedGame)?.id ?? null;
  const { modes: availableModes, loading: modesLoading, failed: modesFailed } =
    useGameModes(chosenGameId, formData.series_id || null);

  // Picking a mode carries its defaults forward: Battle Royale means placement
  // scoring with the right table, and a mode that fixes how many a side sets
  // the team size. Defaults, not constraints - the organiser can still change
  // both on the next step.
  const applyMode = mode => {
    if (!mode) return;
    if (mode.default_format) updateFormData('bracket_type', mode.default_format);
    if (mode.default_placement_table) {
      updateFormData('default_placement_table', mode.default_placement_table);
    }
    if (mode.team_size) updateFormData('team_size', mode.team_size);
  };
  return <div className={`${createTournamentStyles.createSubSectionContainer} ${styles.createSubSectionContainer}`}>
        <div className={styles.tournamentTitleContainer}>
          <label htmlFor="title" className={createTournamentStyles.labelWithAsterisk}>
            <span className="fieldLabelRow">{tt("ui.tournament.title.9bc3", "Tournament Title")}
            <span className={createTournamentStyles.asteriskSpan}>
              <FaAsterisk className={createTournamentStyles.asteriskIcon} />
            </span> <InfoTip id="tournamentTitle" /></span>
          </label>
          <input type="text" className={createTournamentStyles.inputText} placeholder={tt("ui.enter.title.0f84", "Enter title")} value={formData.tournament_title || ''} onChange={e => updateFormData('tournament_title', e.target.value)} // Correct key
      />
        </div>

        {/* Game and Game Mode */}
        <div className={createTournamentStyles.twoInputContainer}>
          <div className={createTournamentStyles.inputGroup}>
            <label htmlFor="game" className={createTournamentStyles.labelWithAsterisk}>
              <span className="fieldLabelRow">{tt("ui.game.e3e8", "Game")}
              <span className={createTournamentStyles.asteriskSpan}>
                <FaAsterisk className={createTournamentStyles.asteriskIcon} />
              </span> <InfoTip id="tournamentGame" /></span>
            </label>
            <select id="game" value={selectedGame} onChange={handleGameChange} className={createTournamentStyles.inputWithDropdown} disabled={gamesLoading}>
              <option value="">{gamesLoading ? tx("Loading games…") : tx("Select Game")}</option>
              {games.map(game => <option key={game.id ?? game.name} value={game.name}>
                  {game.name}
                </option>)}
            </select>
          </div>

          {/* Only annual titles have editions, so this appears only when the
              chosen game has some. A bracket is played on one edition, and
              results from two of them are not comparable. */}
          {chosenSeries.length > 0 && <div className={createTournamentStyles.inputGroup}>
              <label htmlFor="gameSeries" className={createTournamentStyles.labelWithAsterisk}>
                <span className="fieldLabelRow">{tt("createEvent.edition", "Edition")} <InfoTip id="tournamentGame" /></span>
              </label>
              <select id="gameSeries" value={formData.series_id || ''} onChange={e => updateFormData('series_id', e.target.value)} className={createTournamentStyles.inputWithDropdown}>
                <option value="">{tt("createEvent.anyEdition", "Any edition")}</option>
                {chosenSeries.map(sr => <option key={sr.id} value={sr.id}>
                    {sr.name}{sr.release_year ? ` (${sr.release_year})` : ''}
                  </option>)}
              </select>
            </div>}

          <div className={createTournamentStyles.inputGroup}>
            <label htmlFor="gameMode" className={createTournamentStyles.labelWithAsterisk}>
              <span className="fieldLabelRow">{tt("ui.game.mode.9424", "Game Mode")}
              <span className={createTournamentStyles.asteriskSpan}>
                <FaAsterisk className={createTournamentStyles.asteriskIcon} />
              </span> <InfoTip id="gameMode" /></span>
            </label>
            <select id="gameMode" value={selectedGameMode} onChange={e => {
        handleGameModeChange(e);
        applyMode(availableModes.find(m => m.name === e.target.value));
      }} className={createTournamentStyles.inputWithDropdown} disabled={!selectedGame || modesLoading}>
              <option value="">
                {modesLoading ? tx("Loading…") : tx("Select Game Mode")}
              </option>
              {availableModes.map(mode => <option key={mode.id} value={mode.name}>
                  {mode.name}{mode.team_size ? ` (${mode.team_size} a side)` : ''}
                </option>)}
            </select>
            {/* A game nobody has recorded modes for is not a dead end: the
                select still takes a typed answer, because refusing to let
                somebody run a tournament because we have no list for their
                game is worse than an empty list. */}
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
            <span className="fieldLabelRow">{tt("ui.tournament.description.8d7d", "Tournament Description")}
            <span className={createTournamentStyles.asteriskSpan}>
              <FaAsterisk className={createTournamentStyles.asteriskIcon} />
            </span> <InfoTip id="tournamentDescription" /></span>
          </label>
          <textarea id="description" value={description} onChange={handleDescriptionChange} className={createTournamentStyles.inputText} placeholder={tt("ui.enter.tournament.description.4a26", "Enter tournament description")} maxLength={1000}></textarea>
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