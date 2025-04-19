'use client'

import { useState } from 'react';
import { SlArrowRight } from "react-icons/sl";
import Sidebar from '@/components/sidebar/Sidebar';
import Header from '@/components/header/Header';
import MobileHeader from '@/components/mobile-header/MobileHeader';
import BottomMenu from '@/components/bottom-menu/BottomMenu';
import EditTeamProfileInfo from '@/components/edit-team-profile/edit-team-profile-info/EditTeamProfileInfo';
import EditLinks from '@/components/edit-team-profile/edit-team-profile-links/EditTeamProfileLinks';
import Membership from '@/components/edit-team-profile/edit-team-profile-membership/EditTeamProfileMembership';
import editProfileStyles from '@/styles/profile/edit-profile/edit-profile.module.css'

const EditTeamProfile = () => {
  const [activeTab, setActiveTab] = useState('edit-profile-details')
  
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
                className={`${editProfileStyles.tabBTN} ${activeTab === 'web-social-links' ? editProfileStyles.activeTab : ''}`}
                onClick={() => setActiveTab('web-social-links')}
              >
                Web and Social Links {activeTab === "web-social-links" && <SlArrowRight className={editProfileStyles.rightArrowIcon} />}
              </button>

              <button
                className={`${editProfileStyles.tabBTN} ${activeTab === 'membership' ? editProfileStyles.activeTab : ''}`}
                onClick={() => setActiveTab('membership')}
              >
                Membership {activeTab === "membership" && <SlArrowRight className={editProfileStyles.rightArrowIcon} />}
              </button>

            </div>
          </div>


          <div className={editProfileStyles.profileEditDashboard}>
            {activeTab === 'edit-profile-details' && (
              <div className={editProfileStyles.editProfileDetailsContainer}>
                <EditTeamProfileInfo />
              </div>            
            )}

            {activeTab === 'web-social-links' && (
              <div className={editProfileStyles.editLinksContainer}>
                <EditLinks />
              </div>
            )}

            {activeTab === 'membership' && (
              <div className={editProfileStyles.editFavouriteGamesContainer}>
                <Membership />
              </div>
            )}

          </div>
      
        </div>
      
      </main>

      <BottomMenu />

    </div>
  )
}

export default EditTeamProfile