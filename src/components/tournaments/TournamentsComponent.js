import { useState } from "react";
import Link from "next/link";
import { MdOutlineClose } from "react-icons/md";
import { HiPlus } from "react-icons/hi";
import { CiSearch } from "react-icons/ci";
import { FiSearch } from "react-icons/fi";
import { BiFilter } from "react-icons/bi";
import TournamentsFeatured from './tournaments-featured/TournamentsFeatured';
import NewTournaments from './new-tournaments/NewTournaments';
import AllTournaments from './all-tournaments/AllTournaments';
import createTournamentStyles from '@/styles/create-tournament/create-tournament.module.css';
import styles from './tournaments.module.css';

const TournamentsComponent = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchBarVisible, setIsSearchBarVisible] = useState(false);
  const [selectedTournamentType, setSelectedTournamentType] = useState('');
  const [isDropdownVisible, setIsDropdownVisible] = useState(false); 

  const toggleSearchBar = () => {
    setIsSearchBarVisible((prev) => !prev);
  };

  const handleSearch = () => {
    if (searchQuery.trim() !== '') {
      console.log(`Searching for: ${searchQuery}`);
    }
  };

  const handleFilterChange = (event) => {
    setSelectedTournamentType(event.target.value);
  };

  const toggleDropdown = () => {
    setIsDropdownVisible((prev) => !prev); // Toggle dropdown visibility
  };

  return (
    <div className={styles.tournamentsComponentContainer}>
      <div className={styles.searchFilterCreateTournamentContainer}>
        {/* Search Bar */}
        <div className={styles.searchContainer}>
          {!isSearchBarVisible && (
            <FiSearch
              className={styles.searchIconTrigger}
              onClick={toggleSearchBar}
            />
          )}

          {isSearchBarVisible && (
            <div className={styles.searchBar}>
              <MdOutlineClose
                className={styles.closeIcon}
                onClick={toggleSearchBar}
              />
              <input
                type="text"
                placeholder="Search tournaments, events, users..."
                className={styles.searchInput}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <CiSearch
                className={styles.searchIconInside}
                onClick={handleSearch}
              />
            </div>
          )}
        </div>

        {/* Filter Dropdown */}
        <div className={styles.filterContainer}>
          <BiFilter 
            className={styles.filterIcon} 
            onClick={toggleDropdown} 
          />
          {isDropdownVisible && (
            <select
              value={selectedTournamentType}
              onChange={handleFilterChange}
              className={`${createTournamentStyles.inputWithDropdown} ${styles.inputWithDropdown}`}
            >
              <option value="">Filter</option>
              <option value="battle-royale">Battle Royale</option>
              <option value="sports">Sports</option>
              <option value="strategy">Strategy</option>
            </select>
          )}
        </div>

        {/* Create Tournament Button */}
        <Link href={'./tournaments/create-tournament'} className={`${styles.createTournamentBTN} redBTN`}>
          <HiPlus className={styles.plusIcon} />
          Create Tournament
        </Link>
      </div>

      {/* Tournaments Sections */}
      <TournamentsFeatured />
      <NewTournaments />
      <AllTournaments />
    </div>
  );
};

export default TournamentsComponent;
