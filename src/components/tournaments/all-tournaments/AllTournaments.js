
import FIFATournaments from './fifa-tournaments/FIFATournaments';
import PUBGTournaments from './pubg-tournaments/PUBGTournaments';
import FortniteTournaments from './fortnite-tournaments/FortniteTournaments';
import MinecraftTournaments from './minecraft-tournaments/MinecraftTournaments';
import styles from './all-tournaments.module.css'

const AllTournaments = () => {
  return (
    <div className={styles.allTournamentsSlidersContainer}>

        <FIFATournaments />
        <PUBGTournaments />
        <FortniteTournaments />
        <MinecraftTournaments />
        
    </div>

  )
}

export default AllTournaments