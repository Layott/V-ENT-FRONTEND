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

const EditTeamProfileInfo = () => {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [profileData, setProfileData] = useState({
    // login_session_token: '',
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

  // Update login_session_token in profileData when session data is available
  useEffect(() => {
    if (status === "authenticated" && session?.user?.sessionToken) {
      const sessionToken = session.user.sessionToken;
      setProfileData((prevData) => ({
        ...prevData,
        login_session_token: sessionToken,
      }));
    }
  }, [session, status]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setProfileData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleInterestsChange = (newInterests) => {
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

      const formData = new FormData();
      formData.append('login_session_token', profileData.login_session_token);
      if (profileData.profile_pic) formData.append('profile_pic', profileData.profile_pic);
      if (profileData.banner) formData.append('banner', profileData.banner);
      formData.append('username', profileData.username);
      formData.append('fullname', profileData.fullname);
      formData.append('description', profileData.description);
      formData.append('country', profileData.country);
      formData.append('interests', JSON.stringify(profileData.interests));

      try {
        const response = await fetch(VENT.EDIT_PROFILE, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${sessionToken}`, // Don't include 'Content-Type'; FormData handles it.
          },
          body: formData,
        });

        const data = await response.json();

        if (response.ok) {
          router.push('/user-profile');
          setSnackbarMessage(data.message || 'Profile updated successfully!');
          setSnackbarType('success');
          setProfileData({
            login_session_token: '',
            profile_pic: null,
            banner: null,
            username: '',
            fullname: '',
            description: '',
            country: '',
            interests: [],
          });
        } else {
          setSnackbarMessage(data.message || 'Failed to update profile.');
          setSnackbarType('error');
        }
        setOpen(true);
      } catch (error) {
        console.error('Error updating profile:', error);
        setSnackbarMessage('An error occurred while updating your profile.');
        setSnackbarType('error');
        setOpen(true);
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
