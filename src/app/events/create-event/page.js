'use client';

import { apiMessage } from '@/lib/apiMessage';
import InfoTip from '@/components/info-tip/InfoTip';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { FaCheckCircle, FaExclamationCircle, FaPlus, FaTrash } from 'react-icons/fa';
import { IoArrowBack } from 'react-icons/io5';
import Header from '@/components/header/Header';
import MobileHeader from '@/components/mobile-header/MobileHeader';
import Sidebar from '@/components/sidebar/Sidebar';
import BottomMenu from '@/components/bottom-menu/BottomMenu';
import styles from './create-event.module.css';
import useGames from '@/hooks/useGames';
import { useT } from '@/i18n/LanguageProvider';
import { useTx } from '@/i18n/LanguageProvider';
const STEPS = [{
  id: 1,
  label: 'Basic info'
}, {
  id: 2,
  label: 'Format & capacity'
}, {
  id: 3,
  label: 'Tickets / tiers'
}, {
  id: 4,
  label: 'Sponsors & vendors'
}, {
  id: 5,
  label: 'Review'
}];
const DRAFT_KEY = 'event_create_draft';
const emptyForm = {
  // Step 1 - Basic info
  name: '',
  description: '',
  banner_url: '',
  category: 'esports',
  game_title: '',
  // optional; backend resolves it to a Games row, null if unknown
  // Step 2 - Format & capacity
  event_type: 'physical',
  start_date: '',
  end_date: '',
  location: '',
  virtual_link: '',
  capacity: 500,
  // Step 3 - Tickets
  ticket_types: [{
    id: 'ga',
    name: 'General Admission',
    price: 2500,
    quantity: 200,
    perks: 'All-day entry • Standing area'
  }],
  // Step 4 - Sponsors & vendors
  sponsors: [],
  vendor_invites: [],
  social_links: {
    twitter: '',
    instagram: '',
    youtube: ''
  }
};
const formatDateInput = iso => {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hour = String(d.getHours()).padStart(2, '0');
  const minute = String(d.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hour}:${minute}`;
};
const CreateEventPage = () => {
  const tx = useTx();
  const tt = useT();
  // The games list is whatever rows the platform actually has.
  const {
    gameTitles: games
  } = useGames();
  const router = useRouter();
  const {
    data: session
  } = useSession();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [autosaved, setAutosaved] = useState(false);

  // Hydrate draft on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setFormData(parsed.formData || emptyForm);
        setStep(parsed.step || 1);
      }
    } catch (err) {
      console.error('Draft hydrate error:', err);
    }
  }, []);

  // Autosave draft
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (submitted) return;
    const id = setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify({
          formData,
          step
        }));
        setAutosaved(true);
        setTimeout(() => setAutosaved(false), 1500);
      } catch (err) {
        console.error('Autosave error:', err);
      }
    }, 600);
    return () => clearTimeout(id);
  }, [formData, step, submitted]);
  const update = (key, value) => {
    setFormData(p => ({
      ...p,
      [key]: value
    }));
    setErrors(p => ({
      ...p,
      [key]: undefined
    }));
  };
  const updateNested = (key, subKey, value) => {
    setFormData(p => ({
      ...p,
      [key]: {
        ...(p[key] || {}),
        [subKey]: value
      }
    }));
  };
  const updateTicket = (idx, key, value) => {
    setFormData(p => ({
      ...p,
      ticket_types: p.ticket_types.map((t, i) => i === idx ? {
        ...t,
        [key]: value
      } : t)
    }));
  };
  const addTicket = () => {
    setFormData(p => ({
      ...p,
      ticket_types: [...p.ticket_types, {
        id: `tier_${Date.now()}`,
        name: '',
        price: 0,
        quantity: 50,
        perks: ''
      }]
    }));
  };
  const removeTicket = idx => {
    setFormData(p => ({
      ...p,
      ticket_types: p.ticket_types.filter((_, i) => i !== idx)
    }));
  };
  const addSponsor = () => setFormData(p => ({
    ...p,
    sponsors: [...p.sponsors, {
      name: '',
      logo_url: ''
    }]
  }));
  const updateSponsor = (idx, key, value) => setFormData(p => ({
    ...p,
    sponsors: p.sponsors.map((s, i) => i === idx ? {
      ...s,
      [key]: value
    } : s)
  }));
  const removeSponsor = idx => setFormData(p => ({
    ...p,
    sponsors: p.sponsors.filter((_, i) => i !== idx)
  }));
  const addVendor = () => setFormData(p => ({
    ...p,
    vendor_invites: [...p.vendor_invites, {
      name: '',
      email: '',
      booth: ''
    }]
  }));
  const updateVendor = (idx, key, value) => setFormData(p => ({
    ...p,
    vendor_invites: p.vendor_invites.map((v, i) => i === idx ? {
      ...v,
      [key]: value
    } : v)
  }));
  const removeVendor = idx => setFormData(p => ({
    ...p,
    vendor_invites: p.vendor_invites.filter((_, i) => i !== idx)
  }));
  const validateStep = s => {
    const e = {};
    if (s === 1) {
      if (!formData.name.trim()) e.name = 'Event name is required.';else if (formData.name.trim().length < 4) {
        e.name = 'Name must be at least 4 characters.';
      } else if (formData.name.trim().length > 40) {
        e.name = 'Name must be 40 characters or fewer.';
      }
      if (!formData.description.trim()) e.description = 'Description is required.';
    }
    if (s === 2) {
      if (!formData.start_date) e.start_date = 'Start date is required.';
      if (!formData.end_date) e.end_date = 'End date is required.';
      if (formData.start_date && formData.end_date && new Date(formData.end_date) < new Date(formData.start_date)) {
        e.end_date = 'End date must be after start date.';
      }
      if (formData.event_type !== 'virtual' && !formData.location.trim()) {
        e.location = 'Location is required for physical / hybrid events.';
      }
      if (formData.event_type === 'virtual' && !formData.virtual_link.trim()) {
        e.virtual_link = 'Virtual link is required.';
      }
      if (!formData.capacity || formData.capacity < 1) {
        e.capacity = 'Capacity must be at least 1.';
      }
    }
    if (s === 3) {
      if (formData.ticket_types.length === 0) {
        e.ticket_types = 'Add at least one ticket tier.';
      } else {
        const bad = formData.ticket_types.find(t => !t.name || t.price < 0 || t.quantity < 1);
        if (bad) e.ticket_types = 'Each tier needs a name, valid price, and quantity ≥ 1.';
      }
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };
  const goNext = () => {
    if (validateStep(step)) setStep(s => Math.min(5, s + 1));
  };
  const goBack = () => setStep(s => Math.max(1, s - 1));
  const saveDraft = () => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({
        formData,
        step
      }));
      setAutosaved(true);
      setTimeout(() => setAutosaved(false), 1500);
    } catch (err) {
      console.error('Save draft error:', err);
    }
  };
  const discardDraft = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(DRAFT_KEY);
    }
    setFormData(emptyForm);
    setStep(1);
    setErrors({});
  };
  const submit = async () => {
    // Validate all steps before submit
    for (let s = 1; s <= 4; s++) {
      if (!validateStep(s)) {
        setStep(s);
        return;
      }
    }
    setSubmitting(true);
    try {
      // The event API accepts the wizard payload as-is (events-map.md §4):
      // name, description, event_type, category, start_date, end_date, location,
      // virtual_link, capacity, banner_url, ticket_types, sponsors,
      // vendor_invites, social_links, plus optional game_title. Legacy date/time
      // and registration-window fields are auto-derived server-side from
      // start_date / end_date, so the wizard does not send them.
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/event/create-event/`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session?.user?.sessionToken || ''}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (data.status === 'success') {
        if (typeof window !== 'undefined') localStorage.removeItem(DRAFT_KEY);
        setSubmitted(true);
        setTimeout(() => router.push('/events'), 2000);
      } else {
        setErrors({
          submit: apiMessage(tt, data, "api.failedToPublishEvent", "Failed to publish event.")
        });
      }
    } catch (err) {
      setErrors({
        submit: 'Network error. Please try again.'
      });
    } finally {
      setSubmitting(false);
    }
  };
  if (submitted) {
    return <div className={styles.pageContainer}>
        <Header />
        <MobileHeader />
        <main className={styles.mainContainer}>
          <Sidebar />
          <div className={styles.rightPaneContainer}>
            <div className={styles.successScreen}>
              <FaCheckCircle className={styles.successIcon} />
              <h1 className={styles.successTitle}>{tt("ui.event.published.0dbc", "Event published")}</h1>
              <p className={styles.successSub}>
                <strong>{formData.name}</strong> {tt("ui.live.redirecting.events.listing.b101", "is live. Redirecting to events listing…")}
              </p>
              <Link href="/events" className={`${styles.successBtn} goldBTN`}>
                {tt("ui.go.events.now.2642", "Go to events now")}
              </Link>
            </div>
          </div>
        </main>
        <BottomMenu />
      </div>;
  }
  return <div className={styles.pageContainer}>
      <Header />
      <MobileHeader />

      <main className={styles.mainContainer}>
        <Sidebar />

        <div className={styles.rightPaneContainer}>
          <Link href="/events" className={styles.backLink}>
            <IoArrowBack /> {tt("ui.back.events.bd9a", "Back to events")}
          </Link>

          <div className={styles.headerRow}>
            <div>
              <h1 className={styles.pageTitle}>{tt("ui.create.event.b8d8", "Create event")}</h1>
              <p className={styles.pageSub}>
                {tt("ui.set.up.tickets.schedule.eb89", "Set up tickets, schedule, sponsors and vendors. Save as draft anytime.")}
              </p>
            </div>
            <div className={styles.draftActions}>
              {autosaved && <span className={styles.autosaved}>{tt("ui.saved.838a", "Saved ✓")}</span>}
              <button className={styles.draftBtn} onClick={saveDraft} type="button">
                {tt("ui.save.draft.4f25", "Save draft")}
              </button>
              <button className={styles.discardBtn} onClick={discardDraft} type="button">
                {tt("ui.discard.36ff", "Discard")}
              </button>
            </div>
          </div>

          {/* Stepper */}
          <div className={styles.stepper}>
            {STEPS.map(s => <button key={s.id} className={`${styles.stepCell} ${step === s.id ? styles.stepCellActive : ''} ${step > s.id ? styles.stepCellDone : ''}`} onClick={() => {
            if (s.id < step || validateStep(step)) setStep(s.id);
          }} type="button">
                <span className={styles.stepBadge}>
                  {step > s.id ? <FaCheckCircle /> : s.id}
                </span>
                <span className={styles.stepLabel}>{tx(s.label)}</span>
              </button>)}
          </div>

          <div className={styles.card}>
            {/* STEP 1 */}
            {step === 1 && <div className={styles.formStep}>
                <h2 className={styles.stepTitle}>{tt("ui.basic.info.3ecb", "Basic info")}</h2>
                <p className={styles.stepSub}>
                  {tt("ui.tell.people.what.event.9736", "Tell people what the event is about. This shows up on the listing card and the hero banner.")}
                </p>

                <label className={styles.label}>
                  <span className="fieldLabelRow">{tt("ui.event.name.8e10", "Event name")} <InfoTip id="eventName" /></span>
                  <input type="text" className={styles.input} value={formData.name} onChange={e => update('name', e.target.value)} placeholder={tt("ui.e.g.v.ent.f9c7", "e.g. V-ENT LAN Finals 2026")} maxLength={40} />
                  {errors.name && <span className={styles.errorMsg}><FaExclamationCircle /> {errors.name}</span>}
                </label>

                <label className={styles.label}>
                  <span className="fieldLabelRow">{tt("ui.description.55f8", "Description")} <InfoTip id="eventDescription" /></span>
                  <textarea className={`${styles.input} ${styles.textarea}`} value={tx(formData.description)} onChange={e => update('description', e.target.value)} placeholder={tt("ui.what.can.attendees.expect.5dad", "What can attendees expect? Highlight tournaments, performances, special guests…")} rows={5} />
                  {errors.description && <span className={styles.errorMsg}><FaExclamationCircle /> {tx(errors.description)}</span>}
                </label>

                <label className={styles.label}>
                  <span className="fieldLabelRow">{tt("ui.game.e3e8", "Game")} <span className={styles.optional}>{tt("ui.optional.b16c", "(optional)")}</span> <InfoTip id="eventGame" /></span>
                  {games.length > 0 ? <select className={styles.input} value={formData.game_title} onChange={e => update('game_title', e.target.value)}>
                      <option value="">{tt("ui.select.game.a65d", "Select a game…")}</option>
                      {games.map(g => <option key={g} value={g}>{g}</option>)}
                    </select> : <input type="text" className={styles.input} value={formData.game_title} onChange={e => update('game_title', e.target.value)} placeholder={tt("createEvent.gamePlaceholder", "e.g. EA FC 25")} />}
                </label>

                <div className={styles.formRow}>
                  <label className={styles.label}>
                    <span className="fieldLabelRow">{tt("ui.banner.image.url.594c", "Banner image URL")} <span className={styles.optional}>{tt("ui.optional.b16c", "(optional)")}</span> <InfoTip id="eventBanner" /></span>
                    <input type="url" className={styles.input} value={formData.banner_url} onChange={e => update('banner_url', e.target.value)} placeholder={tt("ui.https.1a66", "https://…")} />
                  </label>

                  <label className={styles.label}>
                    <span className="fieldLabelRow">{tt("ui.category.a3c6", "Category")} <InfoTip id="eventCategory" /></span>
                    <select className={styles.input} value={formData.category} onChange={e => update('category', e.target.value)}>
                      <option value="esports">{tt("ui.esports.5874", "Esports")}</option>
                      <option value="anime">{tt("ui.anime.f1b3", "Anime")}</option>
                      <option value="concert">{tt("ui.concert.live.music.02c4", "Concert / live music")}</option>
                      <option value="convention">{tt("ui.convention.fa84", "Convention")}</option>
                      <option value="other">{tt("ui.other.6e6a", "Other")}</option>
                    </select>
                  </label>
                </div>
              </div>}

            {/* STEP 2 */}
            {step === 2 && <div className={styles.formStep}>
                <h2 className={styles.stepTitle}>{tt("ui.format.capacity.1aa4", "Format & capacity")}</h2>
                <p className={styles.stepSub}>
                  {tt("ui.when.where.pick.format.3756", "When and where? Pick the format, set the dates, and define capacity.")}
                </p>

                <div className={styles.label}>
                  {tt("ui.event.format.92a3", "Event format")}
                  <div className={styles.typeRow}>
                    {[{
                  id: 'physical',
                  label: 'Physical',
                  desc: 'In-person at a venue'
                }, {
                  id: 'virtual',
                  label: 'Virtual',
                  desc: 'Online stream / link'
                }, {
                  id: 'hybrid',
                  label: 'Hybrid',
                  desc: 'Both in-person + online'
                }].map(t => <button key={t.id} className={`${styles.typeOption} ${formData.event_type === t.id ? styles.typeOptionActive : ''}`} onClick={() => update('event_type', t.id)} type="button">
                        <span className={styles.typeOptionLabel}>{tx(t.label)}</span>
                        <span className={styles.typeOptionDesc}>{tx(t.desc)}</span>
                      </button>)}
                  </div>
                </div>

                <div className={styles.formRow}>
                  <label className={styles.label}>
                    <span className="fieldLabelRow">{tt("ui.start.date.time.8f8b", "Start date & time")} <InfoTip id="eventStart" /></span>
                    <input type="datetime-local" className={styles.input} value={formatDateInput(formData.start_date)} onChange={e => update('start_date', e.target.value)} />
                    {errors.start_date && <span className={styles.errorMsg}><FaExclamationCircle /> {errors.start_date}</span>}
                  </label>
                  <label className={styles.label}>
                    <span className="fieldLabelRow">{tt("ui.end.date.time.2116", "End date & time")} <InfoTip id="eventEnd" /></span>
                    <input type="datetime-local" className={styles.input} value={formatDateInput(formData.end_date)} onChange={e => update('end_date', e.target.value)} />
                    {errors.end_date && <span className={styles.errorMsg}><FaExclamationCircle /> {errors.end_date}</span>}
                  </label>
                </div>

                {formData.event_type !== 'virtual' && <label className={styles.label}>
                    <span className="fieldLabelRow">{tt("ui.venue.location.5ef5", "Venue / location")} <InfoTip id="eventVenue" /></span>
                    <input type="text" className={styles.input} value={formData.location} onChange={e => update('location', e.target.value)} placeholder={tt("ui.e.g.landmark.centre.5124", "e.g. Landmark Centre, Lagos")} />
                    {errors.location && <span className={styles.errorMsg}><FaExclamationCircle /> {errors.location}</span>}
                  </label>}

                {formData.event_type !== 'physical' && <label className={styles.label}>
                    <span className="fieldLabelRow">{tt("ui.virtual.link.7e99", "Virtual link")} {formData.event_type === 'virtual' && '(required)'} <InfoTip id="eventVirtualLink" /></span>
                    <input type="url" className={styles.input} value={formData.virtual_link} onChange={e => update('virtual_link', e.target.value)} placeholder={tt("ui.https.twitch.tv.v.1328", "https://twitch.tv/v-ent")} />
                    {errors.virtual_link && <span className={styles.errorMsg}><FaExclamationCircle /> {errors.virtual_link}</span>}
                  </label>}

                <label className={styles.label}>
                  <span className="fieldLabelRow">{tt("ui.capacity.max.attendees.dd53", "Capacity (max attendees)")} <InfoTip id="eventCapacity" /></span>
                  <input type="number" className={styles.input} value={formData.capacity} onChange={e => update('capacity', Number(e.target.value))} min={1} />
                  {errors.capacity && <span className={styles.errorMsg}><FaExclamationCircle /> {errors.capacity}</span>}
                </label>
              </div>}

            {/* STEP 3 */}
            {step === 3 && <div className={styles.formStep}>
                <h2 className={styles.stepTitle}>{tt("ui.tickets.tiers.56d5", "Tickets / tiers")}<InfoTip id="ticketTier" /></h2>
                <p className={styles.stepSub}>
                  {tt("ui.define.what.attendees.can.114a", "Define what attendees can buy. Add as many tiers as you need.")}
                </p>

                {errors.ticket_types && <div className={styles.errorMsg}>
                    <FaExclamationCircle /> {errors.ticket_types}
                  </div>}

                <div className={styles.tierList}>
                  {formData.ticket_types.map((t, i) => <div key={t.id} className={styles.tierRow}>
                      <div className={styles.tierGrid}>
                        <label className={styles.label}>
                          <span className="fieldLabelRow">{tt("ui.tier.name.84b5", "Tier name")} <InfoTip id="tierName" /></span>
                          <input type="text" className={styles.input} value={t.name} onChange={e => updateTicket(i, 'name', e.target.value)} placeholder={tt("ui.e.g.vip.9f28", "e.g. VIP")} />
                        </label>
                        <label className={styles.label}>
                          <span className="fieldLabelRow">{tt("ui.price.ngn.e24c", "Price (NGN)")} <InfoTip id="tierPrice" /></span>
                          <input type="number" className={styles.input} value={t.price} onChange={e => updateTicket(i, 'price', Number(e.target.value))} min={0} />
                        </label>
                        <label className={styles.label}>
                          <span className="fieldLabelRow">{tt("ui.quantity.44f6", "Quantity")} <InfoTip id="tierQuantity" /></span>
                          <input type="number" className={styles.input} value={t.quantity} onChange={e => updateTicket(i, 'quantity', Number(e.target.value))} min={1} />
                        </label>
                      </div>
                      <label className={styles.label}>
                        <span className="fieldLabelRow">{tt("ui.perks.f6d5", "Perks")} <span className={styles.optional}>{tt("ui.comma.separated.96a0", "(comma or • separated)")}</span> <InfoTip id="tierPerks" /></span>
                        <input type="text" className={styles.input} value={t.perks} onChange={e => updateTicket(i, 'perks', e.target.value)} placeholder={tt("ui.front.row.seating.welcome.4c12", "Front-row seating • Welcome drink")} />
                      </label>
                      {formData.ticket_types.length > 1 && <button className={styles.removeRowBtn} onClick={() => removeTicket(i)} type="button">
                          <FaTrash /> {tt("ui.remove.tier.df02", "Remove tier")}
                        </button>}
                    </div>)}
                </div>

                <button className={styles.addRowBtn} onClick={addTicket} type="button">
                  <FaPlus /> {tt("ui.add.tier.9990", "Add tier")}
                </button>
              </div>}

            {/* STEP 4 */}
            {step === 4 && <div className={styles.formStep}>
                <h2 className={styles.stepTitle}>{tt("ui.sponsors.vendors.6747", "Sponsors & vendors")}<InfoTip id="sponsorName" /></h2>
                <p className={styles.stepSub}>
                  {tt("ui.add.sponsor.logos.invite.b5a3", "Add sponsor logos and invite vendors to the on-site marketplace.")}
                </p>

                <div className={styles.subsection}>
                  <h3 className={styles.subTitle}>{tt("ui.sponsors.82ce", "Sponsors")}</h3>
                  {formData.sponsors.length === 0 ? <p className={styles.muted}>{tt("ui.no.sponsors.added.yet.f7ad", "No sponsors added yet.")}</p> : <div className={styles.itemList}>
                      {formData.sponsors.map((s, i) => <div key={i} className={styles.itemRow}>
                          <input type="text" className={styles.input} value={s.name} onChange={e => updateSponsor(i, 'name', e.target.value)} placeholder={tt("ui.sponsor.name.b3cf", "Sponsor name")} />
                          <input type="url" className={styles.input} value={s.logo_url} onChange={e => updateSponsor(i, 'logo_url', e.target.value)} placeholder={tt("ui.logo.url.optional.eb8d", "Logo URL (optional)")} />
                          <button className={styles.iconRemove} onClick={() => removeSponsor(i)} type="button" aria-label={tt("ui.remove.sponsor.c5c0", "Remove sponsor")}><FaTrash /></button>
                        </div>)}
                    </div>}
                  <button className={styles.addRowBtn} onClick={addSponsor} type="button">
                    <FaPlus /> {tt("ui.add.sponsor.581e", "Add sponsor")}
                  </button>
                </div>

                <div className={styles.subsection}>
                  <h3 className={styles.subTitle}>{tt("ui.vendor.invites.8649", "Vendor invites")}</h3>
                  {formData.vendor_invites.length === 0 ? <p className={styles.muted}>{tt("ui.no.vendors.invited.yet.f401", "No vendors invited yet.")}</p> : <div className={styles.itemList}>
                      {formData.vendor_invites.map((v, i) => <div key={i} className={styles.vendorInviteRow}>
                          <input type="text" className={styles.input} value={v.name} onChange={e => updateVendor(i, 'name', e.target.value)} placeholder={tt("ui.vendor.name.a558", "Vendor name")} />
                          <input type="email" className={styles.input} value={v.email} onChange={e => updateVendor(i, 'email', e.target.value)} placeholder={tt("ui.email.84ad", "Email")} />
                          <input type="text" className={styles.input} value={v.booth} onChange={e => updateVendor(i, 'booth', e.target.value)} placeholder={tt("ui.booth.e.g.b.d8a4", "Booth (e.g. B-14)")} />
                          <button className={styles.iconRemove} onClick={() => removeVendor(i)} type="button" aria-label={tt("ui.remove.vendor.d65d", "Remove vendor")}><FaTrash /></button>
                        </div>)}
                    </div>}
                  <button className={styles.addRowBtn} onClick={addVendor} type="button">
                    <FaPlus /> {tt("ui.invite.vendor.1982", "Invite vendor")}
                  </button>
                </div>

                <div className={styles.subsection}>
                  <h3 className={styles.subTitle}>{tt("ui.social.links.52e0", "Social links")}</h3>
                  <div className={styles.formRow}>
                    <label className={styles.label}>
                      <span className="fieldLabelRow">{tt("ui.twitter.x.a0b4", "Twitter / X")} <InfoTip id="socialLinks" /></span>
                      <input type="url" className={styles.input} value={formData.social_links.twitter} onChange={e => updateNested('social_links', 'twitter', e.target.value)} placeholder={tt("ui.https.twitter.com.889c", "https://twitter.com/…")} />
                    </label>
                    <label className={styles.label}>
                      {tt("ui.instagram.5721", "Instagram")}
                      <input type="url" className={styles.input} value={formData.social_links.instagram} onChange={e => updateNested('social_links', 'instagram', e.target.value)} placeholder={tt("ui.https.instagram.com.0a19", "https://instagram.com/…")} />
                    </label>
                    <label className={styles.label}>
                      {tt("ui.youtube.5588", "YouTube")}
                      <input type="url" className={styles.input} value={formData.social_links.youtube} onChange={e => updateNested('social_links', 'youtube', e.target.value)} placeholder={tt("ui.https.youtube.com.b465", "https://youtube.com/…")} />
                    </label>
                  </div>
                </div>
              </div>}

            {/* STEP 5 - Review */}
            {step === 5 && <div className={styles.formStep}>
                <h2 className={styles.stepTitle}>{tt("ui.review.e29a", "Review")}</h2>
                <p className={styles.stepSub}>
                  {tt("ui.final.check.can.still.c2a5", "Final check. You can still go back to edit any section.")}
                </p>

                <div className={styles.reviewGrid}>
                  <div className={styles.reviewCard}>
                    <p className={styles.reviewLabel}>{tt("ui.event.ad89", "Event")}</p>
                    <p className={styles.reviewValue}>{formData.name || '-'}</p>
                    <p className={styles.reviewSub}>{tx(formData.description)}</p>
                    <p className={styles.reviewSub}>{tt("ui.game.b008", "Game:")} {formData.game_title || '-'}</p>
                  </div>

                  <div className={styles.reviewCard}>
                    <p className={styles.reviewLabel}>{tt("ui.format.041a", "Format")}</p>
                    <p className={styles.reviewValue} style={{
                  textTransform: 'capitalize'
                }}>
                      {formData.event_type}
                    </p>
                    <p className={styles.reviewSub}>
                      {formData.event_type !== 'virtual' && formData.location}
                      {formData.event_type !== 'virtual' && formData.event_type !== 'physical' && ' • '}
                      {formData.event_type !== 'physical' && formData.virtual_link}
                    </p>
                  </div>

                  <div className={styles.reviewCard}>
                    <p className={styles.reviewLabel}>{tt("ui.when.769b", "When")}</p>
                    <p className={styles.reviewValue}>
                      {formData.start_date && new Date(formData.start_date).toLocaleString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                    </p>
                    <p className={styles.reviewSub}>
                      to {formData.end_date && new Date(formData.end_date).toLocaleString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                    </p>
                  </div>

                  <div className={styles.reviewCard}>
                    <p className={styles.reviewLabel}>{tt("ui.capacity.45bd", "Capacity")}</p>
                    <p className={styles.reviewValue}>{Number(formData.capacity).toLocaleString()}</p>
                    <p className={styles.reviewSub}>{formData.ticket_types.length} {tt("ui.ticket.tier.4cbf", "ticket tier")}{formData.ticket_types.length === 1 ? '' : 's'}</p>
                  </div>

                  <div className={`${styles.reviewCard} ${styles.reviewCardWide}`}>
                    <p className={styles.reviewLabel}>{tt("ui.tickets.5c62", "Tickets")}</p>
                    <ul className={styles.reviewList}>
                      {formData.ticket_types.map(t => <li key={t.id}>
                          <span><strong>{t.name || 'Untitled'}</strong></span>
                          <span>₦{Number(t.price).toLocaleString()} • {t.quantity} {tt("ui.available.7b23", "available")}</span>
                        </li>)}
                    </ul>
                  </div>

                  {formData.sponsors.length > 0 && <div className={`${styles.reviewCard} ${styles.reviewCardWide}`}>
                      <p className={styles.reviewLabel}>{tt("ui.sponsors.82ce", "Sponsors")}</p>
                      <p className={styles.reviewValue}>
                        {formData.sponsors.map(s => s.name).filter(Boolean).join(' • ')}
                      </p>
                    </div>}

                  {formData.vendor_invites.length > 0 && <div className={`${styles.reviewCard} ${styles.reviewCardWide}`}>
                      <p className={styles.reviewLabel}>{tt("ui.vendor.invites.8649", "Vendor invites")}</p>
                      <ul className={styles.reviewList}>
                        {formData.vendor_invites.map((v, i) => <li key={i}>
                            <span>{v.name || 'Unnamed'}</span>
                            <span>{v.email}</span>
                          </li>)}
                      </ul>
                    </div>}
                </div>

                {errors.submit && <div className={styles.errorMsg}>
                    <FaExclamationCircle /> {errors.submit}
                  </div>}
              </div>}

            {/* Footer nav */}
            <div className={styles.cardFooter}>
              <button className={styles.secondaryBtn} onClick={goBack} type="button" disabled={step === 1}>
                {tt("ui.back.b52b", "Back")}
              </button>
              <span className={styles.stepCounter}>
                {tt("ui.step.dc41", "Step")} {step} of {STEPS.length}
              </span>
              {step < 5 ? <button className={`${styles.primaryBtn} redBTN`} onClick={goNext} type="button">
                  {tt("ui.next.2f04", "Next →")}
                </button> : <button className={`${styles.primaryBtn} goldBTN`} onClick={submit} disabled={submitting} type="button">
                  {submitting ? tx("Publishing…") : tx("Publish event")}
                </button>}
            </div>
          </div>
        </div>
      </main>

      <BottomMenu />
    </div>;
};
export default CreateEventPage;