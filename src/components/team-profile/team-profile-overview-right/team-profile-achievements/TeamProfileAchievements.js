import { useState } from "react";
import Image from "next/image";
import { GrTrophy } from "react-icons/gr";
import { FaArrowRight } from "react-icons/fa";
import { FaArrowLeft } from "react-icons/fa";
import killSpreeBadge from "@/images/killing_spree_badge.webp";
import mortalKombatBadge from "@/images/mortal_kombat_badge.webp";
import marioKartBadge from '@/images/mario_kart_badge.webp';
import nbaThreeKWinBadge from '@/images/nba_three_k_wins_badge.webp';
import icarusBadge from '@/images/counter_striker_icarus_badge.webp';
import profileStyles from "@/styles/profile/profile-page.module.css";
import { useT } from '@/i18n/LanguageProvider';
import { useTx } from '@/i18n/LanguageProvider';
const TeamProfileAchievements = () => {
  const tx = useTx();
  const tt = useT();
  const [showAll, setShowAll] = useState(false);
  const [visibleGames, setVisibleGames] = useState(6);
  const achievementsList = [{
    name: "Call of Duty - Killing Spree 100 Kills",
    src: killSpreeBadge
  }, {
    name: "Counter Strike - King Cache",
    src: killSpreeBadge
  }, {
    name: "Mortal Kombat - Premium",
    src: mortalKombatBadge
  }, {
    name: "Mario Kart - King Banana",
    src: marioKartBadge
  }, {
    name: "NBA 2k2024 - 3K wins",
    src: nbaThreeKWinBadge
  }, {
    name: "Counter Strike - Icarus",
    src: icarusBadge
  }, {
    name: "Call of Duty - Double Kill Master",
    src: killSpreeBadge
  }, {
    name: "Mortal Kombat - Fatality Legend",
    src: mortalKombatBadge
  }, {
    name: "Mario Kart - Speed Demon",
    src: marioKartBadge
  }, {
    name: "NBA 2k2024 - Slam Dunk Champion",
    src: nbaThreeKWinBadge
  }, {
    name: "Counter Strike - Eagle Eye",
    src: icarusBadge
  }, {
    name: "Mario Kart - Drift King",
    src: marioKartBadge
  }, {
    name: "Mortal Kombat - Flawless Victory",
    src: mortalKombatBadge
  }, {
    name: "NBA 2k2024 - MVP 5K Wins",
    src: nbaThreeKWinBadge
  }, {
    name: "Counter Strike - Stealth Assassin",
    src: icarusBadge
  }];
  const handleSeeMoreAndLess = () => {
    setShowAll(prevState => !prevState);
    setVisibleGames(prevState => prevState === achievementsList.length ? 6 : achievementsList.length);
  };
  return <div className={`${profileStyles.achievementsContainer} ${profileStyles.middleLayerColor}`}>
      <div className={profileStyles.achievementsHeader}>
        <h4 className={profileStyles.profileH4Header}>
            <GrTrophy className={profileStyles.achievementsIcon} />{tt("ui.achievements.7d7c", "Achievements (")}{achievementsList.length})
        </h4>
        <button className={profileStyles.seeMoreBTN} onClick={handleSeeMoreAndLess}>
          {showAll ? tx("See less") : tx("See more")}
          {showAll ? <FaArrowLeft className={profileStyles.rightOrLeftArrowIcon} /> : <FaArrowRight className={profileStyles.rightOrLeftArrowIcon} />}
        </button>
      </div>

      <div className={profileStyles.gameOrAchievementContainer}>
        {achievementsList.slice(0, visibleGames).map((achievement, index) => <div key={index} className={`${profileStyles.gameOrAchievementCard} ${profileStyles.achievementCard}`}>
              <div className={`${profileStyles.gameOrAchievementImageContainer} ${profileStyles.achievementImageContainer} ${profileStyles.topMostLayerColor}`}>
                <Image src={achievement.src} alt={achievement.name} className={`${profileStyles.gameOrAchievementImage} ${profileStyles.achievementImage}`} />
              </div>
              <p className={profileStyles.gameOrAchievementName}>{achievement.name}</p>     
          </div>)}        
      </div>

    </div>;
};
export default TeamProfileAchievements;