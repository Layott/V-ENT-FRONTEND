import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { CiSearch } from 'react-icons/ci'
import { TiArrowSortedDown } from 'react-icons/ti'
import { BsChevronLeft, BsChevronRight, BsThreeDots } from 'react-icons/bs'
import { RiGalleryView2 } from "react-icons/ri";
import { IoGridOutline } from "react-icons/io5";
import { LuUserRoundPlus } from "react-icons/lu";
import profileStyles from "@/styles/profile/profile-page.module.css"
import tableStyles from "@/styles/modules/tables/tables.module.css"
import styles from './team-members.module.css'

const MembersTabComponent = ({ teamId }) => {
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentPage, setCurrentPage] = useState(1)
    const [rowsPerPage, setRowsPerPage] = useState(10)
    const [searchQuery, setSearchQuery] = useState('')
    const [showGalleryView, setShowGalleryView] = useState(false);
    const { data: session } = useSession();

    useEffect(() => {
        if (!teamId) {
            setLoading(false);
            return;
        }
        const fetchMembers = async () => {
            try {
                const headers = { 'Content-Type': 'application/json' };
                if (session?.user?.sessionToken) {
                    headers['Authorization'] = `Bearer ${session.user.sessionToken}`;
                }
                const response = await fetch(
                    `${process.env.NEXT_PUBLIC_API_URL}/team/view-team/${teamId}/`,
                    { method: 'GET', headers }
                );
                if (!response.ok) throw new Error(`Failed to load members (${response.status})`);
                const data = await response.json();
                const memberList = data?.data?.members ?? data?.members ?? [];
                setMembers(Array.isArray(memberList) ? memberList : []);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchMembers();
    }, [teamId, session]);

    const indexOfLastParticipant = currentPage * rowsPerPage
    const indexOfFirstParticipant = indexOfLastParticipant - rowsPerPage
    const currentParticipants = members.slice(indexOfFirstParticipant, indexOfLastParticipant)

    const handlePageChange = (pageNumber) => setCurrentPage(pageNumber)
    const handlePrevClick = () => { if (currentPage > 1) setCurrentPage(currentPage - 1) }
    const handleNextClick = () => { if (currentPage < Math.ceil(members.length / rowsPerPage)) setCurrentPage(currentPage + 1) }
    const handleRowsPerPageChange = (event) => { setRowsPerPage(Number(event.target.value)); setCurrentPage(1) }

    const pageNumbers = []
    for (let i = 1; i <= Math.ceil(members.length / rowsPerPage); i++) {
        pageNumbers.push(i)
    }

    const handleSearch = () => {}
    const handleKeyDown = (event) => { if (event.key === 'Enter') handleSearch() }
    const toggleTableView = () => setShowGalleryView(!showGalleryView)

    const getAvatarUrl = (path) => {
        if (!path) return null;
        if (path.startsWith('http')) return path;
        return `${process.env.NEXT_PUBLIC_API_URL}${path}`;
    };

    if (loading) return <p>Loading members...</p>;
    if (error) return <p style={{ color: 'red' }}>{error}</p>;

  return (
    <div className={tableStyles.tournamentDetailsParticipantsContainer}>
      <div className={styles.tabsAndDetailsContainer}>

        <div className={`${tableStyles.tournamentsEventsFilterSearchContainer} ${styles.tournamentsEventsFilterSearchContainer}`}>

          <div className={styles.inviteAndSearchContainer}>
            <div className={`${tableStyles.tournamentsEventsFilterContainer} ${styles.tournamentsEventsFilterContainer}`}>
                <p className={styles.tournamentNumber}>{members.length} members</p>

                <div className={tableStyles.toggleTableView} onClick={toggleTableView}>
                {showGalleryView ? (
                    <button className={tableStyles.galleryViewBTN}>
                    <RiGalleryView2 className={tableStyles.galleryViewIcon} />
                    </button>
                ) : (
                    <button className={tableStyles.galleryViewBTN}>
                    <IoGridOutline className={tableStyles.galleryViewIcon} />
                    </button>
                )}
                </div>
            </div>
          <div className={styles.inviteNewMembersContainer}>
              <button className={`${styles.inviteNewMemberBTN} redBTN`}><LuUserRoundPlus className={styles.personIcon} /> Invite new member</button>
            </div>

          </div>

          <div className={`${tableStyles.searchContainer} ${styles.searchContainer}`}>
            <div className={`${tableStyles.searchBar} ${styles.searchBar}`}>
              <CiSearch
                className={tableStyles.searchIcon}
                onClick={handleSearch}
              />
              <input
                type='text'
                placeholder='Search members'
                className={tableStyles.searchInput}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
              />
            </div>
          </div>

        </div>

      </div>

      {!showGalleryView ? (
        <div className={`${styles.participantsTable} ${tableStyles.participantsTable}`}>
          <div className={`${styles.gridHeader} ${tableStyles.gridHeader} ${profileStyles.middleLayerColor}`}>
            <div className={`${tableStyles.gridItem} ${styles.gridItemHeader}`}>Member</div>
            <div className={`${tableStyles.gridItem} ${styles.gridItemHeader}`}>Role</div>
            <div className={`${tableStyles.gridItem} ${styles.gridItemHeader}`}>Ranking</div>
            <div className={`${tableStyles.gridItem} ${styles.gridItemHeader}`}>Location</div>
            <div className={`${tableStyles.gridItem} ${styles.gridItemHeader}`}>Status</div>
            <div className={`${tableStyles.gridItem} ${styles.gridItemHeader}`}>Actions</div>
          </div>

          {currentParticipants.map((member, index) => {
            const avatarUrl = getAvatarUrl(member.profile_pic);
            return (
              <div key={member.user_id || index} className={`${styles.gridRow} ${tableStyles.gridRow} ${profileStyles.middleLayerColor}`}>
                <div className={`${tableStyles.gridItem} ${tableStyles.nameColumn}`}>
                  <div className={tableStyles.gameImageContainer}>
                    {avatarUrl ? (
                      <Image src={avatarUrl} alt={member.username || ''} className={tableStyles.gameImage} width={36} height={36} />
                    ) : (
                      <div className={tableStyles.gameImage} style={{ background: 'var(--overlay-gray)' }} />
                    )}
                  </div>
                  <div className={styles.memberNamesContainer}>
                    <p className={styles.memberName}>{member.display_name || member.username}</p>
                    <p className={styles.memberUsername}>@{member.username}</p>
                  </div>
                </div>

                <div className={`${tableStyles.gridItem} ${styles.participantDiv}`}>
                  {member.role || 'Member'}
                </div>

                <div className={tableStyles.gridItem}>{member.ranking || 'N/A'}</div>
                <div className={tableStyles.gridItem}>{member.location || 'N/A'}</div>

                <div className={`${tableStyles.gridItemExpanded} ${styles.gridItemStatusExpanded}`}>
                  <span className={`${styles.statusSpan} ${styles.confirmedStatus}`}>
                    Active
                  </span>
                </div>

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
            );
          })}
        </div>

        ) : (

        <div className={tableStyles.participantsTableExpandedContainer}>
          <div className={`${tableStyles.participantsTableExpanded}`}>
            <div className={`${styles.gridHeaderExpanded} ${tableStyles.gridHeaderExpanded} ${profileStyles.middleLayerColor}`}>
              <div className={`${tableStyles.gridItemExpanded} ${tableStyles.gridItemHeaderExpanded}`}>Member</div>
              <div className={`${tableStyles.gridItemExpanded} ${tableStyles.gridItemHeaderExpanded}`}>Role</div>
              <div className={`${tableStyles.gridItemExpanded} ${tableStyles.gridItemHeaderExpanded}`}>Ranking</div>
              <div className={`${tableStyles.gridItemExpanded} ${tableStyles.gridItemHeaderExpanded}`}>Location</div>
              <div className={`${tableStyles.gridItemExpanded} ${tableStyles.gridItemHeaderExpanded}`}>Status</div>
              <div className={`${tableStyles.gridItemExpanded} ${tableStyles.gridItemHeaderExpanded}`}>Actions</div>
            </div>

            {currentParticipants.map((member, index) => {
              const avatarUrl = getAvatarUrl(member.profile_pic);
              return (
                <div key={member.user_id || index} className={`${styles.gridRowExpanded} ${tableStyles.gridRowExpanded} ${profileStyles.middleLayerColor}`}>
                  <div className={`${tableStyles.gridItemExpanded} ${tableStyles.nameColumn}`}>
                    <div className={tableStyles.gameImageContainer}>
                      {avatarUrl ? (
                        <Image src={avatarUrl} alt={member.username || ''} className={tableStyles.gameImage} width={36} height={36} />
                      ) : (
                        <div className={tableStyles.gameImage} style={{ background: 'var(--overlay-gray)' }} />
                      )}
                    </div>
                    <div className={styles.memberNamesContainer}>
                      <p className={styles.memberName}>{member.display_name || member.username}</p>
                      <p className={styles.memberUsername}>@{member.username}</p>
                    </div>
                  </div>

                  <div className={`${tableStyles.gridItemExpanded} ${styles.participantDiv}`}>
                    {member.role || 'Member'}
                  </div>

                  <div className={tableStyles.gridItemExpanded}>{member.ranking || 'N/A'}</div>
                  <div className={tableStyles.gridItemExpanded}>{member.location || 'N/A'}</div>

                  <div className={`${tableStyles.gridItemExpanded}`}>
                    <span className={`${styles.statusSpan} ${styles.confirmedStatus}`}>
                      Active
                    </span>
                  </div>

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
              );
            })}
          </div>
        </div>
      )}

      {members.length === 0 && <p>No members found.</p>}

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
            </select>
            <TiArrowSortedDown className={tableStyles.dropDownIcon} />
          </div>
        </div>

        <p className={profileStyles.showingNumber}>
          Showing {indexOfFirstParticipant + 1} -{" "}
          {indexOfLastParticipant > members.length ? members.length : indexOfLastParticipant}{" "} of {members.length}
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
            className={`${tableStyles.navIconBTN} ${currentPage === Math.ceil(members.length / rowsPerPage) ? tableStyles.hidden : ''}`}
            onClick={handleNextClick}
            disabled={currentPage === Math.ceil(members.length / rowsPerPage)}
          >
            <BsChevronRight className={tableStyles.navIcon}/>
          </button>
        </div>
      </div>
    </div>
  )
}

export default MembersTabComponent
