import { useState } from 'react';
import createTournamentStyles from '@/styles/create-tournament/create-tournament.module.css'
import { FaAsterisk } from "react-icons/fa6";
import ReactQuill from 'react-quill';
// import 'react-quill/dist/quill.snow.css'
import { FiInfo } from "react-icons/fi";
import modules from '@/components/react-quill/reactQuillModule';
import styles from './create-tournament-title.module.css'

const CreateTournamentTitle = () => {
    const [description, setDescription] = useState('');
    const [selectedGame, setSelectedGame] = useState('');
    const [selectedGameMode, setSelectedGameMode] = useState('');

    const gameModes = {
        'FREEFIRE' : ['Battle Royale', 'Clash Squad'],
        'PUBGM' : ['Battle Royale', 'Multiplayer'],
        'CODM' : ['Battle Royale', 'Multiplayer'],
        'EAFC' : ['1 vs 1', '2 vs 2'],
    }

    const handleGameChange = (event) => {
        setSelectedGame(event.target.value);
        setSelectedGameMode('');
    }

    const handleGameModeChange = (event) => {
        setSelectedGameMode(event.target.value);
    }

    const handleDescriptionChange = (value) => {
        setDescription(value);
    }

  return (
    <div className={`${createTournamentStyles.createSubSectionContainer} ${styles.createSubSectionContainer}`}>
        <div className={styles.tournamentTitleContainer}>
            <label htmlFor="" className={styles.titleLabel}>Tournament Title
                <span className={styles.asteriskSpan}>
                    <FaAsterisk className={styles.asteriskIcon} />
                </span>
            </label>
            <input
                type="text"
                className={styles.inputText}
                placeholder='Enter title'
            />
        </div>

        <div className={styles.gameAndModeContainer}>
            <div className={styles.gameContainer}>
                <label htmlFor="" className={styles.gameLabel}>Game
                    <span className={styles.asteriskSpan}>
                        <FaAsterisk className={styles.asteriskIcon} />
                    </span>
                </label>
                
                <select
                    value={selectedGame}
                    onChange={handleGameChange}
                    className={styles.gameDropdown}
                >
                    <option value="">Select Game</option>
                    <option value="FREEFIRE">FREEFIRE</option>
                    <option value="PUBGM">PUBGM</option>
                    <option value="CODM">CODM</option>
                    <option value="EAFC">EAFC</option>
                </select>
            </div>

            <div className={styles.gameModeContainer}>
                <label htmlFor="" className={styles.gameLabel}>Game Mode
                    <span className={styles.asteriskSpan}>
                        <FaAsterisk className={styles.asteriskIcon} />
                    </span>
                </label>

                <select
                    value={selectedGameMode}
                    onChange={handleGameModeChange}
                    className={styles.gameModeDropdown}
                    disabled={!selectedGame}
                >
                    <option value="">Select Game Mode</option>
                    {selectedGame && gameModes[selectedGame]?.map((mode, index) => (
                        <option key={index} value={mode}>{mode}</option>
                    ))}
                </select>
                
            </div>
        </div>

        <div className={styles.tournamentDescriptionContainer}>
            <label htmlFor="" className={styles.titleLabel}>Tournament Description
                <span className={styles.asteriskSpan}>
                    <FaAsterisk className={styles.asteriskIcon} />
                </span>
            </label>
            <ReactQuill
                type={description}
                className={styles.richTextEditor}
                onChange={handleDescriptionChange}
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
  )
}

export default CreateTournamentTitle