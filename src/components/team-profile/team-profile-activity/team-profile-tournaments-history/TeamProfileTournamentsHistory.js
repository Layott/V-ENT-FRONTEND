import { mediaUrl } from '@/lib/mediaUrl';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useSession } from 'next-auth/react';
import { CiSearch } from 'react-icons/ci';
import { TiArrowSortedDown } from 'react-icons/ti';
import { BsChevronLeft, BsChevronRight } from 'react-icons/bs';
import TeamProfileTournamentsDetails from './TeamProfileTournamentsDetails';
import profileStyles from "@/styles/profile/profile-page.module.css";
import styles from './team-profile-tournaments-history.module.css';
import { useT } from '@/i18n/LanguageProvider';
const TeamProfileTournamentsHistory = ({
  teamId
}) => {
  const tt = useT();
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTournament, setSelectedTournament] = useState(null);
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
    const fetchTournaments = async () => {
      try {
        const headers = {
          'Content-Type': 'application/json'
        };
        if (session?.user?.sessionToken) {
          headers['Authorization'] = `Bearer ${session.user.sessionToken}`;
        }
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/team/tournaments/${teamId}/`, {
          method: 'GET',
          headers
        });
        if (!response.ok) throw new Error(`Failed to load tournaments (${response.status})`);
        const data = await response.json();
        const list = data?.data?.tournaments ?? data?.data ?? data ?? [];
        setTournaments(Array.isArray(list) ? list : []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchTournaments();
  }, [teamId, session]);
  const indexOfLastTournament = currentPage * rowsPerPage;
  const indexOfFirstTournament = indexOfLastTournament - rowsPerPage;
  const currentTournaments = tournaments.slice(indexOfFirstTournament, indexOfLastTournament);
  const handlePageChange = pageNumber => setCurrentPage(pageNumber);
  const handlePrevClick = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };
  const handleNextClick = () => {
    if (currentPage < Math.ceil(tournaments.length / rowsPerPage)) setCurrentPage(currentPage + 1);
  };
  const handleRowsPerPageChange = event => {
    setRowsPerPage(Number(event.target.value));
    setCurrentPage(1);
  };
  const handleViewClick = tournament => setSelectedTournament(tournament);
  const handleSearch = () => {};
  const handleKeyDown = event => {
    if (event.key === 'Enter') handleSearch();
  };
  const pageNumbers = [];
  for (let i = 1; i <= Math.ceil(tournaments.length / rowsPerPage); i++) {
    pageNumbers.push(i);
  }
  const getImageUrl = path => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    return `${process.env.NEXT_PUBLIC_API_URL}${path}`;
  };
  if (loading) return <p>{tt("ui.loading.tournament.history.3ffe", "Loading tournament history...")}</p>;
  if (error) return <p style={{
    color: 'red'
  }}>{error}</p>;
  return <div className={profileStyles.tournamentEventsContainer}>
        <div className={profileStyles.tournamentsEventsFilterSearchContainer}>
            <div className={profileStyles.tournamentsEventsFilterContainer}>
                <p className={styles.tournamentNumber}>{tournaments.length} {tt("ui.tournaments.c9fa", "tournaments")}</p>
                <div className={`${profileStyles.filterContainer} ${profileStyles.topMostLayerColor}`}>
                    {tt("ui.filter.d7de", "Filter")}
                </div>
            </div>

            <div className={profileStyles.searchContainer}>
                <div className={profileStyles.searchBar}>
                    <CiSearch className={profileStyles.searchIcon} onClick={handleSearch} />
                    <input type='text' placeholder={tt("ui.search.tournaments.2514", "Search tournaments")} className={profileStyles.searchInput} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} onKeyDown={handleKeyDown} />
                </div>
            </div>
      </div>

      <div className={`${profileStyles.tournamentsEventsTable}`}>
        <div className={`${styles.gridHeader} ${profileStyles.middleLayerColor}`}>
          <div className={`${styles.gridItem} ${styles.gridItemHeader}`}>{tt("ui.tournament.name.0398", "Tournament Name")}</div>
          <div className={`${styles.gridItem} ${styles.gridItemHeader}`}>{tt("ui.game.e3e8", "Game")}</div>
          <div className={`${styles.gridItem} ${styles.gridItemHeader}`}>{tt("ui.type.3deb", "Type")}</div>
          <div className={`${styles.gridItem} ${styles.gridItemHeader}`}>{tt("ui.price.3e82", "Price")}</div>
          <div className={`${styles.gridItem} ${styles.gridItemHeader}`}>{tt("ui.status.bae7", "Status")}</div>
          <div className={`${styles.gridItem} ${styles.gridItemHeader}`}>{tt("ui.position.cf1c", "Position")}</div>
          <div className={`${styles.gridItem} ${styles.gridItemHeader}`}>{tt("ui.date.eb9a", "Date")}</div>
          <div className={`${styles.gridItem} ${styles.gridItemHeader}`}>{tt("ui.actions.c3cd", "Actions")}</div>
        </div>

        {tournaments.length === 0 && <p>{tt("ui.no.tournament.history.9e4d", "No tournament history.")}</p>}

        {currentTournaments.map((tournament, index) => {
        const logoUrl = getImageUrl(tournament.tournament_logo || tournament.logo || tournament.src);
        return <div key={tournament.id || tournament.tournament_id || index} className={`${styles.gridRow} ${profileStyles.middleLayerColor}`}>
              <div className={`${styles.gridItem} ${styles.nameColumn}`}>
                <div className={styles.gameImageContainer}>
                  {logoUrl ? <Image src={mediaUrl(logoUrl)} alt={tournament.tournament_title || tournament.name || ''} className={styles.gameImage} width={36} height={36} /> : <div className={styles.gameImage} style={{
                background: 'var(--overlay-gray)'
              }} />}
                </div>
                <p className={styles.gameName}>{tournament.tournament_title || tournament.name}</p>
              </div>
              <div className={styles.gridItem}>{tournament.game}</div>
              <div className={styles.gridItem}>{tournament.tournament_type || tournament.type}</div>
              <div className={styles.gridItem}>{tournament.entry_fee || tournament.price || 'Free'}</div>
              <div className={`${styles.gridItem}`}>
                <span className={`${tournament.status === 'Completed' ? styles.completedStatus : styles.inProgress}`}>
                  {tournament.status || 'N/A'}
                </span>
              </div>
              <div className={styles.gridItem}>{tournament.position || 'N/A'}</div>
              <div className={styles.gridItem}>{tournament.start_date_and_time || tournament.date || 'N/A'}</div>
              <div className={styles.gridItem}>
                <button className={`${styles.exploreBTN} ${profileStyles.topMostLayerColor}`} onClick={() => handleViewClick(tournament)}>
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
          {tt("ui.showing.163d", "Showing")} {indexOfFirstTournament + 1} -{" "}
          {indexOfLastTournament > tournaments.length ? tournaments.length : indexOfLastTournament}{" "} of {tournaments.length}
        </p>

        <div className={styles.pagination}>
          <button className={`${styles.navIconBTN} ${currentPage === 1 ? styles.hidden : ''}`} onClick={handlePrevClick} disabled={currentPage === 1}>
            <BsChevronLeft className={styles.navIcon} />
          </button>
          {pageNumbers.map(number => <button key={number} className={`${styles.pageBTN} ${currentPage === number ? styles.activePage : ''}`} onClick={() => handlePageChange(number)}>
              {number}
            </button>)}
          <button className={`${styles.navIconBTN} ${currentPage === Math.ceil(tournaments.length / rowsPerPage) ? styles.hidden : ''}`} onClick={handleNextClick} disabled={currentPage === Math.ceil(tournaments.length / rowsPerPage)}>
            <BsChevronRight className={styles.navIcon} />
          </button>
        </div>
      </div>

      <TeamProfileTournamentsDetails selectedTournament={selectedTournament} setSelectedTournament={setSelectedTournament} />
    </div>;
};
export default TeamProfileTournamentsHistory;