import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { FaArrowLeft } from "react-icons/fa";
import { socialIcons } from './SocialIcons';
import { HiPlus } from "react-icons/hi";
import { MdDelete } from "react-icons/md";
import profileStyles from "@/styles/profile/profile-page.module.css";

const UserProfileOverviewLeft = ({ interests = [], gamingAccounts = [], socialLinks }) => {
  const [showMoreInterests, setShowMoreInterests] = useState(false);
  const [showMoreGamingAccounts, setShowMoreGamingAccounts] = useState(false);
  const [showMoreSocials, setShowMoreSocials] = useState(false);

  // Social Icon Mapper
  const getSocialIcon = (title) => {
    return socialIcons[title.toLowerCase()] || socialIcons.default;
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

            {interests.length === 0 ? (
                <div className={profileStyles.noInterestsContainer}>
                    <h4 className={profileStyles.profileH4HeaderEmptyContent}>No interests yet</h4>
                    <p className={profileStyles.emptyParagraphContent}>You haven&#39;t added any of your interests yet</p>

                    <Link href={'/edit-user-profile'} className={`${profileStyles.addInterestsBTN} ${profileStyles.topMostLayerColor}`}>
                        <HiPlus className={profileStyles.profileH4IconsEmptyContent} /> Add Interests
                    </Link>
                </div>
            ) : (
                <>
                    {interests.slice(0, showMoreInterests ? interests.length : 9).map((interest, index) => (
                        <span
                            key={index}
                            className={`${profileStyles.interest} ${profileStyles.topMostLayerColor}`}
                        >
                            {interest}
                        </span>
                    ))}

                    {interests.length > 9 && (
                        <button
                            onClick={() => setShowMoreInterests((prev) => !prev)}
                            className={`${profileStyles.topMostLayerColor} ${profileStyles.showMoreBTN}`}
                        >
                            {showMoreInterests ? (
                                <>
                                    <FaArrowLeft className={profileStyles.rightOrLeftArrowIcon} /> See less
                                </>
                            ) : (
                                `See more +${interests.length - 9}`
                            )}
                        </button>
                    )}
                </>
            )}
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
            {gamingAccounts.length === 0 ? (
                <div className={profileStyles.noGamingAccountsListContainer}>
                    <h4 className={profileStyles.profileH4HeaderEmptyContent}>No accounts connected yet</h4>
                    <p className={profileStyles.emptyParagraphContent}>You haven&#39;t connected any of your accounts yet</p>

                    <Link href={'/edit-user-profile'} className={`${profileStyles.addInterestsBTN} ${profileStyles.topMostLayerColor}`}>
                        <HiPlus className={profileStyles.profileH4IconsEmptyContent} /> Connect Accounts 
                    </Link>
                </div>
                ) : (
                    <>
                        {gamingAccounts.slice(0, showMoreGamingAccounts ? gamingAccounts.length : 4).map((account, index) => (
                            <div key={index} className={profileStyles.gamingAccount}>
                                <div>
                                    <div className={profileStyles.gameLogoAndName}>
                                        <div className={profileStyles.gameLogo}>
                                            <Image
                                                src={account.logo}
                                                alt={account.name}
                                            />
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

                        {gamingAccounts.length > 4 && (
                            <button
                                onClick={() => setShowMoreGamingAccounts(prev => !prev)}
                                className={`${profileStyles.topMostLayerColor} ${profileStyles.seeMoreAccountsBTN}`}
                            >
                                {showMoreGamingAccounts ? (
                                    <>
                                        <FaArrowLeft className={profileStyles.rightOrLeftArrowIcon} /> See less
                                    </>
                                ) : (
                                    `See more +${gamingAccounts.length - 4}`
                                )}
                            </button>                        
                        )}
                    </>
                )
            }
        </div>

      </div>

      <hr className={profileStyles.sectionHr} />

      {/* Social Links Section */}
      <div className={profileStyles.sectionContainer}>
        <h4 className={profileStyles.sectionHeader}>Social Links</h4>
        <div className={profileStyles.socialLinksListContainer}>
            {socialLinks.length === 0 ? (
                <div className={profileStyles.noInterestsContainer}>
                    <h4 className={profileStyles.profileH4HeaderEmptyContent}>No social links yet</h4>
                    <p className={profileStyles.emptyParagraphContent}>You haven&#39;t connected any social media links yet</p>

                    <Link href={'/edit-user-profile'} className={`${profileStyles.addInterestsBTN} ${profileStyles.topMostLayerColor}`}>
                        <HiPlus className={profileStyles.profileH4IconsEmptyContent} /> Add Social Links
                    </Link>
                </div>
            ) : (
                <>
                    {socialLinks.slice(0, showMoreSocials ? socialLinks.length : 4).map((socialLink, index) => (
                        <Link
                            href={socialLink.url}
                            key={index}
                            target='_blank'
                            rel='noopener noreferrer'
                            className={`${profileStyles.interest} ${profileStyles.topMostLayerColor}`}
                        >
                            {getSocialIcon(socialLink.title)} {socialLink.title}
                        </Link>
                    ))}

                    {socialLinks.length > 4 && (
                        <button
                            onClick={() => setShowMoreSocials((prev) => !prev)}
                            className={`${profileStyles.topMostLayerColor} ${profileStyles.showMoreBTN}`}
                        >
                            {showMoreSocials ? (
                                <>
                                    <FaArrowLeft className={profileStyles.rightOrLeftArrowIcon} /> See less
                                </>
                            ) : (
                                `See more +${socialLinks.length - 4}`
                            )}
                        </button>
                    )}
                </>
            )}
        </div>
      </div>
    </div>
  );
};

export default UserProfileOverviewLeft;
