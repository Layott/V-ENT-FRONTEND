'use client'

import { useState, useEffect } from 'react';
import Sidebar from '@/components/sidebar/Sidebar';
import Header from '@/components/header/Header';
import ProfileBanner from '@/components/user-profile/user-profile-banner/UserProfileBanner';
import ProfileBio from '@/components/user-profile/user-profile-bio/UserProfileBio';
import OverviewLeft from "@/components/user-profile/user-profile-overview-left/UserProfileOverviewLeft";
import OverviewRight from "@/components/user-profile/user-profile-overview-right/UserProfileOverviewRight";
import Gallery from "@/components/user-profile/user-profile-gallery/UserProfileGallery";
import Activity from "@/components/user-profile/user-profile-activity/UserProfileActivity";
import { VENT } from '../api/auth/[...nextauth]/route';
import styles from './user-profile.module.css';

const UserProfile = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchUserProfile = async () => {
      // Retrieve the login session token from localStorage (or a source where it is stored)
      const loginSessionToken = localStorage.getItem('session_token'); 
  
      if (!loginSessionToken) {
        setError('No session token found. Please log in.');
        setLoading(false);
        return;
      }
  
      try {
        const response = await fetch(VENT.USER_PROFILE, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            login_session_token: loginSessionToken  // Post the session token
          }),
        });
  
        if (!response.ok) {
          throw new Error('Failed to fetch user profile');
        }
  
        const data = await response.json();
        setUserData(data.data);  // Store user data from response
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
  
    fetchUserProfile();
  }, []);
  
  if (loading) return <p>Loading...</p>;
  if (error) return <p>{error}</p>;
  

  // Render user data if available
  return (
    <div className={styles.pageContainer}>
      <Header
          fullName={userData.full_name} 
          username={userData.username} 
      />
      
      <main className={styles.mainContainer}>
        <Sidebar />
      
        <div className={styles.rightPaneContainer}>
          {/* Pass user data to ProfileBanner */}
          <ProfileBanner 
            banner={userData.banner} 
          />
          
          {/* Pass user data to ProfileBio */}
          <ProfileBio 
            fullName={userData.full_name} 
            username={userData.username} 
            profilePicture={userData.profile_picture} 
            bio={userData.description} 
            country={userData.country} 
          />

          <div className={styles.buttonContainer}>
            <button
              className={`${styles.tabBTN} ${activeTab === 'overview' ? styles.activeTab : ''}`}
              onClick={() => setActiveTab('overview')}
            >
              Overview
            </button>

            <button
              className={`${styles.tabBTN} ${activeTab === 'activity' ? styles.activeTab : ''}`}
              onClick={() => setActiveTab('activity')}
            >
              Activity
            </button>

            <button
              className={`${styles.tabBTN} ${activeTab === 'gallery' ? styles.activeTab : ''}`}
              onClick={() => setActiveTab('gallery')}
            >
              Gallery
            </button>
          </div>

          <div className={styles.profileDashboard}>
            {activeTab === 'overview' && (
              <div className={styles.overviewContainer}>
                {/* Pass user data to Overview components */}
                <OverviewLeft country={userData.country} />
                <OverviewRight penaltyPoints={userData.penalty_point} walletBalance={userData.wallet_balance} />
              </div>            
            )}

            {activeTab === 'activity' && (
              <div className={styles.activityContainer}>
                {/* Pass user data to Activity component */}
                <Activity achievements={userData.achievements} favoriteGames={userData.favorite_games} />
              </div>
            )}

            {activeTab === 'gallery' && (
              <div className={styles.galleryContainer}>
                {/* Pass user data to Gallery component */}
                <Gallery interests={userData.interests} />
              </div>
            )}       
          </div>
        </div>
      </main>
    </div>
  );
}

export default UserProfile;
