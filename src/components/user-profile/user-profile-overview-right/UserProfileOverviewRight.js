import UserProfileWalletPenalty from "./user-profile-wallet-penalty/UserProfileWalletPenalty";
import UserProfileStats from "./user-profile-stats/UserProfileStats";
import UserProfileFavouriteGames from "./user-profile-favourite-games/UserProfileFavouriteGames";
import UserProfileAchievements from "./user-profile-achievements/UserProfileAchievements";
import profileStyles from '@/styles/profile/profile-page.module.css'

const UserProfileOverviewRight = () => {
  return (
    <div className={profileStyles.overviewRight}>
      <UserProfileWalletPenalty />
      <UserProfileStats />
      <UserProfileFavouriteGames />
      <UserProfileAchievements />
  </div>
  )
}

export default UserProfileOverviewRight