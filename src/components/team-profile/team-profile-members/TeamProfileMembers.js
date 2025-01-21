import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { CiSearch } from 'react-icons/ci'
import { TiArrowSortedDown } from 'react-icons/ti'
import { BsChevronLeft, BsChevronRight, BsThreeDots } from 'react-icons/bs'
import { RiGalleryView2 } from "react-icons/ri";
import { IoGridOutline } from "react-icons/io5";
import { membersList } from './membersList'
import profileStyles from "@/styles/profile/profile-page.module.css"
import styles from './team-members.module.css'

const TeamProfileMembers = () => {
    const [currentPage, setCurrentPage] = useState(1)
    const [rowsPerPage, setRowsPerPage] = useState(10)
    const [searchQuery, setSearchQuery] = useState('')
    const [showGalleryView, setShowGalleryView] = useState(false);

    const indexOfLastParticipant = currentPage * rowsPerPage
    const indexOfFirstParticipant = indexOfLastParticipant - rowsPerPage
    const currentParticipants = membersList.slice(indexOfFirstParticipant, indexOfLastParticipant)

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
        if (currentPage < Math.ceil(membersList.length / rowsPerPage)) {
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
        for (let i = 1; i <= Math.ceil(membersList.length / rowsPerPage); i++) {
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

    <div className={styles.tournamentDetailsParticipantsContainer}>
        <div className={styles.tournamentsEventsFilterSearchContainer}>
          <div className={styles.tournamentsEventsFilterContainer}>
            <p className={styles.tournamentNumber}>{membersList.length} members</p>

            <div className={styles.toggleTableView} onClick={toggleTableView}>
              {showGalleryView ? (
                <button className={styles.galleryViewBTN}>
                  Less fields
                  <RiGalleryView2 className={styles.galleryViewIcon} />
                </button>
              ) : (
                <button className={styles.galleryViewBTN}>
                  All fields
                  <IoGridOutline className={styles.galleryViewIcon} />
                </button>
              )}
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

      {!showGalleryView ? (
        <div className={`${styles.participantsTable}`}>
          <div className={`${styles.gridHeader} ${profileStyles.middleLayerColor}`}>
            <div className={`${styles.gridItem} ${styles.gridItemHeader}`}>Member</div>
            <div className={`${styles.gridItem} ${styles.gridItemHeader}`}>Role</div>
            <div className={`${styles.gridItem} ${styles.gridItemHeader}`}>Ranking</div>
            <div className={`${styles.gridItem} ${styles.gridItemHeader}`}>Location</div>
            <div className={`${styles.gridItem} ${styles.gridItemHeader}`}>Status</div>
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
                <div class name={styles.memberNamesContainer}>
                  <p className={styles.memberName}>{participant.member}</p>
                  <p className={styles.memberUsername}>{participant.username}</p>
                </div>
              </div>

              <div className={`${styles.gridItem} ${styles.participantDiv}`}>
                {participant.role}
              </div>
              
              <div className={styles.gridItem}>{participant.ranking}</div>
              <div className={styles.gridItem}>{participant.location}</div>

              <div className={`${styles.gridItemExpanded}`}>
                  <span className={`${styles.statusSpan} ${participant.status === 'Confirmed' ? styles.confirmedStatus : styles.invitedStatus}`}>
                    {participant.status}
                  </span>
                </div>

              <div className={`${styles.gridItem} ${styles.viewProfileBTNContainer}`}>
                <Link
                  href={'/user-profile'}
                  className={`${styles.viewProfileBTN} ${profileStyles.topMostLayerColor}`}
                >
                  View Profile
                </Link>

                <button className={`${styles.threeDotsBTN} ${profileStyles.topMostLayerColor}`}>
                  <BsThreeDots className={styles.iconThreeDots} />
                </button>
              </div>
            </div>
          ))}
        </div>
        
        ) : (
        
        <div className={styles.participantsTableExpandedContainer}>
          <div className={`${styles.participantsTableExpanded}`}>
            <div className={`${styles.gridHeaderExpanded} ${profileStyles.middleLayerColor}`}>
              <div className={`${styles.gridItemExpanded} ${styles.gridItemHeaderExpanded}`}>Member</div>
              <div className={`${styles.gridItemExpanded} ${styles.gridItemHeaderExpanded}`}>Role</div>
              <div className={`${styles.gridItemExpanded} ${styles.gridItemHeaderExpanded}`}>Ranking</div>
              <div className={`${styles.gridItemExpanded} ${styles.gridItemHeaderExpanded}`}>Location</div>
              <div className={`${styles.gridItemExpanded} ${styles.gridItemHeaderExpanded}`}>Status</div>
              <div className={`${styles.gridItemExpanded} ${styles.gridItemHeaderExpanded}`}>Actions</div>
            </div>

            {currentParticipants.map((participant, index) => (
                <div key={index} className={`${styles.gridRowExpanded} ${profileStyles.middleLayerColor}`}>
                  <div className={`${styles.gridItemExpanded} ${styles.nameColumn}`}>
                    <div className={styles.gameImageContainer}>
                      <Image
                        src={participant.src}
                        alt={participant.participant}
                        className={styles.gameImage}
                      />
                    </div>
                    <div class name={styles.memberNamesContainer}>
                      <p className={styles.memberName}>{participant.member}</p>
                      <p className={styles.memberUsername}>{participant.username}</p>
                    </div>

                  </div>

                  <div className={`${styles.gridItemExpanded} ${styles.participantDiv}`}>
                    {participant.role}
                  </div>
                
                  <div className={styles.gridItemExpanded}>{participant.ranking}</div>
                  <div className={styles.gridItemExpanded}>{participant.location}</div>

                  <div className={`${styles.gridItemExpanded}`}>
                    <span className={`${styles.statusSpan} ${participant.status === 'Confirmed' ? styles.confirmedStatus : styles.invitedStatus}`}>
                      {participant.status}
                    </span>
                  </div>

                  <div className={`${styles.gridItemExpanded} ${styles.viewProfileBTNContainer}`}>
                    <Link
                      href={'/user-profile'}
                      className={`${styles.viewProfileBTN} ${profileStyles.topMostLayerColor}`}
                    >
                      View Profile
                    </Link>

                    <button className={`${styles.threeDotsBTN} ${profileStyles.topMostLayerColor}`}>
                      <BsThreeDots className={styles.iconThreeDots} />
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}


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
          {indexOfLastParticipant > membersList.length ? membersList.length : indexOfLastParticipant}{" "} of {membersList.length}
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
            className={`${styles.navIconBTN} ${currentPage === Math.ceil(membersList.length / rowsPerPage) ? styles.hidden : ''}`}
            onClick={handleNextClick}
            disabled={currentPage === Math.ceil(membersList.length / rowsPerPage)}
          >
            <BsChevronRight className={styles.navIcon}/>
          </button>
        </div>
      </div>
    </div>
  )
}

export default TeamProfileMembers