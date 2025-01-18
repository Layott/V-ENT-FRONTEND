import styles from './event-details-tournaments-left.module.css'

const EventDetailsTournamentsLeft = () => {
  return (
    <div className={styles.tournamentDetailsRulesLeft}>
        <div className={styles.rulesContainer}>
            <h3 className={styles.headerH3}>Tournament Rules</h3>

            <div className={styles.rules}>
                <div className={styles.respectConduct}>
                    <p className={styles.respectConductParagraph}>
                        <span className={styles.respectConductTitle}>Respect Conduct:</span> &nbsp;
                        <span className={styles.respectConductText}>No toxic behavior or harassment. Be respectful to all participants.</span>
                    </p>
                </div>

                <div className={styles.gameSettings}>
                    <p className={styles.gameSettingsParagraph}>
                        <span className={styles.gameSettingsTitle}>Game Settings:</span> &nbsp;
                        <span className={styles.gameSettingsText}>Matches are 5v5 on Counter-Strike 2 with standard competitive settings.</span>
                    </p>
                </div>

                <div className={styles.matchFormat}>
                    <h4>Match Format:</h4>
                    <p className={styles.mapSelectionParagraph}>
                        <span className={styles.mapSelectionTitle}>Map Selection:</span> &nbsp;
                        <span className={styles.mapSelectionText}>Chosen via veto process.</span>
                    </p>

                    <p className={styles.overtimeParagraph}>
                        <span className={styles.overtimeTitle}>Overtime:</span> &nbsp;
                        <span className={styles.overtimeText}>Played if tied after 30 rounds.</span>
                    </p>
                </div>


                <div className={styles.cheating}>
                    <p className={styles.cheatingParagraph}>
                        <span className={styles.cheatingTitle}>Cheating:</span> &nbsp;
                        <span className={styles.cheatingText}>Any form of cheating or using exploits leads to immediate disqualification.</span>
                    </p>
                </div>

                <div className={styles.accountUse}>
                    <p className={styles.accountUseParagraph}>
                        <span className={styles.accountUseTitle}>Account Use:</span> &nbsp;
                        <span className={styles.accountUseText}>Only one account per player is allowed.</span>
                    </p>
                </div>

                <div className={styles.reporting}>
                    <p className={styles.reportingParagraph}>
                        <span className={styles.reportingTitle}>Reporting:</span> &nbsp;
                        <span className={styles.reportingText}>Report rule violations using the Report Form.</span>
                    </p>
                </div>

                <div className={styles.prize}>
                    <p className={styles.prizeParagraph}>
                        <span className={styles.prizeTitle}>Prize:</span> &nbsp;
                        <span className={styles.prizeText}>Awarded based on final standings.</span>
                    </p>
                </div>

                <div className={styles.tiebreakers}>
                    <p className={styles.tiebreakersParagraph}>
                        <span className={styles.tiebreakersTitle}>Tiebreakers:</span> &nbsp;
                        <span className={styles.tiebreakersText}>In case of two or more teams having the same total score in the final match the winner will be decided using the following tiebreaker rules in order:</span>
                    </p>
                    <ul>
                        <li>Total kills in the match.</li>
                        <li>Most points in singular game in the match (kills + placement).</li>
                        <li>Most kills in a singular game in the match.</li>
                        <li>Most kills in last game.</li>
                        <li>Placement in most recent map.</li>
                        <li>Coin flip.</li>
                    </ul>
                </div>

                <p>Play fair and have fun!</p>
            </div>

        </div>
    </div>
  )
}

export default EventDetailsTournamentsLeft