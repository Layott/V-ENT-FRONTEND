import Image from 'next/image';
import Link from 'next/link';
import tournamentDetailsBanner from "@/images/event_details_banner.webp"
import { LuClock3 } from "react-icons/lu";
import { PiMoneyWavy } from "react-icons/pi";
import { RiShare2Fill } from "react-icons/ri";
import bannerDetailsStyles from '@/view-/details-banner/tournament-details-banner.module.css'

const EventDetailsBanner = () => {
      
  return (
    <div className={bannerDetailsStyles.tournamentDetailsBannerContainer}>
        <div className={bannerDetailsStyles.tournamentDetailsBanner}>
            <Image
                src={tournamentDetailsBanner}
                alt='Tournament Details Banner'
            />
        </div>

        <div className={bannerDetailsStyles.headerContainer}>
            <div className={bannerDetailsStyles.headerLeft}>
                <h2>Counter strike battle - Unilag</h2>
                <div className={bannerDetailsStyles.headerDetails}>
                    <p className={bannerDetailsStyles.tournamentStatus}>Not Yet Started</p>
                    <p className={bannerDetailsStyles.tournamentTimeRemaining}><LuClock3 className={bannerDetailsStyles.clockIcon} /> 15 days 13 hours 12 mins</p>
                    <p className={bannerDetailsStyles.tournamentFee}><PiMoneyWavy className={bannerDetailsStyles.moneyIcon} /> Entry Fee: <span className={bannerDetailsStyles.feeSpan}>FREE</span></p>
                </div>
            </div>
            <div className={bannerDetailsStyles.headerRight}>
                <button className={bannerDetailsStyles.shareBTN}><RiShare2Fill className={bannerDetailsStyles.shareIcon} /> Share</button>
                <Link href={'/events/register-event'} className={bannerDetailsStyles.joinTournamentBTN}>Register for Event</Link>
            </div>
        </div>
    </div>
  )
}

export default EventDetailsBanner