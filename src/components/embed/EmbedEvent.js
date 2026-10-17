'use client';
/**
 * An event inside somebody else's website (inbox 360): what it is, when and
 * where, and its tickets. Everything that takes money opens on V-ENT in a new
 * tab. Drawn in the organiser's website colours when they have set them, so
 * the frame matches the site they built on V-ENT as well.
 */
import { useEffect, useState } from 'react';
import { useLanguage } from '@/i18n/LanguageProvider';
import { formatWithZone } from '@/lib/datetime';
import EventTickets from '@/components/event-site/EventTickets';
import EmbedFrame from './EmbedFrame';
import styles from './embed.module.css';

export default function EmbedEvent({ slug, initial, failed, look }) {
  const { t: tt } = useLanguage();
  const [origin, setOrigin] = useState('');
  useEffect(() => { setOrigin(window.location.origin); }, []);

  const e = initial;
  if (failed || !e) {
    return (
      <EmbedFrame look={look}>
        <p className={styles.note}>
          {failed
            ? tt('embed.unavailable', 'This could not be loaded just now. Try again in a moment.')
            : tt('embed.missingEvent', 'This event could not be found. It may have been removed.')}
        </p>
      </EmbedFrame>
    );
  }

  const ended = e.status === 'ended';
  const cancelled = e.is_active === false;
  const where = e.event_type === 'virtual'
    ? tt('embed.online', 'Online')
    : (e.venue_name || e.location || '');

  return (
    <EmbedFrame kind="event" slug={slug} look={look}>
      {e.banner && (
        // The organiser's own picture, from the API. next/image would need
        // every organiser's host listed; the frame is small and loads once.
        // eslint-disable-next-line @next/next/no-img-element
        <img className={styles.banner} src={e.banner}
             alt={tt('embed.bannerAlt', 'Banner for {name}').replace('{name}', e.name)} />
      )}
      <h1 className={styles.title}>{e.name}</h1>
      <p className={styles.meta}>
        {e.start_date ? formatWithZone(e.start_date) : ''}
        {where ? ` · ${where}` : ''}
      </p>
      {cancelled ? (
        <p className={styles.note}>
          {tt('embed.cancelled', 'This event was cancelled. Anybody who paid is refunded.')}
        </p>
      ) : (
        <EventTickets slug={slug} ended={ended} newTab origin={origin} />
      )}
      <p className={styles.foot}>
        <a href={`${origin}/events/${encodeURIComponent(slug)}`} target="_blank" rel="noopener">
          {tt('embed.more', 'Full details on V-ENT')}
        </a>
      </p>
    </EmbedFrame>
  );
}
