'use client';
/**
 * A tournament inside somebody else's website (inbox 360): the game, the
 * format, when, how many places are taken, the entry and the prize. Entering
 * opens on V-ENT in a new tab, where the account and the wallet are.
 */
import { useEffect, useRef, useState } from 'react';
import { useLanguage } from '@/i18n/LanguageProvider';
import { formatDateTime, formatNumber } from '@/lib/datetime';
import { slotsText } from '@/lib/slots';
import { useReportHeight } from '@/lib/embed';
import { paintDocument, siteStyle } from '@/lib/siteTheme';
import styles from './embed.module.css';

export default function EmbedTournament({ slug, initial, failed }) {
  const { t: tt } = useLanguage();
  const [origin, setOrigin] = useState('');
  useEffect(() => { setOrigin(window.location.origin); }, []);
  const root = useRef(null);
  useReportHeight(root);
  useEffect(() => paintDocument(null), []);

  const t = initial;
  if (failed || !t) {
    return (
      <main ref={root} className={styles.frame} style={siteStyle(null)}>
        <p className={styles.note}>
          {failed
            ? tt('embed.unavailable', 'This could not be loaded just now. Try again in a moment.')
            : tt('embed.missingTournament', 'This tournament could not be found. It may have been removed.')}
        </p>
      </main>
    );
  }

  const name = t.tournament_title || t.name || t.title;
  const fee = t.entry_fee === 'Paid' ? Number(t.entry_fee_price || 0) : 0;
  const prize = Number(t.prize_pool_total_vc ?? t.prize_pool ?? 0);
  const open = t.status === 'registration_open';
  const banner = t.tournament_banner || t.banner;
  const coins = (n) => tt('embed.vc', '{n} VENT COINS').replace('{n}', formatNumber(n));
  const facts = [
    [tt('embed.game', 'Game'), t.game],
    [tt('embed.format', 'Format'), t.format_label],
    [tt('embed.starts', 'Starts'), t.start_date_and_time ? formatDateTime(t.start_date_and_time) : ''],
    // The one sentence for how full a tournament is, which says "no limit"
    // in words rather than printing a cap of 0.
    [tt('embed.places', 'Places'), slotsText(tt, t.current_participants, t.max_participants,
      t.participant_type === 'team' ? 'team' : 'entrant')],
    [tt('embed.entry', 'Entry'), fee > 0 ? coins(fee) : tt('embed.free', 'Free')],
    [tt('embed.prize', 'Prize pool'), prize > 0 ? coins(prize) : ''],
  ].filter(([, v]) => v);

  return (
    <main ref={root} className={styles.frame} style={siteStyle(null)}>
      {banner && (
        // eslint-disable-next-line @next/next/no-img-element
        <img className={styles.banner} src={banner}
             alt={tt('embed.bannerAlt', 'Banner for {name}').replace('{name}', name)} />
      )}
      <h1 className={styles.title}>{name}</h1>
      <p className={styles.meta}>{tt(`tstatus.${t.status || 'unknown'}`, tt('tstatus.unknown', 'Status unknown'))}</p>
      <dl className={styles.facts}>
        {facts.map(([k, v]) => (
          <div key={k} className={styles.fact}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
      <a className={styles.cta} href={`${origin}/tournaments/${encodeURIComponent(slug)}`}
         target="_blank" rel="noopener">
        {open ? tt('embed.register', 'Register on V-ENT') : tt('embed.view', 'See it on V-ENT')}
      </a>
    </main>
  );
}
