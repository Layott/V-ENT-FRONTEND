import { useState } from 'react'
import Image from 'next/image'
import { CiSearch } from 'react-icons/ci'
import { TiArrowSortedDown } from 'react-icons/ti'
import { BsChevronLeft, BsChevronRight } from 'react-icons/bs'
import TeamProfileTournamentsDetails from './TeamProfileTournamentsDetails'
import { teamProfileTournamentsList } from './teamProfileTournamentsList'
import profileStyles from "@/styles/profile/profile-page.module.css"
import styles from './team-profile-tournaments-history.module.css'

const TeamProfileTournamentsHistory = () => {
    const [selectedTournament, setSelectedTournament] = useState(null)
    const [currentPage, setCurrentPage] = useState(1)
    const [rowsPerPage, setRowsPerPage] = useState(10)
    const [searchQuery, setSearchQuery] = useState('')

    const indexOfLastTournament = currentPage * rowsPerPage
    const indexOfFirstTournament = indexOfLastTournament - rowsPerPage
    const currentTournaments = teamProfileTournamentsList.slice(indexOfFirstTournament, indexOfLastTournament)

    // Pagination Handler
    const handlePageChange = (pageNumber) => {
        setCurrentPage(pageNumber)
    }

    const handlePrevClick = () => {
        if (currentPage > 1) {
            setCurrentPage(currentPage - 1)
        }
    }

    const handleNextClick = () => {
        if (currentPage < Math.ceil(teamProfileTournamentsList.length / rowsPerPage)) {
            setCurrentPage(currentPage + 1)
        }
    }

    // Row Count Handler
    const handleRowsPerPageChange = (event) => {
        setRowsPerPage(Number(event.target.value))
        setCurrentPage(1)     // Reset to first page when changing row count
    }  

    const handleViewClick = (tournament) => {
        setSelectedTournament(tournament)
    }

    // Pagination Controls
    const pageNumbers = []
        for (let i = 1; i <= Math.ceil(teamProfileTournamentsList.length / rowsPerPage); i++) {
        pageNumbers.push(i)
    }

    const handleSearch = () => {
        if (searchQuery.trim() != '') {
            console.log(`Searching for: ${searchQuery}`)
        }
    }

    const handleKeyDown = (event) => {
        if (event.key === 'Enter') {
            handleSearch()
        }
    }

  return (
    <div className={profileStyles.tournamentEventsContainer}>
        <div className={profileStyles.tournamentsEventsFilterSearchContainer}>
            <div className={profileStyles.tournamentsEventsFilterContainer}>
                <p className={styles.tournamentNumber}>{teamProfileTournamentsList.length} tournaments</p>
                <div className={`${profileStyles.filterContainer} ${profileStyles.topMostLayerColor}`}>
                    Filter
                </div>

            </div>
          
            <div className={profileStyles.searchContainer}>
                <div className={profileStyles.searchBar}>
                    <CiSearch 
                        className={profileStyles.searchIcon}
                        onClick={handleSearch}
                    />
                        <input
                        type='text'
                        placeholder='Search tournaments'
                        className={profileStyles.searchInput}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                    />
                </div>
            </div>
      </div>

      <div className={`${profileStyles.tournamentsEventsTable}`}>
        <div className={`${styles.gridHeader} ${profileStyles.middleLayerColor}`}>
          <div className={`${styles.gridItem} ${styles.gridItemHeader}`}>Tournament Name</div>
          <div className={`${styles.gridItem} ${styles.gridItemHeader}`}>Game</div>
          <div className={`${styles.gridItem} ${styles.gridItemHeader}`}>Type</div>
          <div className={`${styles.gridItem} ${styles.gridItemHeader}`}>Price</div>
          <div className={`${styles.gridItem} ${styles.gridItemHeader}`}>Status</div>
          <div className={`${styles.gridItem} ${styles.gridItemHeader}`}>Position</div>
          <div className={`${styles.gridItem} ${styles.gridItemHeader}`}>Date</div>
          <div className={`${styles.gridItem} ${styles.gridItemHeader}`}>Actions</div>
        </div>

        {currentTournaments.map((tournament, index) => (
          <div key={index} className={`${styles.gridRow} ${profileStyles.middleLayerColor}`}>
            <div className={`${styles.gridItem} ${styles.nameColumn}`}>
              <div className={styles.gameImageContainer}>
                <Image
                  src={tournament.src}
                  alt={tournament.name}
                  className={styles.gameImage}
                />
              </div>
              <p className={styles.gameName}>{tournament.name}</p>
            </div>
            <div className={styles.gridItem}>{tournament.game}</div>
            <div className={styles.gridItem}>{tournament.type}</div>
            <div className={styles.gridItem}>{tournament.price}</div>
            <div
              className={`${styles.gridItem}`}
            >
              <span className={`${tournament.status === 'Completed' ? styles.completedStatus : styles.inProgress}`}>
                {tournament.status}
              </span>
            </div>
            <div className={styles.gridItem}>{tournament.position}</div>
            <div className={styles.gridItem}>{tournament.date}</div>
            <div className={styles.gridItem}>
              <button
                className={`${styles.exploreBTN} ${profileStyles.topMostLayerColor}`}
                onClick={() => handleViewClick(tournament)}
              >
                Explore
              </button>
            </div>
          </div>
        ))}

      </div>

      <div className={styles.paginationContainer}>
        <div className={styles.rowCountSelector}>
          <label htmlFor="rowsPerPage">Rows </label>
          <div className={styles.customSelectContainer}>
            <select
              id="rowsPerPage"
              value={rowsPerPage}
              onChange={handleRowsPerPageChange}
              className={styles.customSelect}
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={200}>100</option>
            </select>
            <TiArrowSortedDown className={styles.dropDownIcon} />
          </div>
        </div>

        <p className={profileStyles.showingNumber}>
          Showing {indexOfFirstTournament + 1} -{" "}
          {indexOfLastTournament > teamProfileTournamentsList.length ? teamProfileTournamentsList.length : indexOfLastTournament}{" "} of {teamProfileTournamentsList.length}
        </p>

        <div className={styles.pagination}>
          <button
            className={`${styles.navIconBTN} ${currentPage === 1 ? styles.hidden : ''}`}
            onClick={handlePrevClick}
            disabled={currentPage === 1}
          >
            <BsChevronLeft className={styles.navIcon} />
          </button>
          {pageNumbers.map(number => (
            <button
              key={number}
              className={`${styles.pageBTN} ${currentPage === number ? styles.activePage : ''}`}
              onClick={() => handlePageChange(number)}
            >
              {number}
            </button>
          ))}
          <button
            className={`${styles.navIconBTN} ${currentPage === Math.ceil(teamProfileTournamentsList.length / rowsPerPage) ? styles.hidden : ''}`}
            onClick={handleNextClick}
            disabled={currentPage === Math.ceil(teamProfileTournamentsList.length / rowsPerPage)}
          >
            <BsChevronRight
              className={styles.navIcon}
            />
          </button>
        </div>
      </div>
      
      <TeamProfileTournamentsDetails selectedTournament={selectedTournament} setSelectedTournament={setSelectedTournament} />
    </div>
  )
}

export default TeamProfileTournamentsHistory