import { useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import ProgressMenu from './progress-menu/ProgressMenu';
import BasicInfo from './basic-info/BasicInfo';
import FormatParticipants from './format-participants/FormatParticipants';
import PrizeDistribution from './prize-distribution/PrizeDistribution';
import SponsorsLinks from './sponsors-links/SponsorsLinks';
import Review from './review/Review';
import styles from './create-tournament-component.module.css';
import { useT } from '@/i18n/LanguageProvider';
const CreateEventComponent = () => {
  const tt = useT();
  const {
    data: session,
    status
  } = useSession();

  // True once the session has answered once. next-auth reports "loading" again
  // on every re-check, and a loader returned at that point discards whatever is
  // on screen - which is how a part-filled form came back empty.
  const hasSettled = useRef(false);
  if (status !== 'loading') hasSettled.current = true;
  const router = useRouter();
  const [selectedTab, setSelectedTab] = useState(1);

  // Store actual File objects separately for logo and banner
  const [logoFile, setLogoFile] = useState(null);
  const [bannerFile, setBannerFile] = useState(null);

  // Centralized state for form data
  const [formData, setFormData] = useState({
    tournament_title: '',
    game: '',
    game_mode: '',
    tournament_banner: '',
    tournament_logo: '',
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
    kick_link: ''
  });

  // New function to handle file uploads for logo and banner
  const updateFileData = (key, file) => {
    if (key === 'tournament_logo') {
      setLogoFile(file);
    } else if (key === 'tournament_banner') {
      setBannerFile(file);
    }
  };

  // Function to handle session expiration and logout
  const handleSessionExpiration = async () => {
    console.log("Session expired or invalid, logging out...");
    // Clear local storage data
    localStorage.removeItem("createTournamentData");

    // Sign out from NextAuth
    await signOut({
      redirect: false
    });

    // Redirect to login page
    router.push("/login");
  };

  // Function to handle data submission
  // Debug version of handleSubmit function
  // Debug version of handleSubmit function with API field mapping
  const handleSubmit = async () => {
    // Check if user is authenticated
    if (status !== "authenticated" || !session?.user?.sessionToken) {
      alert('Please login to create an event');
      router.push("/login");
      return;
    }
    const sessionToken = session.user.sessionToken;
    try {
      // DEBUG: Log the entire formData to see what's available
      console.log('Full formData before validation:', JSON.stringify(formData, null, 2));
      console.log('Logo file state:', logoFile);
      console.log('Banner file state:', bannerFile);

      // Validate required fields before submission
      if (!formData.tournament_title?.trim()) {
        alert('Tournament title is required');
        return;
      }
      if (!formData.game?.trim()) {
        alert('Game title is required');
        return;
      }
      if (!formData.tournament_type) {
        alert('Tournament type is required');
        return;
      }
      const formDataObj = new FormData();

      // Required fields with proper validation
      formDataObj.append('name', formData.tournament_title.trim());

      // TRY DIFFERENT FIELD NAMES FOR GAME - API might expect different field name
      formDataObj.append('game', formData.game.trim());
      formDataObj.append('game_title', formData.game.trim()); // Alternative field name
      formDataObj.append('game_name', formData.game.trim()); // Another alternative
      formDataObj.append('title', formData.game.trim()); // Another alternative

      formDataObj.append('session_token', sessionToken);
      formDataObj.append('event_type', formData.tournament_type === 'online' ? 'virtual' : 'physical');
      formDataObj.append('desc', formData.tournament_description?.trim() || '');
      formDataObj.append('entry_fee', formData.entry_fee || '0');

      // Add other potentially required fields
      if (formData.game_mode?.trim()) {
        formDataObj.append('game_mode', formData.game_mode.trim());
      }

      // Handle dates more robustly
      let startDate, endDate;
      if (formData.start_date_and_time) {
        startDate = new Date(formData.start_date_and_time);
        if (isNaN(startDate.getTime())) {
          alert('Invalid start date format');
          return;
        }
      } else {
        alert('Start date is required');
        return;
      }
      if (formData.end_date_and_time) {
        endDate = new Date(formData.end_date_and_time);
        if (isNaN(endDate.getTime())) {
          alert('Invalid end date format');
          return;
        }
      } else {
        alert('End date is required');
        return;
      }

      // Format dates properly for API
      const formatDate = date => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };
      const formatTime = date => {
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${hours}:${minutes}`;
      };
      formDataObj.append('reg_start_date', formatDate(startDate));
      formDataObj.append('reg_end_date', formatDate(endDate));
      formDataObj.append('event_date', formatDate(startDate));
      formDataObj.append('start_time', formatTime(startDate));
      formDataObj.append('end_time', formatTime(endDate));

      // Handle location based on tournament type
      if (formData.tournament_type === 'physical' || formData.tournament_type === 'hybrid') {
        formDataObj.append('location', formData.tournament_location?.trim() || '');
      } else {
        formDataObj.append('location', '');
      }

      // Handle virtual link for online tournaments
      if (formData.tournament_type === 'online' || formData.tournament_type === 'virtual') {
        formDataObj.append('event_link', formData.virtual_link?.trim() || '');
      } else {
        formDataObj.append('event_link', '');
      }

      // Handle file uploads with validation - USE THE FILE OBJECTS
      if (logoFile && logoFile instanceof File) {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(logoFile.type)) {
          alert('Logo must be a valid image file (JPEG, PNG, GIF, WebP)');
          return;
        }
        if (logoFile.size > 5 * 1024 * 1024) {
          // 5MB limit
          alert('Logo file size must be less than 5MB');
          return;
        }
        formDataObj.append('logo', logoFile);
      }
      if (bannerFile && bannerFile instanceof File) {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(bannerFile.type)) {
          alert('Banner must be a valid image file (JPEG, PNG, GIF, WebP)');
          return;
        }
        if (bannerFile.size > 10 * 1024 * 1024) {
          // 10MB limit
          alert('Banner file size must be less than 10MB');
          return;
        }
        formDataObj.append('banner', bannerFile);
      }

      // Handle sponsors and social links (simplified for debugging)
      formDataObj.append('sponsors', JSON.stringify([]));
      formDataObj.append('sponsor_logos', JSON.stringify([]));
      formDataObj.append('social_links', JSON.stringify([]));
      formDataObj.append('social_urls', JSON.stringify([]));

      // DEBUG: Log the form data being sent
      console.log('Submitting form data:');
      for (let [key, value] of formDataObj.entries()) {
        console.log(`${key}:`, value);
      }

      // OPTION 1: Try the original request first
      console.log('Attempting API call with current field mapping...');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/event/create-event/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sessionToken}`
        },
        body: formDataObj
      });
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Server error details:', errorData);

        // If we get "Game title is required" error, try alternative approach
        if (errorData.message === 'Game title is required') {
          console.log('Trying alternative field mapping...');

          // Create new FormData with different field mapping
          const altFormDataObj = new FormData();

          // Try different combinations based on common API patterns
          altFormDataObj.append('tournament_name', formData.tournament_title.trim());
          altFormDataObj.append('game_title', formData.game.trim()); // This might be what the API expects
          altFormDataObj.append('session_token', sessionToken);
          altFormDataObj.append('tournament_type', formData.tournament_type === 'online' ? 'virtual' : 'physical');
          altFormDataObj.append('description', formData.tournament_description?.trim() || '');
          altFormDataObj.append('entry_fee', formData.entry_fee || '0');

          // Add all the other fields...
          if (formData.game_mode?.trim()) {
            altFormDataObj.append('game_mode', formData.game_mode.trim());
          }
          altFormDataObj.append('reg_start_date', formatDate(startDate));
          altFormDataObj.append('reg_end_date', formatDate(endDate));
          altFormDataObj.append('event_date', formatDate(startDate));
          altFormDataObj.append('start_time', formatTime(startDate));
          altFormDataObj.append('end_time', formatTime(endDate));
          if (formData.tournament_type === 'physical' || formData.tournament_type === 'hybrid') {
            altFormDataObj.append('location', formData.tournament_location?.trim() || '');
          } else {
            altFormDataObj.append('location', '');
          }
          if (formData.tournament_type === 'online' || formData.tournament_type === 'virtual') {
            altFormDataObj.append('event_link', formData.virtual_link?.trim() || '');
          } else {
            altFormDataObj.append('event_link', '');
          }

          // Add files if they exist - USE THE FILE OBJECTS
          if (logoFile && logoFile instanceof File) {
            altFormDataObj.append('logo', logoFile);
          }
          if (bannerFile && bannerFile instanceof File) {
            altFormDataObj.append('banner', bannerFile);
          }
          altFormDataObj.append('sponsors', JSON.stringify([]));
          altFormDataObj.append('sponsor_logos', JSON.stringify([]));
          altFormDataObj.append('social_links', JSON.stringify([]));
          altFormDataObj.append('social_urls', JSON.stringify([]));
          console.log('Alternative form data:');
          for (let [key, value] of altFormDataObj.entries()) {
            console.log(`${key}:`, value);
          }

          // Try the alternative request
          const altResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/event/create-event/`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${sessionToken}`
            },
            body: altFormDataObj
          });
          if (!altResponse.ok) {
            const altErrorData = await altResponse.json();
            console.error('Alternative request also failed:', altErrorData);
            throw new Error(altErrorData.message || `HTTP ${altResponse.status}: ${altResponse.statusText}`);
          }
          const altData = await altResponse.json();
          console.log('Event Created Successfully with alternative mapping:', altData);
          alert('Event created successfully!');
          localStorage.removeItem('createTournamentData');
          return;
        }
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      console.log('Event Created Successfully:', data);
      alert('Event created successfully!');
      localStorage.removeItem('createTournamentData');
    } catch (error) {
      console.error('Error creating event:', error);
      alert('Error creating event: ' + error.message);
    }
  };
  const renderTabContent = () => {
    switch (selectedTab) {
      case 1:
        return <BasicInfo formData={formData} setFormData={setFormData} setSelectedTab={setSelectedTab} updateFileData={updateFileData} />;
      case 2:
        return <FormatParticipants formData={formData} setFormData={setFormData} setSelectedTab={setSelectedTab} />;
      case 3:
        return <PrizeDistribution formData={formData} setFormData={setFormData} setSelectedTab={setSelectedTab} />;
      case 4:
        return <SponsorsLinks formData={formData} setFormData={setFormData} setSelectedTab={setSelectedTab} />;
      case 5:
        return <Review formData={formData} setFormData={setFormData} handleSubmit={handleSubmit} setSelectedTab={setSelectedTab} />;
      default:
        return <BasicInfo formData={formData} setFormData={setFormData} setSelectedTab={setSelectedTab} updateFileData={updateFileData} />;
    }
  };

  // Only before the first answer. next-auth flips back to "loading" whenever
  // it re-checks the session, and returning a loader at that point unmounted a
  // half-filled event form and rebuilt it empty.
  if (status === "loading" && !hasSettled.current) {
    return <div className={styles.createTournamentContainer}>
        <div className={`${styles.loading}`}>
          {tt("ui.loading.8f26", "Loading")}<span>...</span>
        </div>
      </div>;
  }

  // Redirect to login if not authenticated
  if (status === "unauthenticated") {
    router.push("/login");
    return null;
  }
  return <div className={styles.createTournamentContainer}>
      <ProgressMenu selectedTab={selectedTab} setSelectedTab={setSelectedTab} />
      <div className={styles.renderTabContent}>{renderTabContent()}</div>
    </div>;
};
export default CreateEventComponent;