'use client'

import { useState } from 'react';
import { SlArrowRight } from "react-icons/sl";
import Sidebar from '@/components/sidebar/Sidebar';
import Header from '@/components/header/Header';
import EditUserProfileInfo from '@/components/edit-user-profile/edit-user-profile-info/EditUserProfileInfo';
import EditUserProfileFavouriteGames from '@/components/edit-user-profile/edit-user-profile-favourite-games/EditUserProfileFavouriteGames';
import EditUserProfileGamingAccounts from '@/components/edit-user-profile/edit-user-profile-gaming-accounts/EditUserProfileGamingAccounts';
import EditLinks from '@/components/edit-user-profile/edit-user-profile-links/EditUserProfileLinks';
import styles from './edit-user-profile.module.css'

const EditUserProfile = () => {
  const [activeTab, setActiveTab] = useState('edit-profile-details')
  
  return (
    <div className={styles.pageContainer}>
      <Header className={styles.customHeader} />
      
      <main className={styles.mainContainer}>
        <Sidebar customClass={styles.customSidebar} />
      
        <div className={styles.rightPaneEditProfileContainer}>
          <div className={styles.menuContainer}>
            <div className={styles.nameMenu}>
              <p>Menu</p>
            </div>

            <div className={styles.buttonContainer}>
              <button
                className={`${styles.tabBTN} ${activeTab === 'edit-profile-details' ? styles.activeTab : ''}`}
                onClick={() => setActiveTab('edit-profile-details')}
              >
                Profile Info {activeTab === 'edit-profile-details' && <SlArrowRight className={styles.rightArrowIcon} />}
              </button>

              <button
                className={`${styles.tabBTN} ${activeTab === 'favourite-games' ? styles.activeTab : ''}`}
                onClick={() => setActiveTab('favourite-games')}
              >
                Favourite Games {activeTab === "favourite-games" && <SlArrowRight className={styles.rightArrowIcon} />}
              </button>

              <button
                className={`${styles.tabBTN} ${activeTab === 'gaming-accounts' ? styles.activeTab : ''}`}
                onClick={() => setActiveTab('gaming-accounts')}
              >
                Gaming Accounts {activeTab === "gaming-accounts" && <SlArrowRight className={styles.rightArrowIcon} />}
              </button>

              <button
                className={`${styles.tabBTN} ${activeTab === 'web-social-links' ? styles.activeTab : ''}`}
                onClick={() => setActiveTab('web-social-links')}
              >
                Web and Social Links {activeTab === "web-social-links" && <SlArrowRight className={styles.rightArrowIcon} />}
              </button>
            </div>
          </div>


          <div className={styles.profileEditDashboard}>
            {activeTab === 'edit-profile-details' && (
              <div className={styles.editProfileDetailsContainer}>
                <EditUserProfileInfo />
              </div>            
            )}

            {activeTab === 'favourite-games' && (
              <div className={styles.editFavouriteGamesContainer}>
                <EditUserProfileFavouriteGames />
              </div>
            )}

            {activeTab === 'gaming-accounts' && (
              <div className={styles.editGamingAccountsContainer}>
                <EditUserProfileGamingAccounts />
              </div>
            )}

            {activeTab === 'web-social-links' && (
              <div className={styles.editLinksContainer}>
                <EditLinks />
              </div>
            )}
          </div>
      
        </div>
      
      </main>

    </div>
  )
}

export default EditUserProfile