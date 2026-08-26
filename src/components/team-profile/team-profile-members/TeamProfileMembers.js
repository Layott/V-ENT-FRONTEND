import { useState } from 'react';
import MembersTabComponent from './MembersTabComponent';
import MembersRequestsTabComponent from './MembersRequestsTabComponent';
import profileStyles from "@/styles/profile/profile-page.module.css";
import tableStyles from "@/styles/modules/tables/tables.module.css";
import tabStyles from '@/styles/modules/tabs/tabs.module.css';
import styles from './team-members.module.css';
import { useT } from '@/i18n/LanguageProvider';
const TeamProfileMembers = ({
  teamId
}) => {
  const tt = useT();
  const [activeTab, setActiveTab] = useState('requests');
  const handleTabClick = tab => {
    setActiveTab(tab);
  };
  return <div className={tableStyles.tournamentDetailsParticipantsContainer}>
      <div className={styles.tabsAndDetailsContainer}>
        <div className={tabStyles.borderTabBTNContainer}>
          <button className={`${tabStyles.borderTabBTN} ${activeTab === 'members' ? tabStyles.active : ''}`} onClick={() => handleTabClick('members')}>
            {tt("ui.members.1cb4", "Members")}
          </button>

          <button className={`${tabStyles.borderTabBTN} ${styles.requestsBTN} ${activeTab === 'requests' ? tabStyles.active : ''}`} onClick={() => handleTabClick('requests')}>
            {tt("ui.requests.f719", "Requests")}
            <p className={styles.requestNumberParagraph}>
              <span className={styles.requestNumberSpan}>2</span>
            </p>
          </button>
        </div>
      </div>

      <>
        {activeTab === 'members' && <MembersTabComponent teamId={teamId} />}

        {activeTab === 'requests' && <MembersRequestsTabComponent teamId={teamId} />}
      </>



    </div>;
};
export default TeamProfileMembers;