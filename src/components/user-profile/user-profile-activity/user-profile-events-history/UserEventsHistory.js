'use client'

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { CiSearch } from 'react-icons/ci';
import { TiArrowSortedDown } from 'react-icons/ti';
import { BsChevronLeft, BsChevronRight } from 'react-icons/bs';
import UserEventsDetails from './UserEventsDetails';
import profileStyles from '@/styles/profile/profile-page.module.css';
import styles from './user-events-history.module.css';

const UserEventsHistory = () => {
  const { data: session } = useSession();
  const [events, setEvents] = useState([]);
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
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/auth/user-activity/events/`,
          { headers: { Authorization: `Bearer ${session.user.sessionToken}` } }
        );
        const data = await res.json();
        const list = data?.data ?? [];
        setEvents(Array.isArray(list) ? list : []);
      } catch {
        setError('Failed to load event history.');
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [session]);

  const filtered = events.filter((e) =>
    !searchQuery.trim() ||
    (e.name || e.event_name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const total = filtered.length;
  const indexOfFirst = (currentPage - 1) * rowsPerPage;
  const indexOfLast = indexOfFirst + rowsPerPage;
  const current = filtered.slice(indexOfFirst, indexOfLast);
  const pageNumbers = [];
  for (let i = 1; i <= Math.ceil(total / rowsPerPage); i++) pageNumbers.push(i);

  const formatDate = (d) => {
    if (!d) return '-';
    return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  if (loading) return <p style={{ padding: '1rem', color: 'var(--text-muted)' }}>Loading event history…</p>;
  if (error)   return <p style={{ padding: '1rem', color: 'var(--v-ent-red)' }}>{error}</p>;

  return (
    <div className={profileStyles.tournamentEventsContainer}>
      <div className={profileStyles.tournamentsEventsFilterSearchContainer}>
        <div className={profileStyles.tournamentsEventsFilterContainer}>
          <p className={styles.tournamentNumber}>{total} event{total !== 1 ? 's' : ''}</p>
          <div className={`${profileStyles.filterContainer} ${profileStyles.topMostLayerColor}`}>Filter</div>
        </div>

        <div className={profileStyles.searchContainer}>
          <div className={profileStyles.searchBar}>
            <CiSearch className={profileStyles.searchIcon} />
            <input
              type="text"
              placeholder="Search events"
              className={profileStyles.searchInput}
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            />
          </div>
        </div>
      </div>

      <div className={profileStyles.tournamentsEventsTable}>
        <div className={`${styles.gridHeader} ${profileStyles.middleLayerColor}`}>
          <div className={`${styles.gridItem} ${styles.gridItemHeader}`}>Event Name</div>
          <div className={`${styles.gridItem} ${styles.gridItemHeader}`}>Type</div>
          <div className={`${styles.gridItem} ${styles.gridItemHeader}`}>Game</div>
          <div className={`${styles.gridItem} ${styles.gridItemHeader}`}>Location</div>
          <div className={`${styles.gridItem} ${styles.gridItemHeader}`}>Date</div>
          <div className={`${styles.gridItem} ${styles.gridItemHeader}`}>Status</div>
          <div className={`${styles.gridItem} ${styles.gridItemHeader}`}>Actions</div>
        </div>

        {current.length === 0 && (
          <p style={{ padding: '1rem', color: 'var(--text-muted)' }}>No events found.</p>
        )}

        {current.map((e, index) => {
          const name     = e.name || e.event_name || '-';
          const type     = e.event_type || '-';
          const game     = e.game || e.core_game || '-';
          const location = e.location || e.venue || '-';
          const status   = e.status || '-';
          const date     = formatDate(e.event_date || e.start_date || e.date);

          return (
            <div key={e.id || e.event_id || index} className={`${styles.gridRow} ${profileStyles.middleLayerColor}`}>
              <div className={`${styles.gridItem} ${styles.nameColumn}`}>
                <p className={styles.gameName}>{name}</p>
              </div>
              <div className={styles.gridItem}>{type}</div>
              <div className={styles.gridItem}>{game}</div>
              <div className={styles.gridItem}>{location}</div>
              <div className={styles.gridItem}>{date}</div>
              <div className={styles.gridItem}>
                <span className={status === 'completed' || status === 'Completed' ? styles.completedStatus : styles.inProgress}>
                  {status}
                </span>
              </div>
              <div className={styles.gridItem}>
                <button
                  className={`${styles.exploreBTN} ${profileStyles.topMostLayerColor}`}
                  onClick={() => setSelectedTournament(e)}
                >
                  Explore
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className={styles.paginationContainer}>
        <div className={styles.rowCountSelector}>
          <label htmlFor="rowsPerPage">Rows </label>
          <div className={styles.customSelectContainer}>
            <select
              id="rowsPerPage"
              value={rowsPerPage}
              onChange={(e) => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1); }}
              className={styles.customSelect}
            >
              {[5, 10, 20, 50].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
            <TiArrowSortedDown className={styles.dropDownIcon} />
          </div>
        </div>

        <p className={profileStyles.showingNumber}>
          Showing {total === 0 ? 0 : indexOfFirst + 1}-{Math.min(indexOfLast, total)} of {total}
        </p>

        <div className={styles.pagination}>
          <button
            className={`${styles.navIconBTN} ${currentPage === 1 ? styles.hidden : ''}`}
            onClick={() => setCurrentPage((p) => p - 1)}
            disabled={currentPage === 1}
          >
            <BsChevronLeft className={styles.navIcon} />
          </button>
          {pageNumbers.map((n) => (
            <button
              key={n}
              className={`${styles.pageBTN} ${currentPage === n ? styles.activePage : ''}`}
              onClick={() => setCurrentPage(n)}
            >
              {n}
            </button>
          ))}
          <button
            className={`${styles.navIconBTN} ${currentPage === pageNumbers.length ? styles.hidden : ''}`}
            onClick={() => setCurrentPage((p) => p + 1)}
            disabled={currentPage === pageNumbers.length}
          >
            <BsChevronRight className={styles.navIcon} />
          </button>
        </div>
      </div>

      <UserEventsDetails
        selectedTournament={selectedTournament}
        setSelectedTournament={setSelectedTournament}
      />
    </div>
  );
};

export default UserEventsHistory;
