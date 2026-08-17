'use client'

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import Image from 'next/image';
import { FiUpload, FiCheck, FiArrowLeft, FiArrowRight, FiSave, FiX, FiPlus } from 'react-icons/fi';
import { FaCheckCircle } from 'react-icons/fa';
import Sidebar from '@/components/sidebar/Sidebar';
import Header from '@/components/header/Header';
import MobileHeader from '@/components/mobile-header/MobileHeader';
import BottomMenu from '@/components/bottom-menu/BottomMenu';
import styles from './create-organization.module.css';

const STEPS = [
  { id: 1, label: 'Identity' },
  { id: 2, label: 'Brand' },
  { id: 3, label: 'Profile' },
  { id: 4, label: 'Contact' },
  { id: 5, label: 'Review' },
];

const REGION_CHOICES = ['Nigeria', 'Ghana', 'Kenya', 'South Africa', 'Egypt', 'All Africa'];
const FOCUS_CHOICES = [
  { id: 'esports', label: 'Esports' },
  { id: 'events', label: 'Events' },
  { id: 'streaming', label: 'Streaming' },
  { id: 'agency', label: 'Agency' },
];
const SOCIAL_PRESETS = ['Twitter', 'Instagram', 'Discord', 'YouTube', 'Twitch', 'Website'];

const DRAFT_KEY = 'v-ent.org.create.draft';

const emptyForm = () => ({
  name: '',
  tag: '',
  bio: '',
  region: '',
  focus: '',
  contact_email: '',
  location: '',
  social_links: [{ title: 'Twitter', url: '' }],
});

const CreateOrganizationContent = () => {
  const router = useRouter();
  const { data: session } = useSession();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [toast, setToast] = useState('');

  const [formData, setFormData] = useState(emptyForm());
  const [logoPreview, setLogoPreview] = useState(null);
  const [bannerPreview, setBannerPreview] = useState(null);
  const logoInputRef = useRef(null);
  const bannerInputRef = useRef(null);

  // ── Load draft on first mount ──
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const draft = JSON.parse(raw);
        if (draft?.formData) setFormData({ ...emptyForm(), ...draft.formData });
        if (draft?.logoPreview) setLogoPreview(draft.logoPreview);
        if (draft?.bannerPreview) setBannerPreview(draft.bannerPreview);
        if (draft?.step) setStep(draft.step);
      }
    } catch { /* ignore */ }
  }, []);

  const showToast = (msg) => {
    setToast(msg);
    window.setTimeout(() => setToast(''), 2200);
  };

  const update = (key, value) => setFormData((prev) => ({ ...prev, [key]: value }));

  const updateSocial = (i, key, value) => {
    setFormData((prev) => {
      const next = [...(prev.social_links || [])];
      next[i] = { ...next[i], [key]: value };
      return { ...prev, social_links: next };
    });
  };

  const addSocialRow = () => {
    setFormData((prev) => ({
      ...prev,
      social_links: [...(prev.social_links || []), { title: 'Website', url: '' }],
    }));
  };

  const removeSocialRow = (i) => {
    setFormData((prev) => ({
      ...prev,
      social_links: (prev.social_links || []).filter((_, idx) => idx !== i),
    }));
  };

  const onLogoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoPreview(URL.createObjectURL(file));
  };

  const onBannerChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBannerPreview(URL.createObjectURL(file));
  };

  const validateStep = () => {
    if (step === 1) {
      if (!formData.name.trim() || !formData.tag.trim()) {
        setErrorMsg('Name and tag are required.');
        return false;
      }
      if (formData.tag.length < 2 || formData.tag.length > 5) {
        setErrorMsg('Tag must be 2-5 characters.');
        return false;
      }
    }
    if (step === 3) {
      if (!formData.bio.trim()) {
        setErrorMsg('Add a short bio.');
        return false;
      }
      if (!formData.region) {
        setErrorMsg('Pick a region.');
        return false;
      }
      if (!formData.focus) {
        setErrorMsg('Pick a focus area.');
        return false;
      }
    }
    if (step === 4) {
      if (formData.contact_email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(formData.contact_email)) {
        setErrorMsg('Enter a valid contact email.');
        return false;
      }
    }
    setErrorMsg(null);
    return true;
  };

  const next = () => {
    if (!validateStep()) return;
    setStep((s) => Math.min(s + 1, STEPS.length));
  };

  const back = () => setStep((s) => Math.max(s - 1, 1));

  const saveDraft = () => {
    try {
      const draft = {
        formData,
        logoPreview,
        bannerPreview,
        step,
        savedAt: new Date().toISOString(),
      };
      window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      showToast('Draft saved.');
    } catch {
      showToast('Could not save draft.');
    }
  };

  const clearDraft = () => {
    try { window.localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
  };

  const submit = async () => {
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (session?.user?.sessionToken) {
        headers['Authorization'] = `Bearer ${session.user.sessionToken}`;
      }
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/organization/create/`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          ...formData,
          logo: logoPreview || undefined,
          banner: bannerPreview || undefined,
        }),
      });
      clearDraft();
      router.push('/organizations?created=true');
    } catch (err) {
      setErrorMsg(err.message || 'Failed to create org.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.pageContainer}>
      <Header />
      <MobileHeader />

      <main className={styles.mainContainer}>
        <Sidebar />

        <div className={styles.rightPaneContainer}>
          <div className={styles.wizardHeader}>
            <div>
              <h1 className={styles.wizardTitle}>Create Organization</h1>
              <p className={styles.wizardSubtitle}>
                Launch your org - teams, tournaments, and brand in one flow.
              </p>
            </div>
            <div className={styles.headerActions}>
              <button type="button" className={styles.draftBtn} onClick={saveDraft}>
                <FiSave /> Save draft
              </button>
              <Link href="/organizations" className={styles.cancelLink}>
                Cancel
              </Link>
            </div>
          </div>

          {/* ── Progress ── */}
          <div className={styles.progressBar}>
            {STEPS.map((s, idx) => (
              <div
                key={s.id}
                className={`${styles.progressStep} ${step >= s.id ? styles.progressActive : ''} ${
                  step === s.id ? styles.progressCurrent : ''
                }`}
              >
                <div className={styles.progressDot}>
                  {step > s.id ? <FiCheck /> : s.id}
                </div>
                <span className={styles.progressLabel}>{s.label}</span>
                {idx < STEPS.length - 1 && <div className={styles.progressLine} />}
              </div>
            ))}
          </div>

          <div className={styles.formCard}>
            {step === 1 && (
              <div className={styles.formSection}>
                <h2 className={styles.sectionTitle}>Identity</h2>
                <p className={styles.sectionSub}>Start with your org&apos;s name and a short tag.</p>

                <div className={styles.field}>
                  <label className={styles.fieldLabel}>Organization name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => update('name', e.target.value)}
                    placeholder="Vermillion Esports"
                    className={styles.input}
                  />
                </div>

                <div className={styles.field}>
                  <label className={styles.fieldLabel}>Tag</label>
                  <input
                    type="text"
                    value={formData.tag}
                    onChange={(e) => update('tag', e.target.value.toUpperCase())}
                    placeholder="VMN"
                    maxLength={5}
                    className={styles.input}
                  />
                  <span className={styles.helpText}>2-5 character shorthand shown across the platform.</span>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className={styles.formSection}>
                <h2 className={styles.sectionTitle}>Brand</h2>
                <p className={styles.sectionSub}>Drop your logo and banner. You can update them anytime.</p>

                <div className={styles.field}>
                  <label className={styles.fieldLabel}>Logo</label>
                  <div className={styles.uploadRow}>
                    <div className={styles.logoPreview}>
                      {logoPreview ? (
                        <Image src={logoPreview} alt="Logo preview" width={80} height={80} />
                      ) : (
                        <span className={styles.logoPlaceholder}>Logo</span>
                      )}
                    </div>
                    <div className={styles.uploadColumn}>
                      <button
                        type="button"
                        className={styles.uploadBtn}
                        onClick={() => logoInputRef.current?.click()}
                      >
                        <FiUpload /> Upload logo
                      </button>
                      {logoPreview && (
                        <button
                          type="button"
                          className={styles.uploadGhost}
                          onClick={() => setLogoPreview(null)}
                        >
                          <FiX /> Remove
                        </button>
                      )}
                      <input
                        ref={logoInputRef}
                        type="file"
                        accept="image/*"
                        onChange={onLogoChange}
                        style={{ display: 'none' }}
                      />
                    </div>
                  </div>
                </div>

                <div className={styles.field}>
                  <label className={styles.fieldLabel}>Banner</label>
                  <div className={styles.bannerPreview}>
                    {bannerPreview ? (
                      <Image
                        src={bannerPreview}
                        alt="Banner preview"
                        fill
                        sizes="100vw"
                        style={{ objectFit: 'cover' }}
                      />
                    ) : (
                      <span className={styles.bannerPlaceholder}>Banner preview</span>
                    )}
                  </div>
                  <div className={styles.uploadColumn}>
                    <button
                      type="button"
                      className={styles.uploadBtn}
                      onClick={() => bannerInputRef.current?.click()}
                    >
                      <FiUpload /> Upload banner
                    </button>
                    {bannerPreview && (
                      <button
                        type="button"
                        className={styles.uploadGhost}
                        onClick={() => setBannerPreview(null)}
                      >
                        <FiX /> Remove
                      </button>
                    )}
                    <input
                      ref={bannerInputRef}
                      type="file"
                      accept="image/*"
                      onChange={onBannerChange}
                      style={{ display: 'none' }}
                    />
                  </div>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className={styles.formSection}>
                <h2 className={styles.sectionTitle}>Profile</h2>
                <p className={styles.sectionSub}>Tell people what your org does.</p>

                <div className={styles.field}>
                  <label className={styles.fieldLabel}>Bio</label>
                  <textarea
                    value={formData.bio}
                    onChange={(e) => update('bio', e.target.value)}
                    placeholder="What does your org do, who is it for, and what's your edge?"
                    className={styles.textarea}
                    rows={4}
                  />
                </div>

                <div className={styles.field}>
                  <label className={styles.fieldLabel}>Region</label>
                  <div className={styles.chipRow}>
                    {REGION_CHOICES.map((r) => (
                      <button
                        key={r}
                        type="button"
                        className={`${styles.chip} ${formData.region === r ? styles.chipActive : ''}`}
                        onClick={() => update('region', r)}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>

                <div className={styles.field}>
                  <label className={styles.fieldLabel}>Focus</label>
                  <div className={styles.chipRow}>
                    {FOCUS_CHOICES.map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        className={`${styles.chip} ${formData.focus === f.id ? styles.chipActive : ''}`}
                        onClick={() => update('focus', f.id)}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className={styles.formSection}>
                <h2 className={styles.sectionTitle}>Contact &amp; Social</h2>
                <p className={styles.sectionSub}>Where can people reach you?</p>

                <div className={styles.field}>
                  <label className={styles.fieldLabel}>Contact email</label>
                  <input
                    type="email"
                    value={formData.contact_email}
                    onChange={(e) => update('contact_email', e.target.value)}
                    placeholder="hello@your-org.com"
                    className={styles.input}
                  />
                </div>

                <div className={styles.field}>
                  <label className={styles.fieldLabel}>Location</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => update('location', e.target.value)}
                    placeholder="Lagos, Nigeria"
                    className={styles.input}
                  />
                </div>

                <div className={styles.field}>
                  <div className={styles.fieldHeader}>
                    <label className={styles.fieldLabel}>Social links</label>
                    <button type="button" className={styles.addBtn} onClick={addSocialRow}>
                      <FiPlus /> Add link
                    </button>
                  </div>
                  <div className={styles.socialRows}>
                    {(formData.social_links || []).map((link, i) => (
                      <div key={i} className={styles.socialRow}>
                        <select
                          value={link.title || 'Twitter'}
                          onChange={(e) => updateSocial(i, 'title', e.target.value)}
                          className={styles.socialSelect}
                        >
                          {SOCIAL_PRESETS.map((p) => (
                            <option key={p} value={p}>{p}</option>
                          ))}
                        </select>
                        <input
                          type="url"
                          value={link.url || ''}
                          onChange={(e) => updateSocial(i, 'url', e.target.value)}
                          placeholder="https://…"
                          className={styles.input}
                        />
                        <button
                          type="button"
                          className={styles.removeRowBtn}
                          onClick={() => removeSocialRow(i)}
                          aria-label="Remove link"
                        >
                          <FiX />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {step === 5 && (
              <div className={styles.formSection}>
                <h2 className={styles.sectionTitle}>Review</h2>
                <p className={styles.sectionSub}>Make sure everything looks right before you launch.</p>

                <div className={styles.reviewGrid}>
                  <div className={styles.reviewRow}>
                    <span className={styles.reviewLabel}>Name</span>
                    <span className={styles.reviewValue}>{formData.name || '-'}</span>
                  </div>
                  <div className={styles.reviewRow}>
                    <span className={styles.reviewLabel}>Tag</span>
                    <span className={styles.reviewValue}>{formData.tag || '-'}</span>
                  </div>
                  <div className={styles.reviewRow}>
                    <span className={styles.reviewLabel}>Bio</span>
                    <span className={styles.reviewValue}>{formData.bio || '-'}</span>
                  </div>
                  <div className={styles.reviewRow}>
                    <span className={styles.reviewLabel}>Region</span>
                    <span className={styles.reviewValue}>{formData.region || '-'}</span>
                  </div>
                  <div className={styles.reviewRow}>
                    <span className={styles.reviewLabel}>Focus</span>
                    <span className={styles.reviewValue} style={{ textTransform: 'capitalize' }}>
                      {formData.focus || '-'}
                    </span>
                  </div>
                  <div className={styles.reviewRow}>
                    <span className={styles.reviewLabel}>Email</span>
                    <span className={styles.reviewValue}>{formData.contact_email || '-'}</span>
                  </div>
                  <div className={styles.reviewRow}>
                    <span className={styles.reviewLabel}>Location</span>
                    <span className={styles.reviewValue}>{formData.location || '-'}</span>
                  </div>
                  <div className={styles.reviewRow}>
                    <span className={styles.reviewLabel}>Social links</span>
                    <span className={styles.reviewValue}>
                      {(formData.social_links || []).filter((s) => s.url).length || 0} added
                    </span>
                  </div>
                </div>

                <div className={styles.reviewNotice}>
                  <FaCheckCircle /> You can edit any of this after launching your org.
                </div>
              </div>
            )}

            {errorMsg && <p className={styles.errorMsg}>{errorMsg}</p>}

            <div className={styles.navRow}>
              <button
                type="button"
                className={styles.secondaryBtn}
                onClick={back}
                disabled={step === 1}
              >
                <FiArrowLeft /> Back
              </button>

              {step < STEPS.length ? (
                <button type="button" className={styles.primaryBtn} onClick={next}>
                  Next <FiArrowRight />
                </button>
              ) : (
                <button
                  type="button"
                  className={styles.primaryBtn}
                  onClick={submit}
                  disabled={submitting}
                >
                  {submitting ? 'Launching…' : 'Launch Organization'}
                </button>
              )}
            </div>
          </div>
        </div>
      </main>

      <BottomMenu />

      {toast && <div className={styles.toast}>{toast}</div>}
    </div>
  );
};

const CreateOrganization = () => (
  <Suspense fallback={<p style={{ padding: '2rem', color: '#fff' }}>Loading…</p>}>
    <CreateOrganizationContent />
  </Suspense>
);

export default CreateOrganization;
