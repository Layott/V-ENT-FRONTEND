import styles from './event-details-tournaments-left.module.css'

const EventDetailsTournamentsLeft = ({ event }) => {
  // Default rules as fallback when no backend rules are provided
  const getDefaultGameRules = (game) => {
    const gameLower = game?.toLowerCase() || '';
    
    if (gameLower.includes('free fire')) {
      return {
        respectConduct: "No toxic behavior, harassment, or unsportsmanlike conduct. Be respectful to all participants and organizers.",
        gameSettings: "Battle Royale matches with 50 players, standard Free Fire competitive settings.",
        mapSelection: "Bermuda, Purgatory, or Kalahari as per tournament bracket.",
        overtime: "Final zone determines winner if multiple teams survive.",
        cheating: "Any form of cheating, hacking, exploiting, or use of unauthorized third-party software leads to immediate disqualification.",
        accountUse: "Only one account per player is allowed. Account sharing or smurfing is prohibited.",
        reporting: "Report rule violations, technical issues, or disputes to tournament organizers immediately.",
        prize: `Prizes awarded based on final tournament standings.${event?.entry_fee ? ` Entry fee: ₦${parseFloat(event.entry_fee).toLocaleString()}` : ''}`,
        tiebreakers: [
          "Total eliminations in the match.",
          "Highest placement in final circle.",
          "Most eliminations in a single match.",
          "Most damage dealt in final match.",
          "Survival time in last match.",
          "Random selection by organizers."
        ]
      };
    } else if (gameLower.includes('counter-strike') || gameLower.includes('cs2')) {
      return {
        respectConduct: "No toxic behavior, harassment, or unsportsmanlike conduct. Be respectful to all participants and organizers.",
        gameSettings: "Matches are 5v5 on Counter-Strike 2 with standard competitive settings.",
        mapSelection: "Chosen via veto process.",
        overtime: "Played if tied after 30 rounds.",
        cheating: "Any form of cheating, hacking, exploiting, or use of unauthorized third-party software leads to immediate disqualification.",
        accountUse: "Only one account per player is allowed. Account sharing or smurfing is prohibited.",
        reporting: "Report rule violations, technical issues, or disputes to tournament organizers immediately.",
        prize: `Prizes awarded based on final tournament standings.${event?.entry_fee ? ` Entry fee: ₦${parseFloat(event.entry_fee).toLocaleString()}` : ''}`,
        tiebreakers: [
          "Total kills in the match.",
          "Most points in singular game in the match (kills + placement).",
          "Most kills in a singular game in the match.",
          "Most kills in last game.",
          "Placement in most recent map.",
          "Coin flip."
        ]
      };
    } else {
      return {
        respectConduct: "No toxic behavior, harassment, or unsportsmanlike conduct. Be respectful to all participants and organizers.",
        gameSettings: `Standard competitive ${game || 'gaming'} settings as per official tournament guidelines.`,
        mapSelection: "Maps selected according to tournament format.",
        overtime: "Extra rounds/time played if match is tied.",
        cheating: "Any form of cheating, hacking, exploiting, or use of unauthorized third-party software leads to immediate disqualification.",
        accountUse: "Only one account per player is allowed. Account sharing or smurfing is prohibited.",
        reporting: "Report rule violations, technical issues, or disputes to tournament organizers immediately.",
        prize: `Prizes awarded based on final tournament standings.${event?.entry_fee ? ` Entry fee: ₦${parseFloat(event.entry_fee).toLocaleString()}` : ''}`,
        tiebreakers: [
          "Total score/eliminations in the match.",
          "Best individual performance in the match.",
          "Performance in final round/game.",
          "Head-to-head record if applicable.",
          "Random selection by organizers."
        ]
      };
    }
  };

  // Use backend rules if available, otherwise use defaults
  const defaultRules = getDefaultGameRules(event?.game);
  
  const rules = {
    respectConduct: event?.rules?.respect_conduct || event?.respect_conduct || defaultRules.respectConduct,
    gameSettings: event?.rules?.game_settings || event?.game_settings || defaultRules.gameSettings,
    mapSelection: event?.rules?.map_selection || event?.map_selection || defaultRules.mapSelection,
    overtime: event?.rules?.overtime || event?.overtime || defaultRules.overtime,
    cheating: event?.rules?.cheating || event?.cheating || defaultRules.cheating,
    accountUse: event?.rules?.account_use || event?.account_use || defaultRules.accountUse,
    reporting: event?.rules?.reporting || event?.reporting || defaultRules.reporting,
    prize: event?.rules?.prize || event?.prize || defaultRules.prize,
    tiebreakers: event?.rules?.tiebreakers || event?.tiebreakers || defaultRules.tiebreakers,
    additionalRules: event?.rules?.additional_rules || event?.additional_rules || null
  };

  return (
    <div className={styles.tournamentDetailsRulesLeft}>
        <div className={styles.rulesContainer}>
            <h3 className={styles.headerH3}>Tournament Rules</h3>

            <div className={styles.rules}>
                <div className={styles.respectConduct}>
                    <p className={styles.respectConductParagraph}>
                        <span className={styles.respectConductTitle}>Respect & Conduct:</span> &nbsp;
                        <span className={styles.respectConductText}>{rules.respectConduct}</span>
                    </p>
                </div>

                <div className={styles.gameSettings}>
                    <p className={styles.gameSettingsParagraph}>
                        <span className={styles.gameSettingsTitle}>Game Settings:</span> &nbsp;
                        <span className={styles.gameSettingsText}>{rules.gameSettings}</span>
                    </p>
                </div>

                <div className={styles.matchFormat}>
                    <h4 className={styles.matchFormatH4}>Match Format:</h4>
                    <p className={styles.mapSelectionParagraph}>
                        <span className={styles.mapSelectionTitle}>Map/Mode Selection:</span> &nbsp;
                        <span className={styles.mapSelectionText}>{rules.mapSelection}</span>
                    </p>

                    <p className={styles.overtimeParagraph}>
                        <span className={styles.overtimeTitle}>Tiebreaker Rules:</span> &nbsp;
                        <span className={styles.overtimeText}>{rules.overtime}</span>
                    </p>
                </div>

                <div className={styles.cheating}>
                    <p className={styles.cheatingParagraph}>
                        <span className={styles.cheatingTitle}>Fair Play:</span> &nbsp;
                        <span className={styles.cheatingText}>{rules.cheating}</span>
                    </p>
                </div>

                <div className={styles.accountUse}>
                    <p className={styles.accountUseParagraph}>
                        <span className={styles.accountUseTitle}>Account Requirements:</span> &nbsp;
                        <span className={styles.accountUseText}>{rules.accountUse}</span>
                    </p>
                </div>

                <div className={styles.reporting}>
                    <p className={styles.reportingParagraph}>
                        <span className={styles.reportingTitle}>Reporting Issues:</span> &nbsp;
                        <span className={styles.reportingText}>{rules.reporting}</span>
                    </p>
                </div>

                <div className={styles.prize}>
                    <p className={styles.prizeParagraph}>
                        <span className={styles.prizeTitle}>Prize Distribution:</span> &nbsp;
                        <span className={styles.prizeText}>{rules.prize}</span>
                    </p>
                </div>

                {/* Only show tiebreakers section if there are tiebreakers */}
                {rules.tiebreakers && rules.tiebreakers.length > 0 && (
                    <div className={styles.tiebreakers}>
                        <p className={styles.tiebreakersParagraph}>
                            <span className={styles.tiebreakersTitle}>Final Standings Tiebreakers:</span> &nbsp;
                            <span className={styles.tiebreakersText}>In case of teams having the same final score, winners will be determined using the following tiebreaker rules in order:</span>
                        </p>
                        <ul>
                            {rules.tiebreakers.map((rule, index) => (
                                <li key={index}>{rule}</li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Show additional rules if provided from backend */}
                {rules.additionalRules && (
                    <div className={styles.additionalRules}>
                        <h4 className={styles.additionalRulesH4}>Additional Rules:</h4>
                        <div 
                            dangerouslySetInnerHTML={{ 
                                __html: rules.additionalRules.replace(/\n/g, '<br/>') 
                            }} 
                            className={styles.additionalRulesParagraph}
                        />
                    </div>
                )}

                <div className={styles.generalNote}>
                    <p><strong>Important:</strong> All participants must check in 30 minutes before the event start time. Late arrivals may result in disqualification.</p>
                    <p><strong>Event Type:</strong> {event?.event_type === 'physical' ? 'Physical/LAN Event' : 'Online Tournament'}</p>
                    <p>Play fair, have fun, and good luck to all participants! 🎮</p>
                </div>
            </div>
        </div>
    </div>
  )
}

export default EventDetailsTournamentsLeft;