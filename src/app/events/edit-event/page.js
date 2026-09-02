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

const FIELDS = [
  'name', 'desc', 'event_type', 'category', 'location', 'event_link',
  'entry_fee', 'capacity', 'start_date', 'end_date', 'is_active',
  'max_tickets_per_email',
];

export const EditEventContent = ({ slug: slugFromPath }) => {
  const tt = useT();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const token = session?.user?.sessionToken;
  const ref = slugFromPath || searchParams.get('id');

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
          is_active: e.is_active !== false,
          // Held as a string so the empty box means "no limit" rather than
          // being coerced to a 0 that the API would read the same way but the
          // form would draw as an actual zero.
          max_tickets_per_email: e.max_tickets_per_email != null
            ? String(e.max_tickets_per_email) : '',
        };
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

  const set = (key, value) => setForm(f => ({ ...f, [key]: value }));

  const changed = FIELDS.filter(k => original && form && form[k] !== original[k]);
  const nothingToSend = changed.length === 0 && !logo && !banner;

  const save = async () => {
    if (nothingToSend) return;
    setSaving(true);
    setError('');
    setNotice('');
    try {
      // Only what changed, because the endpoint is partial and the form does
      // not hold every field the event has.
      const payload = new FormData();
      changed.forEach(key => payload.append(key, String(form[key])));
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
              <Link href="/events/my-events" className={styles.back}>
                {tt('eventEdit.back', '← My events')}
              </Link>
              <h1 className={styles.pageTitle}>
                {tt('eventEdit.title', 'Edit event')}
              </h1>
              <p className={styles.pageSub}>
                {tt('eventEdit.sub', 'Change what needs changing. Only what you touch is sent, so nothing else on the event moves.')}
              </p>
            </div>
            {ref && <Link href={`/events/${ref}`} className={styles.ghostBtn}>
              {tt('eventEdit.view', 'View the public page')}
            </Link>}
          </div>

          {/* Everything about this event, in one place.

              CEO, 1 September: "The edit event button should have all options
              about editing anything related to that event on that place, so
              they click edit event and have several options to manage the
              event from."

              Before this, the console's eleven tabs were reachable only
              through a button labelled "Influencers and promo codes", so
              somebody looking for the door list, the money or the messages
              had no reason to press it. Each destination is now named for
              what it opens, and each one deep-links to its own tab.

              It sits below the header rather than inside it: as a flex child
              of .headRow it only ever got the width left over beside the
              title, so the auto-fill grid collapsed to a single column and
              twelve cards ran down a 280px strip with the page empty beside
              them. */}
          {ref && <div className={styles.hub}>
              <p className={styles.hubTitle}>{tt('eventEdit.hubTitle', 'Manage this event')}</p>
              <div className={styles.hubGrid}>
                <Link href={`/events/${ref}/manage`} className={styles.hubCard}>
                  <span className={styles.hubName}>{tt('eventEdit.hubTickets', 'Tickets and pricing')}</span>
                  <span className={styles.hubSub}>{tt('eventEdit.hubTicketsSub', 'Types, prices, how many, limits per email address')}</span>
                </Link>
                <Link href={`/events/${ref}/attendees`} className={styles.hubCard}>
                  <span className={styles.hubName}>{tt('eventEdit.hubDoor', 'Door list and check-in')}</span>
                  <span className={styles.hubSub}>{tt('eventEdit.hubDoorSub', 'Who is coming, and the scanner for the day')}</span>
                </Link>
                <Link href={`/events/${ref}/manage?tab=money`} className={styles.hubCard}>
                  <span className={styles.hubName}>{tt('eventEdit.hubMoney', 'Money')}</span>
                  <span className={styles.hubSub}>{tt('eventEdit.hubMoneySub', 'What has sold and what it is worth')}</span>
                </Link>
                <Link href={`/events/${ref}/manage?tab=numbers`} className={styles.hubCard}>
                  <span className={styles.hubName}>{tt('eventEdit.hubNumbers', 'Sales and attendance')}</span>
                  <span className={styles.hubSub}>{tt('eventEdit.hubNumbersSub', 'Registrations, where people came from, export')}</span>
                </Link>
                <Link href={`/events/${ref}/manage?tab=messages`} className={styles.hubCard}>
                  <span className={styles.hubName}>{tt('eventEdit.hubMessages', 'Messages and announcements')}</span>
                  <span className={styles.hubSub}>{tt('eventEdit.hubMessagesSub', 'Write to everybody holding a ticket')}</span>
                </Link>
                <Link href={`/events/${ref}/manage?tab=polls`} className={styles.hubCard}>
                  <span className={styles.hubName}>{tt('eventEdit.hubPolls', 'Polls')}</span>
                  <span className={styles.hubSub}>{tt('eventEdit.hubPollsSub', 'Ask attendees something')}</span>
                </Link>
                <Link href={`/events/${ref}/manage?tab=programme`} className={styles.hubCard}>
                  <span className={styles.hubName}>{tt('eventEdit.hubProgramme', 'Programme')}</span>
                  <span className={styles.hubSub}>{tt('eventEdit.hubProgrammeSub', 'What happens when, and where in the venue')}</span>
                </Link>
                <Link href={`/events/${ref}/manage?tab=holds`} className={styles.hubCard}>
                  <span className={styles.hubName}>{tt('eventEdit.hubHolds', 'Holds and comps')}</span>
                  <span className={styles.hubSub}>{tt('eventEdit.hubHoldsSub', 'Set tickets aside, or give one away')}</span>
                </Link>
                <Link href={`/events/${ref}/manage?tab=queue`} className={styles.hubCard}>
                  <span className={styles.hubName}>{tt('eventEdit.hubQueue', 'Waiting list')}</span>
                  <span className={styles.hubSub}>{tt('eventEdit.hubQueueSub', 'Who is waiting for a ticket to come back')}</span>
                </Link>
                <Link href={`/events/${ref}/manage?tab=influencers`} className={styles.hubCard}>
                  <span className={styles.hubName}>{tt('eventEdit.hubInfluencers', 'Influencers')}</span>
                  <span className={styles.hubSub}>{tt('eventEdit.hubInfluencersSub', 'Links that credit whoever brought the sale')}</span>
                </Link>
                <Link href={`/events/${ref}/manage?tab=promos`} className={styles.hubCard}>
                  <span className={styles.hubName}>{tt('eventEdit.hubPromos', 'Promo codes')}</span>
                  <span className={styles.hubSub}>{tt('eventEdit.hubPromosSub', 'Discounts, and who may spend them')}</span>
                </Link>
                <Link href={`/events/${ref}/manage?tab=team`} className={styles.hubCard}>
                  <span className={styles.hubName}>{tt('eventEdit.hubTeam', 'Who can help run it')}</span>
                  <span className={styles.hubSub}>{tt('eventEdit.hubTeamSub', 'Managers, and what each of them may do')}</span>
                </Link>
              </div>
            </div>}

          {loading ? (
            <p className={styles.muted}>{tt('ui.loading.33ce', 'Loading…')}</p>
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
                          onChange={e => set('category', e.target.value)}>
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

              <label className={styles.field}>
                <span className={styles.label}>{tt('eventEdit.location', 'Location')}</span>
                <input className={styles.input} value={form.location}
                       onChange={e => set('location', e.target.value)} />
              </label>

              <label className={styles.field}>
                <span className={styles.label}>{tt('eventEdit.link', 'Link for people joining online')}</span>
                <input className={styles.input} value={form.event_link}
                       onChange={e => set('event_link', e.target.value)} />
              </label>

              <div className={styles.row}>
                <label className={styles.field}>
                  <span className={styles.label}>{tt('eventEdit.fee', 'Entry fee')}</span>
                  <input className={styles.input} type="number" min="0" step="1"
                         value={form.entry_fee}
                         onChange={e => set('entry_fee', e.target.value)} />
                </label>

                <label className={styles.field}>
                  <span className={styles.label}>{tt('eventEdit.capacity', 'Capacity')}</span>
                  <input className={styles.input} type="number" min="0" step="1"
                         value={form.capacity}
                         onChange={e => set('capacity', e.target.value)} />
                </label>
              </div>

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

              <label className={styles.checkRow}>
                <input type="checkbox" checked={form.is_active}
                       onChange={e => set('is_active', e.target.checked)} />
                <span>
                  {tt('eventEdit.listed', 'Listed publicly')}
                  <span className={styles.hint}>
                    {tt('eventEdit.listedHint', 'Turn this off and the event stays reachable by its link but leaves the listing.')}
                  </span>
                </span>
              </label>

              {/* Who is behind the event. They could only ever be set in the
                  creation wizard, so a sponsor who signed on afterwards could
                  not be added and one who pulled out could not be removed.
                  Saves on its own, because a logo upload is not part of the
                  partial field save above. */}
              {ref && token && <SponsorEditor eventRef={ref} token={token} />}

              {error && <p className={styles.error}>{error}</p>}
              {notice && <p className={styles.notice}>{notice}</p>}

              <div className={styles.actions}>
                <button type="button" className={styles.primaryBtn}
                        onClick={save} disabled={saving || nothingToSend}>
                  {saving
                    ? tt('ui.saving.8f2a', 'Saving…')
                    : nothingToSend
                      ? tt('eventEdit.noChanges', 'Nothing changed yet')
                      : tt('eventEdit.save', 'Save changes')}
                </button>

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

export default EditEvent;
