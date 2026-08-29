'use client';

import { appLocale } from '@/lib/appLocale';
import { apiMessage } from '@/lib/apiMessage';
import FounderBadge from '@/components/founder-badge/FounderBadge';
import SignInToEngage from '@/components/community/SignInToEngage';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import Avatar from '@/components/avatar/Avatar';
import Link from 'next/link';
import { FiArrowLeft } from 'react-icons/fi';
import { FaThumbtack, FaLock, FaArrowUp, FaEye, FaBold, FaItalic, FaCode, FaQuoteRight, FaLink, FaListUl } from 'react-icons/fa';
import Header from '@/components/header/Header';
import MobileHeader from '@/components/mobile-header/MobileHeader';
import Sidebar from '@/components/sidebar/Sidebar';
import BottomMenu from '@/components/bottom-menu/BottomMenu';
import styles from './thread.module.css';
import { useT } from '@/i18n/LanguageProvider';
import { useTx } from '@/i18n/LanguageProvider';
import UserChip from '@/components/user-chip/UserChip';
const PAGE_SIZE = 10;
const relativeTime = iso => {
  if (!iso) return '';
  const diffSec = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diffSec < 60) return `${diffSec}s ago`;
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d ago`;
  return new Date(iso).toLocaleDateString(appLocale(), {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
};

// Tiny markdown renderer - bold / italic / code / links / lists / quotes / line breaks.
const renderMarkdown = (text = '') => {
  if (!text) return null;
  const lines = text.split('\n');
  const blocks = [];
  let listItems = [];
  const flushList = () => {
    if (listItems.length) {
      blocks.push(<ul key={`ul-${blocks.length}`}>
          {listItems.map((it, i) => <li key={i}>{renderInline(it)}</li>)}
        </ul>);
      listItems = [];
    }
  };
  lines.forEach((line, i) => {
    if (/^\s*-\s+/.test(line)) {
      listItems.push(line.replace(/^\s*-\s+/, ''));
      return;
    }
    flushList();
    if (/^\s*>\s?/.test(line)) {
      blocks.push(<blockquote key={`bq-${i}`}>{renderInline(line.replace(/^\s*>\s?/, ''))}</blockquote>);
      return;
    }
    if (line.trim() === '') {
      blocks.push(<br key={`br-${i}`} />);
      return;
    }
    blocks.push(<p key={`p-${i}`}>{renderInline(line)}</p>);
  });
  flushList();
  return blocks;
};
const renderInline = text => {
  // Order matters. Code spans first, then links, bold, italic.
  const parts = [];
  let cursor = 0;
  const regex = /(`[^`]+`)|(\*\*[^*]+\*\*)|(\*[^*]+\*)|(\[[^\]]+\]\([^)]+\))/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > cursor) parts.push(text.slice(cursor, match.index));
    const t = match[0];
    if (t.startsWith('`')) {
      parts.push(<code key={parts.length}>{t.slice(1, -1)}</code>);
    } else if (t.startsWith('**')) {
      parts.push(<strong key={parts.length}>{t.slice(2, -2)}</strong>);
    } else if (t.startsWith('*')) {
      parts.push(<em key={parts.length}>{t.slice(1, -1)}</em>);
    } else if (t.startsWith('[')) {
      const m = /\[([^\]]+)\]\(([^)]+)\)/.exec(t);
      if (m) parts.push(<a key={parts.length} href={m[2]} target="_blank" rel="noopener noreferrer">{m[1]}</a>);
    }
    cursor = match.index + t.length;
  }
  if (cursor < text.length) parts.push(text.slice(cursor));
  return parts;
};
const ThreadInner = ({
  slug: slugFromPath
}) => {
  const tx = useTx();
  const tt = useT();
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    data: session
  } = useSession();

  // Reading a thread needs no account; replying to it does, and the API
  // refuses a reply without a Bearer token.
  const signedIn = Boolean(session?.user?.sessionToken);
  const id = slugFromPath || searchParams.get('id');
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
  const authHeaders = useMemo(() => ({
    'Content-Type': 'application/json',
    ...(session?.user?.sessionToken ? {
      Authorization: `Bearer ${session.user.sessionToken}`
    } : {})
  }), [session]);
  const [thread, setThread] = useState(null);
  const [replies, setReplies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState('');
  const [posting, setPosting] = useState(false);
  const [replyError, setReplyError] = useState('');
  const [page, setPage] = useState(1);
  const textareaRef = useRef(null);
  const [me, setMe] = useState({
    username: 'you',
    full_name: 'You',
    avatar: null
  });
  useEffect(() => {
    try {
      const stored = typeof window !== 'undefined' ? localStorage.getItem('userProfile') : null;
      if (stored) {
        const p = JSON.parse(stored);
        setMe({
          username: p.username || 'you',
          full_name: p.full_name || p.fullname || 'You',
          avatar: p.profile_picture
        });
      }
    } catch {
      /* ignore */
    }
  }, []);
  useEffect(() => {
    if (!id) {
      // No slug means somebody trimmed the address or followed an old
      // link. Send them to the list rather than telling them a thing
      // they never named is missing.
      setLoading(false);
      router.replace('/community?tab=forums');
      return;
    }
    const fetchThread = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${apiUrl}/thread/${id}/`, {
          headers: authHeaders
        });
        const data = await res.json();
        if (data.status === 'success') {
          const t = data.data.thread || null;
          setThread(t);
          setReplies(t?.replies || []);
        }
      } catch (err) {
        console.error('Thread fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchThread();
  }, [id, apiUrl, authHeaders, router]);
  const handleReply = async () => {
    if (!replyText.trim() || !id || thread?.is_locked) return;
    setPosting(true);
    setReplyError('');
    try {
      const res = await fetch(`${apiUrl}/thread/${id}/reply/`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          body: replyText.trim()
        })
      });
      const data = await res.json();
      if (data.status === 'success' && data.data?.reply) {
        const all = [...replies, data.data.reply];
        setReplies(all);
        setReplyText('');
        // Jump to last page so the new reply is visible.
        const lastPage = Math.ceil(all.length / PAGE_SIZE);
        setPage(lastPage);
      } else {
        setReplyError(apiMessage(tt, data, "api.couldNotPostThatReply", "Could not post that reply."));
      }
    } catch (err) {
      console.error('Reply error:', err);
      setReplyError('Could not reach the server. Try again.');
    } finally {
      setPosting(false);
    }
  };
  const toggleThreadUpvote = async () => {
    if (!id || !session?.user?.sessionToken) return;
    try {
      const res = await fetch(`${apiUrl}/thread/${id}/upvote/`, {
        method: 'POST',
        headers: authHeaders
      });
      const data = await res.json();
      if (data.status === 'success') {
        setThread(t => t ? {
          ...t,
          upvotes: data.data.upvotes,
          upvoted: data.data.upvoted
        } : t);
      }
    } catch (err) {
      console.error('Upvote error:', err);
    }
  };
  const toggleReplyUpvote = async replyId => {
    if (!session?.user?.sessionToken) return;
    try {
      const res = await fetch(`${apiUrl}/thread/reply/${replyId}/upvote/`, {
        method: 'POST',
        headers: authHeaders
      });
      const data = await res.json();
      if (data.status === 'success') {
        setReplies(rows => rows.map(r => r.id === replyId ? {
          ...r,
          upvotes: data.data.upvotes,
          upvoted: data.data.upvoted
        } : r));
      }
    } catch (err) {
      console.error('Reply upvote error:', err);
    }
  };
  const insertMarkdown = (open, close = open, placeholder = 'text') => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const sel = replyText.slice(start, end) || placeholder;
    const before = replyText.slice(0, start);
    const after = replyText.slice(end);
    const next = `${before}${open}${sel}${close}${after}`;
    setReplyText(next);
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(before.length + open.length, before.length + open.length + sel.length);
    });
  };
  const totalPages = Math.max(1, Math.ceil(replies.length / PAGE_SIZE));
  const pagedReplies = useMemo(() => replies.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [replies, page]);
  return <div className={styles.pageContainer}>
      <Header />
      <MobileHeader />

      <main className={styles.mainContainer}>
        <Sidebar />

        <div className={styles.rightPaneContainer}>
          <div className={styles.threadShell}>
            <button className={styles.backLink} onClick={() => router.push('/community?tab=forums')}>
              <FiArrowLeft /> {tt("ui.back.forums.0221", "Back to forums")}
            </button>

            {loading ? <p className={styles.stateText}>{tt("ui.loading.thread.3510", "Loading thread...")}</p> : !thread ? <p className={styles.stateText}>{tt("ui.thread.not.found.c823", "Thread not found.")}</p> : <>
                <article className={styles.parentPost}>
                  <div className={styles.postHead}>
                    <Link href={`/u/${encodeURIComponent(thread.author.username)}`} className={styles.avatarLink}>
                      <div className={styles.avatar}>
                        <Avatar src={thread.author.avatar} name={thread.author.username} size={42} />
                      </div>
                    </Link>
                    <div className={styles.authorInfo}>
                      <UserChip user={thread.author} size={0} secondary
                                nameClassName={styles.authorName}
                                handleClassName={styles.authorHandle} />
                    </div>
                    <div className={styles.postMeta}>
                      <span className={styles.categoryPill}>{thread.category}</span>
                      <span className={styles.time}>{relativeTime(thread.created_at)}</span>
                    </div>
                  </div>

                  <div className={styles.threadFlags}>
                    {thread.is_pinned && <span className={`${styles.flag} ${styles.flagPinned}`}>
                        <FaThumbtack /> {tt("ui.pinned.f931", "Pinned")}
                      </span>}
                    {thread.is_locked && <span className={`${styles.flag} ${styles.flagLocked}`}>
                        <FaLock /> {tt("ui.locked.a798", "Locked")}
                      </span>}
                  </div>

                  <h1 className={styles.threadTitle}>{tx(thread.title)}</h1>

                  <div className={styles.postBody}>
                    {renderMarkdown(thread.body)}
                  </div>

                  <div className={styles.threadStatsRow}>
                    <button type="button" className={`${styles.upvoteBtn} ${thread.upvoted ? styles.upvoteBtnOn : ''}`} onClick={toggleThreadUpvote} disabled={!session?.user?.sessionToken} title={session?.user?.sessionToken ? tx("Upvote this thread") : tx("Log in to upvote")}>
                      <FaArrowUp /> {thread.upvotes ?? 0} {(thread.upvotes ?? 0) === 1 ? 'upvote' : 'upvotes'}
                    </button>
                    <span><FaEye /> {thread.view_count ?? 0} {(thread.view_count ?? 0) === 1 ? 'view' : 'views'}</span>
                    <span>{replies.length} {replies.length === 1 ? 'reply' : 'replies'}</span>
                  </div>
                </article>

                <div className={styles.replyHeaderRow}>
                  <p className={styles.replyCount}>
                    {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
                    {totalPages > 1 && <span className={styles.pageNote}> {tt("ui.page.021c", "· Page")} {page} of {totalPages}</span>}
                  </p>
                </div>

                <div className={styles.replyList}>
                  {pagedReplies.length === 0 ? <p className={styles.stateText}>{tt("ui.no.replies.yet.first.84f0", "No replies yet. Be the first.")}</p> : pagedReplies.map(reply => <div key={reply.id} className={styles.replyCard}>
                        <div className={styles.replyAvatar}>
                          <Avatar src={reply.author.avatar} name={reply.author.username} size={36} />
                        </div>
                        <div className={styles.replyBody}>
                          <div className={styles.replyHeader}>
                            <span className={styles.replyAuthor}>{reply.author.full_name}{reply.author.founder_badge && <FounderBadge size="sm" />}</span>
                            <span className={styles.replyHandle}>@{reply.author.username}</span>
                            <span className={styles.replyTime}>{relativeTime(reply.created_at)}</span>
                          </div>
                          <div className={styles.replyText}>
                            {renderMarkdown(reply.body)}
                          </div>
                          <div className={styles.replyFooter}>
                            <button type="button" className={`${styles.upvoteBtn} ${reply.upvoted ? styles.upvoteBtnOn : ''}`} onClick={() => toggleReplyUpvote(reply.id)} disabled={!session?.user?.sessionToken} title={session?.user?.sessionToken ? tx("Upvote this reply") : tx("Log in to upvote")}>
                              <FaArrowUp /> {reply.upvotes ?? 0}
                            </button>
                          </div>
                        </div>
                      </div>)}
                </div>

                {totalPages > 1 && <div className={styles.pagination}>
                    <button className={styles.pageBtn} onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                      {tt("ui.previous.50f9", "Previous")}
                    </button>
                    <div className={styles.pageNumbers}>
                      {Array.from({
                  length: totalPages
                }).map((_, i) => <button key={i} className={`${styles.pageNumberBtn} ${page === i + 1 ? styles.pageNumberActive : ''}`} onClick={() => setPage(i + 1)}>
                          {i + 1}
                        </button>)}
                    </div>
                    <button className={styles.pageBtn} onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                      {tt("ui.next.bc98", "Next")}
                    </button>
                  </div>}

                {thread.is_locked ? <div className={styles.lockedNotice}>
                    <FaLock /> {tt("ui.thread.locked.new.replies.5889", "This thread is locked. New replies are disabled.")}
                  </div> : !signedIn ? <SignInToEngage action={tt("community.toReply", "to reply to this thread.")} /> : <div className={styles.composeBox}>
                    <div className={styles.replyAvatar}>
                      <Avatar src={me.avatar} name={me.username} size={36} />
                    </div>
                    <div className={styles.composeBody}>
                      <div className={styles.markdownToolbar}>
                        <button type="button" className={styles.mdBtn} onClick={() => insertMarkdown('**', '**', 'bold')} title={tt("ui.bold.19e0", "Bold")}>
                          <FaBold />
                        </button>
                        <button type="button" className={styles.mdBtn} onClick={() => insertMarkdown('*', '*', 'italic')} title={tt("ui.italic.1616", "Italic")}>
                          <FaItalic />
                        </button>
                        <button type="button" className={styles.mdBtn} onClick={() => insertMarkdown('`', '`', 'code')} title={tt("ui.code.adac", "Code")}>
                          <FaCode />
                        </button>
                        <button type="button" className={styles.mdBtn} onClick={() => insertMarkdown('> ', '', 'quote')} title={tt("ui.quote.3090", "Quote")}>
                          <FaQuoteRight />
                        </button>
                        <button type="button" className={styles.mdBtn} onClick={() => insertMarkdown('- ', '', 'item')} title={tt("ui.list.a1ff", "List")}>
                          <FaListUl />
                        </button>
                        <button type="button" className={styles.mdBtn} onClick={() => insertMarkdown('[', '](https://)', 'link text')} title={tt("ui.link.d051", "Link")}>
                          <FaLink />
                        </button>
                        <span className={styles.mdHint}>{tt("ui.markdown.supported.ecb9", "Markdown supported")}</span>
                      </div>
                      <textarea ref={textareaRef} className={styles.composeTextarea} placeholder={tt("ui.write.reply.use.markdown.3983", "Write a reply... Use markdown for formatting.")} value={replyText} onChange={e => setReplyText(e.target.value)} maxLength={2000} />
                      {replyError && <p className={styles.replyError}>{replyError}</p>}
                      <div className={styles.composeActions}>
                        <span className={styles.composeCounter}>{replyText.length}/2000</span>
                        <button className={`${styles.replyBtn} goldBTN`} onClick={handleReply} disabled={!replyText.trim() || posting}>
                          {posting ? tx("Posting...") : 'Reply'}
                        </button>
                      </div>
                    </div>
                  </div>}
              </>}
          </div>
        </div>
      </main>

      <BottomMenu />
    </div>;
};
const ThreadPage = () => <Suspense fallback={<div style={{
  minHeight: '100vh',
  background: '#131316'
}} />}>
    <ThreadInner />
  </Suspense>;
export default ThreadPage;

// Exported so the slug route can render it. Everything a person
// clicks still lives here; the route file only supplies the address.
export { ThreadInner };