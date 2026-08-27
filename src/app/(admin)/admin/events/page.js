'use client';

// The console can see events at all.
//
// Tournaments had a console page; events, which are the thing actually selling
// tickets, had none - so nobody could see from the console what events existed,
// how many tickets each had sold, or correct one that went out wrong.
//
// Built on the same shape as the tournaments page on purpose: same filters,
// same pagination, same table, same edit modal. An admin who has learned one
// has learned the other, and a change to how listing works is one change.

import { apiMessage } from '@/lib/apiMessage';
import { useState, useEffect, useCallback } from 'react';
import AdminNav from '@/components/admin/AdminNav';
import AdminHeader from '@/components/admin/AdminHeader';
import { useAdminAuth } from '@/components/admin/useAdminAuth';
import { AdminToastProvider, useAdminToast } from '@/components/admin/AdminToast';
import shared from '@/components/admin/admin.module.css';
import styles from './events.module.css';
import { useT } from '@/i18n/LanguageProvider';
const PAGE_SIZE = 20;
function statusBadgeClass(s) {
  if (s === 'upcoming') return shared.sActive;
  if (s === 'ongoing') return shared.sOngoing;
  if (s === 'cancelled') return shared.sCancelled;
  if (s === 'completed') return shared.sApproved;
  return shared.sDraft;
}
// The API's status values are its own vocabulary, not something to print. Same
// reason as the partners page: printing them puts English in a French table and
// couples the screen to a server-side string.
const statusLabel = (tt, value) => {
  const labels = {
    upcoming: tt('admin.eventUpcoming', 'Upcoming'),
    ongoing: tt('ui.ongoing.2e02', 'Ongoing'),
    completed: tt('ui.completed.1798', 'Completed'),
    cancelled: tt('ui.cancelled.a1bf', 'Cancelled')
  };
  return labels[String(value || '').toLowerCase()] || value || '-';
};
function EventsInner() {
  const tt = useT();
  const {
    admin,
    loading: authLoading,
    logout
  } = useAdminAuth();
  const toast = useAdminToast();

  // The same permission the server checks in edit_event, so the control is
  // never offered to an admin the API would refuse.
  const mayEdit = !!admin?.permissions?.manage_events;
  const [events, setEvents] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState('-created_at');
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [actionLoading, setActionLoading] = useState({});
  const fetchEvents = useCallback(async () => {
    const token = localStorage.getItem('adminToken');
    setDataLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        page,
        page_size: PAGE_SIZE,
        ordering: sortBy
      });
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/admin/events/?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.status === 'success') {
        setEvents(data.data?.results || []);
        setTotal(data.data?.count ?? (data.data?.results || []).length);
      } else {
        setError(apiMessage(tt, data, "api.failedToLoadEvents", "Failed to load events."));
      }
    } catch {
      setError(tt("msg.connectionError", "Connection error."));
    } finally {
      setDataLoading(false);
    }
  }, [page, search, statusFilter, sortBy]);
  useEffect(() => {
    if (!authLoading && admin) fetchEvents();
  }, [authLoading, admin, fetchEvents]);
  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, sortBy]);
  async function saveEvent(id, payload) {
    const token = localStorage.getItem('adminToken');
    setActionLoading(p => ({
      ...p,
      [id]: true
    }));
    try {
      // The organiser's own endpoint. An admin who is not the owner is let
      // through by the server's permission check, and the edit is written to
      // the audit log so the organiser can find out who changed their event.
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/event/edit-event/${id}/`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.status === 'success') {
        toast.push(tt("admin.eventSaved", "Event updated."), 'success');
        setEditTarget(null);
        fetchEvents();
      } else toast.push(apiMessage(tt, data, "api.failed", "Failed."), 'error');
    } catch {
      toast.push(tt("msg.connectionError", "Connection error."), 'error');
    }
    setActionLoading(p => ({
      ...p,
      [id]: false
    }));
  }
  const totalPages = Math.ceil(total / PAGE_SIZE) || 1;
  if (authLoading) return null;
  return <div className={shared.pageContainer}>
      <div className={`${shared.sidebarOverlay} ${sidebarOpen ? shared.open : ''}`} onClick={() => setSidebarOpen(false)} />
      <AdminNav admin={admin} onLogout={logout} sidebarOpen={sidebarOpen} badges={{}} />
      <div className={shared.mainContainer}>
        <AdminHeader admin={admin} onLogout={logout} onMenuOpen={() => setSidebarOpen(true)} searchValue={search} onSearch={setSearch} />
        <main className={shared.contentArea}>
          <div className={shared.pageHeader}>
            <div>
              <h1 className={shared.pageTitle}>{tt("admin.eventsTitle", "Events")}</h1>
              <p className={shared.pageSubtitle}>{tt("admin.eventsSubtitle", "Every event on the platform, and what it has sold.")}</p>
            </div>
          </div>

          {error && <p className={shared.errorText}>{error}</p>}

          <div className={shared.card}>
            <div className={shared.filtersRow}>
              <select className={shared.filterSelect} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                <option value="">{tt("ui.all.statuses.9cb2", "All Statuses")}</option>
                <option value="upcoming">{tt("admin.eventUpcoming", "Upcoming")}</option>
                <option value="ongoing">{tt("ui.ongoing.2e02", "Ongoing")}</option>
                <option value="completed">{tt("ui.completed.1798", "Completed")}</option>
                <option value="cancelled">{tt("ui.cancelled.a1bf", "Cancelled")}</option>
              </select>
              <select className={shared.filterSelect} value={sortBy} onChange={e => setSortBy(e.target.value)}>
                <option value="-created_at">{tt("ui.newest.first.a40b", "Newest First")}</option>
                <option value="created_at">{tt("ui.oldest.first.06dc", "Oldest First")}</option>
                <option value="name">{tt("ui.name.z.257c", "Name A-Z")}</option>
                <option value="-tickets_sold">{tt("admin.ticketsHighLow", "Tickets (High-Low)")}</option>
              </select>
              <span className={shared.resultsCount}>{(total === 1 ? tt('admin.countEventsOne', '{n} event') : tt('admin.countEventsMany', '{n} events')).replace('{n}', total.toLocaleString())}</span>
            </div>

            {dataLoading ? <p className={shared.stateText}>{tt("ui.loading.33ce", "Loading…")}</p> : events.length === 0 ? <p className={shared.stateText}>{tt("admin.noEventsFound", "No events found.")}</p> : <div className={shared.tableWrap}>
                <table className={shared.table}>
                  <thead>
                    <tr>
                      <th>{tt("admin.eventColumn", "Event")}</th>
                      <th className={shared.hideMobile}>{tt("ui.organizer.debd", "Organizer")}</th>
                      <th>{tt("ui.status.bae7", "Status")}</th>
                      <th className={shared.hideMobile}>{tt("admin.ticketsSold", "Tickets sold")}</th>
                      <th className={shared.hideMobile}>{tt("admin.eventWhere", "Where")}</th>
                      <th className={shared.hideMobile}>{tt("admin.eventStarts", "Starts")}</th>
                      <th>{tt("ui.actions.5b5d", "Actions")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {events.map(e => <tr key={e.id}>
                        <td>
                          <div className={styles.eName}>{e.name}</div>
                          <div className={styles.eMeta}>{e.category || e.game || '-'}</div>
                        </td>
                        <td className={shared.hideMobile}>{e.organizer_username || '-'}</td>
                        <td><span className={statusBadgeClass(e.status)}>{statusLabel(tt, e.status)}</span></td>
                        <td className={shared.hideMobile}>
                          {e.capacity ? `${e.tickets_sold} / ${e.capacity}` : e.tickets_sold}
                        </td>
                        <td className={shared.hideMobile}>{e.location || (e.event_type === 'virtual' ? tt("admin.eventOnline", "Online") : '-')}</td>
                        <td className={shared.hideMobile}>
                          {e.start_date ? new Date(e.start_date).toLocaleDateString() : '-'}
                        </td>
                        <td>
                          <div className={shared.actGroup}>
                            {mayEdit && <button className={`${shared.actBtn} ${shared.actView}`} onClick={() => setEditTarget(e)} disabled={!!actionLoading[e.id]} title={tt("admin.editEventAsAdmin", "Edit this event as an admin. The organiser is told it changed.")}>
                              {tt("admin.editTournament", "Edit")}
                            </button>}
                          </div>
                        </td>
                      </tr>)}
                  </tbody>
                </table>
              </div>}

            {totalPages > 1 && <div className={shared.pagination}>
                <button className={shared.pageBtn} onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>‹</button>
                {Array.from({
              length: totalPages
            }, (_, i) => i + 1).filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1).map(p => {
              return <button key={p} className={`${shared.pageBtn} ${p === page ? shared.pageBtnActive : ''}`} onClick={() => setPage(p)}>{p}</button>;
            })}
                <button className={shared.pageBtn} onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>›</button>
              </div>}
          </div>
        </main>
      </div>

      {editTarget && <EditEventModal event={editTarget} onCancel={() => setEditTarget(null)} onSubmit={payload => saveEvent(editTarget.id, payload)} loading={!!actionLoading[editTarget.id]} />}
    </div>;
}

/** Correct somebody else's event from the console.
 *
 *  Loads the record first and shows what is actually stored, rather than an
 *  empty form: an admin correcting a venue needs to see the wrong one. If the
 *  load fails the fields stay closed, because a blank form saved over a real
 *  event erases it.
 */
function EditEventModal({
  event,
  onCancel,
  onSubmit,
  loading
}) {
  const tt = useT();
  const [form, setForm] = useState(null);
  // What the server gave us, kept so submit can send the difference.
  const [loaded, setLoaded] = useState(null);
  const [loadError, setLoadError] = useState(false);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const token = localStorage.getItem('adminToken');
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/event/view-event/${event.slug || event.id}/`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        const data = await res.json();
        if (cancelled) return;
        if (data.status !== 'success' || !data.data) {
          setLoadError(true);
          return;
        }
        const e = data.data.event || data.data;
        const at = v => v ? String(v).slice(0, 16) : '';
        const initial = {
          name: e.name || '',
          desc: e.desc || e.description || '',
          location: e.location || '',
          event_link: e.event_link || '',
          capacity: e.capacity != null ? String(e.capacity) : '',
          start_date: at(e.start_date),
          end_date: at(e.end_date)
        };
        setForm(initial);
        setLoaded(initial);
      } catch {
        if (!cancelled) setLoadError(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [event.id, event.slug]);
  const set = (k, v) => setForm(f => ({
    ...f,
    [k]: v
  }));
  const submit = () => {
    // Only what actually differs from what was loaded. Sending every non-empty
    // field saved the right values, but the audit entry then listed four fields
    // for a one-word correction, and an audit log that overstates what an admin
    // touched cannot answer the question it exists for.
    const payload = {};
    Object.keys(form || {}).forEach(k => {
      const now = form[k];
      if (now === '' || now == null) return;
      if (loaded && now === loaded[k]) return;
      payload[k] = now;
    });
    onSubmit(payload);
  };
  return <div className={styles.modalOverlay} onClick={onCancel}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <p className={styles.modalTitle}>{tt("admin.editEventTitle", "Edit event")}</p>
        <p className={styles.modalSub}>
          {tt("admin.editEventSub", "Organised by {name}. The change is recorded in the audit log.").replace('{name}', event.organizer_username || '')}
        </p>

        {loadError ? <p className={styles.modalSub}>
            {tt("admin.editEventLoadFailed", "This event could not be loaded, so the form was left closed rather than risk saving over it.")}
          </p> : !form ? <p className={styles.modalSub}>{tt("ui.loading", "Loading…")}</p> : <>
            <div className={styles.formRow}>
              <label className={styles.formLabel}>{tt("admin.fieldTitle", "Title")}</label>
              <input className={styles.formInput} value={form.name} onChange={e => set('name', e.target.value)} />
            </div>
            <div className={styles.formRow}>
              <label className={styles.formLabel}>{tt("admin.fieldDescription", "Description")}</label>
              <input className={styles.formInput} value={form.desc} onChange={e => set('desc', e.target.value)} />
            </div>
            <div className={styles.formRow}>
              <label className={styles.formLabel}>{tt("admin.fieldLocation", "Location")}</label>
              <input className={styles.formInput} value={form.location} onChange={e => set('location', e.target.value)} />
            </div>
            <div className={styles.formRow}>
              <label className={styles.formLabel}>{tt("admin.eventLink", "Online link")}</label>
              <input className={styles.formInput} value={form.event_link} onChange={e => set('event_link', e.target.value)} />
            </div>
            <div className={styles.formRow}>
              <label className={styles.formLabel}>{tt("admin.eventCapacity", "Capacity")}</label>
              <input className={styles.formInput} inputMode="numeric" value={form.capacity} onChange={e => set('capacity', e.target.value)} />
            </div>
            <div className={styles.formRow2}>
              <div>
                <label className={styles.formLabel}>{tt("admin.fieldStart", "Starts")}</label>
                <input type="datetime-local" className={styles.formInput} value={form.start_date} onChange={e => set('start_date', e.target.value)} />
              </div>
              <div>
                <label className={styles.formLabel}>{tt("admin.fieldEnd", "Ends")}</label>
                <input type="datetime-local" className={styles.formInput} value={form.end_date} onChange={e => set('end_date', e.target.value)} />
              </div>
            </div>
          </>}

        <div className={styles.modalBtns}>
          <button className={`${shared.actBtn}`} onClick={onCancel}>{tt("ui.cancel.77df", "Cancel")}</button>
          <button className={`${shared.actBtn} ${shared.actView}`} onClick={submit} disabled={loading || !form || loadError}>
            {loading ? tt("ui.saving", "Saving…") : tt("ui.save", "Save")}
          </button>
        </div>
      </div>
    </div>;
}
export default function AdminEventsPage() {
  return <AdminToastProvider>
      <EventsInner />
    </AdminToastProvider>;
}
