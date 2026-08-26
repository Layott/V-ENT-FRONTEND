import { useState, useEffect } from 'react';
import { CiSearch } from 'react-icons/ci';
import { CgClose } from "react-icons/cg";
import exStyles from './../edit-team-profile-details/edit-team-profile-details.module.css';
import profileStyles from "@/styles/profile/profile-page.module.css";
import styles from './edit-team-profile-interests.module.css';
import { useT } from '@/i18n/LanguageProvider';

// Define all interests and the filtering function directly in this component
const allInterests = ["Battle Royale", "God of War", "Uncharted", "Sonic", "Tekken", "Manga", "Anime", "PUBG", "Sniper", "Casual", "Call of Duty", "Fortnite", "Assassin's Creed", "RPG", "eSports", "FIFA", "Apex Legends", "Zelda", "Street Fighter", "Dota 2", "Minecraft", "Overwatch", "Valorant", "Racing Games", "Final Fantasy", "Horror Games", "Cyberpunk 2077", "League of Legends", "MMORPG", "Sports Games", "The Witcher", "Action Games", "Star Wars Games", "Strategy Games", "Adventure Games", "Platformers", "Beat 'em Up", "Indie Games", "Simulation Games", "Mobile Games", "Sandbox Games", "Diablo Series", "Retro Games", "Metroidvania", "Rogue-like Games", "Survival Games", "Multiplayer Games", "Rhythm Games", "Puzzle Games", "Fighting Games", "Guitar Hero", "Dragon Ball Z", "Elder Scrolls", "Battlefield", "Counter-Strike", "Halo", "Metal Gear Solid", "Silent Hill", "Dark Souls", "Bloodborne", "Fortnite", "Red Dead Redemption", "Hades", "Spelunky", "Fallout", "Destiny", "Kingdom Hearts", "Borderlands", "Far Cry", "Genshin Impact", "Tom Clancy's Rainbow Six", "Splinter Cell", "Monster Hunter", "Left 4 Dead", "Tomb Raider", "Ghost of Tsushima", "Dishonored", "Forza Horizon", "Gran Turismo", "Yakuza", "No Man's Sky", "Sea of Thieves", "Persona", "Resident Evil", "StarCraft", "Warcraft", "Team Fortress", "War Thunder", "XCOM", "Age of Empires", "Command & Conquer", "The Sims", "Stardew Valley", "Kerbal Space Program", "Sid Meier's Civilization", "Cities: Skylines", "Escape from Tarkov", "Among Us", "Phasmophobia", "Rust", "Terraria", "ARK: Survival Evolved"];

// Implement fetchInterests function instead of importing it
const fetchInterests = query => {
  return new Promise(resolve => {
    const results = allInterests.filter(interest => interest.toLowerCase().includes(query.toLowerCase()));
    resolve(results);
  });
};
const EditTeamProfileInterests = ({
  selectedInterests = [],
  handleInterestsChange
}) => {
  const tt = useT();
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestedInterests, setSuggestedInterests] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');
  useEffect(() => {
    if (searchQuery.trim() !== "") {
      fetchInterests(searchQuery).then(results => {
        setSuggestedInterests(results);
      });
    } else {
      setSuggestedInterests([]);
    }
  }, [searchQuery]);
  const addInterest = interest => {
    if (selectedInterests.length < 15) {
      if (!selectedInterests.includes(interest)) {
        handleInterestsChange([...selectedInterests, interest]);
        setSearchQuery('');
        setSuggestedInterests([]);
        setErrorMessage('');
      }
    } else {
      setErrorMessage('You cannot add more than 15 areas of interests!');
      setTimeout(() => {
        setErrorMessage('');
      }, 4000);
    }
  };
  const removeInterest = interest => {
    handleInterestsChange(selectedInterests.filter(i => i !== interest));
    setErrorMessage('');
  };
  return <div className={styles.editInterestsContainer}>
            <h3>{tt("ui.interests.3fc5", "Interests")}</h3>
            <div className={exStyles.profileDetailsContainer}>
                <p className={profileStyles.instructionText}>{tt("ui.can.choose.up.interests.ed38", "You can choose up to 15 interests")}</p>

                {errorMessage && <p className={styles.errorMessage}>{errorMessage}</p>}

                <div className={styles.searchBar}>
                    <CiSearch className={styles.searchIcon} />
                    <input type='text' placeholder={tt("ui.interests.ex.battle.royale.6103", "Interests (ex. Battle Royale)")} className={styles.searchInput} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                </div>

                {suggestedInterests.length > 0 && <ul className={styles.suggestedInterestsList}>
                        {suggestedInterests.map((interest, index) => <li key={index} onClick={() => addInterest(interest)} className={styles.suggestedInterestItem}>
                                {interest}
                            </li>)}
                    </ul>}

                <div className={styles.selectedInterestsContainer}>
                    {selectedInterests.map((interest, index) => <span key={index}>
                            {interest}
                            <CgClose className={styles.closeIcon} onClick={() => removeInterest(interest)} />
                        </span>)}
                </div>
            </div>
        </div>;
};
export default EditTeamProfileInterests;