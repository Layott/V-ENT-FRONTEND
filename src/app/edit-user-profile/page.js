'use client'

import { useState, useEffect, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { SlArrowRight } from "react-icons/sl";
import Sidebar from '@/components/sidebar/Sidebar';
import Header from '@/components/header/Header';
import MobileHeader from '@/components/mobile-header/MobileHeader';
import BottomMenu from '@/components/bottom-menu/BottomMenu';
import EditUserProfileInfo from '@/components/edit-user-profile/edit-user-profile-info/EditUserProfileInfo';
import EditUserProfileFavouriteGames from '@/components/edit-user-profile/edit-user-profile-favourite-games/EditUserProfileFavouriteGames';
import EditUserProfileGamingAccounts from '@/components/edit-user-profile/edit-user-profile-gaming-accounts/EditUserProfileGamingAccounts';
import EditLinks from '@/components/edit-user-profile/edit-user-profile-links/EditUserProfileLinks';
import editProfileStyles from '@/styles/profile/edit-profile/edit-profile.module.css';

// Create a separate component for the search params logic
const EditUserProfileContent = () => {
  const [activeTab, setActiveTab] = useState('edit-profile-details');
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Check URL parameters and set active tab
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && ['edit-profile-details', 'favourite-games', 'gaming-accounts', 'web-social-links', 'forgot-password'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  // Check if user is authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login?callbackUrl=/edit-profile');
    }
  }, [status, router]);

  // Show loading state while checking authentication
  if (status === 'loading') {
    return (
      <div className={editProfileStyles.loadingContainer}>
        <p>Loading profile editor...</p>
      </div>
    );
  }

  // Only render the profile editor if authenticated
  if (!session) {
    return null; // Don't render anything while redirecting
  }

  return (
    <div className={editProfileStyles.pageContainer}>
      <Header className={editProfileStyles.customHeader} />
      <MobileHeader />
      
      <main className={editProfileStyles.mainContainer}> 
        <Sidebar customClass={editProfileStyles.customSidebar} />
      
        <div className={editProfileStyles.rightPaneEditProfileContainer}>
          <div className={editProfileStyles.menuContainer}>
            <div className={editProfileStyles.nameMenu}>
              <p>Menu</p>
            </div>

            <div className={editProfileStyles.buttonContainer}>
              <button
                className={`${editProfileStyles.tabBTN} ${activeTab === 'edit-profile-details' ? editProfileStyles.activeTab : ''}`}
                onClick={() => setActiveTab('edit-profile-details')}
              >
                Profile Info {activeTab === 'edit-profile-details' && <SlArrowRight className={editProfileStyles.rightArrowIcon} />}
              </button>

              <button
                className={`${editProfileStyles.tabBTN} ${editProfileStyles.notAllowed} ${activeTab === 'favourite-games' ? editProfileStyles.activeTab : ''}`}
                onClick={() => setActiveTab('favourite-games')}
                disabled={true}
                 
              >
                Favourite Games <span className={`${editProfileStyles.notAllowedSpan}`} >Coming Soon</span> {activeTab === "favourite-games" && <SlArrowRight className={editProfileStyles.rightArrowIcon} />}
              </button>

              <button
                className={`${editProfileStyles.tabBTN} ${editProfileStyles.notAllowed} ${activeTab === 'gaming-accounts' ? editProfileStyles.activeTab : ''}`}
                onClick={() => setActiveTab('gaming-accounts')}
                disabled={true}
                
              >
                Gaming Accounts <span className={`${editProfileStyles.notAllowedSpan}`}>Coming Soon</span> {activeTab === "gaming-accounts" && <SlArrowRight className={editProfileStyles.rightArrowIcon} />}
              </button>

              <button
                className={`${editProfileStyles.tabBTN} ${activeTab === 'web-social-links' ? editProfileStyles.activeTab : ''}`}
                onClick={() => setActiveTab('web-social-links')}
              >
                Web and Social Links {activeTab === "web-social-links" && <SlArrowRight className={editProfileStyles.rightArrowIcon} />}
              </button>

              <button
                className={`${editProfileStyles.tabBTN} ${activeTab === 'forgot-password' ? editProfileStyles.activeTab : ''}`}
                onClick={() => {
                  if(session) {
                    setActiveTab('forgot-password');
                    router.push('/forgot-password?from=edit-profile');
                  }
                  }}
              >
                Forgot Password {activeTab === 'forgot-password' && <SlArrowRight className={editProfileStyles.rightArrowIcon} />}
              </button>
            </div>
          </div>

          <div className={editProfileStyles.profileEditDashboard}>
            {activeTab === 'edit-profile-details' && (
              <div className={editProfileStyles.editProfileDetailsContainer}>
                <EditUserProfileInfo />
              </div>            
            )}

            {activeTab === 'favourite-games' && (
              <div className={editProfileStyles.editFavouriteGamesContainer}>
                <EditUserProfileFavouriteGames />
              </div>
            )}

            {activeTab === 'gaming-accounts' && (
              <div className={editProfileStyles.editGamingAccountsContainer}>
                <EditUserProfileGamingAccounts />
              </div>
            )}

            {activeTab === 'web-social-links' && (
              <div className={editProfileStyles.editLinksContainer}>
                <EditLinks />
              </div>
            )}

            {/* {activeTab === 'forgot-password' && (
              <div className={editProfileStyles.editLinksContainer}>
                <EditLinks />
              </div>
            )} */}
          </div>
      
        </div>
      
      </main>

      <BottomMenu />

    </div>
  );
};

const EditUserProfile = () => {
  return (
    <Suspense fallback={
      <div className={editProfileStyles.loadingContainer}>
        <p>Loading profile editor...</p>
      </div>
    }>
      <EditUserProfileContent />
    </Suspense>
  );
};

export default EditUserProfile;