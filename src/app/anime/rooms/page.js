'use client';

// Reading rooms: the ones that are open, and opening one.
//
// A private room is not listed, deliberately: somebody invited reaches it by
// its address, which is what the invitation carries. So this page shows public
// and password rooms, and "mine" for anybody signed in.

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import Header from '@/components/header/Header';
import MobileHeader from '@/components/mobile-header/MobileHeader';
import Sidebar from '@/components/sidebar/Sidebar';
import BottomMenu from '@/components/bottom-menu/BottomMenu';
import ComingSoon from '@/components/coming-soon/ComingSoon';
import { useT } from '@/i18n/LanguageProvider';
import { apiMessage } from '@/lib/apiMessage';
import { call, fill, tokenFrom, useAnimeCatalogue, useAnimeOpen } from '@/lib/anime';
import { useViewer, signInHref } from '@/lib/gating';
import styles from '../studio/studio.module.css';

const Rooms = () => {
  const tt = useT();
  const open = useAnimeOpen();
  const { data: session } = useSession();
  const viewer = useViewer();
  const token = tokenFrom(session);
  const { catalogue } = useAnimeCatalogue(open === true);

  const [rooms, setRooms] = useState([]);
  const [series, setSeries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);

  const [name, setName] = useState('');
  const [pick, setPick] = useState('');
  const [privacy, setPrivacy] = useState('private');
  const [password, setPassword] = useState('');
  const [control, setControl] = useState('host');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [live, comics] = await Promise.all([
        call('/rooms/', { token }),
        call('/series/?sort=newest', { token }),
      ]);
      setRooms(live.rooms || []);
      setSeries(comics.series || []);
      setPick(p => p || comics.series?.[0]?.slug || '');
    } catch (err) {
      setError(apiMessage(tt, err, 'anime.loadFailed', 'We could not load the rooms.'));
    } finally {
      setLoading(false);
    }
  }, [token, tt]);

  useEffect(() => {
    if (open !== true) return undefined;
    load();
    return undefined;
  }, [open, load]);

  const create = async (e) => {
    e.preventDefault();
    setBusy(true);
    setToast(null);
    try {
      const room = await call('/rooms/', {
        method: 'POST', token,
        body: { name, series: pick, privacy, control,
          password: privacy === 'password' ? password : undefined },
      });
      window.location.href = `/anime/room/${room.token}`;
    } catch (err) {
      setToast(apiMessage(tt, err, 'anime.didNotWork', 'That did not work.'));
      setBusy(false);
    }
  };

  if (open === null) return null;
  if (open === false) {
    return <ComingSoon phase="Phase 5"
      title={tt('anime.comingTitle', 'Anime hub')}
      blurb={tt('anime.comingBlurb',
        'Manga reading, co-reading rooms and character battles are built and '
        + 'not open yet. Nothing here is live.')}
      alternatives={[{ href: '/tournaments', label: tt('nav.tournaments', 'Tournaments') }]} />;
  }

  const privacies = Object.entries(catalogue?.room_privacy || {});

  return (
    <div className={styles.pageContainer}>
      <Header />
      <MobileHeader />
      <main className={styles.mainContainer}>
        <Sidebar />
        <div className={styles.rightPaneContainer}>
          <Link href="/anime" className={styles.backLink}>
            {tt('anime.backToHub', 'Back to anime')}
          </Link>
          <div className={styles.pageHeader}>
            <h1 className={styles.pageTitle}>
              {tt('anime.roomsTitle', 'Reading rooms')}
            </h1>
            <p className={styles.pageSub}>
              {tt('anime.roomsSub',
                'Read the same chapter at the same time, and say things about '
                + 'it while you do.')}
            </p>
          </div>

          <div className={styles.columns}>
            <section className={styles.card}>
              <h2 className={styles.cardTitle}>{tt('anime.openRooms', 'Open now')}</h2>
              {loading ? (
                <div className={styles.skeleton} />
              ) : error ? (
                <div className={styles.empty}>
                  <p>{error}</p>
                  <button type="button" className={styles.quietBtn} onClick={load}>
                    {tt('common.tryAgain', 'Try again')}
                  </button>
                </div>
              ) : rooms.length === 0 ? (
                <p className={styles.empty}>
                  {tt('anime.noRooms',
                    'No rooms are open. Open one and read with somebody.')}
                </p>
              ) : (
                <ul className={styles.list}>
                  {rooms.map(room => (
                    <li key={room.token}>
                      <Link href={`/anime/room/${room.token}`} className={styles.row}>
                        <span className={styles.rowTitle}>{room.name}</span>
                        <span className={styles.rowMeta}>
                          {room.series_title}
                          {' '}
                          {fill(tt('anime.reading', '{n} reading'),
                            { n: room.people })}
                          {room.has_password
                            ? ` ${tt('anime.needsPassword', 'password')}` : ''}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className={styles.card}>
              <h2 className={styles.cardTitle}>{tt('anime.openOne', 'Open a room')}</h2>
              {!viewer.signedIn ? (
                <div className={styles.empty}>
                  <p>{tt('anime.roomsSignedOut',
                    'Sign in to open a room and invite people to it.')}</p>
                  <Link href={signInHref('/anime/rooms')} className={styles.primaryBtn}>
                    {tt('needsAccount.signIn', 'Log in')}
                  </Link>
                </div>
              ) : series.length === 0 ? (
                <p className={styles.empty}>
                  {tt('anime.noComicsToRead',
                    'There are no comics to read together yet.')}
                </p>
              ) : (
                <form className={styles.form} onSubmit={create}>
                  <label className={styles.label} htmlFor="room-name">
                    {tt('anime.roomName', 'Call it something')}
                  </label>
                  <input id="room-name" className={styles.input} value={name}
                         onChange={e => setName(e.target.value)} required />

                  <label className={styles.label} htmlFor="room-series">
                    {tt('anime.whatToRead', 'What to read')}
                  </label>
                  <select id="room-series" className={styles.input} value={pick}
                          onChange={e => setPick(e.target.value)}>
                    {series.map(s => (
                      <option key={s.slug} value={s.slug}>{s.title}</option>
                    ))}
                  </select>

                  <label className={styles.label} htmlFor="room-privacy">
                    {tt('anime.whoCanJoin', 'Who can join')}
                  </label>
                  <select id="room-privacy" className={styles.input} value={privacy}
                          onChange={e => setPrivacy(e.target.value)}>
                    {privacies.map(([key, word]) => (
                      <option key={key} value={key}>{word}</option>
                    ))}
                  </select>

                  {privacy === 'password' && (
                    <>
                      <label className={styles.label} htmlFor="room-password">
                        {tt('anime.roomPassword', 'The password')}
                      </label>
                      <input id="room-password" className={styles.input}
                             value={password} type="password"
                             onChange={e => setPassword(e.target.value)} required />
                    </>
                  )}

                  <label className={styles.label} htmlFor="room-control">
                    {tt('anime.whoTurns', 'Who turns the page')}
                  </label>
                  <select id="room-control" className={styles.input} value={control}
                          onChange={e => setControl(e.target.value)}>
                    <option value="host">{tt('anime.hostTurns', 'Me')}</option>
                    <option value="anyone">{tt('anime.anyoneTurns', 'Anybody in the room')}</option>
                  </select>

                  <button type="submit" className={styles.primaryBtn}
                          disabled={busy || !name.trim() || !pick}>
                    {tt('anime.openRoom', 'Open the room')}
                  </button>
                </form>
              )}
            </section>
          </div>
        </div>
      </main>
      <BottomMenu />
      {toast ? <p className={styles.toast} role="status">{toast}</p> : null}
    </div>
  );
};

export default Rooms;
