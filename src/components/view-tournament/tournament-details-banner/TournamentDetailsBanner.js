import Image from 'next/image';
import tournamentDetailsBanner from "@/images/tournament_details_banner.webp"
import { LuClock3 } from "react-icons/lu";
import { PiMoneyWavy } from "react-icons/pi";
import { RiShare2Fill } from "react-icons/ri";

import styles from './tournament-details-banner.module.css'

const TournamentDetailsBanner = () => {
      
  return (
    <div className={styles.tournamentDetailsBannerContainer}>
        <div className={styles.tournamentDetailsBanner}>
            <Image
                src={tournamentDetailsBanner}
                alt='Tournament Details Banner'
            />
        </div>

        <div className={styles.headerContainer}>
            <div className={styles.headerLeft}>
                <h2>Counter strike battle - Unilag</h2>
                <div className={styles.headerDetails}>
                    <p className={styles.tournamentStatus}>Not Yet Started</p>
                    <p className={styles.tournamentTimeRemaining}><LuClock3 className={styles.clockIcon} /> 15 days 13 hours 12 mins</p>
                    <p className={styles.tournamentFee}><PiMoneyWavy className={styles.moneyIcon} /> Entry Fee: <span className={styles.feeSpan}>FREE</span></p>
                </div>
            </div>
            <div className={styles.headerRight}>
                <button className={styles.shareBTN}><RiShare2Fill className={styles.shareIcon} /> Share</button>
                <button className={styles.joinTournamentBTN}>Join Tournament</button>
            </div>
        </div>
    </div>
  )
}

export default TournamentDetailsBanner