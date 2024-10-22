import TeamProfileWalletPenalty from "./team-profile-wallet-penalty/TeamProfileWalletPenalty";
import TeamProfileStats from "./team-profile-stats/TeamProfileStats";
import TeamProfileFavouriteGames from "./team-profile-favourite-games/TeamProfileFavouriteGames";
import TeamProfileAchievements from "./team-profile-achievements/TeamProfileAchievements";
import profileStyles from '@/styles/profile/profile-page.module.css'

const TeamProfileOverviewRight = () => {
  return (
    <div className={profileStyles.overviewRight}>
      <TeamProfileWalletPenalty />
      <TeamProfileStats />
      <TeamProfileFavouriteGames />
      <TeamProfileAchievements />
  </div>
  )
}

export default TeamProfileOverviewRight