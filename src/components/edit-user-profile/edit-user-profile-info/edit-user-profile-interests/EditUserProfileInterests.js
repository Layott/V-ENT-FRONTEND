import { useState, useEffect } from 'react';
import { CiSearch } from 'react-icons/ci';
import { CgClose } from "react-icons/cg";
import exStyles from './../edit-user-profile-details/edit-user-profile-details.module.css';
import profileStyles from "@/styles/profile/profile-page.module.css";
import styles from './edit-user-profile-interests.module.css';

// Define all interests and the filtering function directly in this component
// No need to import from another file
const allInterests = [
    "Battle Royale", "God of War", "Uncharted", "Sonic", "Tekken", "Manga", "Anime","Free Fire", "Bloodstrike", "PUBG", 
    "Sniper", "Casual", "Call of Duty", "Fortnite", "Assassin's Creed", "RPG", "eSports", 
    "FIFA", "Apex Legends", "Zelda", "Street Fighter", "Dota 2", "Minecraft", "Overwatch", 
    "Valorant", "Racing Games", "Final Fantasy", "Horror Games", "Cyberpunk 2077", 
    "League of Legends", "MMORPG", "Sports Games", "The Witcher", "Action Games", 
    "Star Wars Games", "Strategy Games", "Adventure Games", "Platformers", "Beat 'em Up", 
    "Indie Games", "Simulation Games", "Mobile Games", "Sandbox Games", "Diablo Series", 
    "Retro Games", "Metroidvania", "Rogue-like Games", "Survival Games", "Multiplayer Games", 
    "Rhythm Games", "Puzzle Games", "Fighting Games", "Guitar Hero", 
    "Dragon Ball Z", "Elder Scrolls", "Battlefield", "Counter-Strike", "Halo", 
    "Metal Gear Solid", "Silent Hill", "Dark Souls", "Bloodborne", "Fortnite", "Red Dead Redemption", 
    "Hades", "Spelunky", "Fallout", "Destiny", "Kingdom Hearts", "Borderlands", "Far Cry", 
    "Genshin Impact", "Tom Clancy's Rainbow Six", "Splinter Cell", "Monster Hunter", 
    "Left 4 Dead", "Tomb Raider", "Ghost of Tsushima", "Dishonored", "Forza Horizon", 
    "Gran Turismo", "Yakuza", "No Man's Sky", "Sea of Thieves", "Persona", 
    "Resident Evil", "StarCraft", "Warcraft", "Team Fortress", "War Thunder", 
    "XCOM", "Age of Empires", "Command & Conquer", "The Sims", "Stardew Valley", 
    "Kerbal Space Program", "Sid Meier's Civilization", "Cities: Skylines", "Escape from Tarkov", 
    "Among Us", "Phasmophobia", "Rust", "Terraria", "ARK: Survival Evolved"
];

const EditUserProfileInterests = ({ selectedInterests = [], handleInterestsChange }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [suggestedInterests, setSuggestedInterests] = useState([]);
    const [errorMessage, setErrorMessage] = useState('');
    
    // Filter interests based on search query
    const filterInterests = (query) => {
        return allInterests.filter(interest => 
            interest.toLowerCase().includes(query.toLowerCase())
        );
    };

    useEffect(() => {
        if (searchQuery.trim() !== "") {
            // Use the inline filterInterests function
            const results = filterInterests(searchQuery);
            setSuggestedInterests(results);
        } else {
            setSuggestedInterests([]);
        }
    }, [searchQuery]);

    const addInterest = (interest) => {
        if (selectedInterests.length < 15) {
            if (!selectedInterests.includes(interest)) {
                handleInterestsChange([...selectedInterests, interest]);
                setSearchQuery('');
                setSuggestedInterests([]);
                setErrorMessage('');
            }
        } else {
            setErrorMessage('You cannot add more than 15 areas of interest!');
            setTimeout(() => {
                setErrorMessage('');
            }, 4000);
        }
    };

    const removeInterest = (interest) => {
    const updatedInterests = selectedInterests.filter(i => i !== interest);
    handleInterestsChange([...updatedInterests]); // Force new reference even if empty
    setErrorMessage('');
};
    

    return (
        <div className={styles.editInterestsContainer}>
            <h3>Profile Details</h3>
            <div className={exStyles.profileDetailsContainer}>
                <p className={profileStyles.instructionText}>You can choose up to 15 interests</p>

                {errorMessage && <p className={styles.errorMessage}>{errorMessage}</p>}

                <div className={styles.searchBar}>
                    <CiSearch className={styles.searchIcon} />
                    <input
                        type='text'
                        placeholder='Interests (ex. Battle Royale)'
                        className={styles.searchInput}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                {suggestedInterests.length > 0 && (
                    <ul className={styles.suggestedInterestsList}>
                        {suggestedInterests.map((interest, index) => (
                            <li
                                key={index}
                                onClick={() => addInterest(interest)}
                                className={styles.suggestedInterestItem}
                            >
                                {interest}
                            </li>
                        ))}
                    </ul>
                )}

                <div className={styles.selectedInterestsContainer}>
                    {selectedInterests.map((interest, index) => (
                        <span key={index}>
                            {interest}
                            <CgClose
                                className={styles.closeIcon}
                                onClick={() => removeInterest(interest)}
                            />
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default EditUserProfileInterests;