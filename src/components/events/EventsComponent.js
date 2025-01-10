import { useState } from 'react'
import Link from 'next/link';
import { MdOutlineClose } from "react-icons/md";
import { HiPlus } from "react-icons/hi";
import { CiSearch } from "react-icons/ci";
import { FiSearch } from "react-icons/fi";
import { BiFilter } from "react-icons/bi";
import EventsFeatured from './events-featured/EventsFeatured'
import UpcomingEvents from './upcoming-events/UpcomingEvents'
import AllEvents from './all-events/AllEvents'
import createTournamentStyles from '@/styles/create-tournament/create-tournament.module.css';
import tournamentStyles from './../tournaments/tournaments.module.css'
import styles from './events.module.css'

const EventsComponent = () => {
  // State for search and filter
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
    setIsDropdownVisible((prev) => !prev);
  };

  return (
    <div className={styles.eventsComponentContainer}>


    <div className={tournamentStyles.searchFilterCreateTournamentContainer}>
        {/* Search Bar */}
        <div className={tournamentStyles.searchContainer}>
          {!isSearchBarVisible && (
            <FiSearch
              className={tournamentStyles.searchIconTrigger}
              onClick={toggleSearchBar}
            />
          )}

          {isSearchBarVisible && (
            <div className={tournamentStyles.searchBar}>
              <MdOutlineClose
                className={tournamentStyles.closeIcon}
                onClick={toggleSearchBar}
              />
              <input
                type="text"
                placeholder="Search tournaments, events, users..."
                className={tournamentStyles.searchInput}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <CiSearch
                className={tournamentStyles.searchIconInside}
                onClick={handleSearch}
              />
            </div>
          )}
        </div>

        {/* Filter Dropdown */}
        <div className={tournamentStyles.filterContainer}>
          <BiFilter
            className={tournamentStyles.filterIcon}
            onClick={toggleDropdown}
          />
          {isDropdownVisible && (
            <select
              value={selectedTournamentType}
              onChange={handleFilterChange}
              className={`${createTournamentStyles.inputWithDropdown} ${tournamentStyles.inputWithDropdown}`}
            >
              <option value="">Filter</option>
              <option value="battle-royale">Battle Royale</option>
              <option value="sports">Sports</option>
              <option value="strategy">Strategy</option>
            </select>
          )}
        </div>

        {/* Create Tournament Button */}
        <Link href={'./events/create-event'} className={`${tournamentStyles.createTournamentBTN} redBTN`}>
          <HiPlus className={tournamentStyles.plusIcon} />
          Create Event
        </Link>
      </div>

      <EventsFeatured />
      <UpcomingEvents />
      <AllEvents />
    </div>
  )
}


export default EventsComponent