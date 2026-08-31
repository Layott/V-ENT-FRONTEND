'use client';

import { uploadHint } from '@/lib/uploadSpecs';
import InfoTip from '@/components/info-tip/InfoTip';
import { useEffect, useRef, useState } from 'react';
import shared from './editProfileShared.module.css';
import styles from './ProfileInfoPanel.module.css';
import { COUNTRIES, isKnownCountry } from '@/constants/countries';
import { useT } from '@/i18n/LanguageProvider';
import { useTx } from '@/i18n/LanguageProvider';

// Location IS chosen here. It was display-only, with a line saying it came from
// where you sign in - and an address places somebody in a country reliably and
// in a city barely at all. Nigerian mobile data routes through a handful of
// gateways, so a Lagos player read "Ilorin" on their own profile with no
// control anywhere to correct it.
//
// Now: the country is a list (the same list a tournament restricts by, so the
// two can be compared), the city is a plain field nobody guesses for you, and
// a country that was worked out from an address says so until it is confirmed.
const ProfileInfoPanel = ({
  initialData = {},
  onSave,
  onCancel,
  showToast,
  sessionToken = null
}) => {
  const tx = useTx();
  const tt = useT();
  const [avatarPreview, setAvatarPreview] = useState(initialData.profile_picture || initialData.profile_pic || null);
  const [bannerPreview, setBannerPreview] = useState(initialData.banner || initialData.banner_picture || null);
  // Actual File objects for real multipart upload (not DataURLs). Null when the
  // user hasn't picked a new image - in that case we don't send the field and
  // the backend keeps the existing image.
  const [avatarFile, setAvatarFile] = useState(null);
  const [bannerFile, setBannerFile] = useState(null);
  const [username, setUsername] = useState(initialData.username || '');
  const [profileName, setProfileName] = useState(initialData.full_name || initialData.fullname || '');
  const [bio, setBio] = useState(initialData.description || initialData.bio || '');
  const [country, setCountry] = useState(initialData.country || '');
  const [city, setCity] = useState(initialData.state || '');
  const countryIsGuess = !!initialData.country_is_guess && country === (initialData.country || '');
  // What the sign-in address looks like, offered rather than applied. The
  // platform will not write a city onto somebody's profile from an address -
  // a carrier gateway is a real place and it is not where the subscriber is -
  // but showing the guess and letting one press accept it is the honest use of
  // a value that might be right.
  const [suggested, setSuggested] = useState(null);

  useEffect(() => {
    // Only worth asking when there is a blank to fill or a guess to settle.
    // Somebody who has already said where they are is not asked again.
    if (city.trim() && !countryIsGuess) return undefined;
    const token = sessionToken;
    if (!token) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || ''}/settings/location-suggestion/`,
          { headers: { Authorization: `Bearer ${token}` } });
        const body = await res.json().catch(() => null);
        if (!cancelled && body?.status === 'success') setSuggested(body.data);
      } catch { /* no suggestion is a fine outcome; the fields still work */ }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionToken]);

  const offeredCity = (suggested?.city || '').trim();
  const showCityOffer = !!offeredCity && offeredCity !== city.trim();
  const [interests, setInterests] = useState(Array.isArray(initialData.interests) ? initialData.interests : []);
  const [interestSearch, setInterestSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const avatarInputRef = useRef(null);
  const bannerInputRef = useRef(null);
  const bioMax = 140;
  const bioRemaining = bioMax - bio.length;

  // Keep the real File for upload AND a DataURL preview for immediate display.
  const handleFilePick = (file, setPreview, setFile) => {
    if (!file) return;
    setFile(file);
    const reader = new FileReader();
    reader.onload = e => setPreview(e.target.result);
    reader.readAsDataURL(file);
  };
  const removeChip = chip => setInterests(interests.filter(c => c !== chip));
  const addChip = chip => {
    const t = chip.trim();
    if (!t) return;
    if (interests.length >= 15) return;
    if (interests.includes(t)) return;
    setInterests([...interests, t]);
    setInterestSearch('');
  };
  const handleSubmit = async e => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave?.({
        username,
        full_name: profileName,
        description: bio,
        country,
        state: city,
        interests,
        profilePicFile: avatarFile,
        bannerFile,
        profilePicPreview: avatarPreview,
        bannerPreview
      });
      showToast?.('Profile saved');
    } catch (err) {
      showToast?.('Save failed');
    } finally {
      setSaving(false);
    }
  };
  const initials = (profileName || username || '?').split(' ').slice(0, 2).map(w => w[0] || '').join('').toUpperCase();
  return <form className={shared.formStack} onSubmit={handleSubmit}>
      {/* Profile Picture & Banner */}
      <div className={shared.card}>
        <h3 className={shared.cardTitle}>{tt("ui.profile.picture.banner.ec34", "Profile Picture & Banner")}<InfoTip id="profilePicture" /></h3>

        <div className={styles.picRow}>
          <div className={styles.avatarCurrent}>
            {avatarPreview ? <img src={avatarPreview} alt={tt("ui.current.avatar.8634", "Current avatar")} /> : <div className={styles.avatarFallback}>{initials}</div>}
          </div>
          <div className={styles.avatarActions}>
            <div className={styles.avatarBtnRow}>
              <button type="button" className={styles.iconBtn} onClick={() => avatarInputRef.current?.click()}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>
                {tt("ui.change.64fb", "Change")}
              </button>
              <button type="button" className={`${styles.iconBtn} ${styles.iconBtnDanger}`} onClick={() => {
              setAvatarPreview(null);
              setAvatarFile(null);
            }} title={tt("ui.remove.avatar.58e0", "Remove avatar")}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6" /></svg>
              </button>
              <input ref={avatarInputRef} type="file" accept="image/*" className={styles.hiddenInput} onChange={e => handleFilePick(e.target.files?.[0], setAvatarPreview, setAvatarFile)} />
            </div>
            <span className={styles.helperText}>{uploadHint(tt, 'avatar')}</span>
          </div>
        </div>

        <div className={styles.bannerZone} onClick={() => bannerInputRef.current?.click()}>
          {bannerPreview && <img src={bannerPreview} alt={tt("ui.cover.banner.72b4", "Cover banner")} />}
          <div className={styles.bannerOverlay}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>
            {tt("ui.change.banner.0ad3", "Change banner")}
          </div>
          <input ref={bannerInputRef} type="file" accept="image/*" className={styles.hiddenInput} onChange={e => handleFilePick(e.target.files?.[0], setBannerPreview, setBannerFile)} />
        </div>
        <div className={`${styles.helperText} ${styles.bannerHelper}`}>{uploadHint(tt, 'banner')}</div>
      </div>

      {/* Profile Details */}
      <div className={shared.card}>
        <h3 className={shared.cardTitle}>{tt("ui.profile.details.5ea7", "Profile Details")}</h3>

        <div className={shared.formGroup}>
          <label className={shared.formLabel} htmlFor="username"><span className="fieldLabelRow">{tt("ui.username.84c2", "Username")} <InfoTip id="username" /></span></label>
          <input className={shared.formInput} id="username" type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder={tt("ui.username.4237", "@username")} />
        </div>

        <div className={shared.formGroup}>
          <label className={shared.formLabel} htmlFor="profile-name"><span className="fieldLabelRow">{tt("ui.profile.name.fb32", "Profile Name")} <InfoTip id="profileName" /></span></label>
          <input className={shared.formInput} id="profile-name" type="text" value={profileName} onChange={e => setProfileName(e.target.value)} placeholder={tt("ui.display.name.33a6", "Your display name")} />
        </div>

        <div className={shared.formGroup}>
          <label className={shared.formLabel} htmlFor="bio"><span className="fieldLabelRow">{tt("ui.bio.b31f", "Bio")} <InfoTip id="profileBio" /></span></label>
          <textarea className={shared.formTextarea} id="bio" maxLength={bioMax} value={bio} onChange={e => setBio(e.target.value)} placeholder={tt("ui.tell.others.about.yourself.514c", "Tell others about yourself…")} />
          <span className={shared.fieldHelper}>
            {bio.length === 0 ? `Maximum of ${bioMax} characters` : `${bioRemaining} characters remaining`}
          </span>
        </div>

        <div className={shared.formGroup}>
          <label className={shared.formLabel} htmlFor="country">
            {tt("ui.country.7b04", "Country")}
          </label>
          {/* A list, not a text box, and the same list a tournament restricts
              by: an event open to "Nigeria" compares against whatever is stored
              here, so free text on either side quietly turns away people who
              qualify. A value already saved that is not on the list stays
              selectable, so nobody's profile is silently blanked. */}
          <select className={shared.formInput} id="country" value={country}
                  onChange={e => setCountry(e.target.value)}>
            <option value="">{tt("ui.select.your.country.3d15", "Select your country")}</option>
            {country && !isKnownCountry(country) && <option value={country}>{country}</option>}
            {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          {countryIsGuess && <span className={styles.locationGuess}>
            {tt("ui.country.guessed.4e71",
                "We worked this out from your connection, so it may be wrong. Pick your country to settle it.")}
          </span>}
        </div>

        <div className={shared.formGroup}>
          <label className={shared.formLabel} htmlFor="city">
            {tt("ui.city.9a37", "City")}
          </label>
          <input className={shared.formInput} id="city" value={city} maxLength={120}
                 placeholder={tt("ui.city.placeholder.5e28", "Lagos")}
                 onChange={e => setCity(e.target.value)} />
          {showCityOffer && <button type="button" className={styles.cityOffer}
                                    onClick={() => setCity(offeredCity)}>
            {tt("ui.city.looks.like.2f64", "Looks like")} <strong>{offeredCity}</strong>.{' '}
            <span className={styles.cityOfferAction}>
              {tt("ui.city.use.it.8d70", "Use it")}
            </span>
          </button>}
          <span className={styles.locationNote}>
            {tt("ui.city.yours.to.set.8b39", "Only you set this. We never guess your city.")}
          </span>
        </div>
      </div>

      {/* Interests */}
      <div className={shared.card}>
        <h3 className={shared.cardTitle}>{tt("ui.interests.3fc5", "Interests")}<InfoTip id="interests" /></h3>
        <p className={styles.interestSub}>{tt("ui.can.choose.up.interests.ed38", "You can choose up to 15 interests")}</p>

        <div className={shared.formGroup}>
          <div className={styles.searchInputWrap}>
            <svg className={styles.searchIco} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>
            <input className={`${shared.formInput} ${styles.searchInput}`} type="text" placeholder={tt("ui.search.interests.2c19", "Search interests")} value={interestSearch} onChange={e => setInterestSearch(e.target.value)} onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addChip(interestSearch);
            }
          }} />
          </div>
        </div>

        <div className={styles.chipRow}>
          {interests.map(chip => <span className={styles.chip} key={chip}>
              {chip}
              <button type="button" className={styles.chipX} onClick={() => removeChip(chip)} aria-label={`Remove ${chip}`}>✕</button>
            </span>)}
        </div>
      </div>

      <div className={shared.formFooter}>
        <button type="button" className={`${shared.btn} ${shared.ghostBTN}`} onClick={onCancel}>{tt("ui.cancel.77df", "Cancel")}</button>
        <button type="submit" className={`${shared.btn} ${shared.redBTN}`} disabled={saving}>
          {saving ? tx("Saving…") : tx("Save changes")}
        </button>
      </div>
    </form>;
};
export default ProfileInfoPanel;