import CreateTournamentTitle from './create-tournament-title/CreateTournamentTitle'
import CreateTournamentType from './create-tournament-type/CreateTournamentType'
import CreateTournamentSchedule from './create-tournament-schedule/CreateTournamentSchedule'
import CreateTournamentVisibility from './create-tournament-visibility/CreateTournamentVisibility'
import CreateTournamentLogo from './create-tournament-logo/CreateTournamentLogo'
import styles from './basic-info.module.css'

const BasicInfo = () => {
  return (
    <div className={styles.basicInfoContainer}>
        <header className={styles.createTournamentHeader}>
            <h1>Basic Info</h1>
        </header>

        <CreateTournamentTitle />

        <CreateTournamentType />

        <CreateTournamentSchedule />

        <CreateTournamentVisibility />
        
        <CreateTournamentLogo />
    </div>
  )
}

export default BasicInfo