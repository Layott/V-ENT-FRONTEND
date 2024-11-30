'use client'

import { useState, useEffect } from 'react';
import { useSession } from "next-auth/react";
import Cookies from 'js-cookie';
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
  const { data: session, status } = useSession();
  const [activeTab, setActiveTab] = useState('overview');
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (status === "authenticated" && session?.user?.sessionToken) {
        const sessionToken = session.user.sessionToken; // Ensure the token exists
  
        try {
          const response = await fetch(VENT.USER_PROFILE, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${sessionToken}`, // Send the token as Bearer Authorization
            },
            body: JSON.stringify({
              login_session_token: sessionToken,  // Sending the session token in the body 
            }),
          });
  
          if (!response.ok) {
            throw new Error('Failed to fetch user profile');
          }
  
          const data = await response.json();
          setUserData(data.data); 

          // Saving the user data into the local storage
        localStorage.setItem('userProfile', JSON.stringify(data.data));

        } catch (err) {
          setError(err.message);
        } finally {
          setLoading(false);
        }
      }
    };
  
    // Only call the fetch function if the user is authenticated
    if (status === "authenticated") {
      fetchUserProfile();
    } else {
      setLoading(false);  // If not authenticated, stop loading
    }
  }, [status, session]);  // Dependency on status and session to trigger when authenticated

  if (loading) return <p>Loading...</p>;
  if (error) return <p>{error}</p>;
  

  // Render user data if available
  return (
    <div className={styles.pageContainer}>
      <Header
          fullName={userData.full_name} 
          username={userData.username} 
          profilePicture={userData.profile_picture} 
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
                <OverviewLeft interest={userData.interests}/>
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
                <Gallery/>
              </div>
            )}       
          </div>
        </div>
      </main>
    </div>
  );
}

export default UserProfile;
