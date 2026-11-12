'use client';

// Editing an event you already created.
//
// PUT /event/edit-event/<ref>/ has existed and been tested for weeks, and there
// was no screen anywhere that called it. From an organiser's side that is the
// same as the event being uneditable: create it, notice the venue is wrong, and
// there is nothing to press.
//
// The endpoint is partial - a field that is not sent is not touched - so this
// page sends only what actually changed. That matters more than it sounds: an
// event carries roughly twenty fields and this form shows twelve, and sending
// the whole form would blank the eight it does not know about.
//
// Reached from /events/my-events, from the event's own page when you run it,
// and from the sidebar under Events.

import { apiMessage } from '@/lib/apiMessage';
import { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { LuTriangleAlert } from 'react-icons/lu';
import Header from '@/components/header/Header';
import MobileHeader from '@/components/mobile-header/MobileHeader';
import Sidebar from '@/components/sidebar/Sidebar';
import BottomMenu from '@/components/bottom-menu/BottomMenu';
import DateField from '@/components/date-field/DateField';
import SponsorEditor from '@/components/sponsor-editor/SponsorEditor';
import styles from './edit-event.module.css';
import { useT } from '@/i18n/LanguageProvider';
import EventConsoleTabs from '@/components/event-console-tabs/EventConsoleTabs';
import LegacyIdRoute from '@/components/legacy-id-route/LegacyIdRoute';
import DoorScannerLink from '@/components/door-scanner-link/DoorScannerLink';
import BackLink from '@/components/back-link/BackLink';
import useGames from '@/hooks/useGames';
import { eventAsks } from '@/lib/eventAsks';
import { useCurrency } from '@/lib/money';

const API = process.env.NEXT_PUBLIC_API_URL;

// The five the model has always documented. A free-text box let one organiser
// type "esports", another "Esports" and a third "gaming", and nothing can
// group or filter on that afterwards.
const CATEGORIES = [
  ['esports', 'eventEdit.catEsports', 'Esports'],
  ['anime', 'eventEdit.catAnime', 'Anime'],
  ['concert', 'eventEdit.catConcert', 'Concert'],
  ['convention', 'eventEdit.catConvention', 'Convention'],
  ['other', 'eventEdit.catOther', 'Something else'],
];

const TYPES = [
  ['physical', 'eventEdit.typePhysical', 'In person'],
  ['virtual', 'eventEdit.typeVirtual', 'Online'],
  ['hybrid', 'eventEdit.typeHybrid', 'Both'],
];

// The stored dates are ISO with a zone; the control wants "YYYY-MM-DDTHH:mm"
// in local time. Slicing the ISO string would silently shift an event by the
// offset, which on a 7pm doors time is the difference between right and wrong.
const forInput = value => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
    + `T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

// `entry_fee` is not here any more: an event is priced per ticket type on
// the Tickets tab, and a second price on this page changed only an old
// "Fee:" line on some cards while the checkout charged the tiers (inbox 588).
// The game, its edition and the event's own links were set in the wizard and
// then frozen; they are editable here since 12 November 2026.
const FIELDS = [
  'name', 'desc', 'event_type', 'category', 'location', 'event_link',
  'capacity', 'start_date', 'end_date', 'is_listed',
  'max_tickets_per_email', 'min_age', 'game', 'series', 'social',
  // Editable after creation (CEO, 12 November 2026: "yes the entire site is
  // meant to be very flexible", inbox 591), and whether polls keep taking
  // answers once it ends, the organisers' own call (inbox 590).
  'currency', 'polls_after_end',
];
const SOCIAL = [
  ['twitter', 'ui.twitter.x.a0b4', 'Twitter / X', 'https://x.com/...'],
  ['instagram', 'ui.instagram.5721', 'Instagram', 'https://instagram.com/...'],
  ['youtube', 'ui.youtube.5588', 'YouTube', 'https://youtube.com/...'],
];
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

export const EditEventContent = ({ slug: slugFromPath }) => {
  const tt = useT();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const token = session?.user?.sessionToken;
  const ref = slugFromPath || searchParams.get('id');
  const { games: gameRows, gameTitles } = useGames();
  const { rates } = useCurrency();

  const [original, setOriginal] = useState(null);
  const [form, setForm] = useState(null);
  const [logo, setLogo] = useState(null);
  const [banner, setBanner] = useState(null);
  // What the event already has, so the form can show it rather than leaving
  // two empty file inputs that look like the artwork went missing.
  const [current, setCurrent] = useState({ logo: '', banner: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [refused, setRefused] = useState(false);
  const [notice, setNotice] = useState('');

  const [logoPreview, setLogoPreview] = useState('');
  const [bannerPreview, setBannerPreview] = useState('');
  useEffect(() => {
    if (!logo) { setLogoPreview(''); return undefined; }
    const url = URL.createObjectURL(logo);
    setLogoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [logo]);
  useEffect(() => {
    if (!banner) { setBannerPreview(''); return undefined; }
    const url = URL.createObjectURL(banner);
    setBannerPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [banner]);

  const load = useCallback(async () => {
    if (!ref) { setLoading(false); setError(tt('eventEdit.noEvent', 'No event named.')); return; }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API}/event/view-event/${ref}/`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const body = await res.json().catch(() => ({}));
      if (body.status === 'moved' && body.data?.url) {
        // Renamed since this address was shared: follow it.
        router.replace(`${body.data.url}/edit`);
        return;
      }
      if (res.ok && body.status === 'success') {
        const e = body.data?.event || body.data;
        setCurrent({
          logo: e.logo || e.logo_url || '',
          banner: e.banner || e.banner_url || '',
        });
        const shaped = {
          name: e.name || '',
          desc: e.desc || e.description || '',
          event_type: e.event_type || 'physical',
          category: e.category || '',
          location: e.location || '',
          event_link: e.event_link || e.virtual_link || '',
          entry_fee: e.entry_fee != null ? String(e.entry_fee) : '',
          capacity: e.capacity != null ? String(e.capacity) : '',
          start_date: forInput(e.start_date),
          end_date: forInput(e.end_date),
          // "Listed publicly" is its own field. It was wired to is_active,
          // which took the page down with the listing (18 September 2026).
          is_listed: e.is_listed !== false,
          // Held as a string so the empty box means "no limit" rather than
          // being coerced to a 0 that the API would read the same way but the
          // form would draw as an actual zero.
          max_tickets_per_email: e.max_tickets_per_email != null
            ? String(e.max_tickets_per_email) : '',
          // 18 for adults only, 0 for everybody (inbox 305).
          min_age: Number(e.min_age) >= 18 ? 18 : 0,
          game: e.game || '',
          series: e.series_id != null ? String(e.series_id) : '',
          social: Object.fromEntries(SOCIAL.map(([k]) => [k, e.social_links?.[k] || ''])),
          currency: e.currency || 'NGN',
          polls_after_end: e.polls_after_end !== false,
        };
        // Asked before the form is drawn (Apple review P063-8): door staff and
        // strangers saw every field and were refused only on save.
        if (e.can_edit === false) {
          setRefused(true);
          return;
        }
        setOriginal(shaped);
        setForm(shaped);
        return;
      }
      setError(apiMessage(tt, body, 'api.couldNotLoadEvent', 'Could not load this event.'));
    } catch {
      setError(tt('api.NETWORK_UNREACHABLE',
        'Could not reach the server. Check the connection and try again.'));
    } finally {
      setLoading(false);
    }
  }, [ref, token]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (status !== 'loading') load(); }, [status, load]);

  // Any edit clears a refusal about the last attempt; the live check below
  // says straight away if the new value still does not fit.
  const set = (key, value) => { setForm(f => ({ ...f, [key]: value })); setError(''); };

  const changed = FIELDS.filter(k => original && form && !same(form[k], original[k]));
  const nothingToSend = changed.length === 0 && !logo && !banner;
  // Which options this kind of event has (inbox 588): the same rule the
  // creation wizard draws from, so a field hidden there is hidden here.
  const asks = form ? eventAsks(form, 0) : null;
  const chosenGame = form ? gameRows.find(g => (g.game_title || g.name) === form.game) : null;
  const editions = chosenGame?.series || [];
  // Said beside the form before anything is sent, the same rules the server
  // holds, so the answer is not a refusal after pressing Save.
  const problem = !form ? '' : (
    asks.venue && !form.location.trim()
      ? tt('eventEdit.venueNeeded', 'An event people turn up to needs a venue.')
      : asks.linkRequired && !form.event_link.trim()
        ? tt('eventEdit.linkNeeded', 'An event people watch online needs its link.')
        : form.start_date && form.end_date && new Date(form.end_date) < new Date(form.start_date)
          ? tt('api.END_BEFORE_START', 'The event cannot end before it starts.')
          : '');

  const save = async () => {
    if (nothingToSend) return;
    if (problem) { setError(problem); return; }
    setSaving(true);
    setError('');
    setNotice('');
    try {
      // Only what changed, because the endpoint is partial and the form does
      // not hold every field the event has.
      const payload = new FormData();
      changed.forEach(key => {
        if (key === 'social') payload.append('social_links', JSON.stringify(form.social));
        else payload.append(key, String(form[key]));
      });
      if (logo) payload.append('logo', logo);
      if (banner) payload.append('banner', banner);

      const res = await fetch(`${API}/event/edit-event/${ref}/`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
        body: payload,
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.status === 'success') {
        setNotice(tt('eventEdit.saved', 'Saved.'));
        setLogo(null);
        setBanner(null);
        // A rename changes the address, so follow it rather than leaving the
        // page pointing at a slug that no longer resolves.
        const next = body.data?.event?.slug;
        if (next && next !== ref) router.replace(`/events/${next}/edit`);
        else load();
        return;
      }
      setError(apiMessage(tt, body, 'api.couldNotSaveEvent', 'Could not save the changes.'));
    } catch {
      setError(tt('api.NETWORK_UNREACHABLE',
        'Could not reach the server. Check the connection and try again.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.pageContainer}>
      <Header />
      <MobileHeader />
      <main className={styles.mainContainer}>
        <Sidebar />
        <div className={styles.rightPane}>
          <div className={styles.headRow}>
            <div>
              <BackLink href="/events/my-events" className={styles.back}>
                {tt('eventEdit.back', 'My events')}
              </BackLink>
              <h1 className={styles.pageTitle}>
                {tt('eventEdit.title', 'Edit event')}
              </h1>
              <p className={styles.pageSub}>
                {tt('eventEdit.sub', 'Change what needs changing. Only what you touch is sent, so nothing else on the event moves.')}
              </p>
            </div>
            {/* Both, because an organiser on this page on the day of the
                event is one tap from the gate. Row 168. */}
            {ref && !refused && <div className={styles.headActions}>
              {/* A door scanner is for a door; an online event has none. */}
              {form?.event_type !== 'virtual' && <DoorScannerLink eventRef={ref} />}
              <Link href={`/events/${ref}/attendees`} className={styles.ghostBtn}>
                {tt('eventEdit.doorList', 'Door list')}
              </Link>
              <Link href={`/events/${ref}`} className={styles.ghostBtn}>
                {tt('eventEdit.view', 'View the public page')}
              </Link>
            </div>}
          </div>

          {/* One strip across both screens, Details active here. It replaces
              the twelve-card grid: cards that jumped to a differently shaped
              page are exactly what made this feel like two places, and the
              strip is still on screen after you press one. */}
          {!refused && <EventConsoleTabs eventRef={ref} active="details" eventType={original?.event_type} />}

          {loading ? (
            <p className={styles.muted}>{tt('ui.loading.33ce', 'Loading…')}</p>
          ) : refused ? (
            <div className={styles.errorCard} role="alert">
              <LuTriangleAlert aria-hidden="true" />
              <p>{tt('eventEdit.notYours', 'Only the people running this event can change it.')}</p>
              <Link href={`/events/${ref}`} className={styles.ghostBtn}>
                {tt('eventEdit.view', 'View the public page')}
              </Link>
            </div>
          ) : !form ? (
            <div className={styles.errorCard}>
              <LuTriangleAlert aria-hidden="true" />
              <p>{error || tt('eventEdit.notFound', 'That event could not be opened.')}</p>
            </div>
          ) : (
            <div className={styles.form}>
              <label className={styles.field}>
                <span className={styles.label}>{tt('eventEdit.name', 'Name')}</span>
                <input className={styles.input} value={form.name}
                       onChange={e => set('name', e.target.value)} />
                <span className={styles.hint}>
                  {tt('eventEdit.nameHint', 'Renaming it changes the address. Every link ever shared keeps working.')}
                </span>
              </label>

              <label className={styles.field}>
                <span className={styles.label}>{tt('eventEdit.desc', 'Description')}</span>
                <textarea className={styles.input} rows={5} value={form.desc}
                          onChange={e => set('desc', e.target.value)} />
              </label>

              <div className={styles.row}>
                <label className={styles.field}>
                  <span className={styles.label}>{tt('eventEdit.type', 'Where it happens')}</span>
                  <select className={styles.input} value={form.event_type}
                          onChange={e => set('event_type', e.target.value)}>
                    {TYPES.map(([value, key, fallback]) => (
                      <option key={value} value={value}>{tt(key, fallback)}</option>
                    ))}
                  </select>
                </label>

                <label className={styles.field}>
                  <span className={styles.label}>{tt('eventEdit.category', 'Category')}</span>
                  <select className={styles.input} value={form.category}
                          onChange={e => {
                            set('category', e.target.value);
                            if (e.target.value === 'concert') { set('game', ''); set('series', ''); }
                          }}>
                    <option value="">{tt('eventEdit.catNone', 'Not set')}</option>
                    {CATEGORIES.map(([value, key, fallback]) => (
                      <option key={value} value={value}>{tt(key, fallback)}</option>
                    ))}
                    {/* An older event may hold something typed before this was
                        a list. Showing it keeps the save from silently
                        changing a value nobody touched. */}
                    {form.category
                      && !CATEGORIES.some(([value]) => value === form.category)
                      && <option value={form.category}>{form.category}</option>}
                  </select>
                </label>
              </div>

              {asks.game && <div className={styles.row}>
                <label className={styles.field}>
                  <span className={styles.label}>{tt('eventEdit.game', 'Game')}</span>
                  <select className={styles.input} value={form.game}
                          onChange={e => { set('game', e.target.value); set('series', ''); }}>
                    <option value="">{tt('eventEdit.noGame', 'No particular game')}</option>
                    {gameTitles.map(g => <option key={g} value={g}>{g}</option>)}
                    {form.game && !gameTitles.includes(form.game)
                      && <option value={form.game}>{form.game}</option>}
                  </select>
                </label>
                {editions.length > 0 && <label className={styles.field}>
                  <span className={styles.label}>{tt('createEvent.edition', 'Edition')}</span>
                  <select className={styles.input} value={form.series}
                          onChange={e => set('series', e.target.value)}>
                    <option value="">{tt('createEvent.anyEdition', 'Any edition')}</option>
                    {editions.map(sr => <option key={sr.id} value={String(sr.id)}>
                      {sr.name}{sr.release_year ? ` (${sr.release_year})` : ''}
                    </option>)}
                  </select>
                </label>}
              </div>}

              <div className={styles.row}>
                <label className={styles.field}>
                  <span className={styles.label}>{tt('eventEdit.starts', 'Starts')}</span>
                  <DateField withTime className={styles.input}
                             name="start_date"
                             value={form.start_date}
                             onChange={e => set('start_date', e.target.value)} />
                </label>

                <label className={styles.field}>
                  <span className={styles.label}>{tt('eventEdit.ends', 'Ends')}</span>
                  <DateField withTime className={styles.input}
                             name="end_date"
                             value={form.end_date}
                             onChange={e => set('end_date', e.target.value)} />
                </label>
              </div>

              {asks.venue && <label className={styles.field}>
                <span className={styles.label}>{tt('eventEdit.location', 'Location')}</span>
                <input className={styles.input} value={form.location}
                       onChange={e => set('location', e.target.value)} />
              </label>}

              {asks.link && <label className={styles.field}>
                <span className={styles.label}>{tt('eventEdit.link', 'Link for people joining online')}</span>
                <input className={styles.input} type="url" value={form.event_link}
                       onChange={e => set('event_link', e.target.value)} />
              </label>}

              <label className={styles.field}>
                <span className={styles.label}>{tt('eventEdit.capacity', 'Capacity')}</span>
                <input className={styles.input} type="number" min="0" step="1"
                       value={form.capacity}
                       onChange={e => set('capacity', e.target.value)} />
                <span className={styles.hint}>
                  {tt('eventEdit.pricesInTickets', 'Prices are set per ticket type.')}{' '}
                  <Link href={`/events/${ref}/manage?tab=tickets`}>
                    {tt('eventEdit.openTickets', 'Open Tickets')}
                  </Link>
                </span>
              </label>

              {/* The artwork the event currently has, shown rather than
                  implied. The form only ever offered "Replace the logo" with
                  an empty file input, so after saving there was nothing on
                  screen to say the image had been kept - which reads exactly
                  like it was lost. It never was; it was only invisible. */}
              <div className={styles.row}>
                <label className={styles.field}>
                  <span className={styles.label}>{tt('eventEdit.logo', 'Replace the logo')}</span>
                  <span className={styles.artNow}>
                    {logoPreview || current.logo
                      ? <img src={logoPreview || current.logo} alt=""
                             className={styles.artLogo} />
                      : <span className={styles.artNone}>
                          {tt('eventEdit.noArt', 'None yet')}
                        </span>}
                  </span>
                  <input className={styles.file} type="file" accept="image/*"
                         onChange={e => setLogo(e.target.files?.[0] || null)} />
                  {logo && <span className={styles.hint}>
                    {tt('eventEdit.willReplace', 'Saves when you press Save changes.')}
                  </span>}
                </label>

                <label className={styles.field}>
                  <span className={styles.label}>{tt('eventEdit.banner', 'Replace the banner')}</span>
                  <span className={styles.artNow}>
                    {bannerPreview || current.banner
                      ? <img src={bannerPreview || current.banner} alt=""
                             className={styles.artBanner} />
                      : <span className={styles.artNone}>
                          {tt('eventEdit.noArt', 'None yet')}
                        </span>}
                  </span>
                  <input className={styles.file} type="file" accept="image/*"
                         onChange={e => setBanner(e.target.files?.[0] || null)} />
                  {banner && <span className={styles.hint}>
                    {tt('eventEdit.willReplace', 'Saves when you press Save changes.')}
                  </span>}
                </label>
              </div>

              {/* How many tickets one email address may hold.
                  CEO: "the owner should be able to set if one person can get
                  multiple tickets or its limited to one per mail."
                  A number rather than a switch, because the next question
                  after "one each" is always "let a family of four in". */}
              <label className={styles.checkRow}>
                <input type="checkbox"
                       checked={form.max_tickets_per_email !== ''}
                       onChange={e => set('max_tickets_per_email',
                         e.target.checked ? '1' : '')} />
                <span>
                  {tt('eventEdit.limitPerEmail', 'Limit how many tickets one email address can get')}
                  <span className={styles.hint}>
                    {tt('eventEdit.limitPerEmailHint', 'Off means somebody can buy as many as they like. On, and an address that already has its share is refused, however many times they retype it.')}
                  </span>
                </span>
              </label>

              {form.max_tickets_per_email !== '' && <label className={styles.field}>
                <span className={styles.label}>
                  {tt('eventEdit.perEmailCount', 'Tickets allowed per email address')}
                </span>
                <input className={styles.input} type="number" min="1" max="50"
                       value={form.max_tickets_per_email}
                       onChange={e => set('max_tickets_per_email',
                         e.target.value.replace(/[^0-9]/g, ''))} />
              </label>}

              {/* The currency the ticket prices are shown in. Prices are
                  settled in naira either way; changing it changes how they are
                  shown, not what anybody pays (inbox 591). */}
              {rates && rates.length > 0 && <label className={styles.field}>
                <span className={styles.label}>{tt('createEvent.currency', 'Currency')}</span>
                <select className={styles.input} value={form.currency}
                        onChange={e => set('currency', e.target.value)}>
                  {!rates.some(c => c.code === form.currency) && <option value={form.currency}>{form.currency}</option>}
                  {rates.map(c => <option key={c.code} value={c.code}>{c.code} · {c.name}</option>)}
                </select>
                <span className={styles.hint}>
                  {original && form.currency !== original.currency
                    ? tt('eventEdit.currencyChangeNote2', 'Ticket prices stay as they are, in naira, so nobody pays a different amount, and tickets already bought are not changed. The currency records which money the event is priced for.')
                    : tt('createEvent.currencyNote', 'Prices are settled in naira. Another currency is shown to buyers as a guide, at the rate the platform holds.')}
                </span>
              </label>}

              <label className={styles.checkRow}>
                <input type="checkbox" checked={form.polls_after_end}
                       onChange={e => set('polls_after_end', e.target.checked)} />
                <span>
                  {tt('eventEdit.pollsAfterEnd', 'Polls keep taking answers after the event ends')}
                  <span className={styles.hint}>
                    {tt('eventEdit.pollsAfterEndHint', 'Off: once the event is over, its polls stop taking answers and say so. The answers already given stay.')}
                  </span>
                </span>
              </label>

              <label className={styles.checkRow}>
                <input type="checkbox" checked={form.is_listed}
                       onChange={e => set('is_listed', e.target.checked)} />
                <span>
                  {tt('eventEdit.listed', 'Listed publicly')}
                  <span className={styles.hint}>
                    {tt('eventEdit.listedHint', 'Turn this off and the event stays reachable by its link but leaves the listing.')}
                  </span>
                </span>
              </label>

              <label className={styles.checkRow}>
                <input type="checkbox" checked={form.min_age >= 18}
                       onChange={e => set('min_age', e.target.checked ? 18 : 0)} />
                <span>
                  {tt('createEvent.adultsOnly', '18+ event')}
                  <span className={styles.hint}>
                    {asks.goingTogether
                      ? tt('createEvent.adultsOnlyHint', 'Only for people aged 18 and over. The event page says so, and going together is closed to anybody younger.')
                      : tt('createEvent.adultsOnlyHintOnline', 'Only for people aged 18 and over. The event page says so.')}
                  </span>
                </span>
              </label>

              {/* Who is behind the event. They could only ever be set in the
                  creation wizard, so a sponsor who signed on afterwards could
                  not be added and one who pulled out could not be removed.
                  Saves on its own, because a logo upload is not part of the
                  partial field save above. */}
              <div className={styles.field}>
                <span className={styles.label}>{tt('ui.social.links.52e0', 'Social links')}</span>
                <div className={styles.row}>
                  {SOCIAL.map(([k, key, label, ph]) => (
                    <label key={k} className={styles.field}>
                      <span className={styles.hint}>{tt(key, label)}</span>
                      <input className={styles.input} type="url" value={form.social[k]}
                             placeholder={ph}
                             onChange={e => set('social', { ...form.social, [k]: e.target.value })} />
                    </label>
                  ))}
                </div>
              </div>

              {ref && token && <SponsorEditor eventRef={ref} token={token} />}

              {(error || (!nothingToSend && problem))
                && <p className={styles.error} role="alert">{error || problem}</p>}
              {notice && <p className={styles.notice}>{notice}</p>}

              <div className={styles.actions}>
                <button type="button" className={styles.primaryBtn}
                        onClick={save} disabled={saving || nothingToSend}>
                  {saving ? tt('ui.saving.8f2a', 'Saving…') : tt('eventEdit.save', 'Save changes')}
                </button>
                {/* The state beside the control, not as its label (Apple review P063-7). */}
                {nothingToSend && !saving && <span className={styles.hint}>{tt('eventEdit.noChanges', 'Nothing changed yet')}</span>}

              </div>
            </div>
          )}
        </div>
      </main>
      <BottomMenu />
    </div>
  );
};

const EditEvent = () => (
  <Suspense fallback={<div style={{ minHeight: '100vh', backgroundColor: '#131316' }} />}>
    <EditEventContent />
  </Suspense>
);

// The old `?id=` address. It renders nothing itself any more: it resolves the
// record, learns its name, and replaces itself with the named address. The
// component above is still the one implementation - `/events/[slug]/edit` imports it.
//
// Kept rather than deleted because this address has been shared and
// bookmarked, and the slug rule says every address a thing has ever had keeps
// working. See src/components/legacy-id-route/LegacyIdRoute.js.
const EditEventLegacy = () => (
  <Suspense fallback={<div style={{ minHeight: '100vh', backgroundColor: '#131316' }} />}>
    <LegacyIdRoute
      resolve={async id => {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/event/view-event/${id}/`);
      const body = await res.json().catch(() => null);
      // See the tournament note below: an event nests under `data.event`.
      return body?.data?.event?.slug || body?.data?.slug || null;
      }}
      to={slug => `/events/${encodeURIComponent(slug)}/edit`}
      fallback="/events/my-events"
    />
  </Suspense>
);

export default EditEventLegacy;
