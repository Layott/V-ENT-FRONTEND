import TournamentsFeatured from './tournaments-featured/TournamentsFeatured'
import NewTournaments from './new-tournaments/NewTournaments'
import AllTournaments from './all-tournaments/AllTournaments'
import styles from './tournaments.module.css'

const TournamentsComponent = () => {
  return (
    <div className={styles.tournamentsComponentContainer}>
      {/* <TournamentsFeatured />
      <NewTournaments /> */}
      <AllTournaments />
    </div>
  )
}

export default TournamentsComponent