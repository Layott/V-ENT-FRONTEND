'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { CiSearch } from 'react-icons/ci';
import { TiArrowSortedDown } from 'react-icons/ti';
import { BsChevronLeft, BsChevronRight } from 'react-icons/bs';
import UserProfileTournamentsDetails from './UserProfileTournamentsDetails';
import profileStyles from '@/styles/profile/profile-page.module.css';
import styles from './user-profile-tournaments-history.module.css';
import { useT } from '@/i18n/LanguageProvider';
const UserProfileTournamentsHistory = () => {
  const tt = useT();
  const {
    data: session
  } = useSession();
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTournament, setSelectedTournament] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  useEffect(() => {
    if (!session?.user?.sessionToken) return;
    const fetchHistory = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/user-activity/tournaments/`, {
          headers: {
            Authorization: `Bearer ${session.user.sessionToken}`
          }
        });
        const data = await res.json();
        const list = data?.data ?? [];
        setTournaments(Array.isArray(list) ? list : []);
      } catch {
        setError(tt("msg.failedToLoadTournamentHistory", "Failed to load tournament history."));
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [session]);
  const filtered = tournaments.filter(t => !searchQuery.trim() || (t.tournament_title || t.name || '').toLowerCase().includes(searchQuery.toLowerCase()));
  const total = filtered.length;
  const indexOfFirst = (currentPage - 1) * rowsPerPage;
  const indexOfLast = indexOfFirst + rowsPerPage;
  const current = filtered.slice(indexOfFirst, indexOfLast);
  const pageNumbers = [];
  for (let i = 1; i <= Math.ceil(total / rowsPerPage); i++) pageNumbers.push(i);
  const formatDate = d => {
    if (!d) return '-';
    return new Date(d).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };
  if (loading) return <p style={{
    padding: '1rem',
    color: 'var(--text-muted)'
  }}>{tt("ui.loading.tournament.history.6371", "Loading tournament history…")}</p>;
  if (error) return <p style={{
    padding: '1rem',
    color: 'var(--v-ent-red)'
  }}>{error}</p>;
  return <div className={profileStyles.tournamentEventsContainer}>
      <div className={profileStyles.tournamentsEventsFilterSearchContainer}>
        <div className={profileStyles.tournamentsEventsFilterContainer}>
          <p className={styles.tournamentNumber}>{total} {tt("ui.tournament.cb9d", "tournament")}{total !== 1 ? 's' : ''}</p>
          <div className={`${profileStyles.filterContainer} ${profileStyles.topMostLayerColor}`}>{tt("ui.filter.d7de", "Filter")}</div>
        </div>

        <div className={profileStyles.searchContainer}>
          <div className={profileStyles.searchBar}>
            <CiSearch className={profileStyles.searchIcon} />
            <input type="text" placeholder={tt("ui.search.tournaments.2514", "Search tournaments")} className={profileStyles.searchInput} value={searchQuery} onChange={e => {
            setSearchQuery(e.target.value);
            setCurrentPage(1);
          }} />
          </div>
        </div>
      </div>

      <div className={profileStyles.tournamentsEventsTable}>
        <div className={`${styles.gridHeader} ${profileStyles.middleLayerColor}`}>
          <div className={`${styles.gridItem} ${styles.gridItemHeader}`}>{tt("ui.tournament.name.0398", "Tournament Name")}</div>
          <div className={`${styles.gridItem} ${styles.gridItemHeader}`}>{tt("ui.game.e3e8", "Game")}</div>
          <div className={`${styles.gridItem} ${styles.gridItemHeader}`}>{tt("ui.type.3deb", "Type")}</div>
          <div className={`${styles.gridItem} ${styles.gridItemHeader}`}>{tt("ui.prize.d597", "Prize")}</div>
          <div className={`${styles.gridItem} ${styles.gridItemHeader}`}>{tt("ui.status.bae7", "Status")}</div>
          <div className={`${styles.gridItem} ${styles.gridItemHeader}`}>{tt("ui.position.cf1c", "Position")}</div>
          <div className={`${styles.gridItem} ${styles.gridItemHeader}`}>{tt("ui.date.eb9a", "Date")}</div>
          <div className={`${styles.gridItem} ${styles.gridItemHeader}`}>{tt("ui.actions.c3cd", "Actions")}</div>
        </div>

        {current.length === 0 && <p style={{
        padding: '1rem',
        color: 'var(--text-muted)'
      }}>{tt("ui.no.tournaments.found.6976", "No tournaments found.")}</p>}

        {current.map((t, index) => {
        const name = t.tournament_title || t.name || '-';
        const game = t.game || t.core_game || '-';
        const type = t.tournament_type || t.format || '-';
        const prize = t.prize || t.prize_pool ? `N${t.prize || t.prize_pool}` : '-';
        const status = t.status || '-';
        const pos = t.position || t.placement || '-';
        const date = formatDate(t.start_date || t.start_date_and_time || t.date);
        return <div key={t.id || t.tournament_id || index} className={`${styles.gridRow} ${profileStyles.middleLayerColor}`}>
              <div className={`${styles.gridItem} ${styles.nameColumn}`}>
                <p className={styles.gameName}>{name}</p>
              </div>
              <div className={styles.gridItem}>{game}</div>
              <div className={styles.gridItem}>{type}</div>
              <div className={styles.gridItem}>{prize}</div>
              <div className={styles.gridItem}>
                <span className={status === 'completed' || status === 'Completed' ? styles.completedStatus : styles.inProgress}>
                  {status}
                </span>
              </div>
              <div className={styles.gridItem}>{pos}</div>
              <div className={styles.gridItem}>{date}</div>
              <div className={styles.gridItem}>
                <button className={`${styles.exploreBTN} ${profileStyles.topMostLayerColor}`} onClick={() => setSelectedTournament(t)}>
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
            <select id="rowsPerPage" value={rowsPerPage} onChange={e => {
            setRowsPerPage(Number(e.target.value));
            setCurrentPage(1);
          }} className={styles.customSelect}>
              {[5, 10, 20, 50].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
            <TiArrowSortedDown className={styles.dropDownIcon} />
          </div>
        </div>

        <p className={profileStyles.showingNumber}>
          {tt("ui.showing.163d", "Showing")} {total === 0 ? 0 : indexOfFirst + 1}-{Math.min(indexOfLast, total)} of {total}
        </p>

        <div className={styles.pagination}>
          <button className={`${styles.navIconBTN} ${currentPage === 1 ? styles.hidden : ''}`} onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 1}>
            <BsChevronLeft className={styles.navIcon} />
          </button>
          {pageNumbers.map(n => <button key={n} className={`${styles.pageBTN} ${currentPage === n ? styles.activePage : ''}`} onClick={() => setCurrentPage(n)}>
              {n}
            </button>)}
          <button className={`${styles.navIconBTN} ${currentPage === pageNumbers.length ? styles.hidden : ''}`} onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage === pageNumbers.length}>
            <BsChevronRight className={styles.navIcon} />
          </button>
        </div>
      </div>

      <UserProfileTournamentsDetails selectedTournament={selectedTournament} setSelectedTournament={setSelectedTournament} />
    </div>;
};
export default UserProfileTournamentsHistory;