'use client';

import { useRef, useState } from 'react';
import shared from './editProfileShared.module.css';
import styles from './ProfileInfoPanel.module.css';

// Location is not chosen here any more. The server reads it from the address
// the first sign-in of each day arrives from, so the profile says where the
// person actually is rather than which of eight cities they once picked.
const describeLocation = (data = {}) => {
  const city = (data.state || '').trim();
  const country = (data.country || '').trim();
  if (city && country) return `${city}, ${country}`;
  return country || city || '';
};

const ProfileInfoPanel = ({ initialData = {}, onSave, onCancel, showToast }) => {
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
  const location = describeLocation(initialData);
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
    reader.onload = (e) => setPreview(e.target.result);
    reader.readAsDataURL(file);
  };

  const removeChip = (chip) => setInterests(interests.filter((c) => c !== chip));
  const addChip = (chip) => {
    const t = chip.trim();
    if (!t) return;
    if (interests.length >= 15) return;
    if (interests.includes(t)) return;
    setInterests([...interests, t]);
    setInterestSearch('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave?.({
        username,
        full_name: profileName,
        description: bio,
        interests,
        profilePicFile: avatarFile,
        bannerFile,
        profilePicPreview: avatarPreview,
        bannerPreview,
      });
      showToast?.('Profile saved');
    } catch (err) {
      showToast?.('Save failed');
    } finally {
      setSaving(false);
    }
  };

  const initials = (profileName || username || '?').split(' ').slice(0, 2).map((w) => w[0] || '').join('').toUpperCase();

  return (
    <form className={shared.formStack} onSubmit={handleSubmit}>
      {/* Profile Picture & Banner */}
      <div className={shared.card}>
        <h3 className={shared.cardTitle}>Profile Picture &amp; Banner</h3>

        <div className={styles.picRow}>
          <div className={styles.avatarCurrent}>
            {avatarPreview ? (
              <img src={avatarPreview} alt="Current avatar" />
            ) : (
              <div className={styles.avatarFallback}>{initials}</div>
            )}
          </div>
          <div className={styles.avatarActions}>
            <div className={styles.avatarBtnRow}>
              <button type="button" className={styles.iconBtn} onClick={() => avatarInputRef.current?.click()}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                Change
              </button>
              <button type="button" className={`${styles.iconBtn} ${styles.iconBtnDanger}`} onClick={() => { setAvatarPreview(null); setAvatarFile(null); }} title="Remove avatar">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>
              </button>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className={styles.hiddenInput}
                onChange={(e) => handleFilePick(e.target.files?.[0], setAvatarPreview, setAvatarFile)}
              />
            </div>
            <span className={styles.helperText}>We recommend an image that is 256 x 256 px</span>
          </div>
        </div>

        <div className={styles.bannerZone} onClick={() => bannerInputRef.current?.click()}>
          {bannerPreview && <img src={bannerPreview} alt="Cover banner" />}
          <div className={styles.bannerOverlay}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
            Change banner
          </div>
          <input
            ref={bannerInputRef}
            type="file"
            accept="image/*"
            className={styles.hiddenInput}
            onChange={(e) => handleFilePick(e.target.files?.[0], setBannerPreview, setBannerFile)}
          />
        </div>
        <div className={`${styles.helperText} ${styles.bannerHelper}`}>We recommend an image that is 1258 x 256 px</div>
      </div>

      {/* Profile Details */}
      <div className={shared.card}>
        <h3 className={shared.cardTitle}>Profile Details</h3>

        <div className={shared.formGroup}>
          <label className={shared.formLabel} htmlFor="username">Username</label>
          <input
            className={shared.formInput}
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="@username"
          />
        </div>

        <div className={shared.formGroup}>
          <label className={shared.formLabel} htmlFor="profile-name">Profile Name</label>
          <input
            className={shared.formInput}
            id="profile-name"
            type="text"
            value={profileName}
            onChange={(e) => setProfileName(e.target.value)}
            placeholder="Your display name"
          />
        </div>

        <div className={shared.formGroup}>
          <label className={shared.formLabel} htmlFor="bio">Bio</label>
          <textarea
            className={shared.formTextarea}
            id="bio"
            maxLength={bioMax}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Tell others about yourself…"
          />
          <span className={shared.fieldHelper}>
            {bio.length === 0 ? `Maximum of ${bioMax} characters` : `${bioRemaining} characters remaining`}
          </span>
        </div>

        <div className={shared.formGroup}>
          <span className={shared.formLabel}>Location</span>
          <p className={styles.locationValue}>{location || 'Set on your next sign-in'}</p>
          <span className={styles.locationNote}>
            Taken from where you sign in, updated once a day.
          </span>
        </div>
      </div>

      {/* Interests */}
      <div className={shared.card}>
        <h3 className={shared.cardTitle}>Interests</h3>
        <p className={styles.interestSub}>You can choose up to 15 interests</p>

        <div className={shared.formGroup}>
          <div className={styles.searchInputWrap}>
            <svg className={styles.searchIco} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
            <input
              className={`${shared.formInput} ${styles.searchInput}`}
              type="text"
              placeholder="Search interests"
              value={interestSearch}
              onChange={(e) => setInterestSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addChip(interestSearch);
                }
              }}
            />
          </div>
        </div>

        <div className={styles.chipRow}>
          {interests.map((chip) => (
            <span className={styles.chip} key={chip}>
              {chip}
              <button type="button" className={styles.chipX} onClick={() => removeChip(chip)} aria-label={`Remove ${chip}`}>✕</button>
            </span>
          ))}
        </div>
      </div>

      <div className={shared.formFooter}>
        <button type="button" className={`${shared.btn} ${shared.ghostBTN}`} onClick={onCancel}>Cancel</button>
        <button type="submit" className={`${shared.btn} ${shared.redBTN}`} disabled={saving}>
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </form>
  );
};

export default ProfileInfoPanel;
