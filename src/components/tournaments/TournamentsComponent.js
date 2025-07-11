import React, { useEffect, useState } from "react";
import { MdOutlineClose } from "react-icons/md";
import { HiPlus } from "react-icons/hi";
import { CiSearch } from "react-icons/ci";
import { FiSearch } from "react-icons/fi";
import { BiFilter } from "react-icons/bi";
import Link from "next/link";
import TournamentsFeatured from './tournaments-featured/TournamentsFeatured';
import NewTournaments from './new-tournaments/NewTournaments';
import AllTournaments from './all-tournaments/AllTournaments';
import createTournamentStyles from '@/styles/create-tournament/create-tournament.module.css';
import styles from './tournaments.module.css';
import { VENT } from '@/app/api/auth/[...nextauth]/route';

const TournamentsComponent = () => {
  // State for API data
  const [featuredData, setFeaturedData] = useState([]);
  const [newTournamentsData, setNewTournamentsData] = useState([]);
  const [allTournamentsData, setAllTournamentsData] = useState([]);

  // State for search and filter
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchBarVisible, setIsSearchBarVisible] = useState(false);
  const [selectedTournamentType, setSelectedTournamentType] = useState('');
  const [isDropdownVisible, setIsDropdownVisible] = useState(false);

  useEffect(() => {
    const fetchTournaments = async () => {
      try {
        const response = await fetch(VENT.GET_TOURNAMENTS);
        const data = await response.json();

        if (data.status === 'success') {
          const { featured, new: newTournaments, by_game } = data.data;
          setFeaturedData(featured);
          setNewTournamentsData(newTournaments);
          setAllTournamentsData(by_game);
        }
      } catch (error) {
        console.error('Error fetching tournaments data:', error);
      }
    };

    fetchTournaments();
  }, []);

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
    setIsDropdownVisible((prev) => !prev);
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
        <Link href={'./tournaments/drafts'} className={`${styles.createTournamentBTN} redBTN`}>
          <HiPlus className={styles.plusIcon} />
          My Drafts
        </Link>
        {/* Create Tournament Button */}
        <Link href={'./tournaments/create-tournament'} className={`${styles.createTournamentBTN} redBTN`}>
          <HiPlus className={styles.plusIcon} />
          Create Tournament
        </Link>
      </div>

      {/* Tournaments Sections */}
      <TournamentsFeatured data={featuredData} />
      <NewTournaments data={newTournamentsData} />
      <AllTournaments data={allTournamentsData} />
    </div>
  );
};

export default TournamentsComponent;
