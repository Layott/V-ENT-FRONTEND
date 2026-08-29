'use client';

import { mediaUrl } from '@/lib/mediaUrl';
import InfoTip from '@/components/info-tip/InfoTip';
import { useState, useMemo, useEffect } from 'react';
import shared from './editProfileShared.module.css';
import styles from './FavoriteGamesEditPanel.module.css';
import { useT } from '@/i18n/LanguageProvider';
import { useTx } from '@/i18n/LanguageProvider';
const StarSvg = () => <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
  </svg>;
const platformClass = p => {
  const map = {
    PC: styles.tagPc,
    PS5: styles.tagPs,
    Xbox: styles.tagXbox,
    Mobile: styles.tagMobile
  };
  return map[p] || '';
};

// The catalogue comes from the backend's Games table. This panel used to ship a
// hardcoded list of games complete with invented gamertags ("frostbite_09"),
// which appeared on a real user's profile as if they were theirs.
const gameCover = g => g.logo || g.cover || null;
const FavoriteGamesEditPanel = ({
  initialGames,
  onSave,
  onCancel,
  showToast
}) => {
  const tx = useTx();
  const tt = useT();
  const seedGames = initialGames && initialGames.length > 0 ? initialGames.map((g, i) => ({
    id: g.id || `g-${i}`,
    name: g.name || g.title || g,
    cover: gameCover(g),
    platforms: g.platforms || ['PC'],
    gamertag: g.gamertag || '',
    gamertagLabel: g.gamertagLabel || 'Gamertag',
    isMain: g.isMain || g.is_main || false
  })) : [];
  const [games, setGames] = useState(seedGames);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalSearch, setModalSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [catalog, setCatalog] = useState([]);
  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/games/`, {
          signal: controller.signal
        });
        if (!res.ok) return;
        const body = await res.json();
        setCatalog((body?.data?.games || []).map(g => ({
          id: g.id,
          name: g.name,
          cover: g.logo || null
        })));
      } catch {
        // Offline or endpoint unavailable - the picker stays empty rather than
        // offering games the platform doesn't actually run.
      }
    })();
    return () => controller.abort();
  }, []);
  const filtered = useMemo(() => {
    if (!search) return games;
    return games.filter(g => g.name.toLowerCase().includes(search.toLowerCase()));
  }, [games, search]);
  const setAsMain = id => {
    setGames(games.map(g => ({
      ...g,
      isMain: g.id === id
    })));
  };
  const removeGame = id => {
    const next = games.filter(g => g.id !== id);
    if (!next.some(g => g.isMain) && next.length > 0) next[0].isMain = true;
    setGames(next);
  };
  const updateGamertag = (id, value) => {
    setGames(games.map(g => g.id === id ? {
      ...g,
      gamertag: value
    } : g));
  };
  const addGameFromCatalog = cg => {
    if (games.some(g => g.id === cg.id)) {
      showToast?.('Game already added');
      return;
    }
    setGames([...games, {
      ...cg,
      platforms: ['PC', 'PS5'],
      gamertag: '',
      gamertagLabel: 'Gamertag',
      isMain: games.length === 0
    }]);
    setModalOpen(false);
    setModalSearch('');
  };
  const handleSubmit = async e => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave?.({
        games
      });
      showToast?.('Favorite games saved');
    } finally {
      setSaving(false);
    }
  };
  const filteredCatalog = catalog.filter(c => c.name.toLowerCase().includes(modalSearch.toLowerCase()));
  return <form className={shared.formStack} onSubmit={handleSubmit}>
      <div className={shared.card}>
        <div className={styles.gamesHead}>
          <div className={styles.gamesHeadLeft}>
            <h3 className={styles.gamesTitle}>{tt("ui.favorite.games.a8bb", "Favorite Games")}<InfoTip id="favouriteGames" /></h3>
            <span className={styles.gamesSub}>{tt("ui.set.main.game.add.876c", "Set your main game and add the gamertag we should display next to each title.")}</span>
          </div>
          <div className={styles.gamesHeadRight}>
            <div className={styles.ctrlSearch}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>
              <input type="text" placeholder={tt("ui.search.games.c96f", "Search games")} value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <button type="button" className={styles.addBtn} onClick={() => setModalOpen(true)}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
              {tt("ui.add.game.aab4", "Add game")}
            </button>
          </div>
        </div>

        <div className={styles.gamesGrid}>
          {filtered.length === 0 ? <div className={styles.gamesEmpty}>{tt("ui.no.games.match.search.a69b", "No games match your search.")}</div> : filtered.map(g => <article className={`${styles.gameCard} ${g.isMain ? styles.gameCardMain : ''}`} key={g.id}>
              <div className={styles.gameCoverWrap}>
                {g.isMain && <span className={styles.mainBadge}>
                    <StarSvg /> {tt("ui.main.game.6260", "Main game")}
                  </span>}
                <button type="button" className={styles.gameRemove} onClick={() => removeGame(g.id)} aria-label={`Remove ${g.name}`}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                </button>
                {gameCover(g) ? <img src={mediaUrl(gameCover(g))} alt={g.name} /> : <span className={styles.coverFallback}>{(g.name || '?').charAt(0)}</span>}
              </div>
              <div className={styles.gameBody}>
                <h4 className={styles.gameTitle}>{g.name}</h4>
                <div className={styles.platformRow}>
                  {(g.platforms || []).map(p => <span key={p} className={`${styles.platformTag} ${platformClass(p)}`}>{p}</span>)}
                </div>
                <div className={styles.gtagRow}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" /></svg>
                  <input type="text" value={g.gamertag} placeholder={g.gamertagLabel} onChange={e => updateGamertag(g.id, e.target.value)} />
                </div>
                {g.isMain ? <div className={styles.mainMarker}>
                    <StarSvg />
                    {tt("ui.main.game.6260", "Main game")}
                  </div> : <button type="button" className={styles.setMainBtn} onClick={() => setAsMain(g.id)}>
                    <StarSvg />
                    {tt("ui.set.as.main.6c3e", "Set as main")}
                  </button>}
              </div>
            </article>)}
        </div>
      </div>

      <div className={shared.formFooter}>
        <button type="button" className={`${shared.btn} ${shared.ghostBTN}`} onClick={onCancel}>{tt("ui.cancel.77df", "Cancel")}</button>
        <button type="submit" className={`${shared.btn} ${shared.redBTN}`} disabled={saving}>
          {saving ? tx("Saving…") : tx("Save changes")}
        </button>
      </div>

      {modalOpen && <div className={styles.overlay} onClick={e => {
      if (e.target === e.currentTarget) setModalOpen(false);
    }}>
          <div className={styles.modal}>
            <button type="button" className={styles.modalClose} onClick={() => setModalOpen(false)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
            <h3 className={styles.modalTitle}>{tt("ui.add.game.b3b9", "Add a game")}</h3>
            <p className={styles.modalSub}>{tt("ui.pick.from.v.ent.c353", "Pick from the V-ENT catalog. Only games with active tournaments are listed.")}</p>
            <div className={styles.modalSearch}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>
              <input type="text" placeholder={tt("ui.search.catalog.77a3", "Search the catalog")} value={modalSearch} onChange={e => setModalSearch(e.target.value)} />
            </div>
            <div className={styles.modalList}>
              {filteredCatalog.map(cg => <div className={styles.modalGame} key={cg.id} onClick={() => addGameFromCatalog(cg)} role="button" tabIndex={0}>
                  <div className={styles.modalGameCover}>{gameCover(cg) ? <img src={mediaUrl(gameCover(cg))} alt="" aria-hidden="true" /> : <span className={styles.coverFallback}>{(cg.name || '?').charAt(0)}</span>}</div>
                  <span className={styles.modalGameName}>{cg.name}</span>
                </div>)}
            </div>
            <div className={styles.modalFoot}>
              <button type="button" className={`${shared.btn} ${shared.ghostBTN}`} onClick={() => setModalOpen(false)}>{tt("ui.close.bbfa", "Close")}</button>
            </div>
          </div>
        </div>}
    </form>;
};
export default FavoriteGamesEditPanel;