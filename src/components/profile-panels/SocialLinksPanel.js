'use client';

import styles from './SocialLinksPanel.module.css';

const detectKind = (title = '') => {
  const t = title.toLowerCase();
  if (t.includes('facebook')) return 'facebook';
  if (t.includes('instagram')) return 'instagram';
  if (t.includes('youtube')) return 'youtube';
  if (t.includes('twitter') || t === 'x') return 'x';
  if (t.includes('twitch')) return 'twitch';
  return 'link';
};

const Icon = ({ kind }) => {
  if (kind === 'facebook') return <svg viewBox="0 0 24 24" fill="#1877F2"><path d="M22 12a10 10 0 1 0-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.3c-1.2 0-1.6.8-1.6 1.5V12h2.8l-.5 2.9h-2.3v7A10 10 0 0 0 22 12z"/></svg>;
  if (kind === 'instagram') return (
    <svg viewBox="0 0 24 24" fill="none">
      <defs>
        <linearGradient id="igGrad2" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#fdc468" />
          <stop offset="0.5" stopColor="#df4996" />
          <stop offset="1" stopColor="#3023ae" />
        </linearGradient>
      </defs>
      <rect x="3" y="3" width="18" height="18" rx="5" fill="url(#igGrad2)" />
      <circle cx="12" cy="12" r="4" fill="none" stroke="#fff" strokeWidth="2" />
      <circle cx="17.5" cy="6.5" r="1.2" fill="#fff" />
    </svg>
  );
  if (kind === 'youtube') return <svg viewBox="0 0 24 24" fill="#FF0000"><path d="M23 7s-.2-1.6-.9-2.3c-.8-.9-1.7-.9-2.2-1C16.6 3.5 12 3.5 12 3.5s-4.6 0-7.9.2c-.5.1-1.4.1-2.2 1C1.2 5.4 1 7 1 7S.8 8.9.8 10.8v1.4c0 1.9.2 3.8.2 3.8s.2 1.6.9 2.3c.8.9 1.9.9 2.4 1 1.7.1 7.7.2 7.7.2s4.6 0 7.9-.2c.5-.1 1.4-.1 2.2-1 .7-.7.9-2.3.9-2.3s.2-1.9.2-3.8v-1.4C23.2 8.9 23 7 23 7zM10 14.5v-5l5 2.5-5 2.5z"/></svg>;
  if (kind === 'x') return <svg viewBox="0 0 24 24" fill="#fff"><path d="M18 3h3l-7.5 8.6L22 21h-6.5l-5-6.5L4.8 21H1.7l8-9.2L1 3h6.6l4.5 6 5.9-6z"/></svg>;
  if (kind === 'twitch') return <svg viewBox="0 0 24 24" fill="#9146FF"><path d="M4 2v18h6v3h3l3-3h5l5-5V2H4z"/></svg>;
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>;
};

const SocialLinksPanel = ({ socialLinks = [] }) => {
  return (
    <div className={styles.wrap}>
      <div className={styles.card}>
        <h3 className={styles.cardTitle}>Social Links</h3>
        {socialLinks.length === 0 ? (
          <p className={styles.empty}>No social links added.</p>
        ) : (
          <div className={styles.grid}>
            {socialLinks.map((s, idx) => (
              <a
                key={idx}
                href={s.url}
                target="_blank"
                rel="noreferrer noopener"
                className={styles.pill}
              >
                <span className={styles.icon}><Icon kind={detectKind(s.title)} /></span>
                {s.title}
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SocialLinksPanel;
