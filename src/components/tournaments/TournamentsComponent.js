import TournamentsFeatured from './tournaments-featured/TournamentsFeatured'
import NewTournaments from './new-tournaments/NewTournaments'
import styles from './tournaments.module.css'

const TournamentsComponent = () => {
  return (
    <div className={styles.tournamentsComponentContainer}>
      <TournamentsFeatured />
      <NewTournaments />
    </div>
  )
}

export default TournamentsComponent