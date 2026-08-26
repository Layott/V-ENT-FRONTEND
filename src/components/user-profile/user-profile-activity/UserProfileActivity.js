import { useState } from "react";
import TournamentsHistory from "./user-profile-tournaments-history/UserProfileTournamentsHistory";
import EventsHistory from "./user-profile-events-history/UserEventsHistory";
import profileStyles from "@/styles/profile/profile-page.module.css";
import styles from './user-profile-activity.module.css';
import { useT } from '@/i18n/LanguageProvider';
const UserProfileActivity = () => {
  const tt = useT();
  const [selectedTab, setSelectedTab] = useState("tournaments");
  return <div className={styles.activityContainer}>
      <div className={styles.tabContainer}>
        <button className={`${profileStyles.backLayerColor} ${styles.historyBTN}
            ${styles.tournamentBTN} ${selectedTab === "tournaments" ? styles.activeTab : ""}`} onClick={() => setSelectedTab("tournaments")}>
          {tt("ui.tournament.history.5f75", "Tournament History")}
        </button>

        <button className={`${profileStyles.backLayerColor} ${styles.historyBTN}
            ${styles.eventBTN} ${selectedTab === "events" ? styles.activeTab : ""}`} onClick={() => setSelectedTab("events")}>
          {tt("ui.event.history.79cd", "Event History")}
        </button>
      </div>

      {selectedTab === "tournaments" ? <TournamentsHistory /> : <EventsHistory />}

    </div>;
};
export default UserProfileActivity;