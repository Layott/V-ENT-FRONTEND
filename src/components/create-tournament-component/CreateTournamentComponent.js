import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
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
  const { data: session } = useSession();

  // Initialize formData - load from localStorage on mount
  const [formData, setFormData] = useState({});

  // Load data from localStorage on component mount
  useEffect(() => {
    const savedData = localStorage.getItem('createTournamentData');
    if (savedData) {
      try {
        const parsedData = JSON.parse(savedData);
        setFormData(parsedData);
        console.log('Loaded data from localStorage:', parsedData);
      } catch (error) {
        console.error('Error parsing localStorage data:', error);
      }
    }
  }, []);

  // Wrap fetchAvailableGames with useCallback to memoize it
  const fetchAvailableGames = useCallback(async () => {
    try {
      const response = await fetch('https://vermillionent.pythonanywhere.com/get-all-tournaments/', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session?.user?.sessionToken}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const games = await response.json();
        console.log("Available games from API:", games);
        return games;
      } else {
        console.error("Failed to fetch games:", response.status);
        return null;
      }
    } catch (error) {
      console.error("Error fetching available games:", error);
      return null;
    }
  }, [session?.user?.sessionToken]);

  useEffect(() => {
    if (session?.user?.sessionToken) {
      fetchAvailableGames();
    }
  }, [session?.user?.sessionToken, fetchAvailableGames]);

  // Centralized function to update both state and localStorage
  const updateFormData = (key, value) => {
    try {
      setFormData(prevData => {
        const updatedData = {
          ...prevData,
          [key]: value
        };
        
        // Update localStorage
        localStorage.setItem('createTournamentData', JSON.stringify(updatedData));
        
        console.log(`Updated formData - ${key}:`, value);
        console.log('New formData:', updatedData);
        
        return updatedData;
      });
    } catch (error) {
      console.error('Error updating formData:', error);
    }
  };
    
  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      
      if (!session?.user?.sessionToken) {
        alert('You must be logged in to create a tournament');
        return;
      }
      
      // Get the most recent data from localStorage as a backup
      const savedData = localStorage.getItem('createTournamentData');
      const latestFormData = savedData ? JSON.parse(savedData) : formData;
      
      console.log('Form data for validation:', latestFormData);
      
      // Validate required fields
      if (!latestFormData.tournament_title || latestFormData.tournament_title.trim() === '') {
        alert('Please fill in the tournament title');
        setSelectedTab(1);
        return;
      }
      
      if (!latestFormData.game || latestFormData.game.trim() === '') {
        alert('Please select a game for your tournament');
        setSelectedTab(1);
        return;
      }
      
      // Game name mapping - Add common variations here
      const gameNameMapping = {
        'FREEFIRE': 'Free Fire',
        'FREE FIRE': 'Free Fire',
        'free fire': 'Free Fire',
        'FreeFire': 'Free Fire',
        'Freefire': 'Free Fire',
        'GARENA FREE FIRE': 'Free Fire',
        'garena free fire': 'Free Fire',
        
        // Add other common games and their variations
        'COD': 'Call of Duty',
        'CALL OF DUTY': 'Call of Duty',
        'call of duty': 'Call of Duty',
        
        'VALORANT': 'Valorant',
        'valorant': 'Valorant',
        
        'PUBG': 'PUBG',
        'pubg': 'PUBG',
        'PUBG MOBILE': 'PUBG Mobile',
        'pubg mobile': 'PUBG Mobile',
        
        'FORTNITE': 'Fortnite',
        'fortnite': 'Fortnite',
        
        'CS2': 'Counter-Strike 2',
        'CS:2': 'Counter-Strike 2',
        'COUNTER STRIKE 2': 'Counter-Strike 2',
        'counter-strike 2': 'Counter-Strike 2',
        
        'LOL': 'League of Legends',
        'LEAGUE OF LEGENDS': 'League of Legends',
        'league of legends': 'League of Legends',
        
        'DOTA2': 'Dota 2',
        'DOTA 2': 'Dota 2',
        'dota 2': 'Dota 2',
        
        'APEX': 'Apex Legends',
        'APEX LEGENDS': 'Apex Legends',
        'apex legends': 'Apex Legends',
        
        'FIFA': 'FIFA',
        'fifa': 'FIFA',
        'FIFA 24': 'FIFA 24',
        'fifa 24': 'FIFA 24',
        
        'ROCKET LEAGUE': 'Rocket League',
        'rocket league': 'Rocket League',
        
        'OVERWATCH': 'Overwatch',
        'overwatch': 'Overwatch',
        'OVERWATCH 2': 'Overwatch 2',
        'overwatch 2': 'Overwatch 2'
      };
      
      // Get the original game name and try to map it
      const originalGame = latestFormData.game.trim();
      const mappedGame = gameNameMapping[originalGame] || originalGame;
      
      console.log("Original game:", originalGame);
      console.log("Mapped game:", mappedGame);
      
      // Date validation
      if (!latestFormData.start_date_and_time || !latestFormData.end_date_and_time) {
        alert('Please fill in both start and end dates');
        setSelectedTab(1);
        return;
      }
      
      const startDate = new Date(latestFormData.start_date_and_time);
      const endDate = new Date(latestFormData.end_date_and_time);
      
      if (startDate >= endDate) {
        alert('Start date and time must be before end date and time. Please check your tournament schedule.');
        setSelectedTab(1);
        return;
      }
      
      // Transform sponsors data
      let sponsor_names = [];
      let sponsor_types = [];
      let sponsor_usernames = [];
      
      if (Array.isArray(latestFormData.sponsors)) {
        sponsor_names = latestFormData.sponsors.map(sponsor => sponsor.name || '');
        sponsor_types = latestFormData.sponsors.map(sponsor => sponsor.type || 'individual');
        sponsor_usernames = latestFormData.sponsors.map(sponsor => sponsor.username || '');
      } else if (Array.isArray(latestFormData.sponsor_names)) {
        sponsor_names = latestFormData.sponsor_names;
        sponsor_types = latestFormData.sponsor_types || [];
        sponsor_usernames = latestFormData.sponsor_usernames || [];
      }
      
      const socialLinks = latestFormData.webSocialLinks || latestFormData;
      
      // Format the data with the mapped game name
      const formattedData = {
        tournament_title: latestFormData.tournament_title || '',
        game: mappedGame, // Use the mapped game name
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
        
        sponsor_names: sponsor_names,
        sponsor_types: sponsor_types,
        sponsor_usernames: sponsor_usernames
      };
      
      // Add social links
      if (socialLinks.facebook_link) formattedData.facebook_link = socialLinks.facebook_link;
      if (socialLinks.twitter_link) formattedData.twitter_link = socialLinks.twitter_link;
      if (socialLinks.instagram_link) formattedData.instagram_link = socialLinks.instagram_link;
      if (socialLinks.youtube_link) formattedData.youtube_link = socialLinks.youtube_link;
      if (socialLinks.twitch_link) formattedData.twitch_link = socialLinks.twitch_link;
      if (socialLinks.kick_link) formattedData.kick_link = socialLinks.kick_link;
      if (socialLinks.tiktok_link) formattedData.tiktok_link = socialLinks.tiktok_link;
      if (socialLinks.bigolive_link) formattedData.bigolive_link = socialLinks.bigolive_link;

      console.log("Final formatted data for API:", formattedData);

      const response = await fetch('https://vermillionent.pythonanywhere.com/tournament/create-tournament/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.user.sessionToken}`,
        },
        body: JSON.stringify(formattedData),
        credentials: 'include',
      });

      console.log("Response status:", response.status);
      
      const responseText = await response.text();
      console.log("Response body:", responseText);
      
      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch (e) {
        responseData = responseText;
      }

      if (!response.ok) {
        if (response.status === 500 && responseText.includes('Games matching query does not exist')) {
          // Fetch available games to show user
          const availableGames = await fetchAvailableGames();
          const gamesList = availableGames ? availableGames.map(g => g.name || g.title || g).join(', ') : 'Unable to fetch available games';
          throw new Error(`The game "${mappedGame}" is not available. Available games might include: ${gamesList}. Please contact support if your game should be available.`);
        }
        throw new Error(`Server returned ${response.status}: ${typeof responseData === 'object' ? JSON.stringify(responseData) : responseData}`);
      }

      console.log('Tournament Created Successfully:', responseData);
      
      // Clear both state and localStorage after successful submission
      setFormData({});
      localStorage.removeItem('createTournamentData');
      
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
        return <BasicInfo setSelectedTab={setSelectedTab} updateFormData={updateFormData} />;
      case 2:
        return <FormatParticipants setSelectedTab={setSelectedTab} updateLocalStorage={updateFormData} />;
      case 3:
        return <PrizeDistribution setSelectedTab={setSelectedTab} updateLocalStorage={updateFormData} />;
      case 4:
        return <SponsorsLinks formData={formData} setFormData={setFormData} setSelectedTab={setSelectedTab} />;
      case 5:
        return <Review formData={formData} setFormData={setFormData} handleSubmit={handleSubmit} setSelectedTab={setSelectedTab} isSubmitting={isSubmitting} />;
      default:
        return <BasicInfo setSelectedTab={setSelectedTab} updateFormData={updateFormData} />;
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