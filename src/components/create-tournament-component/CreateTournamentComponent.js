import { useState } from 'react';
import ProgressMenu from './progress-menu/ProgressMenu';
import BasicInfo from './basic-info/BasicInfo';
import FormatParticipants from './format-participants/FormatParticipants';
import PrizeDistribution from './prize-distribution/PrizeDistribution';
import SponsorsLinks from './sponsors-links/SponsorsLinks';
import Review from './review/Review';
import styles from './create-tournament-component.module.css';
import { VENT } from '@/app/api/auth/[...nextauth]/route';

const CreateTournamentComponent = () => {
  const [selectedTab, setSelectedTab] = useState(1);

  // Centralized state for form data
  const [formData, setFormData] = useState({
    tournament_title: '',
    game: '',
    game_mode: '',
    tournament_banner: '',
    tournament_logo:'',
    tournament_description: '',
    tournament_type: '',
    start_date_and_time: '',
    end_date_and_time: '',
    tournament_location: '',
    virtual_link: '',
    hide_location: '',
    tournament_visibility: '',
    entry_type: '',
    entry_fee: '',
    tournament_access: '',
    team_size: '',
    min_number_of_participants: '',
    max_number_of_participants: '',
    bracket_type: '',
    tournament_rules: '',
    prize_distribution_type: '',
    prize_distribution: [],
    winner_prize: '',
    sponsor_ids: [],
    facebook_link: '',
    twitter_link: '',
    instagram_link: '',
    youtube_link: '',
    twitch_link: '',
    kick_link: '',
  });

  // Function to handle data submission
  const handleSubmit = async () => {
    try {
      const formDataObj = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        if (key === 'prize_distribution' || key === 'sponsor_ids') {
          formDataObj.append(key, JSON.stringify(value));
        } else {
          formDataObj.append(key, value);
        }
      });

      const response = await fetch('VENT.CREATE_TOURNAMENT', {
        method: 'POST',
        body: formDataObj,
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }

      const data = await response.json();
      console.log('Tournament Created Successfully:', data);
    } catch (error) {
      console.error('Error creating tournament:', error.message);
    }
  };

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
        return <Review handleSubmit={handleSubmit} />;
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
