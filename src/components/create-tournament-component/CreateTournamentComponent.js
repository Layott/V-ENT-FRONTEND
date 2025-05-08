import { useState, useEffect } from 'react';
import ProgressMenu from './progress-menu/ProgressMenu';
import BasicInfo from './basic-info/BasicInfo';
import FormatParticipants from './format-participants/FormatParticipants';
import PrizeDistribution from './prize-distribution/PrizeDistribution';
import SponsorsLinks from './sponsors-links/SponsorsLinks';
import Review from './review/Review';
import styles from './create-tournament-component.module.css';

const CreateTournamentComponent = () => {
  const [selectedTab, setSelectedTab] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize formData from localStorage if available
  const [formData, setFormData] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedData = localStorage.getItem('createTournamentData');
      return savedData ? JSON.parse(savedData) : {};
    }
    return {};
  });

  // Update formData when localStorage changes
  useEffect(() => {
    const handleStorageChange = () => {
      const savedData = localStorage.getItem('createTournamentData');
      if (savedData) {
        setFormData(JSON.parse(savedData));
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  
const handleSubmit = async () => {
  try {
    setIsSubmitting(true);
    
    // Read the latest data from localStorage
    const savedData = localStorage.getItem('createTournamentData');
    const latestFormData = savedData ? JSON.parse(savedData) : formData;
    
    console.log("Sending data to API:", latestFormData); // Debug log
    
    // Format the data according to the API requirements
    const formattedData = {
      tournament_title: latestFormData.tournament_title || '',
      game: latestFormData.game || '',
      game_mode: latestFormData.game_mode || '',
      tournament_description: latestFormData.tournament_description || '',
      tournament_type: latestFormData.tournament_type || '',
      start_date_and_time: latestFormData.start_date_and_time || '',
      end_date_and_time: latestFormData.end_date_and_time || '',
      tournament_location: latestFormData.tournament_location || '',
      virtual_link: latestFormData.virtual_link || '',
      hide_location: Boolean(latestFormData.hide_location),
      
      tournament_visibility: latestFormData.tournament_visibility || 'public',
      entry_type: latestFormData.entry_type || '',
      entry_fee: parseFloat(latestFormData.entry_fee) || 0,
      
      tournament_access: latestFormData.tournament_access || '',
      team_size: parseInt(latestFormData.team_size) || 1,
      min_number_of_participants: parseInt(latestFormData.min_number_of_participants) || 8,
      max_number_of_participants: parseInt(latestFormData.max_number_of_participants) || 32,
      bracket_type: latestFormData.bracket_type || '',
      tournament_rules: latestFormData.tournament_rules || '',
      
      prize_distribution_type: latestFormData.prize_distribution_type || 'distributed',
      prize_distribution: Array.isArray(latestFormData.prize_distribution) 
        ? latestFormData.prize_distribution 
        : [],
      winner_prize: parseFloat(latestFormData.winner_prize) || 0,
      
      sponsor_names: Array.isArray(latestFormData.sponsor_names) 
        ? latestFormData.sponsor_names 
        : [],
      sponsor_types: Array.isArray(latestFormData.sponsor_types) 
        ? latestFormData.sponsor_types 
        : [],
      sponsor_usernames: Array.isArray(latestFormData.sponsor_usernames) 
        ? latestFormData.sponsor_usernames 
        : []
    };
    
    // Add social links only if they exist
    if (latestFormData.facebook_link) formattedData.facebook_link = latestFormData.facebook_link;
    if (latestFormData.twitter_link) formattedData.twitter_link = latestFormData.twitter_link;
    if (latestFormData.instagram_link) formattedData.instagram_link = latestFormData.instagram_link;
    if (latestFormData.youtube_link) formattedData.youtube_link = latestFormData.youtube_link;
    if (latestFormData.twitch_link) formattedData.twitch_link = latestFormData.twitch_link;
    if (latestFormData.kick_link) formattedData.kick_link = latestFormData.kick_link;
    if (latestFormData.tiktok_link) formattedData.tiktok_link = latestFormData.tiktok_link;
    if (latestFormData.bigolive_link) formattedData.bigolive_link = latestFormData.bigolive_link;

    console.log("Formatted data for API:", formattedData); // Debug log

    // Send data to API
    const response = await fetch('https://vermillionent.pythonanywhere.com/tournament/create-tournament/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + yourAuthToken, // Uncomment and replace yourAuthToken with actual token
      },
      body: JSON.stringify(formattedData),
      credentials: 'include', // Include cookies if using session auth
    });

    console.log("Response status:", response.status); // Debug log
    
    // Try to get the response body as text first
    const responseText = await response.text();
    console.log("Response body:", responseText); // Debug log
    
    // Then try to parse it as JSON if possible
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      // If it's not valid JSON, keep the text version
      responseData = responseText;
    }

    if (!response.ok) {
      throw new Error(`Server returned ${response.status}: ${typeof responseData === 'object' ? JSON.stringify(responseData) : responseData}`);
    }

    console.log('Tournament Created Successfully:', responseData);
    
    // Clear localStorage after successful submission
    localStorage.removeItem('createTournamentData');
    
    // Alert success
    alert('Tournament created successfully!');
    
  } catch (error) {
    console.error('Error creating tournament:', error);
    alert(`Failed to create tournament: ${error.message || 'Unknown error'}`);
  } finally {
    setIsSubmitting(false);
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
        return <SponsorsLinks formData={formData} setFormData={setFormData} setSelectedTab={setSelectedTab} />;
      case 5:
        return <Review formData={formData} setFormData={setFormData} handleSubmit={handleSubmit} setSelectedTab={setSelectedTab} />;
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