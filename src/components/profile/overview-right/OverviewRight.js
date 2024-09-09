import WalletPenalty from "./wallet-penalty/WalletPenalty";
import Stats from "./stats/Stats";
import FavouriteGame from "./favourite-game/FavouriteGame";
import styles from './overview-right.module.css'

const OverviewRight = () => {
  return (
    <div className={styles.overviewRight}>
      <WalletPenalty />
      <Stats />
      <FavouriteGame />
  </div>
  )
}

export default OverviewRight