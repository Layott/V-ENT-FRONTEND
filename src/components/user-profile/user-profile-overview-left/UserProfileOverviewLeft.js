import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import playStation from '@/images/playstation.webp';
import xBox from '@/images/Xbox_logo.webp';
import godOfWar from '@/images/god_of_war.webp';
import fc25 from '@/images/fc25.webp';
import steam from '@/images/steam.webp';
import epicGames from '@/images/EpicGames.webp';
import nintendoSwitch from '@/images/NintendoSwitch.webp';
import {
  FaFacebook,
  FaInstagram,
  FaYoutube,
  FaArrowLeft,
  FaGlobe,
} from "react-icons/fa";
import { FaXTwitter, FaGithub } from "react-icons/fa6";
import { HiPlus } from "react-icons/hi";
import { MdDelete } from "react-icons/md";
import profileStyles from "@/styles/profile/profile-page.module.css";

const UserProfileOverviewLeft = ({ interest, socialLinks }) => {
  const [showMoreInterests, setShowMoreInterests] = useState(false);
  const [showMoreGamingAccounts, setShowMoreGamingAccounts] = useState(false);

  // Gaming Accounts Data
  const gamingAccountsList = [
    { logo: playStation, name: 'PlayStation', handle: '@frostbite_psn' },
    { logo: xBox, name: 'XBox', handle: '@frostbite_xbox' },
    { logo: godOfWar, name: 'God of War', handle: '@frostbite_gow' },
    { logo: fc25, name: 'FC25', handle: '@frostbiteFC' },
    { logo: steam, name: 'Steam', handle: '@frostbite_steam' },
    { logo: epicGames, name: 'Epic Games', handle: '@frostbite_eg' },
    { logo: nintendoSwitch, name: 'Nintendo Switch', handle: '@frostbite_ns' },
  ];

  // Social Icon Mapper
  const getSocialIcon = (title) => {
    const icons = {
      facebook: <FaFacebook className={profileStyles.socialIcon} />,
      twitter: <FaXTwitter className={profileStyles.socialIcon} />,
      instagram: <FaInstagram className={profileStyles.socialIcon} />,
      youtube: <FaYoutube className={profileStyles.socialIcon} />,
      github: <FaGithub className={profileStyles.socialIcon} />,
    };
    return icons[title.toLowerCase()] || <FaGlobe className={profileStyles.socialIcon} />;
  };

  // Deleting/Remove Gaming Accounts
  const deleteGamingAccount = (index) => {
    console.log(`Removing gaming account at index: ${index}`);
  };

  return (
    <div className={`${profileStyles.overviewLeft} ${profileStyles.middleLayerColor}`}>
      {/* Interests Section */}
      <div className={profileStyles.sectionContainer}>
        <h4 className={profileStyles.profileH4Header}>Interests</h4>
        <div className={profileStyles.interestsListContainer}>
          {interest.slice(0, showMoreInterests ? interest.length : 9).map((interest, index) => (
            <span key={index} className={`${profileStyles.interest} ${profileStyles.topMostLayerColor}`}>
              {interest}
            </span>
          ))}
          <button
            onClick={() => setShowMoreInterests((prev) => !prev)}
            className={`${profileStyles.topMostLayerColor} ${profileStyles.showMoreBTN}`}
          >
            {showMoreInterests ? (
              <>
                <FaArrowLeft className={profileStyles.rightOrLeftArrowIcon} /> See less
              </>
            ) : (
              `See more +${interest.length - 9}`
            )}
          </button>
        </div>
      </div>

      <hr className={profileStyles.sectionHr} />

      {/* Gaming Accounts Section */}
      <div className={profileStyles.sectionContainer}>
        <div className={profileStyles.sectionHeader}>
          <h4 className={profileStyles.profileH4Header}>Gaming Accounts</h4>
          <button className={`${profileStyles.addGameAccountBTN}`}>
            <HiPlus className={profileStyles.profileH4Icons} /> Add
          </button>
        </div>
        <div className={profileStyles.gamingAccountsListContainer}>
          {gamingAccountsList
            .slice(0, showMoreGamingAccounts ? gamingAccountsList.length : 4)
            .map((account, index) => (
              <div key={index} className={profileStyles.gamingAccount}>
                <div>
                  <div className={profileStyles.gameLogoAndName}>
                    <div className={profileStyles.gameLogo}>
                      <Image src={account.logo} alt={account.name} />
                    </div>
                    <div className={profileStyles.gameName}>
                      <h4>{account.name}</h4>
                      <p>{account.handle}</p>
                    </div>
                  </div>
                </div>
                <div
                  className={`${profileStyles.topMostLayerColor} ${profileStyles.gamingAccountIcon}`}
                  onClick={() => deleteGamingAccount(index)}
                >
                  <MdDelete className={profileStyles.profileH4Icons} />
                </div>
              </div>
            ))}
        </div>

        <button
          onClick={() => setShowMoreGamingAccounts((prev) => !prev)}
          className={`${profileStyles.topMostLayerColor} ${profileStyles.seeMoreAccountsBTN}`}
        >
          {showMoreGamingAccounts ? (
            <>
              <FaArrowLeft className={profileStyles.rightOrLeftArrowIcon} /> See less
            </>
          ) : (
            `See more +${gamingAccountsList.length - 4}`
          )}
        </button>
      </div>

      <hr className={profileStyles.sectionHr} />

      {/* Social Links Section */}
      <div className={profileStyles.sectionContainer}>
        <h4 className={profileStyles.sectionHeader}>Social Links</h4>
        <div className={profileStyles.socialLinksListContainer}>
          {socialLinks.map((link, index) => (
            <Link
              href={link.url}
              key={index}
              target="_blank"
              className={`${profileStyles.socialLink} ${profileStyles.topMostLayerColor}`}
            >
              {getSocialIcon(link.title)} {link.title}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default UserProfileOverviewLeft;
