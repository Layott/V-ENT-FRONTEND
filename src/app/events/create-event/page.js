'use client'

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import {
  FaCheckCircle,
  FaExclamationCircle,
  FaPlus,
  FaTrash,
} from 'react-icons/fa';
import { IoArrowBack } from 'react-icons/io5';
import Header from '@/components/header/Header';
import MobileHeader from '@/components/mobile-header/MobileHeader';
import Sidebar from '@/components/sidebar/Sidebar';
import BottomMenu from '@/components/bottom-menu/BottomMenu';
import styles from './create-event.module.css';
import useGames from '@/hooks/useGames';

const STEPS = [
  { id: 1, label: 'Basic info' },
  { id: 2, label: 'Format & capacity' },
  { id: 3, label: 'Tickets / tiers' },
  { id: 4, label: 'Sponsors & vendors' },
  { id: 5, label: 'Review' },
];

const DRAFT_KEY = 'event_create_draft';

const emptyForm = {
  // Step 1 - Basic info
  name: '',
  description: '',
  banner_url: '',
  category: 'esports',
  game_title: '', // optional; backend resolves it to a Games row, null if unknown
  // Step 2 - Format & capacity
  event_type: 'physical',
  start_date: '',
  end_date: '',
  location: '',
  virtual_link: '',
  capacity: 500,
  // Step 3 - Tickets
  ticket_types: [
    { id: 'ga', name: 'General Admission', price: 2500, quantity: 200, perks: 'All-day entry • Standing area' },
  ],
  // Step 4 - Sponsors & vendors
  sponsors: [],
  vendor_invites: [],
  social_links: { twitter: '', instagram: '', youtube: '' },
};

const formatDateInput = (iso) => {
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
  // The games list is whatever rows the platform actually has.
  const { gameTitles: games } = useGames();
  const router = useRouter();
  const { data: session } = useSession();

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
        localStorage.setItem(DRAFT_KEY, JSON.stringify({ formData, step }));
        setAutosaved(true);
        setTimeout(() => setAutosaved(false), 1500);
      } catch (err) {
        console.error('Autosave error:', err);
      }
    }, 600);
    return () => clearTimeout(id);
  }, [formData, step, submitted]);

  const update = (key, value) => {
    setFormData((p) => ({ ...p, [key]: value }));
    setErrors((p) => ({ ...p, [key]: undefined }));
  };

  const updateNested = (key, subKey, value) => {
    setFormData((p) => ({ ...p, [key]: { ...(p[key] || {}), [subKey]: value } }));
  };

  const updateTicket = (idx, key, value) => {
    setFormData((p) => ({
      ...p,
      ticket_types: p.ticket_types.map((t, i) => (i === idx ? { ...t, [key]: value } : t)),
    }));
  };

  const addTicket = () => {
    setFormData((p) => ({
      ...p,
      ticket_types: [
        ...p.ticket_types,
        { id: `tier_${Date.now()}`, name: '', price: 0, quantity: 50, perks: '' },
      ],
    }));
  };

  const removeTicket = (idx) => {
    setFormData((p) => ({
      ...p,
      ticket_types: p.ticket_types.filter((_, i) => i !== idx),
    }));
  };

  const addSponsor = () =>
    setFormData((p) => ({ ...p, sponsors: [...p.sponsors, { name: '', logo_url: '' }] }));
  const updateSponsor = (idx, key, value) =>
    setFormData((p) => ({
      ...p,
      sponsors: p.sponsors.map((s, i) => (i === idx ? { ...s, [key]: value } : s)),
    }));
  const removeSponsor = (idx) =>
    setFormData((p) => ({ ...p, sponsors: p.sponsors.filter((_, i) => i !== idx) }));

  const addVendor = () =>
    setFormData((p) => ({
      ...p,
      vendor_invites: [...p.vendor_invites, { name: '', email: '', booth: '' }],
    }));
  const updateVendor = (idx, key, value) =>
    setFormData((p) => ({
      ...p,
      vendor_invites: p.vendor_invites.map((v, i) => (i === idx ? { ...v, [key]: value } : v)),
    }));
  const removeVendor = (idx) =>
    setFormData((p) => ({ ...p, vendor_invites: p.vendor_invites.filter((_, i) => i !== idx) }));

  const validateStep = (s) => {
    const e = {};
    if (s === 1) {
      if (!formData.name.trim()) e.name = 'Event name is required.';
      else if (formData.name.trim().length < 4) {
        e.name = 'Name must be at least 4 characters.';
      } else if (formData.name.trim().length > 40) {
        e.name = 'Name must be 40 characters or fewer.';
      }
      if (!formData.description.trim()) e.description = 'Description is required.';
    }
    if (s === 2) {
      if (!formData.start_date) e.start_date = 'Start date is required.';
      if (!formData.end_date) e.end_date = 'End date is required.';
      if (
        formData.start_date &&
        formData.end_date &&
        new Date(formData.end_date) < new Date(formData.start_date)
      ) {
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
        const bad = formData.ticket_types.find(
          (t) => !t.name || t.price < 0 || t.quantity < 1
        );
        if (bad) e.ticket_types = 'Each tier needs a name, valid price, and quantity ≥ 1.';
      }
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const goNext = () => {
    if (validateStep(step)) setStep((s) => Math.min(5, s + 1));
  };
  const goBack = () => setStep((s) => Math.max(1, s - 1));

  const saveDraft = () => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ formData, step }));
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
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/event/create-event/`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session?.user?.sessionToken || ''}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData),
        }
      );
      const data = await res.json();
      if (data.status === 'success') {
        if (typeof window !== 'undefined') localStorage.removeItem(DRAFT_KEY);
        setSubmitted(true);
        setTimeout(() => router.push('/events'), 2000);
      } else {
        setErrors({ submit: data.message || 'Failed to publish event.' });
      }
    } catch (err) {
      setErrors({ submit: 'Network error. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className={styles.pageContainer}>
        <Header />
        <MobileHeader />
        <main className={styles.mainContainer}>
          <Sidebar />
          <div className={styles.rightPaneContainer}>
            <div className={styles.successScreen}>
              <FaCheckCircle className={styles.successIcon} />
              <h2 className={styles.successTitle}>Event published</h2>
              <p className={styles.successSub}>
                <strong>{formData.name}</strong> is live. Redirecting to events listing…
              </p>
              <Link href="/events" className={`${styles.successBtn} goldBTN`}>
                Go to events now
              </Link>
            </div>
          </div>
        </main>
        <BottomMenu />
      </div>
    );
  }

  return (
    <div className={styles.pageContainer}>
      <Header />
      <MobileHeader />

      <main className={styles.mainContainer}>
        <Sidebar />

        <div className={styles.rightPaneContainer}>
          <Link href="/events" className={styles.backLink}>
            <IoArrowBack /> Back to events
          </Link>

          <div className={styles.headerRow}>
            <div>
              <h2 className={styles.pageTitle}>Create event</h2>
              <p className={styles.pageSub}>
                Set up tickets, schedule, sponsors and vendors. Save as draft anytime.
              </p>
            </div>
            <div className={styles.draftActions}>
              {autosaved && <span className={styles.autosaved}>Saved ✓</span>}
              <button
                className={styles.draftBtn}
                onClick={saveDraft}
                type="button"
              >
                Save draft
              </button>
              <button
                className={styles.discardBtn}
                onClick={discardDraft}
                type="button"
              >
                Discard
              </button>
            </div>
          </div>

          {/* Stepper */}
          <div className={styles.stepper}>
            {STEPS.map((s) => (
              <button
                key={s.id}
                className={`${styles.stepCell} ${step === s.id ? styles.stepCellActive : ''} ${step > s.id ? styles.stepCellDone : ''}`}
                onClick={() => {
                  if (s.id < step || validateStep(step)) setStep(s.id);
                }}
                type="button"
              >
                <span className={styles.stepBadge}>
                  {step > s.id ? <FaCheckCircle /> : s.id}
                </span>
                <span className={styles.stepLabel}>{s.label}</span>
              </button>
            ))}
          </div>

          <div className={styles.card}>
            {/* STEP 1 */}
            {step === 1 && (
              <div className={styles.formStep}>
                <h3 className={styles.stepTitle}>Basic info</h3>
                <p className={styles.stepSub}>
                  Tell people what the event is about. This shows up on the listing card and the hero banner.
                </p>

                <label className={styles.label}>
                  Event name
                  <input
                    type="text"
                    className={styles.input}
                    value={formData.name}
                    onChange={(e) => update('name', e.target.value)}
                    placeholder="e.g. V-ENT LAN Finals 2026"
                    maxLength={40}
                  />
                  {errors.name && <span className={styles.errorMsg}><FaExclamationCircle /> {errors.name}</span>}
                </label>

                <label className={styles.label}>
                  Description
                  <textarea
                    className={`${styles.input} ${styles.textarea}`}
                    value={formData.description}
                    onChange={(e) => update('description', e.target.value)}
                    placeholder="What can attendees expect? Highlight tournaments, performances, special guests…"
                    rows={5}
                  />
                  {errors.description && <span className={styles.errorMsg}><FaExclamationCircle /> {errors.description}</span>}
                </label>

                <label className={styles.label}>
                  Game <span className={styles.optional}>(optional)</span>
                  {games.length > 0 ? (
                    <select
                      className={styles.input}
                      value={formData.game_title}
                      onChange={(e) => update('game_title', e.target.value)}
                    >
                      <option value="">Select a game…</option>
                      {games.map((g) => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      className={styles.input}
                      value={formData.game_title}
                      onChange={(e) => update('game_title', e.target.value)}
                      placeholder="e.g. EA FC 25"
                    />
                  )}
                </label>

                <div className={styles.formRow}>
                  <label className={styles.label}>
                    Banner image URL <span className={styles.optional}>(optional)</span>
                    <input
                      type="url"
                      className={styles.input}
                      value={formData.banner_url}
                      onChange={(e) => update('banner_url', e.target.value)}
                      placeholder="https://…"
                    />
                  </label>

                  <label className={styles.label}>
                    Category
                    <select
                      className={styles.input}
                      value={formData.category}
                      onChange={(e) => update('category', e.target.value)}
                    >
                      <option value="esports">Esports</option>
                      <option value="anime">Anime</option>
                      <option value="concert">Concert / live music</option>
                      <option value="convention">Convention</option>
                      <option value="other">Other</option>
                    </select>
                  </label>
                </div>
              </div>
            )}

            {/* STEP 2 */}
            {step === 2 && (
              <div className={styles.formStep}>
                <h3 className={styles.stepTitle}>Format & capacity</h3>
                <p className={styles.stepSub}>
                  When and where? Pick the format, set the dates, and define capacity.
                </p>

                <div className={styles.label}>
                  Event format
                  <div className={styles.typeRow}>
                    {[
                      { id: 'physical', label: 'Physical', desc: 'In-person at a venue' },
                      { id: 'virtual', label: 'Virtual', desc: 'Online stream / link' },
                      { id: 'hybrid', label: 'Hybrid', desc: 'Both in-person + online' },
                    ].map((t) => (
                      <button
                        key={t.id}
                        className={`${styles.typeOption} ${formData.event_type === t.id ? styles.typeOptionActive : ''}`}
                        onClick={() => update('event_type', t.id)}
                        type="button"
                      >
                        <span className={styles.typeOptionLabel}>{t.label}</span>
                        <span className={styles.typeOptionDesc}>{t.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className={styles.formRow}>
                  <label className={styles.label}>
                    Start date & time
                    <input
                      type="datetime-local"
                      className={styles.input}
                      value={formatDateInput(formData.start_date)}
                      onChange={(e) => update('start_date', e.target.value)}
                    />
                    {errors.start_date && <span className={styles.errorMsg}><FaExclamationCircle /> {errors.start_date}</span>}
                  </label>
                  <label className={styles.label}>
                    End date & time
                    <input
                      type="datetime-local"
                      className={styles.input}
                      value={formatDateInput(formData.end_date)}
                      onChange={(e) => update('end_date', e.target.value)}
                    />
                    {errors.end_date && <span className={styles.errorMsg}><FaExclamationCircle /> {errors.end_date}</span>}
                  </label>
                </div>

                {formData.event_type !== 'virtual' && (
                  <label className={styles.label}>
                    Venue / location
                    <input
                      type="text"
                      className={styles.input}
                      value={formData.location}
                      onChange={(e) => update('location', e.target.value)}
                      placeholder="e.g. Landmark Centre, Lagos"
                    />
                    {errors.location && <span className={styles.errorMsg}><FaExclamationCircle /> {errors.location}</span>}
                  </label>
                )}

                {formData.event_type !== 'physical' && (
                  <label className={styles.label}>
                    Virtual link {formData.event_type === 'virtual' && '(required)'}
                    <input
                      type="url"
                      className={styles.input}
                      value={formData.virtual_link}
                      onChange={(e) => update('virtual_link', e.target.value)}
                      placeholder="https://twitch.tv/v-ent"
                    />
                    {errors.virtual_link && <span className={styles.errorMsg}><FaExclamationCircle /> {errors.virtual_link}</span>}
                  </label>
                )}

                <label className={styles.label}>
                  Capacity (max attendees)
                  <input
                    type="number"
                    className={styles.input}
                    value={formData.capacity}
                    onChange={(e) => update('capacity', Number(e.target.value))}
                    min={1}
                  />
                  {errors.capacity && <span className={styles.errorMsg}><FaExclamationCircle /> {errors.capacity}</span>}
                </label>
              </div>
            )}

            {/* STEP 3 */}
            {step === 3 && (
              <div className={styles.formStep}>
                <h3 className={styles.stepTitle}>Tickets / tiers</h3>
                <p className={styles.stepSub}>
                  Define what attendees can buy. Add as many tiers as you need.
                </p>

                {errors.ticket_types && (
                  <div className={styles.errorMsg}>
                    <FaExclamationCircle /> {errors.ticket_types}
                  </div>
                )}

                <div className={styles.tierList}>
                  {formData.ticket_types.map((t, i) => (
                    <div key={t.id} className={styles.tierRow}>
                      <div className={styles.tierGrid}>
                        <label className={styles.label}>
                          Tier name
                          <input
                            type="text"
                            className={styles.input}
                            value={t.name}
                            onChange={(e) => updateTicket(i, 'name', e.target.value)}
                            placeholder="e.g. VIP"
                          />
                        </label>
                        <label className={styles.label}>
                          Price (NGN)
                          <input
                            type="number"
                            className={styles.input}
                            value={t.price}
                            onChange={(e) => updateTicket(i, 'price', Number(e.target.value))}
                            min={0}
                          />
                        </label>
                        <label className={styles.label}>
                          Quantity
                          <input
                            type="number"
                            className={styles.input}
                            value={t.quantity}
                            onChange={(e) => updateTicket(i, 'quantity', Number(e.target.value))}
                            min={1}
                          />
                        </label>
                      </div>
                      <label className={styles.label}>
                        Perks <span className={styles.optional}>(comma or • separated)</span>
                        <input
                          type="text"
                          className={styles.input}
                          value={t.perks}
                          onChange={(e) => updateTicket(i, 'perks', e.target.value)}
                          placeholder="Front-row seating • Welcome drink"
                        />
                      </label>
                      {formData.ticket_types.length > 1 && (
                        <button
                          className={styles.removeRowBtn}
                          onClick={() => removeTicket(i)}
                          type="button"
                        >
                          <FaTrash /> Remove tier
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <button className={styles.addRowBtn} onClick={addTicket} type="button">
                  <FaPlus /> Add tier
                </button>
              </div>
            )}

            {/* STEP 4 */}
            {step === 4 && (
              <div className={styles.formStep}>
                <h3 className={styles.stepTitle}>Sponsors & vendors</h3>
                <p className={styles.stepSub}>
                  Add sponsor logos and invite vendors to the on-site marketplace.
                </p>

                <div className={styles.subsection}>
                  <h4 className={styles.subTitle}>Sponsors</h4>
                  {formData.sponsors.length === 0 ? (
                    <p className={styles.muted}>No sponsors added yet.</p>
                  ) : (
                    <div className={styles.itemList}>
                      {formData.sponsors.map((s, i) => (
                        <div key={i} className={styles.itemRow}>
                          <input
                            type="text"
                            className={styles.input}
                            value={s.name}
                            onChange={(e) => updateSponsor(i, 'name', e.target.value)}
                            placeholder="Sponsor name"
                          />
                          <input
                            type="url"
                            className={styles.input}
                            value={s.logo_url}
                            onChange={(e) => updateSponsor(i, 'logo_url', e.target.value)}
                            placeholder="Logo URL (optional)"
                          />
                          <button
                            className={styles.iconRemove}
                            onClick={() => removeSponsor(i)}
                            type="button"
                            aria-label="Remove sponsor"
                          ><FaTrash /></button>
                        </div>
                      ))}
                    </div>
                  )}
                  <button className={styles.addRowBtn} onClick={addSponsor} type="button">
                    <FaPlus /> Add sponsor
                  </button>
                </div>

                <div className={styles.subsection}>
                  <h4 className={styles.subTitle}>Vendor invites</h4>
                  {formData.vendor_invites.length === 0 ? (
                    <p className={styles.muted}>No vendors invited yet.</p>
                  ) : (
                    <div className={styles.itemList}>
                      {formData.vendor_invites.map((v, i) => (
                        <div key={i} className={styles.vendorInviteRow}>
                          <input
                            type="text"
                            className={styles.input}
                            value={v.name}
                            onChange={(e) => updateVendor(i, 'name', e.target.value)}
                            placeholder="Vendor name"
                          />
                          <input
                            type="email"
                            className={styles.input}
                            value={v.email}
                            onChange={(e) => updateVendor(i, 'email', e.target.value)}
                            placeholder="Email"
                          />
                          <input
                            type="text"
                            className={styles.input}
                            value={v.booth}
                            onChange={(e) => updateVendor(i, 'booth', e.target.value)}
                            placeholder="Booth (e.g. B-14)"
                          />
                          <button
                            className={styles.iconRemove}
                            onClick={() => removeVendor(i)}
                            type="button"
                            aria-label="Remove vendor"
                          ><FaTrash /></button>
                        </div>
                      ))}
                    </div>
                  )}
                  <button className={styles.addRowBtn} onClick={addVendor} type="button">
                    <FaPlus /> Invite vendor
                  </button>
                </div>

                <div className={styles.subsection}>
                  <h4 className={styles.subTitle}>Social links</h4>
                  <div className={styles.formRow}>
                    <label className={styles.label}>
                      Twitter / X
                      <input
                        type="url"
                        className={styles.input}
                        value={formData.social_links.twitter}
                        onChange={(e) => updateNested('social_links', 'twitter', e.target.value)}
                        placeholder="https://twitter.com/…"
                      />
                    </label>
                    <label className={styles.label}>
                      Instagram
                      <input
                        type="url"
                        className={styles.input}
                        value={formData.social_links.instagram}
                        onChange={(e) => updateNested('social_links', 'instagram', e.target.value)}
                        placeholder="https://instagram.com/…"
                      />
                    </label>
                    <label className={styles.label}>
                      YouTube
                      <input
                        type="url"
                        className={styles.input}
                        value={formData.social_links.youtube}
                        onChange={(e) => updateNested('social_links', 'youtube', e.target.value)}
                        placeholder="https://youtube.com/…"
                      />
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 5 - Review */}
            {step === 5 && (
              <div className={styles.formStep}>
                <h3 className={styles.stepTitle}>Review</h3>
                <p className={styles.stepSub}>
                  Final check. You can still go back to edit any section.
                </p>

                <div className={styles.reviewGrid}>
                  <div className={styles.reviewCard}>
                    <p className={styles.reviewLabel}>Event</p>
                    <p className={styles.reviewValue}>{formData.name || '-'}</p>
                    <p className={styles.reviewSub}>{formData.description}</p>
                    <p className={styles.reviewSub}>Game: {formData.game_title || '-'}</p>
                  </div>

                  <div className={styles.reviewCard}>
                    <p className={styles.reviewLabel}>Format</p>
                    <p className={styles.reviewValue} style={{ textTransform: 'capitalize' }}>
                      {formData.event_type}
                    </p>
                    <p className={styles.reviewSub}>
                      {formData.event_type !== 'virtual' && formData.location}
                      {formData.event_type !== 'virtual' && formData.event_type !== 'physical' && ' • '}
                      {formData.event_type !== 'physical' && formData.virtual_link}
                    </p>
                  </div>

                  <div className={styles.reviewCard}>
                    <p className={styles.reviewLabel}>When</p>
                    <p className={styles.reviewValue}>
                      {formData.start_date && new Date(formData.start_date).toLocaleString('en-GB', {
                        day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
                      })}
                    </p>
                    <p className={styles.reviewSub}>
                      to {formData.end_date && new Date(formData.end_date).toLocaleString('en-GB', {
                        day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
                      })}
                    </p>
                  </div>

                  <div className={styles.reviewCard}>
                    <p className={styles.reviewLabel}>Capacity</p>
                    <p className={styles.reviewValue}>{Number(formData.capacity).toLocaleString()}</p>
                    <p className={styles.reviewSub}>{formData.ticket_types.length} ticket tier{formData.ticket_types.length === 1 ? '' : 's'}</p>
                  </div>

                  <div className={`${styles.reviewCard} ${styles.reviewCardWide}`}>
                    <p className={styles.reviewLabel}>Tickets</p>
                    <ul className={styles.reviewList}>
                      {formData.ticket_types.map((t) => (
                        <li key={t.id}>
                          <span><strong>{t.name || 'Untitled'}</strong></span>
                          <span>₦{Number(t.price).toLocaleString()} • {t.quantity} available</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {formData.sponsors.length > 0 && (
                    <div className={`${styles.reviewCard} ${styles.reviewCardWide}`}>
                      <p className={styles.reviewLabel}>Sponsors</p>
                      <p className={styles.reviewValue}>
                        {formData.sponsors.map((s) => s.name).filter(Boolean).join(' • ')}
                      </p>
                    </div>
                  )}

                  {formData.vendor_invites.length > 0 && (
                    <div className={`${styles.reviewCard} ${styles.reviewCardWide}`}>
                      <p className={styles.reviewLabel}>Vendor invites</p>
                      <ul className={styles.reviewList}>
                        {formData.vendor_invites.map((v, i) => (
                          <li key={i}>
                            <span>{v.name || 'Unnamed'}</span>
                            <span>{v.email}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {errors.submit && (
                  <div className={styles.errorMsg}>
                    <FaExclamationCircle /> {errors.submit}
                  </div>
                )}
              </div>
            )}

            {/* Footer nav */}
            <div className={styles.cardFooter}>
              <button
                className={styles.secondaryBtn}
                onClick={goBack}
                type="button"
                disabled={step === 1}
              >
                Back
              </button>
              <span className={styles.stepCounter}>
                Step {step} of {STEPS.length}
              </span>
              {step < 5 ? (
                <button className={`${styles.primaryBtn} redBTN`} onClick={goNext} type="button">
                  Next →
                </button>
              ) : (
                <button
                  className={`${styles.primaryBtn} goldBTN`}
                  onClick={submit}
                  disabled={submitting}
                  type="button"
                >
                  {submitting ? 'Publishing…' : 'Publish event'}
                </button>
              )}
            </div>
          </div>
        </div>
      </main>

      <BottomMenu />
    </div>
  );
};

export default CreateEventPage;
