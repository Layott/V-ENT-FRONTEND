import UserProfileWalletPenalty from "./user-profile-wallet-penalty/UserProfileWalletPenalty";
import UserProfileStats from "./user-profile-stats/UserProfileStats";
import UserProfileFavouriteGames from "./user-profile-favourite-games/UserProfileFavouriteGames";
import UserProfileAchievements from "./user-profile-achievements/UserProfileAchievements";
import profileStyles from '@/styles/profile/profile-page.module.css'

const UserProfileOverviewRight = ({penaltyPoints, walletBalance}) => {
  return (
    <div className={profileStyles.overviewRight}>
      <UserProfileWalletPenalty penaltyPoints={penaltyPoints} walletBalance={walletBalance} />
      <UserProfileStats />
      <UserProfileFavouriteGames />
      <UserProfileAchievements />
  </div>
  )
}

export default UserProfileOverviewRight