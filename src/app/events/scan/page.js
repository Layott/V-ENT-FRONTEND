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
// 1. **Never reload the list mid-event.** It overwrites the local record of who
//    has already been scanned, and duplicates stop being caught. The reload
//    button is disabled once scanning has started, and says why.
// 2. **Sync as close to gate time as possible**, because the download cannot
//    know about a refund or transfer made after it.
//
// A duplicate says WHEN and WHERE it was first used. "Already scanned" sends a
// steward to a supervisor; "scanned at Gate B, 19:42" lets them decide.

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { LuCheck, LuTriangleAlert, LuWifi, LuWifiOff } from 'react-icons/lu';
import { apiMessage } from '@/lib/apiMessage';
import { useT } from '@/i18n/LanguageProvider';
import { appLocale } from '@/lib/appLocale';
import styles from './scan.module.css';

const API = process.env.NEXT_PUBLIC_API_URL;
const local = key => `vent-scan-${key}`;

const shortTime = value => (value
  ? new Date(value).toLocaleTimeString(appLocale(),
    { hour: '2-digit', minute: '2-digit' })
  : '');

export default function ScanPage() {
  const tt = useT();
  const params = useSearchParams();
  const { data: sess } = useSession();
  const token = sess?.user?.sessionToken;
  const eventRef = params.get('event') || '';
  const gate = params.get('gate') || '';

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const scanningRef = useRef(false);

  const [tickets, setTickets] = useState(null);   // code -> ticket
  const [scanned, setScanned] = useState({});     // code -> {at, gate}
  const [pending, setPending] = useState([]);     // not yet sent up
  const [online, setOnline] = useState(true);
  const [started, setStarted] = useState(false);
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
      try {
        window.localStorage.setItem(local(eventRef), JSON.stringify(byCode));
      } catch { /* a full or blocked store is not a reason to stop */ }
    } catch {
      // Fall back to whatever this device already downloaded. A blip must not
      // empty the door list.
      try {
        const cached = window.localStorage.getItem(local(eventRef));
        if (cached) setTickets(JSON.parse(cached));
        else setError(tt('scan.noList', 'No ticket list on this device yet, and the server cannot be reached.'));
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
      if (saved) setScanned(JSON.parse(saved));
      const queued = window.localStorage.getItem(local(`${eventRef}-pending`));
      if (queued) setPending(JSON.parse(queued));
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

  const flush = useCallback(async () => {
    if (!online || !token || pending.length === 0) return;
    const queue = [...pending];
    const left = [];
    for (const item of queue) {
      try {
        const res = await fetch(`${API}/event/ticket/${item.code}/check-in/`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ gate: item.gate }),
        });
        // A 409 means the server already had it, which is a settled answer and
        // not something to keep retrying.
        if (!res.ok && res.status !== 409) left.push(item);
      } catch {
        left.push(item);
      }
    }
    setPending(left);
    remember(scanned, left);
  }, [online, token, pending, scanned, remember]);

  useEffect(() => { flush(); }, [flush]);

  // -------------------------------------------------------------- scanning

  const decide = useCallback(code => {
    const key = String(code || '').trim().toUpperCase();
    if (!key) return;
    setStarted(true);

    const ticket = tickets?.[key];
    if (!ticket) {
      setLast({ kind: 'unknown', code: key });
      return;
    }

    // Already used, on this device or according to the list we downloaded.
    const here = scanned[key];
    const already = here
      || (ticket.status === 'checked_in'
        ? { at: ticket.checked_in_at, gate: ticket.checked_in_gate, by: ticket.checked_in_by }
        : null);

    if (already) {
      setLast({ kind: 'duplicate', code: key, ticket, first: already });
      return;
    }

    const stamp = { at: new Date().toISOString(), gate };
    const nextScanned = { ...scanned, [key]: stamp };
    const nextPending = [...pending, { code: key, gate, at: stamp.at }];
    setScanned(nextScanned);
    setPending(nextPending);
    remember(nextScanned, nextPending);
    setLast({ kind: 'in', code: key, ticket });
  }, [tickets, scanned, pending, gate, remember]);

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
          if (found.length) decide(found[0].rawValue);
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
      </div>

      {error && <p className={styles.error}>{error}</p>}

      {/* The result, big enough to read at arm's length in the dark. */}
      {last && <div className={
        last.kind === 'in' ? styles.resultIn
          : last.kind === 'duplicate' ? styles.resultDuplicate : styles.resultUnknown}>
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

      {/* Reloading mid-event overwrites this device's record of who has already
          been scanned, and duplicates stop being caught. Every scanning vendor
          warns about it, so the button says why rather than only refusing. */}
      <div className={styles.footer}>
        <button type="button" className={styles.ghost} disabled={started}
                onClick={download}>
          {started
            ? tt('scan.reloadLocked', 'Cannot reload once scanning has started')
            : tt('scan.reload', 'Reload the list')}
        </button>
        {eventRef && <Link href={`/events/${eventRef}/attendees`} className={styles.ghost}>
          {tt('scan.doorList', 'Door list')}
        </Link>}
      </div>
    </div>
  );
}
