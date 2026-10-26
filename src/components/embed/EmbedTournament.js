'use client';
/**
 * A tournament inside somebody else's website (inbox 360): the game, the
 * format, when, how many places are taken, the entry and the prize.
 *
 * Registering happens on V-ENT, in a pop-up when the browser allows one and a
 * new tab when it does not (P8, design 14c: "money is always taken on V-ENT's
 * own checkout ... signing in uses Sign in with V-ENT in a pop-up, never a
 * password typed into a third-party frame"). Nothing in this frame asks for a
 * password, a card or a coin.
 *
 * The places stay current by asking the server to draw the card again
 * (router.refresh), which reads through the page's 30 second cache: a
 * thousand people watching one card cost the API one read every half minute,
 * and none of them counts as a visit to the tournament.
 */
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/i18n/LanguageProvider';
import { formatWithZone, formatNumber } from '@/lib/datetime';
import { slotsText } from '@/lib/slots';
import { useAutoRefresh } from '@/lib/useLiveData';
import EmbedFrame from './EmbedFrame';
import styles from './embed.module.css';
import { prizeText } from '@/lib/prize';
import { formatLabel } from '@/lib/formatLabel';
import { mediaUrl } from '@/lib/mediaUrl';

/** The registration on V-ENT, in a window of its own. */
export function openRegistration(event, url) {
  const popup = window.open(url, 'vent-register', 'popup=yes,width=480,height=760');
  // Refused (a blocker, a sandboxed frame): the link's own new tab instead.
  if (popup) {
    event.preventDefault();
    popup.focus?.();
  }
}

export default function EmbedTournament({ slug, initial, failed, look }) {
  const { t: tt } = useLanguage();
  const router = useRouter();
  const [origin, setOrigin] = useState('');
  // A banner that fails to load is left out rather than drawn as a broken
  // picture with its alt text, on a page that is not ours.
  const [bannerFailed, setBannerFailed] = useState(false);
  // An image that failed before the page woke up fired its error to nobody.
  const bannerRef = useRef(null);
  useEffect(() => {
    const img = bannerRef.current;
    if (img && img.complete && img.naturalWidth === 0) setBannerFailed(true);
  }, []);
  useEffect(() => { setOrigin(window.location.origin); }, []);
  // Nothing comes back to measure, so every round counts as unchanged and
  // the asking slows from half a minute to two.
  useAutoRefresh(() => { router.refresh(); return false; }, [slug],
    { interval: 30000, maxInterval: 120000 });

  const t = initial;
  if (failed || !t) {
    return (
      <EmbedFrame look={look}>
        <p className={styles.note}>
          {failed
            ? tt('embed.unavailable', 'This could not be loaded just now. Try again in a moment.')
            : tt('embed.missingTournament', 'This tournament could not be found. It may have been removed.')}
        </p>
      </EmbedFrame>
    );
  }

  const name = t.tournament_title || t.name || t.title;
  const fee = t.entry_fee === 'Paid' ? Number(t.entry_fee_price || 0) : 0;
  const prize = Number(t.prize_pool_total_vc ?? t.prize_pool ?? 0);
  const open = t.status === 'registration_open';
  // Through mediaUrl, as every other screen: an address the API gives
  // relative to itself would otherwise load from the frame's host and miss.
  const banner = mediaUrl(t.tournament_banner || t.banner);
  const coins = (n) => tt('embed.vc', '{n} VENT COINS').replace('{n}', formatNumber(n));
  const facts = [
    [tt('embed.game', 'Game'), t.game],
    // In the reader's language, as the tournament page names it.
    [tt('embed.format', 'Format'), formatLabel(tt, t.bracket_type || t.format_label, '')],
    // With its zone: an embed is read on other people's sites, in any country,
    // and a bare 02:16 PM said nothing about whose afternoon (audit 557).
    [tt('embed.starts', 'Starts'), t.start_date_and_time ? formatWithZone(t.start_date_and_time) : ''],
    // The one sentence for how full a tournament is, which says "no limit"
    // in words rather than printing a cap of 0.
    [tt('embed.places', 'Places'), slotsText(tt, t.current_participants, t.max_participants,
      t.participant_type === 'team' ? 'team' : 'entrant')],
    [tt('embed.entry', 'Entry'), fee > 0 ? coins(fee) : tt('embed.free', 'Free')],
    [tt('embed.prize', 'Prize pool'), prize > 0 ? prizeText(t) : ''],
  ].filter(([, v]) => v);
  const page = `${origin}/tournaments/${encodeURIComponent(slug)}`;

  return (
    <EmbedFrame kind="tournament" slug={slug} look={look}>
      {banner && !bannerFailed && (
        // eslint-disable-next-line @next/next/no-img-element
        <img ref={bannerRef} className={styles.banner} src={banner} onError={() => setBannerFailed(true)}
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
      {open ? (
        <>
          <a className={styles.cta} href={`${page}/register`} target="_blank" rel="noopener"
             onClick={(event) => openRegistration(event, `${page}/register`)}>
            {tt('embed.register', 'Register on V-ENT')}
          </a>
          <p className={styles.foot}>
            {tt('embed.registerHow', 'Opens V-ENT in a new window. You sign in and pay there, never on this page.')}
          </p>
        </>
      ) : (
        <a className={styles.cta} href={page} target="_blank" rel="noopener">
          {tt('embed.view', 'See it on V-ENT')}
        </a>
      )}
    </EmbedFrame>
  );
}
