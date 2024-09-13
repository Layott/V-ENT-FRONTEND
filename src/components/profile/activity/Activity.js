import { useState } from "react";
import TournamentsHistory from "./tournaments-history/TournamentsHistory";
import EventsHistory from "./events-history/EventsHistory";
import profileStyles from "@/styles/profile/profile-page.module.css"
import styles from './activity.module.css'

const Activity = () => {
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
        <TournamentsHistory />
      ) : (
        <EventsHistory />
      )}

    </div>
  )
}

export default Activity