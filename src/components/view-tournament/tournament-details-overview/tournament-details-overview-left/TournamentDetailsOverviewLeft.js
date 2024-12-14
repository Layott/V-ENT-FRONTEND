import Image from "next/image";
import organizer from "@/images/signed_in_user_small.webp"
import { GoDotFill } from "react-icons/go";
import tournamentDetailsOverviewStyles from './../tournament-details-overview.module.css'
import styles from './tournament-details-overview-left.module.css'

const TournamentDetailsOverviewLeft = () => {
  return (
    <div className={tournamentDetailsOverviewStyles.overviewLeft}>
    <div className={styles.descriptionContainer}>
      <h3 className={styles.headerH3}>Description</h3>
      <p className={styles.joinUsParagraph}>Join Us for Counter-Strike Action on Vent!</p>
      <p className={styles.tournamentDetailsParagraph}>Are you ready to show off your skills and dominate the battlefield? Join us for an adrenaline-pumping Counter-Strike tournament that promises intense action, strategic gameplay, and unforgettable moments!</p>
      <p>Server location: Lagos</p>
      <div className={styles.fairPlayContainer}>
        <p>Fair Play is Key:</p>
        <p>
          We&#39;re all about sportsmanship and fair play. If you encounter any issues like cheating or toxicity, please report them using our Report Form. Our dedicated admin team will swiftly handle any misconduct to keep the competition fair and enjoyable for everyone!
        </p>
      </div>
    </div>

    <div className={styles.organizerContainer}>
      <h3 className={styles.headerH3}>Organized by:</h3>
      <div className={styles.organizerDetails}>
        <div className={styles.imageContainer}>
          <Image
            src={organizer}
            alt="Organizer Logo"
          />
        </div>

        <div className={styles.organizerNameTag}>
          <p>James Green</p>
          <p>@jamesgreen</p>
        </div>
      </div>

      <div className={styles.dateContainer}>

        <p className={styles.createdDateParagraph}>
          Created:&nbsp;
          <span className={styles.createdDateSpan}>15th September 2024</span>
        </p>

        <GoDotFill className={styles.dotIcon} />
    
        <p className={styles.updatedDateParagraph}>
          Last Updated:&nbsp;
          <span className={styles.updatedDateSpan}>19th September 2024</span>
        </p>

      </div>
    </div>
  </div>
  )
}

export default TournamentDetailsOverviewLeft