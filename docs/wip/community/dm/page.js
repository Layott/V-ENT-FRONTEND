'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { FiArrowLeft } from 'react-icons/fi';
import { FaPaperPlane, FaCircle } from 'react-icons/fa';
import Header from '@/components/header/Header';
import MobileHeader from '@/components/mobile-header/MobileHeader';
import Sidebar from '@/components/sidebar/Sidebar';
import BottomMenu from '@/components/bottom-menu/BottomMenu';
import styles from './dm.module.css';

const MOCK_USER_ID = 'user_001';

const formatTime = (iso) => {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
};

const dayLabel = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  const today = new Date();
  const yest = new Date();
  yest.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yest.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

const DmInner = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';

  const [thread, setThread] = useState(null);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [me, setMe] = useState({ id: MOCK_USER_ID, username: 'you' });
  const messagesEndRef = useRef(null);

  useEffect(() => {
    try {
      const stored = typeof window !== 'undefined' ? localStorage.getItem('userProfile') : null;
      if (stored) {
        const p = JSON.parse(stored);
        setMe({
          id: p.id || MOCK_USER_ID,
          username: p.username || 'you',
        });
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    const fetchThread = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${apiUrl}/dm/${id}/`);
        const data = await res.json().catch(() => ({}));
        if (data?.status === 'success' && data.data?.thread) {
          setThread({ ...data.data.thread, messages: data.data.messages || data.data.thread.messages || [] });
        } else {
          // Mock layer or backend has no thread for this id — fall back to a
          // minimal local stub so the UI still has a heading + avatar to render
          // instead of going blank with a 404 in console.
          setThread({
            id,
            participants: [
              { id: 'user_001', username: 'you', full_name: 'You', avatar: 'https://i.pravatar.cc/100?img=12' },
              { id: 'usr_other', username: 'reaper_x', full_name: 'Reaper X', avatar: 'https://i.pravatar.cc/100?img=24' },
            ],
            messages: [],
          });
        }
      } catch (err) {
        console.error('DM fetch error:', err);
        // Same offline stub on network error.
        setThread({
          id,
          participants: [
            { id: 'user_001', username: 'you', full_name: 'You', avatar: 'https://i.pravatar.cc/100?img=12' },
            { id: 'usr_other', username: 'reaper_x', full_name: 'Reaper X', avatar: 'https://i.pravatar.cc/100?img=24' },
          ],
          messages: [],
        });
      } finally {
        setLoading(false);
      }
    };
    fetchThread();
  }, [id, apiUrl]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [thread?.messages?.length]);

  const otherParticipant = (t) => {
    if (!t?.participants) return null;
    return t.participants.find((p) => p.id !== me.id && p.username !== me.username) || t.participants[1] || t.participants[0];
  };

  const handleSend = () => {
    if (!input.trim() || !thread || sending) return;
    setSending(true);
    const text = input.trim();
    const optimistic = {
      id: `dmsg_local_${Date.now()}`,
      thread_id: thread.id,
      from: me.id || MOCK_USER_ID,
      body: text,
      created_at: new Date().toISOString(),
      read: false,
      _local: true,
    };
    setThread((prev) => ({ ...prev, messages: [...(prev?.messages || []), optimistic] }));
    setInput('');

    setTimeout(async () => {
      try {
        const res = await fetch(`${apiUrl}/dm/${thread.id}/send/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ body: text }),
        });
        const data = await res.json();
        if (data.status === 'success' && data.data?.message) {
          setThread((prev) => ({
            ...prev,
            messages: prev.messages.map((m) => m.id === optimistic.id ? data.data.message : m),
            last_message_at: data.data.message.created_at,
          }));
        }
      } catch (err) {
        console.error('Send DM error:', err);
      } finally {
        setSending(false);
      }
    }, 350);
  };

  const isMine = (msg) => msg.from === me.id || msg.from === MOCK_USER_ID || msg.from === 'me';

  // Group messages by day for divider rendering.
  const groupedMessages = (() => {
    if (!thread?.messages) return [];
    const groups = [];
    let currentDay = null;
    thread.messages.forEach((msg) => {
      const lbl = dayLabel(msg.created_at);
      if (lbl !== currentDay) {
        currentDay = lbl;
        groups.push({ type: 'divider', label: lbl, key: `div_${msg.id}` });
      }
      groups.push({ type: 'message', msg, key: msg.id });
    });
    return groups;
  })();

  const other = otherParticipant(thread);

  return (
    <div className={styles.pageContainer}>
      <Header />
      <MobileHeader />

      <main className={styles.mainContainer}>
        <Sidebar />

        <div className={styles.rightPaneContainer}>
          {loading ? (
            <p className={styles.stateText}>Loading conversation...</p>
          ) : !thread ? (
            <div className={styles.emptyState}>
              <p className={styles.stateText}>Conversation not found.</p>
              <button className={styles.backLink} onClick={() => router.push('/community?tab=dms')}>
                <FiArrowLeft /> Back to DMs
              </button>
            </div>
          ) : (
            <div className={styles.dmShell}>
              <header className={styles.dmHeader}>
                <button className={styles.backBtn} onClick={() => router.push('/community?tab=dms')} aria-label="Back">
                  <FiArrowLeft />
                </button>
                <div className={styles.dmAvatar}>
                  <Image
                    src={other?.avatar || 'https://i.pravatar.cc/100?img=12'}
                    alt={other?.username || 'user'}
                    width={42}
                    height={42}
                    unoptimized
                  />
                </div>
                <div className={styles.dmHeaderInfo}>
                  <h1 className={styles.dmName}>{other?.full_name || other?.username || 'Direct Message'}</h1>
                  <span className={styles.dmStatus}>
                    <FaCircle className={styles.dmStatusDot} /> Online
                  </span>
                </div>
              </header>

              <div className={styles.dmMessages}>
                {(thread.messages || []).length === 0 ? (
                  <p className={styles.stateText}>No messages yet. Send the first one.</p>
                ) : (
                  groupedMessages.map((item) => {
                    if (item.type === 'divider') {
                      return (
                        <div key={item.key} className={styles.dayDivider}>
                          <span>{item.label}</span>
                        </div>
                      );
                    }
                    const msg = item.msg;
                    const mine = isMine(msg);
                    return (
                      <div
                        key={item.key}
                        className={`${styles.bubbleRow} ${mine ? styles.bubbleRowMine : styles.bubbleRowTheirs}`}
                      >
                        <div className={`${styles.bubble} ${mine ? styles.bubbleMine : styles.bubbleTheirs}`}>
                          <p className={styles.bubbleText}>{msg.body}</p>
                          <span className={styles.bubbleTime}>{formatTime(msg.created_at)}</span>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className={styles.dmCompose}>
                <input
                  className={styles.dmInput}
                  placeholder="Type a message..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) handleSend(); }}
                />
                <button
                  className={`${styles.sendBtn} redBTN`}
                  onClick={handleSend}
                  disabled={!input.trim() || sending}
                  aria-label="Send"
                >
                  <FaPaperPlane />
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      <BottomMenu />
    </div>
  );
};

const DmPage = () => (
  <Suspense fallback={<div style={{ minHeight: '100vh', background: '#131316' }} />}>
    <DmInner />
  </Suspense>
);

export default DmPage;
