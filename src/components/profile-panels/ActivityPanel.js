'use client';

import { useMemo, useState } from 'react';
import styles from './ActivityPanel.module.css';
import parentStyles from '@/app/user-profile/user-profile.module.css';
import { useT } from '@/i18n/LanguageProvider';
import { useTx } from '@/i18n/LanguageProvider';
const TOURNAMENT_STATUS = {
  upcoming: {
    cls: styles.sUpcoming,
    label: 'Upcoming'
  },
  live: {
    cls: styles.sLive,
    label: 'Live',
    dot: true
  },
  in_progress: {
    cls: styles.sProgress,
    label: 'In Progress'
  },
  progress: {
    cls: styles.sProgress,
    label: 'In Progress'
  },
  completed: {
    cls: styles.sCompleted,
    label: 'Completed'
  },
  disq: {
    cls: styles.sDisq,
    label: 'Disqualified'
  }
};
const EVENT_STATUS = {
  upcoming: {
    cls: styles.sUpcoming,
    label: 'Upcoming'
  },
  attended: {
    cls: styles.sAttended,
    label: 'Attended'
  },
  completed: {
    cls: styles.sCompleted,
    label: 'Completed'
  },
  cancelled: {
    cls: styles.sCancelled,
    label: 'Cancelled'
  },
  noshow: {
    cls: styles.sNoshow,
    label: 'No-Show'
  },
  in_progress: {
    cls: styles.sProgress,
    label: 'In Progress'
  }
};
const placeClass = p => {
  if (p === 1) return styles.gold;
  if (p === 2) return styles.silver;
  if (p === 3) return styles.bronze;
  return styles.dnp;
};
const TournamentTable = ({
  rows
}) => {
  const tx = useTx();
  const tt = useT();
  const [openId, setOpenId] = useState(null);
  if (rows.length === 0) {
    return <div className={styles.txEmpty}>{tt("ui.no.tournaments.match.filters.72a5", "No tournaments match your filters.")}</div>;
  }
  return <>
      {/* Desktop */}
      <table className={styles.tx}>
        <thead>
          <tr>
            <th>{tt("ui.tournament.a2c1", "Tournament")}</th>
            <th>{tt("ui.game.e3e8", "Game")}</th>
            <th>{tt("ui.date.eb9a", "Date")}</th>
            <th>{tt("ui.format.041a", "Format")}</th>
            <th>{tt("ui.type.3deb", "Type")}</th>
            <th>{tt("ui.placement.ab89", "Placement")}</th>
            <th>{tt("ui.prize.d597", "Prize")}</th>
            <th>{tt("ui.status.bae7", "Status")}</th>
            <th>{tt("ui.actions.c3cd", "Actions")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(t => {
          const stat = TOURNAMENT_STATUS[t.status] || TOURNAMENT_STATUS.upcoming;
          return <tr key={t.id}>
                <td>
                  <div className={styles.tName}>
                    <div className={styles.tThumb}>{(t.gkey || t.game || '?').slice(0, 4).toUpperCase()}</div>
                    <div className={styles.tNameBlock}>
                      <span className={styles.tNameText}>{t.name}</span>
                      <span className={styles.tNameSub}>{t.org || t.organizer || ''}</span>
                    </div>
                  </div>
                </td>
                <td>{t.game}</td>
                <td>{t.date || '-'}</td>
                <td>{t.format || '-'}</td>
                <td>{t.type || '-'}</td>
                <td><span className={`${styles.tPlace} ${placeClass(t.placement)}`}>{t.place || (t.placement ? `${t.placement}` : '-')}</span></td>
                <td><span className={`${styles.tPrize} ${!t.prizeRaw || t.prizeRaw === 0 ? styles.tPrizeMuted : ''}`}>{t.prize || '-'}</span></td>
                <td>
                  <span className={`${styles.status} ${stat.cls}`}>
                    {stat.dot && <span className={styles.liveDot} />}
                    {tx(stat.label)}
                  </span>
                </td>
                <td><a href="#" className={styles.tAction}>{tt("ui.view.details.907b", "View Details")}</a></td>
              </tr>;
        })}
        </tbody>
      </table>

      {/* Mobile cards */}
      <div className={styles.txCards}>
        {rows.map(t => {
        const stat = TOURNAMENT_STATUS[t.status] || TOURNAMENT_STATUS.upcoming;
        const isOpen = openId === t.id;
        return <div className={`${styles.txCard} ${isOpen ? styles.txCardOpen : ''}`} key={t.id}>
              <div className={styles.txCardHead} onClick={() => setOpenId(isOpen ? null : t.id)}>
                <div className={styles.tName}>
                  <div className={styles.tThumb}>{(t.gkey || t.game || '?').slice(0, 4).toUpperCase()}</div>
                  <div className={styles.tNameBlock}>
                    <span className={styles.tNameText}>{t.name}</span>
                    <span className={styles.tNameSub}>{t.game} • {t.date || ''}</span>
                  </div>
                </div>
                <div className={styles.txCardRight}>
                  <span className={`${styles.status} ${stat.cls}`}>
                    {stat.dot && <span className={styles.liveDot} />}
                    {tx(stat.label)}
                  </span>
                  <svg className={styles.chev} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9" /></svg>
                </div>
              </div>
              <div className={styles.txCardBody}>
                <div className={styles.txCardBodyInner}>
                  <div className={styles.txRow}><span className={styles.txRowKey}>{tt("ui.format.041a", "Format")}</span><span className={styles.txRowVal}>{t.format || '-'}</span></div>
                  <div className={styles.txRow}><span className={styles.txRowKey}>{tt("ui.type.3deb", "Type")}</span><span className={styles.txRowVal}>{t.type || '-'}</span></div>
                  <div className={styles.txRow}><span className={styles.txRowKey}>{tt("ui.placement.ab89", "Placement")}</span><span className={styles.txRowVal}><span className={`${styles.tPlace} ${placeClass(t.placement)}`}>{t.place || '-'}</span></span></div>
                  <div className={styles.txRow}><span className={styles.txRowKey}>{tt("ui.prize.d597", "Prize")}</span><span className={styles.txRowVal}>{t.prize || '-'}</span></div>
                  <a className={styles.txCardCta} href="#" onClick={e => e.stopPropagation()}>{tt("ui.view.details.907b", "View Details")}</a>
                </div>
              </div>
            </div>;
      })}
      </div>
    </>;
};
const EventTable = ({
  rows
}) => {
  const tx = useTx();
  const tt = useT();
  const [openId, setOpenId] = useState(null);
  if (rows.length === 0) {
    return <div className={styles.txEmpty}>{tt("ui.no.events.match.filters.780b", "No events match your filters.")}</div>;
  }
  return <>
      <table className={styles.tx}>
        <thead>
          <tr>
            <th>{tt("ui.event.name.8269", "Event Name")}</th>
            <th>{tt("ui.type.3deb", "Type")}</th>
            <th>{tt("ui.game.theme.050c", "Game / Theme")}</th>
            <th>{tt("ui.venue.67cd", "Venue")}</th>
            <th>{tt("ui.date.eb9a", "Date")}</th>
            <th>{tt("ui.ticket.tier.9d6d", "Ticket Tier")}</th>
            <th>{tt("ui.status.bae7", "Status")}</th>
            <th>{tt("ui.actions.c3cd", "Actions")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(e => {
          const stat = EVENT_STATUS[e.status] || EVENT_STATUS.upcoming;
          return <tr key={e.id}>
                <td>
                  <div className={styles.tName}>
                    <div className={styles.tThumb}>{(e.name || '?').slice(0, 4).toUpperCase()}</div>
                    <span className={styles.tNameText}>{e.name}</span>
                  </div>
                </td>
                <td>{e.type || e.event_type || '-'}</td>
                <td>{e.game || e.theme || '-'}</td>
                <td>{e.venue || e.location || '-'}</td>
                <td>{e.date || '-'}</td>
                <td>{e.tier || '-'}</td>
                <td><span className={`${styles.status} ${stat.cls}`}>{tx(stat.label)}</span></td>
                <td><a href="#" className={styles.tAction}>{tt("ui.view.details.907b", "View Details")}</a></td>
              </tr>;
        })}
        </tbody>
      </table>

      <div className={styles.txCards}>
        {rows.map(e => {
        const stat = EVENT_STATUS[e.status] || EVENT_STATUS.upcoming;
        const isOpen = openId === e.id;
        return <div className={`${styles.txCard} ${isOpen ? styles.txCardOpen : ''}`} key={e.id}>
              <div className={styles.txCardHead} onClick={() => setOpenId(isOpen ? null : e.id)}>
                <div className={styles.tName}>
                  <div className={styles.tThumb}>{(e.name || '?').slice(0, 4).toUpperCase()}</div>
                  <div className={styles.tNameBlock}>
                    <span className={styles.tNameText}>{e.name}</span>
                    <span className={styles.tNameSub}>{e.type} • {e.date}</span>
                  </div>
                </div>
                <div className={styles.txCardRight}>
                  <span className={`${styles.status} ${stat.cls}`}>{tx(stat.label)}</span>
                  <svg className={styles.chev} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9" /></svg>
                </div>
              </div>
              <div className={styles.txCardBody}>
                <div className={styles.txCardBodyInner}>
                  <div className={styles.txRow}><span className={styles.txRowKey}>{tt("ui.game.theme.050c", "Game / Theme")}</span><span className={styles.txRowVal}>{e.game || '-'}</span></div>
                  <div className={styles.txRow}><span className={styles.txRowKey}>{tt("ui.venue.67cd", "Venue")}</span><span className={styles.txRowVal}>{e.venue || e.location || '-'}</span></div>
                  <div className={styles.txRow}><span className={styles.txRowKey}>{tt("ui.tier.5bd4", "Tier")}</span><span className={styles.txRowVal}>{e.tier || '-'}</span></div>
                  <a className={styles.txCardCta} href="#" onClick={ev => ev.stopPropagation()}>{tt("ui.view.details.907b", "View Details")}</a>
                </div>
              </div>
            </div>;
      })}
      </div>
    </>;
};
const ActivityPanel = ({
  tournaments = [],
  events = []
}) => {
  const tx = useTx();
  const tt = useT();
  const [subTab, setSubTab] = useState('tournaments');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const data = subTab === 'tournaments' ? tournaments : events;
  const filtered = useMemo(() => {
    return data.filter(row => {
      if (statusFilter && row.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const hay = `${row.name || ''} ${row.game || ''} ${row.venue || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [data, search, statusFilter]);
  const total = filtered.length;
  const start = (page - 1) * rowsPerPage;
  const end = Math.min(start + rowsPerPage, total);
  const slice = filtered.slice(start, end);
  const totalPages = Math.max(1, Math.ceil(total / rowsPerPage));
  return <div>
      <div className={parentStyles.subTabs}>
        <button type="button" className={`${parentStyles.subTab} ${subTab === 'tournaments' ? parentStyles.subTabActive : ''}`} onClick={() => {
        setSubTab('tournaments');
        setPage(1);
      }}>
          {tt("ui.tournaments.fee2", "Tournaments")}
        </button>
        <button type="button" className={`${parentStyles.subTab} ${subTab === 'events' ? parentStyles.subTabActive : ''}`} onClick={() => {
        setSubTab('events');
        setPage(1);
      }}>
          {tt("ui.events.c549", "Events")}
        </button>
      </div>

      <div className={styles.activityWrap}>
        <div className={styles.filterBar}>
          <div className={styles.filterCount}>
            {total} {subTab === 'tournaments' ? 'tournament' : 'event'}{total === 1 ? '' : 's'}
          </div>
          <div className={styles.filterControls}>
            <div className={styles.ctrlSearch}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>
              <input type="text" placeholder={subTab === 'tournaments' ? tx("Search tournaments…") : tx("Search Events")} value={search} onChange={e => {
              setSearch(e.target.value);
              setPage(1);
            }} />
            </div>
            <select className={styles.ctrlSelect} value={statusFilter} onChange={e => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}>
              <option value="">{tt("ui.all.status.6b30", "All Status")}</option>
              {subTab === 'tournaments' ? <>
                  <option value="upcoming">{tt("ui.upcoming.523b", "Upcoming")}</option>
                  <option value="live">{tt("ui.live.65c8", "Live")}</option>
                  <option value="progress">{tt("ui.progress.f61e", "In Progress")}</option>
                  <option value="completed">{tt("ui.completed.1798", "Completed")}</option>
                  <option value="disq">{tt("ui.disqualified.a525", "Disqualified")}</option>
                </> : <>
                  <option value="upcoming">{tt("ui.upcoming.523b", "Upcoming")}</option>
                  <option value="attended">{tt("ui.attended.81b4", "Attended")}</option>
                  <option value="completed">{tt("ui.completed.1798", "Completed")}</option>
                  <option value="cancelled">{tt("ui.cancelled.a1bf", "Cancelled")}</option>
                  <option value="noshow">{tt("ui.no.show.1920", "No-Show")}</option>
                </>}
            </select>
          </div>
        </div>

        <div className={styles.tableWrap}>
          {subTab === 'tournaments' ? <TournamentTable rows={slice} /> : <EventTable rows={slice} />}
        </div>

        {total > 0 && <div className={styles.pagination}>
            <div className={styles.pagLeft}>
              <div className={styles.rowsPer}>
                <span>{tt("ui.rows.52d0", "Rows")}</span>
                <select value={rowsPerPage} onChange={e => {
              setRowsPerPage(Number(e.target.value));
              setPage(1);
            }}>
                  <option>5</option>
                  <option>10</option>
                  <option>20</option>
                </select>
              </div>
              <span className={styles.pagInfo}>{tt("ui.showing.163d", "Showing")} {start + 1}-{end} of {total}</span>
            </div>
            <div className={styles.pagBtns}>
              <button className={styles.pagBtn} onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>‹</button>
              {Array.from({
            length: totalPages
          }, (_, i) => i + 1).map(n => <button key={n} className={`${styles.pagBtn} ${page === n ? styles.pagBtnActive : ''}`} onClick={() => setPage(n)}>{n}</button>)}
              <button className={styles.pagBtn} onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>›</button>
            </div>
          </div>}
      </div>
    </div>;
};
export default ActivityPanel;