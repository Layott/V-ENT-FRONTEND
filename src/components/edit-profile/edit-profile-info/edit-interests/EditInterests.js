import { useState, useEffect } from 'react'
import { CiSearch } from 'react-icons/ci'
import { CgClose } from "react-icons/cg";
import exStyles from './../edit-profile-details/edit-profile-details.module.css'
import profileStyles from "@/styles/profile/profile-page.module.css"
import { fetchInterests } from './interests';
import styles from './edit-interests.module.css'

const EditInterests = () => {
    const [searchQuery, setSearchQuery] = useState('')
    const [suggestedInterests, setSuggestedInterests] = useState([])
    const [selectedInterests, setSelectedInterests] = useState([
        "Battle Royale", "God of War", "Uncharted", "Sonic", "Tekken", 
        "Manga", "Anime", "PUBG", "Sniper", "Casual"
    ])
    const [errorMessage, setErrorMessage] = useState('')

    // Fetch Interests Based on the Search Query
    useEffect(() => {
        if (searchQuery.trim() !== "") {
            fetchInterests(searchQuery).then((results) => {
                setSuggestedInterests(results)
            })
        } else {
            setSuggestedInterests([])
        }
    }, [searchQuery])

    const addInterest = (interest) => {
        if (selectedInterests.length < 15) {
            if (!selectedInterests.includes(interest)) {
                setSelectedInterests([...selectedInterests, interest])
                setSearchQuery('')              // Reset search after adding
                setSuggestedInterests([])       // Clear suggestions after adding
                setErrorMessage('')             // Clear error if under under the limit
            }
        } else {
            setErrorMessage('You cannot add more than 15 areas of interests!')
            setTimeout(() => {
                setErrorMessage('')
            }, 4000)
        }
    }

    // Remove an Interest
    const removeInterest = (interest) => {
        setSelectedInterests(selectedInterests.filter(i => i !== interest))
        setErrorMessage('')
    }

  return (
    <div className={styles.editInterestsContainer}>
        <h3>Profile Details</h3>
        <div className={exStyles.profileDetailsContainer}>
            <p className={profileStyles.instructionText}>You can choose up to 15 interests</p>

            {errorMessage && <p className={styles.errorMessage}>{errorMessage}</p>}
    
            <div className={styles.searchBar}>
                <CiSearch 
                    className={styles.searchIcon}
                />
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
  )
}

export default EditInterests