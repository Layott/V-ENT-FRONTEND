'use client';

import { mediaUrl } from '@/lib/mediaUrl';
import styles from './OverviewPanel.module.css';
import { useT } from '@/i18n/LanguageProvider';
import { useTx } from '@/i18n/LanguageProvider';
const SocialIcon = ({
  kind
}) => {
  const map = {
    facebook: <svg viewBox="0 0 24 24" fill="#1877F2"><path d="M22 12a10 10 0 1 0-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.3c-1.2 0-1.6.8-1.6 1.5V12h2.8l-.5 2.9h-2.3v7A10 10 0 0 0 22 12z" /></svg>,
    instagram: <svg viewBox="0 0 24 24" fill="none">
        <defs>
          <linearGradient id="igGrad" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0" stopColor="#fdc468" />
            <stop offset="0.5" stopColor="#df4996" />
            <stop offset="1" stopColor="#3023ae" />
          </linearGradient>
        </defs>
        <rect x="3" y="3" width="18" height="18" rx="5" fill="url(#igGrad)" />
        <circle cx="12" cy="12" r="4" fill="none" stroke="#fff" strokeWidth="2" />
        <circle cx="17.5" cy="6.5" r="1.2" fill="#fff" />
      </svg>,
    x: <svg viewBox="0 0 24 24" fill="#fff"><path d="M18 3h3l-7.5 8.6L22 21h-6.5l-5-6.5L4.8 21H1.7l8-9.2L1 3h6.6l4.5 6 5.9-6z" /></svg>,
    twitter: <svg viewBox="0 0 24 24" fill="#fff"><path d="M18 3h3l-7.5 8.6L22 21h-6.5l-5-6.5L4.8 21H1.7l8-9.2L1 3h6.6l4.5 6 5.9-6z" /></svg>,
    youtube: <svg viewBox="0 0 24 24" fill="#FF0000"><path d="M23 7s-.2-1.6-.9-2.3c-.8-.9-1.7-.9-2.2-1C16.6 3.5 12 3.5 12 3.5s-4.6 0-7.9.2c-.5.1-1.4.1-2.2 1C1.2 5.4 1 7 1 7S.8 8.9.8 10.8v1.4c0 1.9.2 3.8.2 3.8s.2 1.6.9 2.3c.8.9 1.9.9 2.4 1 1.7.1 7.7.2 7.7.2s4.6 0 7.9-.2c.5-.1 1.4-.1 2.2-1 .7-.7.9-2.3.9-2.3s.2-1.9.2-3.8v-1.4C23.2 8.9 23 7 23 7zM10 14.5v-5l5 2.5-5 2.5z" /></svg>,
    twitch: <svg viewBox="0 0 24 24" fill="#9146FF"><path d="M4 2v18h6v3h3l3-3h5l5-5V2H4zm17 11l-3 3h-5l-3 3v-3H6V4h15v9zm-3-7v6h-2V6h2zm-5 0v6h-2V6h2z" /></svg>
  };
  return map[kind] || null;
};
const detectSocialKind = (title = '') => {
  const t = title.toLowerCase();
  if (t.includes('facebook')) return 'facebook';
  if (t.includes('instagram')) return 'instagram';
  if (t.includes('youtube')) return 'youtube';
  if (t.includes('twitter') || t === 'x') return 'x';
  if (t.includes('twitch')) return 'twitch';
  return 'twitter';
};
const OverviewPanel = ({
  interests = [],
  gamingAccounts = [],
  socialLinks = [],
  walletBalance = 0,
  penaltyPoints = 0,
  rank = null,
  tournamentsPlayed = 0,
  wins = 0,
  losses = 0,
  favoriteGames = [],
  achievements = [],
  isOwner = false,
  onAddGame,
  onSeeAll
}) => {
  const tx = useTx();
  const tt = useT();
  const visibleInterests = interests.slice(0, 9);
  const remainingInterests = Math.max(0, interests.length - visibleInterests.length);
  const visibleGames = favoriteGames.slice(0, isOwner ? 5 : 6);
  return <div className={styles.overviewGrid}>
      {/* LEFT COLUMN */}
      <div className={styles.leftCol}>
        {/* Interests */}
        <div className={styles.card}>
          <div className={styles.cardHead}>
            <h3 className={styles.cardTitle}>{tt("ui.interests.3fc5", "Interests")}</h3>
          </div>
          {interests.length === 0 ? <p style={{
          color: 'rgba(255,255,255,0.45)',
          fontSize: '0.82rem',
          fontFamily: 'Inter'
        }}>
              {tt("ui.no.interests.added.yet.2b2d", "No interests added yet.")}
            </p> : <div className={styles.chipRow}>
              {visibleInterests.map((it, idx) => <span key={idx} className={styles.chip}>{it}</span>)}
              {remainingInterests > 0 && <button type="button" className={styles.chipMore}>{tt("ui.see.more.2acf", "See more · +")}{remainingInterests}</button>}
            </div>}
        </div>

        {/* Gaming Accounts */}
        <div className={styles.card}>
          <div className={styles.cardHead}>
            <h3 className={styles.cardTitle}>{tt("ui.gaming.accounts.d1e0", "Gaming Accounts")}</h3>
          </div>
          {gamingAccounts.length === 0 ? <p style={{
          color: 'rgba(255,255,255,0.45)',
          fontSize: '0.82rem',
          fontFamily: 'Inter'
        }}>
              {tt("ui.no.gaming.accounts.linked.0ee8", "No gaming accounts linked.")}
            </p> : <div className={styles.acctList}>
              {gamingAccounts.slice(0, 4).map((a, idx) => {
            const initials = (a.platform || a.name || '?').slice(0, 2).toUpperCase();
            return <div className={styles.acctRow} key={idx}>
                    <div className={styles.acctLogo} style={a.color ? {
                backgroundColor: a.color
              } : undefined}>
                      {a.icon ? <img src={a.icon} alt="" aria-hidden="true" /> : initials}
                    </div>
                    <div className={styles.acctMeta}>
                      <div className={styles.acctName}>{a.platform || a.name}</div>
                      <div className={styles.acctHandle}>{a.handle || a.gamertag || '-'}</div>
                    </div>
                  </div>;
          })}
              {gamingAccounts.length > 4 && <button type="button" className={styles.chipMore}>{tt("ui.see.more.2acf", "See more · +")}{gamingAccounts.length - 4}</button>}
            </div>}
        </div>

        {/* Social Links */}
        <div className={styles.card}>
          <div className={styles.cardHead}>
            <h3 className={styles.cardTitle}>{tt("ui.social.links.339c", "Social Links")}</h3>
          </div>
          {socialLinks.length === 0 ? <p style={{
          color: 'rgba(255,255,255,0.45)',
          fontSize: '0.82rem',
          fontFamily: 'Inter'
        }}>
              {tt("ui.no.social.links.added.0edb", "No social links added.")}
            </p> : <div className={styles.socialGrid}>
              {socialLinks.slice(0, 6).map((s, idx) => {
            const kind = detectSocialKind(s.title);
            return <a className={styles.socialPill} key={idx} href={s.url} target="_blank" rel="noreferrer noopener">
                    <span className={styles.socialPillIcon}><SocialIcon kind={kind} /></span>
                    {tx(s.title)}
                  </a>;
          })}
            </div>}
        </div>
      </div>

      {/* RIGHT COLUMN */}
      <div className={styles.rightCol}>
        {/* Wallet + Penalty */}
        <div className={styles.statStrip}>
          <div className={styles.statCard}>
            <div className={styles.statCardHead}>{tt("ui.wallet.balance.3b5c", "Wallet Balance")}</div>
            <div className={styles.statAmountRow}>
              <span className={styles.statIconCoin} />
              <span className={styles.statAmount}>{walletBalance.toLocaleString()}</span>
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statCardHead}>{tt("ui.penalty.points.bb82", "Penalty Points")}</div>
            <div className={styles.statAmountRow}>
              <svg className={styles.statIconFlag} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 22V4M4 4h12l-2 4 2 4H4" />
              </svg>
              <span className={styles.statAmount}>{penaltyPoints}</span>
            </div>
          </div>
        </div>

        {/* Stats card */}
        <div className={styles.card}>
          <div className={styles.cardHead}>
            <h3 className={styles.cardTitle}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3v18h18" /><path d="M7 14l3-3 3 3 5-5" /></svg>
              {tt("ui.stats.be76", "Stats")}
            </h3>
          </div>
          <div className={styles.statsGrid}>
            <div className={styles.statCell}>
              <div className={styles.statCellHead}>
                <span className={styles.statCellLabel}>{tt("ui.ranking.3937", "Ranking")}</span>
                <button type="button" className={styles.statCellLink}>{tt("ui.view.table.fed8", "View Table")}</button>
              </div>
              <div className={styles.statCellValue}>{rank ? `#${rank}` : '-'}</div>
            </div>
            <div className={styles.statCell}>
              <div className={styles.statCellHead}>
                <span className={styles.statCellLabel}>{tt("ui.tournaments.played.f839", "Tournaments played")}</span>
              </div>
              <div className={styles.statCellValue}>{tournamentsPlayed}</div>
            </div>
            <div className={styles.statCell}>
              <div className={styles.statCellHead}>
                <span className={styles.statCellLabel}>{tt("ui.wins.b6c0", "Wins")}</span>
              </div>
              <div className={styles.statCellValue}>{wins}</div>
            </div>
            <div className={styles.statCell}>
              <div className={styles.statCellHead}>
                <span className={styles.statCellLabel}>{tt("ui.losses.0f9a", "Losses")}</span>
              </div>
              <div className={styles.statCellValue}>{losses}</div>
            </div>
          </div>
        </div>

        {/* Favorite games */}
        <div className={styles.card}>
          <div className={styles.cardHead}>
            <h3 className={styles.cardTitle}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="6" width="20" height="12" rx="4" /><path d="M6 12h4m-2-2v4M15 13h.01M17 11h.01" /></svg>
              {tt("ui.favorite.games.a8bb", "Favorite Games")}
            </h3>
            {favoriteGames.length > 0 && <button type="button" className={styles.cardLink} onClick={onSeeAll}>
                {tt("ui.see.more.c510", "See more")}
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
              </button>}
          </div>
          <div className={styles.gamesGrid}>
            {isOwner && <div className={styles.gameTile} onClick={onAddGame} role="button" tabIndex={0}>
                <div className={`${styles.gameImg} ${styles.gameImgAdd}`}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </div>
                <span className={styles.gameName}>{tt("ui.add.game.010f", "Add Game")}</span>
              </div>}
            {visibleGames.map((g, idx) => <div className={styles.gameTile} key={g.id || g.name || idx}>
                <div className={styles.gameImg}>
                  {g.cover ? <img src={mediaUrl(g.cover)} alt={g.name || g.title || ''} /> : null}
                </div>
                <span className={styles.gameName}>{g.name || g.title || g}</span>
              </div>)}
          </div>
        </div>

        {/* Achievements */}
        <div className={styles.card}>
          <div className={styles.cardHead}>
            <h3 className={styles.cardTitle}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4z" /><path d="M21 5h-3v3a3 3 0 0 0 3-3zM3 5h3v3a3 3 0 0 1-3-3z" /></svg>
              {tt("ui.achievements.7d7c", "Achievements (")}{achievements.length})
            </h3>
            {achievements.length > 0 && <button type="button" className={styles.cardLink}>
                {tt("ui.see.more.c510", "See more")}
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
              </button>}
          </div>
          {achievements.length === 0 ? <p style={{
          color: 'rgba(255,255,255,0.45)',
          fontSize: '0.82rem',
          fontFamily: 'Inter',
          textAlign: 'center',
          padding: '1.5rem 0'
        }}>
              {tt("ui.no.achievements.yet.c8a8", "No achievements yet.")}
            </p> : <div className={styles.achvGrid}>
              {achievements.slice(0, 6).map((a, idx) => <div className={styles.achvTile} key={a.id || idx}>
                  <div className={styles.achvMedal}>
                    {a.icon ? <img src={a.icon} alt={a.title || ''} style={{
                maxWidth: '85%',
                maxHeight: '85%',
                objectFit: 'contain'
              }} /> : <svg viewBox="0 0 64 80" style={{
                width: '75%',
                height: '75%'
              }}>
                        <path d="M8 4h48v36c0 18-24 36-24 36S8 58 8 40z" fill="#7BB6FF" stroke="#9DC4FF" strokeWidth="2" />
                      </svg>}
                  </div>
                  <span className={styles.achvName}>{a.title || a.name || 'Achievement'}</span>
                </div>)}
            </div>}
        </div>
      </div>
    </div>;
};
export default OverviewPanel;