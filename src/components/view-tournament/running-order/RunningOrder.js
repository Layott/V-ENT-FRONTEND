'use client';

// The organiser deciding which fixtures happen on which day, and in what order.
//
// CEO, of the Rivalry Series schedule: "Given, not generated. Layo set it. Do
// not reorder it to optimise something without asking."
//
// So this generates nothing. It shows the fixtures that still need a slot, lets
// the organiser put each one on a day and move it up or down within that day,
// and saves exactly what they built. There is no "auto-schedule" button on
// purpose: the order carries decisions about broadcast, rest between a player's
// two matches, and which fixture opens the day, and none of those are things a
// solver knows.
//
// Reading is public and lives elsewhere; this is the editing surface.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { LuChevronDown, LuChevronUp } from 'react-icons/lu';
import { appLocale } from '@/lib/appLocale';
import { apiMessage } from '@/lib/apiMessage';
import { useT } from '@/i18n/LanguageProvider';
import styles from './running-order.module.css';

const API = process.env.NEXT_PUBLIC_API_URL;

const dayLabel = iso => {
  if (!iso) return '';
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(appLocale(), {
    weekday: 'short', day: 'numeric', month: 'short',
  });
};

const nameOf = side => side?.name || null;

export default function RunningOrder({ tournamentId, token }) {
  const tt = useT();
  const [days, setDays] = useState([]);
  const [unscheduled, setUnscheduled] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [newDay, setNewDay] = useState('');

  const load = useCallback(async () => {
    if (!tournamentId) { setLoading(false); return; }
    try {
      const res = await fetch(`${API}/tournament/${tournamentId}/running-order/`);
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.status === 'success') {
        setDays(body.data.days || []);
        setUnscheduled(body.data.unscheduled || []);
      } else {
        setError(apiMessage(tt, body, 'api.failed', 'Failed.'));
      }
    } catch {
      setError(tt('api.NETWORK_UNREACHABLE',
        'Could not reach the server. Check the connection and try again.'));
    } finally {
      // Cleared whatever happened; a guard that returns early without this is
      // how a panel spins for ever.
      setLoading(false);
    }
  }, [tournamentId, tt]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = setTimeout(() => setNotice(''), 2500);
    return () => clearTimeout(timer);
  }, [notice]);

  // Everything, flattened, in the shape the endpoint wants. Sent whole rather
  // than one fixture at a time: moving one changes the position of everything
  // after it, and a per-fixture save would leave the order inconsistent
  // between calls.
  const save = useCallback(async (nextDays, nextUnscheduled) => {
    setBusy(true);
    setError('');
    const fixtures = [
      ...nextDays.flatMap(day => day.fixtures.map((f, index) => ({
        match_id: f.match_id, day: day.day, running_order: index + 1,
      }))),
      ...nextUnscheduled.map(f => ({ match_id: f.match_id, day: '', running_order: 0 })),
    ];
    try {
      const res = await fetch(`${API}/tournament/${tournamentId}/running-order/set/`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ fixtures }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.status === 'success') {
        setDays(body.data.days || []);
        setUnscheduled(body.data.unscheduled || []);
        setNotice(tt('order.saved', 'Running order saved.'));
      } else {
        setError(apiMessage(tt, body, 'api.failed', 'Failed.'));
        // Reloaded rather than left showing what did not save. A schedule on
        // screen that is not the schedule stored is worse than an error.
        load();
      }
    } catch {
      setError(tt('api.NETWORK_UNREACHABLE',
        'Could not reach the server. Check the connection and try again.'));
      load();
    } finally {
      setBusy(false);
    }
  }, [tournamentId, token, tt, load]);

  const addDay = () => {
    if (!newDay) return;
    if (days.some(d => d.day === newDay)) return;
    setDays(prev => [...prev, { day: newDay, fixtures: [] }]
      .sort((a, b) => a.day.localeCompare(b.day)));
    setNewDay('');
  };

  const assign = (fixture, day) => {
    const nextUnscheduled = unscheduled.filter(f => f.match_id !== fixture.match_id);
    const nextDays = days.map(d => (d.day === day
      ? { ...d, fixtures: [...d.fixtures, fixture] }
      : { ...d, fixtures: d.fixtures.filter(f => f.match_id !== fixture.match_id) }));
    setDays(nextDays);
    setUnscheduled(nextUnscheduled);
    save(nextDays, nextUnscheduled);
  };

  const unassign = fixture => {
    const nextDays = days.map(d => ({
      ...d, fixtures: d.fixtures.filter(f => f.match_id !== fixture.match_id),
    }));
    const nextUnscheduled = [...unscheduled, fixture];
    setDays(nextDays);
    setUnscheduled(nextUnscheduled);
    save(nextDays, nextUnscheduled);
  };

  const move = (dayIso, index, by) => {
    const nextDays = days.map(d => {
      if (d.day !== dayIso) return d;
      const list = [...d.fixtures];
      const to = index + by;
      if (to < 0 || to >= list.length) return d;
      [list[index], list[to]] = [list[to], list[index]];
      return { ...d, fixtures: list };
    });
    setDays(nextDays);
    save(nextDays, unscheduled);
  };

  const total = useMemo(
    () => days.reduce((n, d) => n + d.fixtures.length, 0) + unscheduled.length,
    [days, unscheduled]);

  if (loading) return <p className={styles.state}>{tt('ui.loading', 'Loading…')}</p>;

  if (total === 0) {
    return <p className={styles.state}>
      {tt('order.none', 'No fixtures yet. Generate them first, then set the running order.')}
    </p>;
  }

  const row = (fixture, dayIso, index, count) => (
    <li key={fixture.match_id} className={styles.fixture}>
      <span className={styles.pos}>{dayIso ? index + 1 : '-'}</span>
      <span className={styles.names}>
        {nameOf(fixture.participant_1) || tt('bracket.tbd', 'To be decided')}
        <span className={styles.v}>v</span>
        {nameOf(fixture.participant_2) || tt('bracket.tbd', 'To be decided')}
      </span>
      <span className={styles.actions}>
        {dayIso && <>
          <button type="button" className={styles.iconBtn} disabled={busy || index === 0}
                  onClick={() => move(dayIso, index, -1)}
                  aria-label={tt('league.moveUp', 'Move up')}>
            <LuChevronUp aria-hidden="true" />
          </button>
          <button type="button" className={styles.iconBtn}
                  disabled={busy || index === count - 1}
                  onClick={() => move(dayIso, index, 1)}
                  aria-label={tt('league.moveDown', 'Move down')}>
            <LuChevronDown aria-hidden="true" />
          </button>
          <button type="button" className={styles.ghost} disabled={busy}
                  onClick={() => unassign(fixture)}>
            {tt('order.remove', 'Off the schedule')}
          </button>
        </>}
        {!dayIso && days.length > 0 && (
          <select className={styles.assign} value="" disabled={busy}
                  onChange={e => e.target.value && assign(fixture, e.target.value)}>
            <option value="">{tt('order.putOn', 'Put on a day')}</option>
            {days.map(d => (
              <option key={d.day} value={d.day}>{dayLabel(d.day)}</option>
            ))}
          </select>
        )}
      </span>
    </li>
  );

  return (
    <section className={styles.wrap}>
      <div>
        <h3 className={styles.title}>{tt('order.title', 'Running order')}</h3>
        <p className={styles.hint}>
          {tt('order.hint', 'Yours to set. Nothing here reorders itself: the order carries decisions about broadcast and rest between a player’s matches, and no solver knows those.')}
        </p>
      </div>

      <div className={styles.addDay}>
        <input className={styles.input} type="date" value={newDay}
               onChange={e => setNewDay(e.target.value)} />
        <button type="button" className={styles.primary} disabled={busy || !newDay}
                onClick={addDay}>
          {tt('order.addDay', 'Add a day')}
        </button>
      </div>

      {days.map(day => (
        <div key={day.day} className={styles.day}>
          <p className={styles.dayName}>{dayLabel(day.day)}</p>
          {day.fixtures.length === 0
            ? <p className={styles.emptyDay}>
                {tt('order.emptyDay', 'Nothing on this day yet.')}
              </p>
            : <ol className={styles.list}>
                {day.fixtures.map((f, i) => row(f, day.day, i, day.fixtures.length))}
              </ol>}
        </div>
      ))}

      {unscheduled.length > 0 && (
        <div className={styles.day}>
          <p className={styles.dayName}>
            {tt('order.unscheduled', 'Still needs a slot')}
            <span className={styles.count}>{unscheduled.length}</span>
          </p>
          {days.length === 0 && <p className={styles.emptyDay}>
            {tt('order.addDayFirst', 'Add a day above, then put fixtures on it.')}
          </p>}
          <ol className={styles.list}>
            {unscheduled.map(f => row(f, null, 0, 0))}
          </ol>
        </div>
      )}

      {error && <p className={styles.error}>{error}</p>}
      {notice && <p className={styles.notice}>{notice}</p>}
    </section>
  );
}
