import { useState } from 'react';
import styles from './edit-team-profile-interests.module.css';
import { useT } from '@/i18n/LanguageProvider';
const EditTeamProfileCoreGame = () => {
  const tt = useT();
  const [selectedGame, setSelectedGame] = useState("");
  const games = ['FIFA', 'FREEFIRE', 'PUBGM', 'CODM', 'EAFC'];
  const handleGameChange = event => {
    setSelectedGame(event.target.value);
  };
  return <div className={styles.editInterestsContainer}>
            <h3>{tt("ui.core.game.5f4e", "Core Game")}</h3>

            <div className={styles.inputGroup}>
                <label htmlFor="game">
                    {tt("ui.game.e3e8", "Game")}
                </label>
                <select value={selectedGame} onChange={handleGameChange} className={styles.inputWithDropdown}>
                    <option value="">{tt("ui.select.game.9212", "Select Game")}</option>
                    {games.map(game => <option key={game} value={game}>
                            {game}
                        </option>)}
                </select>
            </div>
        </div>;
};
export default EditTeamProfileCoreGame;