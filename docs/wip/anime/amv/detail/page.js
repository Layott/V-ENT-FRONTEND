'use client'

import { useState, useEffect, useMemo, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { FiArrowLeft } from 'react-icons/fi';
import { FaHeart, FaRegHeart, FaPlay, FaShare } from 'react-icons/fa';
import Header from '@/components/header/Header';
import MobileHeader from '@/components/mobile-header/MobileHeader';
import Sidebar from '@/components/sidebar/Sidebar';
import BottomMenu from '@/components/bottom-menu/BottomMenu';
import styles from './detail.module.css';

function AmvDetail() {
  const searchParams = useSearchParams();
  const amvId = searchParams.get('id') || 'amvx_0';
  const { data: session } = useSession();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';

  const [amv, setAmv] = useState(null);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [liking, setLiking] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [comments, setComments] = useState([
    { id: 'c1', user: 'otaku_king', avatar: 'https://i.pravatar.cc/60?img=33', text: 'The match-cut at 1:12 is cinema.', at: '2 days ago' },
    { id: 'c2', user: 'editor_glow', avatar: 'https://i.pravatar.cc/60?img=34', text: 'Color grading is on another level.', at: '4 days ago' },
  ]);
  const [newComment, setNewComment] = useState('');

  const authHeaders = useMemo(() => ({
    Authorization: session?.user?.sessionToken ? `Bearer ${session.user.sessionToken}` : '',
    'Content-Type': 'application/json',
  }), [session?.user?.sessionToken]);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${apiUrl}/amv/${amvId}/`, { headers: authHeaders });
        const data = await res.json();
        if (data?.status === 'success') {
          setAmv(data.data?.amv || null);
          setRelated(data.data?.related || []);
        }
      } catch (err) {
        console.error('AMV detail fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    run();
    setLiked(false);
    setPlaying(false);
  }, [amvId, apiUrl, authHeaders]);

  const handleLike = async () => {
    if (liked || liking) return;
    setLiking(true);
    setLiked(true);
    try {
      await fetch(`${apiUrl}/amv/${amvId}/like/`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({}),
      });
    } catch (err) {
      console.error('Like error:', err);
    } finally {
      setLiking(false);
    }
  };

  const submitComment = () => {
    if (!newComment.trim()) return;
    setComments((c) => [
      {
        id: `local_${Date.now()}`,
        user: session?.user?.username || 'ladi_layo',
        avatar: session?.user?.profile_picture || 'https://i.pravatar.cc/60?img=12',
        text: newComment.trim(),
        at: 'just now',
      },
      ...c,
    ]);
    setNewComment('');
  };

  const likeCount = (amv?.likes || 0) + (liked ? 1 : 0);

  return (
    <div className={styles.pageContainer}>
      <Header />
      <MobileHeader />

      <main className={styles.mainContainer}>
        <Sidebar />

        <div className={styles.rightPaneContainer}>
          <Link href="/anime/amv" className={styles.backLink}>
            <FiArrowLeft /> Back to AMVs
          </Link>

          <div className={styles.layout}>
            <div className={styles.mainCol}>
              {/* Player */}
              <div className={styles.playerWrap}>
                {!playing ? (
                  <button
                    type="button"
                    className={styles.playerPoster}
                    style={{ backgroundImage: amv?.thumbnail ? `url(${amv.thumbnail})` : undefined }}
                    onClick={() => setPlaying(true)}
                    aria-label="Play"
                  >
                    <span className={styles.playerPlayIcon}><FaPlay /></span>
                  </button>
                ) : (
                  <iframe
                    className={styles.playerIframe}
                    src={amv?.video_url || 'https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1'}
                    title={amv?.title || 'AMV player'}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                )}
              </div>

              {/* Title block */}
              <div className={styles.titleBlock}>
                <h1 className={styles.title}>
                  {loading ? 'Loading...' : amv?.title || 'AMV'}
                </h1>
                <div className={styles.metaRow}>
                  <p className={styles.metaText}>
                    {amv?.views?.toLocaleString() || 0} views · {amv?.duration} · {amv?.anime_referenced || ''}
                  </p>
                  <div className={styles.actionBtns}>
                    <button
                      type="button"
                      className={`${styles.likeBtn} ${liked ? styles.likeBtnActive : ''}`}
                      onClick={handleLike}
                      disabled={liked || liking}
                    >
                      {liked ? <FaHeart /> : <FaRegHeart />} {likeCount.toLocaleString()}
                    </button>
                    <button type="button" className={styles.shareBtn}>
                      <FaShare /> Share
                    </button>
                  </div>
                </div>
              </div>

              {/* Uploader card */}
              {amv?.uploader && (
                <div className={styles.uploaderCard}>
                  <Image
                    src={amv.uploader.profile_pic}
                    alt={amv.uploader.username}
                    width={48}
                    height={48}
                    className={styles.uploaderAvatar}
                    unoptimized
                  />
                  <div className={styles.uploaderInfo}>
                    <p className={styles.uploaderName}>@{amv.uploader.username}</p>
                    <p className={styles.uploaderSub}>
                      {amv.uploader.follower_count?.toLocaleString()} followers
                    </p>
                  </div>
                  <button type="button" className={`btn redBTN ${styles.followBtn}`}>
                    Follow
                  </button>
                </div>
              )}

              {/* Description + tags */}
              {amv && (
                <div className={styles.descBlock}>
                  <p className={styles.descText}>{amv.description}</p>
                  {amv.song_used && (
                    <p className={styles.songText}>
                      <strong>Song:</strong> {amv.song_used}
                    </p>
                  )}
                  <div className={styles.tagRow}>
                    {amv.tags?.map((t) => (
                      <span key={t} className={styles.tagChip}>#{t}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Comments */}
              <div className={styles.commentsBlock}>
                <h3 className={styles.commentsTitle}>Comments ({comments.length})</h3>
                <div className={styles.commentComposer}>
                  <input
                    type="text"
                    className={styles.commentInput}
                    placeholder="Drop a comment..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') submitComment(); }}
                  />
                  <button
                    type="button"
                    className={`btn goldBTN ${styles.commentBtn}`}
                    onClick={submitComment}
                    disabled={!newComment.trim()}
                  >
                    Post
                  </button>
                </div>
                <div className={styles.commentList}>
                  {comments.map((c) => (
                    <div key={c.id} className={styles.commentRow}>
                      <Image
                        src={c.avatar}
                        alt={c.user}
                        width={32}
                        height={32}
                        className={styles.commentAvatar}
                        unoptimized
                      />
                      <div className={styles.commentBody}>
                        <div className={styles.commentHead}>
                          <span className={styles.commentUser}>@{c.user}</span>
                          <span className={styles.commentTime}>{c.at}</span>
                        </div>
                        <p className={styles.commentText}>{c.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Side col */}
            <aside className={styles.sideCol}>
              <h4 className={styles.sideTitle}>Similar AMVs</h4>
              <div className={styles.relatedList}>
                {related.map((r) => (
                  <Link key={r.id} href={`/anime/amv/detail?id=${r.id}`} className={styles.relatedCard}>
                    <div className={styles.relatedThumb} style={{ backgroundImage: `url(${r.thumbnail})` }}>
                      <span className={styles.relatedDuration}>{r.duration}</span>
                    </div>
                    <div className={styles.relatedBody}>
                      <p className={styles.relatedTitle}>{r.title}</p>
                      <p className={styles.relatedMeta}>
                        @{r.uploader?.username} · {r.views?.toLocaleString()} views
                      </p>
                    </div>
                  </Link>
                ))}
                {related.length === 0 && !loading && (
                  <p className={styles.emptyText}>No related AMVs.</p>
                )}
              </div>
            </aside>
          </div>
        </div>
      </main>

      <BottomMenu />
    </div>
  );
}

export default function AmvDetailPage() {
  return (
    <Suspense fallback={<div className={styles.pageContainer} />}>
      <AmvDetail />
    </Suspense>
  );
}
