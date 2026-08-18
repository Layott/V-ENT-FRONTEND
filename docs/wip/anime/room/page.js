'use client'

import { useState, useEffect, useRef, useMemo, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { FiArrowLeft, FiSend, FiLogOut } from 'react-icons/fi';
import { BsChevronLeft, BsChevronRight, BsPauseFill, BsPlayFill } from 'react-icons/bs';
import { FaCrown, FaUsers } from 'react-icons/fa';
import { MdOutlineSync } from 'react-icons/md';
import Header from '@/components/header/Header';
import MobileHeader from '@/components/mobile-header/MobileHeader';
import Sidebar from '@/components/sidebar/Sidebar';
import BottomMenu from '@/components/bottom-menu/BottomMenu';
import styles from './room.module.css';

const MOCK_USER_ID = 'user_001';

const AMBIENT_MESSAGES = [
  { id: 'amb1', user: 'reader_glow', avatar: 'https://i.pravatar.cc/60?img=24', text: 'That last panel is wild.' },
  { id: 'amb2', user: 'kira_san', avatar: 'https://i.pravatar.cc/60?img=15', text: 'Wait — is that the same blade from ch.4?' },
  { id: 'amb3', user: 'voltage_x', avatar: 'https://i.pravatar.cc/60?img=42', text: 'Yo, the colour palette here is unreal.' },
  { id: 'amb4', user: 'shoji_ko', avatar: 'https://i.pravatar.cc/60?img=27', text: 'Crying lowkey.' },
  { id: 'amb5', user: 'editor_glow', avatar: 'https://i.pravatar.cc/60?img=34', text: 'Pacing has been *immaculate* this arc.' },
  { id: 'amb6', user: 'azure_drift', avatar: 'https://i.pravatar.cc/60?img=18', text: 'Theory: the master is still alive 👀' },
];

function RoomContent() {
  const searchParams = useSearchParams();
  const roomId = searchParams.get('id') || 'roomx_0';
  const { data: session } = useSession();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';

  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [paused, setPaused] = useState(false);
  const [chat, setChat] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [newMsg, setNewMsg] = useState('');
  const [series, setSeries] = useState(null);
  const [chapterPages, setChapterPages] = useState([]);

  const chatEndRef = useRef(null);

  const authHeaders = useMemo(() => ({
    Authorization: session?.user?.sessionToken ? `Bearer ${session.user.sessionToken}` : '',
    'Content-Type': 'application/json',
  }), [session?.user?.sessionToken]);

  // Load room
  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${apiUrl}/room/${roomId}/`, { headers: authHeaders });
        const data = await res.json();
        if (data?.status === 'success') {
          const r = data.data?.room || null;
          setRoom(r);
          setParticipants(r?.participants || []);
          setCurrentPage(Math.max(0, (r?.current_page || 1) - 1));
          // Seed initial chat with a couple ambient messages
          setChat([
            { id: 'init1', user: r?.host?.username || 'host', avatar: r?.host?.avatar || 'https://i.pravatar.cc/60?img=60', text: `Welcome everyone, chapter ${r?.current_chapter || 1} starting now.`, at: new Date(Date.now() - 120_000).toISOString() },
            { id: 'init2', user: 'reader_14', avatar: 'https://i.pravatar.cc/60?img=14', text: 'Pumped for this one.', at: new Date(Date.now() - 60_000).toISOString() },
          ]);
        }
      } catch (err) {
        console.error('Room fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [apiUrl, authHeaders, roomId]);

  // Load series + chapter pages once room is in
  useEffect(() => {
    if (!room?.series_id) return;
    const run = async () => {
      try {
        const res = await fetch(`${apiUrl}/manga/${room.series_id}/`, { headers: authHeaders });
        const data = await res.json();
        if (data?.status === 'success') {
          setSeries(data.data?.series || null);
          const ch = (data.data?.chapters || []).find((c) => c.number === room.current_chapter);
          setChapterPages(ch?.page_urls || []);
        }
      } catch (err) {
        console.error('Room chapter fetch error:', err);
      }
    };
    run();
  }, [room?.series_id, room?.current_chapter, apiUrl, authHeaders]);

  // Ambient mock chat — every 6-9s, drop in a message
  useEffect(() => {
    if (loading) return;
    let i = 0;
    const id = setInterval(() => {
      const msg = AMBIENT_MESSAGES[i % AMBIENT_MESSAGES.length];
      setChat((c) => [...c, { ...msg, id: `${msg.id}_${Date.now()}`, at: new Date().toISOString() }]);
      i += 1;
    }, 7500);
    return () => clearInterval(id);
  }, [loading]);

  // Auto-scroll chat
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [chat.length]);

  const isHost = useMemo(() => room?.host?.id === MOCK_USER_ID, [room]);
  const totalPages = chapterPages.length;

  const goPrev = () => {
    if (paused && !isHost) return;
    setCurrentPage((p) => Math.max(0, p - 1));
  };
  const goNext = () => {
    if (paused && !isHost) return;
    setCurrentPage((p) => Math.min(totalPages - 1, p + 1));
  };

  const handleSend = () => {
    const text = newMsg.trim();
    if (!text) return;
    const msg = {
      id: `local_${Date.now()}`,
      user: session?.user?.username || 'ladi_layo',
      avatar: session?.user?.profile_picture || 'https://i.pravatar.cc/60?img=12',
      text,
      at: new Date().toISOString(),
    };
    setChat((c) => [...c, msg]);
    setNewMsg('');
  };

  const formatTime = (iso) => {
    if (!iso) return '';
    return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  };

  const currentPageUrl = chapterPages[currentPage];

  return (
    <div className={styles.pageContainer}>
      <Header />
      <MobileHeader />

      <main className={styles.mainContainer}>
        <Sidebar />

        <div className={styles.rightPaneContainer}>
          {/* Top bar */}
          <div className={styles.topBar}>
            <div className={styles.topLeft}>
              <span className={styles.livePill}>
                <span className={styles.liveDot} /> Live
              </span>
              <div className={styles.topInfo}>
                <h1 className={styles.topTitle}>
                  {loading ? 'Loading room...' : room?.name || 'Co-read room'}
                </h1>
                <p className={styles.topSub}>
                  {series?.title ? `${series.title} · ` : ''}Ch. {room?.current_chapter} · host @{room?.host?.username || '—'}
                </p>
              </div>
            </div>
            <div className={styles.topRight}>
              {isHost && (
                <button
                  type="button"
                  className={styles.hostBtn}
                  onClick={() => setPaused((p) => !p)}
                >
                  {paused ? <BsPlayFill /> : <BsPauseFill />}
                  {paused ? 'Resume' : 'Pause'}
                </button>
              )}
              {isHost && (
                <button
                  type="button"
                  className={styles.hostBtn}
                  onClick={() => setCurrentPage(0)}
                  title="Reset everyone to page 1"
                >
                  <MdOutlineSync /> Sync
                </button>
              )}
              <Link href="/anime/my-list?tab=reading" className={styles.leaveBtn}>
                <FiLogOut /> Leave
              </Link>
            </div>
          </div>

          <div className={styles.roomLayout}>
            {/* Left — viewer */}
            <div className={styles.viewerPane}>
              <Link href="/anime/my-list" className={styles.backLink}>
                <FiArrowLeft /> Back to my list
              </Link>

              {paused && (
                <div className={styles.pausedBanner}>
                  Host has paused the room.
                </div>
              )}

              <div className={styles.viewerFrame}>
                <button
                  type="button"
                  className={`${styles.edgeNav} ${styles.edgeNavLeft}`}
                  onClick={goPrev}
                  disabled={currentPage === 0 || (paused && !isHost)}
                  aria-label="Previous page"
                >
                  <BsChevronLeft />
                </button>
                <div
                  className={styles.pageImage}
                  style={{ backgroundImage: currentPageUrl ? `url(${currentPageUrl})` : undefined }}
                  aria-label={`Page ${currentPage + 1} of ${totalPages || '—'}`}
                />
                <button
                  type="button"
                  className={`${styles.edgeNav} ${styles.edgeNavRight}`}
                  onClick={goNext}
                  disabled={currentPage >= totalPages - 1 || (paused && !isHost)}
                  aria-label="Next page"
                >
                  <BsChevronRight />
                </button>
              </div>
              <p className={styles.pageCounter}>
                {totalPages > 0 ? `Page ${currentPage + 1} / ${totalPages}` : 'No pages loaded'}
              </p>
            </div>

            {/* Right — participants + chat */}
            <aside className={styles.sidePane}>
              <div className={styles.sideSection}>
                <h4 className={styles.sideHeader}>
                  <FaUsers /> Readers ({participants.length})
                </h4>
                <div className={styles.participantList}>
                  {participants.map((p) => (
                    <div key={p.id} className={styles.participantRow}>
                      <Image
                        src={p.avatar}
                        alt={p.username}
                        width={32}
                        height={32}
                        className={styles.participantAvatar}
                        unoptimized
                      />
                      <span className={styles.participantName}>@{p.username}</span>
                      {p.is_host && (
                        <span className={styles.hostBadge}>
                          <FaCrown /> host
                        </span>
                      )}
                    </div>
                  ))}
                  {!loading && participants.length === 0 && (
                    <p className={styles.sideState}>No readers yet.</p>
                  )}
                </div>
              </div>

              <div className={`${styles.sideSection} ${styles.chatSection}`}>
                <h4 className={styles.sideHeader}>Chat</h4>
                <div className={styles.chatList}>
                  {chat.map((m) => (
                    <div key={m.id} className={styles.chatMsg}>
                      <Image
                        src={m.avatar}
                        alt={m.user}
                        width={28}
                        height={28}
                        className={styles.chatAvatar}
                        unoptimized
                      />
                      <div className={styles.chatBody}>
                        <div className={styles.chatHead}>
                          <span className={styles.chatUser}>@{m.user}</span>
                          <span className={styles.chatTime}>{formatTime(m.at)}</span>
                        </div>
                        <p className={styles.chatText}>{m.text}</p>
                      </div>
                    </div>
                  ))}
                  {!loading && chat.length === 0 && (
                    <p className={styles.sideState}>No messages yet — say hi!</p>
                  )}
                  <div ref={chatEndRef} />
                </div>
                <div className={styles.chatInputRow}>
                  <input
                    type="text"
                    className={styles.chatInput}
                    placeholder="Send a message..."
                    value={newMsg}
                    onChange={(e) => setNewMsg(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }}
                  />
                  <button
                    type="button"
                    className={styles.chatSendBtn}
                    onClick={handleSend}
                    disabled={!newMsg.trim()}
                    aria-label="Send"
                  >
                    <FiSend />
                  </button>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </main>

      <BottomMenu />
    </div>
  );
}

export default function RoomPage() {
  return (
    <Suspense fallback={<div className={styles.pageContainer} />}>
      <RoomContent />
    </Suspense>
  );
}
