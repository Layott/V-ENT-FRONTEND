'use client';

// The run of show, as somebody reads it.
//
// CEO, 4 September 2026, the morning of the Rivalry Series Season 2 production:
// "i want to be able to create something that will appear with really good ui
// for mobile, that will show the necessary info to someone looking at it on
// the website."
//
// Who actually reads this, and where: a caster on a phone in a green room, a
// floor manager between segments, a viewer following along at home. All of them
// are asking the same two questions and neither of them is "show me the whole
// spreadsheet":
//
//   what is on RIGHT NOW, and what comes next
//   when is MY next cue
//
// So the top of the screen answers the first without anybody touching anything,
// and the role chips answer the second in one press. The full running order is
// underneath, which is where it belongs: it is the reference, not the headline.
//
// One component for all three addresses it has - the event page, the tournament
// page and the share link - because three copies of a screen is how one of them
// ends up a version behind.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useT } from '@/i18n/LanguageProvider';
import { apiMessage } from '@/lib/apiMessage';
import styles from './run-of-show.module.css';

const API = process.env.NEXT_PUBLIC_API_URL;

/** Minutes past midnight, from "13:39". */
export const toMinutes = (hhmm) => {
  if (!hhmm || typeof hhmm !== 'string') return null;
  const [h, m] = hhmm.split(':');
  const hours = Number(h);
  const mins = Number(m);
  if (!Number.isFinite(hours) || !Number.isFinite(mins)) return null;
  return (hours * 60) + mins;
};

/**
 * The wall clock in the venue, not in the reader's own country.
 *
 * A run sheet says 13:39 because that is what the clock on the wall will say.
 * Converting it to the reader's zone tells a caster watching from London the
 * wrong time to be on air, so the times stay as written and NOW is worked out
 * against the zone the sheet was written on.
 */
export const nowInZone = (zone) => {
  const build = (options) => new Intl.DateTimeFormat('en-CA', options)
    .formatToParts(new Date());
  let parts;
  try {
    parts = build({
      timeZone: zone || 'Africa/Lagos',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    });
  } catch {
    // An unknown zone name would otherwise throw and take the page with it.
    parts = build({
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    });
  }
  const at = (type) => parts.find((p) => p.type === type)?.value || '';
  return {
    date: `${at('year')}-${at('month')}-${at('day')}`,
    minutes: (Number(at('hour')) * 60) + Number(at('minute')),
  };
};

/**
 * "Casters / GFX" is two roles, and somebody filtering to GFX means that row
 * too. Splitting on the separators a person actually types is the difference
 * between a filter that works and one that looks like it does.
 */
export const rolesOf = (owner) => String(owner || '')
  .split(/[/,+&]|\band\b/i)
  .map((part) => part.trim())
  .filter(Boolean);

/**
 * The key two spellings of one desk share.
 *
 * The Rivalry Series sheet writes Host and Hosts, Caster and Casters, in the
 * same column on the same day. Offering both as separate filters splits a
 * desk's own cues between two chips, which is worse than either spelling.
 * Lowercase, and drop a trailing s.
 */
export const roleKey = (name) => String(name || '').trim().toLowerCase()
  .replace(/s$/, '');

const duration = (tt, minutes) => {
  if (minutes === null || minutes === undefined) return '';
  const whole = Math.round(Number(minutes));
  if (!Number.isFinite(whole) || whole <= 0) return '';
  if (whole < 60) return tt('ros.minsShort', '{n} min').replace('{n}', whole);
  const hours = Math.floor(whole / 60);
  const rest = whole % 60;
  return rest
    ? tt('ros.hoursMins', '{h}h {m}m').replace('{h}', hours).replace('{m}', rest)
    : tt('ros.hours', '{h}h').replace('{h}', hours);
};

/** Where each cue stands against the clock, for one day. */
const statusOf = (item, clock, dayIsToday) => {
  if (!dayIsToday) return 'other';
  const from = toMinutes(item.starts_at);
  if (from === null) return 'other';
  const to = toMinutes(item.ends_at);
  const until = to === null || to < from ? from + 1 : to;
  if (clock >= from && clock < until) return 'now';
  return clock >= until ? 'done' : 'ahead';
};

// ---------------------------------------------------------------------------

const OnNow = ({ current, next, clock, tt }) => {
  if (!current && !next) return null;

  const from = current ? toMinutes(current.starts_at) : null;
  const to = current ? toMinutes(current.ends_at) : null;
  const span = from !== null && to !== null && to > from ? to - from : null;
  const left = span !== null ? Math.max(0, (from + span) - clock) : null;
  const through = span !== null
    ? Math.min(100, Math.max(0, ((clock - from) / span) * 100))
    : null;

  return (
    <section className={styles.live} aria-live="polite">
      {current ? (
        <>
          <div className={styles.liveTop}>
            <span className={styles.liveMark}>
              <span className={styles.dot} aria-hidden="true" />
              {tt('ros.onNow', 'On now')}
            </span>
            <span className={styles.liveClock}>
              {current.starts_at}
              {current.ends_at ? ` to ${current.ends_at}` : ''}
            </span>
          </div>

          <h2 className={styles.liveTitle}>{current.activity}</h2>

          <div className={styles.liveMeta}>
            {current.owner ? (
              <span className={styles.liveOwner}>{current.owner}</span>
            ) : null}
            {current.match ? (
              <span className={styles.liveMatch}>{current.match}</span>
            ) : null}
            {left !== null ? (
              <span className={styles.liveLeft}>
                {left <= 0
                  ? tt('ros.endingNow', 'ending now')
                  : tt('ros.minsLeft', '{n} min left').replace('{n}', left)}
              </span>
            ) : null}
          </div>

          {through !== null ? (
            <div className={styles.track}>
              <span className={styles.trackFill} style={{ width: `${through}%` }} />
            </div>
          ) : null}
        </>
      ) : (
        <div className={styles.liveTop}>
          <span className={styles.liveMark}>{tt('ros.betweenCues', 'Between cues')}</span>
        </div>
      )}

      {next ? (
        <p className={styles.upNext}>
          <span className={styles.upNextLabel}>{tt('ros.next', 'Next')}</span>
          <span className={styles.upNextTime}>{next.starts_at}</span>
          <span className={styles.upNextName}>{next.activity}</span>
          {next.owner ? <span className={styles.upNextOwner}>{next.owner}</span> : null}
        </p>
      ) : null}
    </section>
  );
};

// ---------------------------------------------------------------------------

/**
 * @param sheet    the payload from the API
 * @param compact  inside the organiser console, where the page already has a
 *                 heading and a tab strip above it
 */
export default function RunOfShow({ sheet, compact = false }) {
  const tt = useT();
  const zone = sheet?.time_zone || 'Africa/Lagos';

  // A clock, not a poller. It asks nothing of the network, so it costs the
  // venue's hotspot nothing and cannot starve the API during a show.
  //
  // It starts as null and is filled in on mount, deliberately. This screen is
  // rendered on the server so a crawler and a link preview get the real running
  // order in the HTML, and a clock read during that render would disagree with
  // the clock a second later in the browser: React calls that a hydration
  // mismatch and throws the whole page away. So the server draws the running
  // order with nothing marked as on air, and the browser marks it a moment
  // later, which is the only half of this that needs a live clock anyway.
  const [clock, setClock] = useState(null);
  useEffect(() => {
    setClock(nowInZone(zone));
    const tick = setInterval(() => setClock(nowInZone(zone)), 20000);
    return () => clearInterval(tick);
  }, [zone]);

  const days = useMemo(() => sheet?.days || [], [sheet]);
  const todayIndex = useMemo(() => {
    if (!clock) return 0;
    const found = days.findIndex((d) => d.date && d.date === clock.date);
    return found >= 0 ? found : 0;
  }, [days, clock]);

  const [dayIndex, setDayIndex] = useState(todayIndex);
  const [pickedDay, setPickedDay] = useState(false);
  // Land on the day that is actually happening, but never move under somebody
  // who has chosen a different one.
  useEffect(() => {
    if (!pickedDay) setDayIndex(todayIndex);
  }, [todayIndex, pickedDay]);

  const day = days[dayIndex] || days[0] || null;
  const dayIsToday = Boolean(clock && day?.date && day.date === clock.date);
  const items = useMemo(() => day?.items || [], [day]);

  const [role, setRole] = useState('');

  // Ordered by how much of the day each one owns, not alphabetically. A caster
  // opening this wants Casters near their thumb, and GFX owning nineteen cues
  // matters more than "audio" owning one.
  const roles = useMemo(() => {
    const seen = new Map();
    items.forEach((item) => rolesOf(item.owner).forEach((name) => {
      const key = roleKey(name);
      const row = seen.get(key);
      if (row) row.count += 1;
      else seen.set(key, { name, count: 1 });
    }));
    return [...seen.values()]
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [items]);

  // A role chosen on Day 1 that nobody owns on Day 2 would silently empty the
  // list, so it is dropped rather than left selected over nothing.
  useEffect(() => {
    if (role && !roles.some((r) => roleKey(r.name) === roleKey(role))) {
      setRole('');
    }
  }, [roles, role]);

  const shown = useMemo(() => (role
    ? items.filter((item) => rolesOf(item.owner)
      .some((name) => roleKey(name) === roleKey(role)))
    : items), [items, role]);

  const minutes = clock ? clock.minutes : -1;

  const current = useMemo(() => (dayIsToday
    ? items.find((item) => statusOf(item, minutes, true) === 'now') || null
    : null), [items, minutes, dayIsToday]);

  const next = useMemo(() => {
    if (!dayIsToday) return items[0] || null;
    return items.find((item) => statusOf(item, minutes, true) === 'ahead')
      || null;
  }, [items, minutes, dayIsToday]);

  // Put the reader where the show is, once. Doing it on every tick would drag
  // the page out from under somebody scrolling back to check a cue.
  const liveRow = useRef(null);
  const scrolled = useRef(false);
  useEffect(() => {
    if (scrolled.current || !liveRow.current) return;
    scrolled.current = true;
    liveRow.current.scrollIntoView({ block: 'center', behavior: 'auto' });
  }, [current, shown.length]);

  if (!sheet) return null;

  if (!days.length) {
    return (
      <div className={styles.empty}>
        <p className={styles.emptyLine}>
          {tt('ros.emptySheet', 'This run of show has nothing on it yet.')}
        </p>
      </div>
    );
  }

  // Phase bands, the way the sheet itself is read. A blank phase continues the
  // one above, which the API has already resolved.
  const groups = [];
  shown.forEach((item) => {
    const band = item.phase || '';
    const last = groups[groups.length - 1];
    if (!last || last.phase !== band) groups.push({ phase: band, items: [item] });
    else last.items.push(item);
  });

  return (
    <div className={compact ? styles.pageCompact : styles.page}>
      {!compact ? (
        <header className={styles.head}>
          <p className={styles.eyebrow}>{tt('ros.eyebrow', 'Run of show')}</p>
          <h1 className={styles.title}>
            {sheet.name || sheet.owner?.name || tt('ros.eyebrow', 'Run of show')}
          </h1>
          {sheet.subtitle ? (
            <p className={styles.subtitle}>{sheet.subtitle}</p>
          ) : null}
          {sheet.owner?.slug ? (
            <Link
              className={styles.backLink}
              href={sheet.owner.kind === 'event'
                ? `/events/${sheet.owner.slug}`
                : `/tournaments/${sheet.owner.slug}`}
            >
              {sheet.owner.name}
            </Link>
          ) : null}
        </header>
      ) : null}

      {days.length > 1 ? (
        <div className={styles.dayStrip} role="tablist"
             aria-label={tt('ros.days', 'Days')}>
          {days.map((d, index) => (
            <button
              key={d.id}
              type="button"
              role="tab"
              aria-selected={index === dayIndex}
              className={`${styles.dayChip} ${index === dayIndex ? styles.dayChipOn : ''}`}
              onClick={() => { setPickedDay(true); setDayIndex(index); }}
            >
              {d.label}
            </button>
          ))}
        </div>
      ) : null}

      {day?.note && day.note !== sheet.subtitle
        ? <p className={styles.dayNote}>{day.note}</p> : null}

      {dayIsToday ? (
        <OnNow current={current} next={next} clock={minutes} tt={tt} />
      ) : null}

      {roles.length > 1 ? (
        <div className={styles.roleStrip}>
          <button
            type="button"
            aria-pressed={role === ''}
            className={`${styles.roleChip} ${role === '' ? styles.roleChipOn : ''}`}
            onClick={() => setRole('')}
          >
            {tt('ros.everyone', 'Everything')}
          </button>
          {roles.map(({ name, count }) => (
            <button
              key={name}
              type="button"
              aria-pressed={role === name}
              className={`${styles.roleChip} ${role === name ? styles.roleChipOn : ''}`}
              onClick={() => setRole(role === name ? '' : name)}
            >
              {name}
              <span className={styles.roleCount}>{count}</span>
            </button>
          ))}
        </div>
      ) : null}

      {shown.length === 0 ? (
        <div className={styles.empty}>
          <p className={styles.emptyLine}>
            {tt('ros.noneForRole', 'Nothing on this day belongs to {role}.')
              .replace('{role}', role)}
          </p>
          <button type="button" className={styles.emptyAction}
                  onClick={() => setRole('')}>
            {tt('ros.showEverything', 'Show everything')}
          </button>
        </div>
      ) : (
        <div className={styles.flow}>
          {groups.map((group, groupIndex) => (
            <section key={`${group.phase}-${groupIndex}`} className={styles.band}>
              {group.phase ? (
                <h2 className={styles.bandName}>{group.phase}</h2>
              ) : null}

              <ol className={styles.rows}>
                {group.items.map((item) => {
                  const state = statusOf(item, minutes, dayIsToday);
                  const isNow = state === 'now';
                  return (
                    <li
                      key={item.id}
                      ref={isNow ? liveRow : null}
                      className={`${styles.row} ${isNow ? styles.rowNow : ''} ${state === 'done' ? styles.rowDone : ''}`}
                    >
                      <div className={styles.when}>
                        <span className={styles.start}>
                          {item.starts_at || '--:--'}
                        </span>
                        {duration(tt, item.minutes) ? (
                          <span className={styles.long}>
                            {duration(tt, item.minutes)}
                          </span>
                        ) : null}
                      </div>

                      <div className={styles.what}>
                        <p className={styles.activity}>{item.activity}</p>
                        <div className={styles.tags}>
                          {item.owner ? (
                            <span className={styles.owner}>{item.owner}</span>
                          ) : null}
                          {item.match ? (
                            <span className={styles.match}>{item.match}</span>
                          ) : null}
                          {item.is_confirmed === false ? (
                            <span className={styles.unconfirmed}>
                              {tt('ros.notConfirmed', 'Not confirmed')}
                            </span>
                          ) : null}
                        </div>
                        {item.note ? (
                          <p className={styles.note}>{item.note}</p>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </section>
          ))}
        </div>
      )}

      <p className={styles.zoneLine}>
        {tt('ros.zoneLine', 'All times are {zone} time.')
          .replace('{zone}', String(zone).split('/').pop().replace(/_/g, ' '))}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------

/**
 * The same screen, fetching for itself.
 *
 * Give it `token` for the share address, or `kind` and `ownerRef` for an event
 * or tournament page. Both land in the same component; only the address differs.
 *
 * It refetches when the tab comes back into view rather than on a timer. A run
 * sheet changes a handful of times in a day and a page polling through a six
 * hour show on a venue hotspot is a page starving its own API, which this
 * platform has already done twice.
 */
export function RunOfShowLoader({ token, kind, ownerRef, authToken, compact }) {
  const tt = useT();
  const [sheet, setSheet] = useState(null);
  const [state, setState] = useState('loading');
  const [error, setError] = useState('');

  const address = token
    ? `${API}/run-of-show/${encodeURIComponent(token)}/`
    : `${API}/${kind === 'tournament' ? 'tournament' : 'event'}/${encodeURIComponent(ownerRef || '')}/run-of-show/`;

  const load = useCallback(async (quiet) => {
    if (!token && !ownerRef) return;
    if (!quiet) setState('loading');
    try {
      const res = await fetch(address, {
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
        cache: 'no-store',
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.status === 'success' && body.data?.sheet) {
        setSheet(body.data.sheet);
        setState('ready');
        return;
      }
      if (res.status === 404) {
        setState('missing');
        return;
      }
      setError(apiMessage(tt, body, 'ros.loadFailed',
        'The run of show could not be loaded.'));
      setState('error');
    } catch {
      setError(tt('api.NETWORK_UNREACHABLE',
        'We could not reach V-ENT. Check your connection and try again.'));
      setState('error');
    }
  }, [address, authToken, token, ownerRef]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const back = () => { if (document.visibilityState === 'visible') load(true); };
    document.addEventListener('visibilitychange', back);
    return () => document.removeEventListener('visibilitychange', back);
  }, [load]);

  if (state === 'loading') {
    return (
      <div className={styles.loading} role="status" aria-busy="true">
        <span className={styles.skelHead} />
        <span className={styles.skelRow} />
        <span className={styles.skelRow} />
        <span className={styles.skelRow} />
        <span className={styles.srOnly}>{tt('ui.loading.33ce', 'Loading…')}</span>
      </div>
    );
  }

  if (state === 'missing') {
    return (
      <div className={styles.empty}>
        <p className={styles.emptyLine}>
          {tt('ros.notShared', 'There is no run of show here, or it has not been shared.')}
        </p>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className={styles.empty}>
        <p className={styles.emptyLine}>{error}</p>
        <button type="button" className={styles.emptyAction} onClick={() => load()}>
          {tt('ros.tryAgain', 'Try again')}
        </button>
      </div>
    );
  }

  return <RunOfShow sheet={sheet} compact={compact} />;
}
