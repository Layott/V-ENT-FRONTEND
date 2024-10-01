import { useState } from 'react'
import Image from 'next/image'
import { CiSearch } from 'react-icons/ci'
import { TiArrowSortedDown } from 'react-icons/ti'
import { BsChevronLeft, BsChevronRight } from 'react-icons/bs'
import { participantsList } from './participantsList'
import profileStyles from "@/styles/profile/profile-page.module.css"
import styles from './tournament-details-participants.module.css'

const TournamentDetailsParticipants = () => {
    const [currentPage, setCurrentPage] = useState(1)
    const [rowsPerPage, setRowsPerPage] = useState(10)
    const [searchQuery, setSearchQuery] = useState('')

    const indexOfLastParticipant = currentPage * rowsPerPage
    const indexOfFirstParticipant = indexOfLastParticipant - rowsPerPage
    const currentParticipants = participantsList.slice(indexOfFirstParticipant, indexOfLastParticipant)

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
        if (currentPage < Math.ceil(participantsList.length / rowsPerPage)) {
            setCurrentPage(currentPage + 1)
        }
    }

    // Row Count Handler
    const handleRowsPerPageChange = (event) => {
        setRowsPerPage(Number(event.target.value))
        setCurrentPage(1)     // Reset to first page when changing row count
    }  

    // Pagination Controls
    const pageNumbers = []
        for (let i = 1; i <= Math.ceil(participantsList.length / rowsPerPage); i++) {
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

    <div className={styles.tournamentDetailsParticipantsContainer}>
        <div className={styles.tournamentsEventsFilterSearchContainer}>
            <div className={styles.tournamentsEventsFilterContainer}>
                <p className={styles.tournamentNumber}>{participantsList.length} participants</p>
                <div className={`${styles.filterContainer} ${profileStyles.topMostLayerColor}`}>
                    Filter
                </div>

            </div>
          
            <div className={styles.searchContainer}>
                <div className={styles.searchBar}>
                    <CiSearch 
                        className={styles.searchIcon}
                        onClick={handleSearch}
                    />
                    <input
                        type='text'
                        placeholder='Search tournaments'
                        className={styles.searchInput}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                    />
                </div>
            </div>
      </div>

      <div className={`${styles.participantsTable}`}>
        <div className={`${styles.gridHeader} ${profileStyles.middleLayerColor}`}>
          <div className={`${styles.gridItem} ${styles.gridItemHeader}`}>Participant</div>
          <div className={`${styles.gridItem} ${styles.gridItemHeader}`}>Type</div>
          <div className={`${styles.gridItem} ${styles.gridItemHeader}`}>Ranking</div>
          <div className={`${styles.gridItem} ${styles.gridItemHeader}`}>Location</div>
          <div className={`${styles.gridItem} ${styles.gridItemHeader}`}>Tournaments</div>
          <div className={`${styles.gridItem} ${styles.gridItemHeader}`}>Wins</div>
          <div className={`${styles.gridItem} ${styles.gridItemHeader}`}>Losses</div>
          <div className={`${styles.gridItem} ${styles.gridItemHeader}`}>Actions</div>
        </div>

        {currentParticipants.map((participant, index) => (
          <div key={index} className={`${styles.gridRow} ${profileStyles.middleLayerColor}`}>
            <div className={`${styles.gridItem} ${styles.nameColumn}`}>
              <div className={styles.gameImageContainer}>
                <Image
                  src={participant.src}
                  alt={participant.participant}
                  className={styles.gameImage}
                />
              </div>
              <p className={styles.gameName}>{participant.participant}</p>
            </div>
            <div className={styles.gridItem}>{participant.type}</div>
            <div className={styles.gridItem}>{participant.ranking}</div>
            <div className={styles.gridItem}>{participant.location}</div>
            <div className={styles.gridItem}>{participant.tournaments}</div>

            <div className={styles.gridItem}>{participant.wins}</div>
            <div className={styles.gridItem}>{participant.losses}</div>
            <div className={styles.gridItem}>
              <button
                className={`${styles.viewProfileBTN} ${profileStyles.topMostLayerColor}`}
              >
                View Profile
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
          Showing {indexOfFirstParticipant + 1} -{" "}
          {indexOfLastParticipant > participantsList.length ? participantsList.length : indexOfLastParticipant}{" "} of {participantsList.length}
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
            className={`${styles.navIconBTN} ${currentPage === Math.ceil(participantsList.length / rowsPerPage) ? styles.hidden : ''}`}
            onClick={handleNextClick}
            disabled={currentPage === Math.ceil(participantsList.length / rowsPerPage)}
          >
            <BsChevronRight
              className={styles.navIcon}
            />
          </button>
        </div>
      </div>
      
    </div>
  )
}

export default TournamentDetailsParticipants