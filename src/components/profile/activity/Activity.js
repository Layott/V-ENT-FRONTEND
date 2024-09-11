import React from "react";
import { useState } from "react"
import Image from "next/image"
import { BsChevronLeft, BsChevronRight } from "react-icons/bs";
import { tournamentsList } from "./tournamentsList"
import TournamentDetails from "./TournamentDetails";
import profileStyles from "@/styles/profile/profile-page.module.css"
import styles from './activity.module.css'

const Activity = () => {
  const [selectedTournament, setSelectedTournament] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(10)

  const indexOfLastTournament = currentPage * rowsPerPage
  const indexOfFirstTournament = indexOfLastTournament - rowsPerPage
  const currentTournaments = tournamentsList.slice(indexOfFirstTournament, indexOfLastTournament)

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
    if (currentPage < Math.ceil(tournamentsList.length / rowsPerPage)) {
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
  for (let i = 1; i <= Math.ceil(tournamentsList.length / rowsPerPage); i++) {
    pageNumbers.push(i)
  }

  return (
    <div className={styles.activityContainer}>
      <div className={styles.tabContainer}>
        <button className={`${profileStyles.backLayerColor} ${styles.historyBTN} ${styles.tournamentBTN}`}>Tournament History</button>
        <button className={`${profileStyles.backLayerColor} ${styles.historyBTN} ${styles.eventBTN}`}>Event History</button>
      </div>

      <p className={styles.tournamentNumber}>{tournamentsList.length} tournaments</p>

      <div className={`${styles.tournamentsTable}`}>
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
          <select
            id="rowsPerPage"
            value={rowsPerPage}
            onChange={handleRowsPerPageChange}
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>

        <p>
          Showing {indexOfFirstTournament + 1} -{" "}
          {indexOfLastTournament > tournamentsList.length ? tournamentsList.length : indexOfLastTournament}{" "} of {tournamentsList.length}
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
            className={`${styles.navIconBTN} ${currentPage === Math.ceil(tournamentsList.length / rowsPerPage) ? styles.hidden : ''}`}
            onClick={handleNextClick}
            disabled={currentPage === Math.ceil(tournamentsList.length / rowsPerPage)}
          >
            <BsChevronRight
              className={styles.navIcon}
            />
          </button>
        </div>
      </div>
      
      <TournamentDetails selectedTournament={selectedTournament} setSelectedTournament={setSelectedTournament} />

    </div>
  )
}

export default Activity