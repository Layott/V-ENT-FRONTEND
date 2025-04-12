'use client'

import { useState, useEffect, use } from 'react';
import { useSession } from "next-auth/react";
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import Sidebar from '@/components/sidebar/Sidebar';
import Header from '@/components/header/Header';
import MobileHeader from '@/components/mobile-header/MobileHeader';
import ProfileBanner from '@/components/user-profile/user-profile-banner/UserProfileBanner';
import ProfileBio from '@/components/user-profile/user-profile-bio/UserProfileBio';
import OverviewLeft from "@/components/user-profile/user-profile-overview-left/UserProfileOverviewLeft";
import OverviewRight from "@/components/user-profile/user-profile-overview-right/UserProfileOverviewRight";
import Gallery from "@/components/user-profile/user-profile-gallery/UserProfileGallery";
import Activity from "@/components/user-profile/user-profile-activity/UserProfileActivity";
import { VENT } from '../api/auth/[...nextauth]/route';
import profileStyles from '@/styles/profile/profile-page.module.css'
import styles from './user-profile.module.css';

const UserProfile = () => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('overview');
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    console.log("Current session status:", status);
  console.log("Session data:", session);
    if (status === "unauthenticated") {
      router.push('/login');
      return;
    }
  
    const fetchUserProfile = async () => {
      if (status === "authenticated" && session?.user?.sessionToken) {
        const sessionToken = session.user.sessionToken;
        const userId = session.user.id;
        
        console.log("==== PROFILE API DEBUG ====");
        console.log("Session token:", sessionToken);
        console.log("User ID:", userId);
        console.log("API Endpoint:", VENT.USER_PROFILE);
    
        try {
          // Try different request formats
          const requestFormats = [
            { 
              method: 'POST',
              headers: { 'Authorization': `Bearer ${sessionToken}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ user_id: userId })
            },
            { 
              method: 'POST',
              headers: { 'Authorization': `Token ${sessionToken}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ user_id: userId })
            },
            { 
              method: 'POST',
              headers: { 'session_token': sessionToken, 'Content-Type': 'application/json' },
              body: JSON.stringify({ user_id: userId })
            },
            { 
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ user_id: userId, session_token: sessionToken })
            },
            { 
              method: 'GET',
              headers: { 'Authorization': `Bearer ${sessionToken}` }
            }
          ];
    
          for (let i = 0; i < requestFormats.length; i++) {
            const format = requestFormats[i];
            console.log(`\nTrying request format ${i+1}:`, format);
            
            try {
              const response = await fetch(VENT.USER_PROFILE, format);
              console.log(`Format ${i+1} response status:`, response.status);
              
              const responseText = await response.text();
              console.log(`Format ${i+1} raw response:`, responseText);
              
              try {
                const data = JSON.parse(responseText);
                console.log(`Format ${i+1} parsed data:`, data);
                
                if (data?.data || data?.user || data?.status === 'success') {
                  console.log(`Format ${i+1} SUCCESSFUL!`);
                  
                  // Try different data structures
                  const userData = data.data || data.user || (data.status === 'success' ? data : null);
                  
                  if (userData) {
                    setUserData(userData);
                    return; // Exit the function if successful
                  }
                }
              } catch (parseError) {
                console.log(`Format ${i+1} parse error:`, parseError.message);
              }
            } catch (fetchError) {
              console.log(`Format ${i+1} fetch error:`, fetchError.message);
            }
          }
          
          // If we get here, all formats failed
          throw new Error("All API request formats failed");
        } catch (err) {
          console.error("Final error:", err.message);
          setError(err.message);
        } finally {
          setLoading(false);
        }
      } else {
        console.log("Not authenticated or missing session token");
        setLoading(false);
      }
    };
  
    if (status === "authenticated") {
      fetchUserProfile();
    }
  }, [status, session, router]);
  

  if (loading) return (
    <div
      className={profileStyles.errorContainer}
    >
      Loadings<span className={profileStyles.blinkingDots}></span>
    </div>
  )

  if (error) return (
    <div
      className={profileStyles.errorContainer}
    >
      {error}
    </div>
  )

  // Conditional rendering to handle the null `userData` case
  if (!userData) return (
    <div
      className={profileStyles.errorContainer}
    >
      No user data available!
    </div>
  )

  return (
    <div className={styles.pageContainer}>
      <Header
        fullName={userData?.full_name || 'Unknown'}
        username={userData?.username || 'Unknown'}
        profilePicture={userData?.profile_picture}
      />
      <MobileHeader />
      
      <main className={styles.mainContainer}>
        <Sidebar />
      
        <div className={styles.rightPaneContainer}>
          <ProfileBanner banner={userData?.banner} />
          
          <ProfileBio
            fullName={userData?.full_name || 'Unknown'}
            username={userData?.username || 'Unknown'}
            profilePicture={userData?.profile_picture}
            bio={userData?.description}
            country={userData?.country || 'Unknown'}
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
                <OverviewLeft 
                  interest={userData?.interests || []}
                  gamingAccounts={userData?.gamingAccounts || []}
                  socialLinks={userData?.social_links || []} 
                 />

                <OverviewRight
                  penaltyPoints={userData?.penalty_point || 0}
                  walletBalance={userData?.wallet_balance || 0}
                />
              </div>            
            )}

            {activeTab === 'activity' && (
              <div className={styles.activityContainer}>
                <Activity
                  achievements={userData?.achievements || []}
                  favoriteGames={userData?.favorite_games || []}
                />
              </div>
            )}

            {activeTab === 'gallery' && (
              <div className={styles.galleryContainer}>
                <Gallery />
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default UserProfile;
