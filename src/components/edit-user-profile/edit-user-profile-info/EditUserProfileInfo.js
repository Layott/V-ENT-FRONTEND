import { useState, useEffect } from 'react';
import { useSession } from "next-auth/react";
import { useRouter } from 'next/navigation';
import EditProfileImageAvatar from './edit-profile-image-avatar/EditProfileImageAvatar';
import EditProfileBanner from './edit-user-profile-banner/EditUserProfileBanner';
import EditUserProfileDetails from './edit-user-profile-details/EditUserProfileDetails';
import EditInterests from './edit-user-profile-interests/EditUserProfileInterests';
import styles from './edit-user-profile-info.module.css';
import MessageSnackbar from '@/components/Snackbar/MessageSnackbar';
import { VENT } from '@/app/api/auth/[...nextauth]/route';
import CircularProgress from '@mui/material/CircularProgress';


const EditUserProfileInfo = () => {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [profileData, setProfileData] = useState({
    login_session_token: '',
    profile_pic: null,
    banner: null,
    username: '',
    fullname: '',
    description: '',
    country: '',
    interests: [],
  });

  const [open, setOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarType, setSnackbarType] = useState('success');
  const [loading, setLoading] = useState(false);
  const [isLoadingUserData, setIsLoadingUserData] = useState(true);

  // Fetch current user profile data when component mounts or session changes
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (status === "authenticated" && session?.user?.sessionToken) {
        setIsLoadingUserData(true);
        const sessionToken = session.user.sessionToken;
        
        setProfileData((prevData) => ({
          ...prevData,
          login_session_token: sessionToken,
        }));
        
        try {
          console.log('Fetching user profile data...');
          const response = await fetch(VENT.GET_USER_PROFILE, {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${sessionToken}`,
              // Add cache-busting parameter to prevent browser caching
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache',
              'Expires': '0'
            },
          });
          
          if (response.ok) {
            const userData = await response.json();
            
            // Log the interests specifically to check if they're coming from the backend
            console.log('FETCH - Received interests from backend:', userData.interests);
            
            // Clear any existing data before setting new data
            setProfileData({
              login_session_token: sessionToken,
              profile_pic: userData.profile_pic || null,
              banner: userData.banner || null,
              username: userData.username || '',
              fullname: userData.fullname || '',
              description: userData.description || '',
              country: userData.country || '',
              interests: userData.interests || [],
            });
            
            console.log('Fetched user profile data:', userData);
          } else {
            console.error('Failed to fetch user profile data');
          }
        } catch (error) {
          console.error('Error fetching user profile:', error);
        } finally {
          setIsLoadingUserData(false);
        }
      }
    };

    fetchUserProfile();
    
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchUserProfile();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [session, status]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setProfileData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleInterestsChange = (newInterests) => {
    console.log('Interests changed to:', newInterests);
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
  
      console.log('SUBMIT - Current interests before sending to backend:', profileData.interests);
      
      try {
        // First API call: Send images as FormData
        if (profileData.profile_pic || profileData.banner) {
          const imageFormData = new FormData();
          imageFormData.append('login_session_token', profileData.login_session_token);
          if (profileData.profile_pic) imageFormData.append('profile_pic', profileData.profile_pic);
          if (profileData.banner) imageFormData.append('banner', profileData.banner);
          
          console.log('SUBMIT - Sending images as FormData...');
          const imageResponse = await fetch(VENT.EDIT_PROFILE, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${sessionToken}`,
              // Don't include Content-Type for FormData
            },
            body: imageFormData,
          });
          
          if (!imageResponse.ok) {
            const imageError = await imageResponse.json();
            throw new Error(imageError.message || 'Failed to upload images');
          }
        }
  
        // Second API call: Send other data as JSON
        const jsonData = {
          login_session_token: profileData.login_session_token,
          username: profileData.username,
          fullname: profileData.fullname,
          description: profileData.description,
          country: profileData.country,
          interests: profileData.interests,
        };
        
        console.log('SUBMIT - Sending other data as JSON:', jsonData);
        const dataResponse = await fetch(VENT.EDIT_PROFILE, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${sessionToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(jsonData),
        });
  
        const data = await dataResponse.json();
        console.log('SUBMIT - Backend response:', data);
  
        if (dataResponse.ok) {
          console.log('Updated profile with interests:', profileData.interests);
          router.push('/user-profile');
          setSnackbarMessage(data.message || 'Profile updated successfully!');
          setSnackbarType('success');
        } else {
          console.error('Backend returned error:', data);
          setSnackbarMessage(data.message || 'Failed to update profile.');
          setSnackbarType('error');
        }
        setOpen(true);
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

  if (isLoadingUserData) {
    return (
      <div className={styles.loadingContainer}>
        <CircularProgress />
        <p>Loading profile data...</p>
      </div>
    );
  }

  return (
    <div>
      <form className={styles.editProfileInfoContainer} onSubmit={handleSubmit}>
        <div className={styles.editProfilePictureBannerContainer}>
          <h3>Profile Picture & Banner</h3>
          <div className={styles.profilePictureBannerContainer}>
            <EditProfileImageAvatar 
              onChange={handleProfilePicChange} 
              currentProfilePic={profileData.profile_pic}
            />
            <EditProfileBanner 
              onChange={handleBannerChange} 
              currentBanner={profileData.banner}
            />
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

export default EditUserProfileInfo;