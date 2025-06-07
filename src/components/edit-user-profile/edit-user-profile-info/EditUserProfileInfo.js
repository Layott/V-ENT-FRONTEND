import { useState, useEffect } from 'react';
import { useSession, signOut } from "next-auth/react";
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
    state: '',
    interests: [],
  });

  const [open, setOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarType, setSnackbarType] = useState('success');
  const [loading, setLoading] = useState(false);
  const [isLoadingUserData, setIsLoadingUserData] = useState(true);

  const baseUrl = "https://vermillionent.pythonanywhere.com";

  const getAbsoluteUrl = (url) => {
    if (!url) return null;
    return url.startsWith("http")
      ? url
      : `${baseUrl}${url.startsWith("/") ? "" : "/"}${url}`;
  };

  const processUserData = (data) => {
    if (!data) return null;
    
    const processed = { ...data };
    
    if (processed.profile_pic && !processed.profile_picture) {
      processed.profile_picture = processed.profile_pic;
    }
    
    processed.profile_picture = getAbsoluteUrl(processed.profile_picture);
    processed.banner = getAbsoluteUrl(processed.banner);

    // Ensure interests is an array
    if (!processed.interests) {
      processed.interests = [];
    } else if (typeof processed.interests === 'string') {
      try {
        // If interests is a JSON string, parse it
        processed.interests = JSON.parse(processed.interests);
      } catch (e) {
        console.error('Error parsing interests string:', e);
        processed.interests = [];
      }
    }

    console.log('Processed user data for edit:', processed);
    return processed;
  };

  // Function to handle session expiration and logout
  const handleSessionExpiration = async () => {
    console.log("Session expired or invalid, logging out...");
    // Clear local storage data
    localStorage.removeItem("userProfile");
    localStorage.removeItem("userProfilePicture");
    
    // Sign out from NextAuth
    await signOut({ redirect: false });
    
    // Redirect to login page
    router.push("/login");
  };

  // Fetch current user profile data when component mounts or session changes
  useEffect(() => {
    console.log("Edit Profile - Current session status:", status);
    console.log("Edit Profile - Session data:", session);
    
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }

    const fetchUserProfile = async () => {
      if (status === "authenticated" && session?.user?.sessionToken) {
        setIsLoadingUserData(true);
        const sessionToken = session.user.sessionToken;
        const userId = session.user.id;
        
        setProfileData((prevData) => ({
          ...prevData,
          login_session_token: sessionToken,
        }));
        
        console.log("==== EDIT PROFILE API DEBUG ====");
        console.log("Session token:", sessionToken);
        console.log("User ID:", userId);
        console.log("API Endpoint:", VENT.USER_PROFILE);
        
        try {
          // Try with GET method first (mirroring user profile approach)
          const timestamp = new Date().getTime(); 
          console.log("Attempting GET request for edit profile...");
          let response = await fetch(`${VENT.USER_PROFILE}?user_id=${userId}&t=${timestamp}`, {
            method: "GET",
            headers: {
              Authorization: `Bearer ${sessionToken}`,
              "Content-Type": "application/json",
            }
          });
          
          // Check for unauthorized, token expired, or bad request responses
          if (response.status === 401 || response.status === 403 || response.status === 400) {
            console.log("Session expired, unauthorized, or bad request:", response.status);
            await handleSessionExpiration();
            return;
          }
          
          // If GET fails, try again with POST method
          if (response.status === 405) {
            console.log("GET method not allowed, trying POST...");
            response = await fetch(`${VENT.USER_PROFILE}?t=${timestamp}`, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${sessionToken}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ user_id: userId }),
            });
            
            // Check for unauthorized, token expired, or bad request responses
            if (response.status === 401 || response.status === 403 || response.status === 400) {
              console.log("Session expired, unauthorized, or bad request:", response.status);
              await handleSessionExpiration();
              return;
            }
          }
          
          console.log("Edit Profile response status:", response.status);
          
          if (!response.ok) {
            // Handle 400 error by logging out user
            if (response.status === 400) {
              console.log("Bad request error (400), likely invalid or expired session");
              await handleSessionExpiration();
              return;
            }
            // Try with Token prefix instead of Bearer
            console.log("Trying with Token prefix instead of Bearer");
            const tokenResponse = await fetch(`${VENT.USER_PROFILE}?user_id=${userId}&t=${timestamp}`, {
              method: "GET",
              headers: {
                Authorization: `Token ${sessionToken}`,
                "Content-Type": "application/json",
              }
            });
            
            // Check for unauthorized, token expired, or bad request responses
            if (tokenResponse.status === 401 || tokenResponse.status === 403 || tokenResponse.status === 400) {
              console.log("Session expired, unauthorized, or bad request:", tokenResponse.status);
              await handleSessionExpiration();
              return;
            }
            
            if (!tokenResponse.ok) {
              // Handle 400 error by logging out user
              if (tokenResponse.status === 400) {
                console.log("Bad request error (400), likely invalid or expired session");
                await handleSessionExpiration();
                return;
              }
              // Try with session_token as a query param
              console.log("Trying with session_token as query param");
              const tokenParamResponse = await fetch(
                `${VENT.USER_PROFILE}?user_id=${userId}&session_token=${sessionToken}&t=${timestamp}`, 
                {
                  method: "GET",
                  headers: {
                    "Content-Type": "application/json",
                  }
                }
              );
              
              // Check for unauthorized, token expired, or bad request responses
              if (tokenParamResponse.status === 401 || tokenParamResponse.status === 403) {
                console.log("Session expired or unauthorized:", tokenParamResponse.status);
                await handleSessionExpiration();
                return;
              }
              
              if (!tokenParamResponse.ok) {
                // Handle 400 error by logging out user
                if (tokenParamResponse.status === 400) {
                  console.log("Bad request error (400), likely invalid or expired session");
                  await handleSessionExpiration();
                  return;
                }
                throw new Error(`Failed to fetch profile: ${tokenParamResponse.status}`);
              }
              
              const responseText = await tokenParamResponse.text();
              return handleProfileResponse(responseText);
            }
            
            const responseText = await tokenResponse.text();
            return handleProfileResponse(responseText);
          }
          
          const responseText = await response.text();
          return handleProfileResponse(responseText);
          
        } catch (err) {
          console.error("Final error:", err.message);
          
          // Check if error is related to authentication/authorization or bad request
          if (err.message.includes("401") || 
              err.message.includes("403") || 
              err.message.includes("400") ||
              err.message.includes("unauthorized") || 
              err.message.includes("token") || 
              err.message.includes("expired")) {
            await handleSessionExpiration();
            return;
          }
          
          setSnackbarMessage(`Failed to load profile data. ${err.message}`);
          setSnackbarType('error');
          setOpen(true);
        } finally {
          setIsLoadingUserData(false);
        }
      } else {
        console.log("Not authenticated or missing session token");
        setIsLoadingUserData(false);
      }
    };
    
    // Helper function to handle the profile response
    const handleProfileResponse = (responseText) => {
      console.log("Edit Profile Raw response:", responseText);
      
      try {
        const data = JSON.parse(responseText);
        console.log("Edit Profile Parsed data:", data);
        
        // Check for error status or messages indicating session expiration
        if (data.status === "error" || data.error) {
          const errorMsg = data.message || data.error || "";
          if (errorMsg.toLowerCase().includes("token") || 
              errorMsg.toLowerCase().includes("expired") || 
              errorMsg.toLowerCase().includes("session") ||
              errorMsg.toLowerCase().includes("auth")) {
            handleSessionExpiration();
            return;
          }
        }
        
        // Try different data structures
        const rawUserData =
          data.data ||
          data.user ||
          (data.status === "success" ? data : null);
          
        if (rawUserData) {
          // Process to ensure absolute URLs
          const processedData = processUserData(rawUserData);
          
          console.log('FETCH - Received interests from backend:', processedData.interests);
          console.log('FETCH - Full processed data:', processedData);
          
          // Set the profile data with all fetched information
          setProfileData({
            login_session_token: session.user.sessionToken,
            profile_pic: processedData.profile_pic || processedData.profile_picture || null,
            banner: processedData.banner || null,
            username: processedData.username || '',
            fullname: processedData.full_name || processedData.fullname || '',
            description: processedData.description || '',
            country: processedData.country || '',
            state: processedData.state || '',
            interests: Array.isArray(processedData.interests) ? processedData.interests : [],
          });
          
          console.log('Profile data set successfully for edit');
        } else {
          throw new Error("Invalid user data format");
        }
      } catch (parseError) {
        console.log("Parse error:", parseError.message);
        throw parseError;
      }
    };

    if (status === "authenticated") {
      fetchUserProfile();
    }
    
    // Handle visibility change to refresh data
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && status === "authenticated") {
        fetchUserProfile();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Cleanup event listener
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [session, status, router]);

  // Also try to load from localStorage if available (similar to user profile)
  useEffect(() => {
    if (!isLoadingUserData && status === "authenticated" && profileData.username === '') {
      // If profileData is not loaded but we're authenticated, try to load from localStorage
      try {
        const storedData = localStorage.getItem("userProfile");
        if (storedData) {
          const parsedData = JSON.parse(storedData);
          console.log("Loading profile data from localStorage for edit:", parsedData);
          
          setProfileData({
            login_session_token: session?.user?.sessionToken || '',
            profile_pic: parsedData.profile_pic || parsedData.profile_picture || null,
            banner: parsedData.banner || null,
            username: parsedData.username || '',
            fullname: parsedData.full_name || parsedData.fullname || '',
            description: parsedData.description || '',
            country: parsedData.country || '',
            state: parsedData.state || '',
            interests: Array.isArray(parsedData.interests) ? parsedData.interests : [],
          });
        }
      } catch (error) {
        console.error("Error loading from localStorage:", error);
      }
    }
  }, [isLoadingUserData, status, profileData.username, session]);

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
        // Check for session expiration before making API calls
        if (!sessionToken) {
          await handleSessionExpiration();
          return;
        }

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
          
          // Check for token expiration or bad request
          if (imageResponse.status === 401 || imageResponse.status === 403 || imageResponse.status === 400) {
            console.log("Session expired or invalid during image upload:", imageResponse.status);
            await handleSessionExpiration();
            return;
          }
          
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

        // Check for token expiration or bad request
        if (dataResponse.status === 401 || dataResponse.status === 403 || dataResponse.status === 400) {
          console.log("Session expired or invalid during profile update:", dataResponse.status);
          await handleSessionExpiration();
          return;
        }
  
        const data = await dataResponse.json();
        console.log('SUBMIT - Backend response:', data);
  
        if (dataResponse.ok) {
          console.log('Updated profile with interests:', profileData.interests);
          
          // Update localStorage with new data
          try {
            const updatedProfileData = {
              ...profileData,
              profile_picture: getAbsoluteUrl(profileData.profile_pic),
              banner: getAbsoluteUrl(profileData.banner),
              full_name: profileData.fullname,
              lastUpdated: new Date().toISOString(),
            };
            localStorage.setItem("userProfile", JSON.stringify(updatedProfileData));
            console.log("Updated localStorage with new profile data");
          } catch (error) {
            console.error("Error updating localStorage:", error);
          }
          
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
        
        // Check if error is related to authentication or bad request
        if (error.message.includes("401") || 
            error.message.includes("403") || 
            error.message.includes("400") ||
            error.message.includes("unauthorized") || 
            error.message.includes("token") || 
            error.message.includes("expired")) {
          await handleSessionExpiration();
          return;
        }
        
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