'use client';

import { apiMessage } from '@/lib/apiMessage';
import { formatDateTime } from '@/lib/datetime';
import { useState, useEffect, useCallback, useMemo, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { CiSearch } from 'react-icons/ci';
import { LuTicket, LuCheck, LuUsers, LuScanLine, LuSmartphone } from 'react-icons/lu';
import Header from '@/components/header/Header';
import MobileHeader from '@/components/mobile-header/MobileHeader';
import Sidebar from '@/components/sidebar/Sidebar';
import BottomMenu from '@/components/bottom-menu/BottomMenu';
import DoorSearches from '@/components/door/DoorSearches';
import styles from './attendees.module.css';
import { useT } from '@/i18n/LanguageProvider';
import { useTx } from '@/i18n/LanguageProvider';
import UserChip from '@/components/user-chip/UserChip';
const API = process.env.NEXT_PUBLIC_API_URL;
const AttendeesContent = ({
  slug: slugFromPath
}) => {
  const tx = useTx();
  const tt = useT();
  const searchParams = useSearchParams();
  const {
    data: session
  } = useSession();
  const token = session?.user?.sessionToken;
  const eventId = slugFromPath || searchParams.get('id');
  const [rows, setRows] = useState([]);
  const [counts, setCounts] = useState({
    count: 0,
    checked_in: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [code, setCode] = useState('');
  const [scanState, setScanState] = useState(null); // { ok, message }
  const [checking, setChecking] = useState(false);
  // Only self-admitted, only door-admitted, or everybody. The CEO asked to be
  // able to tell the two apart; a filter is how you act on the difference.
  const [gateFilter, setGateFilter] = useState('all');
  // What the SERVER found for a term this device's copy of the list does not
  // contain. See `askServer` below.
  const [remote, setRemote] = useState(null); // { term, rows, count, truncated }
  const [searching, setSearching] = useState(false);

  // The stamp of the last answer, so the next request asks only for what has
  // moved. A ref rather than state: the refresh loop reads it, and putting it
  // in the dependency array would rebuild the loop on every tick.
  const sinceRef = useRef(null);
  const rowsRef = useRef([]);
  useEffect(() => { rowsRef.current = rows; }, [rows]);

  /**
   * The list, or the part of it that has changed since last time.
   *
   * `first` does the full download and shows a loader; every later call is a
   * delta and must never blank what is already on screen, because a door works
   * on a venue connection and a page that empties itself on one bad request is
   * worse than a page that is slightly stale.
   */
  const load = useCallback(async (first = false) => {
    if (!token || !eventId) return true;
    if (first) { setLoading(true); setError(''); }
    try {
      const since = !first && sinceRef.current
        ? `?since=${encodeURIComponent(sinceRef.current)}&lean=1` : '';
      const res = await fetch(`${API}/event/${eventId}/attendees/${since}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json();
      if (!res.ok || body.status !== 'success') {
        // A failed REFRESH is not a failed page. Only the first load may put
        // an error where the list was.
        if (first) {
          setError(apiMessage(tt, body, "api.couldNotLoadTheAttendee", "Could not load the attendee list."));
          setRows([]);
        }
        return false;
      }
      const incoming = body.data.attendees || [];
      sinceRef.current = body.data.asked_at || sinceRef.current;
      if (body.data.delta) {
        // Merge by code. A changed ticket replaces its row, a new one is
        // added, and everything untouched stays exactly as it was.
        if (incoming.length) {
          const byCode = new Map(rowsRef.current.map(r => [r.code, r]));
          incoming.forEach(r => byCode.set(r.code, { ...byCode.get(r.code), ...r }));
          setRows([...byCode.values()]);
        }
      } else {
        setRows(incoming);
      }
      setCounts({
        count: body.data.count || 0,
        checked_in: body.data.checked_in || 0,
      });
      return incoming.length > 0;
    } catch {
      if (first) setError(tt("msg.connectionError", "Connection error."));
      return false;
    } finally {
      if (first) setLoading(false);
    }
  }, [token, eventId, tt]);

  // The numbers, counted in the database rather than off whatever this page is
  // holding. With a delta on screen, counting rows here would report the size
  // of the last change as the size of the event.
  const [summary, setSummary] = useState(null);
  const loadSummary = useCallback(async () => {
    if (!token || !eventId) return;
    try {
      const res = await fetch(`${API}/event/${eventId}/door-summary/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json();
      if (res.ok && body.status === 'success') setSummary(body.data);
    } catch { /* the stat row simply keeps its last good numbers */ }
  }, [token, eventId]);

  useEffect(() => { load(true); loadSummary(); }, [load, loadSummary]);

  /**
   * Keeping itself current, which is the whole of row 78.
   *
   * CEO, 5 September: "make sure every page about evennts updates in realtime
   * automatically without ay one having to refresh, especiallyywhen new people
   * areregisteringfor an eventwhen checdk in is ongoing."
   *
   * A self-scheduling timeout rather than setInterval, for three reasons that
   * all cost somebody a door if ignored:
   *
   *   - it CANNOT STACK. A slow answer delays the next ask instead of piling a
   *     second request on top of it.
   *   - it BACKS OFF. Quiet doors drift from 10s out to 60s, so a page left
   *     open overnight is not still asking every ten seconds. That is the
   *     fault nginx throttled the admin console for on 29 August.
   *   - it STOPS when the tab is hidden. A steward switching to the camera app
   *     should not leave this burning their connection.
   */
  // The loop calls THROUGH a ref, and depends only on the two things that
  // should ever restart it.
  //
  // `load` and `loadSummary` are rebuilt whenever anything in their dependency
  // lists changes, `tt` among them, and `useT()` hands back a new function on
  // most renders. An effect naming them tears its timer down and arms a fresh
  // one on every render, so a 10 second timer never survives to fire: measured
  // in Chrome, twenty seconds on a visible tab produced no refresh at all.
  //
  // Rendering correctly is not working, and this is what that looks like: the
  // page looked completely right and quietly refreshed nothing. See
  // `feedback_react_render_loops`.
  const loadRef = useRef(load);
  const summaryRef = useRef(loadSummary);
  useEffect(() => { loadRef.current = load; }, [load]);
  useEffect(() => { summaryRef.current = loadSummary; }, [loadSummary]);

  useEffect(() => {
    if (!token || !eventId) return undefined;
    let stopped = false;
    let timer = null;
    let wait = 10000;

    const tick = async () => {
      if (stopped) return;
      if (typeof document !== 'undefined' && document.hidden) {
        timer = setTimeout(tick, wait);
        return;
      }
      const moved = await loadRef.current(false);
      if (stopped) return;
      // Something changed: go back to asking often, and refresh the counts.
      // Nothing changed: ask a little less often, up to a minute.
      wait = moved ? 10000 : Math.min(Math.round(wait * 1.5), 60000);
      if (moved) summaryRef.current();
      timer = setTimeout(tick, wait);
    };

    timer = setTimeout(tick, wait);
    const wake = () => {
      // Coming back to the tab should show the truth immediately rather than
      // after whatever was left of a 60 second sleep.
      if (typeof document !== 'undefined' && !document.hidden) {
        wait = 10000;
        if (timer) clearTimeout(timer);
        timer = setTimeout(tick, 0);
      }
    };
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', wake);
    }
    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', wake);
      }
    };
  }, [token, eventId]);
  const checkIn = async ticketCode => {
    const value = (ticketCode || '').trim().toUpperCase();
    if (!value) return;
    setChecking(true);
    setScanState(null);
    try {
      const res = await fetch(`${API}/event/ticket/${encodeURIComponent(value)}/check-in/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({})
      });
      const body = await res.json();
      setScanState({
        ok: body.status === 'success',
        // A refusal carries a code, and the code is what can be translated.
        // The server's own sentence is written in the server's language.
        message: body.status === 'success'
          ? body.message
          : apiMessage(tt, body, 'api.couldNotCheckIn', 'That ticket could not be checked in.'),
      });
      if (body.status === 'success') {
        setCode('');
        // The person just admitted may have come from a server search, so they
        // are not necessarily in this device's list yet. Refreshing the delta
        // and the counts puts them in both.
        load();
        loadSummary();
        setRemote(null);
        setSearch('');
      }
    } catch {
      setScanState({
        ok: false,
        message: tt("msg.connectionError", "Connection error.")
      });
    } finally {
      setChecking(false);
    }
  };
  /**
   * Taking a check-in back.
   *
   * Deliberately not behind a confirmation. At a gate with a queue the mistake
   * was made two seconds ago by the person holding the phone, and a dialog
   * between them and the correction is how the correction stops happening. It
   * is reversible in one press the other way, and the door log records who did
   * it.
   */
  const undoCheckIn = async (ticketCode) => {
    const value = (ticketCode || '').trim().toUpperCase();
    if (!value) return;
    setChecking(true);
    setScanState(null);
    try {
      const res = await fetch(
        `${API}/event/ticket/${encodeURIComponent(value)}/undo-check-in/`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json',
                     Authorization: `Bearer ${token}` },
          body: JSON.stringify({}),
        });
      const body = await res.json();
      setScanState({
        ok: body.status === 'success',
        message: body.status === 'success'
          ? body.message
          : apiMessage(tt, body, 'api.couldNotUndo', 'That check-in could not be undone.'),
      });
      if (body.status === 'success') { load(); loadSummary(); }
    } catch {
      setScanState({ ok: false, message: tt("msg.connectionError", "Connection error.") });
    } finally {
      setChecking(false);
    }
  };

  const local = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(r => [r.attendee_name, r.username, r.code, r.tier,
      r.attendee_email, r.attendee_phone].some(v => (v || '').toLowerCase().includes(q)));
  }, [rows, search]);

  /**
   * THE FIX. A term this device cannot match is put to the server.
   *
   * RIVALRY SERIES SEASON 2, 4 and 5 September 2026: one check-in recorded out
   * of 1422 tickets. Search filtered the list downloaded when the page opened,
   * so a ticket bought at 10:15 was invisible to a page loaded at 06:53, and
   * the page answered "Nobody matches that search" WITHOUT A SINGLE REQUEST
   * LEAVING THE PHONE. The server saw two requests from the door device all
   * day, both sign-ins.
   *
   * The local list stays, because it is what makes the common case instant and
   * what keeps the door working when the venue's wifi does not. This is the
   * fallback for a miss.
   *
   * It calls `door-search`, which ADMITS NOBODY. Falling back to `check-in/`
   * would have meant typing a name let that person through, which is not a
   * search.
   */
  useEffect(() => {
    const term = search.trim();
    if (term.length < 2 || local.length > 0 || !token || !eventId) {
      setRemote(null);
      setSearching(false);
      return undefined;
    }
    // Debounced: a steward types a name one letter at a time and the server
    // does not need to hear about every keystroke.
    let cancelled = false;
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `${API}/event/${eventId}/door-search/?q=${encodeURIComponent(term)}`,
          { headers: { Authorization: `Bearer ${token}` } });
        const body = await res.json();
        if (cancelled) return;
        setRemote(res.ok && body.status === 'success'
          ? { term, rows: body.data.attendees || [], count: body.data.count || 0,
              truncated: !!body.data.truncated }
          : { term, rows: [], count: 0, truncated: false });
      } catch {
        if (!cancelled) setRemote({ term, rows: [], count: 0, truncated: false });
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 350);
    return () => { cancelled = true; clearTimeout(timer); setSearching(false); };
  }, [search, local.length, token, eventId]);

  // What is actually on screen: this device's matches, or the server's when
  // this device has none. A steward must not be able to tell which is which.
  const found = local.length > 0 ? local : (remote?.rows || []);
  const fromServer = local.length === 0 && (remote?.rows || []).length > 0;

  // Four ways to read the list, and the CEO named three of them:
  //
  //   "the organizers should be able to selecet options like total checkins,
  //    actual verified and self verified."
  //
  // `all` is everybody holding a ticket, which is the list itself. The other
  // three are the check-in question, and `door` is the only one that answers
  // "how many people actually came" - a self check-in is somebody telling
  // their followers they are here, not somebody arriving at a gate.
  const filtered = useMemo(() => {
    if (gateFilter === 'self') return found.filter(r => r.self_check_in);
    if (gateFilter === 'door') {
      return found.filter(r => r.status === 'checked_in' && !r.self_check_in);
    }
    if (gateFilter === 'checked') return found.filter(r => r.status === 'checked_in');
    return found;
  }, [found, gateFilter]);
  // An event that asked nothing gets no column, rather than a column of blanks
  // taking width away from the name on a phone.
  const anyAnswers = useMemo(
    () => rows.some(r => (r.answers || []).some(a => a.value !== '' && a.value !== null
      && a.value !== undefined)),
    [rows]);
  const body = () => {
    if (!eventId) return <p className={styles.stateText}>{tt("ui.no.event.selected.97ca", "No event selected.")}</p>;
    if (loading) return <p className={styles.stateText}>{tt("ui.loading.attendees.f4fd", "Loading attendees…")}</p>;
    if (error) {
      return <div className={styles.errorBox}>
          <p className={styles.errorTitle}>{error}</p>
          <p className={styles.errorSub}>{tt("ui.only.organizer.event.can.0b81", "Only the organizer of this event can see its attendee list.")}</p>
          <Link href="/events" className={styles.backLink}>{tt("ui.back.events.d104", "← Back to events")}</Link>
        </div>;
    }
    // The three numbers, taken from the server's shared counter rather than
    // recounted here. `counts.checked_in` is the TOTAL and includes people who
    // said they were here without anybody checking, so it is never the figure
    // shown under a bare "Checked in".
    const selfCount = summary?.self_reported ?? summary?.self_admitted ?? 0;
    const verifiedCount = summary?.verified
      ?? Math.max((counts.checked_in || 0) - selfCount, 0);

    return <>
        <div className={styles.statRow}>
          <div className={styles.statCard}>
            <LuTicket className={styles.statIcon} />
            <div>
              <p className={styles.statValue}>{counts.count}</p>
              <p className={styles.statLabel}>{tt("ui.tickets.sold.a960", "Tickets sold")}</p>
            </div>
          </div>
          {/* ATTENDANCE, which is the scanned-or-typed figure and nothing else.
              CEO, 7 September: somebody who admitted themselves "doesnt mean
              they are checkedin by the organizer, just means that maybe they
              want to show and announce to their followers ... The ticket
              scanning or ticket code entering is still the baseline for a
              proper check in that the person actally came."
              This card used to show the total, self check-ins included, which
              overstated how many people walked through the door. */}
          <div className={styles.statCard}>
            <LuCheck className={styles.statIcon} />
            <div>
              <p className={styles.statValue}>{verifiedCount}</p>
              <p className={styles.statLabel}>{tt("door.verified", "Verified at the door")}</p>
            </div>
          </div>
          <div className={styles.statCard}>
            <LuUsers className={styles.statIcon} />
            <div>
              <p className={styles.statValue}>{Math.max(counts.count - verifiedCount, 0)}</p>
              <p className={styles.statLabel}>{tt("ui.still.expected.8840", "Still expected")}</p>
            </div>
          </div>
          {/* Said separately and never added into the figure above. It is a
              real signal, just not evidence anybody arrived. */}
          {selfCount > 0 && <div className={styles.statCard}>
            <LuSmartphone className={styles.statIcon} />
            <div>
              <p className={styles.statValue}>{selfCount}</p>
              <p className={styles.statLabel}>{tt("door.selfAdmitted", "Said they are here")}</p>
            </div>
          </div>}
        </div>

        {/* The scanner, findable. On 5 September nobody opened it at all: staff
            stood on this page reading codes off a phone camera and typing them
            in, because there was no way to get from here to there. */}
        <Link href={`/events/scan?event=${encodeURIComponent(eventId || '')}`}
              className={styles.scanLink}>
          <LuScanLine aria-hidden="true" />
          {tt("door.openScanner", "Open the scanner")}
        </Link>

        <div className={styles.scanCard}>
          <p className={styles.scanTitle}>{tt("ui.check.someone.f698", "Check someone in")}</p>
          <div className={styles.scanRow}>
            <input className={styles.scanInput} placeholder={tt("ui.ticket.code.e.g.613b", "Ticket code, e.g. VT-9L57BUDE")} value={code} onChange={e => setCode(e.target.value.toUpperCase())} onKeyDown={e => {
            if (e.key === 'Enter') checkIn(code);
          }} />
            <button className={`${styles.scanBtn} grnBTN`} onClick={() => checkIn(code)} disabled={checking || !code.trim()} type="button">
              {checking ? tx("Checking…") : tx("Check in")}
            </button>
          </div>
          {scanState && <p className={scanState.ok ? styles.scanOk : styles.scanErr}>{scanState.message}</p>}
        </div>

        <div className={styles.searchRow}>
          <CiSearch className={styles.searchIcon} />
          <input className={styles.searchInput} placeholder={tt("ui.search.name.username.code.2ef3", "Search by name, username, code or tier")} value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {/* Filled chips, never a ring. Selected is a stronger fill.
            The count rides on the chip, because the difference between the
            total and the verified figure is the whole point of separating
            them and it should not need a second screen to see. */}
        <div className={styles.filterRow}>
          {[['all', tt('door.filterAll', 'Everyone'), counts.count],
            ['checked', tt('door.filterChecked', 'All check-ins'),
             verifiedCount + selfCount],
            ['door', tt('door.filterDoor', 'Verified at the door'), verifiedCount],
            ['self', tt('door.filterSelf', 'Said they are here'), selfCount]]
            .map(([id, label, n]) =>
            <button key={id} type="button"
                    className={`${styles.filterChip} ${gateFilter === id ? styles.filterChipOn : ''}`}
                    aria-pressed={gateFilter === id}
                    onClick={() => setGateFilter(id)}>{label} {n}</button>)}
        </div>

        {/* Said plainly when the answer came from the server rather than from
            this device, because the two are otherwise indistinguishable and a
            steward should know the list they hold was incomplete. */}
        {fromServer && <p className={styles.fromServer}>
          {tt("door.foundOnServer", "Found on the server. This device's copy of the list did not have them.")}
        </p>}

        {searching && filtered.length === 0 ? <p className={styles.stateText}>
            {tt("door.askingServer", "Asking the server…")}
          </p>
         : filtered.length === 0 ? <p className={styles.stateText}>
            {rows.length === 0 ? tx("No tickets sold yet.")
             : search.trim().length >= 2
               ? tt("door.noOneAnywhere", "Nobody with that name or code has a ticket. The whole list was searched, not just this device's copy.")
               : tx("Nobody matches that search.")}
          </p> : <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>{tt("ui.attendee.aabc", "Attendee")}</th>
                  <th>{tt("ui.ticket.a767", "Ticket")}</th>
                  <th>{tt("ui.tier.5bd4", "Tier")}</th>
                  {/* What the organiser asked for at checkout. Without this
                      column the shirt sizes are collected and never seen,
                      which is the same as not collecting them. */}
                  {anyAnswers && <th>{tt('door.asked', 'Answers')}</th>}
                  <th>{tt("ui.status.bae7", "Status")}</th>
                  <th>{tt("ui.checked.cb4a", "Checked in")}</th>
                  {/* CEO, 6 September: "under door list there should be a way
                      for admin to search for someone and then check them in".
                      Search finds them, this admits them, and the steward
                      never leaves the list. */}
                  <th><span className={styles.srOnly}>{tt("door.admit", "Admit")}</span></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => <tr key={r.code}>
                    <td>
                      <span className={styles.name}>{r.attendee_name || r.full_name || r.username}</span>
                      {/* A guest has no handle, and rendering a bare "@" for
                          them looks like a bug on the door list. Their email
                          is the thing that identifies them. */}
                      {r.username
                        ? <UserChip user={r} size={0} secondary
                                    handleClassName={styles.handle} />
                        : <span className={styles.handle}>{r.attendee_email}</span>}
                      {r.attendee_phone && <span className={styles.handle}>
                        {r.attendee_phone}
                      </span>}
                    </td>
                    <td className={styles.code}>{r.code}</td>
                    <td>{r.tier}</td>
                    {anyAnswers && <td className={styles.answers}>
                      {(r.answers || []).filter(a => a.value !== '' && a.value !== null
                        && a.value !== undefined).map(a => <span key={a.label} className={styles.answer}>
                          <span className={styles.answerLabel}>{a.label}</span>
                          <span>{a.value === true ? tt('door.yes', 'Yes')
                            : a.value === false ? tt('door.no', 'No') : String(a.value)}</span>
                        </span>)}
                    </td>}
                    <td>
                      <span className={`${styles.badge} ${styles[`badge_${r.status}`] || ''}`}>
                        {r.status === 'checked_in' ? tx("checked in") : r.status}
                      </span>
                    </td>
                    <td className={styles.muted}>
                      {r.checked_in_at ? formatDateTime(r.checked_in_at) : '-'}
                      {r.self_check_in && <span className={styles.selfTag}>
                        {tt("door.self", "themselves")}
                      </span>}
                    </td>
                    <td>
                      {r.status === 'valid'
                        ? <button type="button" className={`${styles.rowBtn} grnBTN`}
                                  disabled={checking}
                                  onClick={() => checkIn(r.code)}>
                            {tt("door.checkIn", "Check in")}
                          </button>
                        : r.status === 'checked_in'
                          /* CEO, 6 September: "should also be able to undo
                             check ins". A steward scans the wrong phone all
                             evening, and a headcount nobody can correct is not
                             a headcount. */
                          ? <button type="button" className={styles.undoBtn}
                                    disabled={checking}
                                    onClick={() => undoCheckIn(r.code)}>
                              {tt("door.undo", "Undo")}
                            </button>
                          : <span className={styles.rowDone} />}
                    </td>
                  </tr>)}
              </tbody>
            </table>
          </div>}

        {/* What the door asked for. Organiser only, and the endpoint enforces
            that: a steward needs to admit people, not to read what every other
            steward has been typing. Closed by default so the door screen opens
            on the door. */}
        {summary?.can_read_lookups
          && <DoorSearches eventId={eventId} token={token} />}
      </>;
  };
  return <div className={styles.pageContainer}>
      <Header />
      <MobileHeader />
      <main className={styles.mainContainer}>
        <Sidebar />
        <div className={styles.rightPaneContainer}>
          <div className={styles.pageHeader}>
            <Link href={`/events/${eventId || ''}`} className={styles.backLink}>{tt("ui.back.event.ba2d", "← Back to event")}</Link>
            <h1 className={styles.pageTitle}>{tt("ui.door.list.9958", "Door list")}</h1>
            <p className={styles.pageSubtitle}>{tt("ui.everyone.holding.ticket.who.9087", "Everyone holding a ticket, and who has arrived.")}</p>
          </div>
          {body()}
        </div>
      </main>
      <BottomMenu />
    </div>;
};
const Attendees = () => <Suspense fallback={<div style={{
  minHeight: '100vh',
  backgroundColor: '#131316'
}} />}>
    <AttendeesContent />
  </Suspense>;
export default Attendees;

// Exported so the slug route can render it. Everything a person
// clicks still lives here; the route file only supplies the address.
export { AttendeesContent };