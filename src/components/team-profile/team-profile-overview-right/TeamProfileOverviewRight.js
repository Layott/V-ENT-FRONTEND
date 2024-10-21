import TeamProfileWalletPenalty from "./team-profile-wallet-penalty/TeamProfileWalletPenalty";
import TeamProfileStats from "./team-profile-stats/TeamProfileStats";
import TeamProfileFavouriteGames from "./team-profile-favourite-games/TeamProfileFavouriteGames";
import TeamProfileAchievements from "./team-profile-achievements/TeamProfileAchievements";
import styles from './team-profile-overview-right.module.css'

const TeamProfileOverviewRight = () => {
  return (
    <div className={styles.overviewRight}>
      <TeamProfileWalletPenalty />
      <TeamProfileStats />
      <TeamProfileFavouriteGames />
      <TeamProfileAchievements />
  </div>
  )
}

export default TeamProfileOverviewRight