'use client';

import { mediaUrl } from '@/lib/mediaUrl';
import styles from './FavoriteGamesPanel.module.css';
import { useT } from '@/i18n/LanguageProvider';
import { useTx } from '@/i18n/LanguageProvider';
const FavoriteGamesPanel = ({
  games = []
}) => {
  const tt = useT();
  if (games.length === 0) {
    return <div className={styles.wrap}>
        <div className={styles.empty}>{tt("ui.no.favorite.games.yet.cf05", "No favorite games yet.")}</div>
      </div>;
  }
  return <div className={styles.wrap}>
      <div className={styles.card}>
        <div className={styles.grid}>
          {games.map((g, idx) => {
          // `logo` is what the API actually sends. This read `cover || image`,
          // two keys nothing produces, so every favourite game drew the empty
          // placeholder even when the game had artwork - which is what the CEO
          // screenshotted for Free Fire, whose logo was on the server and
          // serving 200 the whole time.
          const cover = g.logo || g.cover || g.image;
          return <div className={styles.tile} key={g.id || idx}>
                <div className={`${styles.cover} ${cover ? '' : styles.coverEmpty}`}>
                  {cover ? <img src={mediaUrl(cover)} alt={g.name || g.title || ''} /> : <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 16l5-5 4 4 7-7 2 2" /></svg>}
                </div>
                <span className={styles.title}>{g.name || g.title || g}</span>
              </div>;
        })}
        </div>
      </div>
    </div>;
};
export default FavoriteGamesPanel;