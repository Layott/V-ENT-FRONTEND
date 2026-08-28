'use client';

// The programme, read from what the organiser actually published.
//
// This replaces a function that invented a two-day schedule from the event's
// start date, so every event on the platform showed the same "Doors open +
// Vendor zone activation" and "Cosplay parade". An empty tab says nothing has
// been published; an invented one says the organiser published THIS, and
// somebody turns up at 8pm for a DJ set that was never going to happen.
//
// Renders nothing at all when there is no programme, so the tab it sits in can
// hide itself rather than showing an empty box.

import { useCallback, useEffect, useState } from 'react';
import { LuClock, LuMapPin, LuUsers } from 'react-icons/lu';
import { appLocale } from '@/lib/appLocale';
import { useT } from '@/i18n/LanguageProvider';
import styles from './event-schedule.module.css';

const API = process.env.NEXT_PUBLIC_API_URL;

const time = value => (value
  ? new Date(value).toLocaleTimeString(appLocale(),
    { hour: '2-digit', minute: '2-digit' })
  : '');

const dayDate = value => (value
  ? new Date(`${value}T12:00:00`).toLocaleDateString(appLocale(),
    { weekday: 'long', day: 'numeric', month: 'long' })
  : '');

export default function EventSchedule({ eventRef }) {
  const tt = useT();
  const [days, setDays] = useState(null);

  const load = useCallback(async () => {
    if (!eventRef) return;
    try {
      const res = await fetch(`${API}/event/${eventRef}/sessions/`);
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.status === 'success') {
        setDays(body.data.days || []);
        return;
      }
      setDays([]);
    } catch {
      setDays([]);
    }
  }, [eventRef]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  if (days === null) {
    return <p className={styles.state}>{tt('ui.loading.33ce', 'Loading…')}</p>;
  }
  if (days.length === 0) return null;

  return (
    <div className={styles.wrap}>
      {days.map(day => (
        <section key={day.date} className={styles.day}>
          <div className={styles.dayHead}>
            <h3 className={styles.dayTitle}>{day.label}</h3>
            <span className={styles.dayDate}>{dayDate(day.date)}</span>
          </div>

          <ol className={styles.list}>
            {day.sessions.map(session => (
              <li key={session.id} className={styles.row}>
                <span className={styles.when}>
                  <LuClock aria-hidden="true" />
                  {time(session.starts_at)}
                  {session.ends_at && ` - ${time(session.ends_at)}`}
                </span>

                <div className={styles.body}>
                  <p className={styles.name}>{session.title}</p>
                  {session.description && (
                    <p className={styles.blurb}>{session.description}</p>
                  )}
                  <div className={styles.meta}>
                    {session.stage && <span><LuMapPin aria-hidden="true" /> {session.stage}</span>}
                    {session.capacity && <span>
                      <LuUsers aria-hidden="true" />
                      {tt('schedule.holds', 'room for {n}').replace('{n}', session.capacity)}
                    </span>}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}
