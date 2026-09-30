'use client';
/**
 * The event's own website (inbox 360).
 *
 * CEO, 29 September 2026: "allow people be able to like create their own
 * event pages that looks like a site".
 *
 * One event, drawn the organiser's way: their accent, a dark or light page, a
 * poster or a split opening, and the sections they chose in the order they
 * chose. What is drawn is the event record itself, so a change in the console
 * is on the website the next time anybody opens it. Tickets sell through the
 * event page's checkout (EventTickets), never a copy of it.
 */
import { useEffect } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/i18n/LanguageProvider';
import { formatDateRange, formatWithZone } from '@/lib/datetime';
import { paintDocument, siteStyle } from '@/lib/siteTheme';
import EventTickets from './EventTickets';
import styles from './event-site.module.css';

function Section({ id, title, surface = false, children }) {
  return (
    <section id={id} className={surface ? `${styles.section} ${styles.onSurface}` : styles.section}
             aria-labelledby={`${id}-title`}>
      <h2 id={`${id}-title`} className={styles.sectionTitle}>{title}</h2>
      {children}
    </section>
  );
}

export default function EventSite({ event: e, preview = false }) {
  const { t: tt } = useLanguage();
  const site = e.site || {};
  // Only the theme decides the page colour, so only the theme is watched.
  const theme = site.theme;
  useEffect(() => paintDocument({ theme }), [theme]);

  const slug = e.slug;
  const ended = e.status === 'ended';
  const cancelled = e.is_active === false;
  const online = e.event_type === 'virtual';
  const where = online ? tt('site.online', 'Online') : (e.venue_name || e.location || '');
  const organiser = e.organizer?.full_name || e.organizer?.username || '';
  const sponsors = [...(e.sponsors || []), ...(e.partners || [])];
  const tournaments = e.linked_tournaments || [];
  const mapHref = e.map_link || e.map_search_url || '';

  const draw = {
    about: e.description || e.desc ? (
      <Section key="about" id="about" title={tt('site.about', 'About')}>
        <p className={styles.prose}>{e.description || e.desc}</p>
      </Section>
    ) : null,
    tickets: (
      <Section key="tickets" id="tickets" surface title={tt('site.tickets', 'Tickets')}>
        {cancelled
          ? <p className={styles.muted}>{tt('embed.cancelled', 'This event was cancelled. Anybody who paid is refunded.')}</p>
          : <EventTickets slug={slug} ended={ended} />}
      </Section>
    ),
    schedule: (
      <Section key="schedule" id="schedule" title={tt('site.when', 'When')}>
        <p className={styles.fact}>{formatWithZone(e.start_date)}</p>
        {e.end_date && (
          <p className={styles.muted}>
            {tt('site.until', 'Until {when}').replace('{when}', formatWithZone(e.end_date))}
          </p>
        )}
        {e.has_run_of_show && (
          <p><Link className={styles.link} href={`/events/${encodeURIComponent(slug)}/run-of-show`}>
            {tt('site.runOfShow', 'See the running order')}
          </Link></p>
        )}
      </Section>
    ),
    venue: (
      <Section key="venue" id="venue" surface title={tt('site.where', 'Where')}>
        <p className={styles.fact}>{where || tt('site.venueTba', 'The venue is announced soon.')}</p>
        {!online && e.venue_name && e.location && <p className={styles.muted}>{e.location}</p>}
        {!online && e.directions && <p className={styles.prose}>{e.directions}</p>}
        {!online && mapHref && (
          <p><a className={styles.link} href={mapHref} target="_blank" rel="noopener noreferrer">
            {tt('site.map', 'Open in maps')}
          </a></p>
        )}
      </Section>
    ),
    tournaments: tournaments.length ? (
      <Section key="tournaments" id="tournaments" title={tt('site.tournaments', 'Tournaments at this event')}>
        <ul className={styles.cards}>
          {tournaments.map((t) => (
            <li key={t.slug || t.id} className={styles.card}>
              <Link className={styles.cardLink} href={`/tournaments/${encodeURIComponent(t.slug)}`}>
                <span className={styles.cardTitle}>{t.tournament_title || t.name || t.title}</span>
                {t.game && <span className={styles.muted}>{t.game}</span>}
              </Link>
            </li>
          ))}
        </ul>
      </Section>
    ) : null,
    sponsors: sponsors.length ? (
      <Section key="sponsors" id="sponsors" title={tt('site.sponsors', 'With thanks to')}>
        <ul className={styles.sponsors}>
          {sponsors.map((s) => {
            const body = s.logo
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={s.logo} alt={s.name} className={styles.sponsorLogo} />
              : <span className={styles.fact}>{s.name}</span>;
            return (
              <li key={`${s.kind}-${s.id}`} className={styles.sponsor}>
                {s.website ? <a href={s.website} target="_blank" rel="noopener noreferrer">{body}</a> : body}
              </li>
            );
          })}
        </ul>
      </Section>
    ) : null,
  };

  const order = (site.sections || []).filter((s) => s.visible).map((s) => s.key);
  const split = site.layout === 'split';

  return (
    <div className={styles.page} style={siteStyle(site)}>
      {preview && (
        <p className={styles.preview} role="status">
          {tt('site.previewNote', 'Preview. This website is not published yet, so only people with this link can see it.')}
        </p>
      )}
      <header className={split ? styles.heroSplit : styles.heroPoster}>
        {e.banner && (
          // eslint-disable-next-line @next/next/no-img-element
          <img className={styles.banner} src={e.banner}
               alt={tt('embed.bannerAlt', 'Banner for {name}').replace('{name}', e.name)} />
        )}
        <div className={styles.heroText}>
          {organiser && (
            <p className={styles.kicker}>{tt('site.presents', '{name} presents').replace('{name}', organiser)}</p>
          )}
          <h1 className={styles.title}>{e.name}</h1>
          {site.headline && <p className={styles.headline}>{site.headline}</p>}
          <p className={styles.when}>
            {formatDateRange(e.start_date, e.end_date)}{where ? ` · ${where}` : ''}
          </p>
          {!cancelled && !ended && order.includes('tickets') && (
            <a className={styles.cta} href="#tickets">{tt('site.getTickets', 'Get tickets')}</a>
          )}
          {cancelled && <p className={styles.muted}>{tt('site.cancelled', 'Cancelled')}</p>}
          {ended && !cancelled && <p className={styles.muted}>{tt('embed.over', 'Event over')}</p>}
        </div>
      </header>

      <main className={styles.body}>
        {order.map((key) => draw[key]).filter(Boolean)}
      </main>

      <footer className={styles.footer}>
        <p>
          {tt('site.poweredBy', 'Tickets and entry by')}{' '}
          <Link className={styles.link} href={`/events/${encodeURIComponent(slug)}`}>V-ENT</Link>
        </p>
        <p className={styles.legal}>
          <Link className={styles.link} href="/terms">{tt('site.terms', 'Terms')}</Link>
          <Link className={styles.link} href="/privacy-policy">{tt('site.privacy', 'Privacy')}</Link>
        </p>
      </footer>
    </div>
  );
}
