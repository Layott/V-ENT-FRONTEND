import { TfiClose } from "react-icons/tfi";
import Image from "next/image";
import styles from './activity.module.css'

const TournamentsDetails = ({ selectedTournament, setSelectedTournament }) => {
    if (!selectedTournament) return null

  return (
    <div className={styles.tournamentDetailsContainer}>
        <h3 className={styles.tournamentDetailsH3}>Tournament Details</h3>
        <div className={styles.tournamentDetails}>
          <div className={styles.contents}>
            <div className={styles.tournamentRecord}>
              <label>Tournament Name:</label>
              <p>{selectedTournament.name}</p>
            </div>
            
            <div className={styles.tournamentRecord}>
              <label>Game:</label>
              <p>{selectedTournament.game}</p>
            </div>
            
            <div className={styles.tournamentRecord}>
              <label>Type:</label>
              <p>{selectedTournament.type}</p>
            </div>
            
            <div className={styles.tournamentRecord}>
              <label>Price:</label>
              <p>{selectedTournament.price}</p>
            </div>
            
            <div className={styles.tournamentRecord}>
              <label>Status:</label>
              <p>{selectedTournament.status}</p>
            </div>
            
            <div className={styles.tournamentRecord}>
              <label>Position:</label>
              <p>{selectedTournament.position}</p>
            </div>
            
            <div className={styles.tournamentRecord}>
              <label>Date:</label>
              <p>{selectedTournament.date}</p>
            </div>

          </div>
          <div className={styles.tournamentImage}>
            <Image
              src={selectedTournament.src}
              alt={selectedTournament.name}
            />
          </div>
        </div>
        <button
          onClick={() => setSelectedTournament(null)}
          className={styles.closeBTN}
        >
          <TfiClose className={styles.closeIcon} />
        </button>      
    </div>
  )
}

export default TournamentsDetails