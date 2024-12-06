'use client'

import { useState, useEffect, use } from 'react';
import { useSession } from "next-auth/react";
import { useRouter } from 'next/navigation';
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
    if (status === "unauthenticated") {
      router.push('/login');
      return;
    }

    const fetchUserProfile = async () => {
      if (status === "authenticated" && session?.user?.sessionToken) {
        const sessionToken = session.user.sessionToken;

        try {
          const response = await fetch(VENT.USER_PROFILE, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${sessionToken}`,
            }
          });

          if (!response.ok) {
            throw new Error('Failed to fetch user profile');
          }

          const data = await response.json();

          // if (!data.data) {
          //   router.push('/login');
          //   return;
          // }

          if (!data?.data) {
            throw new Error("User profile data is missing. Please log in again.");
          }

          setUserData(data.data);
          // Save the user data into localStorage for persistence
          localStorage.setItem('userProfile', JSON.stringify(data.data));
        } catch (err) {
          console.error("Error fetching user profile:", error.message);
          setError(err.message);
        } finally {
          setLoading(false);
        }
      } else {
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
