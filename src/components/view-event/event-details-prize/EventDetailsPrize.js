import { eventResults } from './eventResults'
import { GoDotFill } from "react-icons/go";
import styles from './event-details-prize.module.css'

const EventDetailsPrize = () => {

  return (
    <div className={styles.prizeContainer}>

      <div className={`${styles.tournamentsPrizeTable}`}>

        <h3 className={styles.headerH3}>Price Distribution</h3>
        
        <div className={`${styles.tournamentsPrizeInnerTable}`}>
          <div className={styles.gridHeader}>
            <div className={`${styles.gridItem} ${styles.gridItemHeader}`}>Position</div>
            <div className={`${styles.gridItem} ${styles.gridItemHeader}`}>Prize</div>
            <div className={`${styles.gridItem} ${styles.gridItemHeader}`}>Bonuses</div>
          </div>

          {eventResults.map((eventResult, index) => (
            <div key={index} className={`${styles.gridRow}`}>
              <div className={styles.gridItem}>{eventResult.position}</div>
              <div className={styles.gridItem}>{eventResult.prize}</div>
              <div className={styles.gridItem}>{eventResult.bonus}</div>
            </div>
          ))}
        </div>

        <div className={`${styles.tournamentsPrizeInnerTableMobile}`}>

          {eventResults.map((eventResult, index) => (
            <div key={index} className={styles.tournamentsPrizeBoxMobile}>

              <div className={styles.prizeRow}>
                <h4>Position</h4>
                <p>{eventResult.position}</p>
              </div>

              <div className={styles.prizeRow}>
                <h4>Prize</h4>
                <p>{eventResult.prize}</p>
              </div>

              <div className={styles.prizeRow}>
                <h4>Bonuses</h4>
                <p>{eventResult.bonus}</p>
              </div>

            </div>
          
          ))}

        </div>

          <div className={styles.horizontalLine}>

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

export default EventDetailsPrize