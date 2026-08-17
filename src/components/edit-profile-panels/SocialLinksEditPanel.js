'use client';

import { useState } from 'react';
import shared from './editProfileShared.module.css';
import styles from './SocialLinksEditPanel.module.css';

const SocialLinksEditPanel = ({ initialLinks = {}, initialCustom = [], onSave, onCancel, showToast }) => {
  const [facebook, setFacebook] = useState(initialLinks.facebook || '');
  const [twitter, setTwitter] = useState(initialLinks.twitter || initialLinks.x || '');
  const [instagram, setInstagram] = useState(initialLinks.instagram || '');
  const [youtube, setYoutube] = useState(initialLinks.youtube || '');
  const [customLinks, setCustomLinks] = useState(
    initialCustom.length > 0 ? initialCustom : [{ id: Date.now(), title: '', url: '' }]
  );
  const [saving, setSaving] = useState(false);

  const addCustomLink = () => {
    setCustomLinks([...customLinks, { id: Date.now() + Math.random(), title: '', url: '' }]);
  };

  const removeCustomLink = (id) => {
    setCustomLinks(customLinks.filter((l) => l.id !== id));
  };

  const updateCustomLink = (id, field, value) => {
    setCustomLinks(customLinks.map((l) => l.id === id ? { ...l, [field]: value } : l));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave?.({
        facebook,
        twitter,
        instagram,
        youtube,
        custom: customLinks.filter((l) => l.title || l.url),
      });
      showToast?.('Social links saved');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className={shared.formStack} onSubmit={handleSubmit}>
      <div className={shared.card}>
        <h3 className={shared.cardTitle}>Web and Social Links</h3>

        <div className={styles.socialStack}>
          <div className={styles.socialRow}>
            <div className={styles.socialLabelRow}>
              <div className={`${styles.socialIconWrap} ${styles.iconFacebook}`}>
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879V14.89h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.563V12h2.773l-.443 2.89h-2.33v6.989C18.343 21.128 22 16.991 22 12z"/></svg>
              </div>
              <label className={styles.socialLabel} htmlFor="fb-link">Facebook</label>
            </div>
            <input className={shared.formInput} id="fb-link" type="url" placeholder="https://www.facebook.com/" value={facebook} onChange={(e) => setFacebook(e.target.value)} />
          </div>

          <div className={styles.socialRow}>
            <div className={styles.socialLabelRow}>
              <div className={`${styles.socialIconWrap} ${styles.iconX}`}>
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              </div>
              <label className={styles.socialLabel} htmlFor="x-link">X (Twitter)</label>
            </div>
            <input className={shared.formInput} id="x-link" type="url" placeholder="https://x.com/" value={twitter} onChange={(e) => setTwitter(e.target.value)} />
          </div>

          <div className={styles.socialRow}>
            <div className={styles.socialLabelRow}>
              <div className={`${styles.socialIconWrap} ${styles.iconInstagram}`}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
              </div>
              <label className={styles.socialLabel} htmlFor="ig-link">Instagram</label>
            </div>
            <input className={shared.formInput} id="ig-link" type="url" placeholder="https://www.instagram.com/" value={instagram} onChange={(e) => setInstagram(e.target.value)} />
          </div>

          <div className={styles.socialRow}>
            <div className={styles.socialLabelRow}>
              <div className={`${styles.socialIconWrap} ${styles.iconYoutube}`}>
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
              </div>
              <label className={styles.socialLabel} htmlFor="yt-link">Youtube</label>
            </div>
            <input className={shared.formInput} id="yt-link" type="url" placeholder="https://www.youtube.com/" value={youtube} onChange={(e) => setYoutube(e.target.value)} />
          </div>
        </div>

        <div className={styles.divider} />

        <div className={styles.customLabel}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
          Custom Links
        </div>

        {customLinks.map((row) => (
          <div className={styles.customLinkRow} key={row.id}>
            <div className={styles.fieldBlock}>
              <label className={styles.fieldLabel}>Title</label>
              <input className={shared.formInput} type="text" placeholder="e.g YouTube, Instagram" value={row.title} onChange={(e) => updateCustomLink(row.id, 'title', e.target.value)} />
            </div>
            <div className={styles.fieldBlock}>
              <label className={styles.fieldLabel}>Link</label>
              <input className={shared.formInput} type="url" placeholder="https://" value={row.url} onChange={(e) => updateCustomLink(row.id, 'url', e.target.value)} />
            </div>
            <button type="button" className={styles.removeBtn} title="Remove" onClick={() => removeCustomLink(row.id)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>
            </button>
          </div>
        ))}

        <button type="button" className={styles.addLinkBtn} onClick={addCustomLink}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add another link
        </button>
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

export default SocialLinksEditPanel;
