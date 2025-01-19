import styles from '../review-basic-info/review-basic-info.module.css';

const ReviewPrizeDistribution = () => {
  const infoSections = [
    { title: "Format", content: "Distributed" },
    { title: "1st Place (Winner)", content: "100 Vent Coins" },
    { title: "2nd Place", content: "80 Vent Coins" },
    { title: "3rd Place", content: "50 Vent Coins" },
    { title: "4th Place", content: "30 Vent Coins" },
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
    </>
  );
};

export default ReviewPrizeDistribution;
