'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Avatar from '@/components/avatar/Avatar';
import Link from 'next/link';
import { FiArrowLeft } from 'react-icons/fi';
import {
  FaHeart,
  FaRegHeart,
  FaShare,
  FaBookmark,
  FaRegBookmark,
  FaPoll,
} from 'react-icons/fa';
import Header from '@/components/header/Header';
import MobileHeader from '@/components/mobile-header/MobileHeader';
import Sidebar from '@/components/sidebar/Sidebar';
import BottomMenu from '@/components/bottom-menu/BottomMenu';
import styles from './post.module.css';

const relativeTime = (iso) => {
  if (!iso) return '';
  const diffSec = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diffSec < 60) return `${diffSec}s ago`;
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d ago`;
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

const PostInner = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';

  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [posting, setPosting] = useState(false);

  // No placeholder portrait: Avatar falls back to initials when avatar is null.
  const [me, setMe] = useState({
    username: 'you',
    full_name: 'You',
    avatar: null,
  });

  useEffect(() => {
    try {
      const stored = typeof window !== 'undefined' ? localStorage.getItem('userProfile') : null;
      if (stored) {
        const p = JSON.parse(stored);
        setMe({
          username: p.username || 'you',
          full_name: p.full_name || p.fullname || 'You',
          avatar: p.profile_picture ,
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
    const fetchPost = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${apiUrl}/post/${id}/`);
        const data = await res.json();
        if (data.status === 'success') {
          const real = data.data.post || null;
          setPost(real);
          // The detail endpoint returns the real thread (with_comments=True).
          setComments(real?.comments || []);
        }
      } catch (err) {
        console.error('Post fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPost();
  }, [id, apiUrl]);

  const handleToggleLike = async () => {
    if (!post) return;
    setPost((prev) => ({
      ...prev,
      is_liked: !prev.is_liked,
      likes_count: prev.likes_count + (prev.is_liked ? -1 : 1),
    }));
    try {
      await fetch(`${apiUrl}/post/${post.id}/like/`, { method: 'POST' });
    } catch (err) {
      console.error('Like error:', err);
    }
  };

  const handleToggleBookmark = () => {
    if (!post) return;
    setPost((prev) => ({ ...prev, is_bookmarked: !prev.is_bookmarked }));
  };

  const handleComment = async () => {
    if (!commentText.trim() || !post || posting) return;
    setPosting(true);
    try {
      const res = await fetch(`${apiUrl}/post/${post.id}/comment/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: commentText.trim() }),
      });
      const data = await res.json();
      if (data.status === 'success' && data.data?.comment) {
        const newComment = {
          ...data.data.comment,
          author: data.data.comment.author?.full_name
            ? data.data.comment.author
            : {
              ...data.data.comment.author,
              full_name: me.full_name,
              avatar: me.avatar,
            },
        };
        setComments((prev) => [...prev, newComment]);
        setPost((prev) => ({ ...prev, comments_count: (prev.comments_count || 0) + 1 }));
        setCommentText('');
      }
    } catch (err) {
      console.error('Comment error:', err);
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className={styles.pageContainer}>
      <Header />
      <MobileHeader />

      <main className={styles.mainContainer}>
        <Sidebar />

        <div className={styles.rightPaneContainer}>
          <div className={styles.shell}>
            <button className={styles.backLink} onClick={() => router.push('/community')}>
              <FiArrowLeft /> Back to feed
            </button>

            {loading ? (
              <p className={styles.stateText}>Loading post...</p>
            ) : !post ? (
              <p className={styles.stateText}>Post not found.</p>
            ) : (
              <>
                <article className={styles.postCard}>
                  <div className={styles.postHeader}>
                    <Link href={`/user-profile?username=${post.author.username}`} className={styles.avatarLink}>
                      <div className={styles.avatar}>
                        <Avatar src={post.author.avatar} name={post.author.username} size={44} />
                      </div>
                    </Link>
                    <div className={styles.authorInfo}>
                      <span className={styles.authorName}>
                        {post.author.full_name}
                        {post.author.verified && <span className={styles.verifiedDot} title="Verified" />}
                      </span>
                      <span className={styles.authorHandle}>@{post.author.username}</span>
                    </div>
                    <span className={styles.time}>{relativeTime(post.created_at)}</span>
                  </div>

                  {/* Page heading - derived from post title or first 60 chars of body */}
                  <h1 className={styles.postHeading}>
                    {post.title || (post.content || '').slice(0, 60) || 'Community post'}
                  </h1>

                  <p className={styles.body}>{post.content}</p>

                  {post.images && post.images.length > 0 && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={post.images[0]} alt="post attachment" className={styles.postImage} />
                  )}

                  {post.poll && (
                    <div className={styles.poll}>
                      <p className={styles.pollQuestion}>
                        <FaPoll className={styles.pollIcon} /> {post.poll.question}
                      </p>
                      {post.poll.options.map((opt) => {
                        const pct = post.poll.total_votes > 0
                          ? Math.round((opt.votes / post.poll.total_votes) * 100)
                          : 0;
                        return (
                          <div key={opt.id} className={styles.pollOption}>
                            <div className={styles.pollBar} style={{ width: `${pct}%` }} />
                            <span className={styles.pollLabel}>{opt.label}</span>
                            <span className={styles.pollPct}>{pct}%</span>
                          </div>
                        );
                      })}
                      <p className={styles.pollFooter}>{post.poll.total_votes.toLocaleString()} votes</p>
                    </div>
                  )}

                  <div className={styles.actions}>
                    <button
                      className={`${styles.reactBtn} ${post.is_liked ? styles.liked : ''}`}
                      onClick={handleToggleLike}
                      aria-label="like"
                    >
                      {post.is_liked ? <FaHeart /> : <FaRegHeart />}
                      <span>{post.likes_count}</span>
                    </button>
                    <span className={styles.reactBtn}>
                      <span>{post.comments_count} comments</span>
                    </span>
                    <button className={styles.reactBtn} aria-label="share">
                      <FaShare />
                      <span>{post.shares}</span>
                    </button>
                    <button
                      className={`${styles.reactBtn} ${styles.reactBookmark} ${post.is_bookmarked ? styles.bookmarked : ''}`}
                      onClick={handleToggleBookmark}
                      aria-label="bookmark"
                    >
                      {post.is_bookmarked ? <FaBookmark /> : <FaRegBookmark />}
                    </button>
                  </div>
                </article>

                <div className={styles.composeBox}>
                  <div className={styles.composeAvatar}>
                    <Avatar src={me.avatar} name={me.username} size={36} />
                  </div>
                  <div className={styles.composeBody}>
                    <textarea
                      className={styles.composeTextarea}
                      placeholder="Add a comment..."
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      maxLength={500}
                    />
                    <div className={styles.composeActions}>
                      <span className={styles.counter}>{commentText.length}/500</span>
                      <button
                        className={`${styles.commentBtn} goldBTN`}
                        onClick={handleComment}
                        disabled={!commentText.trim() || posting}
                      >
                        {posting ? 'Posting...' : 'Comment'}
                      </button>
                    </div>
                  </div>
                </div>

                <p className={styles.commentCount}>
                  {comments.length} {comments.length === 1 ? 'comment' : 'comments'}
                </p>

                <div className={styles.commentList}>
                  {comments.length === 0 ? (
                    <p className={styles.stateText}>No comments yet. Start the conversation.</p>
                  ) : (
                    comments.map((c) => (
                      <div key={c.id} className={styles.commentCard}>
                        <div className={styles.commentAvatar}>
                          <Avatar src={c.author?.avatar } name={c.author?.username || 'user'} size={32} />
                        </div>
                        <div className={styles.commentBody}>
                          <div className={styles.commentHeader}>
                            <span className={styles.commentAuthor}>{c.author?.full_name || c.author?.username || 'User'}</span>
                            <span className={styles.commentHandle}>@{c.author?.username}</span>
                            <span className={styles.commentTime}>{relativeTime(c.created_at)}</span>
                          </div>
                          <p className={styles.commentText}>{c.body}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </main>

      <BottomMenu />
    </div>
  );
};

const PostPage = () => (
  <Suspense fallback={<div style={{ minHeight: '100vh', background: '#131316' }} />}>
    <PostInner />
  </Suspense>
);

export default PostPage;
