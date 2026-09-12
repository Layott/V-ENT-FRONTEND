import styles from './tournament-details-rules-left.module.css'

const TournamentDetailsRulesLeft = () => {
  return (
    <div className={styles.tournamentDetailsRulesLeft}>
        <div className={styles.rulesContainer}>
            <h3 className={styles.headerH3}>Tournament Rules</h3>

            <div className={styles.rules}>
                <div>
                    <p>
                        <span>Respect Conduct:</span> &nbsp;
                        <span>No toxic behavior or harassment. Be respectful to all participants.</span>
                    </p>
                </div>

                <div>
                    <p>
                        <span>Game Settings:</span> &nbsp;
                        <span>Matches are 5v5 on Counter-Strike 2 with standard competitive settings.</span>
                    </p>
                </div>

                <div className={styles.matchFormat}>
                    <h4>Match Format:</h4>
                    <p>
                        <span>Map Selection:</span> &nbsp;
                        <span>Chosen via veto process.</span>
                    </p>

                    <p>
                        <span>Overtime:</span> &nbsp;
                        <span>Played if tied after 30 rounds.</span>
                    </p>
                </div>


                <div>
                    <p>
                        <span>Cheating:</span> &nbsp;
                        <span>Any form of cheating or using exploits leads to immediate disqualification.</span>
                    </p>
                </div>

                <div>
                    <p>
                        <span>Account Use:</span> &nbsp;
                        <span>Only one account per player is allowed.</span>
                    </p>
                </div>

                <div>
                    <p>
                        <span>Reporting:</span> &nbsp;
                        <span>Report rule violations using the Report Form.</span>
                    </p>
                </div>

                <div>
                    <p>
                        <span>Prize:</span> &nbsp;
                        <span>Awarded based on final standings.</span>
                    </p>
                </div>

                <div>
                    <p>
                        <span>Tiebreakers:</span> &nbsp;
                        <span>In case of two or more teams having the same total score in the final match the winner will be decided using the following tiebreaker rules in order:</span>
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

export default TournamentDetailsRulesLeft