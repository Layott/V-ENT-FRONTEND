import { useState } from 'react';
import styles from './edit-team-profile-interests.module.css';

const EditTeamProfileCoreGame = () => {
    const [selectedGame, setSelectedGame] = useState("");

    const games = ['FIFA', 'FREEFIRE', 'PUBGM', 'CODM', 'EAFC'];

    const handleGameChange = (event) => {
        setSelectedGame(event.target.value);
    };
  

    return (
        <div className={styles.editInterestsContainer}>
            <h3>Core Game</h3>

            <div className={styles.inputGroup}>
                <label htmlFor="game">
                    Game
                </label>
                <select
                    value={selectedGame}
                    onChange={handleGameChange}
                    className={styles.inputWithDropdown}
                >
                    <option value="">Select Game</option>
                    {games.map((game) => (
                        <option key={game} value={game}>
                            {game}
                        </option>
                    ))}
                </select>
            </div>
        </div>
    );
};

export default EditTeamProfileCoreGame;
