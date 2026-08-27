'use client';

// A date field the platform draws itself.
//
// The native date control renders its own text, and it takes the format from
// the BROWSER's language rather than the page's. A French reader on /tournaments
// saw `mm/dd/yyyy` sitting under a French heading, and there is no attribute,
// no CSS and no locale hint that changes it. The control cannot be translated;
// it can only be replaced.
//
// So this draws the field and the calendar, and every word in both comes from
// `appLocale()`: the month name, the weekday initials, which day the week
// starts on, and whether the clock is 12 or 24 hour.
//
// The value going in and out is exactly what the native control produced -
// `YYYY-MM-DD`, or `YYYY-MM-DDTHH:mm` with `withTime` - and `onChange` is handed
// an event-shaped object. Every caller that read `e.target.value` keeps working
// unchanged, and nothing downstream had to learn a new shape.

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { LuCalendar, LuChevronLeft, LuChevronRight, LuX } from 'react-icons/lu';
import { appLocale } from '@/lib/appLocale';
import { useT } from '@/i18n/LanguageProvider';
import styles from './DateField.module.css';

const pad = (n) => String(n).padStart(2, '0');

/** 'YYYY-MM-DD' to a local Date at midnight.
 *
 *  Deliberately not `new Date(str)`: that reads a bare date as UTC, so anybody
 *  west of Greenwich gets the day before. This is the single most common way a
 *  date picker ends up off by one. */
function parseValue(value) {
  if (!value) return { date: null, hour: null, minute: null };
  const [datePart, timePart] = String(value).split('T');
  const [y, m, d] = String(datePart).split('-').map(Number);
  if (!y || !m || !d) return { date: null, hour: null, minute: null };
  const [hh, mm] = String(timePart || '').split(':').map(Number);
  return {
    date: new Date(y, m - 1, d),
    hour: Number.isFinite(hh) ? hh : null,
    minute: Number.isFinite(mm) ? mm : null,
  };
}

function toValue(date, withTime, hour, minute) {
  if (!date) return '';
  const day = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  if (!withTime) return day;
  return `${day}T${pad(hour || 0)}:${pad(minute || 0)}`;
}

const sameDay = (a, b) => Boolean(a && b
  && a.getFullYear() === b.getFullYear()
  && a.getMonth() === b.getMonth()
  && a.getDate() === b.getDate());

/** Which day the week starts on, 0 for Sunday.
 *
 *  A calendar starting on the wrong day is read wrong rather than noticed, so
 *  it follows the locale rather than a constant. `getWeekInfo` is not in every
 *  browser yet, hence the fallback. */
function weekStart(locale) {
  try {
    const info = new Intl.Locale(locale).getWeekInfo?.();
    if (info && info.firstDay) return info.firstDay === 7 ? 0 : info.firstDay;
  } catch { /* falls through to the fallback */ }
  return String(locale).startsWith('en') ? 0 : 1;
}

export default function DateField({
  value,
  onChange,
  withTime = false,
  id,
  name,
  className = '',
  placeholder,
  ariaLabel,
  disabled = false,
  min,
  max,
}) {
  const tt = useT();
  const locale = appLocale();
  const autoId = useId();
  const fieldId = id || autoId;
  const wrapRef = useRef(null);

  const parsed = useMemo(() => parseValue(value), [value]);
  const [open, setOpen] = useState(false);
  const [above, setAbove] = useState(false);
  const [cursor, setCursor] = useState(() => parseValue(value).date || new Date());

  useEffect(() => {
    const d = parseValue(value).date;
    if (d) setCursor(d);
  }, [value]);

  // Closing on an outside click and on Escape: without both, a picker opened by
  // accident traps somebody who has no idea what to press.
  useEffect(() => {
    if (!open) return undefined;
    const away = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    const esc = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', away);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', away);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);

  // Measured on open rather than on every scroll: the calendar is short-lived
  // and re-measuring it while somebody is reading it would move it under them.
  useEffect(() => {
    if (!open || !wrapRef.current) return;
    const r = wrapRef.current.getBoundingClientRect();
    const needed = withTime ? 400 : 350;
    setAbove(r.bottom + needed > window.innerHeight && r.top > needed);
  }, [open, withTime]);

  const emit = useCallback((next) => {
    if (onChange) onChange({ target: { value: next, id: fieldId, name: name || fieldId } });
  }, [onChange, fieldId, name]);

  const hour12 = useMemo(() => {
    try {
      return Intl.DateTimeFormat(locale, { hour: 'numeric' }).resolvedOptions().hour12 === true;
    } catch { return false; }
  }, [locale]);

  const label = useMemo(() => {
    if (!parsed.date) return '';
    const opts = { day: 'numeric', month: 'short', year: 'numeric' };
    if (withTime) { opts.hour = hour12 ? 'numeric' : '2-digit'; opts.minute = '2-digit'; }
    const d = new Date(parsed.date);
    if (withTime) d.setHours(parsed.hour || 0, parsed.minute || 0, 0, 0);
    return d.toLocaleString(locale, opts);
  }, [parsed, withTime, locale, hour12]);

  const monthTitle = useMemo(
    () => cursor.toLocaleDateString(locale, { month: 'long', year: 'numeric' }),
    [cursor, locale],
  );

  const start = weekStart(locale);

  const weekdays = useMemo(() => {
    // 2024-01-07 was a Sunday, so this walks a real week rather than guessing.
    const out = [];
    for (let i = 0; i < 7; i += 1) {
      const d = new Date(2024, 0, 7 + ((start + i) % 7));
      out.push({
        short: d.toLocaleDateString(locale, { weekday: 'narrow' }),
        full: d.toLocaleDateString(locale, { weekday: 'long' }),
      });
    }
    return out;
  }, [locale, start]);

  // Always six rows. A month that needs five would otherwise shrink the popover
  // and move everything else under the pointer.
  const days = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const lead = (first.getDay() - start + 7) % 7;
    const out = [];
    for (let i = 0; i < 42; i += 1) {
      out.push(new Date(cursor.getFullYear(), cursor.getMonth(), 1 - lead + i));
    }
    return out;
  }, [cursor, start]);

  const limit = useMemo(() => ({
    from: min ? parseValue(min).date : null,
    to: max ? parseValue(max).date : null,
  }), [min, max]);

  const outOfRange = useCallback(
    (d) => Boolean((limit.from && d < limit.from) || (limit.to && d > limit.to)),
    [limit],
  );

  const pick = (d) => {
    if (outOfRange(d)) return;
    emit(toValue(d, withTime, parsed.hour || 0, parsed.minute || 0));
    if (!withTime) setOpen(false);
  };

  const setTime = (h, m) => {
    const base = parsed.date || new Date();
    emit(toValue(base, true, h, m));
  };

  const clear = (e) => {
    e.stopPropagation();
    emit('');
    setOpen(false);
  };

  // Arrow keys move a day at a time, the way every calendar does, so somebody
  // who never touches a mouse can still reach the date they want.
  const onGridKey = (e) => {
    const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
    if (!step) return;
    e.preventDefault();
    const from = parsed.date || cursor;
    const next = new Date(from.getFullYear(), from.getMonth(), from.getDate() + step);
    setCursor(next);
    if (!outOfRange(next)) emit(toValue(next, withTime, parsed.hour || 0, parsed.minute || 0));
  };

  // The caller's class goes on the field, not on the shell around it. Every
  // one of these call sites already had a class written for a bare input -
  // its width, padding and fill - and putting it on the wrapper instead
  // would inset the field inside its own box and paint the background
  // twice. The wrapper exists only to anchor the calendar.
  const today = new Date();
  const displayHour = parsed.hour || 0;

  return (
    <div className={styles.wrap} ref={wrapRef}>
      <button
        type="button"
        id={fieldId}
        className={[
          styles.field,
          className || styles.fieldDefault,
          open ? styles.fieldOpen : '',
        ].filter(Boolean).join(' ')}
        onClick={() => { if (!disabled) setOpen((o) => !o); }}
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={ariaLabel || placeholder || tt('date.choose', 'Choose a date')}
      >
        <LuCalendar className={styles.fieldIcon} aria-hidden="true" />
        <span className={label ? styles.value : styles.placeholder}>
          {label || placeholder || tt('date.choose', 'Choose a date')}
        </span>
        {label && !disabled && (
          <span
            role="button"
            tabIndex={0}
            className={styles.clear}
            onClick={clear}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') clear(e); }}
            aria-label={tt('date.clear', 'Clear')}
            title={tt('date.clear', 'Clear')}
          >
            <LuX aria-hidden="true" />
          </span>
        )}
      </button>

      {open && (
        <div
          className={`${styles.pop} ${above ? styles.popAbove : ''}`}
          role="dialog"
          aria-label={monthTitle}
        >
          <div className={styles.popHead}>
            <button
              type="button"
              className={styles.nav}
              onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
              aria-label={tt('date.prevMonth', 'Previous month')}
            >
              <LuChevronLeft aria-hidden="true" />
            </button>
            <span className={styles.monthTitle}>{monthTitle}</span>
            <button
              type="button"
              className={styles.nav}
              onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
              aria-label={tt('date.nextMonth', 'Next month')}
            >
              <LuChevronRight aria-hidden="true" />
            </button>
          </div>

          <div className={styles.weekdays} aria-hidden="true">
            {weekdays.map((w, i) => (
              <span key={`${w.full}-${i}`} className={styles.weekday}>{w.short}</span>
            ))}
          </div>

          <div className={styles.grid} role="grid" tabIndex={0} onKeyDown={onGridKey}>
            {days.map((d) => {
              const other = d.getMonth() !== cursor.getMonth();
              const off = outOfRange(d);
              return (
                <button
                  key={`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`}
                  type="button"
                  role="gridcell"
                  tabIndex={-1}
                  disabled={off}
                  aria-selected={sameDay(d, parsed.date)}
                  className={[
                    styles.day,
                    other ? styles.otherMonth : '',
                    sameDay(d, parsed.date) ? styles.selected : '',
                    sameDay(d, today) ? styles.today : '',
                  ].filter(Boolean).join(' ')}
                  onClick={() => pick(d)}
                >
                  {d.getDate()}
                </button>
              );
            })}
          </div>

          {withTime && (
            <div className={styles.time}>
              <span className={styles.timeLabel}>{tt('date.time', 'Time')}</span>
              <select
                className={styles.timeSelect}
                value={hour12 ? (displayHour % 12 || 12) : displayHour}
                aria-label={tt('date.hour', 'Hour')}
                onChange={(e) => {
                  const raw = Number(e.target.value);
                  const h = hour12 ? (raw % 12) + (displayHour >= 12 ? 12 : 0) : raw;
                  setTime(h, parsed.minute || 0);
                }}
              >
                {(hour12
                  ? Array.from({ length: 12 }, (_, i) => i + 1)
                  : Array.from({ length: 24 }, (_, i) => i)
                ).map((h) => (
                  <option key={h} value={h}>{hour12 ? h : pad(h)}</option>
                ))}
              </select>
              <span className={styles.timeSep}>:</span>
              <select
                className={styles.timeSelect}
                value={parsed.minute || 0}
                aria-label={tt('date.minute', 'Minute')}
                onChange={(e) => setTime(displayHour, Number(e.target.value))}
              >
                {Array.from({ length: 60 }, (_, i) => i).map((m) => (
                  <option key={m} value={m}>{pad(m)}</option>
                ))}
              </select>
              {hour12 && (
                <select
                  className={styles.timeSelect}
                  value={displayHour >= 12 ? 'pm' : 'am'}
                  aria-label={tt('date.meridiem', 'AM or PM')}
                  onChange={(e) => {
                    const pm = e.target.value === 'pm';
                    setTime((displayHour % 12) + (pm ? 12 : 0), parsed.minute || 0);
                  }}
                >
                  <option value="am">{tt('date.am', 'AM')}</option>
                  <option value="pm">{tt('date.pm', 'PM')}</option>
                </select>
              )}
            </div>
          )}

          <div className={styles.popFoot}>
            <button
              type="button"
              className={styles.footBtn}
              onClick={() => { setCursor(today); pick(today); }}
            >
              {tt('date.today', 'Today')}
            </button>
            <button type="button" className={styles.footBtn} onClick={() => setOpen(false)}>
              {tt('date.done', 'Done')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
