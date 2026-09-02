'use client';

// The map under "Getting there".
//
// CEO, 29 August 2026: "the getting there should actually show a map and then
// the location on the map, plus the open in maps button, should be there too."
// It was a heading with a link under it, so somebody deciding whether they
// could get to Ogba on a Friday evening had to leave the page to find out where
// it was.
//
// And: "there should be ways for people to also see like markers of other
// people coming to the event, they dont need to see specific people, just like
// markers that theres people around them going to that event and people can
// decide if they want that their going to that event be made public."
//
// So the map carries two things. The venue, which is a pin. And where the room
// is coming from, which is deliberately not pins: each marker is a district
// about 5km across with a count on it, and a district is only drawn once enough
// people share it that no single person is identifiable. The server does the
// rounding and the threshold; see `vent_event/geo.py` for why each of those is
// where it is. Nothing here ever sees another attendee's coordinate, because
// the API never sends one.
//
// Leaflet rather than an embedded iframe, because an iframe can show a venue
// and cannot draw the districts. Tiles come from OpenStreetMap, which needs no
// key and no account.

import { apiMessage } from '@/lib/apiMessage';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useT } from '@/i18n/LanguageProvider';
import styles from './venue-map.module.css';

const API = process.env.NEXT_PUBLIC_API_URL || '';

export default function VenueMap({
  latitude,
  longitude,
  venueName,
  eventSlug,
  mapLink,
  sessionToken,
}) {
  const tt = useT();
  const holder = useRef(null);
  const map = useRef(null);
  const layer = useRef(null);

  const [cells, setCells] = useState([]);
  const [sharing, setSharing] = useState(false);
  const [minPerCell, setMinPerCell] = useState(3);
  // Whether this viewer may be counted at all. The server decides, because the
  // server is what refuses a POST from somebody without a ticket, and a button
  // that fails only once pressed is worse than one that is not there.
  const [canShare, setCanShare] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');

  // `Number(null)` is 0, and 0 is finite, so an event with no coordinates used
  // to pass this test and the map drew latitude 0, longitude 0 - a point in the
  // Gulf of Guinea with no land on it. That is what the CEO saw: a flat
  // blue-grey square with a marker in the middle of the ocean, which reads as a
  // map that failed to load rather than a venue nobody has pinned.
  //
  // So absent is checked before the conversion, and exactly 0,0 is treated as
  // absent too. No venue on this platform is in the middle of the Atlantic, and
  // a placeholder that happens to be finite is still a placeholder.
  const given = v => v !== null && v !== undefined && v !== '';
  const lat = Number(latitude);
  const lng = Number(longitude);
  const havePoint = given(latitude) && given(longitude)
    && Number.isFinite(lat) && Number.isFinite(lng)
    && !(lat === 0 && lng === 0);

  // ---------------------------------------------------------------- the map

  useEffect(() => {
    if (!havePoint || !holder.current || map.current) return undefined;
    let cancelled = false;

    (async () => {
      const L = (await import('leaflet')).default;
      await import('leaflet/dist/leaflet.css');
      if (cancelled || !holder.current) return;

      const instance = L.map(holder.current, {
        center: [lat, lng],
        zoom: 14,
        // A map inside a page should not eat the scroll on the way past it.
        scrollWheelZoom: false,
        attributionControl: true,
      });

      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18,
        attribution: '&copy; OpenStreetMap',
      }).addTo(instance);

      // A CSS pin rather than Leaflet's default image: the default resolves its
      // icon from a path a bundler rewrites, which is how a map ends up with
      // broken image squares where the markers should be.
      L.marker([lat, lng], {
        icon: L.divIcon({
          className: '',
          html: `<span class="${styles.pin}"></span>`,
          iconSize: [18, 18],
          iconAnchor: [9, 9],
        }),
        keyboard: true,
        title: venueName || '',
      }).addTo(instance);

      layer.current = L.layerGroup().addTo(instance);
      map.current = instance;
      // Tiles can lay out against a zero-height container if the section was
      // hidden when this ran.
      setTimeout(() => instance.invalidateSize(), 0);
    })();

    return () => {
      cancelled = true;
      if (map.current) { map.current.remove(); map.current = null; }
    };
  }, [havePoint, lat, lng, venueName]);

  // ------------------------------------------------------------ the origins

  const load = useCallback(async () => {
    if (!eventSlug) return;
    try {
      const res = await fetch(`${API}/event/${eventSlug}/origins/`, {
        headers: sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {},
      });
      const data = await res.json().catch(() => ({}));
      if (data?.status !== 'success') return;
      setCells(data.data?.cells || []);
      setSharing(Boolean(data.data?.sharing));
      setMinPerCell(Number(data.data?.min_per_cell) || 3);
      setCanShare(Boolean(data.data?.can_share));
    } catch {
      // A map without the districts is still a map with the venue on it.
    }
  }, [eventSlug, sessionToken]);

  useEffect(() => { load(); }, [load]);

  // Draw the districts whenever they change.
  useEffect(() => {
    if (!map.current || !layer.current) return;
    (async () => {
      const L = (await import('leaflet')).default;
      layer.current.clearLayers();
      for (const cell of cells) {
        L.circle([cell.lat, cell.lng], {
          // Roughly the cell, so the marker covers the area it stands for
          // rather than pretending to be a point.
          radius: 2600,
          color: '#ED1C24',
          weight: 0,
          fillColor: '#ED1C24',
          fillOpacity: 0.18,
        }).addTo(layer.current).bindTooltip(
          tt('event.map.peopleFromHere', '{n} going from around here')
            .replace('{n}', String(cell.people)),
          { direction: 'top' },
        );
      }
    })();
  }, [cells, tt]);

  const share = async () => {
    if (!navigator.geolocation) {
      setNote(tt('event.map.noGeolocation',
        'This browser will not share a location.'));
      return;
    }
    setBusy(true);
    setNote('');
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const res = await fetch(`${API}/event/${eventSlug}/origins/`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${sessionToken}`,
            },
            body: JSON.stringify({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            }),
          });
          const data = await res.json().catch(() => ({}));
          if (data?.status === 'success') {
            setSharing(true);
            setCells(data.data?.cells || []);
          } else {
            setNote(apiMessage(tt, data, 'event.map.couldNotShare',
              'That did not go through. Try again.'));
          }
        } finally {
          setBusy(false);
        }
      },
      () => {
        setBusy(false);
        setNote(tt('event.map.permissionRefused',
          'Your browser did not give a location, so nothing was shared.'));
      },
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 600000 },
    );
  };

  const stop = async () => {
    setBusy(true);
    setNote('');
    try {
      const res = await fetch(`${API}/event/${eventSlug}/origins/`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${sessionToken}` },
      });
      const data = await res.json().catch(() => ({}));
      if (data?.status === 'success') {
        setSharing(false);
        setCells(data.data?.cells || []);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.wrap}>
      {havePoint ? (
        <div className={styles.mapHolder} ref={holder} aria-label={
          tt('event.map.label', 'Map of the venue')} role="img" />
      ) : (
        <p className={styles.noPoint}>
          {tt('event.map.noCoordinate',
            'The organiser has not pinned this venue on a map yet.')}
        </p>
      )}

      <div className={styles.row}>
        {(mapLink) && (
          <a className={styles.openIn} href={mapLink}
             target="_blank" rel="noopener noreferrer">
            {tt('event.openInMaps', 'Open in maps')}
          </a>
        )}

        {canShare && (
          <button type="button" className={styles.shareBtn} onClick={sharing ? stop : share} disabled={busy}>
            {busy
              ? tt('event.map.working', 'One moment')
              : sharing
                ? tt('event.map.stopSharing', 'Stop showing my area')
                : tt('event.map.share', 'Show that my area is going')}
          </button>
        )}
      </div>

      {note && <p className={styles.note} role="alert">{note}</p>}

      {canShare && !sharing && (
        <p className={styles.privacy}>
          {tt('event.map.privacy',
            'Nobody sees where you are. Your location is rounded to a district about 5km across before it is saved, and a district only appears on the map once at least {n} people share it.')
            .replace('{n}', String(minPerCell))}
        </p>
      )}

      {cells.length > 0 && (
        <p className={styles.summary}>
          {tt('event.map.districts', 'People are coming from {n} areas nearby.')
            .replace('{n}', String(cells.length))}
        </p>
      )}
    </div>
  );
}
