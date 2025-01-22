import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { CiSearch } from 'react-icons/ci'
import { TiArrowSortedDown } from 'react-icons/ti'
import { BsChevronLeft, BsChevronRight, BsThreeDots } from 'react-icons/bs'
import { IoMdInformationCircleOutline } from "react-icons/io";
import { RiGalleryView2 } from "react-icons/ri";
import { IoGridOutline } from "react-icons/io5";
import { LuUser, LuUsers } from "react-icons/lu";
import { participantsList } from './participantsList'
import profileStyles from "@/styles/profile/profile-page.module.css"
import tableStyles from "@/styles/modules/tables/tables.module.css"
import styles from './event-details-participants.module.css'

const EventDetailsParticipants = () => {
    const [currentPage, setCurrentPage] = useState(1)
    const [rowsPerPage, setRowsPerPage] = useState(10)
    const [searchQuery, setSearchQuery] = useState('')
    const [showGalleryView, setShowGalleryView] = useState(false);

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

    const toggleTableView = () => {
      setShowGalleryView(!showGalleryView)
    }

  return (

    <div className={tableStyles.tournamentDetailsParticipantsContainer}>
        <div className={tableStyles.informationArea}>
          <p><IoMdInformationCircleOutline /></p>
          <p>Teams and Individuals can register for this tournament.</p>
        </div>
        <div className={tableStyles.tournamentsEventsFilterSearchContainer}>
          <div className={tableStyles.tournamentsEventsFilterContainer}>
            <p className={styles.tournamentNumber}>{participantsList.length} participants</p>

            <div className={tableStyles.toggleTableView} onClick={toggleTableView}>
              {showGalleryView ? (
                <button className={tableStyles.galleryViewBTN}>
                  Less fields
                  <RiGalleryView2 className={tableStyles.galleryViewIcon} />
                </button>
              ) : (
                <button className={tableStyles.galleryViewBTN}>
                  All fields
                  <IoGridOutline className={tableStyles.galleryViewIcon} />
                </button>
              )}
            </div>
          </div>

          <div className={tableStyles.searchContainer}>
            <div className={tableStyles.searchBar}>
              <CiSearch 
                className={tableStyles.searchIcon}
                onClick={handleSearch}
              />
              <input
                type='text'
                placeholder='Search tournaments'
                className={tableStyles.searchInput}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
              />
            </div>
          </div>
      </div>

      {!showGalleryView ? (
        <div className={`${tableStyles.participantsTable} ${styles.participantsTable}`}>
          <div className={`${styles.gridHeader} ${tableStyles.gridHeader} ${profileStyles.middleLayerColor}`}>
            <div className={`${tableStyles.gridItem} ${styles.gridItemHeader}`}>Participant</div>
            <div className={`${tableStyles.gridItem} ${styles.gridItemHeader}`}>Type</div>
            <div className={`${tableStyles.gridItem} ${styles.gridItemHeader}`}>Ranking</div>
            <div className={`${tableStyles.gridItem} ${styles.gridItemHeader}`}>Location</div>
            <div className={`${tableStyles.gridItem} ${styles.gridItemHeader}`}>Tournaments</div>
            <div className={`${tableStyles.gridItem} ${styles.gridItemHeader}`}>Wins</div>
            <div className={`${tableStyles.gridItem} ${styles.gridItemHeader}`}>Losses</div>
            <div className={`${tableStyles.gridItem} ${styles.gridItemHeader}`}>Actions</div>
          </div>

          {currentParticipants.map((participant, index) => (
            <div key={index} className={`${styles.gridRow} ${tableStyles.gridRow} ${profileStyles.middleLayerColor}`}>
              <div className={`${tableStyles.gridItem} ${tableStyles.nameColumn}`}>
                <div className={tableStyles.gameImageContainer}>
                  <Image
                    src={participant.src}
                    alt={participant.participant}
                    className={tableStyles.gameImage}
                  />
                </div>
                <p className={styles.gameName}>{participant.participant}</p>
              </div>

              <div className={`${tableStyles.gridItem} ${styles.participantDiv}`}>
                {participant.type === "Individual" ? (
                  <LuUser className={styles.participantIcon} />
                ) : (
                  <LuUsers className={styles.participantIcon} />
                )}
                {participant.type}
              </div>
              
              <div className={tableStyles.gridItem}>{participant.ranking}</div>
              <div className={tableStyles.gridItem}>{participant.location}</div>
              <div className={tableStyles.gridItem}>{participant.tournaments}</div>

              <div className={tableStyles.gridItem}>{participant.wins}</div>
              <div className={tableStyles.gridItem}>{participant.losses}</div>

              <div className={`${tableStyles.gridItem} ${tableStyles.viewProfileBTNContainer}`}>
                <Link
                  href={'/user-profile'}
                  className={`${tableStyles.viewProfileBTN} ${profileStyles.topMostLayerColor}`}
                >
                  View Profile
                </Link>

                <button className={`${tableStyles.threeDotsBTN} ${profileStyles.topMostLayerColor}`}>
                  <BsThreeDots className={styles.iconThreeDots} />
                </button>
              </div>

            </div>
          ))}

        </div>
        
        ) : (
        
        <div className={tableStyles.participantsTableExpandedContainer}>
          <div className={`${tableStyles.participantsTableExpanded}`}>
            <div className={`${styles.gridHeaderExpanded} ${tableStyles.gridHeaderExpanded} ${profileStyles.middleLayerColor}`}>
              <div className={`${tableStyles.gridItemExpanded} ${tableStyles.gridItemHeaderExpanded}`}>Participant</div>
              <div className={`${tableStyles.gridItemExpanded} ${tableStyles.gridItemHeaderExpanded}`}>Type</div>
              <div className={`${tableStyles.gridItemExpanded} ${tableStyles.gridItemHeaderExpanded}`}>Ranking</div>
              <div className={`${tableStyles.gridItemExpanded} ${tableStyles.gridItemHeaderExpanded}`}>Location</div>
              <div className={`${tableStyles.gridItemExpanded} ${tableStyles.gridItemHeaderExpanded}`}>Tournaments</div>
              <div className={`${tableStyles.gridItemExpanded} ${tableStyles.gridItemHeaderExpanded}`}>Wins</div>
              <div className={`${tableStyles.gridItemExpanded} ${tableStyles.gridItemHeaderExpanded}`}>Losses</div>
              <div className={`${tableStyles.gridItemExpanded} ${tableStyles.gridItemHeaderExpanded}`}>Actions</div>
            </div>

            {currentParticipants.map((participant, index) => (
                <div key={index} className={`${styles.gridRowExpanded} ${tableStyles.gridRowExpanded} ${profileStyles.middleLayerColor}`}>
                  <div className={`${tableStyles.gridItemExpanded} ${tableStyles.nameColumn}`}>
                    <div className={tableStyles.gameImageContainer}>
                      <Image
                        src={participant.src}
                        alt={participant.participant}
                        className={tableStyles.gameImage}
                      />
                    </div>
                    <p className={styles.gameName}>{participant.participant}</p>
                  </div>

                  <div className={`${tableStyles.gridItemExpanded} ${styles.participantDiv}`}>
                    {participant.type === "Individual" ? (
                      <LuUser className={styles.participantIcon} />
                    ) : (
                      <LuUsers className={styles.participantIcon} />
                    )}
                    {participant.type}
                  </div>
                
                  <div className={tableStyles.gridItemExpanded}>{participant.ranking}</div>
                  <div className={tableStyles.gridItemExpanded}>{participant.location}</div>
                  <div className={tableStyles.gridItemExpanded}>{participant.tournaments}</div>

                  <div className={tableStyles.gridItemExpanded}>{participant.wins}</div>
                  <div className={tableStyles.gridItemExpanded}>{participant.losses}</div>

                  <div className={`${tableStyles.gridItemExpanded} ${tableStyles.viewProfileBTNContainer}`}>
                    <Link
                      href={'/user-profile'}
                      className={`${tableStyles.viewProfileBTN} ${profileStyles.topMostLayerColor}`}
                    >
                      View Profile
                    </Link>

                    <button className={`${tableStyles.threeDotsBTN} ${profileStyles.topMostLayerColor}`}>
                      <BsThreeDots className={styles.iconThreeDots} />
                    </button>
                  </div>

                </div>
              ))}

          </div>
        </div>
      )}


      <div className={tableStyles.paginationContainer}>
        <div className={tableStyles.rowCountSelector}>
          <label htmlFor="rowsPerPage">Rows </label>
          <div className={tableStyles.customSelectContainer}>
            <select
              id="rowsPerPage"
              value={rowsPerPage}
              onChange={handleRowsPerPageChange}
              className={tableStyles.customSelect}
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={200}>100</option>
            </select>
            <TiArrowSortedDown className={tableStyles.dropDownIcon} />
          </div>
        </div>

        <p className={profileStyles.showingNumber}>
          Showing {indexOfFirstParticipant + 1} -{" "}
          {indexOfLastParticipant > participantsList.length ? participantsList.length : indexOfLastParticipant}{" "} of {participantsList.length}
        </p>

        <div className={tableStyles.pagination}>
          <button
            className={`${tableStyles.navIconBTN} ${currentPage === 1 ? tableStyles.hidden : ''}`}
            onClick={handlePrevClick}
            disabled={currentPage === 1}
          >
            <BsChevronLeft className={tableStyles.navIcon} />
          </button>
          {pageNumbers.map(number => (
            <button
              key={number}
              className={`${tableStyles.pageBTN} ${currentPage === number ? tableStyles.activePage : ''}`}
              onClick={() => handlePageChange(number)}
            >
              {number}
            </button>
          ))}
          <button
            className={`${tableStyles.navIconBTN} ${currentPage === Math.ceil(participantsList.length / rowsPerPage) ? tableStyles.hidden : ''}`}
            onClick={handleNextClick}
            disabled={currentPage === Math.ceil(participantsList.length / rowsPerPage)}
          >
            <BsChevronRight
              className={tableStyles.navIcon}
            />
          </button>
        </div>
      </div>
      
    </div>
  )
}

export default EventDetailsParticipants