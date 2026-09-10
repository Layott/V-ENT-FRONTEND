'use client';

// A reading room: everybody on the same page, talking about it.
//
// The design is `docs/wip/anime/room`, back against the real API. The live half
// is one poll of `/anime/rooms/<token>/feed/` through `useLiveData`, which is
// the hook that backs off and does not re-arm its timer on every render. A
// poller with no backoff starves its own address, and `check-pollers` fails the
// build for one, so this is the rule rather than a workaround for it.
//
// Voice is real WebRTC. The audio never touches V-ENT: `/signal/` carries the
// offer, the answer and the ICE candidates between two browsers until they
// connect directly, and the rows are deleted as they are read.

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { LuChevronLeft, LuChevronRight } from 'react-icons/lu';
import Header from '@/components/header/Header';
import ComingSoon from '@/components/coming-soon/ComingSoon';
import { useT } from '@/i18n/LanguageProvider';
import { call, fill, tokenFrom, useAnimeOpen } from '@/lib/anime';
import { formatDateTime } from '@/lib/datetime';
import { useViewer, signInHref } from '@/lib/gating';
import { mediaUrl } from '@/lib/mediaUrl';
import useLiveData from '@/lib/useLiveData';
import styles from './room.module.css';

const API = process.env.NEXT_PUBLIC_API_URL;

const RoomClient = ({ roomToken }) => {
  const tt = useT();
  const open = useAnimeOpen();
  const router = useRouter();
  const { data: session } = useSession();
  const viewer = useViewer();
  const token = tokenFrom(session);

  const [room, setRoom] = useState(null);
  // An explicit flag with a `finally`, rather than inferring "still loading"
  // from `room` being null. A bare await that never settles leaves a page on
  // Loading for ever, which has happened on four pages here already and is
  // what `check-spinner-forever` counts.
  const [loading, setLoading] = useState(true);
  const [chapter, setChapter] = useState(null);
  const [joined, setJoined] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);
  const [messages, setMessages] = useState([]);
  const [annotations, setAnnotations] = useState([]);
  const [members, setMembers] = useState([]);
  const [page, setPage] = useState(1);
  const [driver, setDriver] = useState('');
  const [saying, setSaying] = useState('');
  const [noteText, setNoteText] = useState('');
  const [invite, setInvite] = useState('');
  const [analytics, setAnalytics] = useState(null);

  const since = useRef(0);

  const loadRoom = useCallback(async () => {
    setLoading(true);
    try {
      const data = await call(`/rooms/${roomToken}/`, { token });
      setRoom(data);
      setJoined(Boolean(data.joined));
      setPage(data.page_number || 1);
      setDriver(data.driver || '');
      if (data.chapter) {
        try {
          setChapter(await call(`/chapters/${data.chapter}/`, { token }));
        } catch { setChapter(null); }
      }
    } catch (err) {
      setError(err.code === 'NOT_FOUND'
        ? tt('anime.noSuchRoom', 'There is no room here.')
        : (err.message || tt('anime.loadFailed', 'We could not load the room.')));
    } finally {
      setLoading(false);
    }
  }, [roomToken, token, tt]);

  useEffect(() => {
    if (open !== true) return undefined;
    loadRoom();
    return undefined;
  }, [open, loadRoom]);

  // The one live path. Off until somebody is actually in the room, because the
  // feed refuses anybody who is not and a poll that always 403s is a poll that
  // never backs off.
  const { error: feedError } = useLiveData(
    async ({ signal }) => {
      const res = await fetch(
        `${API}/anime/rooms/${roomToken}/feed/?since=${since.current}`,
        { signal, headers: { Authorization: `Bearer ${token}` } });
      const body = await res.json();
      if (!res.ok || body.status !== 'success') throw new Error(body.code);
      return body.data;
    },
    [roomToken, token, joined],
    {
      interval: 2000,
      maxInterval: 30000,
      enabled: Boolean(token && joined && open === true),
      changed: (next, prev) => next.version !== prev?.version,
      onData: (data) => {
        setPage(data.page_number || 1);
        setDriver(data.driver || '');
        setMembers(data.members || []);
        if (data.messages?.length) {
          setMessages(m => [...m, ...data.messages]);
          since.current = Math.max(
            since.current, ...data.messages.map(x => x.id));
        }
        if (data.annotations?.length) {
          setAnnotations(a => [...a, ...data.annotations]);
        }
        if (data.closed) setToast(tt('anime.roomClosed', 'The host closed the room.'));
      },
    },
  );

  const join = async () => {
    try {
      await call(`/rooms/${roomToken}/join/`, {
        method: 'POST', token, body: { password } });
      setJoined(true);
      setToast(tt('anime.joined', 'You are in.'));
      await loadRoom();
    } catch (err) {
      setToast(err.code === 'WRONG_PASSWORD'
        ? tt('anime.wrongPassword', 'That is not the password.')
        : err.code === 'INVITE_ONLY'
          ? tt('anime.inviteOnly', 'That room is invitation only.')
          : err.message);
    }
  };

  const post = async (path, body, said) => {
    try {
      await call(`/rooms/${roomToken}/${path}`, { method: 'POST', token, body });
      if (said) setToast(said);
    } catch (err) {
      setToast(err.message || tt('anime.didNotWork', 'That did not work.'));
    }
  };

  const turn = async (next) => {
    // Shown immediately to the person who pressed, then confirmed by the feed.
    // Waiting for the poll means up to two seconds of a button that looks
    // dead, and longer while the tab is in the background, where the loop
    // deliberately does not fetch at all.
    setPage(next);
    await post('page/', { page: next });
  };

  const say = async (e) => {
    e.preventDefault();
    if (!saying.trim()) return;
    await post('chat/', { body: saying, page });
    setSaying('');
  };

  const react = (emoji) => post('chat/', { emoji, page });

  const stick = async () => {
    if (!noteText.trim()) return;
    await post('annotations/', {
      kind: 'note', page, x: 0.5, y: 0.5, text: noteText,
    }, tt('anime.noteAdded', 'Note added.'));
    setNoteText('');
  };

  const sendInvite = async () => {
    if (!invite.trim()) return;
    const looksLikeEmail = invite.includes('@');
    await post('invite/', looksLikeEmail ? { email: invite } : { username: invite },
      tt('anime.invited', 'Invited.'));
    setInvite('');
  };

  const closeRoom = async () => {
    try {
      const data = await call(`/rooms/${roomToken}/close/`, {
        method: 'POST', token, body: {} });
      setAnalytics(data);
      setToast(tt('anime.sessionClosed', 'Session closed.'));
      await loadRoom();
    } catch (err) {
      setToast(err.message);
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

  // Written as a single-statement return on purpose: it is the shape
  // `check-spinner-forever` recognises as a real error branch, and a page that
  // HAS one but is counted as though it does not is a number nobody can act on.
  if (error) return (
    <div className={styles.pageContainer}>
      <Header />
      <div className={styles.sideState}>
        <p>{error}</p>
        <Link href="/anime/rooms" className={styles.backLink}>
          {tt('anime.allRooms', 'All rooms')}
        </Link>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className={styles.pageContainer}>
        <Header />
        <p className={styles.sideState}>{tt('ui.loading.33ce', 'Loading…')}</p>
      </div>
    );
  }

  if (!room) {
    // Not loading and nothing to show: say so and offer the way out, rather
    // than sitting on a spinner that will never end.
    return (
      <div className={styles.pageContainer}>
        <Header />
        <div className={styles.sideState}>
          <p>{tt('anime.noSuchRoom', 'There is no room here.')}</p>
          <Link href="/anime/rooms" className={styles.backLink}>
            {tt('anime.allRooms', 'All rooms')}
          </Link>
        </div>
      </div>
    );
  }

  const pages = chapter?.page_list || [];
  const image = pages.find(p => p.number === page)?.image;
  const iAmDriving = driver === viewer.username;
  const iAmHost = room.mine;

  return (
    <div className={styles.pageContainer}>
      <Header />
      <main className={styles.mainContainer}>
        <div className={styles.rightPaneContainer}>
          <div className={styles.topBar}>
            <div className={styles.topLeft}>
              {room.open && (
                <span className={styles.livePill}>
                  <span className={styles.liveDot} />
                  {tt('anime.live', 'Open')}
                </span>
              )}
              <div className={styles.topInfo}>
                <p className={styles.topTitle}>{room.name}</p>
                <p className={styles.topSub}>
                  {room.series_title}
                  {' '}
                  {fill(tt('anime.turnedBy', 'turned by {who}'), { who: driver })}
                </p>
              </div>
            </div>
            <div className={styles.topRight}>
              {iAmHost && room.open && (
                <button type="button" className={styles.hostBtn}
                        onClick={closeRoom}>
                  {tt('anime.closeRoom', 'Close the session')}
                </button>
              )}
              {joined && (
                <button type="button" className={styles.leaveBtn}
                        onClick={async () => {
                          await post('leave/', {});
                          router.push('/anime/rooms');
                        }}>
                  {tt('anime.leave', 'Leave')}
                </button>
              )}
            </div>
          </div>

          {!viewer.signedIn ? (
            <div className={styles.sideState}>
              <p>{tt('anime.roomSignedOut',
                'Sign in to join this room.')}</p>
              <Link href={signInHref(`/anime/room/${roomToken}`)}
                    className={styles.hostBtn}>
                {tt('needsAccount.signIn', 'Log in')}
              </Link>
            </div>
          ) : !joined ? (
            <div className={styles.sideState}>
              <p>{fill(tt('anime.joinPrompt', '{host} is reading {series}.'),
                { host: room.host?.username, series: room.series_title })}</p>
              {room.has_password && (
                <input className={styles.chatInput} type="password"
                       value={password}
                       placeholder={tt('anime.roomPassword', 'The password')}
                       onChange={e => setPassword(e.target.value)} />
              )}
              <button type="button" className={styles.hostBtn} onClick={join}>
                {tt('anime.join', 'Join the room')}
              </button>
            </div>
          ) : (
            <div className={styles.roomLayout}>
              <div className={styles.viewerPane}>
                {!room.open && (
                  <p className={styles.pausedBanner}>
                    {tt('anime.roomClosed', 'The host closed the room.')}
                  </p>
                )}
                <div className={styles.viewerFrame}>
                  <button type="button" className={styles.edgeNavLeft}
                          disabled={!iAmDriving && room.control === 'host'}
                          onClick={() => turn(Math.max(1, page - 1))}
                          aria-label={tt('anime.previousPage', 'Previous page')}>
                    <LuChevronLeft />
                  </button>
                  {image ? (
                    <img className={styles.pageImage} src={mediaUrl(image)}
                         alt={fill(tt('anime.pageN', 'Page {p}'), { p: page })} />
                  ) : (
                    <p className={styles.sideState}>
                      {chapter && !chapter.can_read
                        ? tt('anime.cannotRead', 'You cannot read this one.')
                        : tt('anime.noPages',
                          'This chapter has no pages in it yet.')}
                    </p>
                  )}
                  <button type="button" className={styles.edgeNavRight}
                          disabled={!iAmDriving && room.control === 'host'}
                          onClick={() => turn(page + 1)}
                          aria-label={tt('anime.nextPage', 'Next page')}>
                    <LuChevronRight />
                  </button>
                </div>
                <p className={styles.pageCounter}>
                  {fill(tt('anime.pageOf', 'Page {p} of {n}'),
                    { p: page, n: pages.length || chapter?.pages || 0 })}
                </p>

                {/* Reactions, aimed at the page they are on, which is what
                    makes "most reacted-to scene" answerable afterwards. */}
                {/* Named one by one rather than built from a template
                    string: a key assembled at runtime is a key `check-keys`
                    cannot see, and an untranslated button is the failure that
                    survives longest because English is the fallback. */}
                <div className={styles.chatInputRow}>
                  <button type="button" className={styles.chatSendBtn}
                          onClick={() => react('fire')}>
                    {tt('anime.reactFire', 'That was good')}
                  </button>
                  <button type="button" className={styles.chatSendBtn}
                          onClick={() => react('shock')}>
                    {tt('anime.reactShock', 'No way')}
                  </button>
                  <button type="button" className={styles.chatSendBtn}
                          onClick={() => react('laugh')}>
                    {tt('anime.reactLaugh', 'That is funny')}
                  </button>
                  <button type="button" className={styles.chatSendBtn}
                          onClick={() => react('sad')}>
                    {tt('anime.reactSad', 'That hurt')}
                  </button>
                </div>
              </div>

              <div className={styles.sidePane}>
                <section className={styles.sideSection}>
                  <p className={styles.sideHeader}>
                    {tt('anime.whoIsHere', 'Who is here')}
                  </p>
                  <div className={styles.participantList}>
                    {members.map(m => (
                      <div key={m.username} className={styles.participantRow}>
                        <span className={styles.participantName}>{m.username}</span>
                        {m.host && (
                          <span className={styles.hostBadge}>
                            {tt('anime.host', 'host')}
                          </span>
                        )}
                        {iAmHost && !m.host && (
                          <>
                            <button type="button" className={styles.chatSendBtn}
                                    onClick={() => post('control/',
                                      { username: m.username },
                                      tt('anime.handedOver', 'They are driving now.'))}>
                              {tt('anime.handOver', 'Let them turn')}
                            </button>
                            <button type="button" className={styles.chatSendBtn}
                                    onClick={() => post('remove/',
                                      { username: m.username },
                                      tt('anime.removed', 'Removed from the room.'))}>
                              {tt('anime.remove', 'Remove')}
                            </button>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </section>

                {iAmHost && (
                  <section className={styles.sideSection}>
                    <p className={styles.sideHeader}>
                      {tt('anime.invite', 'Invite somebody')}
                    </p>
                    <div className={styles.chatInputRow}>
                      <input className={styles.chatInput} value={invite}
                             placeholder={tt('anime.invitePlaceholder',
                               'A username or an email address')}
                             onChange={e => setInvite(e.target.value)} />
                      <button type="button" className={styles.chatSendBtn}
                              onClick={sendInvite}>
                        {tt('anime.send', 'Send it')}
                      </button>
                    </div>
                    <p className={styles.chatTime}>
                      {tt('anime.orShareLink', 'Or share this address.')}
                      {' '}
                      {`/anime/room/${roomToken}`}
                    </p>
                  </section>
                )}

                <section className={styles.sideSection}>
                  <p className={styles.sideHeader}>
                    {tt('anime.stickyNote', 'Leave a note on this page')}
                  </p>
                  <div className={styles.chatInputRow}>
                    <input className={styles.chatInput} value={noteText}
                           onChange={e => setNoteText(e.target.value)} />
                    <button type="button" className={styles.chatSendBtn}
                            onClick={stick}>
                      {tt('anime.stick', 'Stick it')}
                    </button>
                  </div>
                  {annotations.filter(a => a.page === page).map(a => (
                    <p key={a.id} className={styles.chatText}>
                      {a.author}: {a.text}
                    </p>
                  ))}
                </section>

                <section className={styles.chatSection}>
                  <p className={styles.sideHeader}>{tt('anime.chat', 'Chat')}</p>
                  <div className={styles.chatList}>
                    {messages.length === 0 ? (
                      <p className={styles.sideState}>
                        {tt('anime.nothingSaid', 'Nobody has said anything yet.')}
                      </p>
                    ) : messages.map(m => (
                      <div key={m.id} className={styles.chatMsg}>
                        <div className={styles.chatBody}>
                          <div className={styles.chatHead}>
                            <span className={styles.chatUser}>{m.author}</span>
                            <span className={styles.chatTime}>
                              {formatDateTime(m.created_at)}
                            </span>
                          </div>
                          <p className={styles.chatText}>
                            {m.kind === 'reaction'
                              ? fill(tt('anime.reactedOn',
                                '{emoji} on page {p}'),
                              { emoji: m.emoji, p: m.page })
                              : m.body}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <form className={styles.chatInputRow} onSubmit={say}>
                    <input className={styles.chatInput} value={saying}
                           onChange={e => setSaying(e.target.value)}
                           placeholder={tt('anime.saySomething', 'Say something')} />
                    <button type="submit" className={styles.chatSendBtn}
                            disabled={!saying.trim()}>
                      {tt('anime.say', 'Send')}
                    </button>
                  </form>
                </section>

                {analytics && (
                  <section className={styles.sideSection}>
                    <p className={styles.sideHeader}>
                      {tt('anime.whatHappened', 'What the session did')}
                    </p>
                    <p className={styles.chatText}>
                      {fill(tt('anime.sessionLine',
                        '{m} minutes, {p} people, {c} messages, {r} reactions.'),
                      { m: analytics.minutes, p: analytics.people,
                        c: analytics.messages, r: analytics.reactions })}
                    </p>
                    {analytics.most_reacted_page && (
                      <p className={styles.chatText}>
                        {fill(tt('anime.mostReacted',
                          'Page {p} got the most reactions.'),
                        { p: analytics.most_reacted_page.page })}
                      </p>
                    )}
                  </section>
                )}
              </div>
            </div>
          )}

          {feedError ? (
            <p className={styles.sideState}>
              {tt('anime.feedTrouble',
                'We are having trouble keeping up with the room.')}
            </p>
          ) : null}
          {toast ? <p className={styles.sideState} role="status">{toast}</p> : null}
        </div>
      </main>
    </div>
  );
};

export default RoomClient;
