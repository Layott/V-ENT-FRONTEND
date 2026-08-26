import { useState } from "react";
import TournamentsHistory from "./team-profile-tournaments-history/TeamProfileTournamentsHistory";
import TeamEventsHistory from "./team-profile-events-history/TeamEventsHistory";
import profileStyles from "@/styles/profile/profile-page.module.css";
import styles from './team-profile-activity.module.css';
import { useT } from '@/i18n/LanguageProvider';
const TeamProfileActivity = ({
  teamId
}) => {
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

      {selectedTab === "tournaments" ? <TournamentsHistory teamId={teamId} /> : <TeamEventsHistory teamId={teamId} />}

    </div>;
};
export default TeamProfileActivity;