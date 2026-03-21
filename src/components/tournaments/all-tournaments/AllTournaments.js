import TournamentsByGame from './tournaments-by-game/TournamentByGame';
import styles from './all-tournaments.module.css';

const AllTournaments = ({ data }) => {
  return (
    <div className={styles.allTournamentsSlidersContainer}>
      <TournamentsByGame data={data} />
    </div>
  );
};

export default AllTournaments;