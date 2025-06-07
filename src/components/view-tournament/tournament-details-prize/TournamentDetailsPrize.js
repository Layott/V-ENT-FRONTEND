import { GoDotFill } from "react-icons/go";
import styles from './tournament-details-prize.module.css'

const TournamentDetailsPrize = ({ tournament }) => {

  // Helper function to format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  if (!tournament) return null;

  return (
    <div className={styles.prizeContainer}>

      <div className={`${styles.tournamentsPrizeTable}`}>

        <h3 className={styles.headerH3}>Prize Distribution</h3>
        
        <div className={`${styles.tournamentsPrizeInnerTable}`}>
          <div className={styles.gridHeader}>
            <div className={`${styles.gridItem} ${styles.gridItemHeader}`}>Position</div>
            <div className={`${styles.gridItem} ${styles.gridItemHeader}`}>Prize</div>
            <div className={`${styles.gridItem} ${styles.gridItemHeader}`}>Bonuses</div>
          </div>

          {tournament.prize_distributions && tournament.prize_distributions.length > 0 ? (
            tournament.prize_distributions.map((prizeDistribution, index) => (
              <div key={index} className={`${styles.gridRow}`}>
                <div className={styles.gridItem}>{prizeDistribution.position || `${index + 1}${index === 0 ? 'st' : index === 1 ? 'nd' : index === 2 ? 'rd' : 'th'} Place`}</div>
                <div className={styles.gridItem}>N {prizeDistribution.prize}</div>
                <div className={styles.gridItem}>{prizeDistribution.bonus || '-'}</div>
              </div>
            ))
          ) : (
            <div className={`${styles.gridRow}`}>
              <div className={styles.gridItem} style={{gridColumn: '1 / -1', textAlign: 'center'}}>
                No prize distribution available
              </div>
            </div>
          )}
        </div>

        <div className={`${styles.tournamentsPrizeInnerTableMobile}`}>

          {tournament.prize_distributions && tournament.prize_distributions.length > 0 ? (
            tournament.prize_distributions.map((prizeDistribution, index) => (
              <div key={index} className={styles.tournamentsPrizeBoxMobile}>

                <div className={styles.prizeRow}>
                  <h4>Position</h4>
                  <p>{prizeDistribution.position || `${index + 1}${index === 0 ? 'st' : index === 1 ? 'nd' : index === 2 ? 'rd' : 'th'} Place`}</p>
                </div>

                <div className={styles.prizeRow}>
                  <h4>Prize</h4>
                  <p>N {prizeDistribution.prize}</p>
                </div>

                <div className={styles.prizeRow}>
                  <h4>Bonuses</h4>
                  <p>{prizeDistribution.bonus || '-'}</p>
                </div>

              </div>
            ))
          ) : (
            <div className={styles.tournamentsPrizeBoxMobile}>
              <p style={{textAlign: 'center'}}>No prize distribution available</p>
            </div>
          )}

        </div>

          <div className={styles.horizontalLine}>

          </div>

          <div className={styles.dateContainer}>
            <p className={styles.createdDateParagraph}>
              Created:&nbsp;
              <span className={styles.createdDateSpan}>
                {tournament.created_at ? formatDate(tournament.created_at) : 'N/A'}
              </span>
            </p>

            <GoDotFill className={styles.dotIcon} />

            <p className={styles.updatedDateParagraph}>
              Last Updated:&nbsp;
              <span className={styles.updatedDateSpan}>
                {tournament.updated_at ? formatDate(tournament.updated_at) : 'N/A'}
              </span>
            </p>
          </div>

      </div>

    </div>
  )
}

export default TournamentDetailsPrize;