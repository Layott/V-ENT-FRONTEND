'use client';

// The game catalogue, kept from the console.
//
// Adding next year's EA FC used to mean somebody with database access doing it
// by hand, and it landed as a brand new unrelated game. Here a game holds its
// editions, so EA FC 26 joins EA FC rather than becoming a fourth row nothing
// connects to the other three.
//
// Nothing on this screen deletes. Several models cascade from Games, so
// removing a row would take the tournaments played on it too. Retiring takes a
// game or an edition out of every picker and leaves the history standing, which
// is why the control says "Retire" and not "Delete".
//
// A list first (CEO, 12 November 2026, inbox 594-1 and 594-2). The page used to
// draw every game fully open, every edition and mode with its own Retire and
// six add fields under each: 7,429px at 1440 and 13,414px on a phone, with
// "Add a game" after all of it. Now each game is one row with its counts, one
// game opens at a time, and every add form waits behind its own button.

import { apiMessage } from '@/lib/apiMessage';
import { useAutoRefresh } from '@/lib/useLiveData';
import { useState, useEffect, useCallback } from 'react';
import { IoChevronDown } from 'react-icons/io5';
import AdminNav from '@/components/admin/AdminNav';
import AdminHeader from '@/components/admin/AdminHeader';
import { useAdminAuth } from '@/components/admin/useAdminAuth';
import { AdminToastProvider, useAdminToast } from '@/components/admin/AdminToast';
import shared from '@/components/admin/admin.module.css';
import styles from './games.module.css';
import ImageUpload from '@/components/image-upload/ImageUpload';
import { mediaUrl, hideBroken } from '@/lib/mediaUrl';
import { useT } from '@/i18n/LanguageProvider';
import { adminToken } from '@/lib/adminToken'
import { markScrimDown, isScrimClick } from '@/lib/scrim';

const count = (tt, n, oneKey, one, manyKey, many) =>
  (n === 1 ? tt(oneKey, one) : tt(manyKey, many)).replace('{n}', n);

function GamesInner() {
  const tt = useT();
  const {
    admin,
    loading: authLoading,
    logout
  } = useAdminAuth();
  const toast = useAdminToast();

  // The same permission the server checks, so the controls are never offered to
  // an admin the API would refuse.
  const mayEdit = !!admin?.permissions?.cancel_tournament;
  const [games, setGames] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [newGame, setNewGame] = useState('');
  const [newLogo, setNewLogo] = useState(null);
  const [logoOpen, setLogoOpen] = useState(null);
  const [newSeries, setNewSeries] = useState({});
  const [newMode, setNewMode] = useState({});
  // Which game is open, whether the add-a-game form is showing, and which add
  // form inside the open game is showing ('edition' or 'mode').
  const [openId, setOpenId] = useState(null);
  const [addingGame, setAddingGame] = useState(false);
  const [adding, setAdding] = useState(null);
  // A request that never arrives has to end somewhere. Without the catch, a
  // dropped connection or a refused preflight rejects here, `load` unwinds
  // before it can clear its own flag, and the page sits on "Loading..." for
  // ever - which is what an admin reported seeing and is indistinguishable
  // from a slow server.
  const call = useCallback(async (path, options = {}) => {
    const token = adminToken();
    const isForm = options.body instanceof FormData;
    let res;
    try {
      res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/admin${path}`, {
        ...options,
        headers: {
          Authorization: `Bearer ${token}`,
          // FormData sets its own content type, boundary and all. Setting it by
          // hand here produces a body the server cannot split apart.
          ...(options.body && !isForm ? {
            'Content-Type': 'application/json'
          } : {}),
          ...(options.headers || {})
        }
      });
    } catch {
      return {
        ok: false,
        body: {
          status: 'error',
          code: 'NETWORK_UNREACHABLE',
          message: 'Could not reach the server.'
        }
      };
    }
    let body = {};
    try {
      body = await res.json();
    } catch {
      body = {};
    }
    return {
      ok: res.ok && body.status === 'success',
      body
    };
  }, []);
  const load = useCallback(async ({ quiet = false } = {}) => {
    if (!quiet) setDataLoading(true);
    if (!quiet) setError('');
    const {
      ok,
      body
    } = await call('/games/');
    if (ok) setGames(body.data?.results || []);else setError(apiMessage(tt, body, 'api.failedToLoadGames', 'Failed to load the games.'));
    setDataLoading(false);
  }, [call]);

  // Keeps itself current. See useAutoRefresh: quiet stops a refresh
  // flashing the loading state over content somebody is reading.
  useAutoRefresh(() => load({ quiet: true }));
  useEffect(() => {
    if (!authLoading && admin) load();
  }, [authLoading, admin, load]);
  const run = async (fn, fallback) => {
    setBusy(true);
    const {
      ok,
      body
    } = await fn();
    setBusy(false);
    if (ok) {
      toast.push(body.message || fallback, 'success');
      await load();
      return true;
    }
    toast.push(apiMessage(tt, body, 'api.failed', 'Failed.'), 'error');
    return false;
  };
  // Sent as a form rather than as JSON, because the logo travels with it. A
  // game added without one shows its initial instead, so the picker never has a
  // blank row in it.
  const addGame = async () => {
    const form = new FormData();
    form.append('name', newGame.trim());
    if (newLogo) form.append('logo', newLogo);
    const done = await run(() => call('/games/', {
      method: 'POST',
      body: form
    }), tt('admin.gameAdded', 'Game added.'));
    if (done) {
      setNewGame('');
      setNewLogo(null);
      setAddingGame(false);
    }
  };

  const setLogo = (game, file) => {
    if (!file) return;
    const form = new FormData();
    form.append('logo', file);
    return run(() => call(`/games/${game.id}/`, {
      method: 'PATCH',
      body: form
    }), tt('admin.gameLogoUpdated', 'Logo updated.'));
  };
  const patchGame = (game, patch) => run(() => call(`/games/${game.id}/`, {
    method: 'PATCH',
    body: JSON.stringify(patch)
  }), tt('admin.gameUpdated', 'Game updated.'));
  const addSeries = async game => {
    const name = (newSeries[game.id]?.name || '').trim();
    const year = newSeries[game.id]?.year || '';
    if (!name) return;
    const done = await run(() => call(`/games/${game.id}/series/`, {
      method: 'POST',
      body: JSON.stringify({
        name,
        release_year: year || null
      })
    }), tt('admin.editionAdded', 'Edition added.'));
    if (done) {
      setNewSeries(p => ({ ...p, [game.id]: { name: '', year: '' } }));
      setAdding(null);
    }
  };
  const patchSeries = (series, patch) => run(() => call(`/series/${series.id}/`, {
    method: 'PATCH',
    body: JSON.stringify(patch)
  }), tt('admin.editionUpdated', 'Edition updated.'));

  // The modes were seeded by a migration and nothing could touch them
  // afterwards, so a game added here arrived with no modes and no way to give
  // it any - and the wizard then offered its organiser nothing to pick.
  const addMode = async game => {
    const name = (newMode[game.id]?.name || '').trim();
    if (!name) return;
    const size = newMode[game.id]?.size || '';
    const done = await run(() => call(`/games/${game.id}/modes/`, {
      method: 'POST',
      body: JSON.stringify({
        name,
        team_size: size || 0,
        series: newMode[game.id]?.series || null,
      }),
    }), tt('admin.modeAdded', 'Mode added.'));
    if (done) {
      setNewMode(p => ({ ...p, [game.id]: { name: '', size: '', series: '' } }));
      setAdding(null);
    }
  };

  const patchMode = (mode, patch) => run(() => call(`/modes/${mode.id}/`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  }), tt('admin.modeUpdated', 'Mode updated.'));

  const toggleGame = id => {
    setOpenId(openId === id ? null : id);
    setAdding(null);
    setLogoOpen(null);
  };
  const setField = (setter, game, field) => e => setter(p => ({
    ...p,
    [game.id]: { ...(p[game.id] || {}), [field]: e.target.value }
  }));

  const renderOpen = game => <div className={styles.gameBody} id={`game-${game.id}`}>
      <div className={styles.sectionHead}>
        <h2 className={styles.sectionTitle}>{tt('admin.gameEditions', 'Editions')}</h2>
        {mayEdit && adding !== 'edition' && <button type="button" className={styles.addQuiet} disabled={busy} onClick={() => setAdding('edition')}>
            {tt('admin.addAnEdition', 'Add an edition')}
          </button>}
      </div>
      {mayEdit && adding === 'edition' && <div className={styles.addSeriesRow}>
          <input className={styles.input} autoFocus aria-label={tt('admin.editionName', 'Edition name, e.g. EA FC 26')} placeholder={tt('admin.editionName', 'Edition name, e.g. EA FC 26')} value={newSeries[game.id]?.name || ''} onChange={setField(setNewSeries, game, 'name')} />
          <input className={styles.inputSmall} type="number" aria-label={tt('admin.releaseYear', 'Year')} placeholder={tt('admin.releaseYear', 'Year')} value={newSeries[game.id]?.year || ''} onChange={setField(setNewSeries, game, 'year')} />
          <button type="button" className={styles.addBtn} disabled={busy || !(newSeries[game.id]?.name || '').trim()} onClick={() => addSeries(game)}>
            {tt('admin.addEdition', 'Add edition')}
          </button>
          <button type="button" className={styles.ghostBtn} onClick={() => setAdding(null)}>{tt('common.cancel', 'Cancel')}</button>
        </div>}
      {game.series.length > 0 ? <div className={styles.seriesList}>
          {game.series.map(s => <div key={s.id} className={`${styles.seriesRow} ${s.is_active ? '' : styles.retired}`}>
              <span className={styles.seriesName}>{s.name}</span>
              {s.release_year && <span className={styles.year}>{s.release_year}</span>}
              <span className={styles.used}>
                {count(tt, s.tournaments, 'admin.usedByOne', 'used by {n} tournament', 'admin.usedByMany', 'used by {n} tournaments')}
              </span>
              {!s.is_active && <span className={styles.retiredBadge}>{tt('admin.retired', 'Retired')}</span>}
              {mayEdit && <button type="button" className={styles.ghostBtn} disabled={busy} onClick={() => patchSeries(s, { is_active: !s.is_active })}>
                  {s.is_active ? tt('admin.retire', 'Retire') : tt('admin.restore', 'Bring back')}
                </button>}
            </div>)}
        </div> : <p className={styles.emptyLine}>{tt('admin.noEditions', 'No editions. A game played the same way every year does not need one.')}</p>}

      {/* How this game is played. The wizard reads exactly this list, so a
          game with none here offers its organiser nothing to pick. */}
      <div className={styles.sectionHead}>
        <h2 className={styles.sectionTitle}>{tt('admin.gameModes', 'Modes')}</h2>
        {mayEdit && adding !== 'mode' && <button type="button" className={styles.addQuiet} disabled={busy} onClick={() => setAdding('mode')}>
            {tt('admin.addAMode', 'Add a mode')}
          </button>}
      </div>
      {mayEdit && adding === 'mode' && <div className={styles.addSeriesRow}>
          <input className={styles.input} autoFocus aria-label={tt('admin.modeName', 'Mode name, e.g. Clash Squad')} placeholder={tt('admin.modeName', 'Mode name, e.g. Clash Squad')} value={newMode[game.id]?.name || ''} onChange={setField(setNewMode, game, 'name')} />
          <input className={styles.inputSmall} type="number" min="0" max="100" aria-label={tt('admin.modeSize', 'A side')} placeholder={tt('admin.modeSize', 'A side')} value={newMode[game.id]?.size || ''} onChange={setField(setNewMode, game, 'size')} />
          {game.series.length > 0 && <select className={styles.inputSmall} aria-label={tt('admin.gameEditions', 'Editions')} value={newMode[game.id]?.series || ''} onChange={setField(setNewMode, game, 'series')}>
              <option value="">{tt('admin.modeEveryEdition', 'Every edition')}</option>
              {game.series.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>}
          <button type="button" className={styles.addBtn} disabled={busy || !(newMode[game.id]?.name || '').trim()} onClick={() => addMode(game)}>
            {tt('admin.addMode', 'Add mode')}
          </button>
          <button type="button" className={styles.ghostBtn} onClick={() => setAdding(null)}>{tt('common.cancel', 'Cancel')}</button>
        </div>}
      {(game.modes || []).length > 0 ? <div className={styles.seriesList}>
          {game.modes.map(m => <div key={m.id} className={`${styles.seriesRow} ${m.is_active ? '' : styles.retired}`}>
              <span className={styles.seriesName}>{m.name}</span>
              {m.series_name && <span className={styles.year}>{m.series_name}</span>}
              {m.team_size > 0 && <span className={styles.used}>
                {tt('admin.modeTeamSize', '{n} a side').replace('{n}', m.team_size)}
              </span>}
              {!m.is_active && <span className={styles.retiredBadge}>{tt('admin.retired', 'Retired')}</span>}
              {mayEdit && <button type="button" className={styles.ghostBtn} disabled={busy} onClick={() => patchMode(m, { is_active: !m.is_active })}>
                  {m.is_active ? tt('admin.retire', 'Retire') : tt('admin.restore', 'Bring back')}
                </button>}
            </div>)}
        </div> : <p className={styles.emptyLine}>{tt('admin.noModes', 'No modes yet, so organisers have nothing to pick for this game. Add one.')}</p>}

      {mayEdit && <div className={styles.gameActions}>
          <button type="button" className={styles.ghostBtn} disabled={busy} onClick={() => setLogoOpen(logoOpen === game.id ? null : game.id)}>
            {game.logo ? tt('admin.replaceLogo', 'Replace the logo') : tt('admin.addLogo', 'Add a logo')}
          </button>
          <button type="button" className={styles.ghostBtn} disabled={busy} onClick={() => patchGame(game, { is_active: !game.is_active })}>
            {game.is_active ? tt('admin.retireGame', 'Retire this game') : tt('admin.restoreGame', 'Bring this game back')}
          </button>
        </div>}
      {mayEdit && logoOpen === game.id && <div className={styles.logoRow}>
          <ImageUpload kind="logo" compact value={null} existing={game.logo} onChange={file => {
          setLogo(game, file);
          setLogoOpen(null);
        }} label={tt('admin.gameLogo', 'Game logo')} />
        </div>}
    </div>;

  if (authLoading) return null;
  return <div className={shared.pageContainer}>
      <div className={`${shared.sidebarOverlay} ${sidebarOpen ? shared.open : ''}`} onPointerDown={markScrimDown} data-scrim="" onClick={(e) => isScrimClick(e) && (setSidebarOpen(false))} />
      <AdminNav admin={admin} onLogout={logout} sidebarOpen={sidebarOpen} badges={{}} />
      <div className={shared.mainContainer}>
        <AdminHeader admin={admin} onLogout={logout} onMenuOpen={() => setSidebarOpen(true)} />
        <main className={shared.contentArea}>
          <div className={shared.pageHeader}>
            <div>
              <h1 className={shared.pageTitle}>{tt('admin.gamesTitle', 'Games')}</h1>
              <p className={shared.pageSubtitle}>
                {tt('admin.gamesSubtitle', 'The titles organisers can run, and the editions under each one.')}
              </p>
            </div>
            {mayEdit && !addingGame && <button type="button" className={styles.addBtn} onClick={() => setAddingGame(true)}>
                {tt('admin.addAGame', 'Add a game')}
              </button>}
          </div>

          {mayEdit && addingGame && <div className={`${shared.card} ${styles.addGameBlock}`}>
              <h2 className={styles.sectionTitle}>{tt('admin.addAGame', 'Add a game')}</h2>
              <div className={styles.addGameRow}>
                <input className={styles.input} autoFocus aria-label={tt('admin.newGameName', 'New game, e.g. Street Fighter')} placeholder={tt('admin.newGameName', 'New game, e.g. Street Fighter')} value={newGame} onChange={e => setNewGame(e.target.value)} />
              </div>
              <ImageUpload kind="logo" compact value={newLogo} onChange={setNewLogo} label={tt('admin.gameLogo', 'Game logo')} />
              <div className={styles.addGameRow}>
                <button type="button" className={styles.addBtn} disabled={busy || !newGame.trim()} onClick={addGame}>
                  {tt('admin.addGame', 'Add game')}
                </button>
                <button type="button" className={styles.ghostBtn} onClick={() => { setAddingGame(false); setNewGame(''); setNewLogo(null); }}>
                  {tt('common.cancel', 'Cancel')}
                </button>
              </div>
            </div>}

          <div className={shared.card}>
            <p className={styles.hint}>
              {tt('admin.gamesHint', 'An annual title like EA FC is one game with an edition per year, so this year is tied to last year rather than becoming a separate entry. Nothing here deletes: tournaments point at these rows, so retiring takes a game out of the pickers and keeps the history.')}
            </p>

            {dataLoading ? <p className={shared.stateText}>{tt('ui.loading.33ce', 'Loading…')}</p> : error ? <div className={styles.failed}>
                  <p className={shared.stateText}>{error}</p>
                  <button type="button" className={styles.addQuiet} onClick={load}>{tt('admin.retry', 'Try again')}</button>
                </div> : games.length === 0 ? <p className={shared.stateText}>{tt('admin.noGames', 'No games yet.')}</p> : <ul className={styles.gameList}>
                  {games.map(game => {
                const open = openId === game.id;
                return <li key={game.id} className={`${styles.gameCard} ${open ? styles.gameCardOpen : ''} ${game.is_active ? '' : styles.retired}`}>
                      <button type="button" className={styles.gameHead} aria-expanded={open} aria-controls={`game-${game.id}`} onClick={() => toggleGame(game.id)}>
                        {game.logo
                          ? <img className={styles.gameLogo} src={mediaUrl(game.logo)} onError={hideBroken} alt={tt('admin.gameLogoAlt', 'The {game} logo').replace('{game}', game.name)} />
                          : <span className={styles.gameLogoBlank} aria-hidden="true">{game.name.slice(0, 1)}</span>}
                        <span className={styles.gameName}>{game.name}</span>
                        {!game.is_active && <span className={styles.retiredBadge}>{tt('admin.retired', 'Retired')}</span>}
                        <span className={styles.count}>
                          {count(tt, game.series.length, 'admin.editionCountOne', '{n} edition', 'admin.editionCountMany', '{n} editions')}
                          {' · '}
                          {count(tt, (game.modes || []).length, 'admin.modeCountOne', '{n} mode', 'admin.modeCountMany', '{n} modes')}
                        </span>
                        <IoChevronDown className={`${styles.chevron} ${open ? styles.chevronOpen : ''}`} aria-hidden="true" />
                      </button>
                      {open && renderOpen(game)}
                    </li>;
              })}
                </ul>}
          </div>
        </main>
      </div>
    </div>;
}
export default function AdminGamesPage() {
  return <AdminToastProvider>
      <GamesInner />
    </AdminToastProvider>;
}
