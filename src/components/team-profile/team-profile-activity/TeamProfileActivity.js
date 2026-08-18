import { useState } from "react";
import TournamentsHistory from "./team-profile-tournaments-history/TeamProfileTournamentsHistory";
import TeamEventsHistory from "./team-profile-events-history/TeamEventsHistory";
import profileStyles from "@/styles/profile/profile-page.module.css"
import styles from './team-profile-activity.module.css'

const TeamProfileActivity = ({ teamId }) => {
  const [selectedTab, setSelectedTab] = useState("tournaments")

  return (
    <div className={styles.activityContainer}>
      <div className={styles.tabContainer}>
        <button
          className={`${profileStyles.backLayerColor} ${styles.historyBTN}
            ${styles.tournamentBTN} ${selectedTab === "tournaments" ? styles.activeTab : ""
          }`}
          onClick={() => setSelectedTab("tournaments")}
        >
          Tournament History
        </button>

        <button
          className={`${profileStyles.backLayerColor} ${styles.historyBTN}
            ${styles.eventBTN} ${selectedTab === "events" ? styles.activeTab : ""
          }`} 
          onClick={() => setSelectedTab("events")}
        >
          Event History
        </button>
      </div>

      {selectedTab === "tournaments" ? (
        <TournamentsHistory teamId={teamId} />
      ) : (
        <TeamEventsHistory teamId={teamId} />
      )}

    </div>
  )
}

export default TeamProfileActivity