import { useState } from 'react'
import ProgressMenu from './progress-menu/ProgressMenu'
import BasicInfo from './basic-info/BasicInfo'
import FormatParticipants from './format-participants/FormatParticipants'
import PrizeDistribution from './prize-distribution/PrizeDistribution'
import SponsorsLinks from './sponsors-links/SponsorsLinks'
import Review from './review/Review'
import styles from './create-tournament-component.module.css'

const CreateTournamentComponent = () => {
  const [selectedTab, setSelectedTab] = useState(1);

  const renderTabContent = () => {
    switch (selectedTab) {
      case 1:
        return <BasicInfo setSelectedTab={setSelectedTab} />;
      case 2:
        return <FormatParticipants setSelectedTab={setSelectedTab} />;
      case 3:
        return <PrizeDistribution setSelectedTab={setSelectedTab} />;
      case 4:
        return <SponsorsLinks setSelectedTab={setSelectedTab} />;
      case 5:
        return <Review setSelectedTab={setSelectedTab} />;
      default:
        return <BasicInfo setSelectedTab={setSelectedTab} />;
    }
  };

  return (
    <div className={styles.createTournamentContainer}>
      <ProgressMenu selectedTab={selectedTab} setSelectedTab={setSelectedTab} />
      <div className={styles.renderTabContent}>{renderTabContent()}</div>
    </div>
  );
};

export default CreateTournamentComponent;
