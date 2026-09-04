'use client';

// The door.
//
// Typing an 11-character code per person is not a door, it is a queue. This
// reads the QR code off the ticket with the phone's own camera, using the
// browser's BarcodeDetector where it exists and falling back to typing where it
// does not.
//
// **Offline is the point, not a bonus.** At a venue in Lagos with 900 people on
// the same cell tower, a scanner that needs a connection is a scanner that
// stops. So the whole ticket list is downloaded before the doors open, every
// scan is decided locally, and the results are sent up when there is a network
// again.
//
// Two things the scanning vendors warn about, both counter-intuitive, both
// built for here:
//
// 1. **Sync as close to gate time as possible**, because the download cannot
//    know about a refund, a transfer, or a ticket bought since.
// 2. **A code this device does not know is not the same as a code that does not
//    exist.** On 4 September somebody who registered on the morning of the show
//    was told "Not on the list", because the download had happened before they
//    bought. So an unknown code is now put to the server whenever there is a
//    network, and only refused offline, where the copy really is all there is.
//
// The vendors also say never to reload the list mid-event, because on their
// scanners it overwrites the record of who has already been through. That is
// not true here: the scan record lives under its own key and `download` never
// touches it. The lock was removed after it blocked a real door.
//
// A duplicate says WHEN and WHERE it was first used. "Already scanned" sends a
// steward to a supervisor; "scanned at Gate B, 19:42" lets them decide.
//
// ## Why the state lives in refs
//
// The camera loop is a self-scheduling `setTimeout` chain started once. It
// closes over `decide` AS IT WAS at that moment, so a `decide` that read
// `scanned` and `pending` out of React state read the values from before the
// first scan, for ever. Every camera scan then wrote
// `{...scannedFromBeforeAnyScan, [code]: now}` and dropped every earlier one:
// duplicates stopped being caught after the first person, and queued check-ins
// were lost before they could be sent.
//
// Typing a code was fine, because the form re-reads `decide` on every render.
// So the fault was invisible to anybody testing by typing, and appeared only at
// a door with a camera and more than one person.
//
// The record is therefore held in refs and mirrored into state for drawing. A
// ref is the same object however stale the closure around it is.

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useViewer } from '@/lib/gating';
import Link from 'next/link';
import { LuCheck, LuTriangleAlert, LuWifi, LuWifiOff } from 'react-icons/lu';
import { apiMessage } from '@/lib/apiMessage';
import { useT } from '@/i18n/LanguageProvider';
import { appLocale } from '@/lib/appLocale';
import styles from './scan.module.css';

const API = process.env.NEXT_PUBLIC_API_URL;
const local = key => `vent-scan-${key}`;

/** Today, as the calendar reads it here, not as UTC does. */
const todayISO = () => {
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};

const dayName = value => (value
  ? new Date(`${value}T12:00:00`).toLocaleDateString(appLocale(),
    { weekday: 'long', day: 'numeric', month: 'long' })
  : '');

const shortTime = value => (value
  ? new Date(value).toLocaleTimeString(appLocale(),
    { hour: '2-digit', minute: '2-digit' })
  : '');

function ScanContent() {
  const tt = useT();
  const params = useSearchParams();
  // Who is on the door.
  //
  // STATUS, not data: `data` alone cannot tell "signed out" from "still
  // asking", and a door that cannot tell those apart shows an empty ticket list
  // to a steward who is signed in perfectly well and about to open the gates.
  //
  // And it does not trust the hook alone. On 4 September this page sat at
  // "Checking your account" for ever with a valid session: `/api/auth/session`
  // answered 200 and `useSession()` still reported `loading`, on this route and
  // not on its neighbours. Whatever the cause, a door is the wrong screen to
  // find it on, so the session is also read straight from the endpoint and
  // whichever answer arrives first is used. One extra request, once, on the
  // screen where being unable to start is the most expensive failure there is.
  const viewer = useViewer();
  const [fallback, setFallback] = useState({ asked: false, token: null });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/auth/session', { cache: 'no-store' });
        const body = await res.json().catch(() => ({}));
        if (!cancelled) {
          setFallback({ asked: true, token: body?.user?.sessionToken || null });
        }
      } catch {
        if (!cancelled) setFallback({ asked: true, token: null });
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const token = viewer.token || fallback.token;
  const stillAsking = viewer.loading && !fallback.asked;
  const signedIn = Boolean(token);
  const eventRef = params.get('event') || '';
  const gate = params.get('gate') || '';
  // Which day this door admits for.
  //
  // CEO, 4 September 2026: "so that people dont come and show day 2 tickets on
  // day one and its work because tehre is just one scanner." `?day=2026-09-05`
  // pins a scanner to a day; without it, today. A ticket type with no day on it
  // admits on any day, which is what a single day event and a weekend pass both
  // are, so this only ever narrows.
  const day = params.get('day') || todayISO();

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const scanningRef = useRef(false);

  const [tickets, setTickets] = useState(null);   // code -> ticket
  const [scanned, setScanned] = useState({});     // code -> {at, gate}
  const [pending, setPending] = useState([]);     // not yet sent up
  const [refused, setRefused] = useState([]);     // the server will never take
  const [online, setOnline] = useState(true);

  // The same three, as refs, because the camera loop's closure is frozen at the
  // moment it started. These are what `decide` reads and writes; the state
  // above exists to draw with. See the note at the top of the file.
  const ticketsRef = useRef(null);
  const scannedRef = useRef({});
  const pendingRef = useRef([]);
  // One code, read six times while somebody holds their phone up, is one
  // person. Without this the first frame says "Let them in" and the next says
  // "Already used" in red, at the same face.
  const lastSeenRef = useRef({ code: '', at: 0 });
  const [last, setLast] = useState(null);
  const [error, setError] = useState('');
  const [typed, setTyped] = useState('');
  const [cameraOn, setCameraOn] = useState(false);

  // ------------------------------------------------------------- the list

  const download = useCallback(async () => {
    if (!token || !eventRef) return;
    setError('');
    try {
      const res = await fetch(`${API}/event/${eventRef}/attendees/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || body.status !== 'success') {
        setError(apiMessage(tt, body, 'api.couldNotLoadThisEvent',
          'Could not load this event.'));
        return;
      }
      const rows = body.data?.attendees || body.data?.results || [];
      const byCode = {};
      rows.forEach(row => {
        if (row.code) byCode[String(row.code).toUpperCase()] = row;
      });
      setTickets(byCode);
      ticketsRef.current = byCode;
      try {
        window.localStorage.setItem(local(eventRef), JSON.stringify(byCode));
      } catch { /* a full or blocked store is not a reason to stop */ }
    } catch {
      // Fall back to whatever this device already downloaded. A blip must not
      // empty the door list.
      try {
        const cached = window.localStorage.getItem(local(eventRef));
        if (cached) {
          const parsed = JSON.parse(cached);
          setTickets(parsed);
          ticketsRef.current = parsed;
        } else setError(tt('scan.noList', 'No ticket list on this device yet, and the server cannot be reached.'));
      } catch {
        setError(tt('scan.noList', 'No ticket list on this device yet, and the server cannot be reached.'));
      }
    }
  }, [token, eventRef]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { download(); }, [download]);

  // Restore this device's own scan record, which is the thing a reload would
  // destroy.
  useEffect(() => {
    if (!eventRef) return;
    try {
      const saved = window.localStorage.getItem(local(`${eventRef}-scanned`));
      if (saved) {
        const parsed = JSON.parse(saved);
        setScanned(parsed);
        scannedRef.current = parsed;
      }
      const queued = window.localStorage.getItem(local(`${eventRef}-pending`));
      if (queued) {
        const parsed = JSON.parse(queued);
        setPending(parsed);
        pendingRef.current = parsed;
      }
    } catch { /* nothing usable */ }
  }, [eventRef]);

  const remember = useCallback((next, queue) => {
    try {
      window.localStorage.setItem(local(`${eventRef}-scanned`), JSON.stringify(next));
      window.localStorage.setItem(local(`${eventRef}-pending`), JSON.stringify(queue));
    } catch { /* ignore */ }
  }, [eventRef]);

  // ------------------------------------------------------------ the network

  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    setOnline(typeof navigator === 'undefined' ? true : navigator.onLine);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => {
      window.removeEventListener('online', up);
      window.removeEventListener('offline', down);
    };
  }, []);

  // Sending the queue up.
  //
  // It used to run from `useEffect(() => flush(), [flush])` with `pending` in
  // its dependencies. On a bad connection every attempt failed, `setPending`
  // was handed a NEW array of the same items, `flush` was rebuilt, the effect
  // fired again, and the door hammered the API as fast as the venue's wifi
  // could refuse it. That is the same class as the overlay feed on 3 September
  // and the admin console on 29 August, and here it would be happening while
  // 900 people queue.
  //
  // So: one attempt at a time, a growing gap after a failure, and a settled 4xx
  // is never retried at all. A refusal the server will always give is not a
  // network problem and repeating it only hides the real one.
  const inFlightRef = useRef(false);
  const backoffRef = useRef(0);

  const SETTLED = new Set([400, 401, 403, 404, 409, 410, 422]);

  const flush = useCallback(async () => {
    if (!online || !token || inFlightRef.current) return;
    if (pendingRef.current.length === 0) return;

    inFlightRef.current = true;
    const queue = [...pendingRef.current];
    const left = [];
    const dead = [];
    let failed = false;

    try {
      for (const item of queue) {
        try {
          const res = await fetch(`${API}/event/ticket/${item.code}/check-in/`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ gate: item.gate, day: item.day }),
          });
          if (res.ok) continue;
          if (SETTLED.has(res.status)) {
            // 409 is the server saying it already had this one, which is the
            // answer we wanted. The rest are refusals that will not change by
            // being asked again, and the door is told rather than left with a
            // queue that never empties.
            if (res.status !== 409) dead.push({ ...item, status: res.status });
            continue;
          }
          left.push(item);
          failed = true;
        } catch {
          left.push(item);
          failed = true;
        }
      }
    } finally {
      inFlightRef.current = false;
    }

    pendingRef.current = left;
    setPending(left);
    if (dead.length) setRefused((was) => [...was, ...dead]);
    remember(scannedRef.current, left);

    backoffRef.current = failed
      ? Math.min(backoffRef.current ? backoffRef.current * 2 : 5000, 60000)
      : 0;
  }, [online, token, remember]);

  // A heartbeat rather than a reaction to the queue changing. It asks nothing
  // when the queue is empty, waits out the backoff after a failure, and cannot
  // stack because of the in-flight guard above.
  useEffect(() => {
    let stopped = false;
    let timer = null;
    const run = async () => {
      if (stopped) return;
      await flush();
      if (stopped) return;
      timer = setTimeout(run, backoffRef.current || 8000);
    };
    run();
    return () => { stopped = true; if (timer) clearTimeout(timer); };
  }, [flush]);

  // -------------------------------------------------------------- scanning

  /**
   * A code this device has never heard of, put to the server.
   *
   * The check-in endpoint is the authority and it already answers every case:
   * 200 let them in, 409 already used with when and where, 404 no such ticket,
   * 403 this account may not work this door. So the unknown path is not a
   * separate lookup, it is simply doing the check-in there and then.
   */
  const askServer = useCallback(async (key) => {
    try {
      const res = await fetch(`${API}/event/ticket/${key}/check-in/`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ gate, day }),
      });
      const body = await res.json().catch(() => ({}));

      if (res.ok) {
        const ticket = body.data?.ticket || { attendee_name: '', code: key };
        const stamp = { at: new Date().toISOString(), gate };
        const nextScanned = { ...scannedRef.current, [key]: stamp };
        scannedRef.current = nextScanned;
        setScanned(nextScanned);
        remember(nextScanned, pendingRef.current);
        // Added to this device's copy too, so a second read of the same code
        // is answered from here rather than by asking again.
        ticketsRef.current = { ...(ticketsRef.current || {}), [key]: ticket };
        setTickets(ticketsRef.current);
        setLast({ kind: 'in', code: key, ticket });
        return;
      }

      if (res.status === 409 && body.data?.first_used) {
        const first = body.data.first_used;
        setLast({
          kind: 'duplicate',
          code: key,
          ticket: body.data.ticket || { attendee_name: first.attendee_name || '' },
          first: { at: first.at, gate: first.gate, by: first.by },
        });
        return;
      }

      if (res.status === 409 && body.code === 'WRONG_DAY') {
        setLast({
          kind: 'wrongDay',
          code: key,
          ticket: {
            ...(body.data?.ticket || {}),
            tier_day: body.data?.ticket_day,
            tier_day_label: body.data?.ticket_day_label,
          },
        });
        return;
      }

      if (res.status === 403) {
        setLast({ kind: 'notYours', code: key });
        return;
      }

      setLast({ kind: 'unknown', code: key });
    } catch {
      // The network went while we were asking. The device's own copy is the
      // only answer left, and it does not have this one.
      setLast({ kind: 'unknown', code: key });
    }
  }, [token, gate, day, remember]);

  /**
   * One scan.
   *
   * Everything it reads comes from a ref, so this function has no dependency
   * that changes and the camera loop's frozen copy of it stays correct for the
   * whole night. `repeat` is the camera saying "I have seen this code again in
   * the same second", which is one person holding their phone up, not a second
   * attempt.
   */
  const decide = useCallback((code, { fromCamera = false } = {}) => {
    const key = String(code || '').trim().toUpperCase();
    if (!key) return;

    if (fromCamera) {
      const seen = lastSeenRef.current;
      if (seen.code === key && Date.now() - seen.at < 3000) return;
      lastSeenRef.current = { code: key, at: Date.now() };
    }


    const ticket = ticketsRef.current?.[key];
    if (!ticket) {
      // NOT on the list this device downloaded. That is not the same as not
      // being on the list, and on 4 September it told somebody who had
      // registered that morning to go away.
      //
      // The download happens once, before the gates open, and a ticket bought
      // after it cannot be in it. So when there is a network, ask the server
      // before refusing anybody: the server is the list, and this device is a
      // copy of it from earlier. Offline, the copy is all there is and the
      // honest answer is still "not on the list I have".
      if (navigator.onLine && token) {
        setLast({ kind: 'checking', code: key });
        askServer(key);
        return;
      }
      setLast({ kind: 'unknown', code: key });
      return;
    }

    // The wrong day, decided here as well as at the API. A steward holding a
    // phone with no signal still has to be able to turn away a Day 2 ticket on
    // Day 1, and the list carries `tier_day` for exactly that.
    if (ticket.tier_day && day && ticket.tier_day !== day) {
      setLast({ kind: 'wrongDay', code: key, ticket });
      return;
    }

    // Already used, on this device or according to the list we downloaded.
    const here = scannedRef.current[key];
    const already = here
      || (ticket.status === 'checked_in'
        ? { at: ticket.checked_in_at, gate: ticket.checked_in_gate, by: ticket.checked_in_by }
        : null);

    if (already) {
      setLast({ kind: 'duplicate', code: key, ticket, first: already });
      return;
    }

    const stamp = { at: new Date().toISOString(), gate };
    const nextScanned = { ...scannedRef.current, [key]: stamp };
    const nextPending = [...pendingRef.current,
      { code: key, gate, day, at: stamp.at }];
    scannedRef.current = nextScanned;
    pendingRef.current = nextPending;
    setScanned(nextScanned);
    setPending(nextPending);
    remember(nextScanned, nextPending);
    setLast({ kind: 'in', code: key, ticket });
  }, [gate, day, remember, token, askServer]);

  const startCamera = useCallback(async () => {
    if (typeof window === 'undefined' || !('BarcodeDetector' in window)) {
      setError(tt('scan.noCamera', 'This browser cannot read QR codes. Type the code instead.'));
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraOn(true);
      scanningRef.current = true;

      // eslint-disable-next-line no-undef
      const detector = new BarcodeDetector({ formats: ['qr_code'] });
      const tick = async () => {
        if (!scanningRef.current || !videoRef.current) return;
        try {
          const found = await detector.detect(videoRef.current);
          if (found.length) decide(found[0].rawValue, { fromCamera: true });
        } catch { /* a frame that will not decode is not an error */ }
        // Slow enough that one code is not read six times while somebody holds
        // their phone up.
        setTimeout(tick, 700);
      };
      tick();
    } catch {
      setError(tt('scan.noPermission', 'The camera was not allowed. Type the code instead.'));
    }
  }, [decide, tt]);

  useEffect(() => () => {
    scanningRef.current = false;
    streamRef.current?.getTracks().forEach(track => track.stop());
  }, []);

  // ----------------------------------------------------------------- render

  const total = tickets ? Object.keys(tickets).length : 0;
  const inCount = Object.keys(scanned).length;

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <div>
          <h1 className={styles.title}>{tt('scan.title', 'Door')}</h1>
          <p className={styles.sub}>
            {gate
              ? tt('scan.atGate', 'Scanning at {gate}').replace('{gate}', gate)
              : tt('scan.noGate', 'No gate name set. Add ?gate=Main to the address so a duplicate can say where it was first used.')}
          </p>
          {/* WHICH DAY, stated. At a two day event this is the difference
              between a door and a door somebody has already walked through
              once, and a steward has to be able to see it without asking. */}
          <p className={styles.sub}>
            {tt('scan.forDay', 'Admitting for {day}').replace('{day}', dayName(day))}
          </p>
        </div>
        <span className={online ? styles.online : styles.offline}>
          {online ? <LuWifi aria-hidden="true" /> : <LuWifiOff aria-hidden="true" />}
          {online
            ? tt('scan.online', 'Online')
            : tt('scan.offline', 'Offline, still working')}
        </span>
      </header>

      <div className={styles.counts}>
        <span>{tt('scan.inCount', '{n} in').replace('{n}', inCount)}</span>
        <span>{tt('scan.listCount', '{n} on the list').replace('{n}', total)}</span>
        {pending.length > 0 && <span className={styles.pending}>
          {tt('scan.pending', '{n} waiting to send').replace('{n}', pending.length)}
        </span>}
        {/* A check-in the server refused for good: a code it does not know, or
            an account that may not work this door. The queue used to retry
            those for ever and never say so, so a steward saw a number that
            would not go down and no reason for it. */}
        {refused.length > 0 && <span className={styles.refused}>
          {tt('scan.refused', '{n} the server would not take').replace('{n}', refused.length)}
        </span>}
      </div>

      {/* A door with nothing on it has three causes and they are not the same
          thing. Saying "0 on the list" to all three is how a steward stands at
          a gate wondering whether the event sold no tickets. */}
      {stillAsking && <p className={styles.note}>
        {tt('scan.checkingAccount', 'Checking your account…')}
      </p>}

      {!stillAsking && !signedIn && <p className={styles.error}>
        {tt('scan.needAccount', 'Sign in with the account the organiser put on this door.')}
      </p>}

      {!stillAsking && signedIn && tickets && total === 0 && !error
        && <p className={styles.note}>
          {tt('scan.emptyList', 'Nobody holds a ticket for this event yet, so there is nothing to scan.')}
        </p>}

      {error && <p className={styles.error}>{error}</p>}

      {/* The result, big enough to read at arm's length in the dark. */}
      {last && <div className={
        last.kind === 'in' ? styles.resultIn
          : last.kind === 'duplicate' ? styles.resultDuplicate
            : last.kind === 'checking' ? styles.resultChecking
              : last.kind === 'wrongDay' ? styles.resultDuplicate
                : styles.resultUnknown}>
        {last.kind === 'checking' && <>
          <strong>{tt('scan.checking', 'Checking with V-ENT')}</strong>
          <span className={styles.resultSub}>{last.code}</span>
        </>}

        {last.kind === 'wrongDay' && <>
          <LuTriangleAlert aria-hidden="true" />
          <strong>{tt('scan.wrongDay', 'Wrong day')}</strong>
          <span>{last.ticket?.attendee_name || last.code}</span>
          <span className={styles.resultSub}>
            {last.ticket?.tier_day_label
              ? tt('scan.ticketIsForNamed', 'This ticket is for {label}, {day}.')
                .replace('{label}', last.ticket.tier_day_label)
                .replace('{day}', dayName(last.ticket.tier_day))
              : tt('scan.ticketIsFor', 'This ticket is for {day}.')
                .replace('{day}', dayName(last.ticket?.tier_day))}
          </span>
        </>}

        {last.kind === 'notYours' && <>
          <LuTriangleAlert aria-hidden="true" />
          <strong>{tt('scan.notYourDoor', 'This account cannot work this door')}</strong>
          <span className={styles.resultSub}>
            {tt('scan.askOrganiser', 'Ask the organiser to add you on the Team tab.')}
          </span>
        </>}

        {last.kind === 'in' && <>
          <LuCheck aria-hidden="true" />
          <strong>{tt('scan.letThemIn', 'Let them in')}</strong>
          <span>{last.ticket.attendee_name || last.ticket.username || last.code}</span>
          {last.ticket.tier_name && <span className={styles.resultSub}>{last.ticket.tier_name}</span>}
        </>}

        {last.kind === 'duplicate' && <>
          <LuTriangleAlert aria-hidden="true" />
          <strong>{tt('scan.alreadyUsed', 'Already used')}</strong>
          <span>{last.ticket.attendee_name || last.ticket.username || last.code}</span>
          {/* WHEN and WHERE. This is the difference between a steward deciding
              and a steward escalating. */}
          <span className={styles.resultSub}>
            {/* The gate half is its own key rather than a fragment built here,
                because " on " is a word and a word built in JavaScript is a
                word that stays English. */}
            {last.first.gate
              ? tt('scan.firstUsedAt', 'First used at {time} on {gate}')
                .replace('{time}', shortTime(last.first.at))
                .replace('{gate}', last.first.gate)
              : tt('scan.firstUsedTime', 'First used at {time}')
                .replace('{time}', shortTime(last.first.at))}
            {last.first.by && ` · ${last.first.by}`}
          </span>
        </>}

        {last.kind === 'unknown' && <>
          <LuTriangleAlert aria-hidden="true" />
          <strong>{tt('scan.notOnTheList', 'Not on the list')}</strong>
          <span className={styles.resultSub}>{last.code}</span>
          {!online && <span className={styles.resultSub}>
            {tt('scan.notOnListOffline', 'This phone is offline, so this is the list as it was downloaded. A ticket bought since then will not be on it.')}
          </span>}
        </>}
      </div>}

      <div className={styles.scanner}>
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <video ref={videoRef} className={cameraOn ? styles.video : styles.videoOff}
               playsInline muted />
        {!cameraOn && <button type="button" className={styles.primary} onClick={startCamera}>
          {tt('scan.startCamera', 'Use the camera')}
        </button>}
      </div>

      <form className={styles.typeRow} onSubmit={e => { e.preventDefault(); decide(typed); setTyped(''); }}>
        <input className={styles.input} value={typed}
               onChange={e => setTyped(e.target.value)}
               placeholder={tt('scan.typeCode', 'Or type the code')}
               aria-label={tt('scan.typeCode', 'Or type the code')} />
        <button type="submit" className={styles.ghost} disabled={!typed.trim()}>
          {tt('scan.check', 'Check')}
        </button>
      </form>

      {/* Reloading was DISABLED once scanning started, on the vendors' advice
          that it overwrites the record of who has already been through. That
          advice is about scanners which keep both in one place. Here the scan
          record lives under its own key and `download` never touches it, so
          the lock protected nothing and blocked the one case that actually
          happened: somebody who registered on the morning of the show was told
          "Not on the list" and the steward had no way to refresh. */}
      <div className={styles.footer}>
        <button type="button" className={styles.ghost} onClick={download}>
          {tt('scan.reload', 'Reload the list')}
        </button>
        {eventRef && <Link href={`/events/${eventRef}/attendees`} className={styles.ghost}>
          {tt('scan.doorList', 'Door list')}
        </Link>}
      </div>
    </div>
  );
}

// `useSearchParams` needs a Suspense boundary above it, the way every other
// page here that reads the address does. Without one Next deopts the whole
// route to client-only rendering, and this page then sat at "Checking your
// account" for ever with a perfectly good session: a door showing 0 on the
// list to a steward who was signed in.
const ScanPage = () => (
  <Suspense fallback={<div style={{ minHeight: '100vh', backgroundColor: '#131316' }} />}>
    <ScanContent />
  </Suspense>
);

export default ScanPage;
