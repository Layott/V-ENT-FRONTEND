import { useState, useEffect } from 'react';
import { useSession } from "next-auth/react";
import { useRouter } from 'next/navigation';
import EditProfileImageAvatar from './edit-profile-image-avatar/EditProfileImageAvatar';
import EditProfileBanner from './edit-team-profile-banner/EditTeamProfileBanner';
import EditUserProfileDetails from './edit-team-profile-details/EditTeamProfileDetails';
import EditTeamProfileCoreGame from './edit-team-profile-core-game/EditTeamProfileCoreGame';
import EditInterests from './edit-team-profile-interests/EditTeamProfileInterests';
import styles from './edit-team-profile-info.module.css';
import MessageSnackbar from '@/components/Snackbar/MessageSnackbar';
import { VENT } from '@/app/api/auth/[...nextauth]/route';
import CircularProgress from '@mui/material/CircularProgress';

// Improved utility function to parse interests from backend format
const parseInterests = (interestsString) => {
  if (!interestsString) return [];
  console.log("Parsing interests string:", interestsString);
  try {
    // Handle case where it's already an array
    if (Array.isArray(interestsString)) {
      return interestsString;
    }
    
    // Parse string representation
    const parsed = JSON.parse(interestsString);
    console.log("Parsed interests:", parsed);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error("Failed to parse interests:", e, "Original string:", interestsString);
    return [];
  }
};

const EditTeamProfileInfo = () => {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [profileData, setProfileData] = useState({
    profile_pic: null,
    banner: null,
    username: '',
    fullname: '',
    description: '',
    country: '',
    interests: [],
  });
  
  const [initialLoaded, setInitialLoaded] = useState(false);
  const [open, setOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarType, setSnackbarType] = useState('success');
  const [loading, setLoading] = useState(false);

  // Update login_session_token in profileData when session data is available
  useEffect(() => {
    if (status === "authenticated" && session?.user?.sessionToken) {
      const sessionToken = session.user.sessionToken;
      setProfileData((prevData) => ({
        ...prevData,
        login_session_token: sessionToken,
      }));
      
      // Load initial profile data if not already loaded
      if (!initialLoaded) {
        fetchUserProfile(sessionToken);
      }
    }
  }, [session, status, initialLoaded]);
  
  // Function to fetch user profile data including interests
  const fetchUserProfile = async (sessionToken) => {
    try {
      console.log("Fetching user profile...");
      const response = await fetch(VENT.GET_PROFILE, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${sessionToken}`,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log("PROFILE - Received raw profile data:", data);
        
        // Parse interests from the backend format
        let parsedInterests = [];
        if (data.data && data.data.interests) {
          parsedInterests = parseInterests(data.data.interests);
          console.log("PROFILE - Parsed interests from profile:", parsedInterests);
        }
        
        // Update profile data with fetched data
        setProfileData(prevData => ({
          ...prevData,
          username: data.data?.username || '',
          fullname: data.data?.fullname || '',
          description: data.data?.description || '',
          country: data.data?.country || '',
          interests: parsedInterests,
        }));
        
        setInitialLoaded(true);
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setProfileData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleInterestsChange = (newInterests) => {
    console.log("Interests changed to:", newInterests);
    setProfileData((prevData) => ({
      ...prevData,
      interests: newInterests,
    }));
  };

  const handleProfilePicChange = (newProfilePic) => {
    setProfileData((prevData) => ({
      ...prevData,
      profile_pic: newProfilePic,
    }));
  };

  const handleBannerChange = (newBanner) => {
    setProfileData((prevData) => ({
      ...prevData,
      banner: newBanner,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (status === "authenticated" && session?.user?.sessionToken) {
      const sessionToken = session.user.sessionToken;

      try {
        console.log("SUBMIT - Current interests before sending to backend:", profileData.interests);
        
        // APPROACH 1: Try with direct URL parameters
        // Create query string for interests
        const interestsQuery = encodeURIComponent(JSON.stringify(profileData.interests));
        
        // Create the request data
        const formData = new FormData();
        formData.append('login_session_token', session.user.sessionToken);
        if (profileData.profile_pic) formData.append('profile_pic', profileData.profile_pic);
        if (profileData.banner) formData.append('banner', profileData.banner);
        formData.append('username', profileData.username || '');
        formData.append('fullname', profileData.fullname || '');
        formData.append('description', profileData.description || '');
        formData.append('country', profileData.country || '');
        
        // Try a direct string approach
        const stringifiedInterests = JSON.stringify(profileData.interests);
        console.log("SUBMIT - Stringified interests being sent:", stringifiedInterests);
        formData.append('interests', stringifiedInterests);
        
        // Also try a more explicit approach
        formData.append('interests_array', stringifiedInterests);
        
        // Debug the interests data
        console.log("SUBMIT - Interests array length:", profileData.interests.length);
        console.log("SUBMIT - Interests array content type:", typeof profileData.interests);
        console.log("SUBMIT - Stringified interests type:", typeof stringifiedInterests);
        
        // Debug FormData entries
        console.log("SUBMIT - FormData entries:");
        for (let pair of formData.entries()) {
          console.log(pair[0] + ': ' + pair[1]);
        }
        
        // Create URL with query params for interests
        const urlWithParams = `${VENT.EDIT_PROFILE}?interests_query=${interestsQuery}`;
        
        console.log("SUBMIT - Sending profile update to:", VENT.EDIT_PROFILE);
        
        // Also prepare JSON for alternative approach
        const plainObj = {
          login_session_token: session.user.sessionToken,
          username: profileData.username || '',
          fullname: profileData.fullname || '',
          description: profileData.description || '',
          country: profileData.country || '',
          interests: profileData.interests // Direct array
        };
        console.log("SUBMIT - Plain object alternatives:", plainObj);
        
        // Log URL with params approach
        console.log("SUBMIT - URL with interests param:", urlWithParams);

        // APPROACH 2: Try with FormData first
        const response = await fetch(VENT.EDIT_PROFILE, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${sessionToken}`,
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          },
          body: formData,
        });

        const data = await response.json();
        console.log("SUBMIT - Backend response:", data);

        if (response.ok) {
          // CRITICAL: Verify if the interests were actually updated
          if (data && data.data && data.data.interests) {
            console.log("Updated profile with interests:", data.data.interests);
            
            // Check if returned interests match what we sent
            const sentInterests = JSON.stringify(profileData.interests);
            const receivedInterests = JSON.stringify(data.data.interests);
            
            if (sentInterests !== receivedInterests) {
              console.error("WARNING: Interests mismatch between sent and received data!");
              console.error(`Sent: ${sentInterests}, Received: ${receivedInterests}`);
            }
          }
          
          // CRITICAL: After successful update, force a fresh fetch of profile data
          await fetchUserProfile(sessionToken);
          
          // Delay navigation slightly to ensure fetch completes
          setTimeout(() => {
            router.push('/user-profile');
            setSnackbarMessage(data.message || 'Profile updated successfully!');
            setSnackbarType('success');
            setOpen(true);
          }, 1000);
        } else {
          setSnackbarMessage(data.message || 'Failed to update profile.');
          setSnackbarType('error');
          setOpen(true);
        }
      } catch (error) {
        console.error('Error updating profile:', error);
        setSnackbarMessage('An error occurred while updating your profile.');
        setSnackbarType('error');
        setOpen(true);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleCloseSnackbar = () => {
    setOpen(false);
  };

  return (
    <div>
      <form className={styles.editProfileInfoContainer} onSubmit={handleSubmit}>
        <div className={styles.editProfilePictureBannerContainer}>
          <h3>Profile Picture & Banner</h3>
          <div className={styles.profilePictureBannerContainer}>
            <EditProfileImageAvatar onChange={handleProfilePicChange} />
            <EditProfileBanner onChange={handleBannerChange} />
          </div>
        </div>
        <EditUserProfileDetails
          fullname={profileData.fullname}
          username={profileData.username}
          description={profileData.description}
          country={profileData.country}
          state={profileData.state}
          handleInputChange={handleInputChange}
        />

        <EditTeamProfileCoreGame />

        <EditInterests
          selectedInterests={profileData.interests}
          handleInterestsChange={handleInterestsChange}
        />
        <div className={styles.buttonContainer}>
        <button className={`btn redBTN ${styles.saveChangesBTN}`} type="submit" disabled={loading}>
            {loading ? <CircularProgress size={24} sx={{ color: 'white' }} /> : 'Save Changes'}
          </button>
        </div>
      </form>

      <MessageSnackbar
        open={open}
        handleClose={handleCloseSnackbar}
        message={snackbarMessage}
        type={snackbarType}
      />
    </div>
  );
};

export default EditTeamProfileInfo;