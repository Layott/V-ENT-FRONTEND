import TournamentsByGame from './tournaments-by-game/TournamentByGame';
import styles from './all-tournaments.module.css';

const AllTournaments = () => {
  return (
    <div className={styles.allTournamentsSlidersContainer}>
      <TournamentsByGame />
    </div>
  );
};

export default AllTournaments;