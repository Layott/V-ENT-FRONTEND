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

  // Helper function to get ordinal suffix
  const getOrdinalSuffix = (position) => {
    const num = parseInt(position);
    if (num === 1) return `${num}st Place`;
    if (num === 2) return `${num}nd Place`;
    if (num === 3) return `${num}rd Place`;
    return `${num}th Place`;
  };

  if (!tournament) return <div>Loading prize information...</div>;

  // Enhanced debugging
  console.log('Tournament data in Prize component:', tournament);
  console.log('Prize distributions:', tournament.prize_distributions);
  console.log('Prize distributions length:', tournament.prize_distributions?.length);
  console.log('Is prize_distributions an array?', Array.isArray(tournament.prize_distributions));

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

          {/* Debug: Show what we're checking */}
          {console.log('Checking condition:', tournament.prize_distributions && tournament.prize_distributions.length > 0)}
          
          {tournament.prize_distributions && tournament.prize_distributions.length > 0 ? (
            tournament.prize_distributions
              .sort((a, b) => a.position - b.position) // Sort by position
              .map((prizeDistribution, index) => {
                console.log('Rendering prize:', prizeDistribution); // Debug each prize
                return (
                  <div key={prizeDistribution.id || index} className={`${styles.gridRow}`}>
                    <div className={styles.gridItem}>
                      {getOrdinalSuffix(prizeDistribution.position)}
                    </div>
                    <div className={styles.gridItem}>
                      ${prizeDistribution.prize}
                    </div>
                    <div className={styles.gridItem}>
                      {prizeDistribution.extras || '-'}
                    </div>
                  </div>
                );
              })
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
            tournament.prize_distributions
              .sort((a, b) => a.position - b.position) // Sort by position
              .map((prizeDistribution, index) => (
                <div key={prizeDistribution.id || index} className={styles.tournamentsPrizeBoxMobile}>

                  <div className={styles.prizeRow}>
                    <h4>Position</h4>
                    <p>{getOrdinalSuffix(prizeDistribution.position)}</p>
                  </div>

                  <div className={styles.prizeRow}>
                    <h4>Prize</h4>
                    <p>${prizeDistribution.prize}</p>
                  </div>

                  <div className={styles.prizeRow}>
                    <h4>Bonuses</h4>
                    <p>{prizeDistribution.extras || '-'}</p>
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
            Tournament ID:&nbsp;
            <span className={styles.createdDateSpan}>
              {tournament.tournament_id || 'N/A'}
            </span>
          </p>

          <GoDotFill className={styles.dotIcon} />

          <p className={styles.updatedDateParagraph}>
            Total Prize Pool:&nbsp;
            <span className={styles.updatedDateSpan}>
              {tournament.prize_distributions ? 
                `$${tournament.prize_distributions.reduce((total, prize) => total + parseFloat(prize.prize), 0).toFixed(2)}` 
                : 'N/A'
              }
            </span>
          </p>
        </div>

      </div>

    </div>
  )
}

export default TournamentDetailsPrize;