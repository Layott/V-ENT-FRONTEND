import Image from "next/image";
import organizer from "@/images/signed_in_user_small.webp"
import { GoDotFill } from "react-icons/go";
import overviewLtStyles from '@/view-/tournament-left/overview-lt.module.css'

const TournamentDetailsOverviewLeft = () => {
  return (
    <div className={overviewLtStyles.overviewLeft}>
    <div className={overviewLtStyles.descriptionContainer}>
      <h3 className={overviewLtStyles.headerH3}>Description</h3>
      <p className={overviewLtStyles.descriptionParagraph}>Join Us for Counter-Strike Action on Vent!</p>
      <p className={overviewLtStyles.descriptionParagraph}>Are you ready to show off your skills and dominate the battlefield? Join us for an adrenaline-pumping Counter-Strike tournament that promises intense action, strategic gameplay, and unforgettable moments!</p>
      <p className={overviewLtStyles.descriptionParagraph}>Server location: Lagos</p>
      <h4 className={overviewLtStyles.descriptionSubHeading}>Fair Play is Key:</h4>
      <p className={overviewLtStyles.descriptionParagraph}>We&#39;re all about sportsmanship and fair play. If you encounter any issues like cheating or toxicity, please report them using our Report Form. Our dedicated admin team will swiftly handle any misconduct to keep the competition fair and enjoyable for everyone!</p>
    </div>

    <div className={overviewLtStyles.organizerContainer}>
      <h3 className={overviewLtStyles.headerH3}>Organized by:</h3>
      <div className={overviewLtStyles.organizerDetails}>
        <div className={overviewLtStyles.imageContainer}>
          <Image
            src={organizer}
            alt="Organizer Logo"
          />
        </div>

        <div className={overviewLtStyles.organizerNameTag}>
          <p>James Green</p>
          <p>@jamesgreen</p>
        </div>
      </div>

      <div className={overviewLtStyles.dateContainer}>

        <p className={overviewLtStyles.createdDateParagraph}>
          Created:&nbsp;
          <span className={overviewLtStyles.createdDateSpan}>15th September 2024</span>
        </p>

        <GoDotFill className={overviewLtStyles.dotIcon} />
    
        <p className={overviewLtStyles.updatedDateParagraph}>
          Last Updated:&nbsp;
          <span className={overviewLtStyles.updatedDateSpan}>19th September 2024</span>
        </p>

      </div>
    </div>
  </div>
  )
}

export default TournamentDetailsOverviewLeft