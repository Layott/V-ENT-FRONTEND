'use client';

import { apiMessage } from '@/lib/apiMessage';
import InfoTip from '@/components/info-tip/InfoTip';
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
import { useT } from '@/i18n/LanguageProvider';
import { useTx } from '@/i18n/LanguageProvider';
const STEPS = [{
  id: 1,
  label: 'Identity'
}, {
  id: 2,
  label: 'Brand'
}, {
  id: 3,
  label: 'Profile'
}, {
  id: 4,
  label: 'Contact'
}, {
  id: 5,
  label: 'Review'
}];
const REGION_CHOICES = ['Nigeria', 'Ghana', 'Kenya', 'South Africa', 'Egypt', 'All Africa'];
const FOCUS_CHOICES = [{
  id: 'esports',
  label: 'Esports'
}, {
  id: 'events',
  label: 'Events'
}, {
  id: 'streaming',
  label: 'Streaming'
}, {
  id: 'agency',
  label: 'Agency'
}];
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
  social_links: [{
    title: 'Twitter',
    url: ''
  }]
});
const CreateOrganizationContent = () => {
  const tx = useTx();
  const tt = useT();
  const router = useRouter();
  const {
    data: session
  } = useSession();
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
        if (draft?.formData) setFormData({
          ...emptyForm(),
          ...draft.formData
        });
        if (draft?.logoPreview) setLogoPreview(draft.logoPreview);
        if (draft?.bannerPreview) setBannerPreview(draft.bannerPreview);
        if (draft?.step) setStep(draft.step);
      }
    } catch {/* ignore */}
  }, []);
  const showToast = msg => {
    setToast(msg);
    window.setTimeout(() => setToast(''), 2200);
  };
  const update = (key, value) => setFormData(prev => ({
    ...prev,
    [key]: value
  }));
  const updateSocial = (i, key, value) => {
    setFormData(prev => {
      const next = [...(prev.social_links || [])];
      next[i] = {
        ...next[i],
        [key]: value
      };
      return {
        ...prev,
        social_links: next
      };
    });
  };
  const addSocialRow = () => {
    setFormData(prev => ({
      ...prev,
      social_links: [...(prev.social_links || []), {
        title: 'Website',
        url: ''
      }]
    }));
  };
  const removeSocialRow = i => {
    setFormData(prev => ({
      ...prev,
      social_links: (prev.social_links || []).filter((_, idx) => idx !== i)
    }));
  };
  const onLogoChange = e => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoPreview(URL.createObjectURL(file));
  };
  const onBannerChange = e => {
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
    setStep(s => Math.min(s + 1, STEPS.length));
  };
  const back = () => setStep(s => Math.max(s - 1, 1));
  const saveDraft = () => {
    try {
      const draft = {
        formData,
        logoPreview,
        bannerPreview,
        step,
        savedAt: new Date().toISOString()
      };
      window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      showToast(tt("msg.draftSaved", "Draft saved."));
    } catch {
      showToast(tt("msg.couldNotSaveDraft", "Could not save draft."));
    }
  };
  const clearDraft = () => {
    try {
      window.localStorage.removeItem(DRAFT_KEY);
    } catch {/* ignore */}
  };
  const submit = async () => {
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const headers = {
        'Content-Type': 'application/json'
      };
      if (session?.user?.sessionToken) {
        headers['Authorization'] = `Bearer ${session.user.sessionToken}`;
      }
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/organization/create/`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          ...formData,
          logo: logoPreview || undefined,
          banner: bannerPreview || undefined
        })
      });
      clearDraft();
      router.push('/organizations?created=true');
    } catch (err) {
      setErrorMsg(apiMessage(tt, err, "api.failedToCreateOrg", "Failed to create org."));
    } finally {
      setSubmitting(false);
    }
  };
  return <div className={styles.pageContainer}>
      <Header />
      <MobileHeader />

      <main className={styles.mainContainer}>
        <Sidebar />

        <div className={styles.rightPaneContainer}>
          <div className={styles.wizardHeader}>
            <div>
              <h1 className={styles.wizardTitle}>{tt("ui.create.organization.a194", "Create Organization")}</h1>
              <p className={styles.wizardSubtitle}>
                {tt("ui.launch.org.teams.tournaments.4f1c", "Launch your org - teams, tournaments, and brand in one flow.")}
              </p>
            </div>
            <div className={styles.headerActions}>
              <button type="button" className={styles.draftBtn} onClick={saveDraft}>
                <FiSave /> {tt("ui.save.draft.4f25", "Save draft")}
              </button>
              <Link href="/organizations" className={styles.cancelLink}>
                {tt("ui.cancel.77df", "Cancel")}
              </Link>
            </div>
          </div>

          {/* ── Progress ── */}
          <div className={styles.progressBar}>
            {STEPS.map((s, idx) => <div key={s.id} className={`${styles.progressStep} ${step >= s.id ? styles.progressActive : ''} ${step === s.id ? styles.progressCurrent : ''}`}>
                <div className={styles.progressDot}>
                  {step > s.id ? <FiCheck /> : s.id}
                </div>
                <span className={styles.progressLabel}>{tx(s.label)}</span>
                {idx < STEPS.length - 1 && <div className={styles.progressLine} />}
              </div>)}
          </div>

          <div className={styles.formCard}>
            {step === 1 && <div className={styles.formSection}>
                <h2 className={styles.sectionTitle}>{tt("ui.identity.7e5a", "Identity")}</h2>
                <p className={styles.sectionSub}>{tt("ui.start.with.org's.name.e7bb", "Start with your org's name and a short tag.")}</p>

                <div className={styles.field}>
                  <label className={styles.fieldLabel}><span className="fieldLabelRow">{tt("ui.organization.name.9eab", "Organization name")} <InfoTip id="orgName" /></span></label>
                  <input type="text" value={formData.name} onChange={e => update('name', e.target.value)} placeholder={tt("ui.vermillion.esports.718b", "Vermillion Esports")} className={styles.input} />
                </div>

                <div className={styles.field}>
                  <label className={styles.fieldLabel}><span className="fieldLabelRow">{tt("ui.tag.9829", "Tag")} <InfoTip id="orgTag" /></span></label>
                  <input type="text" value={formData.tag} onChange={e => update('tag', e.target.value.toUpperCase())} placeholder={tt("ui.vmn.8b68", "VMN")} maxLength={5} className={styles.input} />
                  <span className={styles.helpText}>{tt("ui.character.shorthand.shown.across.fb9f", "2-5 character shorthand shown across the platform.")}</span>
                </div>
              </div>}

            {step === 2 && <div className={styles.formSection}>
                <h2 className={styles.sectionTitle}>{tt("ui.brand.62b4", "Brand")}<InfoTip id="uploadImage" /></h2>
                <p className={styles.sectionSub}>{tt("ui.drop.logo.banner.can.ac3c", "Drop your logo and banner. You can update them anytime.")}</p>

                <div className={styles.field}>
                  <label className={styles.fieldLabel}><span className="fieldLabelRow">{tt("ui.logo.83fc", "Logo")} <InfoTip id="orgLogo" /></span></label>
                  <div className={styles.uploadRow}>
                    <div className={styles.logoPreview}>
                      {logoPreview ? <Image src={logoPreview} alt={tt("ui.logo.preview.1c71", "Logo preview")} width={80} height={80} /> : <span className={styles.logoPlaceholder}>{tt("ui.logo.83fc", "Logo")}</span>}
                    </div>
                    <div className={styles.uploadColumn}>
                      <button type="button" className={styles.uploadBtn} onClick={() => logoInputRef.current?.click()}>
                        <FiUpload /> {tt("ui.upload.logo.a564", "Upload logo")}
                      </button>
                      {logoPreview && <button type="button" className={styles.uploadGhost} onClick={() => setLogoPreview(null)}>
                          <FiX /> {tt("ui.remove.e963", "Remove")}
                        </button>}
                      <input ref={logoInputRef} type="file" accept="image/*" onChange={onLogoChange} style={{
                    display: 'none'
                  }} />
                    </div>
                  </div>
                </div>

                <div className={styles.field}>
                  <label className={styles.fieldLabel}><span className="fieldLabelRow">{tt("ui.banner.c8af", "Banner")} <InfoTip id="orgBanner" /></span></label>
                  <div className={styles.bannerPreview}>
                    {bannerPreview ? <Image src={bannerPreview} alt={tt("ui.banner.preview.abf9", "Banner preview")} fill sizes="100vw" style={{
                  objectFit: 'cover'
                }} /> : <span className={styles.bannerPlaceholder}>{tt("ui.banner.preview.abf9", "Banner preview")}</span>}
                  </div>
                  <div className={styles.uploadColumn}>
                    <button type="button" className={styles.uploadBtn} onClick={() => bannerInputRef.current?.click()}>
                      <FiUpload /> {tt("ui.upload.banner.abba", "Upload banner")}
                    </button>
                    {bannerPreview && <button type="button" className={styles.uploadGhost} onClick={() => setBannerPreview(null)}>
                        <FiX /> {tt("ui.remove.e963", "Remove")}
                      </button>}
                    <input ref={bannerInputRef} type="file" accept="image/*" onChange={onBannerChange} style={{
                  display: 'none'
                }} />
                  </div>
                </div>
              </div>}

            {step === 3 && <div className={styles.formSection}>
                <h2 className={styles.sectionTitle}>{tt("ui.profile.ff4f", "Profile")}</h2>
                <p className={styles.sectionSub}>{tt("ui.tell.people.what.org.01f9", "Tell people what your org does.")}</p>

                <div className={styles.field}>
                  <label className={styles.fieldLabel}><span className="fieldLabelRow">{tt("ui.bio.b31f", "Bio")} <InfoTip id="orgBio" /></span></label>
                  <textarea value={formData.bio} onChange={e => update('bio', e.target.value)} placeholder={tt("ui.what.does.org.do.b02b", "What does your org do, who is it for, and what's your edge?")} className={styles.textarea} rows={4} />
                </div>

                <div className={styles.field}>
                  <label className={styles.fieldLabel}><span className="fieldLabelRow">{tt("ui.region.0f21", "Region")} <InfoTip id="orgRegion" /></span></label>
                  <div className={styles.chipRow}>
                    {REGION_CHOICES.map(r => <button key={r} type="button" className={`${styles.chip} ${formData.region === r ? styles.chipActive : ''}`} onClick={() => update('region', r)}>
                        {r}
                      </button>)}
                  </div>
                </div>

                <div className={styles.field}>
                  <label className={styles.fieldLabel}>{tt("ui.focus.fe7f", "Focus")}</label>
                  <div className={styles.chipRow}>
                    {FOCUS_CHOICES.map(f => <button key={f.id} type="button" className={`${styles.chip} ${formData.focus === f.id ? styles.chipActive : ''}`} onClick={() => update('focus', f.id)}>
                        {tx(f.label)}
                      </button>)}
                  </div>
                </div>
              </div>}

            {step === 4 && <div className={styles.formSection}>
                <h2 className={styles.sectionTitle}>{tt("ui.contact.social.53b6", "Contact & Social")}<InfoTip id="orgSocial" /></h2>
                <p className={styles.sectionSub}>{tt("ui.where.can.people.reach.00ea", "Where can people reach you?")}</p>

                <div className={styles.field}>
                  <label className={styles.fieldLabel}><span className="fieldLabelRow">{tt("ui.contact.email.726a", "Contact email")} <InfoTip id="orgContactEmail" /></span></label>
                  <input type="email" value={formData.contact_email} onChange={e => update('contact_email', e.target.value)} placeholder={tt("ui.hello.org.com.2e3a", "hello@your-org.com")} className={styles.input} />
                </div>

                <div className={styles.field}>
                  <label className={styles.fieldLabel}><span className="fieldLabelRow">{tt("ui.location.d219", "Location")} <InfoTip id="orgLocation" /></span></label>
                  <input type="text" value={formData.location} onChange={e => update('location', e.target.value)} placeholder={tt("ui.lagos.nigeria.d50d", "Lagos, Nigeria")} className={styles.input} />
                </div>

                <div className={styles.field}>
                  <div className={styles.fieldHeader}>
                    <label className={styles.fieldLabel}>{tt("ui.social.links.52e0", "Social links")}</label>
                    <button type="button" className={styles.addBtn} onClick={addSocialRow}>
                      <FiPlus /> {tt("ui.add.link.538b", "Add link")}
                    </button>
                  </div>
                  <div className={styles.socialRows}>
                    {(formData.social_links || []).map((link, i) => <div key={i} className={styles.socialRow}>
                        <select value={link.title || 'Twitter'} onChange={e => updateSocial(i, 'title', e.target.value)} className={styles.socialSelect}>
                          {SOCIAL_PRESETS.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                        <input type="url" value={link.url || ''} onChange={e => updateSocial(i, 'url', e.target.value)} placeholder={tt("ui.https.1a66", "https://…")} className={styles.input} />
                        <button type="button" className={styles.removeRowBtn} onClick={() => removeSocialRow(i)} aria-label={tt("ui.remove.link.8d48", "Remove link")}>
                          <FiX />
                        </button>
                      </div>)}
                  </div>
                </div>
              </div>}

            {step === 5 && <div className={styles.formSection}>
                <h2 className={styles.sectionTitle}>{tt("ui.review.e29a", "Review")}</h2>
                <p className={styles.sectionSub}>{tt("ui.make.sure.everything.looks.d9e2", "Make sure everything looks right before you launch.")}</p>

                <div className={styles.reviewGrid}>
                  <div className={styles.reviewRow}>
                    <span className={styles.reviewLabel}>{tt("ui.name.709a", "Name")}</span>
                    <span className={styles.reviewValue}>{formData.name || '-'}</span>
                  </div>
                  <div className={styles.reviewRow}>
                    <span className={styles.reviewLabel}>{tt("ui.tag.9829", "Tag")}</span>
                    <span className={styles.reviewValue}>{formData.tag || '-'}</span>
                  </div>
                  <div className={styles.reviewRow}>
                    <span className={styles.reviewLabel}>{tt("ui.bio.b31f", "Bio")}</span>
                    <span className={styles.reviewValue}>{formData.bio || '-'}</span>
                  </div>
                  <div className={styles.reviewRow}>
                    <span className={styles.reviewLabel}>{tt("ui.region.0f21", "Region")}</span>
                    <span className={styles.reviewValue}>{formData.region || '-'}</span>
                  </div>
                  <div className={styles.reviewRow}>
                    <span className={styles.reviewLabel}>{tt("ui.focus.fe7f", "Focus")}</span>
                    <span className={styles.reviewValue} style={{
                  textTransform: 'capitalize'
                }}>
                      {formData.focus || '-'}
                    </span>
                  </div>
                  <div className={styles.reviewRow}>
                    <span className={styles.reviewLabel}>{tt("ui.email.84ad", "Email")}</span>
                    <span className={styles.reviewValue}>{formData.contact_email || '-'}</span>
                  </div>
                  <div className={styles.reviewRow}>
                    <span className={styles.reviewLabel}>{tt("ui.location.d219", "Location")}</span>
                    <span className={styles.reviewValue}>{formData.location || '-'}</span>
                  </div>
                  <div className={styles.reviewRow}>
                    <span className={styles.reviewLabel}>{tt("ui.social.links.52e0", "Social links")}</span>
                    <span className={styles.reviewValue}>
                      {(formData.social_links || []).filter(s => s.url).length || 0} {tt("ui.added.1724", "added")}
                    </span>
                  </div>
                </div>

                <div className={styles.reviewNotice}>
                  <FaCheckCircle /> {tt("ui.can.edit.any.after.e827", "You can edit any of this after launching your org.")}
                </div>
              </div>}

            {errorMsg && <p className={styles.errorMsg}>{errorMsg}</p>}

            <div className={styles.navRow}>
              <button type="button" className={styles.secondaryBtn} onClick={back} disabled={step === 1}>
                <FiArrowLeft /> {tt("ui.back.b52b", "Back")}
              </button>

              {step < STEPS.length ? <button type="button" className={styles.primaryBtn} onClick={next}>
                  {tt("ui.next.bc98", "Next")} <FiArrowRight />
                </button> : <button type="button" className={styles.primaryBtn} onClick={submit} disabled={submitting}>
                  {submitting ? tx("Launching…") : tx("Launch Organization")}
                </button>}
            </div>
          </div>
        </div>
      </main>

      <BottomMenu />

      {toast && <div className={styles.toast}>{toast}</div>}
    </div>;
};
const CreateOrganization = () => {
  const tt = useT();
  return <Suspense fallback={<p style={{
    padding: '2rem',
    color: '#fff'
  }}>{tt("ui.loading.33ce", "Loading…")}</p>}>
    <CreateOrganizationContent />
  </Suspense>;
};
export default CreateOrganization;