import styles from '../review-basic-info/review-basic-info.module.css';

const ReviewFormatParticipants = () => {
  const infoSections = [
    { title: "Tournament Format", content: "Single Elimination" },
    { title: "Tournament Access", content: "Teams and Individual" },
    { title: "Player size", content: "Squad" },
    { title: "Min number of participants", content: 48 },
    { title: "Max number of participants", content: 48 },
  ];

  return (
    <>
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

      <div className={`${styles.infoContainer} ${styles.descriptionInfoContainer}`}>
        <div className={`${styles.leftSideContainer} ${styles.leftSideDescriptionContainer}`}>
          <h3>Tournament Rules</h3>
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

    </>
  );
};

export default ReviewFormatParticipants;
