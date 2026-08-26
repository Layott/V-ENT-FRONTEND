import { mediaUrl } from '@/lib/mediaUrl';
import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { FaArrowLeft } from "react-icons/fa";
import { socialIcons } from './SocialIcons';
import { HiPlus } from "react-icons/hi";
import { MdDelete } from "react-icons/md";
import profileStyles from "@/styles/profile/profile-page.module.css";
import { useT } from '@/i18n/LanguageProvider';
import { useTx } from '@/i18n/LanguageProvider';
const UserProfileOverviewLeft = ({
  interests = [],
  gamingAccounts = [],
  socialLinks
}) => {
  const tx = useTx();
  const tt = useT();
  const [showMoreInterests, setShowMoreInterests] = useState(false);
  const [showMoreGamingAccounts, setShowMoreGamingAccounts] = useState(false);
  const [showMoreSocials, setShowMoreSocials] = useState(false);

  // Social Icon Mapper
  const getSocialIcon = title => {
    return socialIcons[title.toLowerCase()] || socialIcons.default;
  };

  // Deleting/Remove Gaming Accounts
  const deleteGamingAccount = index => {
    console.log(`Removing gaming account at index: ${index}`);
  };

  // Helper function to ensure URL has proper protocol
  const formatUrl = url => {
    if (!url) return '#';
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    return `https://${url}`;
  };
  return <div className={`${profileStyles.overviewLeft} ${profileStyles.middleLayerColor}`}>
      {/* Interests Section */}
      <div className={profileStyles.sectionContainer}>
        <div className={profileStyles.sectionHeader}>
          <h4 className={profileStyles.profileH4Header}>{tt("ui.interests.3fc5", "Interests")}</h4>
          <Link href={'/edit-user-profile'} className={`${profileStyles.addGameAccountBTN}`}>
            <HiPlus className={profileStyles.profileH4Icons} /> {tt("ui.add.61cc", "Add")}
          </Link>
        </div>

        <div className={profileStyles.interestsListContainer}>

            {interests.length === 0 ? <div className={profileStyles.noInterestsContainer}>
                    <h4 className={profileStyles.profileH4HeaderEmptyContent}>{tt("ui.no.interests.yet.43fe", "No interests yet")}</h4>
                    <p className={profileStyles.emptyParagraphContent}>{tt("ui.haven't.added.any.interests.64e6", "You haven't added any of your interests yet")}</p>

                    <Link href={'/edit-user-profile'} className={`${profileStyles.addInterestsBTN} ${profileStyles.topMostLayerColor}`}>
                        <HiPlus className={profileStyles.profileH4IconsEmptyContent} /> {tt("ui.add.interests.d0df", "Add Interests")}
                    </Link>
                </div> : <>
                    {interests.slice(0, showMoreInterests ? interests.length : 9).map((interest, index) => <span key={index} className={`${profileStyles.interest} ${profileStyles.topMostLayerColor}`}>
                            {interest}
                        </span>)}

                    {interests.length > 9 && <button onClick={() => setShowMoreInterests(prev => !prev)} className={`${profileStyles.topMostLayerColor} ${profileStyles.showMoreBTN}`}>
                            {showMoreInterests ? <>
                                    <FaArrowLeft className={profileStyles.rightOrLeftArrowIcon} /> {tt("ui.see.less.47c7", "See less")}
                                </> : `See more +${interests.length - 9}`}
                        </button>}
                </>}
        </div>

      </div>

{/* Gaming Accounts Section */}
      <div className={profileStyles.sectionContainer}>
        <div className={profileStyles.sectionHeader}>
          <h4 className={profileStyles.profileH4Header}>{tt("ui.gaming.accounts.d1e0", "Gaming Accounts")}</h4>
          <Link href={'/edit-user-profile'} className={`${profileStyles.addGameAccountBTN}`}>
            <HiPlus className={profileStyles.profileH4Icons} /> {tt("ui.add.61cc", "Add")}
          </Link>
        </div>

        <div className={profileStyles.gamingAccountsListContainer}>
            {gamingAccounts.length === 0 ? <div className={profileStyles.noGamingAccountsListContainer}>
                    <h4 className={profileStyles.profileH4HeaderEmptyContent}>{tt("ui.no.accounts.connected.yet.07e5", "No accounts connected yet")}</h4>
                    <p className={profileStyles.emptyParagraphContent}>{tt("ui.haven't.connected.any.accounts.c3f7", "You haven't connected any of your accounts yet")}</p>

                    <Link href={'/edit-user-profile'} className={`${profileStyles.addInterestsBTN} ${profileStyles.topMostLayerColor}`}>
                        <HiPlus className={profileStyles.profileH4IconsEmptyContent} /> {tt("ui.connect.accounts.036d", "Connect Accounts")} 
                    </Link>
                </div> : <>
                        {gamingAccounts.slice(0, showMoreGamingAccounts ? gamingAccounts.length : 4).map((account, index) => <div key={index} className={profileStyles.gamingAccount}>
                                <div>
                                    <div className={profileStyles.gameLogoAndName}>
                                        <div className={profileStyles.gameLogo}>
                                            <Image src={mediaUrl(account.logo)} alt={account.name} />
                                        </div>
                                        <div className={profileStyles.gameName}>
                                            <h4>{account.name}</h4>
                                            <p>{account.handle}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className={`${profileStyles.topMostLayerColor} ${profileStyles.gamingAccountIcon}`} onClick={() => deleteGamingAccount(index)}>
                                    <MdDelete className={profileStyles.profileH4Icons} />
                                </div>
                            </div>)}

                        {gamingAccounts.length > 4 && <button onClick={() => setShowMoreGamingAccounts(prev => !prev)} className={`${profileStyles.topMostLayerColor} ${profileStyles.seeMoreAccountsBTN}`}>
                                {showMoreGamingAccounts ? <>
                                        <FaArrowLeft className={profileStyles.rightOrLeftArrowIcon} /> {tt("ui.see.less.47c7", "See less")}
                                    </> : `See more +${gamingAccounts.length - 4}`}
                            </button>}
                    </>}
        </div>

      </div>

{/* Social Links Section */}
     <div className={profileStyles.sectionContainer}>
  <div className={profileStyles.sectionHeader}>
    <h4 className={profileStyles.profileH4Header}>{tt("ui.social.links.339c", "Social Links")}</h4>
    <Link href={'/edit-user-profile?tab=web-social-links'} className={`${profileStyles.addGameAccountBTN}`}>
      <HiPlus className={profileStyles.profileH4Icons} /> {tt("ui.add.61cc", "Add")}
    </Link>
  </div>
  <div className={profileStyles.socialLinksListContainer}>
      {socialLinks.length === 0 ? <div className={profileStyles.noInterestsContainer}>
              <h4 className={profileStyles.profileH4HeaderEmptyContent}>{tt("ui.no.social.links.yet.57b4", "No social links yet")}</h4>
              <p className={profileStyles.emptyParagraphContent}>{tt("ui.haven't.connected.any.social.7bd9", "You haven't connected any social media links yet")}</p>

              <Link href={'/edit-user-profile?tab=web-social-links'} className={`${profileStyles.addInterestsBTN} ${profileStyles.topMostLayerColor}`}>
                  <HiPlus className={profileStyles.profileH4IconsEmptyContent} /> {tt("ui.add.social.links.8901", "Add Social Links")}
              </Link>
          </div> : <>
              {socialLinks.slice(0, showMoreSocials ? socialLinks.length : 4).map((socialLink, index) => <Link href={formatUrl(socialLink.url)} key={index} target='_blank' rel='noopener noreferrer' className={`${profileStyles.interest} ${profileStyles.topMostLayerColor}`}>
                      {getSocialIcon(socialLink.title)} {tx(socialLink.title)}
                  </Link>)}

              {socialLinks.length > 4 && <button onClick={() => setShowMoreSocials(prev => !prev)} className={`${profileStyles.topMostLayerColor} ${profileStyles.showMoreBTN}`}>
                      {showMoreSocials ? <>
                              <FaArrowLeft className={profileStyles.rightOrLeftArrowIcon} /> {tt("ui.see.less.47c7", "See less")}
                          </> : `See more +${socialLinks.length - 4}`}
                  </button>}
          </>}
  </div>
</div>
    </div>;
};
export default UserProfileOverviewLeft;