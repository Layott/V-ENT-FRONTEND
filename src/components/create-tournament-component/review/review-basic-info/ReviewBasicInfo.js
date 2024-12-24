import Image from 'next/image';
import sampleImage from '@/images/new_tournament_5.jpg'
import styles from './review-basic-info.module.css';

const ReviewBasicInfo = () => {
  const infoSections = [
    { title: "Tournament Type", content: "Virtual" },
    { title: "Tournament Start Date", content: "21st Oct 2024" },
    { title: "Tournament Start Time", content: "03:15 am" },
    { title: "Tournament End Date", content: "21st Oct 2024" },
    { title: "Tournament End Time", content: "03:15 am" },
    { title: "Venue", content: "Unilag, Lagos" },
    { title: "Virtual Link", content: "https://chat.whatsapp.com/BX6jTRvEvrBGNHgNwqWJFW" },
    { title: "Tournament Visibility", content: "Public" },
    { title: "Entry Type", content: "Paid" },
    { title: "Entry Fee", content: "50 v-ent coins" },
    { title: "Registration Start Date", content: "21st Oct 2024" },
    { title: "Registration End Date", content: "21st Oct 2024" },
  ];

  return (
    <>
      {/* Hardcoded Section: Tournament Title */}
      <div className={`${styles.infoContainer} ${styles.staticInfoContainer}`}>
        <div className={styles.leftSideContainer}>
          <h3>Tournament Title</h3>
        </div>
        <div className={styles.rightSideContainer}>
          <p>Leagues of Legend - Unilag Showdown 2024</p>
        </div>
      </div>

      {/* Hardcoded Section: Game */}
      <div className={styles.infoContainer}>
        <div className={styles.leftSideContainer}>
          <h3>Game</h3>
        </div>
        <div className={styles.rightSideContainer}>
          <p>Tekken</p>
        </div>
      </div>

      {/* Hardcoded Section: Game Mode */}
      <div className={styles.infoContainer}>
        <div className={styles.leftSideContainer}>
          <h3>Game Mode</h3>
        </div>
        <div className={styles.rightSideContainer}>
          <p>Battle Royale</p>
        </div>
      </div>

      {/* Hardcoded Section: Tournament Description */}
      <div className={`${styles.infoContainer} ${styles.descriptionInfoContainer}`}>
        <div className={`${styles.leftSideContainer} ${styles.leftSideDescriptionContainer}`}>
          <h3>Tournament Description</h3>
        </div>
        <div className={styles.rightSideContainer}>
          <p>Join Us for Counter-Strike Action on Vent!</p>
          <p>
            Are you ready to show off your skills and dominate the battlefield? Join us for an
            adrenaline-pumping Counter-Strike tournament that promises intense action, strategic
            gameplay, and unforgettable moments!
          </p>
        </div>
      </div>

      {/* Dynamic Sections */}
      {infoSections.map((section, index) => (
        <div key={index} className={styles.infoContainer}>
          <div className={styles.leftSideContainer}>
            <h3>{section.title}</h3>
          </div>
          <div className={styles.rightSideContainer}>
            <p>{section.content}</p>
          </div>
        </div>
      ))}

      {/* Hardcoded Section: Linked Event */}
      <div className={`${styles.infoContainer} ${styles.staticInfoContainer}`}>
        <div className={styles.leftSideContainer}>
          <h3>Linked Event</h3>
        </div>
        <div className={styles.rightSideContainer}>
          <p>Leagues of Legend - Unilag Showdown 2024</p>
        </div>
      </div>

      {/* Hardcoded Section: Tournament Banner */}
      <div className={`${styles.infoContainer} ${styles.staticInfoContainer}`}>
        <div className={styles.leftSideContainer}>
          <h3>Tournament Banner</h3>
        </div>
        <div className={styles.rightSideContainer}>
          <div className={styles.bannerImageContainer}>
            <Image
              src={sampleImage}
              alt="Review Banner"
            />
          </div>
        </div>
      </div>
    </>
  );
};

export default ReviewBasicInfo;
