'use client'

import { useState } from 'react';
import { SlArrowRight } from "react-icons/sl";
import Sidebar from '@/components/sidebar/Sidebar';
import ProfileHeader from '@/components/profile/profile-header/ProfileHeader';
import EditProfileInfo from '@/components/edit-profile/edit-profile-info/EditProfileInfo';
import EditFavouriteGames from '@/components/edit-profile/edit-favourite-games/EditFavouriteGames';
import EditGamingAccounts from '@/components/edit-profile/edit-gaming-accounts/EditGamingAccounts';
import EditLinks from '@/components/edit-profile/edit-links/EditLinks';
import profileStyles from "@/styles/profile/profile-page.module.css"
import styles from './edit-profile.module.css'

const EditProfile = () => {
  const [activeTab, setActiveTab] = useState('edit-profile-details')

  return (
    <div className={styles.pageContainer}>
      <ProfileHeader />
      
      <main className={styles.mainContainer}>
        <Sidebar />
      
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
                <EditProfileInfo />
              </div>            
            )}

            {activeTab === 'favourite-games' && (
              <div className={styles.editFavouriteGamesContainer}>
                <EditFavouriteGames />
              </div>
            )}

            {activeTab === 'gaming-accounts' && (
              <div className={styles.editGamingAccountsContainer}>
                <EditGamingAccounts />
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

export default EditProfile