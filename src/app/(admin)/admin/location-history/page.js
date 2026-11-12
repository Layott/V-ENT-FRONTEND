'use client';

/**
 * Admin: location history (inbox 305b, 305c; the flexible search, inbox 596).
 *
 * Where people said they were leaving from for an event, kept for staff after
 * the event hides it from everybody else ("don't remove it ever"). Only the
 * separate `view_location_history` permission reaches this page (super admin
 * and moderation admin, not the general admin role).
 *
 * Search is forgiving, like every search on the site: a person by name,
 * username or email, an event by its name or address, an area by its words,
 * narrowed by the days the area was set. Each row says what the door saw.
 * A reason is required, and every search, every further page and every
 * person's history opened is written to the audit log; "Who has looked" reads
 * those lookups back (a super admin sees everybody's, anybody else their own).
 */
import { useCallback, useEffect, useState } from 'react';
import AdminNav from '@/components/admin/AdminNav';
import AdminHeader from '@/components/admin/AdminHeader';
import { useAdminAuth } from '@/components/admin/useAdminAuth';
import { AdminToastProvider } from '@/components/admin/AdminToast';
import DateField from '@/components/date-field/DateField';
import UserChip from '@/components/user-chip/UserChip';
import shared from '@/components/admin/admin.module.css';
import { useT } from '@/i18n/LanguageProvider';
import { apiMessage } from '@/lib/apiMessage';
import { adminToken } from '@/lib/adminToken';
import { formatDate, formatDateTime, formatNumber, localInputToISO } from '@/lib/datetime';
import { plural } from '@/lib/plural';
import styles from './location-history.module.css';
import { markScrimDown, isScrimClick } from '@/lib/scrim';

const API = `${process.env.NEXT_PUBLIC_API_URL}/event/admin/location-history/`;
const LOOKUPS = `${process.env.NEXT_PUBLIC_API_URL}/event/admin/location-history/log/`;

const VISIBLE_TO = {
  off: ['together.vis.off', 'Nobody'],
  mutuals: ['together.vis.mutuals', 'Mutual follows'],
  event: ['together.vis.event', 'Everyone at the event'],
  approved: ['together.vis.approved', 'Mutual follows and people I approve'],
};

/** The start of a day in the reader's own zone, as an instant, `extra` days on. */
function dayStartISO(day, extra = 0) {
  if (!day) return '';
  const [y, m, d] = day.split('-').map(Number);
  const local = new Date(y, m - 1, d + extra);
  const pad = (n) => String(n).padStart(2, '0');
  return localInputToISO(`${local.getFullYear()}-${pad(local.getMonth() + 1)}-${pad(local.getDate())}T00:00`);
}

async function getJSON(url) {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${adminToken()}` } });
  return res.json().catch(() => ({}));
}

function DoorCell({ door }) {
  const tt = useT();
  if (door?.state === 'in') {
    return <span className={styles.doorIn}>
      {tt('locationHistory.doorIn', 'Checked in')}
      {door.at ? ` ${formatDateTime(door.at)}` : ''}
      {door.gate ? <span className={styles.muted}> {door.gate}</span> : null}
    </span>;
  }
  if (door?.state === 'ticket') return <span>{tt('locationHistory.doorTicket', 'Had a ticket, not checked in')}</span>;
  return <span className={styles.muted}>{tt('locationHistory.doorNone', 'No ticket')}</span>;
}

function AreaCell({ row }) {
  const tt = useT();
  return <span>
    {row.area || <span className={styles.muted}>{tt('locationHistory.cleared', 'Cleared')}</span>}
    {!row.latest && <span className={styles.muted}> {tt('locationHistory.changedLater', '(changed later)')}</span>}
  </span>;
}

function EventCell({ event }) {
  const tt = useT();
  return <span className={styles.stack}>
    <span>{event.name}</span>
    <span className={styles.muted}>
      {formatDate(event.date)}
      {event.deleted ? ` ${tt('locationHistory.eventDeleted', '(deleted)')}` : ''}
    </span>
  </span>;
}

function RecordsTable({ rows, onHistory, showPerson = true }) {
  const tt = useT();
  return <div className={shared.tableWrap}><table className={shared.table}>
    <thead><tr>
      {showPerson && <th>{tt('locationHistory.colPerson', 'Person')}</th>}
      <th>{tt('locationHistory.colEvent', 'Event')}</th>
      <th>{tt('locationHistory.colArea', 'Area')}</th>
      <th>{tt('locationHistory.colDoor', 'At the door')}</th>
      <th className={shared.hideMobile}>{tt('locationHistory.colVisible', 'Shown to')}</th>
      <th>{tt('locationHistory.colWhen', 'Set')}</th>
    </tr></thead>
    <tbody>{rows.map((r) => <tr key={r.id}>
      {showPerson && <td>
        <span className={styles.personCell}>
          <UserChip user={r.person} size={24} link={false} />
          <button type="button" className={styles.rowBtn} onClick={() => onHistory(r.person.username)}>
            {tt('locationHistory.historyBtn', 'Whole history')}
          </button>
        </span>
      </td>}
      <td><EventCell event={r.event} /></td>
      <td><AreaCell row={r} /></td>
      <td><DoorCell door={r.door} /></td>
      <td className={shared.hideMobile}>{tt(...(VISIBLE_TO[r.visibility] || VISIBLE_TO.off))}</td>
      <td>{formatDateTime(r.set_at)}</td>
    </tr>)}</tbody>
  </table></div>;
}

function Terms({ terms }) {
  const tt = useT();
  const parts = [];
  if (terms.person) parts.push(`${tt('locationHistory.termPerson', 'Person')}: ${terms.person}`);
  if (terms.event) parts.push(`${tt('locationHistory.termEvent', 'Event')}: ${terms.event}`);
  if (terms.area) parts.push(`${tt('locationHistory.termArea', 'Area')}: ${terms.area}`);
  if (terms.since) parts.push(`${tt('locationHistory.termFrom', 'From')} ${formatDate(terms.since)}`);
  if (terms.until) parts.push(`${tt('locationHistory.termTo', 'Before')} ${formatDate(terms.until)}`);
  if (terms.page) parts.push(tt('locationHistory.termPage', 'page {n}').replace('{n}', terms.page));
  return <span>{parts.join(', ') || '-'}</span>;
}

function LookedTab() {
  const tt = useT();
  const [state, setState] = useState({ rows: null, total: 0, page: 0, hasMore: false, everyone: false });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (page) => {
    setBusy(true);
    setError('');
    try {
      const body = await getJSON(`${LOOKUPS}?page=${page}`);
      if (body.status === 'success') {
        const d = body.data;
        setState((prev) => ({
          rows: page === 1 ? d.results : [...(prev.rows || []), ...d.results],
          total: d.total, page: d.page, hasMore: d.has_more, everyone: d.everyone,
        }));
      } else {
        setError(apiMessage(tt, body, 'locationHistory.logFailed', 'The list of lookups could not be loaded.'));
      }
    } catch {
      setError(tt('msg.connectionError', 'Connection error.'));
    } finally {
      setBusy(false);
    }
  }, [tt]);

  useEffect(() => { load(1); }, [load]);

  return <div className={shared.card}>
    <p className={styles.lead}>
      {state.everyone
        ? tt('locationHistory.logEveryone', 'Every search and every history opened, by everybody who holds this permission, newest first.')
        : tt('locationHistory.logOwn', 'Your own searches and histories opened, newest first. A super admin sees everybody’s.')}
    </p>
    {error && <p className={shared.errorText} role="alert">{error}</p>}
    {state.rows === null
      ? (busy && <p className={shared.stateText}>{tt('ui.loading.33ce', 'Loading…')}</p>)
      : state.rows.length === 0
        ? <p className={shared.stateText}>{tt('locationHistory.logNone', 'Nobody has looked yet.')}</p>
        : <>
          <p className={shared.resultsCount}>{plural(tt, state.total, 'locationHistory.lookupsOne', '{n} lookup',
            'locationHistory.lookupsMany', '{n} lookups')}</p>
          <div className={shared.tableWrap}><table className={shared.table}>
            <thead><tr>
              <th>{tt('locationHistory.colWho', 'Who')}</th>
              <th>{tt('locationHistory.colLookedAt', 'When')}</th>
              <th>{tt('locationHistory.colWhat', 'What')}</th>
              <th>{tt('locationHistory.colTerms', 'Looked for')}</th>
              <th>{tt('locationHistory.colReason', 'Reason')}</th>
              <th className={shared.hideMobile}>{tt('locationHistory.colFound', 'Found')}</th>
            </tr></thead>
            <tbody>{state.rows.map((r) => <tr key={r.id}>
              <td><UserChip user={r.admin} size={24} link={false} /></td>
              <td>{formatDateTime(r.at)}</td>
              <td>{r.kind === 'history'
                ? tt('locationHistory.kindHistory', 'Opened a history')
                : tt('locationHistory.kindSearch', 'Searched')}</td>
              <td><Terms terms={r.terms || {}} /></td>
              <td>{r.reason}</td>
              <td className={shared.hideMobile}>{formatNumber(r.results)}</td>
            </tr>)}</tbody>
          </table></div>
          {state.hasMore && <button type="button" className={styles.more} disabled={busy}
            onClick={() => load(state.page + 1)}>
            {busy ? tt('ui.loading.33ce', 'Loading…') : tt('locationHistory.showMore', 'Show more')}
          </button>}
        </>}
  </div>;
}

function LocationHistoryInner() {
  const tt = useT();
  const { admin, loading: authLoading, logout } = useAdminAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [tab, setTab] = useState('search');
  const [form, setForm] = useState({ person: '', event: '', area: '', from: '', to: '', reason: '' });
  const [query, setQuery] = useState(null);
  const [found, setFound] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [history, setHistory] = useState(null);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const reasonOk = form.reason.trim().length >= 5;
  const hasTerm = Boolean(form.person.trim() || form.event.trim() || form.area.trim());

  const run = async (params, page) => {
    setBusy(true);
    setError('');
    try {
      const body = await getJSON(`${API}?${new URLSearchParams({ ...params, page: String(page) })}`);
      if (body.status === 'success') {
        const d = body.data;
        setFound((prev) => ({
          rows: page === 1 ? d.results : [...(prev?.rows || []), ...d.results],
          people: page === 1 ? d.people : prev?.people,
          total: d.total, page: d.page, hasMore: d.has_more,
        }));
      } else {
        setError(apiMessage(tt, body, 'locationHistory.failed', 'That search could not be run.'));
      }
    } catch {
      setError(tt('msg.connectionError', 'Connection error.'));
    } finally {
      setBusy(false);
    }
  };

  const search = (e) => {
    e.preventDefault();
    const params = { reason: form.reason.trim() };
    if (form.person.trim()) params.person = form.person.trim().replace(/^@/, '');
    if (form.event.trim()) params.event = form.event.trim();
    if (form.area.trim()) params.area = form.area.trim();
    if (form.from) params.from = dayStartISO(form.from);
    if (form.to) params.to = dayStartISO(form.to, 1);
    setQuery(params);
    setHistory(null);
    run(params, 1);
  };

  const openHistory = async (username) => {
    const reason = (query?.reason || form.reason).trim();
    setHistory({ username, loading: true });
    try {
      const body = await getJSON(`${API}person/${encodeURIComponent(username)}/?${new URLSearchParams({ reason })}`);
      if (body.status === 'success') {
        setHistory({ username, ...body.data });
      } else {
        setHistory({ username, error: apiMessage(tt, body, 'locationHistory.historyFailed', 'That history could not be opened.') });
      }
    } catch {
      setHistory({ username, error: tt('msg.connectionError', 'Connection error.') });
    }
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'auto' });
  };

  if (authLoading) return null;
  return <div className={shared.pageContainer}>
    <div className={`${shared.sidebarOverlay} ${sidebarOpen ? shared.open : ''}`} onPointerDown={markScrimDown} data-scrim="" onClick={(e) => isScrimClick(e) && (setSidebarOpen(false))} />
    <AdminNav admin={admin} onLogout={logout} sidebarOpen={sidebarOpen} badges={{}} />
    <div className={shared.mainContainer}>
      <AdminHeader admin={admin} onLogout={logout} onMenuOpen={() => setSidebarOpen(true)} />
      <main className={shared.contentArea}>
        <div className={shared.pageHeader}>
          <div>
            <h1 className={shared.pageTitle}>{tt('locationHistory.title', 'Location history')}</h1>
            <p className={shared.pageSubtitle}>
              {tt('locationHistory.leadFlexible', 'The areas people said they were leaving from for an event, kept with no time limit. Every search and every history you open is recorded in the audit log with your reason.')}
            </p>
          </div>
        </div>

        {/* Filled chips with aria-pressed. Never an underline, never a ring. */}
        <div className={styles.tabs} role="group" aria-label={tt('locationHistory.title', 'Location history')}>
          {[['search', tt('locationHistory.tabSearch', 'Search')], ['looked', tt('locationHistory.tabLooked', 'Who has looked')]]
            .map(([key, label]) => <button key={key} type="button" aria-pressed={tab === key}
              className={`${styles.tab} ${tab === key ? styles.tabOn : ''}`} onClick={() => setTab(key)}>
              {label}
            </button>)}
        </div>

        {tab === 'looked' ? <LookedTab /> : <>
          <form className={`${shared.card} ${styles.form} ${styles.block}`} onSubmit={search}>
            <label className={styles.field}>
              <span>{tt('locationHistory.personFlexible', 'Person (name, username or email)')}</span>
              <input className={styles.input} value={form.person} onChange={set('person')} autoComplete="off" />
            </label>
            <label className={styles.field}>
              <span>{tt('locationHistory.eventFlexible', 'Event (its name or address)')}</span>
              <input className={styles.input} value={form.event} onChange={set('event')} autoComplete="off" />
            </label>
            <label className={styles.field}>
              <span>{tt('locationHistory.area', 'Area (any of its words)')}</span>
              <input className={styles.input} value={form.area} onChange={set('area')} autoComplete="off" />
            </label>
            <div className={styles.field}>
              <span id="lh-from">{tt('locationHistory.from', 'Set on or after')}</span>
              <DateField value={form.from} onChange={set('from')} ariaLabel={tt('locationHistory.from', 'Set on or after')}
                className={styles.input} />
            </div>
            <div className={styles.field}>
              <span id="lh-to">{tt('locationHistory.to', 'Set on or before')}</span>
              <DateField value={form.to} onChange={set('to')} ariaLabel={tt('locationHistory.to', 'Set on or before')}
                className={styles.input} />
            </div>
            <label className={`${styles.field} ${styles.wide}`}>
              <span>{tt('locationHistory.reason', 'Why you are looking (required, for example a report number)')}</span>
              <input className={styles.input} value={form.reason} onChange={set('reason')} required minLength={5} />
            </label>
            <div className={`${styles.wide} ${styles.submitRow}`}>
              <button type="submit" className={styles.submit}
                disabled={busy || !reasonOk || !hasTerm}>
                {busy && !found ? tt('ui.loading.33ce', 'Loading…') : tt('locationHistory.search', 'Search')}
              </button>
              <span className={styles.muted}>
                {!hasTerm
                  ? tt('locationHistory.needTerm', 'Fill a person, an event or an area. The days only narrow it.')
                  : !reasonOk ? tt('locationHistory.needReason', 'Say why you are looking before you search.') : ''}
              </span>
            </div>
          </form>

          {error && <p className={shared.errorText} role="alert">{error}</p>}

          {history && <section className={`${shared.card} ${styles.block}`} aria-live="polite">
            <div className={styles.panelHead}>
              <h2 className={styles.panelTitle}>
                {tt('locationHistory.historyOf', 'Whole history of @{name}').replace('{name}', history.username)}
              </h2>
              <button type="button" className={styles.rowBtn} onClick={() => setHistory(null)}>
                {tt('locationHistory.close', 'Close')}
              </button>
            </div>
            {history.loading && <p className={shared.stateText}>{tt('ui.loading.33ce', 'Loading…')}</p>}
            {history.error && <p className={shared.errorText} role="alert">{history.error}</p>}
            {history.results && <>
              <p className={styles.note}>
                {plural(tt, history.events, 'locationHistory.eventsOne', '{n} event', 'locationHistory.eventsMany', '{n} events')}
                {', '}
                {plural(tt, history.total, 'locationHistory.resultsOne', '{n} record', 'locationHistory.resultsMany', '{n} records')}
                {'. '}
                {tt('locationHistory.historyLogged', 'Opening this history was written to the audit log with your reason.')}
              </p>
              {history.results.length === 0
                ? <p className={shared.stateText}>{tt('locationHistory.historyNone', 'This person never set an area.')}</p>
                : <RecordsTable rows={history.results} onHistory={openHistory} showPerson={false} />}
            </>}
          </section>}

          {busy && !found && <p className={shared.stateText}>{tt('locationHistory.searching', 'Searching…')}</p>}

          {found && <div className={`${shared.card} ${styles.block}`}>
            {found.people && found.people.length > 0 && <div className={styles.people}>
              <p className={styles.peopleLabel}>
                {plural(tt, found.people.length, 'locationHistory.peopleOne', '{n} person matched',
                  'locationHistory.peopleMany', '{n} people matched')}
              </p>
              <div className={styles.peopleRow}>
                {found.people.map((p) => <button key={p.person.username} type="button" className={styles.personPick}
                  onClick={() => openHistory(p.person.username)}>
                  <UserChip user={p.person} size={22} link={false} />
                  <span className={styles.muted}>{plural(tt, p.records, 'locationHistory.resultsOne', '{n} record',
                    'locationHistory.resultsMany', '{n} records')}</span>
                </button>)}
              </div>
            </div>}
            <p className={shared.resultsCount}>{plural(tt, found.total, 'locationHistory.resultsOne', '{n} record',
              'locationHistory.resultsMany', '{n} records')}</p>
            {found.rows.length === 0
              ? <p className={shared.stateText}>{tt('locationHistory.none', 'Nothing was recorded for that search.')}</p>
              : <RecordsTable rows={found.rows} onHistory={openHistory} />}
            {found.hasMore && <button type="button" className={styles.more} disabled={busy}
              onClick={() => run(query, found.page + 1)}>
              {busy ? tt('ui.loading.33ce', 'Loading…') : tt('locationHistory.showMore', 'Show more')}
            </button>}
          </div>}
        </>}
      </main>
    </div>
  </div>;
}

export default function LocationHistoryPage() {
  return <AdminToastProvider><LocationHistoryInner /></AdminToastProvider>;
}
