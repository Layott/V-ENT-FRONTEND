import TournamentsFeatured from './tournaments-featured/TournamentsFeatured'
import styles from './tournaments.module.css'

const TournamentsComponent = () => {
  return (
    <div className={styles.pageContainer}>
      <TournamentsFeatured />
    </div>
  )
}

export default TournamentsComponent