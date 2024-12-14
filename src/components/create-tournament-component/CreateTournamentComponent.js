import { useState } from 'react'
import ProgressMenu from './progress-menu/ProgressMenu'
import BasicInfo from './basic-info/BasicInfo'
import FormatParticipants from './format-participants/FormatParticipants'
import PrizeDistribution from './prize-distribution/PrizeDistribution'
import SponsorsLinks from './sponsors-links/SponsorsLinks'
import Review from './review/Review'
import styles from './create-tournament-component.module.css'

const CreateTournamentComponent = () => {
  // const [selectedTab, setSelectedTab] = useState(1);
  // const [selectedTab, setSelectedTab] = useState(2);
  // const [selectedTab, setSelectedTab] = useState(3);
  const [selectedTab, setSelectedTab] = useState(4);

  const renderTabContent = () => {
    switch(selectedTab) {
      case 1:
        return <BasicInfo />
      case 2:
        return <FormatParticipants />
      case 3:
        return <PrizeDistribution />
      case 4:
        return <SponsorsLinks />
      case 5:
        return <Review />
      default:
        return <BasicInfo />
    }
  }

  return (
    <div className={styles.createTournamentContainer}>
        <ProgressMenu
          selectedTab={selectedTab}
          setSelectedTab={setSelectedTab}
        />
        
        <div className={styles.renderTabContent}>
          {renderTabContent()}
        </div>
    </div>
  )
}

export default CreateTournamentComponent