import WalletPenalty from "./wallet-penalty/WalletPenalty";
import Stats from "./stats/Stats";
import FavouriteGame from "./favourite-game/FavouriteGame";
import styles from './dashboard-right.module.css'

const UserProfileDashboardRight = () => {
  return (
    <div className={styles.profileDashboardRight}>
      <WalletPenalty />
      <Stats />
      <FavouriteGame />
  </div>
  )
}

export default UserProfileDashboardRight