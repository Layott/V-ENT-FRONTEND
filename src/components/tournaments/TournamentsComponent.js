import { useState } from "react";
import { MdOutlineClose } from "react-icons/md";
import { FcSearch } from "react-icons/fc";
import { CiSearch } from "react-icons/ci";
import TournamentsFeatured from './tournaments-featured/TournamentsFeatured';
import NewTournaments from './new-tournaments/NewTournaments';
import AllTournaments from './all-tournaments/AllTournaments';
import styles from './tournaments.module.css';

const TournamentsComponent = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchBarVisible, setIsSearchBarVisible] = useState(false);

  const toggleSearchBar = () => {
    setIsSearchBarVisible((prev) => !prev);
  };

  const handleSearch = () => {
    if (searchQuery.trim() !== '') {
      console.log(`Searching for: ${searchQuery}`);
    }
  };

  return (
    <div className={styles.tournamentsComponentContainer}>
      <div className={styles.searchFilterCreateTournamentContainer}>
        <div className={styles.searchContainer}>
          {!isSearchBarVisible && (
            <FcSearch
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

        <button className={`${styles.createTournamentBTN} redBTN`}>Create Tournament</button>
      </div>
      <TournamentsFeatured />
      <NewTournaments />
      <AllTournaments />
    </div>
  );
};

export default TournamentsComponent;
