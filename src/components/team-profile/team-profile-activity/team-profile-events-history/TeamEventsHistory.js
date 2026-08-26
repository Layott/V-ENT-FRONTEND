import { mediaUrl } from '@/lib/mediaUrl';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useSession } from 'next-auth/react';
import { CiSearch } from 'react-icons/ci';
import { TiArrowSortedDown } from 'react-icons/ti';
import { BsChevronLeft, BsChevronRight } from 'react-icons/bs';
import TeamEventsDetails from './TeamEventsDetails';
import profileStyles from "@/styles/profile/profile-page.module.css";
import styles from './team-events-history.module.css';
import { useT } from '@/i18n/LanguageProvider';
const TeamEventsHistory = ({
  teamId
}) => {
  const tt = useT();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const {
    data: session
  } = useSession();
  useEffect(() => {
    if (!teamId) {
      setLoading(false);
      return;
    }
    const fetchEvents = async () => {
      try {
        const headers = {
          'Content-Type': 'application/json'
        };
        if (session?.user?.sessionToken) {
          headers['Authorization'] = `Bearer ${session.user.sessionToken}`;
        }
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/team/events/${teamId}/`, {
          method: 'GET',
          headers
        });
        if (!response.ok) throw new Error(`Failed to load events (${response.status})`);
        const data = await response.json();
        const list = data?.data?.events ?? data?.data ?? data ?? [];
        setEvents(Array.isArray(list) ? list : []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, [teamId, session]);
  const indexOfLastEvent = currentPage * rowsPerPage;
  const indexOfFirstEvent = indexOfLastEvent - rowsPerPage;
  const currentEvents = events.slice(indexOfFirstEvent, indexOfLastEvent);
  const handlePageChange = pageNumber => setCurrentPage(pageNumber);
  const handlePrevClick = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };
  const handleNextClick = () => {
    if (currentPage < Math.ceil(events.length / rowsPerPage)) setCurrentPage(currentPage + 1);
  };
  const handleRowsPerPageChange = event => {
    setRowsPerPage(Number(event.target.value));
    setCurrentPage(1);
  };
  const handleViewClick = event => setSelectedEvent(event);
  const handleSearch = () => {};
  const handleKeyDown = event => {
    if (event.key === 'Enter') handleSearch();
  };
  const pageNumbers = [];
  for (let i = 1; i <= Math.ceil(events.length / rowsPerPage); i++) {
    pageNumbers.push(i);
  }
  const getImageUrl = (path) => mediaUrl(path);
  if (loading) return <p>{tt("ui.loading.event.history.d944", "Loading event history...")}</p>;
  if (error) return <p style={{
    color: 'red'
  }}>{error}</p>;
  return <div className={profileStyles.tournamentEventsContainer}>
        <div className={profileStyles.tournamentsEventsFilterSearchContainer}>
            <div className={profileStyles.tournamentsEventsFilterContainer}>
                <p className={styles.tournamentNumber}>{events.length} {tt("ui.events.82d5", "events")}</p>

                <div className={`${profileStyles.filterContainer} ${profileStyles.topMostLayerColor}`}>
                    {tt("ui.filter.d7de", "Filter")}
                </div>
            </div>

            <div className={profileStyles.searchContainer}>
                <div className={profileStyles.searchBar}>
                    <CiSearch className={profileStyles.searchIcon} onClick={handleSearch} />
                    <input type='text' placeholder={tt("ui.search.events.a5a3", "Search events")} className={profileStyles.searchInput} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} onKeyDown={handleKeyDown} />
                </div>
            </div>
      </div>

      <div className={`${profileStyles.tournamentsEventsTable}`}>
        <div className={`${styles.gridHeader} ${profileStyles.middleLayerColor}`}>
          <div className={`${styles.gridItem} ${styles.gridItemHeader}`}>{tt("ui.event.name.8269", "Event Name")}</div>
          <div className={`${styles.gridItem} ${styles.gridItemHeader}`}>{tt("ui.type.3deb", "Type")}</div>
          <div className={`${styles.gridItem} ${styles.gridItemHeader}`}>{tt("ui.game.e3e8", "Game")}</div>
          <div className={`${styles.gridItem} ${styles.gridItemHeader}`}>{tt("ui.location.d219", "Location")}</div>
          <div className={`${styles.gridItem} ${styles.gridItemHeader}`}>{tt("ui.date.eb9a", "Date")}</div>
          <div className={`${styles.gridItem} ${styles.gridItemHeader}`}>{tt("ui.status.bae7", "Status")}</div>
          <div className={`${styles.gridItem} ${styles.gridItemHeader}`}>{tt("ui.actions.c3cd", "Actions")}</div>
        </div>

        {events.length === 0 && <p>{tt("ui.no.event.history.d2a3", "No event history.")}</p>}

        {currentEvents.map((event, index) => {
        const logoUrl = getImageUrl(event.event_logo || event.logo || event.src);
        return <div key={event.event_id || event.id || index} className={`${styles.gridRow} ${profileStyles.middleLayerColor}`}>
              <div className={`${styles.gridItem} ${styles.nameColumn}`}>
                <div className={styles.gameImageContainer}>
                  {logoUrl ? <Image src={mediaUrl(logoUrl)} alt={event.event_title || event.name || ''} className={styles.gameImage} width={36} height={36} /> : <div className={styles.gameImage} style={{
                background: 'var(--overlay-gray)'
              }} />}
                </div>
                <p className={styles.gameName}>{event.event_title || event.name}</p>
              </div>
              <div className={styles.gridItem}>{event.event_type || event.type || 'N/A'}</div>
              <div className={styles.gridItem}>{event.game || 'N/A'}</div>
              <div className={styles.gridItem}>{event.event_location || event.location || 'N/A'}</div>
              <div className={styles.gridItem}>{event.start_date_and_time || event.date || 'N/A'}</div>

              <div className={`${styles.gridItem}`}>
                <span className={`${event.status === 'Completed' ? styles.completedStatus : styles.inProgress}`}>
                  {event.status || 'N/A'}
                </span>
              </div>

              <div className={styles.gridItem}>
                <button className={`${styles.exploreBTN} ${profileStyles.topMostLayerColor}`} onClick={() => handleViewClick(event)}>
                  {tt("ui.explore.b965", "Explore")}
                </button>
              </div>
            </div>;
      })}

      </div>

      <div className={styles.paginationContainer}>
        <div className={styles.rowCountSelector}>
          <label htmlFor="rowsPerPage">{tt("ui.rows.52d0", "Rows")} </label>
          <div className={styles.customSelectContainer}>
            <select id="rowsPerPage" value={rowsPerPage} onChange={handleRowsPerPageChange} className={styles.customSelect}>
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <TiArrowSortedDown className={styles.dropDownIcon} />
          </div>
        </div>

        <p className={profileStyles.showingNumber}>
          {tt("ui.showing.163d", "Showing")} {indexOfFirstEvent + 1} -{" "}
          {indexOfLastEvent > events.length ? events.length : indexOfLastEvent}{" "} of {events.length}
        </p>

        <div className={styles.pagination}>
          <button className={`${styles.navIconBTN} ${currentPage === 1 ? styles.hidden : ''}`} onClick={handlePrevClick} disabled={currentPage === 1}>
            <BsChevronLeft className={styles.navIcon} />
          </button>
          {pageNumbers.map(number => <button key={number} className={`${styles.pageBTN} ${currentPage === number ? styles.activePage : ''}`} onClick={() => handlePageChange(number)}>
              {number}
            </button>)}
          <button className={`${styles.navIconBTN} ${currentPage === Math.ceil(events.length / rowsPerPage) ? styles.hidden : ''}`} onClick={handleNextClick} disabled={currentPage === Math.ceil(events.length / rowsPerPage)}>
            <BsChevronRight className={styles.navIcon} />
          </button>
        </div>
      </div>

      <TeamEventsDetails selectedTournament={selectedEvent} setSelectedTournament={setSelectedEvent} />
    </div>;
};
export default TeamEventsHistory;