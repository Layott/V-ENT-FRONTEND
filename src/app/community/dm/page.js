'use client';

import { appLocale } from '@/lib/appLocale';
import { apiMessage } from '@/lib/apiMessage';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import Avatar from '@/components/avatar/Avatar';
import { FiArrowLeft } from 'react-icons/fi';
import { FaPaperPlane, FaCircle } from 'react-icons/fa';
import Header from '@/components/header/Header';
import MobileHeader from '@/components/mobile-header/MobileHeader';
import Sidebar from '@/components/sidebar/Sidebar';
import BottomMenu from '@/components/bottom-menu/BottomMenu';
import styles from './dm.module.css';
import { useT } from '@/i18n/LanguageProvider';
import { useTx } from '@/i18n/LanguageProvider';
import UserChip from '@/components/user-chip/UserChip';
const formatTime = iso => {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString(appLocale(), {
    hour: '2-digit',
    minute: '2-digit'
  });
};
const dayLabel = iso => {
  if (!iso) return '';
  const d = new Date(iso);
  const today = new Date();
  const yest = new Date();
  yest.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yest.toDateString()) return 'Yesterday';
  return d.toLocaleDateString(appLocale(), {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
};
const DmInner = ({
  slug: slugFromPath
}) => {
  const tx = useTx();
  const tt = useT();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = slugFromPath || searchParams.get('id');
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
  const {
    data: session
  } = useSession();
  const token = session?.user?.sessionToken || '';
  const authHeaders = useMemo(() => ({
    'Content-Type': 'application/json',
    ...(token ? {
      Authorization: `Bearer ${token}`
    } : {})
  }), [token]);
  const [thread, setThread] = useState(null);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const messagesEndRef = useRef(null);
  useEffect(() => {
    if (!id) {
      // No slug means somebody trimmed the address or followed an old
      // link. Send them to the list rather than telling them a thing
      // they never named is missing.
      setLoading(false);
      router.replace('/community?tab=dms');
      return;
    }
    const fetchThread = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`${apiUrl}/dm/${id}/`, {
          headers: authHeaders
        });
        const data = await res.json().catch(() => ({}));
        if (data?.status === 'success' && data.data?.conversation) {
          setThread({
            ...data.data.conversation,
            messages: data.data.messages || []
          });
        } else {
          setThread(null);
          setError(apiMessage(tt, data, "api.conversationNotFound", "Conversation not found."));
        }
      } catch (err) {
        console.error('DM fetch error:', err);
        setThread(null);
        setError(tt("msg.couldNotReachTheServer", "Could not reach the server."));
      } finally {
        setLoading(false);
      }
    };
    fetchThread();
  }, [id, apiUrl, authHeaders, router]);
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: 'smooth'
    });
  }, [thread?.messages?.length]);
  const otherParticipant = t => t?.with || null;
  const handleSend = async () => {
    if (!input.trim() || !thread || sending) return;
    setSending(true);
    setError('');
    const text = input.trim();
    const localId = `dmsg_local_${Date.now()}`;
    const optimistic = {
      id: localId,
      body: text,
      mine: true,
      created_at: new Date().toISOString(),
      _local: true
    };
    setThread(prev => ({
      ...prev,
      messages: [...(prev?.messages || []), optimistic]
    }));
    setInput('');
    try {
      const res = await fetch(`${apiUrl}/dm/${thread.id}/send/`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          body: text
        })
      });
      const data = await res.json();
      const serverMsg = data.status === 'success' ? data.data?.message : null;
      if (!serverMsg) setError(apiMessage(tt, data, "api.messageNotSent", "Message not sent."));
      setThread(prev => ({
        ...prev,
        messages: serverMsg ? prev.messages.map(m => m.id === localId ? serverMsg : m) : prev.messages.filter(m => m.id !== localId),
        ...(serverMsg ? {
          last_message_at: serverMsg.created_at
        } : {})
      }));
    } catch (err) {
      console.error('Send DM error:', err);
      setError(tt("msg.couldNotReachTheServer", "Could not reach the server. Message not sent."));
      setThread(prev => ({
        ...prev,
        messages: prev.messages.filter(m => m.id !== localId)
      }));
    } finally {
      setSending(false);
    }
  };
  const isMine = msg => Boolean(msg.mine);

  // Group messages by day for divider rendering.
  const groupedMessages = (() => {
    if (!thread?.messages) return [];
    const groups = [];
    let currentDay = null;
    thread.messages.forEach(msg => {
      const lbl = dayLabel(msg.created_at);
      if (lbl !== currentDay) {
        currentDay = lbl;
        groups.push({
          type: 'divider',
          label: lbl,
          key: `div_${msg.id}`
        });
      }
      groups.push({
        type: 'message',
        msg,
        key: msg.id
      });
    });
    return groups;
  })();
  const other = otherParticipant(thread);
  return <div className={styles.pageContainer}>
      <Header />
      <MobileHeader />

      <main className={styles.mainContainer}>
        <Sidebar />

        <div className={styles.rightPaneContainer}>
          {loading ? <p className={styles.stateText}>{tt("ui.loading.conversation.1238", "Loading conversation...")}</p> : !thread ? <div className={styles.emptyState}>
              <p className={styles.stateText}>{error || tx("Conversation not found.")}</p>
              <button className={styles.backLink} onClick={() => router.push('/community?tab=dms')}>
                <FiArrowLeft /> {tt("ui.back.dms.b067", "Back to DMs")}
              </button>
            </div> : <div className={styles.dmShell}>
              <header className={styles.dmHeader}>
                <button className={styles.backBtn} onClick={() => router.push('/community?tab=dms')} aria-label={tt("ui.back.b52b", "Back")}>
                  <FiArrowLeft />
                </button>
                {/* Through UserChip, so the founder mark travels with the
                    name and the whole thing opens their profile. Written out
                    by hand here before, which is why the badge was missing
                    from exactly this screen. */}
                <UserChip user={other} size={42} secondary
                          nameClassName={styles.dmName}
                          handleClassName={styles.dmStatus} />
              </header>

              <div className={styles.dmMessages}>
                {(thread.messages || []).length === 0 ? <p className={styles.stateText}>{tt("ui.no.messages.yet.send.8d65", "No messages yet. Send the first one.")}</p> : groupedMessages.map(item => {
              if (item.type === 'divider') {
                return <div key={item.key} className={styles.dayDivider}>
                          <span>{tx(item.label)}</span>
                        </div>;
              }
              const msg = item.msg;
              const mine = isMine(msg);
              return <div key={item.key} className={`${styles.bubbleRow} ${mine ? styles.bubbleRowMine : styles.bubbleRowTheirs}`}>
                        <div className={`${styles.bubble} ${mine ? styles.bubbleMine : styles.bubbleTheirs}`}>
                          <p className={styles.bubbleText}>{msg.body}</p>
                          <span className={styles.bubbleTime}>{formatTime(msg.created_at)}</span>
                        </div>
                      </div>;
            })}
                <div ref={messagesEndRef} />
              </div>

              {error && thread && <p className={styles.dmError}>{error}</p>}

              <div className={styles.dmCompose}>
                <input className={styles.dmInput} placeholder={tt("ui.type.message.09bd", "Type a message...")} value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) handleSend();
            }} />
                <button className={`${styles.sendBtn} redBTN`} onClick={handleSend} disabled={!input.trim() || sending} aria-label={tt("ui.send.9bc2", "Send")}>
                  <FaPaperPlane />
                </button>
              </div>
            </div>}
        </div>
      </main>

      <BottomMenu />
    </div>;
};
const DmPage = () => <Suspense fallback={<div style={{
  minHeight: '100vh',
  background: '#131316'
}} />}>
    <DmInner />
  </Suspense>;
export default DmPage;

// Exported so the slug route can render it. Everything a person
// clicks still lives here; the route file only supplies the address.
export { DmInner };