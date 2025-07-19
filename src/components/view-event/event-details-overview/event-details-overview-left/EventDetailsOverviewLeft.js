import Image from "next/image";
import organizer from "@/images/signed_in_user_small.webp"
import ventLogo from '@/images/logo_mark_red.png';
import redBullLogo from '@/images/red_bull_logo.svg';
import redCarbon from '@/images/carbon_logo.svg';
import carryFirstLogo from '@/images/carry_first_logo.svg';
import cadeEsportsLogo from '@/images/cade_esports.png';
import { GoDotFill } from "react-icons/go";
import overviewLtStyles from '@/view-/tournament-left/overview-lt.module.css'
import styles from './event-details-overview-left.module.css'

const sponsors = [
  {
    name: "V-ENT",
    username: "@V-ENT",
    logo: ventLogo,
  },
  {
    name: "Red Bull",
    username: "@RedBull",
    logo: redBullLogo,
  },
  {
    name: "Carbon",
    username: "@Carbon",
    logo: redCarbon,
  },
  {
    name: "Carry First",
    username: "@CarryFirst",
    logo: carryFirstLogo,
  },
  {
    name: "Cade ESports",
    username: "@cadeEsports",
    logo: cadeEsportsLogo,
  },
  {
    name: "Cade ESports",
    username: "@cadeEsports",
    logo: cadeEsportsLogo,
  },
];

const EventDetailsOverviewLeft = ({ event }) => {
  // Format dates
  const formatDate = (dateStr) => {
    if (!dateStr) return 'Date not set';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  // Get event sponsors or use defaults
  const eventSponsors = event?.sponsors || sponsors;

  return (
    <div className={overviewLtStyles.overviewLeft}>
      <div className={overviewLtStyles.descriptionContainer}>
        <h3 className={overviewLtStyles.headerH3}>Description</h3>
        
        {event?.description ? (
          <div 
            dangerouslySetInnerHTML={{ 
              __html: event.description.replace(/\n/g, '<br/>') 
            }} 
            className={overviewLtStyles.descriptionParagraph}
          />
        ) : (
          <>
            <p className={overviewLtStyles.descriptionParagraph}>
              Join us for an exciting {event?.game || 'gaming'} experience!
            </p>
            <p className={overviewLtStyles.descriptionParagraph}>
              Ready for a day of immersive {event?.game || 'gaming'} action? Join us for an esports event like no other, where you can team up with other players, showcase your skills, and enjoy the thrill of competitive gameplay!
            </p>
            <h4 className={overviewLtStyles.descriptionSubHeading}>What to Expect:</h4>
            <p className={overviewLtStyles.descriptionParagraph}>
              Casual and Competitive Play: Whether you're in it for fun or to prove your skills, there's something for everyone. Jump into friendly matches or take part in high-stakes challenges.
            </p>
            <p className={overviewLtStyles.descriptionParagraph}>
              Skill Showcases: Watch and learn from experienced players as they demonstrate advanced strategies, tactics, and game mechanics.
            </p>
            <p className={overviewLtStyles.descriptionParagraph}>
              Community Connection: Meet and network with other gamers, share tips, and celebrate the love of {event?.game || 'gaming'} together.
            </p>
          </>
        )}
      </div>

      <div className={styles.sponsorOuterContainer}>
        <h3 className={overviewLtStyles.headerH3}>Sponsors</h3>

        <div className={styles.sponsorsContainer}>
          {eventSponsors.map((sponsor, index) => (
            <div key={index}>
              <div className={styles.sponsorContainer}>
                <div className={styles.logoImageContainer}>
                  <Image src={sponsor.logo} alt={`${sponsor.name} Logo`} />
                </div>
                <p className={styles.username}>{sponsor.username}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className={overviewLtStyles.organizerContainer}>
        <h3 className={overviewLtStyles.headerH3}>Organized by:</h3>
        <div className={overviewLtStyles.organizerDetails}>
          <div className={overviewLtStyles.imageContainer}>
            <Image
              src={event?.organizer?.profile_image || organizer}
              alt="Organizer Logo"
            />
          </div>

          <div className={overviewLtStyles.organizerNameTag}>
            <p>{event?.organizer?.name || event?.organizer_name || 'Event Organizer'}</p>
            <p>@{event?.organizer?.username || event?.organizer_username || 'organizer'}</p>
          </div>
        </div>

        <div className={overviewLtStyles.dateContainer}>
          <p className={overviewLtStyles.createdDateParagraph}>
            Created:&nbsp;
            <span className={overviewLtStyles.createdDateSpan}>
              {formatDate(event?.created_at)}
            </span>
          </p>

          <GoDotFill className={overviewLtStyles.dotIcon} />
      
          <p className={overviewLtStyles.updatedDateParagraph}>
            Last Updated:&nbsp;
            <span className={overviewLtStyles.updatedDateSpan}>
              {formatDate(event?.updated_at)}
            </span>
          </p>
        </div>
      </div>
    </div>
  )
}

export default EventDetailsOverviewLeft