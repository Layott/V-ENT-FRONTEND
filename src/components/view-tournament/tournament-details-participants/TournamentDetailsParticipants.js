'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { CiSearch } from 'react-icons/ci'
import { TiArrowSortedDown } from 'react-icons/ti'
import { BsChevronLeft, BsChevronRight, BsThreeDots } from 'react-icons/bs'
import { IoMdInformationCircleOutline } from "react-icons/io";
import { RiGalleryView2 } from "react-icons/ri";
import { IoGridOutline } from "react-icons/io5";
import { LuUser, LuUsers } from "react-icons/lu";
import profileStyles from "@/styles/profile/profile-page.module.css"
import tableStyles from "@/styles/modules/tables/tables.module.css"
import styles from './tournament-details-participants.module.css'

// Map API participant to display shape
const normalize = (p) => ({
  id: p.id,
  name: p.name || p.username || p.team_name || 'Unknown',
  type: p.registration_type || p.type || 'individual',
  ranking: p.ranking ? `#${p.ranking}` : '—',
  location: p.location || '—',
  tournaments: p.tournaments_played ?? p.tournaments ?? '—',
  wins: p.wins ?? '—',
  losses: p.losses ?? '—',
  avatar: p.profile_picture || p.avatar || p.team_logo || null,
  profileId: p.user_id || p.id || null,
})

const Avatar = ({ src, name }) => {
  const [errored, setErrored] = useState(false)
  const initials = (name || '?').slice(0, 2).toUpperCase()

  if (!src || errored) {
    return (
      <div className={styles.avatarFallback}>
        {initials}
      </div>
    )
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={name}
      className={tableStyles.gameImage}
      onError={() => setErrored(true)}
    />
  )
}

const TournamentDetailsParticipants = ({ tournament }) => {
  const [participants, setParticipants] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [searchQuery, setSearchQuery] = useState('')
  const [showGalleryView, setShowGalleryView] = useState(false)

  useEffect(() => {
    if (!tournament?.id) return
    fetchParticipants()
  }, [tournament?.id])

  const fetchParticipants = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/tournament/get-tournament-participants/${tournament.id}/`
      )
      const data = await res.json()
      if (data.status === 'success') {
        const raw = Array.isArray(data.data)
          ? data.data
          : data.data?.participants || data.data?.results || []
        setParticipants(raw.map(normalize))
      } else {
        setError(data.message || 'Failed to load participants.')
      }
    } catch (err) {
      console.error('Participants fetch error:', err)
      setError('Failed to load participants.')
    } finally {
      setLoading(false)
    }
  }

  // Client-side search filter
  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return participants
    return participants.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.location.toLowerCase().includes(q)
    )
  }, [participants, searchQuery])

  const totalPages = Math.ceil(filtered.length / rowsPerPage)
  const indexOfFirst = (currentPage - 1) * rowsPerPage
  const indexOfLast = indexOfFirst + rowsPerPage
  const currentParticipants = filtered.slice(indexOfFirst, indexOfLast)

  const handlePageChange = (n) => setCurrentPage(n)
  const handlePrevClick = () => currentPage > 1 && setCurrentPage(p => p - 1)
  const handleNextClick = () => currentPage < totalPages && setCurrentPage(p => p + 1)
  const handleRowsPerPageChange = (e) => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1) }
  const toggleTableView = () => setShowGalleryView(v => !v)

  const pageNumbers = []
  for (let i = 1; i <= totalPages; i++) pageNumbers.push(i)

  const ParticipantRow = ({ participant, expanded }) => {
    const item = (cls) => expanded ? `${tableStyles.gridItemExpanded} ${cls || ''}` : `${tableStyles.gridItem} ${cls || ''}`
    const typeIsTeam = participant.type === 'team' || participant.type === 'Team'

    return (
      <div className={expanded
        ? `${styles.gridRowExpanded} ${tableStyles.gridRowExpanded} ${profileStyles.middleLayerColor}`
        : `${styles.gridRow} ${tableStyles.gridRow} ${profileStyles.middleLayerColor}`
      }>
        <div className={`${expanded ? tableStyles.gridItemExpanded : tableStyles.gridItem} ${tableStyles.nameColumn}`}>
          <div className={tableStyles.gameImageContainer}>
            <Avatar src={participant.avatar} name={participant.name} />
          </div>
          <p className={styles.gameName}>{participant.name}</p>
        </div>

        <div className={`${item()} ${styles.participantDiv}`}>
          {typeIsTeam ? <LuUsers className={styles.participantIcon} /> : <LuUser className={styles.participantIcon} />}
          {typeIsTeam ? 'Team' : 'Individual'}
        </div>

        <div className={item()}>{participant.ranking}</div>
        <div className={item()}>{participant.location}</div>
        <div className={item()}>{participant.tournaments}</div>
        <div className={item()}>{participant.wins}</div>
        <div className={item()}>{participant.losses}</div>

        <div className={`${item()} ${tableStyles.viewProfileBTNContainer}`}>
          <Link
            href={participant.profileId ? `/user-profile?id=${participant.profileId}` : '/user-profile'}
            className={`${tableStyles.viewProfileBTN} ${profileStyles.topMostLayerColor}`}
          >
            View Profile
          </Link>
          <button className={`${tableStyles.threeDotsBTN} ${profileStyles.topMostLayerColor}`}>
            <BsThreeDots className={styles.iconThreeDots} />
          </button>
        </div>
      </div>
    )
  }

  const headerCols = ['Participant', 'Type', 'Ranking', 'Location', 'Tournaments', 'Wins', 'Losses', 'Actions']

  return (
    <div className={tableStyles.tournamentDetailsParticipantsContainer}>
      <div className={tableStyles.informationArea}>
        <p><IoMdInformationCircleOutline /></p>
        <p>Teams and Individuals can register for this tournament.</p>
      </div>

      <div className={tableStyles.tournamentsEventsFilterSearchContainer}>
        <div className={tableStyles.tournamentsEventsFilterContainer}>
          <p className={styles.tournamentNumber}>
            {loading ? 'Loading...' : `${filtered.length} participant${filtered.length !== 1 ? 's' : ''}`}
          </p>
          <div className={tableStyles.toggleTableView} onClick={toggleTableView}>
            {showGalleryView ? (
              <button className={tableStyles.galleryViewBTN}>Less fields <RiGalleryView2 className={tableStyles.galleryViewIcon} /></button>
            ) : (
              <button className={tableStyles.galleryViewBTN}>All fields <IoGridOutline className={tableStyles.galleryViewIcon} /></button>
            )}
          </div>
        </div>

        <div className={tableStyles.searchContainer}>
          <div className={tableStyles.searchBar}>
            <CiSearch className={tableStyles.searchIcon} />
            <input
              type="text"
              placeholder="Search participants"
              className={tableStyles.searchInput}
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1) }}
            />
          </div>
        </div>
      </div>

      {loading && <p className={styles.stateText}>Loading participants...</p>}
      {error && <p className={styles.errorText}>{error}</p>}

      {!loading && !error && filtered.length === 0 && (
        <p className={styles.stateText}>
          {searchQuery ? 'No participants match your search.' : 'No participants have registered yet.'}
        </p>
      )}

      {!loading && !error && filtered.length > 0 && (
        <>
          {!showGalleryView ? (
            <div className={`${tableStyles.participantsTable} ${styles.participantsTable}`}>
              <div className={`${styles.gridHeader} ${tableStyles.gridHeader} ${profileStyles.middleLayerColor}`}>
                {headerCols.map(col => (
                  <div key={col} className={`${tableStyles.gridItem} ${styles.gridItemHeader}`}>{col}</div>
                ))}
              </div>
              {currentParticipants.map((p, i) => (
                <ParticipantRow key={p.id ?? i} participant={p} expanded={false} />
              ))}
            </div>
          ) : (
            <div className={tableStyles.participantsTableExpandedContainer}>
              <div className={tableStyles.participantsTableExpanded}>
                <div className={`${styles.gridHeaderExpanded} ${tableStyles.gridHeaderExpanded} ${profileStyles.middleLayerColor}`}>
                  {headerCols.map(col => (
                    <div key={col} className={`${tableStyles.gridItemExpanded} ${tableStyles.gridItemHeaderExpanded}`}>{col}</div>
                  ))}
                </div>
                {currentParticipants.map((p, i) => (
                  <ParticipantRow key={p.id ?? i} participant={p} expanded={true} />
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
                  {[5, 10, 20, 50, 100].map(n => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
                <TiArrowSortedDown className={tableStyles.dropDownIcon} />
              </div>
            </div>

            <p className={profileStyles.showingNumber}>
              Showing {indexOfFirst + 1}–{Math.min(indexOfLast, filtered.length)} of {filtered.length}
            </p>

            <div className={tableStyles.pagination}>
              <button
                className={`${tableStyles.navIconBTN} ${currentPage === 1 ? tableStyles.hidden : ''}`}
                onClick={handlePrevClick}
                disabled={currentPage === 1}
              >
                <BsChevronLeft className={tableStyles.navIcon} />
              </button>
              {pageNumbers.map(n => (
                <button
                  key={n}
                  className={`${tableStyles.pageBTN} ${currentPage === n ? tableStyles.activePage : ''}`}
                  onClick={() => handlePageChange(n)}
                >
                  {n}
                </button>
              ))}
              <button
                className={`${tableStyles.navIconBTN} ${currentPage === totalPages ? tableStyles.hidden : ''}`}
                onClick={handleNextClick}
                disabled={currentPage === totalPages}
              >
                <BsChevronRight className={tableStyles.navIcon} />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default TournamentDetailsParticipants
